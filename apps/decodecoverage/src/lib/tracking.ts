/**
 * Unified event tracking for GA4 + Meta Pixel.
 *
 * Usage:
 *   import { trackEvent } from "@/lib/tracking";
 *   trackEvent("email_captured", { method: "hero_form" });
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

type TrackingParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(eventName: string, params?: TrackingParams) {
  // GA4
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }

  // Meta Pixel — map our events to Meta standard/custom events
  if (typeof window !== "undefined" && window.fbq) {
    const metaMapping: Record<string, { event: string; standard: boolean }> = {
      email_captured: { event: "Lead", standard: true },
      upload_started: { event: "InitiateCheckout", standard: true },
      upload_complete: { event: "CompleteRegistration", standard: true },
      results_viewed: { event: "ViewContent", standard: true },
      gate_unlocked: { event: "SubmitApplication", standard: true },
      report_downloaded: { event: "Purchase", standard: true },
      report_emailed: { event: "Subscribe", standard: true },
      conversion_form_submitted: { event: "Contact", standard: true },
      exit_intent_email: { event: "Lead", standard: true },
    };

    const mapped = metaMapping[eventName];
    if (mapped) {
      if (mapped.standard) {
        window.fbq("track", mapped.event, params);
      } else {
        window.fbq("trackCustom", mapped.event, params);
      }
    } else {
      // Send as custom event
      window.fbq("trackCustom", eventName, params);
    }
  }
}
