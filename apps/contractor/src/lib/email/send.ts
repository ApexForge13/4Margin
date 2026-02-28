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
  policyCheckInviteEmail,
  policyCheckCompleteEmail,
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
/**
 * Send policy check invite to homeowner after contractor pays.
 */
export async function sendPolicyCheckInviteEmail(
  checkId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: check } = await supabase
      .from("policy_checks")
      .select("token, homeowner_first_name, homeowner_email, claim_type, company_id")
      .eq("id", checkId)
      .single();

    if (!check) return;

    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", check.company_id)
      .single();

    if (!company) return;

    const DECODECOVERAGE_URL =
      process.env.DECODECOVERAGE_URL || "https://decodecoverage.com";

    const claimTypeLabels: Record<string, string> = {
      wind: "wind",
      hail: "hail",
      fire: "fire",
      water_flood: "water/flood",
      impact: "impact",
      theft: "theft",
      other: "",
    };

    const resend = getResendClient();
    const { subject, html } = policyCheckInviteEmail({
      companyName: company.name,
      homeownerName: check.homeowner_first_name || "",
      claimType: check.claim_type
        ? claimTypeLabels[check.claim_type] || check.claim_type
        : undefined,
      checkUrl: `${DECODECOVERAGE_URL}/check/${check.token}`,
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: check.homeowner_email,
      subject,
      html,
    });

    // Mark as sent
    await supabase
      .from("policy_checks")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", checkId);

    console.log(
      `[email] Policy check invite sent to ${check.homeowner_email}`
    );
  } catch (err) {
    console.error("[email] Failed to send policy check invite:", err);
  }
}

/**
 * Send notification to contractor when homeowner completes policy check.
 */
export async function sendPolicyCheckCompleteEmail(
  checkId: string,
  scoreGrade: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: check } = await supabase
      .from("policy_checks")
      .select(
        "homeowner_first_name, homeowner_last_name, carrier, created_by"
      )
      .eq("id", checkId)
      .single();

    if (!check) return;

    const { data: creator } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", check.created_by)
      .single();

    if (!creator) return;

    const homeownerName = [
      check.homeowner_first_name,
      check.homeowner_last_name,
    ]
      .filter(Boolean)
      .join(" ") || "Homeowner";

    const resend = getResendClient();
    const { subject, html } = policyCheckCompleteEmail({
      userName: creator.full_name || "there",
      homeownerName,
      carrier: check.carrier || "",
      scoreGrade,
      checkUrl: `${APP_URL}/dashboard/policy-checks/${checkId}`,
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: creator.email,
      subject,
      html,
    });

    console.log(
      `[email] Policy check complete notification sent to ${creator.email}`
    );
  } catch (err) {
    console.error("[email] Failed to send policy check complete email:", err);
  }
}

/**
 * Send concierge email to homeowner when policy scores D/F and contractor marks "no claim".
 * This is DecodeCoverage-branded (sent from reports@decodecoverage.com).
 */
export async function sendConciergeEmail(checkId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: check } = await supabase
      .from("policy_checks")
      .select("token, homeowner_first_name, homeowner_email, policy_analysis")
      .eq("id", checkId)
      .single();

    if (!check || !check.homeowner_email) return;

    // Calculate grade
    const { calculatePolicyScore } = await import("@/lib/policy-score");
    let grade = "D";
    if (check.policy_analysis) {
      const scoreResult = calculatePolicyScore(
        check.policy_analysis as Parameters<typeof calculatePolicyScore>[0]
      );
      grade = scoreResult.grade;
    }

    const DECODECOVERAGE_URL =
      process.env.DECODECOVERAGE_URL || "https://decodecoverage.com";
    const optInUrl = `${DECODECOVERAGE_URL}/check/${check.token}/opt-in`;
    const firstName = check.homeowner_first_name || "there";

    const gradeColor =
      grade === "F" ? "#DC2626" : grade === "D" ? "#EA580C" : "#D97706";

    const resend = getResendClient();
    await resend.emails.send({
      from: "DecodeCoverage <reports@decodecoverage.com>",
      to: check.homeowner_email,
      subject: `Your policy scored a ${grade} — free expert review available`,
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; color: #1A1A1A; margin-bottom: 16px;">
            Hi ${firstName}, your policy needs attention
          </h1>
          <p style="font-size: 16px; color: #5A5A5A; line-height: 1.6; margin-bottom: 16px;">
            Based on your recent policy analysis, your homeowners insurance scored a
            <strong style="color: ${gradeColor}; font-size: 20px;">${grade}</strong>,
            which means your coverage has significant gaps that could leave you paying
            thousands out of pocket on a claim.
          </p>
          <p style="font-size: 16px; color: #5A5A5A; line-height: 1.6; margin-bottom: 24px;">
            A licensed insurance professional can review your options and find you
            better coverage — often at a similar or lower premium. This review is
            completely free and there's no obligation.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a
              href="${optInUrl}"
              style="display: inline-block; padding: 14px 32px; background: #1B6B4A; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;"
            >
              Get a Free Expert Review
            </a>
          </div>
          <p style="font-size: 14px; color: #8A8A8A; line-height: 1.5; margin-bottom: 32px;">
            Not interested? No worries — you can also decline on the page above.
            We'll never share your information without your permission.
          </p>
          <hr style="border: none; border-top: 1px solid #E5E5E0; margin: 32px 0;" />
          <p style="font-size: 12px; color: #8A8A8A;">
            Powered by <a href="https://4margin.com" style="color: #1B6B4A;">4Margin</a>
          </p>
        </div>
      `,
    });

    console.log(
      `[email] Concierge email sent to ${check.homeowner_email}`
    );
  } catch (err) {
    console.error("[email] Failed to send concierge email:", err);
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
