/**
 * AI Missing Item Detection Engine
 *
 * Compares the adjuster's estimate against roof measurements, damage type,
 * and the Xactimate codes database to identify missing/underpaid line items.
 * Returns structured supplement_items ready for DB insertion.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildCodeContextForPrompt,
  enrichIrcReference,
} from "@/data/building-codes";
import { withRetry } from "./retry";

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  // 3-minute timeout on API calls — leaves buffer within Vercel's 300s maxDuration
  return new Anthropic({ apiKey, timeout: 180_000 });
};

/* ─────── Types ─────── */

export interface PitchBreakdownInput {
  pitch: string;
  areaSqFt: number;
  percentOfRoof: number;
}

export interface AnalysisInput {
  supplementId: string;
  /** Base64-encoded PDF of the adjuster's estimate */
  estimatePdfBase64: string;
  claimDescription: string;
  adjusterScopeNotes: string;
  itemsBelievedMissing: string;
  damageTypes: string[];
  policyContext?: string | null; // From policy decoder
  propertyState?: string | null; // For jurisdiction-specific building codes (e.g., "MD", "PA")
  measurements: {
    measuredSquares: number | null;
    wastePercent: number | null;
    suggestedSquares: number | null;
    totalRoofArea: number | null;
    totalRoofAreaLessPenetrations: number | null;
    pitch: string | null;
    pitchBreakdown: PitchBreakdownInput[];
    structureComplexity: string | null;
    ftRidges: number | null;
    ftHips: number | null;
    ftValleys: number | null;
    ftRakes: number | null;
    ftEaves: number | null;
    ftDripEdge: number | null;
    ftParapet: number | null;
    ftFlashing: number | null;
    ftStepFlashing: number | null;
    numRidges: number | null;
    numHips: number | null;
    numValleys: number | null;
    numRakes: number | null;
    numEaves: number | null;
    totalPenetrationsArea: number | null;
    totalPenetrationsPerimeter: number | null;
    accessories: string | null;
  };
}

export interface DetectedItem {
  xactimate_code: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  justification: string;
  irc_reference: string;
  /** Whether the IRC reference was verified against our jurisdiction database */
  irc_verified?: boolean;
  /** Source document reference for the verified code (e.g., "COMAR 09.12.01; 2018 IRC R905.2.8.5") */
  irc_source_ref?: string | null;
  confidence: number;
  detection_source: string;
}

export interface AnalysisResult {
  items: DetectedItem[];
  adjuster_total: number | null;
  supplement_total: number;
  waste_adjuster: number | null;
  summary: string;
  /** Raw Claude response text (first 1000 chars) for debugging */
  debugRawResponse?: string;
}

/* ─────── Core Analysis ─────── */

