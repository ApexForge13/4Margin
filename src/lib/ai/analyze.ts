/**
 * AI Missing Item Detection Engine
 *
 * Compares the adjuster's estimate against roof measurements, damage type,
 * and the Xactimate codes database to identify missing/underpaid line items.
 * Returns structured supplement_items ready for DB insertion.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey });
};

/* ─────── Types ─────── */

export interface AnalysisInput {
  supplementId: string;
  estimatePdfBase64: string;
  claimDescription: string;
  adjusterScopeNotes: string;
  itemsBelievedMissing: string;
  damageTypes: string[];
  measurements: {
    measuredSquares: number | null;
    wastePercent: number | null;
    suggestedSquares: number | null;
    pitch: string | null;
    ftRidges: number | null;
    ftHips: number | null;
    ftValleys: number | null;
    ftRakes: number | null;
    ftEaves: number | null;
    ftDripEdge: number | null;
    ftParapet: number | null;
    ftFlashing: number | null;
    ftStepFlashing: number | null;
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

  const prompt = buildAnalysisPrompt({
    codesContext,
    measurementsContext,
    claimDescription: input.claimDescription,
    adjusterScopeNotes: input.adjusterScopeNotes,
    itemsBelievedMissing: input.itemsBelievedMissing,
    damageTypes: input.damageTypes,
  });

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
              type: "base64",
              media_type: "application/pdf" as const,
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
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

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

  // Map to DetectedItem format
  const items: DetectedItem[] = result.missing_items.map((item) => ({
    xactimate_code: item.xactimate_code,
    description: item.description,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    total_price: Math.round(item.quantity * item.unit_price * 100) / 100,
    justification: item.justification,
    irc_reference: item.irc_reference || "",
    confidence: item.confidence,
    detection_source: "ai_claude",
  }));

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
  if (m.measuredSquares) lines.push(`Measured Squares: ${m.measuredSquares}`);
  if (m.wastePercent) lines.push(`Waste %: ${m.wastePercent}%`);
  if (m.suggestedSquares) lines.push(`Suggested Squares (w/waste): ${m.suggestedSquares}`);
  if (m.pitch) lines.push(`Predominant Pitch: ${m.pitch}`);
  if (m.ftRidges) lines.push(`Ridges: ${m.ftRidges} LF`);
  if (m.ftHips) lines.push(`Hips: ${m.ftHips} LF`);
  if (m.ftValleys) lines.push(`Valleys: ${m.ftValleys} LF`);
  if (m.ftRakes) lines.push(`Rakes: ${m.ftRakes} LF`);
  if (m.ftEaves) lines.push(`Eaves: ${m.ftEaves} LF`);
  if (m.ftDripEdge) lines.push(`Drip Edge: ${m.ftDripEdge} LF`);
  if (m.ftParapet) lines.push(`Parapet: ${m.ftParapet} LF`);
  if (m.ftFlashing) lines.push(`Flashing: ${m.ftFlashing} LF`);
  if (m.ftStepFlashing) lines.push(`Step Flashing: ${m.ftStepFlashing} LF`);
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
}): string {
  return `You are a senior roofing insurance supplement specialist with 20+ years of experience. Your job is to review the adjuster's Xactimate estimate (the PDF above) and identify MISSING or UNDERPAID line items that should be included in a supplement.

## CONTEXT

**Claim Description:** ${ctx.claimDescription || "Not provided"}

**Adjuster's Scope Notes:** ${ctx.adjusterScopeNotes || "Not provided"}

**Contractor's Notes (items believed missing):** ${ctx.itemsBelievedMissing || "Not provided"}

**Damage Types:** ${ctx.damageTypes.length > 0 ? ctx.damageTypes.join(", ") : "Not specified"}

**Roof Measurements:**
${ctx.measurementsContext}

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
   - Your confidence level (0.0 to 1.0)

## COMMON MISSING ITEMS TO CHECK FOR
- Starter strip (along eaves and rakes)
- Drip edge (eaves and rakes)
- Ice & water shield (valleys, eaves in cold climates)
- Ridge cap (along all ridges)
- Hip cap (along all hips)
- Step flashing (at walls/chimneys)
- Pipe boot/jack flashing
- Underlayment (synthetic vs felt)
- Steep pitch charges (7/12 and above)
- High roof charges (2+ stories)
- Permit and code upgrade
- Haul away / dump fees
- Ridge vent

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
