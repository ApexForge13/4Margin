/**
 * PDF parsers that call the server-side Claude API routes.
 *
 * Uploads PDFs to Supabase temp-parsing bucket first (avoids Vercel
 * 4.5 MB body limit), then sends the storage path to our API routes
 * which generate a signed URL and pass it to Claude for extraction.
 */

import { createClient } from "@/lib/supabase/client";
import type { ClaimDetails, MeasurementData } from "@/types/wizard";

/**
 * Upload a PDF to the temp-parsing bucket and return the storage path.
 */
async function uploadToTempBucket(file: File): Promise<string> {
  const supabase = createClient();
  const path = `${crypto.randomUUID()}.pdf`;

  const { error } = await supabase.storage
    .from("temp-parsing")
    .upload(path, file, { cacheControl: "60", upsert: false });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return path;
}

/**
 * Delete a temp file after processing (fire-and-forget).
 */
function cleanupTempFile(path: string) {
  const supabase = createClient();
  supabase.storage.from("temp-parsing").remove([path]).catch(() => {});
}

/**
 * Parse an adjuster's Xactimate estimate PDF.
 * Uploads to temp storage → /api/parse/estimate → Claude extracts structured claim data.
 */
export async function parseEstimatePdf(
  file: File
): Promise<Partial<ClaimDetails>> {
  // Upload PDF to Supabase storage (bypasses Vercel body limit)
  const storagePath = await uploadToTempBucket(file);

  try {
    const res = await fetch("/api/parse/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Parse failed (${res.status})`);
    }

    const data = await res.json();
    console.log("[parseEstimatePdf] API response:", data);

    // Strip out the error field if present, return only ClaimDetails fields
    const { error: _error, ...parsed } = data;
    return parsed as Partial<ClaimDetails>;
  } finally {
    cleanupTempFile(storagePath);
  }
}

/**
 * Parse an EagleView, HOVER, or other measurement report PDF.
 * Uploads to temp storage → /api/parse/measurement → Claude extracts roof measurement data.
 */
export async function parseMeasurementPdf(
  file: File
): Promise<Partial<MeasurementData>> {
  // Upload PDF to Supabase storage (bypasses Vercel body limit)
  const storagePath = await uploadToTempBucket(file);

  try {
    const res = await fetch("/api/parse/measurement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Parse failed (${res.status})`);
    }

    const data = await res.json();
    console.log("[parseMeasurementPdf] API response:", data);

    const { error: _error, ...parsed } = data;
    return parsed as Partial<MeasurementData>;
  } finally {
    cleanupTempFile(storagePath);
  }
}