export async function detectMissingItems(
  input: AnalysisInput
): Promise<AnalysisResult> {
  const supabase = createAdminClient();

  // Fetch commonly missed Xactimate codes only — keeps prompt under token limits
  // Claude uses its own knowledge for codes not in this list
  const { data: xactCodes } = await supabase
    .from("xactimate_codes")
    .select("code, category, description, unit, commonly_missed")
    .eq("commonly_missed", true)
    .order("category", { ascending: true });

  const codesContext = (xactCodes || [])
    .map((c) => `${c.code} | ${c.category} | ${c.description} | ${c.unit}`)
    .join("\n");

  const measurementsContext = buildMeasurementsContext(input.measurements);

  // Build jurisdiction-specific building code context — top 10 codes only to save tokens
  const buildingCodeContext = input.propertyState
    ? buildCodeContextForPrompt(input.propertyState)
    : "";

  const prompt = buildAnalysisPrompt({
    codesContext,
    measurementsContext,
    claimDescription: input.claimDescription,
    adjusterScopeNotes: input.adjusterScopeNotes,
    itemsBelievedMissing: input.itemsBelievedMissing,
    damageTypes: input.damageTypes,
    policyContext: input.policyContext || null,
    buildingCodeContext,
  });

  const client = getClient();

  const pdfSizeKB = Math.round(input.estimatePdfBase64.length / 1024);
  console.log(`[detectMissingItems] Sending estimate PDF (${pdfSizeKB}KB base64) to Claude`);
  const claudeStartMs = Date.now();

  const response = await withRetry(
    () =>
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: `You are an aggressive roofing supplement specialist with 20 years of experience. Your job is to find EVERY missing or underpaid item in an adjuster's estimate. Adjusters almost ALWAYS miss items — that is why contractors hire supplement companies. You must find at minimum 5-10 missing items on any roofing claim. Common items adjusters miss: starter strip, drip edge, ice & water shield in valleys, ridge cap, pipe boot flashing, step flashing, steep pitch charges, high roof charges, waste factor adjustments, permits, dumpster/haul-off, D&R of accessories (solar, HVAC, satellite dishes), and overhead & profit. If you genuinely cannot read the PDF or find any items, explain why in the summary field — but an empty missing_items array on a roofing claim means something went wrong.`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: input.estimatePdfBase64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    { maxRetries: 1, label: "detectMissingItems" }
  );

  const claudeElapsedSec = ((Date.now() - claudeStartMs) / 1000).toFixed(1);
  console.log(`[detectMissingItems] Claude responded in ${claudeElapsedSec}s: stop_reason=${response.stop_reason}, usage=${JSON.stringify(response.usage)}`);

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  console.log(`[detectMissingItems] Raw text (first 500 chars): ${textBlock.text.substring(0, 500)}`);

  // Strip markdown code fences if Claude wrapped the JSON
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // Parse Claude's JSON response — capture failures with context
  type ClaudeResult = {
    adjuster_total: number | null;
    waste_percent_adjuster: number | null;
    summary: string;
    missing_items: Array<{
      xactimate_code: string;
      description: string;
      category: string;
      quantity: number;
      unit: string;
      unit_price: number;
      justification: string;
      irc_reference: string;
      confidence: number;
    }>;
  };

  let result: ClaudeResult;

  try {
    result = JSON.parse(jsonText) as ClaudeResult;
  } catch {
    console.error(`[detectMissingItems] JSON parse failed. Raw text (first 500): ${textBlock.text.substring(0, 500)}`);
    throw new Error(
      `Claude returned invalid JSON. This usually means the PDF was too complex or Claude's response was cut off. ` +
      `Raw start: "${textBlock.text.substring(0, 200).replace(/\n/g, " ")}..."`
    );
  }

  console.log(`[detectMissingItems] Parsed: adjuster_total=${result.adjuster_total}, missing_items=${result.missing_items?.length ?? 0}, summary=${result.summary?.substring(0, 200)}`);

  if (!result.missing_items || result.missing_items.length === 0) {
    console.warn(`[detectMissingItems] WARNING: Claude returned 0 missing items. Summary: ${result.summary}`);
    // A supplement claim that returns 0 items is ALWAYS wrong — adjusters never
    // create perfect estimates, and the contractor is paying for this analysis.
    // Throw so the pipeline surfaces the error and the user can retry.
    const reason = input.itemsBelievedMissing?.trim()
      ? `Contractor flagged: "${input.itemsBelievedMissing.substring(0, 100)}"`
      : "No contractor notes — but a supplement claim should always have missing items";
    throw new Error(
      `AI returned 0 missing items. ${reason}. ` +
      `Claude summary: "${result.summary || "none"}". ` +
      `This usually means the PDF could not be read properly or the AI was too conservative. Please retry.`
    );
  }

  // Map to DetectedItem format + enrich IRC references with verified data
  const items: DetectedItem[] = (result.missing_items || []).map((item) => {
    // Enrich IRC reference with jurisdiction-verified data when state is available
    let ircReference = item.irc_reference || "";
    let ircVerified = false;
    let ircSourceRef: string | null = null;

    if (input.propertyState && ircReference) {
      const enriched = enrichIrcReference(ircReference, input.propertyState);
      ircReference = enriched.reference;
      ircVerified = enriched.verified;
      ircSourceRef = enriched.sourceRef;
    }

    return {
      xactimate_code: item.xactimate_code,
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total_price: Math.round(item.quantity * item.unit_price * 100) / 100,
      justification: item.justification,
      irc_reference: ircReference,
      irc_verified: ircVerified,
      irc_source_ref: ircSourceRef,
      confidence: item.confidence,
      detection_source: "ai_claude",
    };
  });

  const supplement_total = items.reduce((sum, i) => sum + i.total_price, 0);

  return {
    items,
    adjuster_total: result.adjuster_total,
    supplement_total: Math.round(supplement_total * 100) / 100,
    waste_adjuster: result.waste_percent_adjuster,
    summary: result.summary,
    debugRawResponse: textBlock.text.substring(0, 1000),
  };
}

