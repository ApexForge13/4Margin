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
  return new Anthropic({ apiKey });
};

/* ─────── Types ─────── */

export interface PitchBreakdownInput {
  pitch: string;
  areaSqFt: number;
  percentOfRoof: number;
}

export interface AnalysisInput {
  supplementId: string;
  estimatePdfUrl: string;
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
}

/* ─────── Core Analysis ─────── */

export async function detectMissingItems(
  input: AnalysisInput
): Promise<AnalysisResult> {
  const supabase = createAdminClient();

  // Fetch all Xactimate codes from DB (prioritize commonly missed)
  const { data: xactCodes } = await supabase
    .from("xactimate_codes")
    .select("code, category, description, unit, default_justification, irc_reference, commonly_missed")
    .order("commonly_missed", { ascending: false });

  const codesContext = (xactCodes || [])
    .map(
      (c) =>
        `${c.code} | ${c.category} | ${c.description} | ${c.unit}${c.commonly_missed ? " | COMMONLY MISSED" : ""}`
    )
    .join("\n");

  const measurementsContext = buildMeasurementsContext(input.measurements);

  // Build jurisdiction-specific building code context if we have the state
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

  console.log(`[detectMissingItems] Sending estimate URL to Claude: ${input.estimatePdfUrl.substring(0, 80)}...`);

  const response = await withRetry(
    () =>
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "url",
                  url: input.estimatePdfUrl,
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
    { maxRetries: 3, label: "detectMissingItems" }
  );

  console.log(`[detectMissingItems] Claude response: stop_reason=${response.stop_reason}, usage=${JSON.stringify(response.usage)}`);

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  console.log(`[detectMissingItems] Raw text (first 500 chars): ${textBlock.text.substring(0, 500)}`);

  // Parse Claude's JSON response
  const result = JSON.parse(textBlock.text) as {
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

  // Map to DetectedItem format + enrich IRC references with verified data
  const items: DetectedItem[] = result.missing_items.map((item) => {
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
  return `You are a senior roofing insurance supplement specialist with 20+ years of experience. Your job is to review the adjuster's Xactimate estimate (the PDF above) and identify MISSING or UNDERPAID line items that should be included in a supplement.

## CONTEXT

**Claim Description:** ${ctx.claimDescription || "Not provided"}

**Adjuster's Scope Notes:** ${ctx.adjusterScopeNotes || "Not provided"}

**Contractor's Notes (items believed missing):** ${ctx.itemsBelievedMissing || "Not provided"}

**Damage Types:** ${ctx.damageTypes.length > 0 ? ctx.damageTypes.join(", ") : "Not specified"}

**Roof Measurements:**
${ctx.measurementsContext}
${ctx.policyContext ? `\n## POLICY ANALYSIS\nThe homeowner's policy has been analyzed. Use this information to strengthen justifications and be aware of potential issues:\n${ctx.policyContext}` : ""}
${ctx.buildingCodeContext ? `\n${ctx.buildingCodeContext}` : ""}

## XACTIMATE CODES DATABASE
These are valid Xactimate codes you can reference. Use these codes when possible:
${ctx.codesContext}

## INSTRUCTIONS

1. Carefully read the adjuster's estimate PDF to understand what line items are ALREADY included
2. Extract the adjuster's total RCV amount from the estimate
3. Note the waste percentage the adjuster used (if visible)
4. Compare what's included against what SHOULD be there based on:
   - The roof measurements (every linear foot of ridge needs ridge cap, every valley needs ice & water, etc.)
   - The damage type (hail damage requires different items than wind)
   - Industry standard practices for a complete roofing scope
   - The contractor's notes about what they believe is missing
5. For each missing item, provide:
   - The Xactimate code (from the database above, or your knowledge)
   - Quantity based on actual measurements
   - Realistic unit price (current market rates)
   - A professional justification that cites building codes or manufacturer specs
   - The specific IRC reference (use VERIFIED codes from the JURISDICTION-VERIFIED BUILDING CODES section when available — these are confirmed applicable in this jurisdiction)
   - Your confidence level (0.0 to 1.0)

## COMMON MISSING ITEMS TO CHECK FOR
- Starter strip (along eaves and rakes)
- Drip edge (eaves and rakes)
- Ice & water shield (valleys, eaves in cold climates)
- Ridge cap (along all ridges)
- Hip cap (along all hips)
- Step flashing (at walls/chimneys)
- Pipe boot/jack flashing — check quantity against accessories list
- Underlayment (synthetic vs felt)
- Steep pitch charges (7/12 and above)
- High roof charges (2+ stories)
- Permit and code upgrade
- Haul away / dump fees
- Ridge vent
- Satellite dish detach & reset (D&R) — if listed in accessories
- Solar panel detach & reset (D&R) — often $200-500+ per panel, requires licensed electrician
- HVAC unit protection / detach & reset — if listed in accessories
- Skylight detach & reset or re-flash — if listed in accessories
- Overhead & Profit (O&P) — typically 10% overhead + 10% profit on complex multi-trade jobs involving 3+ trades

## ACCESSORIES CHECK — CRITICAL
The roof accessories are listed in the measurements. For EVERY accessory listed (skylights, pipe jacks/boots, HVAC units, satellite dishes, solar panels, etc.), you MUST check:
1. Does the adjuster's estimate include a Detach & Reset (D&R) line item for it?
2. If not, it is MISSING and should be added as a supplement item.
3. Use the correct Xactimate code for each D&R type.
4. For solar panels — each panel requires individual D&R. 15 panels = 15x D&R charges.
5. For satellite dishes — include removal, re-mounting, and cable re-routing.

## OVERHEAD & PROFIT (O&P)
If the job involves 3 or more trades (roofing, gutters, siding, electrical for solar, etc.), O&P should be included. O&P is typically calculated as:
- 10% Overhead on total job cost
- 10% Profit on total job cost
This is industry standard and supported by Xactimate pricing methodology. Check if the adjuster included O&P. If not, add it as a missing item.

## IMPORTANT RULES
- ALWAYS find at least the items the contractor flagged as missing in "Contractor's Notes"
- Even if the adjuster's estimate looks comprehensive, the contractor's notes indicate specific omissions — trust their field expertise
- For each item flagged by the contractor, create a line item even if you're not 100% sure it's missing — set confidence accordingly
- Do NOT return an empty missing_items array if the contractor has flagged items as missing

Return ONLY a JSON object — no markdown, no code fences:

{
  "adjuster_total": <number or null if not found>,
  "waste_percent_adjuster": <number or null if not found>,
  "summary": "<2-3 sentence summary of what's missing and estimated recovery>",
  "missing_items": [
    {
      "xactimate_code": "<code>",
      "description": "<what this item is>",
      "category": "<trade category e.g. Roofing, Gutters, Interior>",
      "quantity": <number>,
      "unit": "<SQ, LF, EA, etc.>",
      "unit_price": <dollar amount per unit>,
      "justification": "<why this should be included — cite IRC codes, manufacturer specs, or industry standard>",
      "irc_reference": "<specific code reference e.g. IRC R905.2.8.2>",
      "confidence": <0.0 to 1.0>
    }
  ]
}`;
}
