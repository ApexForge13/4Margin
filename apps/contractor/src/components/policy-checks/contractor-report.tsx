"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  calculatePolicyScore,
  type PolicyScore,
} from "@/lib/policy-score";

interface PolicyAnalysis {
  policyType: string;
  carrier: string;
  policyNumber: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  namedInsured: string;
  propertyAddress: string;
  coverages: Array<{ section: string; label: string; limit: string | null; description: string }>;
  deductibles: Array<{ type: string; amount: string; dollarAmount: number | null; appliesTo: string }>;
  depreciationMethod: string;
  depreciationNotes: string;
  exclusions: Array<{ name: string; severity: string; description: string; impact: string }>;
  endorsements: Array<{ name: string; number: string | null; severity: string; description: string; impact: string }>;
  landmines: Array<{ name: string; severity: string; category: string; policyLanguage: string[]; impact: string; actionItem: string }>;
  favorableProvisions: Array<{ name: string; impact: string; policyLanguage: string[] }>;
  summaryForContractor: string;
  riskLevel: string;
  confidence: number;
}

const CLAIM_TYPE_LABELS: Record<string, string> = {
  wind: "Wind",
  hail: "Hail",
  fire: "Fire",
  water_flood: "Water/Flood",
  impact: "Impact",
  theft: "Theft",
  other: "Other",
};

// Categories that relate to each claim type
const CLAIM_RELEVANCE: Record<string, string[]> = {
  wind: ["wind", "storm", "hurricane", "windstorm", "cosmetic"],
  hail: ["hail", "cosmetic", "storm", "matching"],
  fire: ["fire", "smoke", "wildfire"],
  water_flood: ["water", "flood", "mold", "moisture", "backup"],
  impact: ["falling", "tree", "debris", "impact", "collision"],
  theft: ["theft", "vandalism", "burglary"],
};

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#16a34a";
    case "B": return "#2563eb";
    case "C": return "#ca8a04";
    case "D": return "#ea580c";
    case "F": return "#dc2626";
    default: return "#71717a";
  }
}

function goNoGoRecommendation(
  score: PolicyScore,
  claimType: string | null,
  relevantLandmines: PolicyAnalysis["landmines"]
): { label: string; color: string; explanation: string } {
  const hasCriticalLandmines = relevantLandmines.some(
    (l) => l.severity === "critical" || l.severity === "high"
  );

  if (score.grade === "F" || (score.grade === "D" && hasCriticalLandmines)) {
    return {
      label: "DO NOT FILE",
      color: "#dc2626",
      explanation: `Policy has critical issues that would significantly reduce recovery. ${hasCriticalLandmines ? "Landmines directly relevant to this claim type." : ""} Advise homeowner to shop for better coverage first.`,
    };
  }

  if (score.grade === "D" || (score.grade === "C" && hasCriticalLandmines)) {
    return {
      label: "PROCEED WITH CAUTION",
      color: "#ea580c",
      explanation: `Policy has issues that could limit recovery. Review deductible impact and landmines carefully before committing. Set homeowner expectations about potential out-of-pocket costs.`,
    };
  }

  return {
    label: "FILE CLAIM",
    color: "#16a34a",
    explanation: `Policy is in good shape for this claim${claimType ? ` (${CLAIM_TYPE_LABELS[claimType] || claimType})` : ""}. No major barriers to recovery identified.`,
  };
}

