"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { onboardingSchema, validate } from "@/lib/validations/schemas";
import { getResendClient, FROM_EMAIL } from "@/lib/email/client";
import { welcomeEmail } from "@/lib/email/templates";

export async function createCompanyAndProfile(data: unknown) {
  // ── Validate input ──────────────────────────────────────────
  const parsed = validate(onboardingSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

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
      name: input.companyName,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      license_number: input.licenseNumber || null,
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

  // Send welcome email (non-blocking — don't fail onboarding if email fails)
  try {
    const resend = getResendClient();
    const { subject, html } = welcomeEmail({
      userName: user.user_metadata?.full_name || user.email || "there",
      companyName: input.companyName,
    });
    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email!,
      subject,
      html,
    });
  } catch (emailErr) {
    console.error("Welcome email failed:", emailErr);
  }

  return { error: null };
}
