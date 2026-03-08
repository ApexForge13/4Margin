/**
 * Confidence Scoring Engine — 4-Dimension Item Scorer
 *
 * Every supplement line item gets scored across four dimensions:
 * 1. Policy Support (25 pts) — does the policy cover this item?
 * 2. Code Authority (25 pts) — is this code-required in this county?
 * 3. Manufacturer Requirement (25 pts) — does the manufacturer require it?
 * 4. Carrier Approval History (25 pts) — has this carrier approved it before?
 *
 * Score determines presentation order and contractor guidance:
 * 85-100: High confidence — push hard, strong three-pillar support
 * 60-84:  Good confidence — include, may need rebuttal
 * 35-59:  Moderate — include with documentation, flag for review
 * Under 35: Low — optional, contractor decides, rebuttal scripts provided
 */

/* ─────── Types ─────── */

export interface PolicyContext {
  hasOrdinanceLaw: boolean;        // Ordinance/Law endorsement present
  coverageType: "RCV" | "ACV" | "MODIFIED_ACV" | "UNKNOWN";
  relevantEndorsements: string[];  // endorsement names that support this item
  policyExcludesItem: boolean;     // policy explicitly excludes this item
}

export interface CodeContext {
  isCodeRequired: boolean;           // item is code-required in this county
  r9052_1Confirmed: boolean;        // R905.2.1 adoption verified for this jurisdiction
  r9052_1Unverified: boolean;       // R905.2.1 adoption not yet confirmed
  ircReferenced: boolean;           // item referenced in IRC but not county-confirmed
  countyName: string | null;
  ircVersion: string | null;
  codeSection: string | null;
}

export interface ManufacturerContext {
  isRequired: boolean;               // manufacturer requires this item
  r9052_1Applies: boolean;          // R905.2.1 bridges manufacturer req to code req
  isWarrantyBasisOnly: boolean;     // warranty-based but not code-bridged
  isRecommendedNotRequired: boolean; // manufacturer recommends but doesn't require
  manufacturerName: string | null;
  productName: string | null;
  warrantyVoidLanguage: string | null;
}

export interface CarrierContext {
  carrierName: string | null;
  countyName: string | null;
  xactimateCode: string;
  historicalApprovalRate: number | null; // 0-1, null = no data
  sampleSize: number;                    // number of data points
}

export interface ConfidenceInput {
  policy: PolicyContext;
  code: CodeContext;
  manufacturer: ManufacturerContext;
  carrier: CarrierContext;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  maxScore: number;
  reasoning: string;
}

export interface ConfidenceResult {
  totalScore: number;
  tier: "high" | "good" | "moderate" | "low";
  tierLabel: string;
  tierDescription: string;
  dimensions: DimensionScore[];
  summaryText: string;   // one-line summary for PDF/UI
}

/* ─────── Scoring Functions ─────── */

function scorePolicySupport(ctx: PolicyContext): DimensionScore {
  let score = 0;
  let reasoning: string;

  if (ctx.policyExcludesItem) {
    score = 0;
    reasoning = "Policy explicitly excludes this item";
  } else if (ctx.hasOrdinanceLaw && ctx.relevantEndorsements.length > 0) {
    score = 25;
    reasoning = `Ordinance/Law endorsement present — fully payable per ${ctx.relevantEndorsements[0]}`;
  } else if (ctx.hasOrdinanceLaw) {
    score = 20;
    reasoning = "Ordinance/Law endorsement present — code items are payable";
  } else if (ctx.coverageType === "RCV") {
    score = 15;
    reasoning = "RCV coverage — full replacement cost basis";
  } else if (ctx.coverageType === "ACV" || ctx.coverageType === "MODIFIED_ACV") {
    score = 10;
    reasoning = `${ctx.coverageType} coverage — depreciation applies but item still coverable`;
  } else {
    score = 5;
    reasoning = "Policy coverage type unknown — include with documentation";
  }

  return { dimension: "Policy Support", score, maxScore: 25, reasoning };
}

function scoreCodeAuthority(ctx: CodeContext): DimensionScore {
  let score = 0;
  let reasoning: string;

  if (ctx.isCodeRequired && ctx.r9052_1Confirmed) {
    score = 25;
    reasoning = `Code-required in ${ctx.countyName || "jurisdiction"} per IRC ${ctx.ircVersion || ""} ${ctx.codeSection || ""}. R905.2.1 confirmed.`;
  } else if (ctx.isCodeRequired && ctx.r9052_1Unverified) {
    score = 15;
    reasoning = `Code-required per IRC ${ctx.codeSection || ""} but R905.2.1 adoption not yet verified for ${ctx.countyName || "this jurisdiction"}`;
  } else if (ctx.ircReferenced) {
    score = 10;
    reasoning = `Referenced in IRC ${ctx.codeSection || ""} but not confirmed as county requirement`;
  } else {
    score = 0;
    reasoning = "No code basis for this item";
  }

  return { dimension: "Code Authority", score, maxScore: 25, reasoning };
}

