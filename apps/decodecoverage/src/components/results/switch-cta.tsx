"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import type { PolicyScore } from "@/lib/policy-score";

interface SwitchCtaProps {
  leadId: string;
  score: PolicyScore;
}

export function SwitchCta({ leadId, score }: SwitchCtaProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const handleOptIn = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/leads/${leadId}/opt-in`, {
        method: "PATCH",
      });
      if (res.ok) {
        setStatus("done");
      } else {
        setStatus("idle");
        alert("Something went wrong. Please try again.");
      }
    } catch {
      setStatus("idle");
      alert("Something went wrong. Please try again.");
    }
  };

  if (status === "done") {
    return (
      <div className="result-card" style={{
        background: "var(--accent-light)",
        border: "2px solid var(--accent)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <CheckCircle2 size={24} style={{ color: "var(--accent)" }} />
          <h2 style={{ marginBottom: 0, color: "var(--accent)" }}>
            You&apos;re on the list!
          </h2>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-secondary)" }}>
          A licensed agent in your area will reach out within 24 hours to review your policy and show you better options. No obligation, no pressure.
        </p>
      </div>
    );
  }

  return (
    <div className="result-card" style={{
      background: "linear-gradient(135deg, rgba(27, 107, 74, 0.04) 0%, rgba(27, 107, 74, 0.01) 100%)",
      border: "2px solid var(--accent)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <ShieldCheck size={22} style={{ color: "var(--accent)" }} />
        <h2 style={{ marginBottom: 0 }}>
          You could have better coverage
        </h2>
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 20 }}>
        Your policy scored a <strong style={{ color: gradeColor(score.grade) }}>{score.grade}</strong> ({score.score}/100). {score.recommendation}
      </p>
      <button
        className="btn btn-primary"
        onClick={handleOptIn}
        disabled={status === "loading"}
        style={{ marginTop: 0, maxWidth: 340 }}
      >
        {status === "loading" ? (
          <>
            <span className="spinner" />
            Submitting...
          </>
        ) : (
          <>
            Get a Free Policy Review
            <ArrowRight size={16} />
          </>
        )}
      </button>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
        Free, no obligation. A licensed agent will review your policy and show you options.
      </p>
    </div>
  );
}

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
