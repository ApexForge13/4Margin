/**
 * PDF parsers that call the server-side Claude API routes.
 *
 * These run client-side in the wizard and send the PDF to our API
 * routes which handle Claude API calls (keeping the API key server-side).
 */

import type { ClaimDetails, MeasurementData } from "@/types/wizard";

/**
 * Parse an adjuster's Xactimate estimate PDF.
 * Sends to /api/parse/estimate → Claude extracts structured claim data.
 */
export async function parseEstimatePdf(
  file: File
): Promise<Partial<ClaimDetails>> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/parse/estimate", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Parse failed (${res.status})`);
  }

  const data = await res.json();

  // Strip out the error field if present, return only ClaimDetails fields
  const { error: _error, ...parsed } = data;
  return parsed as Partial<ClaimDetails>;
}

/**
 * Parse an EagleView, HOVER, or other measurement report PDF.
 * Sends to /api/parse/measurement → Claude extracts roof measurement data.
 */
export async function parseMeasurementPdf(
  file: File
): Promise<Partial<MeasurementData>> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/parse/measurement", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Parse failed (${res.status})`);
  }

  const data = await res.json();

  const { error: _error, ...parsed } = data;
  return parsed as Partial<MeasurementData>;
}
