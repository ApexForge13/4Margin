/**
 * Stub parsers for PDF document extraction.
 *
 * These will be replaced with real parsers (Claude API / pdf-parse)
 * that extract structured data from Xactimate estimates and
 * EagleView/HOVER measurement reports.
 *
 * The UI is built to handle the parse-then-confirm flow:
 * 1. User uploads PDF
 * 2. System shows "Analyzing..." spinner
 * 3. Parser returns extracted data (or empty for stub)
 * 4. Editable form fields populate with results
 * 5. User reviews, corrects, clicks Next
 */

import type { ClaimDetails, MeasurementData } from "@/types/wizard";

/**
 * Parse an adjuster's Xactimate estimate PDF.
 * Extracts claim number, carrier, property address, adjuster info, etc.
 */
export async function parseEstimatePdf(
  _file: File
): Promise<Partial<ClaimDetails>> {
  // Simulate a brief processing delay so the UI shows the analyzing state
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Stub: return empty — user fills in manually
  // Real implementation will use Claude API to extract structured data
  return {};
}

/**
 * Parse an EagleView, HOVER, or other measurement report PDF.
 * Extracts roof squares, pitch, valleys, hips, ridges, waste %, etc.
 */
export async function parseMeasurementPdf(
  _file: File
): Promise<Partial<MeasurementData>> {
  // Simulate a brief processing delay
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Stub: return empty — user fills in manually
  // Real implementation will use Claude API to extract structured data
  return {};
}
