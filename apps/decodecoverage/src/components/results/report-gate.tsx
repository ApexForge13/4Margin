"use client";

import { useState } from "react";
import { Lock, ArrowRight, CheckCircle2 } from "lucide-react";

interface ReportGateProps {
  leadId: string;
  score: number;
  grade: string;
  findingCount: number;
  onUnlock: () => void;
}

export function ReportGate({
  leadId,
  score,
  grade,
  findingCount,
  onUnlock,
}: ReportGateProps) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [consentContact, setConsentContact] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !zip.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          zip: zip.trim(),
          consentContact,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const gradeColor =
    grade === "A"
      ? "var(--accent)"
      : grade === "B"
        ? "#D97706"
        : grade === "C"
          ? "#EA580C"
          : "#DC2626";

  return (
    <div className="report-gate">
      {/* Score teaser */}
      <div className="report-gate-score">
        <div className="report-gate-grade" style={{ color: gradeColor }}>
          {grade}
        </div>
        <div>
          <div className="report-gate-score-num">
            Your Coverage Score: {score}/100
          </div>
          <div className="report-gate-score-sub">
            We found {findingCount} finding{findingCount !== 1 ? "s" : ""} in your policy
          </div>
        </div>
      </div>

      {/* Blurred teaser findings */}
      <div className="report-gate-blurred">
        <div className="blurred-finding">
          <div className="blurred-bar" style={{ width: "70%" }} />
          <div className="blurred-bar short" style={{ width: "90%" }} />
        </div>
        <div className="blurred-finding">
          <div className="blurred-bar" style={{ width: "60%" }} />
          <div className="blurred-bar short" style={{ width: "80%" }} />
        </div>
        <div className="report-gate-lock-overlay">
          <Lock size={20} />
          <span>Unlock your full report</span>
        </div>
      </div>

      {/* Gate form */}
      <form onSubmit={handleSubmit} className="report-gate-form">
        <div className="report-gate-row">
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="report-gate-input"
          />
          <input
            type="text"
            required
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="Zip code"
            className="report-gate-input"
            inputMode="numeric"
            style={{ maxWidth: 120 }}
          />
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="report-gate-input"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="report-gate-input"
        />

        <label className="report-gate-consent">
          <input
            type="checkbox"
            checked={consentContact}
            onChange={(e) => setConsentContact(e.target.checked)}
          />
          <span>
            I agree to be contacted by a licensed agent if I choose to get a quote.
          </span>
        </label>

        {error && (
          <p style={{ color: "#DC2626", fontSize: 14, marginTop: 8 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="report-gate-btn"
        >
          {submitting ? (
            "Unlocking..."
          ) : (
            <>
              <CheckCircle2 size={18} />
              Unlock My Full Report — Free
            </>
          )}
        </button>
      </form>
    </div>
  );
}
