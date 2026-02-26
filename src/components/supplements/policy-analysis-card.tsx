"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  DollarSign,
  Ban,
  ScrollText,
  Info,
} from "lucide-react";
import { PolicyDisclaimer } from "./policy-disclaimer";

/* ─── Types (mirrors PolicyAnalysis from policy-parser.ts) ─── */

interface PolicyCoverage {
  section: string;
  label: string;
  limit: string | null;
  description: string;
}

interface PolicyDeductible {
  type: string;
  amount: string;
  dollarAmount: number | null;
  appliesTo: string;
}

interface PolicyExclusion {
  name: string;
  description: string;
  policyLanguage: string;
  severity: "critical" | "warning" | "info";
  impact: string;
}

interface PolicyEndorsement {
  name: string;
  number: string | null;
  effectiveDate: string | null;
  description: string;
  impact: string;
  severity: "critical" | "warning" | "info";
}

interface DetectedLandmine {
  ruleId: string;
  name: string;
  severity: "critical" | "warning" | "info";
  category: string;
  policyLanguage: string;
  impact: string;
  actionItem: string;
}

interface DetectedFavorable {
  provisionId: string;
  name: string;
  policyLanguage: string;
  impact: string;
  supplementRelevance: string;
}

interface PolicyAnalysisData {
  policyType: string;
  carrier: string;
  policyNumber: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  namedInsured: string;
  propertyAddress: string;
  coverages: PolicyCoverage[];
  deductibles: PolicyDeductible[];
  depreciationMethod: string;
  depreciationNotes: string;
  exclusions: PolicyExclusion[];
  endorsements: PolicyEndorsement[];
  landmines: DetectedLandmine[];
  favorableProvisions: DetectedFavorable[];
  summaryForContractor: string;
  riskLevel: string;
  confidence: number;
  parseNotes: string;
}

/* ─── Component ─── */

