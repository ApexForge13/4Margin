"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  updateClaimSchema,
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

// ── Supplement Result Actions ────────────────────────────────

export async function resultSupplement(
  supplementId: string,
  outcome: "approved" | "partially_approved" | "denied",
  data: {
    approvedAmount?: number;
    denialReason?: string;
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