/* ─────── Helpers ─────── */

function buildMeasurementsContext(m: AnalysisInput["measurements"]): string {
  const lines: string[] = [];

  // Area summary
  if (m.totalRoofArea) lines.push(`Total Roof Area (all pitches): ${m.totalRoofArea} sq ft`);
  if (m.totalRoofAreaLessPenetrations) lines.push(`Total Roof Area (less penetrations): ${m.totalRoofAreaLessPenetrations} sq ft`);
  if (m.measuredSquares) lines.push(`Measured Squares: ${m.measuredSquares}`);
  if (m.wastePercent) lines.push(`EagleView Suggested Waste %: ${m.wastePercent}%`);
  if (m.suggestedSquares) lines.push(`Suggested Squares (w/waste): ${m.suggestedSquares}`);
  if (m.structureComplexity) lines.push(`Structure Complexity: ${m.structureComplexity}`);

  // Pitch details
  if (m.pitch) lines.push(`Predominant Pitch: ${m.pitch}`);
  if (m.pitchBreakdown.length > 0) {
    lines.push(`\nPitch Breakdown:`);
    for (const pb of m.pitchBreakdown) {
      lines.push(`  ${pb.pitch}: ${pb.areaSqFt} sq ft (${pb.percentOfRoof}% of roof)`);
    }
    // Flag steep pitches for the AI
    const steepPitches = m.pitchBreakdown.filter((pb) => {
      const rise = parseInt(pb.pitch.split("/")[0]);
      return rise >= 7;
    });
    if (steepPitches.length > 0) {
      // NOTE: pitchBreakdown values may be strings from JSON storage — always coerce to Number
      const steepArea = steepPitches.reduce((sum, pb) => sum + Number(pb.areaSqFt), 0);
      const steepPct = steepPitches.reduce((sum, pb) => sum + Number(pb.percentOfRoof), 0);
      lines.push(`  ** STEEP PITCH AREA (7/12+): ${steepArea.toFixed(0)} sq ft (${steepPct.toFixed(1)}% of roof) — steep pitch labor charges likely apply **`);
    }
  }

  // Linear measurements with counts
  if (m.ftRidges) lines.push(`Ridges: ${m.ftRidges} LF${m.numRidges ? ` (${m.numRidges} segments)` : ""}`);
  if (m.ftHips) lines.push(`Hips: ${m.ftHips} LF${m.numHips ? ` (${m.numHips} segments)` : ""}`);
  if (m.ftValleys) lines.push(`Valleys: ${m.ftValleys} LF${m.numValleys ? ` (${m.numValleys} segments)` : ""}`);
  if (m.ftRakes) lines.push(`Rakes: ${m.ftRakes} LF${m.numRakes ? ` (${m.numRakes} segments)` : ""}`);
  if (m.ftEaves) lines.push(`Eaves: ${m.ftEaves} LF${m.numEaves ? ` (${m.numEaves} segments)` : ""}`);
  if (m.ftDripEdge) lines.push(`Drip Edge: ${m.ftDripEdge} LF`);
  if (m.ftParapet) lines.push(`Parapet: ${m.ftParapet} LF`);
  if (m.ftFlashing) lines.push(`Flashing: ${m.ftFlashing} LF`);
  if (m.ftStepFlashing) lines.push(`Step Flashing: ${m.ftStepFlashing} LF`);

  // Penetrations
  if (m.totalPenetrationsArea) lines.push(`Total Penetrations Area: ${m.totalPenetrationsArea} sq ft`);
  if (m.totalPenetrationsPerimeter) lines.push(`Total Penetrations Perimeter: ${m.totalPenetrationsPerimeter} LF`);

  if (m.accessories) lines.push(`Accessories: ${m.accessories}`);
  return lines.length > 0 ? lines.join("\n") : "No measurements provided";
}

