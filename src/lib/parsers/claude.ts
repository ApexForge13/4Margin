/**
 * Claude API-powered PDF parsers for Xactimate estimates and measurement reports.
 *
 * Uses Anthropic's document understanding to extract structured data from
 * insurance adjuster PDFs and EagleView/HOVER measurement reports.
 */

import Anthropic from "@anthropic-ai/sdk";
import { withRetry } from "@/lib/ai/retry";

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey });
};

/* ─────── Estimate PDF Parsing ─────── */

const ESTIMATE_EXTRACTION_PROMPT = `You are a roofing insurance claims expert. Extract structured claim data from this Xactimate adjuster's estimate PDF.

Return ONLY a JSON object with these fields (use empty string "" for anything you cannot find):

{
  "claimNumber": "the claim/file number",
  "policyNumber": "the insurance policy number",
  "carrierName": "the insurance carrier/company name",
  "propertyAddress": "the street address of the property",
  "propertyCity": "city",
  "propertyState": "2-letter state abbreviation",
  "propertyZip": "ZIP code",
  "dateOfLoss": "date of loss in YYYY-MM-DD format",
  "adjusterName": "the adjuster's full name",
  "adjusterEmail": "the adjuster's email",
  "adjusterPhone": "the adjuster's phone number",
  "adjusterScopeNotes": "brief summary of what the adjuster's scope covers — what line items and trades are included"
}

Important:
- This is an insurance estimate, typically from Xactimate software
- The claim number may be labeled as "Claim #", "File #", "Loss #", or similar
- The carrier name is the insurance company (State Farm, Allstate, USAA, etc.)
- Date of loss may be labeled "DOL", "Date of Loss", "Loss Date"
- Extract ONLY what's explicitly in the document — do not guess or fabricate
- For adjusterScopeNotes, briefly list the main trades/categories and key items the adjuster included
- Return valid JSON only, no markdown, no code fences`;

export async function parseEstimateWithClaude(
  pdfBase64: string
): Promise<Record<string, string>> {
  return withRetry(async () => {
    const client = getClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf" as const,
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: ESTIMATE_EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    return JSON.parse(textBlock.text);
  }, { label: "parseEstimate" });
}

/* ─────── Measurement PDF Parsing ─────── */

const MEASUREMENT_EXTRACTION_PROMPT = `You are a roofing measurement expert. Extract structured roof measurement data from this PDF report (typically from EagleView, HOVER, GAF QuickMeasure, Roofr, or similar).

Return ONLY a JSON object with these fields (use empty string "" for anything you cannot find):

{
  "measuredSquares": "total roof area in squares (1 square = 100 sq ft), as a number string",
  "wastePercent": "suggested waste percentage as a number string (e.g. '15' for 15%)",
  "suggestedSquares": "total squares including waste, as a number string",
  "ftRidges": "total linear feet of ridges",
  "ftHips": "total linear feet of hips",
  "ftValleys": "total linear feet of valleys",
  "ftRakes": "total linear feet of rakes",
  "ftEaves": "total linear feet of eaves/starter",
  "ftDripEdge": "total linear feet of drip edge (often eaves + rakes)",
  "ftParapet": "total linear feet of parapet walls",
  "ftFlashing": "total linear feet of flashing",
  "ftStepFlashing": "total linear feet of step flashing",
  "predominantPitch": "the predominant roof pitch (e.g. '6/12')",
  "accessories": "list of roof accessories/penetrations (e.g. 'Skylights (2), Pipe boots (4), Chimney')"
}

Important:
- All numeric values should be strings (e.g. "28.50" not 28.50)
- Squares are typically shown as total roof area divided by 100
- Waste % is often a suggested value based on roof complexity
- Linear measurements should be in feet
- Pitch is typically shown as rise/run (e.g. 6/12, 8/12)
- Extract ONLY what's explicitly in the document — do not calculate or fabricate values
- Return valid JSON only, no markdown, no code fences`;

export async function parseMeasurementWithClaude(
  pdfBase64: string
): Promise<Record<string, string>> {
  return withRetry(async () => {
    const client = getClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf" as const,
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: MEASUREMENT_EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    return JSON.parse(textBlock.text);
  }, { label: "parseMeasurement" });
}
