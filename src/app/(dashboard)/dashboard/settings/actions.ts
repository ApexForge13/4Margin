"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateCompany(data: {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  licenseNumber: string;
}) {
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
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      license_number: data.licenseNumber || null,
    })
    .eq("id", profile.company_id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateProfile(data: { fullName: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired. Please sign in again." };

  const { error } = await supabase
    .from("users")
    .update({ full_name: data.fullName })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
