"use server";

import { createClient } from "@/lib/supabase/server";
import { createClaimInputSchema, validate } from "@/lib/validations/schemas";

interface CreateClaimResult {
  claimId: string | null;
  supplementId: string | null;
  error: string | null;
}

export async function createClaimAndSupplement(
  data: unknown
): Promise<CreateClaimResult> {
  // ── Validate input ──────────────────────────────────────────
  const parsed = validate(createClaimInputSchema, data);
  if (!parsed.success) {
    return { claimId: null, supplementId: null, error: parsed.error };
  }
  const input = parsed.data;
  const supabase = await createClient();

  // Verify auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { claimId: null, supplementId: null, error: "Session expired." };
  }

  // Get company_id
  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return { claimId: null, supplementId: null, error: "Company not found." };
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

  // Create claim
  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .insert({
      company_id: companyId,
      carrier_id: carrierId,
      claim_number: input.claimDetails.claimNumber || null,
      policy_number: input.claimDetails.policyNumber || null,
      property_address: input.claimDetails.propertyAddress || null,
      property_city: input.claimDetails.propertyCity || null,
      property_state: input.claimDetails.propertyState || null,
      property_zip: input.claimDetails.propertyZip || null,
      date_of_loss: input.claimDetails.dateOfLoss || null,
      adjuster_name: input.claimDetails.adjusterName || null,
      adjuster_email: input.claimDetails.adjusterEmail || null,
      adjuster_phone: input.claimDetails.adjusterPhone || null,
      roof_squares: input.measurementData.measuredSquares
        ? parseFloat(input.measurementData.measuredSquares)
        : null,
      waste_percent: input.measurementData.wastePercent
        ? parseFloat(input.measurementData.wastePercent)
        : null,
      suggested_squares: input.measurementData.suggestedSquares
        ? parseFloat(input.measurementData.suggestedSquares)
        : null,
      roof_pitch: input.measurementData.predominantPitch || null,
      ft_ridges: input.measurementData.ftRidges
        ? parseFloat(input.measurementData.ftRidges)
        : null,
      ft_hips: input.measurementData.ftHips
        ? parseFloat(input.measurementData.ftHips)
        : null,
      ft_valleys: input.measurementData.ftValleys
        ? parseFloat(input.measurementData.ftValleys)
        : null,
      ft_rakes: input.measurementData.ftRakes
        ? parseFloat(input.measurementData.ftRakes)
        : null,
      ft_eaves: input.measurementData.ftEaves
        ? parseFloat(input.measurementData.ftEaves)
        : null,
      ft_drip_edge: input.measurementData.ftDripEdge
        ? parseFloat(input.measurementData.ftDripEdge)
        : null,
      ft_parapet: input.measurementData.ftParapet
        ? parseFloat(input.measurementData.ftParapet)
        : null,
      ft_flashing: input.measurementData.ftFlashing
        ? parseFloat(input.measurementData.ftFlashing)
        : null,
      ft_step_flashing: input.measurementData.ftStepFlashing
        ? parseFloat(input.measurementData.ftStepFlashing)
        : null,
      accessories: input.measurementData.accessories || null,
      damage_types: (input.measurementData.damageTypes ?? []).length > 0
        ? input.measurementData.damageTypes
        : null,
      description: input.claimDetails.claimDescription || null,
      adjuster_scope_notes: input.claimDetails.adjusterScopeNotes || null,
      items_believed_missing: input.claimDetails.itemsBelievedMissing || null,
      prior_supplement_history: input.claimDetails.priorSupplementHistory || null,
      notes: input.claimName,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (claimError || !claim) {
    return {
      claimId: null,
      supplementId: null,
      error: claimError?.message || "Failed to create claim.",
    };
  }

  // Create supplement
  const { data: supplement, error: supplementError } = await supabase
    .from("supplements")
    .insert({
      company_id: companyId,
      claim_id: claim.id,
      status: "generating",
      adjuster_estimate_url: input.estimateStoragePath,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (supplementError || !supplement) {
    return {
      claimId: claim.id,
      supplementId: null,
      error: supplementError?.message || "Failed to create supplement.",
    };
  }

  // Create photo records
  if (input.photoMeta.length > 0) {
    const photoRows = input.photoMeta.map((p) => ({
      claim_id: claim.id,
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
      // Non-fatal — claim and supplement already created
    }
  }

  return { claimId: claim.id, supplementId: supplement.id, error: null };
}
