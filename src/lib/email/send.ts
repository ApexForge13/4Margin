/**
 * Email Sending Functions
 *
 * High-level functions that fetch context from DB and send branded emails.
 * All sends are fire-and-forget — errors are logged but never block the pipeline.
 */

import { getResendClient, FROM_EMAIL } from "./client";
import {
  supplementReadyEmail,
  paymentConfirmationEmail,
  pipelineErrorEmail,
  teamInviteEmail,
} from "./templates";
import { createAdminClient } from "@/lib/supabase/admin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.4margin.com";

// ─── Helpers ─────────────────────────────────────────────────

async function getSupplementContext(supplementId: string) {
  const supabase = createAdminClient();

  const { data: supplement } = await supabase
    .from("supplements")
    .select("claim_id, company_id, supplement_total")
    .eq("id", supplementId)
    .single();

  if (!supplement) return null;

  const { data: claim } = await supabase
    .from("claims")
    .select(
      "claim_number, property_address, property_city, property_state, property_zip, user_id"
    )
    .eq("id", supplement.claim_id)
    .single();

  if (!claim) return null;

  const { data: user } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", claim.user_id)
    .single();

  if (!user) return null;

  const propertyAddress = [
    claim.property_address,
    claim.property_city,
    claim.property_state,
    claim.property_zip,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    email: user.email,
    userName: user.full_name || "there",
    claimNumber: claim.claim_number || "",
    propertyAddress,
    supplementTotal: supplement.supplement_total ?? 0,
    supplementUrl: `${APP_URL}/dashboard/supplements/${supplementId}`,
  };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Send "supplement ready" notification after pipeline completes successfully.
 */
export async function sendSupplementReadyEmail(
  supplementId: string,
  itemCount: number,
  isFree: boolean
): Promise<void> {
  try {
    const ctx = await getSupplementContext(supplementId);
    if (!ctx) return;

    const resend = getResendClient();
    const { subject, html } = supplementReadyEmail({
      userName: ctx.userName,
      claimNumber: ctx.claimNumber,
      propertyAddress: ctx.propertyAddress,
      itemCount,
      supplementTotal: ctx.supplementTotal,
      supplementUrl: ctx.supplementUrl,
      isFree,
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ctx.email,
      subject,
      html,
    });

    console.log(`[email] Supplement ready email sent to ${ctx.email}`);
  } catch (err) {
    console.error("[email] Failed to send supplement ready email:", err);
  }
}

/**
 * Send payment confirmation after Stripe webhook fires.
 */
export async function sendPaymentConfirmationEmail(
  supplementId: string,
  amountPaid: number
): Promise<void> {
  try {
    const ctx = await getSupplementContext(supplementId);
    if (!ctx) return;

    const resend = getResendClient();
    const { subject, html } = paymentConfirmationEmail({
      userName: ctx.userName,
      claimNumber: ctx.claimNumber,
      propertyAddress: ctx.propertyAddress,
      amount: amountPaid,
      supplementUrl: ctx.supplementUrl,
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ctx.email,
      subject,
      html,
    });

    console.log(`[email] Payment confirmation sent to ${ctx.email}`);
  } catch (err) {
    console.error("[email] Failed to send payment confirmation:", err);
  }
}

/**
 * Send pipeline error notification so user knows to check their upload.
 */
export async function sendPipelineErrorEmail(
  supplementId: string
): Promise<void> {
  try {
    const ctx = await getSupplementContext(supplementId);
    if (!ctx) return;

    const resend = getResendClient();
    const { subject, html } = pipelineErrorEmail({
      userName: ctx.userName,
      claimNumber: ctx.claimNumber,
      supplementUrl: ctx.supplementUrl,
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ctx.email,
      subject,
      html,
    });

    console.log(`[email] Pipeline error email sent to ${ctx.email}`);
  } catch (err) {
    console.error("[email] Failed to send pipeline error email:", err);
  }
}

/**
 * Send team invite email with branded template.
 */
export async function sendTeamInviteEmail(data: {
  to: string;
  inviterName: string;
  companyName: string;
  role: string;
  token: string;
}): Promise<void> {
  try {
    const resend = getResendClient();
    const inviteUrl = `${APP_URL}/auth/invite?token=${data.token}`;
    const { subject, html } = teamInviteEmail({
      inviterName: data.inviterName,
      companyName: data.companyName,
      role: data.role,
      inviteUrl,
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject,
      html,
    });

    console.log(`[email] Team invite sent to ${data.to}`);
  } catch (err) {
    console.error("[email] Failed to send team invite email:", err);
  }
}
