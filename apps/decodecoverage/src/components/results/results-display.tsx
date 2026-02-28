"use client";

import { useState, useMemo } from "react";
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
  Download,
  Mail,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { calculatePolicyScore, type PolicyScore } from "@/lib/policy-score";
import { SwitchCta } from "./switch-cta";

interface PolicyAnalysis {
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
  }>;
  depreciationMethod: string;
  depreciationNotes: string;
  exclusions: Array<{
    name: string;
    severity: string;
    description: string;
    impact: string;
  }>;
  endorsements: Array<{
    name: string;
    number: string | null;
    severity: string;
    description: string;
    impact: string;
  }>;
  landmines: Array<{
    name: string;
    severity: string;
    category: string;
    policyLanguage: string[];
    impact: string;
    actionItem: string;
  }>;
  favorableProvisions: Array<{
    name: string;
    impact: string;
    policyLanguage: string[];
  }>;
  summaryForContractor: string;
  riskLevel: string;
  confidence: number;
}

interface ResultsDisplayProps {
  id: string;
  firstName: string;
  analysis: PolicyAnalysis;
  documentMeta: {
    documentType: string;
    scanQuality: string;
  } | null;
  consentContact: boolean;
  context?: "organic" | "contractor-check";
  companyName?: string;
  downloadUrl?: string;
}

