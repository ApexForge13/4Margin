"use server";

import { createClient } from "@/lib/supabase/server";
import type { ClaimDetails, MeasurementData } from "@/types/wizard";

interface PhotoMeta {
  fileName: string;
  fileSize: number;
  mimeType: string;
  note: string;
  storagePath: string;
}

interface CreateClaimInput {
  claimName: string;
  claimDetails: ClaimDetails;
  measurementData: MeasurementData;
  photoMeta: PhotoMeta[];
  estimateStoragePath: string;
}

interface CreateClaimResult {
  claimId: string | null;
  supplementId: string | null;
  error: string | null;
}

export async function createClaimAndSupplement(
  data: CreateClaimInput
): Promise<CreateClaimResult> {
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
  if (data.claimDetails.carrierName.trim()) {
    const { data: carrier, error: carrierError } = await supabase
      .from("carriers")
      .upsert(
        { name: data.claimDetails.carrierName.trim() },
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
      claim_number: data.claimDetails.claimNumber || null,
      policy_number: data.claimDetails.policyNumber || null,
      property_address: data.claimDetails.propertyAddress || null,
      property_city: data.claimDetails.propertyCity || null,
      property_state: data.claimDetails.propertyState || null,
      property_zip: data.claimDetails.propertyZip || null,
      date_of_loss: data.claimDetails.dateOfLoss || null,
      adjuster_name: data.claimDetails.adjusterName || null,
      adjuster_email: data.claimDetails.adjusterEmail || null,
      adjuster_phone: data.claimDetails.adjusterPhone || null,
      roof_squares: data.measurementData.measuredSquares
        ? parseFloat(data.measurementData.measuredSquares)
        : null,
      waste_percent: data.measurementData.wastePercent
        ? parseFloat(data.measurementData.wastePercent)
        : null,
      suggested_squares: data.measurementData.suggestedSquares
        ? parseFloat(data.measurementData.suggestedSquares)
        : null,
      roof_pitch: data.measurementData.predominantPitch || null,
      ft_ridges: data.measurementData.ftRidges
        ? parseFloat(data.measurementData.ftRidges)
        : null,
      ft_hips: data.measurementData.ftHips
        ? parseFloat(data.measurementData.ftHips)
        : null,
      ft_valleys: data.measurementData.ftValleys
        ? parseFloat(data.measurementData.ftValleys)
        : null,
      ft_rakes: data.measurementData.ftRakes
        ? parseFloat(data.measurementData.ftRakes)
        : null,
      ft_eaves: data.measurementData.ftEaves
        ? parseFloat(data.measurementData.ftEaves)
        : null,
      ft_drip_edge: data.measurementData.ftDripEdge
        ? parseFloat(data.measurementData.ftDripEdge)
        : null,
      ft_parapet: data.measurementData.ftParapet
        ? parseFloat(data.measurementData.ftParapet)
        : null,
      ft_flashing: data.measurementData.ftFlashing
        ? parseFloat(data.measurementData.ftFlashing)
        : null,
      ft_step_flashing: data.measurementData.ftStepFlashing
        ? parseFloat(data.measurementData.ftStepFlashing)
        : null,
      accessories: data.measurementData.accessories || null,
      damage_types: data.measurementData.damageTypes.length > 0
        ? data.measurementData.damageTypes
        : null,
      description: data.claimDetails.claimDescription || null,
      notes: data.claimName,
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
      // TODO: change to "generating" once AI pipeline is wired up
      status: "complete",
      adjuster_estimate_url: data.estimateStoragePath,
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
  if (data.photoMeta.length > 0) {
    const photoRows = data.photoMeta.map((p) => ({
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
