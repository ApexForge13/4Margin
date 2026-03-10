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
import { buildManufacturerContextForPrompt } from "@/data/manufacturers";
import { buildCarrierContextForPrompt } from "@/data/policy-knowledge";
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
  propertyZip?: string | null;   // For county-level code lookups
  manufacturerName?: string | null; // Shingle manufacturer (if known) — narrows manufacturer context
  carrierName?: string | null; // Insurance carrier name (for carrier-specific intelligence)
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

/** Claim & contractor metadata extracted from the estimate PDF */
export interface ExtractedClaimData {
  claim_number?: string;
  policy_number?: string;
  carrier_name?: string;
  property_address?: string;
  property_city?: string;
  property_state?: string;
  property_zip?: string;
  date_of_loss?: string;
  adjuster_name?: string;
  adjuster_email?: string;
  adjuster_phone?: string;
  adjuster_estimate_total?: number | null;
}

export interface AdjusterItem {
  xactimate_code: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price?: number;
}

export interface AnalysisResult {
  items: DetectedItem[];
  adjuster_total: number | null;
  supplement_total: number;
  waste_adjuster: number | null;
  summary: string;
  /** Claim/contractor metadata extracted from the estimate PDF */
  extractedClaimData?: ExtractedClaimData;
  /** Raw Claude response text (first 1000 chars) for debugging */
  debugRawResponse?: string;
  /** Line items already present in the adjuster's estimate — used for delta math */
  adjusterItems?: AdjusterItem[];
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

  // Build manufacturer installation requirements context
  // If manufacturer is known, narrow to that one; otherwise include all 6
  const manufacturerContext = buildManufacturerContextForPrompt(
    input.manufacturerName || undefined
  );

  // Build carrier-specific intelligence context
  const carrierContext = input.carrierName
    ? buildCarrierContextForPrompt(input.carrierName)
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
    manufacturerContext,
    carrierContext,
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
    claim_data?: {
      claim_number?: string;
      policy_number?: string;
      carrier_name?: string;
      property_address?: string;
      property_city?: string;
      property_state?: string;
      property_zip?: string;
      date_of_loss?: string;
      adjuster_name?: string;
      adjuster_email?: string;
      adjuster_phone?: string;
    };
    adjuster_items?: Array<{
      xactimate_code: string;
      description: string;
      quantity: number;
      unit: string;
      unit_price?: number;
    }>;
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
  console.log(`[detectMissingItems] Adjuster items extracted: ${result.adjuster_items?.length ?? 0}`);

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

  // Build extracted claim data from Claude's response
  const extractedClaimData: ExtractedClaimData | undefined = result.claim_data
    ? {
        claim_number: result.claim_data.claim_number || undefined,
        policy_number: result.claim_data.policy_number || undefined,
        carrier_name: result.claim_data.carrier_name || undefined,
        property_address: result.claim_data.property_address || undefined,
        property_city: result.claim_data.property_city || undefined,
        property_state: result.claim_data.property_state || undefined,
        property_zip: result.claim_data.property_zip || undefined,
        date_of_loss: result.claim_data.date_of_loss || undefined,
        adjuster_name: result.claim_data.adjuster_name || undefined,
        adjuster_email: result.claim_data.adjuster_email || undefined,
        adjuster_phone: result.claim_data.adjuster_phone || undefined,
        adjuster_estimate_total: result.adjuster_total,
      }
    : undefined;

  const adjusterItems: AdjusterItem[] = (result.adjuster_items || []).map(
    (item: { xactimate_code: string; description: string; quantity: number; unit: string; unit_price?: number }) => ({
      xactimate_code: item.xactimate_code,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
    })
  );