export function ResultsDisplay({
  id,
  firstName,
  analysis,
  documentMeta,
  consentContact,
  context = "organic",
  companyName,
  downloadUrl,
}: ResultsDisplayProps) {
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const policyScore = useMemo(() => calculatePolicyScore(analysis), [analysis]);

  const riskClass =
    analysis.riskLevel === "high"
      ? "risk-high"
      : analysis.riskLevel === "medium"
        ? "risk-medium"
        : "risk-low";

  const riskIcon =
    analysis.riskLevel === "high" ? (
      <ShieldAlert size={18} />
    ) : analysis.riskLevel === "medium" ? (
      <Shield size={18} />
    ) : (
      <ShieldCheck size={18} />
    );

  const handleDownload = () => {
    const url = downloadUrl || `/api/report/${id}/download`;
    window.open(url, "_blank");
  };

  const handleEmail = async () => {
    setEmailSending(true);
    try {
      const res = await fetch(`/api/report/${id}/email`, { method: "POST" });
      if (res.ok) {
        setEmailSent(true);
      }
    } catch {
      alert("Failed to send email. Please try downloading instead.");
    } finally {
      setEmailSending(false);
    }
  };

  const depLabel =
    analysis.depreciationMethod === "RCV"
      ? "Replacement Cost Value (RCV)"
      : analysis.depreciationMethod === "ACV"
        ? "Actual Cash Value (ACV)"
        : analysis.depreciationMethod || "Unknown";

  const depExplanation =
    analysis.depreciationMethod === "RCV"
      ? "Your policy pays the full cost to replace damaged items with new ones of similar kind and quality — no deduction for age or wear."
      : analysis.depreciationMethod === "ACV"
        ? "Your policy deducts for depreciation (wear and tear), meaning your payout will be less than the cost of a brand-new replacement."
        : null;

  // Build a risk explanation from landmines
  const highSeverityLandmines = analysis.landmines?.filter(
    (l) => l.severity === "high" || l.severity === "critical"
  ) || [];
  const riskExplanation = buildRiskExplanation(analysis, highSeverityLandmines);

  return (
    <>
      <nav>
        <div className="nav-inner">
          <a href="/" className="logo">
            Decode<span>Coverage</span>
          </a>
        </div>
      </nav>

      <div className="results-page">
        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 1: OVERVIEW                        */}
        {/* ═══════════════════════════════════════════ */}

        <div className="results-header">
          <h1>
            {firstName ? `${firstName}'s` : "Your"} Policy Overview
          </h1>
          <p>
            {analysis.carrier} &middot; {analysis.policyType || "Homeowners"}
            {analysis.policyNumber ? ` · #${analysis.policyNumber}` : ""}
          </p>
        </div>

        {/* Risk Badge */}
        <div style={{ marginBottom: 16 }}>
          <span className={`risk-badge ${riskClass}`}>
            {riskIcon}
            {analysis.riskLevel?.toUpperCase()} RISK
          </span>
        </div>

        {/* Overview summary text */}
        <div className="result-card">
          <h2>
            <FileText size={22} />
            Overview
          </h2>

          {/* General summary */}
          {analysis.summaryForContractor && (
            <div className="result-item">
              <p style={{ fontSize: 15, lineHeight: 1.7 }}>
                {analysis.summaryForContractor}
              </p>
            </div>
          )}

          {/* Risk explanation with key concerns */}
          {riskExplanation && (
            <div className="result-item">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={16} style={{ color: analysis.riskLevel === "low" ? "var(--accent)" : "#DC2626" }} />
                Why this risk level?
              </h3>
              <p style={{ lineHeight: 1.7 }}>{riskExplanation}</p>
              {highSeverityLandmines.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>
                    Key concerns:
                  </p>
                  {highSeverityLandmines.map((l, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: "rgba(220, 38, 38, 0.05)", borderRadius: 8, marginBottom: 6, borderLeft: "3px solid #DC2626" }}>
                      <strong>{l.name}</strong>
                      <span className={`severity-badge severity-${l.severity}`} style={{ marginLeft: 8 }}>{l.severity}</span>
                      <p style={{ margin: "4px 0 0", fontSize: 13 }}>{l.impact}</p>
                      {l.actionItem && (
                        <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                          What you can do: {l.actionItem}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deductibles */}
          {analysis.deductibles?.length > 0 && (
            <div className="result-item">
              <h3>
                <DollarSign size={16} />
                Your Deductibles
              </h3>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {analysis.deductibles.map((d, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--surface)", borderRadius: 8 }}>
                    <div>
                      <strong>{d.type}</strong>
                      <span style={{ color: "var(--text-muted)", fontSize: 13, marginLeft: 8 }}>
                        applies to {d.appliesTo}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "var(--heading)" }}>
                      {d.amount}
                      {d.dollarAmount && d.amount.includes("%") && (
                        <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 13 }}>
                          {" "}(${d.dollarAmount.toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Depreciation */}
          <div className="result-item">
            <h3>
              <Info size={16} />
              Depreciation Model
            </h3>
            <div style={{ padding: "12px 16px", background: "var(--surface)", borderRadius: 8, marginTop: 8 }}>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: analysis.depreciationMethod === "RCV" ? "var(--accent)" : analysis.depreciationMethod === "ACV" ? "#DC2626" : undefined,
              }}>
                {depLabel}
              </div>
              {depExplanation && (
                <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>
                  {depExplanation}
                </p>
              )}
              {analysis.depreciationNotes && (
                <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6 }}>
                  {analysis.depreciationNotes}
                </p>
              )}
            </div>
          </div>

          {/* Policy Details */}
          <div className="result-item">
            <h3>
              <ScrollText size={16} />
              Policy Details
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
              {[
                ["Policy #", analysis.policyNumber],
                ["Named Insured", analysis.namedInsured],
                ["Property", analysis.propertyAddress],
                ["Policy Type", analysis.policyType],
                ["Effective", analysis.effectiveDate],
                ["Expiration", analysis.expirationDate],
              ]
                .filter(([, v]) => v)
                .map(([label, value], i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "var(--surface)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                      {value}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* POLICY HEALTH SCORE                        */}
        {/* ═══════════════════════════════════════════ */}
        <PolicyScoreCard score={policyScore} />

        {/* Switch CTA — only for organic flow, if score is poor AND user hasn't already opted in */}
        {context === "organic" && policyScore.shouldSwitch && !consentContact && (
          <SwitchCta leadId={id} score={policyScore} />
        )}

        {/* Contractor check banner */}
        {context === "contractor-check" && companyName && (
          <div style={{
            textAlign: "center",
            padding: "12px 20px",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
            color: "var(--text-secondary)",
          }}>
            This analysis was requested by <strong>{companyName}</strong>
          </div>
        )}

        {/* Action Buttons */}
        <div className="results-actions">
          <button className="btn btn-primary" onClick={handleDownload}>
            <Download size={16} />
            Download PDF Report
          </button>
          {context === "organic" && (
            <button
              className="btn btn-primary"
              onClick={handleEmail}
              disabled={emailSending || emailSent}
              style={{
                background: emailSent ? "var(--accent-light)" : undefined,
                color: emailSent ? "var(--accent)" : undefined,
              }}
            >
              {emailSent ? (
                <>
                  <CheckCircle2 size={16} />
                  Sent!
                </>
              ) : emailSending ? (
                <>
                  <span className="spinner" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Email Me This Report
                </>
              )}
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 2: YOUR COVERAGE                   */}
        {/* ═══════════════════════════════════════════ */}

        {analysis.coverages?.length > 0 && (
          <div className="result-card">
            <h2>
              <Shield size={22} style={{ color: "var(--accent)" }} />
              Your Coverage
            </h2>
            {analysis.coverages.map((c, i) => (
              <div className="result-item" key={i}>
                <h3>
                  {c.label}
                  {c.limit && (
                    <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>
                      {c.limit}
                    </span>
                  )}
                </h3>
                <p>{c.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 3: COVERAGE STRENGTHS              */}
        {/* ═══════════════════════════════════════════ */}

        {analysis.favorableProvisions?.length > 0 && (
          <div className="result-card">
            <h2>
              <CheckCircle2 size={22} style={{ color: "var(--accent)" }} />
              Coverage Strengths ({analysis.favorableProvisions.length})
            </h2>
            {analysis.favorableProvisions.map((p, i) => (
              <div className="result-item" key={i}>
                <h3>
                  <ShieldCheck size={16} style={{ color: "var(--accent)" }} />
                  {p.name}
                </h3>
                <p>{p.impact}</p>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 4: POLICY ADD-ONS                  */}
        {/* ═══════════════════════════════════════════ */}

        {analysis.endorsements?.length > 0 && (
          <div className="result-card">
            <h2>
              <ScrollText size={22} />
              Policy Add-Ons ({analysis.endorsements.length})
            </h2>
            {analysis.endorsements.map((en, i) => (
              <div className="result-item" key={i}>
                <h3>
                  {en.name}
                  {en.number && (
                    <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 13 }}>
                      {" "}({en.number})
                    </span>
                  )}
                  <span className={`severity-badge severity-${en.severity}`}>
                    {en.severity}
                  </span>
                </h3>
                <p>{en.description}</p>
                {en.impact && (
                  <p style={{ marginTop: 6, fontWeight: 500, fontSize: 13 }}>
                    {en.impact}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 5: WHAT'S NOT COVERED              */}
        {/* ═══════════════════════════════════════════ */}

        {analysis.exclusions?.length > 0 && (
          <div className="result-card">
            <h2>
              <Ban size={22} style={{ color: "#DC2626" }} />
              What&apos;s NOT Covered ({analysis.exclusions.length})
            </h2>
            {analysis.exclusions.map((ex, i) => (
              <div className="result-item" key={i}>
                <h3>
                  {ex.name}
                  <span className={`severity-badge severity-${ex.severity}`}>
                    {ex.severity}
                  </span>
                </h3>
                <p>{ex.description}</p>
                {ex.impact && (
                  <p style={{ marginTop: 6, color: "#DC2626", fontWeight: 500, fontSize: 13 }}>
                    Impact: {ex.impact}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="disclaimer-box">
          <h4>Disclaimer</h4>
          <p>
            This analysis is generated by AI for educational and informational
            purposes only. It does not constitute legal, insurance, or
            professional advice. Always consult with a licensed insurance
            professional before making coverage decisions. Results may not
            reflect all policy provisions.
          </p>
        </div>

        {/* Powered by */}
        <div className="powered-by">
          Powered by{" "}
          <a href="https://4margin.com" target="_blank" rel="noopener">
            4Margin
          </a>
        </div>
      </div>
    </>
  );
}

/* ── Policy Score Card ──────────────────────────────────────────── */

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "var(--accent)";
    case "B": return "#2563EB";
    case "C": return "var(--warning)";
    case "D": return "#EA580C";
    case "F": return "#DC2626";
    default: return "var(--text-primary)";
  }
}

function gradeBg(grade: string): string {
  switch (grade) {
    case "A": return "var(--accent-light)";
    case "B": return "#EFF6FF";
    case "C": return "var(--warning-light)";
    case "D": return "#FFF7ED";
    case "F": return "#FEE2E2";
    default: return "var(--bg)";
  }
}

function PolicyScoreCard({ score }: { score: PolicyScore }) {
  // Show top 3 factors (mix of positive and negative)
  const topFactors = score.factors.slice(0, 5);

  return (
    <div className="result-card" style={{ position: "relative", overflow: "hidden" }}>
      {/* Background grade watermark */}
      <div style={{
        position: "absolute",
        top: -20,
        right: -10,
        fontSize: 180,
        fontFamily: "'Fraunces', serif",
        fontWeight: 800,
        color: gradeColor(score.grade),
        opacity: 0.06,
        lineHeight: 1,
        pointerEvents: "none",
        userSelect: "none",
      }}>
        {score.grade}
      </div>

      <h2 style={{ position: "relative" }}>
        <Shield size={22} style={{ color: gradeColor(score.grade) }} />
        Policy Health Score
      </h2>

      {/* Grade + score row */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16, position: "relative" }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          background: gradeBg(score.grade),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
          fontFamily: "'Fraunces', serif",
          fontWeight: 800,
          color: gradeColor(score.grade),
          flexShrink: 0,
        }}>
          {score.grade}
        </div>
        <div>
          <div style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600, marginBottom: 2 }}>
            Score: {score.score}/100
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
            {score.headline}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 20 }}>
        {score.recommendation}
      </p>

      {/* Score factors */}
      {topFactors.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 4,
          }}>
            Key Factors
          </div>
          {topFactors.map((f, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 14px",
              background: f.severity === "negative" ? "rgba(220, 38, 38, 0.04)" : "rgba(27, 107, 74, 0.04)",
              borderRadius: 8,
              borderLeft: `3px solid ${f.severity === "negative" ? "#DC2626" : "var(--accent)"}`,
            }}>
              {f.severity === "negative" ? (
                <TrendingDown size={14} style={{ color: "#DC2626", marginTop: 2, flexShrink: 0 }} />
              ) : (
                <TrendingUp size={14} style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {f.label}
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: f.severity === "negative" ? "#DC2626" : "var(--accent)",
                    marginLeft: 8,
                  }}>
                    {f.impact > 0 ? "+" : ""}{f.impact}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginTop: 2 }}>
                  {f.explanation}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Build a plain-English risk explanation based on analysis data */
function buildRiskExplanation(
  analysis: PolicyAnalysis,
  highSeverityLandmines: PolicyAnalysis["landmines"]
): string | null {
  const parts: string[] = [];

  if (analysis.riskLevel === "high") {
    parts.push("Your policy has significant concerns that could leave you underprotected.");
  } else if (analysis.riskLevel === "medium") {
    parts.push("Your policy provides reasonable coverage but has some areas worth reviewing.");
  } else {
    parts.push("Your policy provides solid coverage with minimal concerns.");
  }

  if (highSeverityLandmines.length > 0) {
    parts.push(
      `We found ${highSeverityLandmines.length} high-priority issue${highSeverityLandmines.length > 1 ? "s" : ""} that could significantly impact your coverage in a claim.`
    );
  }

  if (analysis.depreciationMethod === "ACV") {
    parts.push(
      "Your policy uses Actual Cash Value depreciation, which means payouts will be reduced based on the age and condition of damaged items."
    );
  }

  if (analysis.exclusions?.length > 3) {
    parts.push(
      `There are ${analysis.exclusions.length} exclusions in your policy — these are situations where your coverage does not apply.`
    );
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
