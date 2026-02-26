"use client";

import { useState } from "react";
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
} from "lucide-react";

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
}

export function ResultsDisplay({
  id,
  firstName,
  analysis,
  documentMeta,
}: ResultsDisplayProps) {
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
    window.open(`/api/report/${id}/download`, "_blank");
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
      ? "Your policy pays full replacement cost"
      : analysis.depreciationMethod === "ACV"
        ? "Your policy deducts for wear & tear"
        : analysis.depreciationMethod || "Unknown";

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
        {/* Header */}
        <div className="results-header">
          <h1>
            {firstName ? `${firstName}'s` : "Your"} Policy Analysis
          </h1>
          <p>
            {analysis.carrier} &middot; {analysis.policyType || "Homeowners"}
            {analysis.policyNumber ? ` &middot; #${analysis.policyNumber}` : ""}
          </p>
        </div>

        {/* Risk Badge + Quick Stats */}
        <div style={{ marginBottom: 24 }}>
          <span className={`risk-badge ${riskClass}`}>
            {riskIcon}
            {analysis.riskLevel?.toUpperCase()} RISK
          </span>
        </div>

        <div className="quick-stats">
          <div className="quick-stat">
            <div className="stat-label">Policy Type</div>
            <div className="stat-value">{analysis.policyType || "—"}</div>
          </div>
          <div className="quick-stat">
            <div className="stat-label">Carrier</div>
            <div className="stat-value">{analysis.carrier || "—"}</div>
          </div>
          <div className="quick-stat">
            <div className="stat-label">Depreciation</div>
            <div
              className="stat-value"
              style={{
                color:
                  analysis.depreciationMethod === "RCV"
                    ? "var(--accent)"
                    : analysis.depreciationMethod === "ACV"
                      ? "#DC2626"
                      : undefined,
              }}
            >
              {analysis.depreciationMethod || "Unknown"}
            </div>
          </div>
          <div className="quick-stat">
            <div className="stat-label">Confidence</div>
            <div className="stat-value">
              {Math.round(analysis.confidence * 100)}%
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="results-actions">
          <button className="btn btn-primary" onClick={handleDownload}>
            <Download size={16} />
            Download PDF Report
          </button>
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
        </div>

        {/* Things to Watch Out For (Landmines) */}
        {analysis.landmines?.length > 0 && (
          <div className="result-card">
            <h2>
              <AlertTriangle size={22} style={{ color: "#DC2626" }} />
              Things to Watch Out For ({analysis.landmines.length})
            </h2>
            {analysis.landmines.map((l, i) => (
              <div className="result-item" key={i}>
                <h3>
                  {l.name}
                  <span
                    className={`severity-badge severity-${l.severity}`}
                  >
                    {l.severity}
                  </span>
                </h3>
                <p>{l.impact}</p>
                {l.actionItem && (
                  <p style={{ marginTop: 8, fontWeight: 600 }}>
                    What you can do: {l.actionItem}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Coverage Strengths (Favorable Provisions) */}
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

        {/* Your Coverage */}
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
                    <span
                      style={{
                        color: "var(--accent)",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {c.limit}
                    </span>
                  )}
                </h3>
                <p>{c.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Deductibles */}
        {analysis.deductibles?.length > 0 && (
          <div className="result-card">
            <h2>
              <DollarSign size={22} />
              Your Deductibles
            </h2>
            {analysis.deductibles.map((d, i) => (
              <div className="result-item" key={i}>
                <h3>
                  {d.amount}
                  {d.dollarAmount && d.amount.includes("%") && (
                    <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 14 }}>
                      {" "}
                      (${d.dollarAmount.toLocaleString()})
                    </span>
                  )}
                </h3>
                <p>
                  <strong>{d.type}</strong> — applies to {d.appliesTo}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Depreciation Method */}
        <div className="result-card">
          <h2>
            <Info size={22} />
            Depreciation Method
          </h2>
          <div className="result-item">
            <h3
              style={{
                color:
                  analysis.depreciationMethod === "RCV"
                    ? "var(--accent)"
                    : analysis.depreciationMethod === "ACV"
                      ? "#DC2626"
                      : undefined,
                fontSize: 18,
              }}
            >
              {depLabel}
            </h3>
            {analysis.depreciationNotes && (
              <p style={{ marginTop: 8 }}>{analysis.depreciationNotes}</p>
            )}
          </div>
        </div>

        {/* Exclusions */}
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
                  <span
                    className={`severity-badge severity-${ex.severity}`}
                  >
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

        {/* Endorsements */}
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
                      {" "}
                      ({en.number})
                    </span>
                  )}
                  <span
                    className={`severity-badge severity-${en.severity}`}
                  >
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

        {/* Policy Details */}
        <div className="result-card">
          <h2>
            <FileText size={22} />
            Policy Details
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            {[
              ["Policy #", analysis.policyNumber],
              ["Named Insured", analysis.namedInsured],
              ["Property", analysis.propertyAddress],
              ["Effective", analysis.effectiveDate],
              ["Expiration", analysis.expirationDate],
              ["Document Type", documentMeta?.documentType?.replace(/_/g, " ")],
              ["Scan Quality", documentMeta?.scanQuality],
            ]
              .filter(([, v]) => v)
              .map(([label, value], i) => (
                <div key={i}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>
                    {value}
                  </div>
                </div>
              ))}
          </div>
        </div>

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
