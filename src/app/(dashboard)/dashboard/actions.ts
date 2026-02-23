"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateClaim(
  claimId: string,
  data: {
    notes: string;
    claimNumber: string;
    policyNumber: string;
    propertyAddress: string;
    propertyCity: string;
    propertyState: string;
    propertyZip: string;
    dateOfLoss: string;
    adjusterName: string;
    adjusterEmail: string;
    adjusterPhone: string;
    carrierName: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  // Handle carrier upsert
  let carrierId: string | null = null;
  if (data.carrierName.trim()) {
    const { data: carrier } = await supabase
      .from("carriers")
      .upsert({ name: data.carrierName.trim() }, { onConflict: "name" })
      .select("id")
      .single();
    carrierId = carrier?.id || null;
  }

  const { error } = await supabase
    .from("claims")
    .update({
      notes: data.notes || null,
      claim_number: data.claimNumber || null,
      policy_number: data.policyNumber || null,
      property_address: data.propertyAddress || null,
      property_city: data.propertyCity || null,
      property_state: data.propertyState || null,
      property_zip: data.propertyZip || null,
      date_of_loss: data.dateOfLoss || null,
      adjuster_name: data.adjusterName || null,
      adjuster_email: data.adjusterEmail || null,
      adjuster_phone: data.adjusterPhone || null,
      carrier_id: carrierId,
    })
    .eq("id", claimId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  return { error: null };
}

export async function archiveClaim(claimId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const { error } = await supabase
    .from("claims")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", claimId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  return { error: null };
}

export async function restoreClaim(claimId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const { error } = await supabase
    .from("claims")
    .update({ archived_at: null })
    .eq("id", claimId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  return { error: null };
}

// ── Supplement Status Actions ───────────────────────────────

export async function updateSupplementStatus(
  supplementId: string,
  newStatus: "submitted",
  data?: { submittedTo?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    submitted_at: new Date().toISOString(),
  };
  if (data?.submittedTo) {
    updatePayload.submitted_to = data.submittedTo;
  }

  const { error } = await supabase
    .from("supplements")
    .update(updatePayload)
    .eq("id", supplementId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  revalidatePath(`/dashboard/supplements/${supplementId}`);
  return { error: null };
}

export async function resultSupplement(
  supplementId: string,
  outcome: "approved" | "partially_approved" | "denied",
  data: {
    approvedAmount?: number;
    denialReason?: string;
    carrierResponseUrl?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const updatePayload: Record<string, unknown> = {
    status: outcome,
    carrier_responded_at: new Date().toISOString(),
  };

  if (outcome === "partially_approved" && data.approvedAmount != null) {
    updatePayload.approved_amount = data.approvedAmount;
  }
  if (outcome === "denied" && data.denialReason) {
    updatePayload.denial_reason = data.denialReason;
  }
  if (data.carrierResponseUrl) {
    updatePayload.carrier_response_url = data.carrierResponseUrl;
  }

  const { error } = await supabase
    .from("supplements")
    .update(updatePayload)
    .eq("id", supplementId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  revalidatePath(`/dashboard/supplements/${supplementId}`);
  return { error: null };
}

export async function uploadCarrierResponse(
  supplementId: string,
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Session expired." };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return { url: null, error: "Company not found." };
  }

  const file = formData.get("file") as File;
  if (!file) return { url: null, error: "No file provided." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const storagePath = `${profile.company_id}/${supplementId}/carrier-response-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("carrier-responses")
    .upload(storagePath, file, { cacheControl: "3600", upsert: false });

  if (uploadError) return { url: null, error: uploadError.message };

  const { error: updateError } = await supabase
    .from("supplements")
    .update({ carrier_response_url: storagePath })
    .eq("id", supplementId);

  if (updateError) return { url: null, error: updateError.message };

  revalidatePath(`/dashboard/supplements/${supplementId}`);
  return { url: storagePath, error: null };
}