  return {
    items,
    adjuster_total: result.adjuster_total,
    supplement_total: Math.round(supplement_total * 100) / 100,
    waste_adjuster: result.waste_percent_adjuster,
    summary: result.summary,
    extractedClaimData,
    debugRawResponse: textBlock.text.substring(0, 1000),
    adjusterItems,
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
  if (m.ftValleys) {
    lines.push(`Valleys: ${m.ftValleys} LF${m.numValleys ? ` (${m.numValleys} segments)` : ""}`);
    lines.push(`  >> VALLEY IWS AREA: ${m.ftValleys * 3} SF (${m.ftValleys} LF × 3 ft width)`);
  }
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
  manufacturerContext: string;
  carrierContext: string;
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
${ctx.manufacturerContext ? `\n${ctx.manufacturerContext}` : ""}
${ctx.carrierContext ? `\n${ctx.carrierContext}\n` : ""}
${buildJustificationStrategy(ctx.policyContext)}
## COMMONLY MISSED XACTIMATE CODES
${ctx.codesContext}
Note: You may also use valid Xactimate codes from your training knowledge if applicable.

## ADJUSTER SCOPE EXTRACTION
Before identifying missing items, you MUST extract ALL line items from the adjuster's estimate into the "adjuster_items" array.
This is critical — we need to know exactly what the adjuster already scoped so we can calculate the delta (supplement = measurement - adjuster scope).
Include EVERY line item from the estimate: shingles, felt, IWS, drip edge, starter, ridge cap, labor, tear-off, steep charges — everything.

## WHAT TO DO
1. Read the PDF estimate — identify what IS already included
2. Extract the adjuster's total RCV and waste % if visible
3. Compare against measurements + industry standards to find MISSING items:
   - D&R for every accessory (solar panels, HVAC, satellite, skylights, pipe boots)
   - Starter strip, drip edge, ice & water shield, ridge/hip cap
   - Step flashing, underlayment, steep pitch charges, high roof charges
   - Waste % adjustment, permit fees, haul away
4. For solar panels: EACH panel = separate D&R line ($200-500+/panel, licensed electrician)

## QUANTITY CALCULATION RULES
Follow these formulas exactly — do NOT estimate or approximate:

### Underlayment / Felt (RFG FELT, RFG FELT+, synthetic underlayment)
- Underlayment covers the area NOT covered by ice & water shield (IWS).
- Formula: Additional Underlayment SQ = ((TotalRoofArea_SF - IWS_SF) / 100) - AdjusterFeltSQ
- This is COMPLETELY INDEPENDENT of shingle quantities. Never reuse the shingle shortage.
- Example: 2,900 SF roof, 1,038 SF IWS, adjuster has 10.97 SQ felt → (2900-1038)/100 - 10.97 = 7.65 SQ additional

### Ice & Water Shield in Valleys
- IWS is a SHEET material measured in SF, not LF.
- Valley IWS SF = Valley_LF × 3 (standard 36-inch wide roll)
- Price per SF — match the adjuster's estimate IWS price (typically $1.50-$2.50/SF)
- NEVER price per LF at a low rate — this drastically undervalues the material.

### Shingle Waste Factor
- The waste percentage is provided by the contractor from their measurement report. Do NOT override or invent your own waste percentage.
- Justification MUST reference the measurement source: "Measurement report documents [X] hips, [Y] valleys, and [Z] dormers. Roof geometry requires [W]% material waste for cuts and fitting per contractor-confirmed measurements. Measurement report included as supporting documentation."
- Do NOT say "industry standard waste factor" — adjusters push back on this. Reference the specific roof geometry and measurement report.

### Shingle Shortage
- Shingle shortage = (Measured_SQ × (1 + waste%)) - Adjuster_Shingle_SQ
- Completely separate from underlayment.

### D&R of Accessories (Solar, HVAC, Satellite Dishes, Skylights, Antennas, etc.)
- For EVERY accessory currently installed on the roof, include a D&R line item.
- The justification MUST state: "[Item] is currently installed on the roof and must be removed to complete roof replacement. Reinstallation with proper mounting/connections is required after roofing work is complete."
- Do NOT use vague language like "industry standard" — state the physical fact: the item is there, it needs to come off, and it needs to go back on.
- Satellite dishes: include removal/reinstallation AND recalibration/realignment. State the dish is currently mounted on the roof.
- Solar panels: EACH panel = separate D&R line ($200-500+/panel, licensed electrician required). State that panels are currently installed on the roof and each must be individually disconnected, removed, stored, and reinstalled.
- HVAC penetrations: State that HVAC stacks/penetrations currently penetrate the roof deck and must be temporarily removed and re-flashed.

## CRITICAL RULES
- Only return items that are genuinely missing or underpaid based on evidence (measurements, code requirements, manufacturer specs, policy coverage). Do NOT fabricate or pad items.
- If the estimate is thorough and nothing is missing, return an empty missing_items array with a summary noting the estimate appears complete.
- If you cannot read the PDF clearly, state that in the summary. Only return items you have reasonable evidence for — do not guess.
- For each contractor-flagged item, create a line item but assign appropriate confidence (lower if evidence is weak).
- Use measurements for quantities (ridge LF for ridge cap, valley LF for ice & water, etc.)
- Cite IRC codes or manufacturer specs in justifications
- Do NOT include Overhead & Profit (O&P) — it is calculated separately by our system after you return items
- Quality over quantity — 1 well-justified item beats 10 weak ones

Return ONLY JSON — no markdown, no code fences:
{
  "adjuster_total": <number or null>,
  "waste_percent_adjuster": <number or null>,
  "summary": "<2-3 sentence summary of missing items and estimated recovery>",
  "claim_data": {
    "claim_number": "<claim/file number from the estimate or empty string>",
    "policy_number": "<insurance policy number or empty string>",
    "carrier_name": "<insurance carrier/company name or empty string>",
    "property_address": "<street address of the property or empty string>",
    "property_city": "<city or empty string>",
    "property_state": "<2-letter state abbreviation or empty string>",
    "property_zip": "<ZIP code or empty string>",
    "date_of_loss": "<date of loss in YYYY-MM-DD format or empty string>",
    "adjuster_name": "<adjuster's full name or empty string>",
    "adjuster_email": "<adjuster's email or empty string>",
    "adjuster_phone": "<adjuster's phone number or empty string>"
  },
  "adjuster_items": [
    {
      "xactimate_code": "<code from estimate>",
      "description": "<description>",
      "quantity": <number>,
      "unit": "<SQ|LF|SF|EA|etc>",
      "unit_price": <dollar amount or null>
    }
  ],
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

function buildJustificationStrategy(policyContext: string | null): string {
  const hasLOCoverage = policyContext?.toLowerCase().includes("code_upgrade_coverage") ||
    policyContext?.toLowerCase().includes("law & ordinance") ||
    policyContext?.toLowerCase().includes("ordinance or law");

  const baseRequirements = `
## JUSTIFICATION REQUIREMENTS
- Each justification MUST include at least 2 of these 3 evidence pillars:
  1. POLICY/INDUSTRY: Reference the Xactimate line item description as industry-standard scope
  2. CODE AUTHORITY: Cite the specific IRC section AND the jurisdiction's AHJ name/website (if provided above)
  3. MANUFACTURER: Reference the manufacturer's installation requirement and warranty impact
- Write justifications in professional third-person language for carrier correspondence
- For D&R items: The PRIMARY justification is physical presence — the item is on the roof and cannot remain during replacement. This is a physical necessity, not an "industry standard" argument. State the fact directly.`;

  if (hasLOCoverage) {
    return `${baseRequirements}

## JUSTIFICATION STRATEGY
Policy HAS Law & Ordinance coverage. For each item use this priority:
1. IRC code reference (primary) — the policy covers code compliance
2. Manufacturer installation requirement (supporting)
3. Xactimate line description (industry standard scope)`;
  }

  return `${baseRequirements}

## JUSTIFICATION STRATEGY
Policy does NOT have Law & Ordinance coverage. For each item:
1. Xactimate line description — frame as industry-standard scope of work
2. Manufacturer requirement — cite warranty void language as primary basis
3. IRC code — mention for context but note the policy may not cover code upgrades
If an item has ONLY a building code justification and no manufacturer/industry basis, set confidence below 0.4 and note the coverage gap.`;
}
