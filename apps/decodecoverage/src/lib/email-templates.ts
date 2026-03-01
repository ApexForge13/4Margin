/**
 * Email re-trigger sequence templates (4 emails over 7 days).
 * Each template is personalized with data from policy_analysis JSONB.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://decodecoverage.com";

interface EmailData {
  firstName: string;
  email: string;
  leadId: string;
  score: number;
  gapCount: number;
  primaryFinding?: string;
  state?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

function resultsLink(leadId: string): string {
  return `${BASE_URL}/results/${leadId}`;
}

function unsubscribeLink(leadId: string, email: string): string {
  return `${BASE_URL}/unsubscribe?id=${leadId}&email=${encodeURIComponent(email)}`;
}

function wrapper(content: string, leadId: string, email: string): string {
  return `
    <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      ${content}
      <hr style="border: none; border-top: 1px solid #E5E5E0; margin: 32px 0;" />
      <p style="font-size: 12px; color: #8A8A8A;">
        Powered by <a href="https://4margin.com" style="color: #1B6B4A;">4Margin</a>
        <br />
        <a href="${unsubscribeLink(leadId, email)}" style="color: #8A8A8A;">Unsubscribe</a>
      </p>
    </div>
  `;
}

/**
 * Email 1 — sent 1 hour after scan
 * Subject: Your Coverage Health Score: [Score]% — Here's What It Means
 */
export function emailSequence1(data: EmailData): EmailTemplate {
  const link = resultsLink(data.leadId);
  return {
    subject: `Your Coverage Health Score: ${data.score}% — Here's What It Means`,
    html: wrapper(`
      <h1 style="font-size: 22px; color: #1A1A1A; margin-bottom: 16px;">
        Hi ${data.firstName},
      </h1>
      <p style="font-size: 16px; color: #5A5A5A; line-height: 1.7; margin-bottom: 16px;">
        You scanned your policy earlier and your Coverage Health Score came back at
        <strong>${data.score}%</strong>. That means we found
        <strong>${data.gapCount} gap${data.gapCount !== 1 ? "s" : ""}</strong>
        that could cost you if something happens to your home.
      </p>
      <p style="font-size: 16px; color: #5A5A5A; line-height: 1.7; margin-bottom: 24px;">
        Your full report is still waiting for you:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${link}" style="display: inline-block; padding: 14px 32px; background: #1B6B4A; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
          View My Report
        </a>
      </div>
      <p style="font-size: 15px; color: #5A5A5A; line-height: 1.7;">
        No rush — but we'd hate for you to find out about these gaps the hard way.
      </p>
      <p style="font-size: 15px; color: #5A5A5A; margin-top: 24px;">
        — The DecodeCoverage Team
      </p>
    `, data.leadId, data.email),
  };
}

/**
 * Email 2 — sent 24 hours after scan
 * Subject: The $[amount] gap in your home insurance
 */
export function emailSequence2(data: EmailData): EmailTemplate {
  const link = resultsLink(data.leadId);
  const stateText = data.state ? ` in ${data.state}` : "";
  const findingText = data.primaryFinding || "a significant coverage gap that could leave you underprotected";
  return {
    subject: "The gap in your home insurance you should know about",
    html: wrapper(`
      <h1 style="font-size: 22px; color: #1A1A1A; margin-bottom: 16px;">
        ${data.firstName},
      </h1>
      <p style="font-size: 16px; color: #5A5A5A; line-height: 1.7; margin-bottom: 16px;">
        The biggest issue we found in your policy was
        <strong>${findingText}</strong>.
      </p>
      <p style="font-size: 16px; color: #5A5A5A; line-height: 1.7; margin-bottom: 24px;">
        For most homeowners${stateText}, this is the #1 surprise when they file a claim.
        Here's your full breakdown:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${link}" style="display: inline-block; padding: 14px 32px; background: #1B6B4A; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
          View My Full Breakdown
        </a>
      </div>
      <p style="font-size: 15px; color: #5A5A5A; line-height: 1.7;">
        If you want to talk to someone about it, reply to this email and we'll
        connect you with an independent advisor who's already reviewed your analysis.
      </p>
      <p style="font-size: 15px; color: #5A5A5A; margin-top: 24px;">
        — DC Team
      </p>
    `, data.leadId, data.email),
  };
}

/**
 * Email 3 — sent 72 hours after scan
 * Subject: Quick question about your policy
 */
export function emailSequence3(data: EmailData): EmailTemplate {
  const link = resultsLink(data.leadId);
  const stateText = data.state ? ` in ${data.state}` : "";
  return {
    subject: "Quick question about your policy",
    html: wrapper(`
      <h1 style="font-size: 22px; color: #1A1A1A; margin-bottom: 16px;">
        ${data.firstName} —
      </h1>
      <p style="font-size: 16px; color: #5A5A5A; line-height: 1.7; margin-bottom: 16px;">
        Just checking in. Your DecodeCoverage report is still available here:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${link}" style="display: inline-block; padding: 14px 32px; background: #1B6B4A; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
          View My Report
        </a>
      </div>
      <p style="font-size: 16px; color: #5A5A5A; line-height: 1.7; margin-bottom: 16px;">
        We've helped thousands of homeowners${stateText} identify gaps they didn't
        know they had. If you'd like a second opinion on yours, we're here.
      </p>
      <p style="font-size: 16px; color: #5A5A5A; line-height: 1.7;">
        If not, no worries at all — the report is yours to keep.
      </p>
      <p style="font-size: 15px; color: #5A5A5A; margin-top: 24px;">
        — DC Team
      </p>
    `, data.leadId, data.email),
  };
}

/**
 * Email 4 — sent 7 days after scan
 * Subject: Before your next premium payment...
 */
export function emailSequence4(data: EmailData): EmailTemplate {
  const link = resultsLink(data.leadId);
  return {
    subject: "Before your next premium payment...",
    html: wrapper(`
      <h1 style="font-size: 22px; color: #1A1A1A; margin-bottom: 16px;">
        ${data.firstName},
      </h1>
      <p style="font-size: 16px; color: #5A5A5A; line-height: 1.7; margin-bottom: 16px;">
        Your next insurance premium is probably coming up soon. Before you auto-pay,
        it might be worth 2 minutes to review what we found in your policy:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${link}" style="display: inline-block; padding: 14px 32px; background: #1B6B4A; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
          Review My Policy Report
        </a>
      </div>
      <p style="font-size: 16px; color: #5A5A5A; line-height: 1.7;">
        Paying the same amount (or more) for coverage with gaps doesn't have to be the default.
      </p>
      <p style="font-size: 15px; color: #5A5A5A; margin-top: 24px;">
        — DC Team
      </p>
    `, data.leadId, data.email),
  };
}

/** Get the right template for a given sequence stage */
export function getEmailTemplate(stage: number, data: EmailData): EmailTemplate | null {
  switch (stage) {
    case 1: return emailSequence1(data);
    case 2: return emailSequence2(data);
    case 3: return emailSequence3(data);
    case 4: return emailSequence4(data);
    default: return null;
  }
}

/** Time thresholds in ms for each email stage (since sequence started) */
export const EMAIL_TIMING: Record<number, number> = {
  1: 1 * 60 * 60 * 1000,         // 1 hour
  2: 24 * 60 * 60 * 1000,        // 24 hours
  3: 72 * 60 * 60 * 1000,        // 72 hours
  4: 7 * 24 * 60 * 60 * 1000,    // 7 days
};