export function PolicyAnalysisCard({
  analysis,
}: {
  analysis: PolicyAnalysisData;
}) {
  const [expanded, setExpanded] = useState(false);

  const criticalLandmines = analysis.landmines.filter(
    (l) => l.severity === "critical"
  );
  const warningLandmines = analysis.landmines.filter(
    (l) => l.severity === "warning"
  );

  const riskConfig = {
    high: {
      label: "HIGH RISK",
      badgeClass: "bg-red-600 text-white hover:bg-red-600",
      iconColor: "text-red-500",
      Icon: ShieldAlert,
    },
    medium: {
      label: "MEDIUM RISK",
      badgeClass: "bg-amber-500 text-white hover:bg-amber-500",
      iconColor: "text-amber-500",
      Icon: Shield,
    },
    low: {
      label: "LOW RISK",
      badgeClass: "bg-green-600 text-white hover:bg-green-600",
      iconColor: "text-green-500",
      Icon: ShieldCheck,
    },
  }[analysis.riskLevel] || {
    label: analysis.riskLevel.toUpperCase(),
    badgeClass: "bg-gray-200 text-gray-700 hover:bg-gray-200",
    iconColor: "text-gray-500",
    Icon: Shield,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <riskConfig.Icon className={`h-5 w-5 ${riskConfig.iconColor}`} />
            Policy Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={riskConfig.badgeClass}>{riskConfig.label}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {expanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick info strip */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickStat label="Policy Type" value={analysis.policyType || "—"} />
          <QuickStat label="Carrier" value={analysis.carrier || "—"} />
          <QuickStat
            label="Depreciation"
            value={analysis.depreciationMethod || "—"}
          />
          <QuickStat
            label="Deductible"
            value={analysis.deductibles[0]?.amount || "—"}
          />
        </div>

        {/* Contractor summary */}
        {analysis.summaryForContractor && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700 mb-1">Contractor Summary</p>
            <p className="text-slate-600">{analysis.summaryForContractor}</p>
          </div>
        )}

        {/* Landmines — always visible */}
        {(criticalLandmines.length > 0 || warningLandmines.length > 0) && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Policy Landmines ({analysis.landmines.length})
            </h4>
            <div className="space-y-2">
              {criticalLandmines.map((l, i) => (
                <LandmineRow key={i} landmine={l} />
              ))}
              {warningLandmines.map((l, i) => (
                <LandmineRow key={`w-${i}`} landmine={l} />
              ))}
            </div>
          </div>
        )}

        {/* Interactions — when landmines and favorable provisions relate to each other */}
        {(() => {
          const interactions = findPolicyInteractions(
            analysis.landmines,
            analysis.favorableProvisions,
            analysis.coverages
          );
          if (interactions.length === 0) return null;
          return (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Info className="h-4 w-4 text-blue-500" />
                What This Means Together
              </h4>
              <div className="space-y-2">
                {interactions.map((interaction, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"
                  >
                    <p className="font-medium text-blue-900">
                      {interaction.title}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {interaction.explanation}
                    </p>
                    {interaction.limit && (
                      <p className="text-xs font-medium text-blue-800 mt-1.5">
                        Coverage Limit: {interaction.limit}
                      </p>
                    )}
                    <p className="text-xs text-blue-600 mt-1.5 italic">
                      {interaction.bottomLine}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Favorable provisions — always visible */}
        {analysis.favorableProvisions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Favorable Provisions ({analysis.favorableProvisions.length})
            </h4>
            <div className="space-y-2">
              {analysis.favorableProvisions.map((p, i) => (
                <FavorableRow key={i} provision={p} />
              ))}
            </div>
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <>
            <Separator />

            {/* Coverages */}
            {analysis.coverages.length > 0 && (
              <Section
                icon={<DollarSign className="h-4 w-4 text-blue-500" />}
                title="Coverage Sections"
              >
                <div className="space-y-2">
                  {analysis.coverages.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-4 text-sm"
                    >
                      <div>
                        <p className="font-medium">{c.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.description}
                        </p>
                      </div>
                      {c.limit && (
                        <span className="shrink-0 font-semibold text-green-700">
                          {c.limit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Deductibles */}
            {analysis.deductibles.length > 0 && (
              <Section
                icon={<DollarSign className="h-4 w-4 text-amber-500" />}
                title="Deductibles"
              >
                <div className="space-y-2">
                  {analysis.deductibles.map((d, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{d.amount}</span>
                        <span className="text-xs text-muted-foreground">
                          ({d.type})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Applies to: {d.appliesTo}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Depreciation */}
            <Section
              icon={<FileText className="h-4 w-4 text-purple-500" />}
              title="Depreciation Method"
            >
              <div className="text-sm">
                <Badge
                  variant="outline"
                  className={
                    analysis.depreciationMethod === "RCV"
                      ? "border-green-300 text-green-700"
                      : analysis.depreciationMethod === "ACV"
                        ? "border-red-300 text-red-700"
                        : ""
                  }
                >
                  {analysis.depreciationMethod}
                </Badge>
                {analysis.depreciationNotes && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {analysis.depreciationNotes}
                  </p>
                )}
              </div>
            </Section>

            {/* Exclusions */}
            {analysis.exclusions.length > 0 && (
              <Section
                icon={<Ban className="h-4 w-4 text-red-500" />}
                title={`Exclusions (${analysis.exclusions.length})`}
              >
                <div className="space-y-3">
                  {analysis.exclusions.map((ex, i) => (
                    <div key={i} className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ex.name}</span>
                        <SeverityBadge severity={ex.severity} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ex.description}
                      </p>
                      {ex.policyLanguage && (
                        <blockquote className="border-l-2 border-slate-300 pl-3 text-xs italic text-slate-500">
                          &ldquo;{ex.policyLanguage}&rdquo;
                        </blockquote>
                      )}
                      <p className="text-xs font-medium text-red-700">
                        Impact: {ex.impact}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Endorsements */}
            {analysis.endorsements.length > 0 && (
              <Section
                icon={<ScrollText className="h-4 w-4 text-orange-500" />}
                title={`Endorsements (${analysis.endorsements.length})`}
              >
                <div className="space-y-3">
                  {analysis.endorsements.map((en, i) => (
                    <div key={i} className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{en.name}</span>
                        {en.number && (
                          <span className="text-xs text-muted-foreground">
                            ({en.number})
                          </span>
                        )}
                        <SeverityBadge severity={en.severity} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {en.description}
                      </p>
                      <p className="text-xs font-medium">{en.impact}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Policy details */}
            <Section
              icon={<FileText className="h-4 w-4 text-slate-500" />}
              title="Policy Details"
            >
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <DetailRow label="Policy #" value={analysis.policyNumber} />
                <DetailRow label="Named Insured" value={analysis.namedInsured} />
                <DetailRow
                  label="Property Address"
                  value={analysis.propertyAddress}
                />
                <DetailRow
                  label="Effective"
                  value={analysis.effectiveDate || "—"}
                />
                <DetailRow
                  label="Expiration"
                  value={analysis.expirationDate || "—"}
                />
                <DetailRow
                  label="Confidence"
                  value={`${Math.round(analysis.confidence * 100)}%`}
                />
              </div>
              {analysis.parseNotes && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {analysis.parseNotes}
                </p>
              )}
            </Section>
          </>
        )}

        <PolicyDisclaimer />
      </CardContent>
    </Card>
  );
}

/* ─── Sub-components ─── */

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function LandmineRow({ landmine }: { landmine: DetectedLandmine }) {
  const [open, setOpen] = useState(false);
  const isCritical = landmine.severity === "critical";

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        isCritical
          ? "border-red-200 bg-red-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              isCritical ? "text-red-600" : "text-amber-600"
            }`}
          />
          <div>
            <span className="font-medium">{landmine.name}</span>
            <p
              className={`text-xs ${
                isCritical ? "text-red-700" : "text-amber-700"
              }`}
            >
              {landmine.impact}
            </p>
          </div>
        </div>
        <SeverityBadge severity={landmine.severity} />
      </button>

      {open && (
        <div className="mt-2 space-y-2 pl-6">
          {landmine.policyLanguage && (
            <blockquote className="border-l-2 border-slate-300 pl-3 text-xs italic text-slate-500">
              &ldquo;{landmine.policyLanguage}&rdquo;
            </blockquote>
          )}
          {landmine.actionItem && (
            <p className="text-xs font-medium">
              <span className="text-slate-500">Action:</span>{" "}
              {landmine.actionItem}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FavorableRow({ provision }: { provision: DetectedFavorable }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setOpen(!open)}
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        <div>
          <span className="font-medium">{provision.name}</span>
          <p className="text-xs text-green-700">{provision.impact}</p>
        </div>
      </button>

      {open && (
        <div className="mt-2 space-y-2 pl-6">
          {provision.policyLanguage && (
            <blockquote className="border-l-2 border-green-300 pl-3 text-xs italic text-green-600">
              &ldquo;{provision.policyLanguage}&rdquo;
            </blockquote>
          )}
          {provision.supplementRelevance && (
            <p className="text-xs font-medium">
              <span className="text-slate-500">Supplement relevance:</span>{" "}
              {provision.supplementRelevance}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-1.5">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: "critical" | "warning" | "info";
}) {
  const config = {
    critical: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  }[severity];

  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 ${config}`}
    >
      {severity}
    </Badge>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}

/* ─── Policy Interaction Detection ─── */

interface PolicyInteraction {
  title: string;
  explanation: string;
  limit: string | null;
  bottomLine: string;
}

/**
 * Detects when landmines and favorable provisions relate to the same coverage
 * area and generates plain-English explanations of how they interact.
 *
 * Example: "Ordinance or Law Exclusion" (landmine) + "Building Code Credit"
 * (favorable) = the base policy excludes code upgrade costs, but an endorsement
 * adds limited coverage back — with a specific dollar or percentage limit.
 */
function findPolicyInteractions(
  landmines: DetectedLandmine[],
  favorables: DetectedFavorable[],
  coverages: PolicyCoverage[]
): PolicyInteraction[] {
  const interactions: PolicyInteraction[] = [];

  // ── Ordinance/Law Exclusion + Building Code Coverage ──
  const olLandmine = landmines.find((l) => {
    const n = l.name.toLowerCase();
    return n.includes("ordinance") || n.includes("law") || n.includes("code");
  });
  const codeFavorable = favorables.find((f) => {
    const n = f.name.toLowerCase();
    return (
      n.includes("building code") ||
      n.includes("code coverage") ||
      n.includes("ordinance") ||
      n.includes("law coverage")
    );
  });

  if (olLandmine && codeFavorable) {
    // Look for a coverage limit related to ordinance/law or building code
    const codeLimit = coverages.find((c) => {
      const label = c.label.toLowerCase();
      return (
        label.includes("ordinance") ||
        label.includes("law") ||
        label.includes("code") ||
        label.includes("increased cost")
      );
    });

    interactions.push({
      title: "Ordinance/Law Exclusion vs. Building Code Credit",
      explanation:
        "The base policy excludes costs related to building code upgrades " +
        "(the \"Ordinance or Law\" exclusion). However, this policy also includes " +
        "a Building Code endorsement that adds limited coverage back for code-required " +
        "upgrades. The exclusion and the endorsement are NOT contradictory — the exclusion " +
        "sets the default (no code coverage), and the endorsement carves out an exception " +
        "with a specific limit.",
      limit: codeLimit?.limit || null,
      bottomLine: codeLimit?.limit
        ? `Code upgrade costs are covered up to ${codeLimit.limit}. Any costs beyond that limit are excluded.`
        : "Code upgrade costs may be partially covered — check the endorsement for the specific dollar or percentage limit.",
    });
  }

  // ── ACV/Depreciation concern + RCV endorsement ──
  const depLandmine = landmines.find((l) => {
    const n = l.name.toLowerCase();
    return (
      n.includes("depreci") ||
      n.includes("actual cash value") ||
      n.includes("acv")
    );
  });
  const rcvFavorable = favorables.find((f) => {
    const n = f.name.toLowerCase();
    return (
      n.includes("replacement cost") ||
      n.includes("rcv") ||
      n.includes("full replacement")
    );
  });

  if (depLandmine && rcvFavorable) {
    interactions.push({
      title: "Depreciation Concern vs. Replacement Cost Coverage",
      explanation:
        "While a depreciation-related concern was flagged, this policy also includes " +
        "replacement cost value (RCV) coverage. This means the carrier will pay the full " +
        "replacement cost, though depreciation may be withheld initially until repairs are " +
        "completed (recoverable depreciation).",
      limit: null,
      bottomLine:
        "Depreciation should be recoverable — the carrier pays ACV upfront, " +
        "then releases the held depreciation once repairs are completed and documented.",
    });
  }

  // ── Cosmetic damage exclusion + favorable cosmetic provision ──
  const cosmeticLandmine = landmines.find((l) => {
    const n = l.name.toLowerCase();
    return n.includes("cosmetic") || n.includes("matching");
  });
  const cosmeticFavorable = favorables.find((f) => {
    const n = f.name.toLowerCase();
    return n.includes("cosmetic") || n.includes("matching");
  });

  if (cosmeticLandmine && cosmeticFavorable) {
    interactions.push({
      title: "Cosmetic Exclusion vs. Matching Requirement",
      explanation:
        "The policy has language that may limit cosmetic damage coverage, " +
        "but also includes a provision supporting matching or uniformity requirements. " +
        "The matching provision may require replacement of undamaged materials to maintain " +
        "a uniform appearance, even if the cosmetic exclusion applies to surface-level damage.",
      limit: null,
      bottomLine:
        "Cosmetic-only damage may be excluded, but if the damaged area cannot " +
        "reasonably match the undamaged area, the matching provision may require broader replacement.",
    });
  }

  // ── Wind/Hail deductible warning + wind/hail coverage ──
  const windHailLandmine = landmines.find((l) => {
    const n = l.name.toLowerCase();
    return (
      (n.includes("wind") || n.includes("hail") || n.includes("storm")) &&
      (n.includes("deductible") || n.includes("exclusion") || n.includes("sublimit"))
    );
  });
  const windHailFavorable = favorables.find((f) => {
    const n = f.name.toLowerCase();
    return n.includes("wind") || n.includes("hail") || n.includes("storm");
  });

  if (windHailLandmine && windHailFavorable) {
    interactions.push({
      title: "Wind/Hail Deductible vs. Wind/Hail Coverage",
      explanation:
        "This policy has a separate wind/hail deductible (often higher than the " +
        "standard deductible — typically 1-5% of Coverage A). While wind/hail damage " +
        "IS covered, the out-of-pocket deductible amount may be significantly higher " +
        "than what the homeowner expects.",
      limit: null,
      bottomLine:
        "Wind/hail damage is covered, but check the deductible amount carefully — " +
        "a percentage-based deductible on a $400K dwelling could mean a $4,000-$20,000 out-of-pocket cost.",
    });
  }

  return interactions;
}
