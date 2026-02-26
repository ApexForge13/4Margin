/**
 * Email HTML Templates
 *
 * Inline-styled HTML emails for maximum client compatibility.
 * Each function returns { subject, html } for use with Resend.
 */

const BRAND_CYAN = "#00BFFF";
const BRAND_GREEN = "#39FF9E";

function layout(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:24px 32px;">
            <span style="font-size:20px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
              <span style="color:${BRAND_CYAN};">4</span><span style="color:#ffffff;">M</span><span style="color:${BRAND_GREEN};">A</span><span style="color:#ffffff;">RG</span><span style="color:${BRAND_GREEN};">I</span><span style="color:#ffffff;">N</span>
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px;">
            &copy; ${new Date().getFullYear()} 4Margin. All rights reserved.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Supplement Ready ───────────────────────────────────────

export function supplementReadyEmail(data: {
  userName: string;
  claimNumber: string;
  propertyAddress: string;
  itemCount: number;
  supplementTotal: number;
  supplementUrl: string;
  isFree: boolean;
}) {
  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(data.supplementTotal);

  const ctaLabel = data.isFree
    ? "View Your Free Supplement"
    : "View & Unlock Supplement";

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Your supplement is ready</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;">Hi ${data.userName},</p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      We've finished analyzing your estimate and identified <strong>${data.itemCount} missing line item${data.itemCount !== 1 ? "s" : ""}</strong>
      worth <strong style="color:${BRAND_GREEN};">${formattedTotal}</strong> in additional recovery.
    </p>
    <table style="width:100%;margin:0 0 24px;border:1px solid #e4e4e7;border-radius:6px;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#71717a;border-bottom:1px solid #e4e4e7;">Claim #</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e4e4e7;">${data.claimNumber || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#71717a;border-bottom:1px solid #e4e4e7;">Property</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e4e4e7;">${data.propertyAddress || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#71717a;">Supplement Total</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#16a34a;">${formattedTotal}</td>
      </tr>
    </table>
    <a href="${data.supplementUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
      ${ctaLabel}
    </a>
    ${data.isFree ? '<p style="margin:16px 0 0;font-size:12px;color:#71717a;">Your first supplement is on us!</p>' : ""}
  `;

  return {
    subject: `Supplement Ready — ${data.claimNumber || "New Claim"} (${formattedTotal})`,
    html: layout(body),
  };
}

// ─── Payment Confirmation ───────────────────────────────────

export function paymentConfirmationEmail(data: {
  userName: string;
  claimNumber: string;
  propertyAddress: string;
  amount: number;
  supplementUrl: string;
}) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(data.amount);

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Payment confirmed</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;">Hi ${data.userName},</p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Your payment of <strong>${formattedAmount}</strong> has been received.
      Your full supplement report is now unlocked and ready to download.
    </p>
    <table style="width:100%;margin:0 0 24px;border:1px solid #e4e4e7;border-radius:6px;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#71717a;border-bottom:1px solid #e4e4e7;">Claim #</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e4e4e7;">${data.claimNumber || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#71717a;border-bottom:1px solid #e4e4e7;">Property</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e4e4e7;">${data.propertyAddress || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#71717a;">Amount Paid</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#0f172a;">${formattedAmount}</td>
      </tr>
    </table>
    <a href="${data.supplementUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
      Download Supplement
    </a>
  `;

  return {
    subject: `Payment Confirmed — ${data.claimNumber || "Supplement"} (${formattedAmount})`,
    html: layout(body),
  };
}

// ─── Welcome / First Supplement Free ────────────────────────

export function welcomeEmail(data: {
  userName: string;
  companyName: string;
}) {
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Welcome to 4Margin</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;">Hi ${data.userName},</p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Your account for <strong>${data.companyName}</strong> is all set.
      Upload your first adjuster's estimate and we'll identify every missing line item in minutes.
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;">
      <strong>Your first supplement is free</strong> — no credit card required.
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.4margin.com"}/dashboard/upload" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
      Create Your First Supplement
    </a>
  `;

  return {
    subject: "Welcome to 4Margin — Your first supplement is free",
    html: layout(body),
  };
}

// ─── Team Invite ────────────────────────────────────────────

export function teamInviteEmail(data: {
  inviterName: string;
  companyName: string;
  role: string;
  inviteUrl: string;
}) {
  const roleLabel = data.role === "admin" ? "Admin" : "Team Member";

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">You&rsquo;re invited to join ${data.companyName}</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;">
      <strong>${data.inviterName}</strong> has invited you to join their team on 4Margin as a <strong>${roleLabel}</strong>.
    </p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      4Margin helps roofing contractors identify missing line items and recover additional insurance funds.
      Accept the invite below to get started.
    </p>
    <a href="${data.inviteUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
      Accept Invite
    </a>
    <p style="margin:16px 0 0;font-size:12px;color:#71717a;">
      This invite expires in 7 days. If you didn&rsquo;t expect this, you can safely ignore it.
    </p>
  `;

  return {
    subject: `Join ${data.companyName} on 4Margin`,
    html: layout(body),
  };
}

// ─── Pipeline Error ─────────────────────────────────────────

export function pipelineErrorEmail(data: {
  userName: string;
  claimNumber: string;
  supplementUrl: string;
}) {
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Supplement generation issue</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;">Hi ${data.userName},</p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
      We ran into an issue while generating the supplement for <strong>Claim #${data.claimNumber || "N/A"}</strong>.
      This usually means the estimate PDF couldn't be read clearly.
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;">
      Try re-uploading a clearer PDF, or contact support if the issue persists.
    </p>
    <a href="${data.supplementUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
      View Supplement
    </a>
  `;

  return {
    subject: `Action Needed — Supplement for Claim #${data.claimNumber || "N/A"}`,
    html: layout(body),
  };
}
