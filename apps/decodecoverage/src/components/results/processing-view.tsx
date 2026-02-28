"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const STAGES = [
  {
    emoji: "\uD83D\uDD0D",
    text: "Reading your policy details...",
    sub: "Identifying your carrier, policy type, and effective dates.",
    duration: 3000,
  },
  {
    emoji: "\uD83C\uDFE0",
    text: "Analyzing your dwelling coverage...",
    sub: "Checking if your coverage matches current rebuild costs in your zip code.",
    duration: 4000,
  },
  {
    emoji: "\u26A1",
    text: "Scanning your deductible structure...",
    sub: "Reviewing your standard, wind/hail, and hurricane deductibles.",
    duration: 4000,
  },
  {
    emoji: "\uD83D\uDEE1\uFE0F",
    text: "Checking for coverage gaps...",
    sub: "Comparing your policy against recommended coverage for your area.",
    duration: 3000,
  },
  {
    emoji: "\uD83D\uDCCA",
    text: "Calculating your Coverage Health Score...",
    sub: "Almost there.",
    duration: 3000,
  },
  {
    emoji: "\u2705",
    text: "Your policy has been decoded.",
    sub: "Scroll down to see your results.",
    duration: 0,
  },
];

export function ProcessingView({
  id,
  checkMode,
}: {
  id: string;
  checkMode?: boolean;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(-1); // -1 = "Got it" intro
  const [apiDone, setApiDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Poll API for completion
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/leads/${id}/status`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "complete" || data.status === "completed") {
          setApiDone(true);
          clearInterval(interval);
        } else if (data.status === "failed") {
          setErrorMessage(
            data.error_message ||
              "Something went wrong analyzing your policy. Please try again."
          );
          clearInterval(interval);
        }
      } catch {
        // Silent retry
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id]);

  // Cosmetic stage progression
  useEffect(() => {
    // Start at "Got it" for 2s, then advance through stages
    const timer = setTimeout(() => {
      setStage(0);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (stage < 0 || stage >= STAGES.length - 1) return;
    const timer = setTimeout(() => {
      setStage((s) => s + 1);
    }, STAGES[stage].duration);
    return () => clearTimeout(timer);
  }, [stage]);

  // Track elapsed time for delay message
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // When API is done, fast-forward to final stage then refresh
  const handleComplete = useCallback(() => {
    setStage(STAGES.length - 1);
    setTimeout(() => {
      router.refresh();
    }, 1500);
  }, [router]);

  useEffect(() => {
    if (apiDone) {
      handleComplete();
    }
  }, [apiDone, handleComplete]);

  const progress = stage < 0 ? 0 : Math.min(((stage + 1) / STAGES.length) * 100, 100);

  if (errorMessage) {
    return (
      <>
        <nav>
          <div className="nav-inner">
            <a href="/" className="logo">
              Decode<span>Coverage</span>
            </a>
          </div>
        </nav>
        <div className="processing-page">
          <div className="processing-content">
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#9888;&#65039;</div>
            <h2>We hit a snag</h2>
            <p style={{ lineHeight: 1.7 }}>{errorMessage}</p>
            <a
              href="/#upload"
              style={{
                display: "inline-flex",
                marginTop: 24,
                padding: "14px 32px",
                background: "var(--accent)",
                color: "#fff",
                borderRadius: "var(--radius)",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Try Again
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <nav>
        <div className="nav-inner">
          <a href="/" className="logo">
            Decode<span>Coverage</span>
          </a>
        </div>
      </nav>
      <div className="processing-page">
        <div className="processing-content">
          {/* Progress bar */}
          <div className="processing-progress-bar">
            <div
              className="processing-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Current stage */}
          {stage < 0 ? (
            <div className="processing-stage active">
              <div style={{ fontSize: 32, marginBottom: 8 }}>&#128196;</div>
              <h2>Got it. Analyzing your policy now...</h2>
            </div>
          ) : (
            <div className="processing-stage active" key={stage}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {STAGES[stage].emoji}
              </div>
              <h2>{STAGES[stage].text}</h2>
              <p>{STAGES[stage].sub}</p>
            </div>
          )}

          {/* Processing delay message */}
          {elapsed > 60 && stage < STAGES.length - 1 && (
            <p
              style={{
                marginTop: 24,
                fontSize: 14,
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              Your policy is longer than usual — our AI is being extra thorough.
              This should take just a few more seconds.
            </p>
          )}

          {/* Stage list */}
          <div className="processing-stages">
            {STAGES.map((s, i) => (
              <div
                key={i}
                className={`processing-stage-dot${
                  i < stage ? " complete" : i === stage ? " active" : ""
                }`}
              >
                <span>{s.emoji}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
