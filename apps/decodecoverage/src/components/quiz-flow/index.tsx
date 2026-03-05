"use client";

import { useState, useCallback, useMemo } from "react";

/* ─── Types ─── */
interface QuizFlowProps {
  email: string;
}

interface QuizAnswers {
  carrier: string;
  state: string;
  dwellingCoverage: string;
  yearBuilt: string;
  deductible: string;
}

/* ─── US States ─── */
const US_STATES = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
];

const CARRIERS = [
  "State Farm",
  "Allstate",
  "USAA",
  "Liberty Mutual",
  "Farmers",
  "Nationwide",
  "Progressive",
  "Travelers",
  "American Family",
  "Erie Insurance",
  "Other",
];

const DWELLING_OPTIONS = [
  "Under $200K",
  "$200K\u2013$350K",
  "$350K\u2013$500K",
  "$500K\u2013$750K",
  "Over $750K",
  "I\u2019m not sure",
];

const YEAR_BUILT_OPTIONS = [
  "Before 1970",
  "1970\u20131990",
  "1990\u20132005",
  "2005\u20132020",
  "After 2020",
];

const DEDUCTIBLE_OPTIONS = [
  "$500 or less",
  "$1,000",
  "$2,500",
  "$5,000+",
  "I don\u2019t know",
];

/* ─── Score Calculation ─── */
function calculateScore(answers: QuizAnswers): { score: number; grade: string } {
  let score = 72;

  if (answers.dwellingCoverage === "I\u2019m not sure") score -= 5;
  if (answers.deductible === "$5,000+") score -= 8;
  if (answers.deductible === "I don\u2019t know") score -= 3;
  if (answers.yearBuilt === "Before 1970") score -= 5;
  if (answers.yearBuilt === "2005\u20132020" || answers.yearBuilt === "After 2020") score += 3;
  if (answers.carrier === "USAA" || answers.carrier === "Erie Insurance") score += 4;

  // Clamp
  score = Math.max(0, Math.min(100, score));

  let grade: string;
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";
  else grade = "F";

  return { score, grade };
}

function getScoreColorClass(grade: string): string {
  switch (grade) {
    case "A":
      return "good";
    case "B":
      return "good";
    case "C":
      return "warning";
    case "D":
      return "critical";
    default:
      return "critical";
  }
}

function getStateName(abbr: string): string {
  const found = US_STATES.find((s) => s.abbr === abbr);
  return found ? found.name : abbr;
}

function getUtmParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  } catch {
    return null;
  }
}

