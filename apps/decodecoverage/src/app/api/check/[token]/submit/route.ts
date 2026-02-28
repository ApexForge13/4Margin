import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { parsePolicyPdfV2 } from "@4margin/policy-engine";
import { calculatePolicyScore } from "@/lib/policy-score";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createAdminClient();

  try {
    // 1. Validate token
    const { data: check, error: fetchErr } = await supabase
      .from("policy_checks")
      .select("id, status, expires_at, company_id")
      .eq("token", token)
      .single();

    if (fetchErr || !check) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 404 }
      );
    }

    if (new Date(check.expires_at) < new Date()) {
      await supabase
        .from("policy_checks")
        .update({ status: "expired" })
        .eq("id", check.id);
      return NextResponse.json(
        { error: "This link has expired" },
        { status: 410 }
      );
    }

    if (check.status === "complete" || check.status === "processing") {
      return NextResponse.json(
        { error: "This policy check has already been submitted" },
        { status: 400 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;
    const carrier = formData.get("carrier") as string;
    const claimType = formData.get("claimType") as string;
    const consentTerms = formData.get("consentTerms") === "true";
    const consentTimestamp = formData.get("consentTimestamp") as string;
    const consentPageUrl = formData.get("consentPageUrl") as string;
    const policyFile = formData.get("policy") as File | null;

    if (!firstName || !lastName || !consentTerms) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Capture consent metadata
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const now = new Date().toISOString();
    const retriggerAt = new Date(
      Date.now() + 120 * 24 * 60 * 60 * 1000
    ).toISOString();

    // 3. Update check with homeowner info + consent
    await supabase
      .from("policy_checks")
      .update({
        homeowner_first_name: firstName,
        homeowner_last_name: lastName,
        homeowner_phone: phone || null,
        homeowner_address: address || null,
        carrier: carrier || null,
        claim_type: claimType || null,
        consent_terms: consentTerms,
        consent_timestamp: consentTimestamp || now,
        consent_certificate: {
          terms: {
            granted: consentTerms,
            text: "I agree to the Terms of Service and Privacy Policy.",
            timestamp: consentTimestamp || now,
          },
          ip_address: ipAddress,
          user_agent: userAgent,
          page_url: consentPageUrl || "unknown",
          collected_at: now,
        },
        status: "processing",
        submitted_at: now,
        retrigger_at: retriggerAt,
        updated_at: now,
      })
      .eq("id", check.id);

    // 4. Upload PDF
    let policyPdfUrl: string | null = null;
    let originalFilename: string | null = null;

    if (policyFile && policyFile.size > 0) {
      originalFilename = policyFile.name;
      const storagePath = `consumer-policies/policy-checks/${check.id}/${policyFile.name}`;
      const buffer = Buffer.from(await policyFile.arrayBuffer());

      const { error: uploadErr } = await supabase.storage
        .from("consumer-policies")
        .upload(storagePath, buffer, {
          contentType: policyFile.type || "application/pdf",
          upsert: true,
        });

      if (uploadErr) {
        console.error("[check/submit] Upload error:", uploadErr);
        await supabase
          .from("policy_checks")
          .update({ status: "failed", error_message: "File upload failed" })
          .eq("id", check.id);
        return NextResponse.json(
          { error: "File upload failed" },
          { status: 500 }
        );
      }

      policyPdfUrl = storagePath;

      await supabase
        .from("policy_checks")
        .update({ policy_pdf_url: policyPdfUrl, original_filename: originalFilename })
        .eq("id", check.id);
    } else {
      await supabase
        .from("policy_checks")
        .update({ status: "failed", error_message: "No policy file uploaded" })
        .eq("id", check.id);
      return NextResponse.json(
        { error: "Policy file is required" },
        { status: 400 }
      );
    }

    // 5. Parse with AI
    try {
      const base64 = Buffer.from(await policyFile.arrayBuffer()).toString(
        "base64"
      );

      console.log(`[check/submit] Starting parse for check ${check.id}`);
      const startTime = Date.now();

      const result = await parsePolicyPdfV2(base64);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[check/submit] Parse complete in ${elapsed}s`);

      await supabase
        .from("policy_checks")
        .update({
          policy_analysis: result,
          document_meta: {
            documentType: result.documentType,
            scanQuality: result.scanQuality,
            missingDocumentWarning: result.missingDocumentWarning,
          },
          status: "complete",
          updated_at: new Date().toISOString(),
        })
        .eq("id", check.id);

      // 6. Notify contractor (fire-and-forget)
      try {
        const scoreResult = calculatePolicyScore(result as Parameters<typeof calculatePolicyScore>[0]);

        // Fetch contractor info
        const { data: checkData } = await supabase
          .from("policy_checks")
          .select("created_by, homeowner_first_name, homeowner_last_name, carrier")
          .eq("id", check.id)
          .single();

        if (checkData) {
          const { data: creator } = await supabase
            .from("users")
            .select("email, full_name")
            .eq("id", checkData.created_by)
            .single();

          if (creator) {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);

            const homeownerName = [
              checkData.homeowner_first_name,
              checkData.homeowner_last_name,
            ]
              .filter(Boolean)
              .join(" ") || "Homeowner";

            const APP_URL =
              process.env.CONTRACTOR_APP_URL || "https://app.4margin.com";

            await resend.emails.send({
              from: "4Margin <noreply@4margin.com>",
              to: creator.email,
              subject: `Policy check complete — ${homeownerName}`,
              html: `<p>Hi ${creator.full_name || "there"},</p><p><strong>${homeownerName}</strong> has uploaded their policy. Grade: <strong>${scoreResult.grade}</strong>. Carrier: ${checkData.carrier || "N/A"}.</p><p><a href="${APP_URL}/dashboard/policy-checks/${check.id}">View Full Analysis</a></p>`,
            });
          }
        }
      } catch (notifyErr) {
        console.error("[check/submit] Notification error:", notifyErr);
      }
    } catch (parseErr) {
      console.error("[check/submit] Parse error:", parseErr);
      await supabase
        .from("policy_checks")
        .update({
          status: "failed",
          error_message:
            parseErr instanceof Error ? parseErr.message : "Analysis failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", check.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[check/submit] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
