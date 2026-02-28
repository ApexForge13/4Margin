/**
 * Policy Health Score — calculates a 0-100 score + letter grade
 * from existing PolicyAnalysis data. No API calls needed.
 *
 * Scoring is intentionally aggressive (base 60, high penalties)
 * to maximize lead conversion on the switch CTA.
 */

export interface ScoreFactor {
  label: string;
  impact: number;
  severity: "positive" | "negative" | "neutral";
  explanation: string;
}

export interface PolicyScore {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  factors: ScoreFactor[];
  shouldSwitch: boolean;
  headline: string;
  recommendation: string;
}

interface PolicyAnalysisInput {
  depreciationMethod: string;
  landmines: Array<{ name: string; severity: string; impact: string }>;
  favorableProvisions: Array<{ name: string; impact: string }>;
  coverages: Array<{ section: string; label: string }>;
  deductibles: Array<{
    type: string;
    amount: string;
    dollarAmount: number | null;
    appliesTo: string;
  }>;
  riskLevel: string;
}

const BASE_SCORE = 60;

export function calculatePolicyScore(
  analysis: PolicyAnalysisInput
): PolicyScore {
  let score = BASE_SCORE;
  const factors: ScoreFactor[] = [];

  // ── Depreciation method ──────────────────────────────────────
  if (analysis.depreciationMethod === "ACV") {
    score -= 25;
    factors.push({
      label: "Actual Cash Value (ACV)",
      impact: -25,
      severity: "negative",
      explanation:
        "Your policy deducts for depreciation — on a 15-year-old roof, this could cut your payout by 40-60%.",
    });
  } else if (analysis.depreciationMethod === "MODIFIED_ACV") {
    score -= 10;
    factors.push({
      label: "Modified ACV Depreciation",
      impact: -10,
      severity: "negative",
      explanation:
        "Your policy uses a modified depreciation model — better than ACV but you may still lose value on older items.",
    });
  } else if (analysis.depreciationMethod === "RCV") {
    score += 8;
    factors.push({
      label: "Replacement Cost Value (RCV)",
      impact: 8,
      severity: "positive",
      explanation:
        "Your policy pays full replacement cost — you won't lose money to depreciation.",
    });
  }

  // ── Landmines ────────────────────────────────────────────────
  const landmines = analysis.landmines || [];
  for (const lm of landmines) {
    const sev = lm.severity?.toLowerCase();
    if (sev === "critical" || sev === "high") {
      score -= 12;
      factors.push({
        label: lm.name,
        impact: -12,
        severity: "negative",
        explanation: lm.impact || "This provision could significantly reduce your claim payout.",
      });
    } else if (sev === "warning") {
      score -= 6;
      factors.push({
        label: lm.name,
        impact: -6,
        severity: "negative",
        explanation: lm.impact || "This provision may limit your coverage in certain situations.",
      });
    }
  }

  // ── Favorable provisions ─────────────────────────────────────
  const favorables = analysis.favorableProvisions || [];
  for (const fp of favorables) {
    score += 4;
    factors.push({
      label: fp.name,
      impact: 4,
      severity: "positive",
      explanation: fp.impact || "This provision works in your favor during a claim.",
    });
  }

  if (favorables.length === 0) {
    score -= 8;
    factors.push({
      label: "No Favorable Provisions Found",
      impact: -8,
      severity: "negative",
      explanation:
        "We didn't detect any provisions that specifically work in your favor — like matching requirements, code upgrade coverage, or O&P allowance.",
    });
  }

  // ── Coverage adequacy ────────────────────────────────────────
  const coverages = analysis.coverages || [];
  const sections = coverages.map((c) => c.section?.toLowerCase() || "");
  const labels = coverages.map((c) => c.label?.toLowerCase() || "");

  const hasLawOrdinance =
    sections.includes("law_ordinance") ||
    labels.some((l) => l.includes("law") && l.includes("ordinance")) ||
    labels.some((l) => l.includes("code upgrade"));

  const hasExtendedReplacement =
    sections.includes("extended_replacement") ||
    labels.some((l) => l.includes("extended replacement"));

  if (hasLawOrdinance) {
    score += 4;
    factors.push({
      label: "Law & Ordinance Coverage",
      impact: 4,
      severity: "positive",
      explanation:
        "Covers code-required upgrades (ice & water shield, drip edge, ventilation) — typically $500–$3,000+ in value.",
    });
  }

  if (hasExtendedReplacement) {
    score += 4;
    factors.push({
      label: "Extended Replacement Cost",
      impact: 4,
      severity: "positive",
      explanation:
        "Provides additional coverage above your dwelling limit if rebuilding costs exceed expectations.",
    });
  }

  // ── Deductible burden ────────────────────────────────────────
  const deductibles = analysis.deductibles || [];
  const windHailDed = deductibles.find((d) => {
    const type = d.type?.toLowerCase() || "";
    const applies = d.appliesTo?.toLowerCase() || "";
    return (
      type.includes("wind") ||
      type.includes("hail") ||
      applies.includes("wind") ||
      applies.includes("hail")
    );
  });

  if (windHailDed?.dollarAmount) {
    if (windHailDed.dollarAmount > 5000) {
      score -= 12;
      factors.push({
        label: `High Wind/Hail Deductible (${windHailDed.amount})`,
        impact: -12,
        severity: "negative",
        explanation: `Your wind/hail deductible is $${windHailDed.dollarAmount.toLocaleString()} — you'd pay this out of pocket before coverage kicks in.`,
      });
    } else if (windHailDed.dollarAmount > 2500) {
      score -= 6;
      factors.push({
        label: `Wind/Hail Deductible (${windHailDed.amount})`,
        impact: -6,
        severity: "negative",
        explanation: `Your wind/hail deductible of $${windHailDed.dollarAmount.toLocaleString()} is above average — most homeowners pay $1,000–$2,500.`,
      });
    }
  }

  // ── Clamp & grade ────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  const grade = scoreToGrade(score);
  const shouldSwitch = grade !== "A" && grade !== "B";
  const { headline, recommendation } = buildMessaging(grade, factors);

  // Sort factors: negatives first (biggest impact), then positives
  factors.sort((a, b) => a.impact - b.impact);

  return { score, grade, factors, shouldSwitch, headline, recommendation };
}

