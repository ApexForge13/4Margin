/**
 * Chat System Prompt Builder — 4Margin Supplement Co-Pilot
 *
 * Constructs the system prompt for the supplement chatbot, injecting
 * full claim context (items, measurements, policy, jurisdiction) so the
 * model can answer questions and invoke tools with authority.
 *
 * Design constraints:
 * - Target ~2 500 tokens to leave headroom for conversation history and
 *   tool call payloads within a 200 k context window.
 * - Null / undefined values are handled gracefully — never throw, never
 *   surface "undefined" strings to the model.
 */

/* ─────── ChatContext ─────── */

export interface ChatContext {
  supplementId: string;
  claimId: string;
  companyId: string;

  items: Array<{
    id: string;
    xactimate_code: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    justification: string | null;
    confidence_score: number | null;
    confidence_tier: string | null;
    confidence_details: Record<string, unknown> | null;
    status: string;
    category: string | null;
    irc_reference: string | null;
  }>;

  claim: {
    claim_number?: string;
    policy_number?: string;
    carrier_name?: string;
    property_address?: string;
    property_city?: string;
    property_state?: string;
    property_zip?: string;
    date_of_loss?: string;
    adjuster_name?: string;
    description?: string;
    roof_squares?: number;
    waste_percent?: number;
    total_roof_area?: number;
    roof_pitch?: string;
    ft_valleys?: number;
    ft_ridges?: number;
    ft_hips?: number;
    ft_eaves?: number;
    ft_rakes?: number;
    ft_drip_edge?: number;
    ft_step_flashing?: number;
    num_valleys?: number;
    num_hips?: number;
    [key: string]: unknown;
  };

  policyAnalysis: Record<string, unknown> | null;
  countyInfo: { county: string; state: string } | null;
  supplementTotal: number | null;
  adjusterTotal: number | null;
}

/* ─────── Formatters ─────── */

/** Format a dollar amount with commas and two decimal places. */
function formatDollar(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "N/A";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format a plain number, falling back to "N/A". */
function formatNum(
  value: number | null | undefined,
  decimals = 2,
  suffix = "",
): string {
  if (value == null || !isFinite(value)) return "N/A";
  return `${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

/** Return the value or "N/A" if empty. */
function orNA(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : "N/A";
}

/* ─────── Section Builders ─────── */

function buildItemsTable(context: ChatContext): string {
  const { items, supplementTotal, adjusterTotal } = context;

  if (items.length === 0) {
    return "No supplement items detected yet.";
  }

  const header = [
    "| # | Code | Description | Qty | Unit | Unit Price | Total | Conf | Status |",
    "|---|------|-------------|-----|------|------------|-------|------|--------|",
  ];

  const rows = items.map((item, idx) => {
    const conf =
      item.confidence_score != null
        ? `${item.confidence_score} ${titleCase(item.confidence_tier ?? "")}`
        : "N/A";

    // Truncate long descriptions to keep the table readable.
    const desc =
      item.description.length > 40
        ? item.description.slice(0, 38) + "…"
        : item.description;

    return [
      `| ${idx + 1}`,
      item.xactimate_code,
      desc,
      formatNum(item.quantity, 2),
      item.unit,
      formatDollar(item.unit_price),
      formatDollar(item.total_price),
      conf,
      item.status,
    ].join(" | ") + " |";
  });

  const totalBlock: string[] = [];

  if (supplementTotal != null) {
    totalBlock.push(`Supplement Total: ${formatDollar(supplementTotal)}`);
  }
  if (adjusterTotal != null) {
    totalBlock.push(`Adjuster's Estimate: ${formatDollar(adjusterTotal)}`);
  }
  if (supplementTotal != null && adjusterTotal != null) {
    const revised = adjusterTotal + supplementTotal;
    totalBlock.push(`Revised Total: ${formatDollar(revised)}`);
  }

  return [...header, ...rows, "", ...totalBlock].join("\n");
}

function buildMeasurementsSection(context: ChatContext): string {
  const c = context.claim;
  const lines: string[] = [];

  const roofArea = c.total_roof_area ?? null;
  const squares = c.roof_squares ?? null;
  const waste = c.waste_percent ?? null;
  const pitch = c.roof_pitch ?? null;

  const line1Parts: string[] = [];
  if (roofArea != null) line1Parts.push(`Roof Area: ${formatNum(roofArea, 0, " SF")}`);
  if (squares != null) line1Parts.push(`Squares: ${formatNum(squares, 2)}`);
  if (waste != null) line1Parts.push(`Waste: ${formatNum(waste, 1, "%")}`);
  if (line1Parts.length > 0) lines.push(line1Parts.join(" | "));

  const line2Parts: string[] = [];
  if (pitch) line2Parts.push(`Pitch: ${pitch}`);
  if (c.ft_valleys != null) line2Parts.push(`Valleys: ${formatNum(c.ft_valleys, 0, " LF")}`);
  if (c.ft_ridges != null) line2Parts.push(`Ridges: ${formatNum(c.ft_ridges, 0, " LF")}`);
  if (c.ft_hips != null) line2Parts.push(`Hips: ${formatNum(c.ft_hips, 0, " LF")}`);
  if (line2Parts.length > 0) lines.push(line2Parts.join(" | "));

  const line3Parts: string[] = [];
  if (c.ft_eaves != null) line3Parts.push(`Eaves: ${formatNum(c.ft_eaves, 0, " LF")}`);
  if (c.ft_rakes != null) line3Parts.push(`Rakes: ${formatNum(c.ft_rakes, 0, " LF")}`);
  if (c.ft_drip_edge != null) line3Parts.push(`Drip Edge: ${formatNum(c.ft_drip_edge, 0, " LF")}`);
  if (c.ft_step_flashing != null) line3Parts.push(`Step Flashing: ${formatNum(c.ft_step_flashing, 0, " LF")}`);
  if (line3Parts.length > 0) lines.push(line3Parts.join(" | "));

  return lines.length > 0 ? lines.join("\n") : "No measurement data available.";
}