function scoreManufacturerRequirement(ctx: ManufacturerContext): DimensionScore {
  let score = 0;
  let reasoning: string;

  if (ctx.isRequired && ctx.r9052_1Applies) {
    score = 25;
    reasoning = `Required by ${ctx.manufacturerName || "manufacturer"} AND code-mandated via R905.2.1 — strongest possible basis`;
  } else if (ctx.isRequired && ctx.isWarrantyBasisOnly) {
    score = 15;
    reasoning = `Required by ${ctx.manufacturerName || "manufacturer"} for warranty — indemnification argument applies`;
  } else if (ctx.isRecommendedNotRequired) {
    score = 5;
    reasoning = `Recommended by ${ctx.manufacturerName || "manufacturer"} but not required — weaker basis`;
  } else {
    score = 0;
    reasoning = "No manufacturer basis for this item";
  }

  return { dimension: "Manufacturer Requirement", score, maxScore: 25, reasoning };
}

function scoreCarrierHistory(ctx: CarrierContext): DimensionScore {
  let score: number;
  let reasoning: string;

  if (ctx.historicalApprovalRate === null || ctx.sampleSize < 3) {
    score = 12;
    reasoning = ctx.carrierName
      ? `Insufficient data for ${ctx.carrierName} on ${ctx.xactimateCode} — neutral default`
      : "No carrier data available — neutral default";
  } else if (ctx.historicalApprovalRate > 0.8) {
    score = 25;
    reasoning = `${ctx.carrierName} approves ${ctx.xactimateCode} at ${Math.round(ctx.historicalApprovalRate * 100)}% rate (${ctx.sampleSize} claims)`;
  } else if (ctx.historicalApprovalRate > 0.5) {
    score = 15;
    reasoning = `${ctx.carrierName} approves ${ctx.xactimateCode} at ${Math.round(ctx.historicalApprovalRate * 100)}% — rebuttal may be needed`;
  } else if (ctx.historicalApprovalRate > 0.2) {
    score = 10;
    reasoning = `${ctx.carrierName} approves ${ctx.xactimateCode} at only ${Math.round(ctx.historicalApprovalRate * 100)}% — expect pushback, rebuttal loaded`;
  } else {
    score = 5;
    reasoning = `${ctx.carrierName} rarely approves ${ctx.xactimateCode} (${Math.round(ctx.historicalApprovalRate * 100)}%) — strong rebuttal required`;
  }

  return { dimension: "Carrier Approval History", score, maxScore: 25, reasoning };
}

/* ─────── Main Scoring Function ─────── */

export function scoreConfidence(input: ConfidenceInput): ConfidenceResult {
  const dimensions = [
    scorePolicySupport(input.policy),
    scoreCodeAuthority(input.code),
    scoreManufacturerRequirement(input.manufacturer),
    scoreCarrierHistory(input.carrier),
  ];

  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0);

  let tier: ConfidenceResult["tier"];
  let tierLabel: string;
  let tierDescription: string;

  if (totalScore >= 85) {
    tier = "high";
    tierLabel = "High Confidence";
    tierDescription = "Strong three-pillar support. Include and push hard.";
  } else if (totalScore >= 60) {
    tier = "good";
    tierLabel = "Good Confidence";
    tierDescription = "Include. May require rebuttal — pre-loaded.";
  } else if (totalScore >= 35) {
    tier = "moderate";
    tierLabel = "Moderate Confidence";
    tierDescription = "Include with strong documentation. Flag for contractor review.";
  } else {
    tier = "low";
    tierLabel = "Low Confidence";
    tierDescription = "Optional. Contractor decides whether to include. Rebuttal scripts provided.";
  }

  // Build summary text
  const topDimensions = dimensions
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(d => d.dimension);

  const summaryText = topDimensions.length > 0
    ? `${tierLabel} (${totalScore}/100) — supported by ${topDimensions.join(" + ")}`
    : `${tierLabel} (${totalScore}/100) — limited supporting evidence`;

  return {
    totalScore,
    tier,
    tierLabel,
    tierDescription,
    dimensions,
    summaryText,
  };
}

/* ─────── Batch Scoring ─────── */

export interface ScoredItem<T> {
  item: T;
  confidence: ConfidenceResult;
}

/**
 * Score and sort items by confidence. Highest confidence first.
 */
export function scoreAndSort<T>(
  items: T[],
  getInput: (item: T) => ConfidenceInput
): ScoredItem<T>[] {
  return items
    .map(item => ({
      item,
      confidence: scoreConfidence(getInput(item)),
    }))
    .sort((a, b) => b.confidence.totalScore - a.confidence.totalScore);
}
