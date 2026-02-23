"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  xactimateCodeSchema,
  carrierSchema,
  validate,
} from "@/lib/validations/schemas";
import { z } from "zod";

// ── Helpers ─────────────────────────────────────────────────

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." as const, profile: null };

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "member") {
    return { error: "Permission denied." as const, profile: null };
  }
  return { error: null, profile };
}

const uuidSchema = z.string().uuid("Invalid ID format");

// ── Xactimate Codes ─────────────────────────────────────────

export async function createCode(data: unknown) {
  const parsed = validate(xactimateCodeSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin.from("xactimate_codes").insert({
    code: input.code,
    category: input.category,
    description: input.description,
    unit: input.unit,
    default_justification: input.defaultJustification || null,
    irc_reference: input.ircReference || null,
    commonly_missed: input.commonlyMissed,
    notes: input.notes || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function updateCode(codeId: string, data: unknown) {
  const idResult = uuidSchema.safeParse(codeId);
  if (!idResult.success) return { error: "Invalid code ID." };

  const parsed = validate(xactimateCodeSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("xactimate_codes")
    .update({
      code: input.code,
      category: input.category,
      description: input.description,
      unit: input.unit,
      default_justification: input.defaultJustification || null,
      irc_reference: input.ircReference || null,
      commonly_missed: input.commonlyMissed,
      notes: input.notes || null,
    })
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function deleteCode(codeId: string) {
  const idResult = uuidSchema.safeParse(codeId);
  if (!idResult.success) return { error: "Invalid code ID." };

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("xactimate_codes")
    .delete()
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

// ── Carriers ────────────────────────────────────────────────

export async function createCarrier(data: unknown) {
  const parsed = validate(carrierSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin.from("carriers").insert({
    name: input.name,
    claims_email: input.claimsEmail || null,
    claims_phone: input.claimsPhone || null,
    claims_portal_url: input.claimsPortalUrl || null,
    notes: input.notes || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function updateCarrier(carrierId: string, data: unknown) {
  const idResult = uuidSchema.safeParse(carrierId);
  if (!idResult.success) return { error: "Invalid carrier ID." };

  const parsed = validate(carrierSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("carriers")
    .update({
      name: input.name,
      claims_email: input.claimsEmail || null,
      claims_phone: input.claimsPhone || null,
      claims_portal_url: input.claimsPortalUrl || null,
      notes: input.notes || null,
    })
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function deleteCarrier(carrierId: string) {
  const idResult = uuidSchema.safeParse(carrierId);
  if (!idResult.success) return { error: "Invalid carrier ID." };

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();

  // Unlink any claims referencing this carrier before deleting
  await admin
    .from("claims")
    .update({ carrier_id: null })
    .eq("carrier_id", idResult.data);

  const { error } = await admin
    .from("carriers")
    .delete()
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}
