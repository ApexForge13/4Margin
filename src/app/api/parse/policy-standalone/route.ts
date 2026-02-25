import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePolicyPdfV2 } from "@/lib/ai/policy-parser";

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ───────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { policyDecodingId } = await request.json();

    if (!policyDecodingId || typeof policyDecodingId !== "string") {
      return NextResponse.json(
        { error: "No policyDecodingId provided" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // ── Get user's company_id ─────────────────────────────────
    const { data: userProfile } = await admin
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!userProfile?.company_id) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 400 }
      );
    }

    // ── Verify decoding exists, is paid, and belongs to company ─
    const { data: decoding, error: decodingErr } = await admin
      .from("policy_decodings")
      .select("id, status, paid_at, policy_pdf_url")
      .eq("id", policyDecodingId)
      .eq("company_id", userProfile.company_id)
      .single();

    if (decodingErr || !decoding) {
      return NextResponse.json(
        { error: "Policy decoding not found" },
        { status: 404 }
      );
    }

    if (!decoding.paid_at) {
      return NextResponse.json(
        { error: "Payment required before processing" },
        { status: 402 }
      );
    }

    if (decoding.status === "complete") {
      return NextResponse.json(
        { error: "This policy has already been decoded" },
        { status: 400 }
      );
    }

    if (!decoding.policy_pdf_url) {
      return NextResponse.json(
        { error: "No policy PDF uploaded" },
        { status: 400 }
      );
    }

    // ── Update status to processing ──────────────────────────
    await admin
      .from("policy_decodings")
      .update({ status: "processing" })
      .eq("id", policyDecodingId);

    // ── Download PDF from storage ────────────────────────────
    const { data: fileData, error: downloadError } = await admin.storage
      .from("temp-parsing")
      .download(decoding.policy_pdf_url);

    if (downloadError || !fileData) {
      console.error("[parse/policy-standalone] Download error:", downloadError);
      await admin
        .from("policy_decodings")
        .update({ status: "failed" })
        .eq("id", policyDecodingId);
      return NextResponse.json(
        { error: "Failed to access uploaded policy file" },
        { status: 400 }
      );
    }

    // ── Convert to base64 and parse ──────────────────────────
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    console.log(
      `[parse/policy-standalone] Processing: ${policyDecodingId} (${Math.round(arrayBuffer.byteLength / 1024)}KB)`
    );

    try {
      const analysis = await parsePolicyPdfV2(base64);

      // Store results
      await admin
        .from("policy_decodings")
        .update({
          status: "complete",
          policy_analysis: analysis,
          document_meta: {
            documentType: analysis.documentType,
            scanQuality: analysis.scanQuality,
            endorsementFormNumbers: analysis.endorsementFormNumbers,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", policyDecodingId);

      console.log(
        `[parse/policy-standalone] Complete: ${policyDecodingId}. Risk: ${analysis.riskLevel}, Confidence: ${analysis.confidence.toFixed(2)}`
      );

      return NextResponse.json({ success: true, analysis });
    } catch (parseErr) {
      console.error("[parse/policy-standalone] Parse failed:", parseErr);
      await admin
        .from("policy_decodings")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", policyDecodingId);
      return NextResponse.json(
        {
          error:
            parseErr instanceof Error
              ? parseErr.message
              : "Policy parsing failed",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[parse/policy-standalone] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Processing failed" },
      { status: 500 }
    );
  }
}
