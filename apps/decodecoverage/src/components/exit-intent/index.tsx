"use client";

import { useState, useEffect, useCallback } from "react";

interface ExitIntentProps {
  leadId: string;
  score: number;
  alreadyConverted: boolean;
}

export function ExitIntent({ leadId, score, alreadyConverted }: ExitIntentProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      // Only fire when cursor exits the top of viewport
      if (e.clientY > 0) return;
      if (dismissed || alreadyConverted || visible) return;
      if (score >= 85) return;

      setVisible(true);

      // Mark exit intent shown
      fetch(`/api/leads/${leadId}/exit-intent`, {
        method: "PATCH",
      }).catch(() => {});
    },
    [dismissed, alreadyConverted, visible, score, leadId]
  );

  useEffect(() => {
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [handleMouseLeave]);

  function handleDismiss() {
    setVisible(false);
    setDismissed(true);
  }

  function handleDownload() {
    window.open(`/api/report/${leadId}/download`, "_blank");
    handleDismiss();
  }

  function handleComeBackLater() {
    setShowEmailCapture(true);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      await fetch(`/api/leads/${leadId}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), firstName: "" }),
      });
      setEmailSent(true);
      setTimeout(() => handleDismiss(), 2000);
    } catch {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={handleDismiss}>
      <div className="exit-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="exit-modal-close"
          onClick={handleDismiss}
          aria-label="Close"
        >
          &times;
        </button>

        {emailSent ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>&#9993;&#65039;</div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Link Sent!</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Check your inbox — we sent a direct link to your results.
            </p>
          </div>
        ) : showEmailCapture ? (
          <>
            <h3 style={{ fontSize: 18, marginBottom: 12 }}>
              We&apos;ll email you a link
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 14,
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              Enter your email and we&apos;ll send you a direct link to your
              results. No spam. Just your report.
            </p>
            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 15,
                  marginBottom: 12,
                  background: "var(--bg)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius)",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Sending..." : "Send Me the Link"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 20, marginBottom: 12 }}>
              Before You Go — Your Coverage Score Was {score}%
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                fontSize: 15,
                marginBottom: 20,
              }}
            >
              We get it — insurance isn&apos;t fun. But that {score}% means there
              are gaps that could cost you in a claim. You&apos;ve already done the
              hard part (uploading your policy). Take 30 more seconds and at least
              download your report so you have it when you need it.
            </p>
            <button
              onClick={handleDownload}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius)",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: 10,
              }}
            >
              Download My Free Report
            </button>
            <button
              onClick={handleComeBackLater}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              I&apos;ll Come Back Later (we&apos;ll email you a link)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