export function ContractorReport({
  analysis,
  claimType,
}: {
  analysis: PolicyAnalysis;
  claimType: string | null;
}) {
  const policyScore = useMemo(
    () => calculatePolicyScore(analysis),
    [analysis]
  );

  // Filter landmines relevant to claim type
  const relevantLandmines = useMemo(() => {
    if (!claimType || !CLAIM_RELEVANCE[claimType]) return analysis.landmines || [];
    const keywords = CLAIM_RELEVANCE[claimType];
    return (analysis.landmines || []).filter((l) => {
      const text = `${l.name} ${l.category} ${l.impact}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    });
  }, [analysis.landmines, claimType]);

  const otherLandmines = useMemo(() => {
    if (!claimType || !CLAIM_RELEVANCE[claimType]) return [];
    const keywords = CLAIM_RELEVANCE[claimType];
    return (analysis.landmines || []).filter((l) => {
      const text = `${l.name} ${l.category} ${l.impact}`.toLowerCase();
      return !keywords.some((kw) => text.includes(kw));
    });
  }, [analysis.landmines, claimType]);

  const goNoGo = goNoGoRecommendation(policyScore, claimType, relevantLandmines);

  // Detect IRC / code upgrade coverage
  const coverageLabels = (analysis.coverages || []).map((c) =>
    `${c.section} ${c.label}`.toLowerCase()
  );
  const hasLawOrdinance = coverageLabels.some(
    (l) => (l.includes("law") && l.includes("ordinance")) || l.includes("code upgrade")
  );
  const hasExtendedReplacement = coverageLabels.some(
    (l) => l.includes("extended replacement")
  );

  // Wind/hail deductible
  const windHailDed = (analysis.deductibles || []).find((d) => {
    const text = `${d.type} ${d.appliesTo}`.toLowerCase();
    return text.includes("wind") || text.includes("hail");
  });

  const allOtherDed = (analysis.deductibles || []).find((d) => {
    const text = `${d.type} ${d.appliesTo}`.toLowerCase();
    return text.includes("all") || text.includes("other") || text.includes("general");
  });

  return (
    <div className="space-y-6">
      {/* ── GO / NO-GO RECOMMENDATION ───────────────────────── */}
      <div
        className="rounded-lg border-2 p-6"
        style={{ borderColor: goNoGo.color }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="rounded-full px-4 py-1 text-sm font-bold text-white"
            style={{ background: goNoGo.color }}
          >
            {goNoGo.label}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-3xl font-bold"
              style={{ color: gradeColor(policyScore.grade) }}
            >
              {policyScore.grade}
            </span>
            <span className="text-sm text-muted-foreground">
              {policyScore.score}/100
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{goNoGo.explanation}</p>
      </div>

      {/* ── CLAIM-RELEVANT LANDMINES ────────────────────────── */}
      {relevantLandmines.length > 0 && (
        <div className="rounded-lg border p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Landmines Affecting This Claim
            {claimType && (
              <Badge variant="outline">
                {CLAIM_TYPE_LABELS[claimType] || claimType}
              </Badge>
            )}
          </h3>
          <div className="space-y-3">
            {relevantLandmines.map((l, i) => (
              <div
                key={i}
                className="rounded-md border-l-4 border-red-500 bg-red-50 p-3 dark:bg-red-950/20"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{l.name}</span>
                  <Badge variant={l.severity === "critical" ? "destructive" : "secondary"}>
                    {l.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{l.impact}</p>
                {l.actionItem && (
                  <p className="text-sm font-medium mt-1 text-orange-700 dark:text-orange-400">
                    Action: {l.actionItem}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DEPRECIATION & RECOVERY ─────────────────────────── */}
      <div className="rounded-lg border p-5">
        <h3 className="font-semibold mb-3">Depreciation & Recovery</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Method
            </div>
            <div
              className="text-lg font-bold mt-1"
              style={{
                color:
                  analysis.depreciationMethod === "RCV"
                    ? "#16a34a"
                    : analysis.depreciationMethod === "ACV"
                      ? "#dc2626"
                      : undefined,
              }}
            >
              {analysis.depreciationMethod || "Unknown"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.depreciationMethod === "RCV"
                ? "Full replacement cost — no depreciation deductions"
                : analysis.depreciationMethod === "ACV"
                  ? "Payout reduced by depreciation — expect 40-60% less on older items"
                  : analysis.depreciationNotes || "Check policy for details"}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Recovery Potential
            </div>
            <div className="text-lg font-bold mt-1">
              {analysis.depreciationMethod === "RCV"
                ? "High"
                : analysis.depreciationMethod === "ACV"
                  ? "Limited"
                  : "Moderate"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.depreciationMethod === "RCV"
                ? "Contractor can recover full replacement value including labor and materials."
                : "Recovery will be net of depreciation. Set HO expectations accordingly."}
            </p>
          </div>
        </div>
      </div>

      {/* ── IRC / CODE UPGRADE POTENTIAL ────────────────────── */}
      <div className="rounded-lg border p-5">
        <h3 className="font-semibold mb-3">Code Upgrade & Supplement Potential</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
            <div>
              <div className="font-medium text-sm">Law & Ordinance Coverage</div>
              <p className="text-xs text-muted-foreground">
                Covers code-required upgrades (ice & water shield, drip edge, ventilation)
              </p>
            </div>
            <Badge variant={hasLawOrdinance ? "default" : "destructive"}>
              {hasLawOrdinance ? "Covered" : "Not Found"}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
            <div>
              <div className="font-medium text-sm">Extended Replacement Cost</div>
              <p className="text-xs text-muted-foreground">
                Additional coverage above dwelling limit
              </p>
            </div>
            <Badge variant={hasExtendedReplacement ? "default" : "secondary"}>
              {hasExtendedReplacement ? "Covered" : "Not Found"}
            </Badge>
          </div>
          {hasLawOrdinance && (
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              IRC code upgrades are supplementable — ice & water shield, drip edge,
              ventilation, and other code-required items can be itemized in a
              supplement.
            </p>
          )}
        </div>
      </div>

      {/* ── DEDUCTIBLE IMPACT ───────────────────────────────── */}
      <div className="rounded-lg border p-5">
        <h3 className="font-semibold mb-3">Deductible Impact</h3>
        <div className="grid grid-cols-2 gap-4">
          {windHailDed && (
            <div className="rounded-md bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Wind/Hail Deductible
              </div>
              <div className="text-lg font-bold mt-1">{windHailDed.amount}</div>
              {windHailDed.dollarAmount && (
                <p className="text-xs text-muted-foreground mt-1">
                  ${windHailDed.dollarAmount.toLocaleString()} out of pocket for HO
                </p>
              )}
            </div>
          )}
          {allOtherDed && (
            <div className="rounded-md bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                All Other Perils
              </div>
              <div className="text-lg font-bold mt-1">{allOtherDed.amount}</div>
              {allOtherDed.dollarAmount && (
                <p className="text-xs text-muted-foreground mt-1">
                  ${allOtherDed.dollarAmount.toLocaleString()} out of pocket
                </p>
              )}
            </div>
          )}
        </div>
        {(analysis.deductibles || []).length > 0 && (
          <div className="mt-3 space-y-2">
            {analysis.deductibles
              .filter((d) => d !== windHailDed && d !== allOtherDed)
              .map((d, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {d.type} ({d.appliesTo})
                  </span>
                  <span className="font-medium">{d.amount}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── OTHER LANDMINES ─────────────────────────────────── */}
      {otherLandmines.length > 0 && (
        <div className="rounded-lg border p-5">
          <h3 className="font-semibold mb-3">Other Policy Landmines</h3>
          <div className="space-y-2">
            {otherLandmines.map((l, i) => (
              <div key={i} className="rounded-md bg-muted/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{l.name}</span>
                  <Badge variant="secondary">{l.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{l.impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FAVORABLE PROVISIONS ────────────────────────────── */}
      {(analysis.favorableProvisions || []).length > 0 && (
        <div className="rounded-lg border p-5">
          <h3 className="font-semibold mb-3 text-green-700 dark:text-green-400">
            Favorable Provisions ({analysis.favorableProvisions.length})
          </h3>
          <div className="space-y-2">
            {analysis.favorableProvisions.map((p, i) => (
              <div key={i} className="rounded-md border-l-4 border-green-500 bg-green-50 p-3 dark:bg-green-950/20">
                <div className="font-medium text-sm">{p.name}</div>
                <p className="text-xs text-muted-foreground mt-1">{p.impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── COVERAGES ───────────────────────────────────────── */}
      {(analysis.coverages || []).length > 0 && (
        <div className="rounded-lg border p-5">
          <h3 className="font-semibold mb-3">Coverage Limits</h3>
          <div className="space-y-2">
            {analysis.coverages.map((c, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{c.label}</span>
                <span className="font-medium">{c.limit || "See policy"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EXCLUSIONS ──────────────────────────────────────── */}
      {(analysis.exclusions || []).length > 0 && (
        <div className="rounded-lg border p-5">
          <h3 className="font-semibold mb-3">
            Exclusions ({analysis.exclusions.length})
          </h3>
          <div className="space-y-2">
            {analysis.exclusions.map((ex, i) => (
              <div key={i} className="rounded-md bg-muted/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{ex.name}</span>
                  <Badge variant="secondary">{ex.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ex.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
