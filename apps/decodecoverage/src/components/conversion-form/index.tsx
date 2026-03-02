"use client";

import { useState } from "react";

interface ConversionFormProps {
  leadId: string;
  score: number;
}

function getBodyCopy(score: number): string {
  if (score >= 85) {
    return "Your coverage looks solid, but there's always room to optimize. We can connect you to someone to get the coverage you deserve. Or take this report to your current agent — either way, you're ahead of 99% of homeowners.";
  }
  if (score >= 70) {
    return "We found some gaps worth addressing. You can bring this report to your current agent (they may not love the conversation, but you'll be glad you had it), or we can connect you to someone to get the coverage you deserve. No pressure either way.";
  }
  return "Your coverage has some real gaps. We'd strongly recommend talking to someone about this. You can take this report to your current agent, but honestly — they're the ones who sold you this policy. An independent second opinion might serve you better. We can connect you to someone to get the coverage you deserve. Takes 2 minutes.";
}

export function ConversionForm({ leadId, score }: ConversionFormProps) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactMethod, setContactMethod] = useState("email");
  const [bestTime, setBestTime] = useState("morning");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) return;

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
          preferredContactMethod: contactMethod,
          bestTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="conversion-card">
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>&#10003;</div>
          <h3 style={{ fontSize: 20, marginBottom: 8 }}>You&apos;re All Set</h3>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            A licensed, independent advisor will review your analysis and reach
            out within 24 hours. No cost, no obligation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="conversion-card">
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>
        Want to Fix These Gaps?
      </h2>
      <p
        style={{
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          marginBottom: 24,
          fontSize: 15,
        }}
      >
        {getBodyCopy(score)}
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label
              htmlFor="cf-first-name"
              style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}
            >
              First Name *
            </label>
            <input
              id="cf-first-name"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Your first name"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 15,
                background: "var(--bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="cf-email"
              style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}
            >
              Email *
            </label>
            <input
              id="cf-email"
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
                background: "var(--bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="cf-phone"
              style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}
            >
              Phone{" "}
              <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
                (only if you want us to call)
              </span>
            </label>
            <input
              id="cf-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 15,
                background: "var(--bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label
                htmlFor="cf-contact-method"
                style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}
              >
                Preferred Contact
              </label>
              <select
                id="cf-contact-method"
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 15,
                  background: "var(--bg)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="text">Text</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="cf-best-time"
                style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}
              >
                Best Time
              </label>
              <select
                id="cf-best-time"
                value={bestTime}
                onChange={(e) => setBestTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 15,
                  background: "var(--bg)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <p style={{ color: "#DC2626", fontSize: 14, marginTop: 12 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "16px 24px",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius)",
            fontSize: 16,
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting
            ? "Connecting..."
            : "Connect Me With an Advisor \u2014 Free, No Obligation"}
        </button>

      </form>

      <p
        style={{
          textAlign: "center",
          fontSize: 13,
          color: "var(--text-muted)",
          marginTop: 20,
          lineHeight: 1.6,
        }}
      >
        We connect you with licensed, independent advisors — not your current
        carrier&apos;s sales team. The conversation starts with solutions,
        not sales pitches.
      </p>
    </div>
  );
}