/* ─── Component ─── */
export function QuizFlow({ email }: QuizFlowProps) {
  const [step, setStep] = useState(0); // 0-4 = questions, 5 = calculating, 6 = results
  const [answers, setAnswers] = useState<QuizAnswers>({
    carrier: "",
    state: "",
    dwellingCoverage: "",
    yearBuilt: "",
    deductible: "",
  });
  const [otherCarrier, setOtherCarrier] = useState("");
  const [showAdvisorForm, setShowAdvisorForm] = useState(false);
  const [advisorForm, setAdvisorForm] = useState({
    firstName: "",
    phone: "",
    zipCode: "",
    consent: true,
  });
  const [advisorSubmitting, setAdvisorSubmitting] = useState(false);
  const [advisorSubmitted, setAdvisorSubmitted] = useState(false);

  const { score, grade } = useMemo(() => calculateScore(answers), [answers]);

  /* ── Navigation ── */
  const goNext = useCallback(() => {
    if (step < 4) {
      setStep((s) => s + 1);
    } else {
      // Last question answered — show calculating spinner
      setStep(5);
      setTimeout(() => setStep(6), 2000);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0 && step <= 4) setStep((s) => s - 1);
  }, [step]);

  /* ── Answer handlers ── */
  const selectCard = useCallback(
    (field: keyof QuizAnswers, value: string) => {
      setAnswers((prev) => ({ ...prev, [field]: value }));
      // Auto-advance for card options
      if (step < 4) {
        setTimeout(() => setStep((s) => s + 1), 250);
      } else {
        setStep(5);
        setTimeout(() => setStep(6), 2000);
      }
    },
    [step]
  );

  /* ── Advisor form submit ── */
  const submitAdvisorForm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (advisorSubmitting) return;
      setAdvisorSubmitting(true);

      try {
        const payload = {
          email,
          firstName: advisorForm.firstName,
          phone: advisorForm.phone,
          zipCode: advisorForm.zipCode,
          quizAnswers: {
            carrier: answers.carrier === "Other" ? otherCarrier || "Other" : answers.carrier,
            state: answers.state,
            dwellingCoverage: answers.dwellingCoverage,
            yearBuilt: answers.yearBuilt,
            deductible: answers.deductible,
          },
          estimatedScore: score,
          estimatedGrade: grade,
          consentContact: advisorForm.consent,
          consentTimestamp: new Date().toISOString(),
          consentPageUrl: typeof window !== "undefined" ? window.location.href : "",
          consentText:
            "I agree to be contacted by a licensed agent if I choose to get a quote.",
          utmSource: getUtmParam("utm_source"),
          utmMedium: getUtmParam("utm_medium"),
          utmCampaign: getUtmParam("utm_campaign"),
        };

        await fetch("/api/leads/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        setAdvisorSubmitted(true);
      } catch (err) {
        console.error("Failed to submit advisor form:", err);
      } finally {
        setAdvisorSubmitting(false);
      }
    },
    [email, advisorForm, answers, otherCarrier, score, grade, advisorSubmitting]
  );

  /* ── Scroll to upload ── */
  const scrollToUpload = useCallback(() => {
    const el = document.getElementById("start");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  /* ──────────── Render: Calculating ──────────── */
  if (step === 5) {
    return (
      <div className="quiz-flow">
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div className="processing-spinner" />
          <h3
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Calculating your coverage score...
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            Analyzing your answers against industry benchmarks
          </p>
        </div>
      </div>
    );
  }

  /* ──────────── Render: Results ──────────── */
  if (step === 6) {
    const colorClass = getScoreColorClass(grade);
    const stateName = getStateName(answers.state);

    return (
      <div className="quiz-flow">
        <div className="quiz-result">
          {/* Score Circle */}
          <div className={`quiz-score-circle ${colorClass}`} style={{
            borderColor:
              colorClass === "good"
                ? "var(--accent)"
                : colorClass === "warning"
                ? "var(--warning)"
                : "#DC2626",
            background:
              colorClass === "good"
                ? "var(--accent-light)"
                : colorClass === "warning"
                ? "var(--warning-light)"
                : "#FEE2E2",
          }}>
            <span className="score-num">{score}</span>
            <span
              className="score-grade"
              style={{
                color:
                  colorClass === "good"
                    ? "var(--accent)"
                    : colorClass === "warning"
                    ? "var(--warning)"
                    : "#DC2626",
              }}
            >
              {grade}
            </span>
          </div>

          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.5px",
              marginBottom: 24,
            }}
          >
            Coverage Health Score
          </div>

          <p
            style={{
              fontSize: 17,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              maxWidth: 480,
              margin: "0 auto 40px",
            }}
          >
            Based on your answers, your estimated coverage grade is{" "}
            <strong style={{ color: "var(--text-primary)" }}>{grade}</strong>.
            Homes like yours in{" "}
            <strong style={{ color: "var(--text-primary)" }}>{stateName}</strong>{" "}
            typically have 2-3 coverage gaps.
          </p>

          {/* CTA Section */}
          <h3
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              marginBottom: 20,
            }}
          >
            Want the full picture?
          </h3>

          <div className="quiz-cta-cards">
            {/* Upload CTA */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "2px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "28px 24px",
                textAlign: "center" as const,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={scrollToUpload}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--accent-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "var(--accent)",
                }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                Upload Your Policy
              </h4>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Get a complete, line-by-line analysis of your coverage
              </p>
            </div>

            {/* Advisor CTA */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "2px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "28px 24px",
                textAlign: "center" as const,
                cursor: showAdvisorForm ? "default" : "pointer",
                transition: "all 0.2s",
              }}
              onClick={() => {
                if (!showAdvisorForm && !advisorSubmitted) setShowAdvisorForm(true);
              }}
              onMouseEnter={(e) => {
                if (!showAdvisorForm) {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!showAdvisorForm) {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }
              }}
            >
              {advisorSubmitted ? (
                <div style={{ padding: "12px 0" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "var(--accent-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                      color: "var(--accent)",
                    }}
                  >
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                    Request Submitted!
                  </h4>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                    A licensed advisor will reach out shortly.
                  </p>
                </div>
              ) : showAdvisorForm ? (
                <form onSubmit={submitAdvisorForm} style={{ textAlign: "left" as const }}>
                  <div className="form-group">
                    <label>First name</label>
                    <input
                      type="text"
                      placeholder="John"
                      value={advisorForm.firstName}
                      onChange={(e) =>
                        setAdvisorForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone number</label>
                    <input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={advisorForm.phone}
                      onChange={(e) =>
                        setAdvisorForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>ZIP code</label>
                    <input
                      type="text"
                      placeholder="30301"
                      maxLength={10}
                      value={advisorForm.zipCode}
                      onChange={(e) =>
                        setAdvisorForm((f) => ({ ...f, zipCode: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="consent-item" style={{ marginTop: 12 }}>
                    <input
                      type="checkbox"
                      id="advisor-consent"
                      checked={advisorForm.consent}
                      onChange={(e) =>
                        setAdvisorForm((f) => ({ ...f, consent: e.target.checked }))
                      }
                    />
                    <label htmlFor="advisor-consent">
                      I agree to be contacted by a licensed agent if I choose to
                      get a quote.
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={advisorSubmitting || !advisorForm.consent}
                    style={{ marginTop: 16 }}
                  >
                    {advisorSubmitting ? (
                      <>
                        <span className="spinner" /> Submitting...
                      </>
                    ) : (
                      "Connect Me \u2014 Free, No Obligation"
                    )}
                  </button>
                </form>
              ) : (
                <>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "var(--accent-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                      color: "var(--accent)",
                    }}
                  >
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                    Talk to an Advisor
                  </h4>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    Connect with a licensed advisor to review your coverage
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────── Render: Questions ──────────── */
  return (
    <div className="quiz-flow">
      {/* Progress bar */}
      <div className="quiz-progress">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`quiz-progress-bar${i <= step ? " filled" : ""}`}
          />
        ))}
      </div>

      {/* Question 1: Carrier */}
      {step === 0 && (
        <div className="quiz-question" key="q1">
          <h3>Who is your current insurance carrier?</h3>
          <div className="form-group">
            <select
              value={answers.carrier}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, carrier: e.target.value }))
              }
              style={{ width: "100%" }}
            >
              <option value="">Select your carrier...</option>
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {answers.carrier === "Other" && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder="Enter your carrier name"
                value={otherCarrier}
                onChange={(e) => setOtherCarrier(e.target.value)}
              />
            </div>
          )}
          <button
            className="btn btn-primary"
            disabled={
              !answers.carrier ||
              (answers.carrier === "Other" && !otherCarrier.trim())
            }
            onClick={goNext}
          >
            Continue
          </button>
        </div>
      )}

      {/* Question 2: State */}
      {step === 1 && (
        <div className="quiz-question" key="q2">
          <h3>What state is your property in?</h3>
          <div className="form-group">
            <select
              value={answers.state}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, state: e.target.value }))
              }
              style={{ width: "100%" }}
            >
              <option value="">Select your state...</option>
              {US_STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>
                  {s.abbr} - {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            disabled={!answers.state}
            onClick={goNext}
          >
            Continue
          </button>
          <button className="quiz-back" onClick={goBack}>
            &larr; Back
          </button>
        </div>
      )}

      {/* Question 3: Dwelling Coverage */}
      {step === 2 && (
        <div className="quiz-question" key="q3">
          <h3>What is your approximate dwelling coverage amount?</h3>
          <div className="quiz-options">
            {DWELLING_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`quiz-option${answers.dwellingCoverage === opt ? " selected" : ""}`}
                onClick={() => selectCard("dwellingCoverage", opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <button className="quiz-back" onClick={goBack}>
            &larr; Back
          </button>
        </div>
      )}

      {/* Question 4: Year Built */}
      {step === 3 && (
        <div className="quiz-question" key="q4">
          <h3>When was your home built?</h3>
          <div className="quiz-options">
            {YEAR_BUILT_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`quiz-option${answers.yearBuilt === opt ? " selected" : ""}`}
                onClick={() => selectCard("yearBuilt", opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <button className="quiz-back" onClick={goBack}>
            &larr; Back
          </button>
        </div>
      )}

      {/* Question 5: Deductible */}
      {step === 4 && (
        <div className="quiz-question" key="q5">
          <h3>What is your deductible?</h3>
          <div className="quiz-options">
            {DEDUCTIBLE_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`quiz-option${answers.deductible === opt ? " selected" : ""}`}
                onClick={() => selectCard("deductible", opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <button className="quiz-back" onClick={goBack}>
            &larr; Back
          </button>
        </div>
      )}
    </div>
  );
}
