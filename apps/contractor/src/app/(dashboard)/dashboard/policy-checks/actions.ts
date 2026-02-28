"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPolicyCheckInviteEmail, sendConciergeEmail } from "@/lib/email/send";

// ─── Types ──────────────────────────────────────────────────

export interface PolicyCheck {
  id: string;
  token: string;
  claim_type: string | null;
  homeowner_first_name: string | null;
  homeowner_last_name: string | null;
  homeowner_email: string;
  homeowner_phone: string | null;
  homeowner_address: string | null;
  status: string;
  carrier: string | null;
  policy_analysis: Record<string, unknown> | null;
  document_meta: Record<string, unknown> | null;
  payment_status: string;
  outcome: string | null;
  outcome_set_at: string | null;
  concierge_status: string;
  lead_contactable: boolean;
  sent_at: string | null;
  opened_at: string | null;
  submitted_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Create ─────────────────────────────────────────────────

export async function createPolicyCheck(data: {
  homeownerEmail: string;
  homeownerFirstName?: string;
  homeownerLastName?: string;
  claimType?: string;
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { id: null, error: "Unauthorized" };

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) return { id: null, error: "Company not found" };

    const { data: check, error } = await admin
      .from("policy_checks")
      .insert({
        company_id: profile.company_id,
        created_by: user.id,
        homeowner_email: data.homeownerEmail,
        homeowner_first_name: data.homeownerFirstName || null,
        homeowner_last_name: data.homeownerLastName || null,
        claim_type: data.claimType || null,
        status: "pending",
        payment_status: "unpaid",
      })
      .select("id")
      .single();

    if (error || !check) {
      console.error("[policy-checks] Insert error:", error);
      return { id: null, error: "Failed to create policy check" };
    }

    return { id: check.id, error: null };
  } catch (err) {
    console.error("[policy-checks] createPolicyCheck error:", err);
    return { id: null, error: "Internal error" };
  }
}

// ─── List ───────────────────────────────────────────────────

export async function getPolicyChecks(): Promise<PolicyCheck[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("policy_checks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[policy-checks] getPolicyChecks error:", error);
    return [];
  }

  return (data || []) as PolicyCheck[];
}

// ─── Get Single ─────────────────────────────────────────────

export async function getPolicyCheck(
  id: string
): Promise<PolicyCheck | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("policy_checks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[policy-checks] getPolicyCheck error:", error);
    return null;
  }

  return data as PolicyCheck;
}

// ─── Resend Invite ──────────────────────────────────────────

export async function resendCheckEmail(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    // Verify the check belongs to user's company (RLS handles this)
    const { data: check } = await supabase
      .from("policy_checks")
      .select("id, payment_status")
      .eq("id", id)
      .single();

    if (!check) return { success: false, error: "Policy check not found" };

    if (check.payment_status === "unpaid") {
      return { success: false, error: "Payment required before sending invite" };
    }

    await sendPolicyCheckInviteEmail(id);
    return { success: true, error: null };
  } catch (err) {
    console.error("[policy-checks] resendCheckEmail error:", err);
    return { success: false, error: "Failed to resend" };
  }
}

// ─── Set Outcome ────────────────────────────────────────────

export async function setCheckOutcome(
  id: string,
  outcome: "claim_filed" | "no_claim"
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const admin = createAdminClient();

    // Get the check (RLS verified via supabase client first)
    const { data: check } = await supabase
      .from("policy_checks")
      .select("id, status, policy_analysis")
      .eq("id", id)
      .single();

    if (!check) return { success: false, error: "Policy check not found" };

    if (check.status !== "complete") {
      return { success: false, error: "Check must be complete to set outcome" };
    }

    const updates: Record<string, unknown> = {
      outcome,
      outcome_set_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Lead lifecycle logic
    if (outcome === "no_claim" && check.policy_analysis) {
      // Import calculatePolicyScore dynamically to avoid bundling it unnecessarily
      const { calculatePolicyScore } = await import(
        "@/lib/policy-score"
      );
      const scoreResult = calculatePolicyScore(
        check.policy_analysis as Parameters<typeof calculatePolicyScore>[0]
      );

      if (scoreResult.grade === "D" || scoreResult.grade === "F") {
        // Bad policy + no claim → send concierge email to homeowner
        updates.concierge_status = "email_sent";
        updates.concierge_sent_at = new Date().toISOString();
        // Fire-and-forget — don't block the outcome update
        sendConciergeEmail(id).catch((err) =>
          console.error("[policy-checks] Concierge email error:", err)
        );
      } else {
        // OK policy + no claim → immediately contactable
        updates.lead_contactable = true;
      }
    }

    const { error } = await admin
      .from("policy_checks")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("[policy-checks] setCheckOutcome error:", error);
      return { success: false, error: "Failed to update outcome" };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("[policy-checks] setCheckOutcome error:", err);
    return { success: false, error: "Internal error" };
  }
}
