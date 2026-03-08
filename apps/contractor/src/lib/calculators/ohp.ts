/**
 * Overhead & Profit Calculator
 *
 * Calculates O&P on FULL scope (adjuster base + supplement), not just supplement.
 * Uses 10% overhead compounded by 10% profit = 21% (not flat 20%).
 * Multi-trade detection strengthens justification.
 */

export interface OhpInput {
  adjusterEstimateBase: number;   // Adjuster line items total BEFORE O&P
  supplementBase: number;         // Supplement line items total BEFORE O&P
  ohpAlreadyPaid: number;         // O&P already in adjuster estimate
  tradeCategories: string[];      // Unique trade categories in the supplement
  competitiveMarket?: boolean;    // MD competitive markets = 15/10 not 10/10
}

export interface OhpResult {
  combinedScopeBase: number;
  overheadRate: number;
  profitRate: number;
  effectiveRate: number;          // compounded
  fullOhp: number;
  ohpAlreadyPaid: number;
  supplementalOhp: number;
  tradeCount: number;
  tradeNames: string[];
  multiTradeJustification: string;
  formulaDisplay: string;         // For PDF rendering
}

const TRADE_CATEGORY_MAP: Record<string, string> = {
  "ROOFING": "Roofing",
  "HVAC": "HVAC",
  "ELECTRICAL": "Electrical",
  "PLUMBING": "Plumbing",
  "GENERAL": "General Trades",
  "GUTTERS": "Gutters",
  "SIDING": "Siding/Exterior",
  "INTERIOR": "Interior",
  "INSULATION": "Insulation",
  "DRYWALL": "Drywall",
  "PAINTING": "Painting",
  "FRAMING": "Framing",
  "DEMOLITION": "Demolition",
};

export function calculateOhp(input: OhpInput): OhpResult {
  const {
    adjusterEstimateBase,
    supplementBase,
    ohpAlreadyPaid,
    tradeCategories,
    competitiveMarket = false,
  } = input;

  const tradeNames = [...new Set(
    tradeCategories.map(cat => TRADE_CATEGORY_MAP[cat.toUpperCase()] || cat)
  )];
  const tradeCount = tradeNames.length;

  const overheadRate = competitiveMarket ? 0.15 : 0.10;
  const profitRate = 0.10;

  // Compounded: (1 + overhead) * (1 + profit) - 1
  const effectiveRate = (1 + overheadRate) * (1 + profitRate) - 1;

  const combinedScopeBase = adjusterEstimateBase + supplementBase;
  const fullOhp = Math.round(combinedScopeBase * effectiveRate * 100) / 100;
  const supplementalOhp = Math.round(Math.max(0, fullOhp - ohpAlreadyPaid) * 100) / 100;

  let multiTradeJustification: string;
  if (tradeCount >= 3) {
    multiTradeJustification = `This project involves ${tradeCount} trades (${tradeNames.join(", ")}). Full O&P at ${(overheadRate * 100).toFixed(0)}%+${(profitRate * 100).toFixed(0)}% is industry standard for multi-trade projects per Xactimate guidelines.`;
  } else if (tradeCount === 2) {
    multiTradeJustification = `This project involves ${tradeCount} trades (${tradeNames.join(", ")}). O&P at ${(overheadRate * 100).toFixed(0)}%+${(profitRate * 100).toFixed(0)}% is standard for multi-trade projects.`;
  } else {
    multiTradeJustification = `O&P at ${(overheadRate * 100).toFixed(0)}%+${(profitRate * 100).toFixed(0)}% per industry standard methodology.`;
  }

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const ohPct = (overheadRate * 100).toFixed(0);
  const prPct = (profitRate * 100).toFixed(0);
  const effPct = (effectiveRate * 100).toFixed(1);

  const formulaDisplay = [
    `Adjuster estimate base: ${fmt(adjusterEstimateBase)}`,
    `Supplement base: ${fmt(supplementBase)}`,
    `Combined scope: ${fmt(combinedScopeBase)}`,
    `O&P rate: ${ohPct}% overhead + ${prPct}% profit = ${effPct}% (compounded)`,
    `Full O&P on combined scope: ${fmt(combinedScopeBase)} x ${effPct}% = ${fmt(fullOhp)}`,
    `O&P already paid: ${fmt(ohpAlreadyPaid)}`,
    `Supplemental O&P requested: ${fmt(fullOhp)} - ${fmt(ohpAlreadyPaid)} = ${fmt(supplementalOhp)}`,
  ].join("\n");

  return {
    combinedScopeBase,
    overheadRate,
    profitRate,
    effectiveRate,
    fullOhp,
    ohpAlreadyPaid,
    supplementalOhp,
    tradeCount,
    tradeNames,
    multiTradeJustification,
    formulaDisplay,
  };
}
