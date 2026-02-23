"use server";

import { createClient } from "@/lib/supabase/server";
import {
  updateCompanySchema,
  updateProfileSchema,
  validate,
} from "@/lib/validations/schemas";

export async function updateCompany(data: unknown) {
  // ── Validate input ──────────────────────────────────────────
  const parsed = validate(updateCompanySchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired. Please sign in again." };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found." };
  if (profile.role === "member") {
    return { error: "Only owners and admins can update company info." };
  }

  const { error } = await supabase
    .from("companies")
    .update({
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      license_number: input.licenseNumber || null,
    })
    .eq("id", profile.company_id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateProfile(data: unknown) {
  // ── Validate input ──────────────────────────────────────────
  const parsed = validate(updateProfileSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired. Please sign in again." };

  const { error } = await supabase
    .from("users")
    .update({ full_name: input.fullName })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
