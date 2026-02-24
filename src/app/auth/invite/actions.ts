"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function acceptInvite(token: string) {
  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Please sign in first." };
  }

  const admin = createAdminClient();

  // Fetch the invite
  const { data: invite } = await admin
    .from("invites")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .single();

  if (!invite) {
    return { error: "Invite not found or already accepted." };
  }

  // Check if expired
  if (new Date(invite.expires_at) < new Date()) {
    return { error: "This invite has expired. Ask your admin to send a new one." };
  }

  // Check if user already has a company
  const { data: existingProfile } = await admin
    .from("users")
    .select("id, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.company_id) {
    return { error: "You are already a member of a company." };
  }

  // If user has a profile but no company, update it
  if (existingProfile) {
    const { error: updateError } = await admin
      .from("users")
      .update({
        company_id: invite.company_id,
        role: invite.role,
      })
      .eq("id", user.id);

    if (updateError) {
      return { error: updateError.message };
    }
  } else {
    // Create new user profile linked to the company
    const { error: insertError } = await admin.from("users").insert({
      id: user.id,
      company_id: invite.company_id,
      full_name: user.user_metadata?.full_name || user.email || "User",
      email: user.email!,
      role: invite.role,
    });

    if (insertError) {
      return { error: insertError.message };
    }
  }

  // Mark invite as accepted
  await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  return { error: null };
}
