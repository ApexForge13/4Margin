/**
 * Claude API-powered PDF parsers for Xactimate estimates and measurement reports.
 *
 * Uses Anthropic's document understanding to extract structured data from
 * insurance adjuster PDFs and EagleView/HOVER measurement reports.
 *
 * PDFs are passed via signed URL (Supabase storage) so Claude fetches them
 * directly — avoids sending large base64 payloads through Vercel functions.
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
  pdfUrl: string
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
                type: "url",
                url: pdfUrl,
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

    console.log("[parseEstimate] stop_reason:", response.stop_reason, "usage:", JSON.stringify(response.usage));

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    console.log("[parseEstimate] raw text:", textBlock.text);

    return JSON.parse(textBlock.text);
  }, { label: "parseEstimate" });
}

/* ─────── Measurement PDF Parsing ─────── */

const MEASUREMENT_EXTRACTION_PROMPT = `You are a roofing measurement expert. Extract structured roof measurement data from this PDF report (typically from EagleView, HOVER, GAF QuickMeasure, Roofr, or similar).

Return ONLY a JSON object with these fields (use empty string "" for anything you cannot find, use [] for empty arrays):

{
  "measuredSquares": "the BASE measured squares WITHOUT waste — from 'Total Roof Area' or 'Total Squares' (NOT the suggested/with-waste number)",
  "wastePercent": "the waste percentage as a number string (e.g. '15' for 15%) — from the Waste Calculation table",
  "suggestedSquares": "the suggested squares WITH waste included — labeled 'Suggested Squares w/ Waste' or similar",
  "steepSquares": "squares at pitch 7/12 or steeper — sum of squares from pitches >= 7/12 in the pitch breakdown",
  "highStorySquares": "squares on 2nd story or higher — from 'High' or '2nd Story' area if listed",
  "totalRoofArea": "total roof area in sq ft (all pitches combined)",
  "totalRoofAreaLessPenetrations": "total roof area minus penetrations in sq ft — labeled 'Total Area Less Penetrations' or 'Less Penetrations'",
  "ftRidges": "total linear feet of ridges — from the Lengths table",
  "ftHips": "total linear feet of hips",
  "ftValleys": "total linear feet of valleys",
  "ftRakes": "total linear feet of rakes",
  "ftEaves": "total linear feet of eaves — may be labeled 'Eaves' or 'Starter'",
  "ftDripEdge": "total linear feet of drip edge (often eaves + rakes combined)",
  "ftParapet": "total linear feet of parapet walls",
  "ftFlashing": "total linear feet of flashing",
  "ftStepFlashing": "total linear feet of step flashing",
  "numRidges": "count of ridge segments — the number in parentheses like '(7 Ridges)'",
  "numHips": "count of hip segments",
  "numValleys": "count of valley segments",
  "numRakes": "count of rake segments",
  "numEaves": "count of eave segments",
  "numFlashingLengths": "count of flashing segments",
  "numStepFlashingLengths": "count of step flashing segments",
  "totalPenetrationsArea": "total penetrations area in sq ft",
  "totalPenetrationsPerimeter": "total penetrations perimeter in linear feet",
  "predominantPitch": "the predominant/primary roof pitch (e.g. '7/12') — the pitch with the largest area",
  "pitchBreakdown": [
    { "pitch": "e.g. 7/12", "areaSqFt": "area at that pitch in sq ft", "percentOfRoof": "percent of total roof" }
  ],
  "structureComplexity": "the structure complexity rating: 'Simple', 'Normal', or 'Complex'",
  "accessories": "list of roof accessories/penetrations (e.g. 'Skylights (2), Pipe boots (4), Chimney')"
}

CRITICAL — How to find each value in an EagleView report:
1. MEASURED SQUARES vs SUGGESTED SQUARES: These are TWO DIFFERENT values.
   - "measuredSquares" = the BASE measurement WITHOUT waste. Look for "Total Squares", "Total Area" divided by 100, or the squares value BEFORE waste is applied. On EagleView page 11/12 this is often in the "Roof Summary" as the total area converted to squares.
   - "suggestedSquares" = the LARGER number that INCLUDES waste. Labeled "Suggested Squares w/ Waste" or "Total w/ Waste". This is always larger than measuredSquares.
   - If you see only ONE squares number, check if there's a waste table — if so, the single number is likely the suggested (with waste) value, and you should calculate measuredSquares by dividing by (1 + waste%/100).
2. WASTE %: Found in the "Waste Calculation" table. Look for the highlighted or recommended row. Common values: 10%, 12%, 15%.
3. STEEP SQUARES: Sum the areas (converted to squares) for all pitches >= 7/12 from the pitch breakdown table. If pitch breakdown shows 7/12 = 1953 sq ft and 9/12 = 500 sq ft, steep squares = (1953+500)/100 = 24.53.
4. LINEAR MEASUREMENTS: Found in the "Lengths, Areas and Pitches" section. Format is typically "109 ft (7 Ridges)" — extract "109" as ftRidges and "7" as numRidges. Do this for ALL line items: Ridges, Hips, Valleys, Rakes, Eaves, Flashing, Step Flashing.
5. PREDOMINANT PITCH: The pitch with the highest percentage or largest area in the pitch breakdown.
6. DRIP EDGE: May be listed separately, or calculate as ftEaves + ftRakes.
7. STRUCTURE COMPLEXITY: Near the waste calculation — labeled "Simple", "Normal", or "Complex".
8. LESS PENETRATIONS: Look for "Total Area Less Penetrations" or "Roof Area Less Penetrations".

All numeric values MUST be strings (e.g. "28.50" not 28.50).
Extract ONLY what's explicitly in the document — do not guess or fabricate values.
Return valid JSON only, no markdown, no code fences.`;

export async function parseMeasurementWithClaude(
  pdfUrl: string
): Promise<Record<string, unknown>> {
  return withRetry(async () => {
    const client = getClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "url",
                url: pdfUrl,
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

    console.log("[parseMeasurement] stop_reason:", response.stop_reason, "usage:", JSON.stringify(response.usage));

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    console.log("[parseMeasurement] raw text:", textBlock.text);

    return JSON.parse(textBlock.text);
  }, { label: "parseMeasurement" });
}