function buildClaimDetailsSection(context: ChatContext): string {
  const c = context.claim;
  const lines: string[] = [];

  const carrier = orNA(c.carrier_name);
  const adjuster = orNA(c.adjuster_name);
  if (carrier !== "N/A" || adjuster !== "N/A") {
    lines.push(`Carrier: ${carrier} | Adjuster: ${adjuster}`);
  }

  const addressParts = [
    c.property_address,
    c.property_city,
    c.property_state,
    c.property_zip,
  ]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join(", ");
  if (addressParts.length > 0) lines.push(`Property: ${addressParts}`);

  if (c.date_of_loss) {
    lines.push(`Date of Loss: ${c.date_of_loss}`);
  }

  const claimNo = orNA(c.claim_number);
  const policyNo = orNA(c.policy_number);
  if (claimNo !== "N/A" || policyNo !== "N/A") {
    lines.push(`Claim #: ${claimNo} | Policy #: ${policyNo}`);
  }

  if (c.description) {
    const desc = c.description.trim();
    if (desc.length > 0) lines.push(`Description: ${desc}`);
  }

  return lines.length > 0 ? lines.join("\n") : "No claim details available.";
}

function buildPolicySection(policyAnalysis: Record<string, unknown> | null): string {
  if (!policyAnalysis) return "No policy uploaded.";

  const lines: string[] = [];

  const coverage = extractString(policyAnalysis, [
    "coverageType",
    "coverage_type",
  ]);
  if (coverage) lines.push(`Coverage Type: ${coverage}`);

  // Ordinance and Law
  const hasOL =
    extractBool(policyAnalysis, ["hasOrdinanceLaw", "has_ordinance_law"]) ??
    extractBool(policyAnalysis, ["ordinanceLaw", "ordinance_law"]);
  if (hasOL != null) {
    lines.push(`Ordinance & Law Endorsement: ${hasOL ? "YES" : "No"}`);
  }

  // Favorable provisions summary
  const provisions = extractStringArray(policyAnalysis, [
    "favorableProvisions",
    "favorable_provisions",
    "keyProvisions",
    "key_provisions",
  ]);
  if (provisions.length > 0) {
    // Cap at 5 to stay within token budget.
    const shown = provisions.slice(0, 5);
    lines.push("Key Provisions:");
    shown.forEach((p) => lines.push(`  - ${p}`));
  }

  // Landmines / exclusions
  const landmines = extractStringArray(policyAnalysis, [
    "landmines",
    "exclusions",
    "policyExclusions",
    "policy_exclusions",
  ]);
  if (landmines.length > 0) {
    const shown = landmines.slice(0, 3);
    lines.push("Watch Outs:");
    shown.forEach((l) => lines.push(`  - ${l}`));
  }

  return lines.length > 0 ? lines.join("\n") : "Policy uploaded but no details extracted.";
}

function buildJurisdictionSection(
  countyInfo: { county: string; state: string } | null,
): string {
  if (!countyInfo) return "No jurisdiction data.";
  return `${countyInfo.county} County, ${countyInfo.state} — local IRC adoption and code amendments apply.`;
}

/* ─────── Helpers ─────── */

function titleCase(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function extractString(
  obj: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function extractBool(
  obj: Record<string, unknown>,
  keys: string[],
): boolean | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
  }
  return null;
}

function extractStringArray(
  obj: Record<string, unknown>,
  keys: string[],
): string[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) {
      const strs = v
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim());
      if (strs.length > 0) return strs;
    }
  }
  return [];
}

/* ─────── Main Export ─────── */

/**
 * Build the system prompt for the 4Margin supplement chat co-pilot.
 *
 * The returned string is designed to stay under ~2 500 tokens so there
 * is ample room for conversation history and tool schemas in the full
 * context window.
 */
export function buildChatSystemPrompt(context: ChatContext): string {
  const itemsTable = buildItemsTable(context);
  const measurements = buildMeasurementsSection(context);
  const claimDetails = buildClaimDetailsSection(context);
  const policySection = buildPolicySection(context.policyAnalysis);
  const jurisdiction = buildJurisdictionSection(context.countyInfo);

  return `You are the 4Margin Supplement Co-Pilot — an expert roofing supplement assistant. You help contractors review, edit, and improve their insurance supplement claims.

You have access to tools that directly modify the supplement. When the contractor asks you to make changes, use the appropriate tool. Always confirm what you changed after executing a tool.

Be concise, professional, and use roofing industry terminology. When discussing justifications, reference specific IRC codes, manufacturer requirements, and measurement data when available.

## CURRENT SUPPLEMENT ITEMS

${itemsTable}

## CLAIM MEASUREMENTS

${measurements}

## CLAIM DETAILS

${claimDetails}

## POLICY ANALYSIS

${policySection}

## JURISDICTION

${jurisdiction}

## RULES
- When modifying items, always use the appropriate tool (update_item, add_item, remove_item)
- After making changes, briefly confirm what was done and the impact on the total
- For justification rewrites, incorporate relevant IRC codes, manufacturer specs, and measurement data
- When explaining confidence, break down all 5 dimensions: Policy Support, Code Authority, Manufacturer Requirement, Physical Presence, Measurement Evidence
- Be direct and action-oriented — contractors are busy
- If the contractor asks something you cannot do with your tools, explain what tools you have available
- Never fabricate Xactimate codes — use lookup_xactimate to verify codes exist`;
}
