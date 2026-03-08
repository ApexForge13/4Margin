/**
 * Meta Conversions API (CAPI) — server-side event tracking
 *
 * Sends conversion events to Meta for ad attribution + optimization.
 * Works alongside the client-side pixel for deduplication.
 *
 * Required env vars:
 * - META_CAPI_ACCESS_TOKEN (system user token from Business Manager)
 * - NEXT_PUBLIC_META_PIXEL_ID (same pixel ID as client-side)
 */

import { createHash } from "crypto";

const META_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

interface CAPIUserData {
  em?: string; // SHA256 hashed email
  ph?: string; // SHA256 hashed phone
  fn?: string; // SHA256 hashed first name
  ln?: string; // SHA256 hashed last name
  client_ip_address?: string;
  client_user_agent?: string;
}

interface CAPIEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  user_data: CAPIUserData;
  custom_data?: Record<string, string | number | boolean | null>;
  opt_out?: boolean;
}

/**
 * Hash and normalize a value for Meta CAPI (SHA256, lowercase, trimmed)
 */
export function hashForMeta(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Hash phone number — digits only
 */
export function hashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  return createHash("sha256").update(digits).digest("hex");
}

/**
 * Build user_data object from lead info
 */
export function buildUserData(opts: {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): CAPIUserData {
  return {
    em: hashForMeta(opts.email),
    ph: hashPhone(opts.phone),
    fn: hashForMeta(opts.firstName),
    ln: hashForMeta(opts.lastName),
    client_ip_address: opts.ip || undefined,
    client_user_agent: opts.userAgent || undefined,
  };
}

/**
 * Send a single event to Meta Conversions API
 * Fire-and-forget — never blocks the request pipeline
 */
export async function sendCAPIEvent(event: CAPIEvent): Promise<boolean> {
  if (!META_ACCESS_TOKEN || !META_PIXEL_ID) {
    return false;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event] }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[CAPI] Error sending ${event.event_name}:`, error);
      return false;
    }

    console.log(`[CAPI] Sent: ${event.event_name} (${event.event_id})`);
    return true;
  } catch (err) {
    console.error(`[CAPI] Network error for ${event.event_name}:`, err);
    return false;
  }
}

/**
 * Convenience: send a Lead event (form submission / email captured)
 */
export function sendLeadEvent(opts: {
  leadId: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  carrier?: string | null;
  utmSource?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  sourceUrl?: string;
}) {
  return sendCAPIEvent({
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: `${opts.leadId}-lead`,
    event_source_url: opts.sourceUrl || "https://decodecoverage.com",
    user_data: buildUserData(opts),
    custom_data: {
      carrier: opts.carrier || null,
      utm_source: opts.utmSource || null,
    },
  });
}

/**
 * Convenience: send CompleteRegistration event (analysis finished)
 */
export function sendCompleteRegistrationEvent(opts: {
  leadId: string;
  email?: string | null;
  policyScore?: number | null;
  policyGrade?: string | null;
}) {
  return sendCAPIEvent({
    event_name: "CompleteRegistration",
    event_time: Math.floor(Date.now() / 1000),
    event_id: `${opts.leadId}-complete`,
    event_source_url: `https://decodecoverage.com/results/${opts.leadId}`,
    user_data: buildUserData({ email: opts.email }),
    custom_data: {
      content_name: "Policy Analysis",
      policy_score: opts.policyScore || null,
      policy_grade: opts.policyGrade || null,
    },
  });
}

/**
 * Convenience: send custom download/email events
 */
export function sendReportEvent(
  eventName: "PolicyDownloaded" | "ReportEmailed",
  opts: {
    leadId: string;
    email?: string | null;
    policyScore?: number | null;
  }
) {
  return sendCAPIEvent({
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: `${opts.leadId}-${eventName.toLowerCase()}`,
    event_source_url: `https://decodecoverage.com/results/${opts.leadId}`,
    user_data: buildUserData({ email: opts.email }),
    custom_data: {
      policy_score: opts.policyScore || null,
    },
  });
}
