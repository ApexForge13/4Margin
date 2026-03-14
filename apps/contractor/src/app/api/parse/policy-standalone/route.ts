import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePolicyPdfV2 } from "@/lib/ai/policy-parser";
import { findOrCreateJob } from "@/lib/jobs/auto-create";
import { logActivity } from "@/lib/jobs/activity-log";

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
      .select("id, status, paid_at, policy_pdf_url, claim_type, claim_description, job_id")
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
      const analysis = await parsePolicyPdfV2(
        base64,
        decoding.claim_type || undefined,
        decoding.claim_description || undefined
      );

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

      // ── Best-effort: link decode to a Job + enrich + log ──
      let linkedJobId = decoding.job_id as string | null;
      try {
        // If not already linked to a job, try to find/create one
        if (!linkedJobId && analysis.propertyAddress) {
          const jobResult = await findOrCreateJob(admin, {
            companyId: userProfile.company_id,
            createdBy: user.id,
            propertyAddress: analysis.propertyAddress,
            jobType: "insurance",
            insuranceData: analysis.carrier
              ? { carrier_id: analysis.carrier }
              : undefined,
            metadata: analysis.summaryForContractor
              ? { description: analysis.summaryForContractor }
              : undefined,
          });

          linkedJobId = jobResult.jobId;

          await admin
            .from("policy_decodings")
            .update({ job_id: linkedJobId })
            .eq("id", policyDecodingId);

          console.log(
            `[parse/policy-standalone] Linked to job ${linkedJobId} (${jobResult.created ? "new" : "existing"})`
          );
        }

        // Enrich linked job with carrier info from analysis (only if fields are empty)
        if (linkedJobId && analysis.carrier) {
          try {
            const { data: existingJob } = await admin
              .from("jobs")
              .select("insurance_data")
              .eq("id", linkedJobId)
              .single();

            if (existingJob) {
              const ins = (existingJob.insurance_data || {}) as Record<string, unknown>;
              let needsUpdate = false;
              const updatedIns = { ...ins };

              if (!ins.carrier_id && analysis.carrier) {
                updatedIns.carrier_id = analysis.carrier;
                needsUpdate = true;
              }
              if (!ins.policy_number && analysis.policyNumber) {
                updatedIns.policy_number = analysis.policyNumber;
                needsUpdate = true;
              }

              if (needsUpdate) {
                await admin
                  .from("jobs")
                  .update({
                    insurance_data: updatedIns,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", linkedJobId);
                console.log(
                  `[parse/policy-standalone] Enriched job ${linkedJobId} with carrier data`
                );
              }
            }
          } catch (enrichErr) {
            console.error(
              "[parse/policy-standalone] Job enrichment failed (non-blocking):",
              enrichErr
            );
          }
        }

        // Log activity
        if (linkedJobId) {
          await logActivity(admin, {
            jobId: linkedJobId,
            companyId: userProfile.company_id,
            userId: user.id,
            action: "policy_decoded",
            description: `Policy decoded — Risk: ${analysis.riskLevel}, Carrier: ${analysis.carrier || "Unknown"}`,
            metadata: {
              decodingId: policyDecodingId,
              riskLevel: analysis.riskLevel,
              carrier: analysis.carrier,
              confidence: analysis.confidence,
            },
          });
        }
      } catch (jobErr) {
        console.error(
          "[parse/policy-standalone] Job linking/enrichment failed (non-blocking):",
          jobErr
        );
      }

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
