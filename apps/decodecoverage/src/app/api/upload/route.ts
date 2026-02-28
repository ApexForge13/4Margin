import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { parsePolicyPdfV2 } from "@4margin/policy-engine";
import { calculatePolicyScore } from "@/lib/policy-score";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const formData = await request.formData();
    const policyFile = formData.get("policy") as File | null;
    const utmSource = formData.get("utmSource") as string;
    const utmMedium = formData.get("utmMedium") as string;
    const utmCampaign = formData.get("utmCampaign") as string;

    if (!policyFile || policyFile.size === 0) {
      return NextResponse.json(
        { error: "No policy file uploaded" },
        { status: 400 }
      );
    }

    // 1. Create anonymous lead (no contact info)
    const { data: lead, error: insertErr } = await supabase
      .from("consumer_leads")
      .insert({
        status: "processing",
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
      })
      .select("id")
      .single();

    if (insertErr || !lead) {
      console.error("[upload] Insert error:", insertErr);
      return NextResponse.json(
        { error: "Failed to create lead" },
        { status: 500 }
      );
    }

    const leadId = lead.id;

    // 2. Upload PDF to storage
    const originalFilename = policyFile.name;
    const storagePath = `consumer-policies/${leadId}/${policyFile.name}`;
    const buffer = Buffer.from(await policyFile.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from("consumer-policies")
      .upload(storagePath, buffer, {
        contentType: policyFile.type || "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("[upload] Upload error:", uploadErr);
      await supabase
        .from("consumer_leads")
        .update({ status: "failed", error_message: "File upload failed" })
        .eq("id", leadId);
      return NextResponse.json(
        { error: "File upload failed" },
        { status: 500 }
      );
    }

    await supabase
      .from("consumer_leads")
      .update({
        policy_pdf_url: storagePath,
        original_filename: originalFilename,
      })
      .eq("id", leadId);

    // 3. Parse policy with AI
    try {
      const base64 = Buffer.from(await policyFile.arrayBuffer()).toString(
        "base64"
      );

      console.log(`[upload] Starting parse for lead ${leadId}`);
      const startTime = Date.now();

      const result = await parsePolicyPdfV2(base64);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[upload] Parse complete in ${elapsed}s for lead ${leadId}`);

      // 4. Calculate score
      const scoreResult = calculatePolicyScore(
        result as Parameters<typeof calculatePolicyScore>[0]
      );

      // 5. Store results + score
      await supabase
        .from("consumer_leads")
        .update({
          policy_analysis: result,
          document_meta: {
            documentType: result.documentType,
            scanQuality: result.scanQuality,
            missingDocumentWarning: result.missingDocumentWarning,
          },
          policy_score: scoreResult.score,
          policy_grade: scoreResult.grade,
          status: "complete",
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    } catch (parseErr) {
      console.error("[upload] Parse error:", parseErr);
      await supabase
        .from("consumer_leads")
        .update({
          status: "failed",
          error_message:
            parseErr instanceof Error ? parseErr.message : "Analysis failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    }

    return NextResponse.json({ id: leadId });
  } catch (err) {
    console.error("[upload] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