function scoreToGrade(score: number): PolicyScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function buildMessaging(
  grade: PolicyScore["grade"],
  factors: ScoreFactor[]
): { headline: string; recommendation: string } {
  const negatives = factors.filter((f) => f.severity === "negative");

  switch (grade) {
    case "A":
      return {
        headline: "Your policy provides excellent coverage",
        recommendation:
          "Your policy has strong provisions and minimal gaps. Keep it — and review annually to make sure it stays competitive.",
      };
    case "B":
      return {
        headline: "Your policy is solid with minor gaps",
        recommendation:
          "You have good coverage overall. A quick review with a licensed agent could help close the remaining gaps.",
      };
    case "C":
      return {
        headline: "Your policy has notable coverage gaps",
        recommendation:
          negatives.length > 0
            ? `We found ${negatives.length} issue${negatives.length > 1 ? "s" : ""} that could leave you underprotected. A licensed agent can help you find better options — often at a similar or lower premium.`
            : "Your policy has room for improvement. Shopping around could get you better coverage at a competitive price.",
      };
    case "D":
      return {
        headline: "Your policy has significant coverage issues",
        recommendation:
          "Multiple provisions in your policy could substantially reduce your claim payout. We strongly recommend getting quotes from other carriers.",
      };
    case "F":
      return {
        headline: "Your policy has critical coverage gaps",
        recommendation:
          "Your policy has serious issues that could leave you paying thousands out of pocket on a claim. Talk to a licensed agent about better options as soon as possible.",
      };
  }
}
