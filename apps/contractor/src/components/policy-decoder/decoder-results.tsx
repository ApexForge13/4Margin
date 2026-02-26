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
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  DollarSign,
  Ban,
  ScrollText,
  Info,
} from "lucide-react";

/* ─── Types ─── */

interface PolicyAnalysisData {
  policyType: string;
  carrier: string;
  policyNumber: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  namedInsured: string;
  propertyAddress: string;
  coverages: Array<{
    section: string;
    label: string;
    limit: string | null;
    description: string;
  }>;
  deductibles: Array<{
    type: string;
    amount: string;
    dollarAmount: number | null;
    appliesTo: string;
    needsVerification?: boolean;
    verificationReason?: string | null;
  }>;
  depreciationMethod: string;
  depreciationNotes: string;
  exclusions: Array<{
    name: string;
    description: string;
    policyLanguage: string;
    severity: "critical" | "warning" | "info";
    impact: string;
    needsVerification?: boolean;
    verificationReason?: string | null;
  }>;
  endorsements: Array<{
    name: string;
    number: string | null;
    effectiveDate: string | null;
    description: string;
    impact: string;
    severity: "critical" | "warning" | "info";
    needsVerification?: boolean;
    verificationReason?: string | null;
  }>;
  landmines: Array<{
    ruleId: string;
    name: string;
    severity: "critical" | "warning" | "info";
    category: string;
    policyLanguage: string;
    impact: string;
    actionItem: string;
  }>;
  favorableProvisions: Array<{
    provisionId: string;
    name: string;
    policyLanguage: string;
    impact: string;
    supplementRelevance: string;
  }>;
  summaryForContractor: string;
  riskLevel: string;
  confidence: number;
  parseNotes: string;
  documentType?: string;
  scanQuality?: string;
  missingDocumentWarning?: string | null;
  sectionConfidence?: {
    policyMeta: number;
    coverages: number;
    deductibles: number;
    depreciation: number;
    exclusions: number;
    endorsements: number;
  };
  endorsementFormNumbers?: string[];
}

/* ─── Component ─── */

