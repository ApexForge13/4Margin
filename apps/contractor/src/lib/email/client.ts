/**
 * Resend Email Client
 *
 * Singleton Resend client for sending transactional emails.
 * All emails sent from noreply@4margin.com (configure in Resend dashboard).
 */

import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export const FROM_EMAIL = "4Margin <noreply@4margin.com>";
