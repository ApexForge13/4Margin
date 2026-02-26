import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { parsePolicyPdfV2 } from "@4margin/policy-engine";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const formData = await request.formData();

    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;
    const carrier = formData.get("carrier") as string;
    const consentTerms = formData.get("consentTerms") === "true";
    const consentContact = formData.get("consentContact") === "true";
    const consentTimestamp = formData.get("consentTimestamp") as string;
    const utmSource = formData.get("utmSource") as string;
    const utmMedium = formData.get("utmMedium") as string;
    const utmCampaign = formData.get("utmCampaign") as string;
    const policyFile = formData.get("policy") as File | null;

    // Validate required fields
    if (!firstName || !lastName || !email || !consentTerms) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Create lead row
    const { data: lead, error: insertErr } = await supabase
      .from("consumer_leads")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        property_address: address || null,
        carrier: carrier || null,
        consent_terms: consentTerms,
        consent_contact: consentContact,
        consent_timestamp: consentTimestamp || new Date().toISOString(),
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertErr || !lead) {
      console.error("[analyze] Insert error:", insertErr);
      return NextResponse.json(
        { error: "Failed to create lead" },
        { status: 500 }
      );
    }

    const leadId = lead.id;

    // 2. Upload PDF to storage if provided
    let policyPdfUrl: string | null = null;
    let originalFilename: string | null = null;

    if (policyFile && policyFile.size > 0) {
      originalFilename = policyFile.name;
      const storagePath = `consumer-policies/${leadId}/${policyFile.name}`;
      const buffer = Buffer.from(await policyFile.arrayBuffer());

      const { error: uploadErr } = await supabase.storage
        .from("consumer-policies")
        .upload(storagePath, buffer, {
          contentType: policyFile.type || "application/pdf",
          upsert: true,
        });

      if (uploadErr) {
        console.error("[analyze] Upload error:", uploadErr);
        await supabase
          .from("consumer_leads")
          .update({ status: "failed", error_message: "File upload failed" })
          .eq("id", leadId);
        return NextResponse.json(
          { error: "File upload failed" },
          { status: 500 }
        );
      }

      policyPdfUrl = storagePath;

      await supabase
        .from("consumer_leads")
        .update({ policy_pdf_url: policyPdfUrl, original_filename: originalFilename })
        .eq("id", leadId);
    }

    // 3. Parse policy with AI
    if (policyFile && policyFile.size > 0) {
      try {
        const base64 = Buffer.from(await policyFile.arrayBuffer()).toString("base64");

        console.log(`[analyze] Starting parse for lead ${leadId}`);
        const startTime = Date.now();

        // Call parser without claim type (pure overview)
        const result = await parsePolicyPdfV2(base64);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[analyze] Parse complete in ${elapsed}s for lead ${leadId}`);

        // 4. Store results — parsePolicyPdfV2 returns PolicyAnalysis directly
        await supabase
          .from("consumer_leads")
          .update({
            policy_analysis: result,
            document_meta: {
              documentType: result.documentType,
              scanQuality: result.scanQuality,
              missingDocumentWarning: result.missingDocumentWarning,
            },
            status: "complete",
          })
          .eq("id", leadId);
      } catch (parseErr) {
        console.error("[analyze] Parse error:", parseErr);
        await supabase
          .from("consumer_leads")
          .update({
            status: "failed",
            error_message:
              parseErr instanceof Error ? parseErr.message : "Analysis failed",
          })
          .eq("id", leadId);
      }
    } else {
      // No file uploaded — mark as failed
      await supabase
        .from("consumer_leads")
        .update({ status: "failed", error_message: "No policy file uploaded" })
        .eq("id", leadId);
    }

    return NextResponse.json({ id: leadId });
  } catch (err) {
    console.error("[analyze] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
