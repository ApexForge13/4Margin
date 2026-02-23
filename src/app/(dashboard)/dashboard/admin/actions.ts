"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

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

// ── Xactimate Codes ─────────────────────────────────────────

export async function createCode(data: {
  code: string;
  category: string;
  description: string;
  unit: string;
  defaultJustification: string;
  ircReference: string;
  commonlyMissed: boolean;
  notes: string;
}) {
  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin.from("xactimate_codes").insert({
    code: data.code.trim(),
    category: data.category.trim(),
    description: data.description.trim(),
    unit: data.unit.trim(),
    default_justification: data.defaultJustification.trim() || null,
    irc_reference: data.ircReference.trim() || null,
    commonly_missed: data.commonlyMissed,
    notes: data.notes.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function updateCode(
  codeId: string,
  data: {
    code: string;
    category: string;
    description: string;
    unit: string;
    defaultJustification: string;
    ircReference: string;
    commonlyMissed: boolean;
    notes: string;
  }
) {
  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("xactimate_codes")
    .update({
      code: data.code.trim(),
      category: data.category.trim(),
      description: data.description.trim(),
      unit: data.unit.trim(),
      default_justification: data.defaultJustification.trim() || null,
      irc_reference: data.ircReference.trim() || null,
      commonly_missed: data.commonlyMissed,
      notes: data.notes.trim() || null,
    })
    .eq("id", codeId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function deleteCode(codeId: string) {
  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("xactimate_codes")
    .delete()
    .eq("id", codeId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

// ── Carriers ────────────────────────────────────────────────

export async function createCarrier(data: {
  name: string;
  claimsEmail: string;
  claimsPhone: string;
  claimsPortalUrl: string;
  notes: string;
}) {
  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin.from("carriers").insert({
    name: data.name.trim(),
    claims_email: data.claimsEmail.trim() || null,
    claims_phone: data.claimsPhone.trim() || null,
    claims_portal_url: data.claimsPortalUrl.trim() || null,
    notes: data.notes.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function updateCarrier(
  carrierId: string,
  data: {
    name: string;
    claimsEmail: string;
    claimsPhone: string;
    claimsPortalUrl: string;
    notes: string;
  }
) {
  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("carriers")
    .update({
      name: data.name.trim(),
      claims_email: data.claimsEmail.trim() || null,
      claims_phone: data.claimsPhone.trim() || null,
      claims_portal_url: data.claimsPortalUrl.trim() || null,
      notes: data.notes.trim() || null,
    })
    .eq("id", carrierId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function deleteCarrier(carrierId: string) {
  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();

  // Unlink any claims referencing this carrier before deleting
  await admin
    .from("claims")
    .update({ carrier_id: null })
    .eq("carrier_id", carrierId);

  const { error } = await admin
    .from("carriers")
    .delete()
    .eq("id", carrierId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}
