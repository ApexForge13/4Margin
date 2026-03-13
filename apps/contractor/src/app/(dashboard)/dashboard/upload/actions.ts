"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createJobInputSchema, validate } from "@/lib/validations/schemas";
import { findOrCreateJob } from "@/lib/jobs/auto-create";

// --- Helpers ---

function parseFloatOrNull(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseIntOrNull(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseInt(val);
  return isNaN(n) ? null : n;
}

// --- Types ---

interface CreateJobResult {
  jobId: string | null;
  supplementId: string | null;
  error: string | null;
}

export async function createJobAndSupplement(
  data: unknown
): Promise<CreateJobResult> {
  // ── Validate input ──────────────────────────────────────────
  const parsed = validate(createJobInputSchema, data);
  if (!parsed.success) {
    return { jobId: null, supplementId: null, error: parsed.error };
  }
  const input = parsed.data;
  const supabase = await createClient();

  // Verify auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { jobId: null, supplementId: null, error: "Session expired." };
  }

  // Get company_id
  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return { jobId: null, supplementId: null, error: "Company not found." };
  }

  const companyId = profile.company_id;

  // Upsert carrier by name (if provided)
  let carrierId: string | null = null;
  if (input.claimDetails.carrierName?.trim()) {
    const { data: carrier, error: carrierError } = await supabase
      .from("carriers")
      .upsert(
        { name: input.claimDetails.carrierName.trim() },
        { onConflict: "name" }
      )
      .select("id")
      .single();

    if (carrierError) {
      console.error("Carrier upsert error:", carrierError);
    } else {
      carrierId = carrier.id;
    }
  }

  // Find or create job via CRM auto-create
  let jobId: string;
  try {
    const jobResult = await findOrCreateJob(supabase, {
      companyId,
      createdBy: user.id,
      propertyAddress: input.claimDetails.propertyAddress || "",
      propertyCity: input.claimDetails.propertyCity || undefined,
      propertyState: input.claimDetails.propertyState || undefined,
      propertyZip: input.claimDetails.propertyZip || undefined,
      jobType: "insurance",
      insuranceData: {
        carrier_id: carrierId || undefined,
        claim_number: input.claimDetails.claimNumber || undefined,
        policy_number: input.claimDetails.policyNumber || undefined,
        date_of_loss: input.claimDetails.dateOfLoss || undefined,
        adjuster_name: input.claimDetails.adjusterName || undefined,
        adjuster_email: input.claimDetails.adjusterEmail || undefined,
        adjuster_phone: input.claimDetails.adjusterPhone || undefined,
        damage_type:
          (input.measurementData.damageTypes ?? []).join(",") || undefined,
        roof_type: undefined,
      },
      metadata: {
        description: input.claimDetails.claimDescription || undefined,
        adjuster_scope_notes:
          input.claimDetails.adjusterScopeNotes || undefined,
        items_believed_missing:
          input.claimDetails.itemsBelievedMissing || undefined,
        prior_supplement_history:
          input.claimDetails.priorSupplementHistory || undefined,
        gutters_nailed_through_drip_edge:
          input.claimDetails.guttersNailedThroughDripEdge || undefined,
        roof_under_warranty:
          input.claimDetails.roofUnderWarranty || undefined,
        pre_existing_conditions:
          input.claimDetails.preExistingConditions || undefined,
        notes: input.claimName || undefined,
      },
    });
    jobId = jobResult.jobId;
  } catch (err) {
    return {
      jobId: null,
      supplementId: null,
      error:
        err instanceof Error ? err.message : "Failed to create job.",
    };
  }

  // Update measurement data on the job (typed columns)
  const { error: measurementError } = await supabase
    .from("jobs")
    .update({
      roof_squares: parseFloatOrNull(input.measurementData.measuredSquares),
      waste_percent: parseFloatOrNull(input.measurementData.wastePercent),
      suggested_squares: parseFloatOrNull(
        input.measurementData.suggestedSquares
      ),
      roof_pitch: input.measurementData.predominantPitch || null,
      ft_ridges: parseFloatOrNull(input.measurementData.ftRidges),
      ft_hips: parseFloatOrNull(input.measurementData.ftHips),
      ft_valleys: parseFloatOrNull(input.measurementData.ftValleys),
      ft_rakes: parseFloatOrNull(input.measurementData.ftRakes),
      ft_eaves: parseFloatOrNull(input.measurementData.ftEaves),
      ft_drip_edge: parseFloatOrNull(input.measurementData.ftDripEdge),
      ft_parapet: parseFloatOrNull(input.measurementData.ftParapet),
      ft_flashing: parseFloatOrNull(input.measurementData.ftFlashing),
      ft_step_flashing: parseFloatOrNull(input.measurementData.ftStepFlashing),
      accessories: input.measurementData.accessories || null,
      total_roof_area: parseFloatOrNull(input.measurementData.totalRoofArea),
      total_roof_area_less_penetrations: parseFloatOrNull(
        input.measurementData.totalRoofAreaLessPenetrations
      ),
      num_ridges: parseIntOrNull(input.measurementData.numRidges),
      num_hips: parseIntOrNull(input.measurementData.numHips),
      num_valleys: parseIntOrNull(input.measurementData.numValleys),
      num_rakes: parseIntOrNull(input.measurementData.numRakes),
      num_eaves: parseIntOrNull(input.measurementData.numEaves),
      num_flashing_lengths: parseIntOrNull(
        input.measurementData.numFlashingLengths
      ),
      num_step_flashing_lengths: parseIntOrNull(
        input.measurementData.numStepFlashingLengths
      ),
      total_penetrations_area: parseFloatOrNull(
        input.measurementData.totalPenetrationsArea
      ),
      total_penetrations_perimeter: parseFloatOrNull(
        input.measurementData.totalPenetrationsPerimeter
      ),
      pitch_breakdown:
        (input.measurementData.pitchBreakdown ?? []).length > 0
          ? input.measurementData.pitchBreakdown
          : null,
      structure_complexity:
        input.measurementData.structureComplexity || null,
      steep_squares: parseFloatOrNull(input.measurementData.steepSquares),
      high_story_squares: parseFloatOrNull(
        input.measurementData.highStorySquares
      ),
      damage_types:
        (input.measurementData.damageTypes ?? []).length > 0
          ? input.measurementData.damageTypes
          : null,
      notes: input.claimName,
    })
    .eq("id", jobId);

  if (measurementError) {
    console.error("Job measurement update error:", measurementError);
    // Non-fatal — job already created, continue with supplement creation
  }

  // Create supplement
  // Policy PDF URL is stored here — the pipeline will download and parse it
  // with full claim context during generation for better analysis accuracy.
  const supplementInsert: Record<string, unknown> = {
    company_id: companyId,
    job_id: jobId,
    status: "draft",
    adjuster_estimate_url: input.estimateStoragePath,
    created_by: user.id,
  };
  if (input.policyPdfUrl) {
    supplementInsert.policy_pdf_url = input.policyPdfUrl;
  }

  const { data: supplement, error: supplementError } = await supabase
    .from("supplements")
    .insert(supplementInsert)
    .select("id")
    .single();

  if (supplementError || !supplement) {
    return {
      jobId,
      supplementId: null,
      error: supplementError?.message || "Failed to create supplement.",
    };
  }

  // Create photo records
  if (input.photoMeta.length > 0) {
    const photoRows = input.photoMeta.map((p) => ({
      job_id: jobId,
      company_id: companyId,
      storage_path: p.storagePath,
      file_name: p.fileName,
      file_size: p.fileSize,
      mime_type: p.mimeType,
      notes: p.note || null,
    }));

    const { error: photoError } = await supabase
      .from("photos")
      .insert(photoRows);

    if (photoError) {
      console.error("Photo insert error:", photoError);
      // Non-fatal — job and supplement already created
    }
  }

  // Revalidate dashboard caches so the new supplement appears immediately
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");

  return { jobId, supplementId: supplement.id, error: null };
}

/** @deprecated Use createJobAndSupplement */
export const createClaimAndSupplement = createJobAndSupplement;
