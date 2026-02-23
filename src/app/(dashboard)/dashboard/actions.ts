"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  updateClaimSchema,
  updateSupplementStatusSchema,
  resultSupplementSchema,
  validate,
} from "@/lib/validations/schemas";
import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid ID format");

export async function updateClaim(claimId: string, data: unknown) {
  const idResult = uuidSchema.safeParse(claimId);
  if (!idResult.success) return { error: "Invalid claim ID." };

  const parsed = validate(updateClaimSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  // Handle carrier upsert
  let carrierId: string | null = null;
  if (input.carrierName?.trim()) {
    const { data: carrier } = await supabase
      .from("carriers")
      .upsert({ name: input.carrierName.trim() }, { onConflict: "name" })
      .select("id")
      .single();
    carrierId = carrier?.id || null;
  }

  const { error } = await supabase
    .from("claims")
    .update({
      notes: input.notes || null,
      claim_number: input.claimNumber || null,
      policy_number: input.policyNumber || null,
      property_address: input.propertyAddress || null,
      property_city: input.propertyCity || null,
      property_state: input.propertyState || null,
      property_zip: input.propertyZip || null,
      date_of_loss: input.dateOfLoss || null,
      adjuster_name: input.adjusterName || null,
      adjuster_email: input.adjusterEmail || null,
      adjuster_phone: input.adjusterPhone || null,
      carrier_id: carrierId,
    })
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  return { error: null };
}

export async function archiveClaim(claimId: string) {
  const idResult = uuidSchema.safeParse(claimId);
  if (!idResult.success) return { error: "Invalid claim ID." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const { error } = await supabase
    .from("claims")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  return { error: null };
}

export async function restoreClaim(claimId: string) {
  const idResult = uuidSchema.safeParse(claimId);
  if (!idResult.success) return { error: "Invalid claim ID." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const { error } = await supabase
    .from("claims")
    .update({ archived_at: null })
    .eq("id", idResult.data);

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
  const parsed = validate(updateSupplementStatusSchema, {
    supplementId,
    newStatus,
    submittedTo: data?.submittedTo,
  });
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const updatePayload: Record<string, unknown> = {
    status: input.newStatus,
    submitted_at: new Date().toISOString(),
  };
  if (input.submittedTo) {
    updatePayload.submitted_to = input.submittedTo;
  }

  const { error } = await supabase
    .from("supplements")
    .update(updatePayload)
    .eq("id", input.supplementId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  revalidatePath(`/dashboard/supplements/${input.supplementId}`);
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
  const parsed = validate(resultSupplementSchema, {
    supplementId,
    outcome,
    ...data,
  });
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const updatePayload: Record<string, unknown> = {
    status: input.outcome,
    carrier_responded_at: new Date().toISOString(),
  };

  if (input.outcome === "partially_approved" && input.approvedAmount != null) {
    updatePayload.approved_amount = input.approvedAmount;
  }
  if (input.outcome === "denied" && input.denialReason) {
    updatePayload.denial_reason = input.denialReason;
  }
  if (input.carrierResponseUrl) {
    updatePayload.carrier_response_url = input.carrierResponseUrl;
  }

  const { error } = await supabase
    .from("supplements")
    .update(updatePayload)
    .eq("id", input.supplementId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  revalidatePath(`/dashboard/supplements/${input.supplementId}`);
  return { error: null };
}

export async function uploadCarrierResponse(
  supplementId: string,
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  const idResult = uuidSchema.safeParse(supplementId);
  if (!idResult.success) return { url: null, error: "Invalid supplement ID." };

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

  // Basic file validation
  if (file.size > 52_428_800) {
    return { url: null, error: "File too large. Maximum size is 50 MB." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const storagePath = `${profile.company_id}/${idResult.data}/carrier-response-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("carrier-responses")
    .upload(storagePath, file, { cacheControl: "3600", upsert: false });

  if (uploadError) return { url: null, error: uploadError.message };

  const { error: updateError } = await supabase
    .from("supplements")
    .update({ carrier_response_url: storagePath })
    .eq("id", idResult.data);

  if (updateError) return { url: null, error: updateError.message };

  revalidatePath(`/dashboard/supplements/${idResult.data}`);
  return { url: storagePath, error: null };
}