function buildAnalysisPrompt(ctx: {
  codesContext: string;
  measurementsContext: string;
  claimDescription: string;
  adjusterScopeNotes: string;
  itemsBelievedMissing: string;
  damageTypes: string[];
  policyContext: string | null;
  buildingCodeContext: string;
}): string {
  // Build contractor notes section with emphasis if they exist
  const contractorSection = ctx.itemsBelievedMissing
    ? `\n## ⚠️ CONTRACTOR-FLAGGED MISSING ITEMS (MANDATORY)
The contractor has identified these specific items as MISSING from the adjuster's estimate. You MUST create a line item for EACH of these — do NOT skip any:
${ctx.itemsBelievedMissing}
`
    : "";

  return `You are a senior roofing supplement specialist. Review the adjuster's Xactimate estimate PDF and identify MISSING or UNDERPAID line items.

## CLAIM CONTEXT
- **Description:** ${ctx.claimDescription || "Not provided"}
- **Adjuster included:** ${ctx.adjusterScopeNotes || "Not provided"}
- **Damage types:** ${ctx.damageTypes.length > 0 ? ctx.damageTypes.join(", ") : "Not specified"}
${contractorSection}
## MEASUREMENTS
${ctx.measurementsContext}
${ctx.policyContext ? `\n## POLICY CONTEXT\n${ctx.policyContext}` : ""}
${ctx.buildingCodeContext ? `\n${ctx.buildingCodeContext}` : ""}
## COMMONLY MISSED XACTIMATE CODES
${ctx.codesContext}
Note: You may also use valid Xactimate codes from your training knowledge if applicable.

## WHAT TO DO
1. Read the PDF estimate — identify what IS already included
2. Extract the adjuster's total RCV and waste % if visible
3. Compare against measurements + industry standards to find MISSING items:
   - D&R for every accessory (solar panels, HVAC, satellite, skylights, pipe boots)
   - Starter strip, drip edge, ice & water shield, ridge/hip cap
   - Step flashing, underlayment, steep pitch charges, high roof charges
   - Waste % adjustment, permit fees, haul away
   - O&P (10%+10%) if 3+ trades involved
4. For solar panels: EACH panel = separate D&R line ($200-500+/panel, licensed electrician)

## CRITICAL RULES
- NEVER return an empty missing_items array. Every roofing estimate has missing items.
- If you cannot read the PDF clearly, state that in the summary AND still return common missing items based on measurements (starter strip, drip edge, ice & water, ridge cap, etc.)
- For each contractor-flagged item, create a line item even at lower confidence
- Use measurements for quantities (ridge LF for ridge cap, valley LF for ice & water, etc.)
- Cite IRC codes or manufacturer specs in justifications
- Minimum 5 items for any roofing claim — adjusters routinely miss common items

Return ONLY JSON — no markdown, no code fences:
{
  "adjuster_total": <number or null>,
  "waste_percent_adjuster": <number or null>,
  "summary": "<2-3 sentence summary of missing items and estimated recovery>",
  "missing_items": [
    {
      "xactimate_code": "<code>",
      "description": "<item description>",
      "category": "<Roofing|Gutters|Interior|Solar|HVAC|etc>",
      "quantity": <number>,
      "unit": "<SQ|LF|EA|etc>",
      "unit_price": <dollar amount>,
      "justification": "<why this should be included>",
      "irc_reference": "<IRC code ref or N/A>",
      "confidence": <0.0 to 1.0>
    }
  ]
}`;
}