export function PolicyDecoderResults({
  analysis: raw,
  documentMeta,
}: {
  analysis: Record<string, unknown>;
  documentMeta: Record<string, unknown> | null;
}) {
  const analysis = raw as unknown as PolicyAnalysisData;

  const criticalLandmines =
    analysis.landmines?.filter((l) => l.severity === "critical") || [];
  const warningLandmines =
    analysis.landmines?.filter((l) => l.severity === "warning") || [];

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
    label: (analysis.riskLevel || "UNKNOWN").toUpperCase(),
    badgeClass: "bg-gray-200 text-gray-700 hover:bg-gray-200",
    iconColor: "text-gray-500",
    Icon: Shield,
  };

  const docType = analysis.documentType || (documentMeta?.documentType as string);
  const scanQuality = analysis.scanQuality || (documentMeta?.scanQuality as string);
  const isDecPage = docType === "dec_page_only";
  const isPoorScan = scanQuality === "poor";

  return (
    <div className="space-y-6">
      {/* Document warnings */}
      {isDecPage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Declarations Page Only</p>
            <p className="text-xs mt-0.5">
              This appears to be a declarations page, not the full policy.
              Endorsement and exclusion analysis may be limited. For complete
              analysis, upload the full policy document.
            </p>
          </div>
        </div>
      )}

      {isPoorScan && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Poor Scan Quality</p>
            <p className="text-xs mt-0.5">
              The document appears to be a low-quality scan. Some text may not
              have been read correctly. Results should be verified against the
              original document.
            </p>
          </div>
        </div>
      )}

      {/* Risk overview card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <riskConfig.Icon
                className={`h-5 w-5 ${riskConfig.iconColor}`}
              />
              Policy Analysis
            </CardTitle>
            <Badge className={riskConfig.badgeClass}>{riskConfig.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickStat
              label="Policy Type"
              value={analysis.policyType || "—"}
              confidence={analysis.sectionConfidence?.policyMeta}
            />
            <QuickStat
              label="Carrier"
              value={analysis.carrier || "—"}
            />
            <QuickStat
              label="Depreciation"
              value={analysis.depreciationMethod || "—"}
              confidence={analysis.sectionConfidence?.depreciation}
            />
            <QuickStat
              label="Deductible"
              value={analysis.deductibles?.[0]?.amount || "—"}
              confidence={analysis.sectionConfidence?.deductibles}
            />
          </div>

          {/* Contractor summary */}
          {analysis.summaryForContractor && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700 mb-1">Summary</p>
              <p className="text-slate-600">{analysis.summaryForContractor}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Landmines */}
      {(criticalLandmines.length > 0 || warningLandmines.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Policy Landmines ({analysis.landmines.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalLandmines.map((l, i) => (
              <LandmineRow key={i} landmine={l} />
            ))}
            {warningLandmines.map((l, i) => (
              <LandmineRow key={`w-${i}`} landmine={l} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Favorable provisions */}
      {analysis.favorableProvisions && analysis.favorableProvisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Favorable Provisions ({analysis.favorableProvisions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.favorableProvisions.map((p, i) => (
              <FavorableRow key={i} provision={p} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Coverages */}
      {analysis.coverages && analysis.coverages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              Coverage Sections
              <ConfidenceDot value={analysis.sectionConfidence?.coverages} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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
          </CardContent>
        </Card>
      )}

      {/* Deductibles */}
      {analysis.deductibles && analysis.deductibles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-500" />
              Deductibles
              <ConfidenceDot value={analysis.sectionConfidence?.deductibles} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.deductibles.map((d, i) => (
                <div key={i} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{d.amount}</span>
                    {d.dollarAmount && d.amount.includes("%") && (
                      <span className="text-xs text-green-700 font-medium">
                        (${d.dollarAmount.toLocaleString()})
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      ({d.type})
                    </span>
                    {d.needsVerification && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-amber-200 text-amber-600"
                      >
                        verify
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Applies to: {d.appliesTo}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Depreciation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            Depreciation Method
            <ConfidenceDot value={analysis.sectionConfidence?.depreciation} />
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {analysis.depreciationMethod || "Unknown"}
            </Badge>
            {analysis.depreciationNotes && (
              <p className="mt-2 text-xs text-muted-foreground">
                {analysis.depreciationNotes}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exclusions */}
      {analysis.exclusions && analysis.exclusions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              Exclusions ({analysis.exclusions.length})
              <ConfidenceDot value={analysis.sectionConfidence?.exclusions} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.exclusions.map((ex, i) => (
                <div key={i} className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ex.name}</span>
                    <SeverityBadge severity={ex.severity} />
                    {ex.needsVerification && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-amber-200 text-amber-600"
                      >
                        verify
                      </Badge>
                    )}
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
          </CardContent>
        </Card>
      )}

      {/* Endorsements */}
      {analysis.endorsements && analysis.endorsements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-orange-500" />
              Endorsements ({analysis.endorsements.length})
              <ConfidenceDot value={analysis.sectionConfidence?.endorsements} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                    {en.needsVerification && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-amber-200 text-amber-600"
                      >
                        verify
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {en.description}
                  </p>
                  <p className="text-xs font-medium">{en.impact}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policy Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-500" />
            Policy Details
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              label="Overall Confidence"
              value={`${Math.round((analysis.confidence || 0) * 100)}%`}
            />
            {docType && (
              <DetailRow label="Document Type" value={docType.replace(/_/g, " ")} />
            )}
            {scanQuality && (
              <DetailRow label="Scan Quality" value={scanQuality} />
            )}
          </div>
          {analysis.parseNotes && (
            <p className="mt-2 text-xs text-muted-foreground">
              {analysis.parseNotes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="rounded-lg bg-slate-50 p-4 text-xs text-muted-foreground">
        <p className="font-medium mb-1">Disclaimer</p>
        <p>
          This analysis is generated by AI for educational and informational
          purposes only. It does not constitute legal, insurance, or
          professional advice. Always consult with a licensed insurance
          professional for policy interpretation.
        </p>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function QuickStat({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string;
  confidence?: number;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        {confidence !== undefined && <ConfidenceDot value={confidence} />}
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function ConfidenceDot({ value }: { value?: number }) {
  if (value === undefined) return null;
  const color =
    value >= 0.85
      ? "bg-green-500"
      : value >= 0.6
        ? "bg-amber-500"
        : "bg-red-500";
  const label =
    value >= 0.85
      ? "High confidence"
      : value >= 0.6
        ? "Medium confidence"
        : "Low confidence";
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color}`}
      title={`${label} (${Math.round(value * 100)}%)`}
    />
  );
}

function LandmineRow({
  landmine,
}: {
  landmine: PolicyAnalysisData["landmines"][number];
}) {
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

function FavorableRow({
  provision,
}: {
  provision: PolicyAnalysisData["favorableProvisions"][number];
}) {
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
              <span className="text-slate-500">Relevance:</span>{" "}
              {provision.supplementRelevance}
            </p>
          )}
        </div>
      )}
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
