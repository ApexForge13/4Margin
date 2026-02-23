"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface OnboardingData {
  companyName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  licenseNumber: string;
}

export async function createCompanyAndProfile(data: OnboardingData) {
  // Verify the user is authenticated via their session
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Session expired. Please sign in again." };
  }

  // Use the admin client (service role) to bypass RLS for onboarding
  const admin = createAdminClient();

  // Create the company
  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: data.companyName,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      license_number: data.licenseNumber || null,
    })
    .select()
    .single();

  if (companyError || !company) {
    return { error: companyError?.message || "Failed to create company." };
  }

  // Create the user profile linked to the company
  const { error: userError } = await admin.from("users").insert({
    id: user.id,
    company_id: company.id,
    full_name: user.user_metadata?.full_name || user.email || "User",
    email: user.email!,
    role: "owner",
  });

  if (userError) {
    // Roll back company creation if user profile fails
    await admin.from("companies").delete().eq("id", company.id);
    return { error: userError.message };
  }

  return { error: null };
}
