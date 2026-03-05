"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  ClipboardList,
} from "lucide-react";

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

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

type FunnelStep = "email" | "choose-path" | "upload" | "quiz";

export function HeroUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Funnel state
  const [step, setStep] = useState<FunnelStep>("email");
  const [email, setEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  // Quiz state (Path B)
  const [quizStep, setQuizStep] = useState(0);
  const [carrier, setCarrier] = useState("");
  const [state, setState] = useState("");
  const [dwellingCoverage, setDwellingCoverage] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [deductible, setDeductible] = useState("");
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  // Step 1: Email capture
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setEmailSubmitting(true);
    try {
      await fetch("/api/leads/pre-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          utmSource: new URLSearchParams(window.location.search).get("utm_source") || undefined,
          utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || undefined,
          utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
        }),
      });
    } catch {
      // Don't block flow if pre-capture fails
    } finally {
      setEmailSubmitting(false);
      setStep("choose-path");
    }
  };

  // Path A: Upload handlers
  const handleFile = useCallback((f: File) => {
    setError(null);

    if (f.size > 25 * 1024 * 1024) {
      setError("File is too large. Maximum size is 25MB.");
      return;
    }

    const isPdf =
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    const isImage = f.type.startsWith("image/");

    if (!isPdf && !isImage) {
      setError(
        "Please upload a PDF or image of your policy declarations page."
      );
      return;
    }

    setFile(f);
    submitFile(f);
  }, []);

  const submitFile = async (f: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("policy", f);

      if (email.trim()) {
        formData.append("email", email.trim());
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get("utm_source"))
        formData.append("utmSource", params.get("utm_source")!);
      if (params.get("utm_medium"))
        formData.append("utmMedium", params.get("utm_medium")!);
      if (params.get("utm_campaign"))
        formData.append("utmCampaign", params.get("utm_campaign")!);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed. Please try again.");
        setUploading(false);
        return;
      }

      router.push(`/results/${data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  // Path B: Quiz submit
  const handleQuizSubmit = async () => {
    setQuizSubmitting(true);
    try {
      const res = await fetch("/api/leads/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          carrier,
          state,
          dwellingCoverage: dwellingCoverage ? parseInt(dwellingCoverage.replace(/\D/g, ""), 10) : null,
          yearBuilt: yearBuilt ? parseInt(yearBuilt, 10) : null,
          deductible: deductible ? parseInt(deductible.replace(/\D/g, ""), 10) : null,
          utmSource: new URLSearchParams(window.location.search).get("utm_source") || undefined,
          utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || undefined,
          utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/results/${data.id}`);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setQuizSubmitting(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setQuizSubmitting(false);
    }
  };

  // Quiz questions
  const quizQuestions = [
    {
      label: "Who is your current insurance carrier?",
      content: (
        <select
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="quiz-select"
        >
          <option value="">Select your carrier</option>
          {CARRIERS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      ),
      valid: !!carrier,
    },
    {
      label: "What state is your home in?",
      content: (
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="quiz-select"
        >
          <option value="">Select state</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ),
      valid: !!state,
    },
    {
      label: "What is your dwelling coverage amount?",
      content: (
        <input
          type="text"
          value={dwellingCoverage}
          onChange={(e) => setDwellingCoverage(e.target.value)}
          placeholder="e.g. $350,000"
          className="quiz-input"
        />
      ),
      valid: !!dwellingCoverage,
    },
    {
      label: "What year was your home built?",
      content: (
        <input
          type="text"
          inputMode="numeric"
          value={yearBuilt}
          onChange={(e) => setYearBuilt(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="e.g. 1998"
          className="quiz-input"
        />
      ),
      valid: !!yearBuilt && yearBuilt.length === 4,
    },
    {
      label: "What is your deductible?",
      content: (
        <input
          type="text"
          value={deductible}
          onChange={(e) => setDeductible(e.target.value)}
          placeholder="e.g. $2,500 or 2%"
          className="quiz-input"
        />
      ),
      valid: !!deductible,
    },
  ];

  // ── Render: Uploading state ──
  if (uploading) {
    return (
      <div className="hero-upload-zone uploading">
        <div className="upload-spinner" />
        <p style={{ marginTop: 12, fontWeight: 500 }}>
          Uploading &amp; analyzing...
        </p>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          This takes about 30–60 seconds. Don&apos;t close this page.
        </p>
      </div>
    );
  }

  // ── Render: Step 1 — Email capture ──
  if (step === "email") {
    return (
      <div>
        <div className="hero-email-capture">
          <form onSubmit={handleEmailSubmit}>
            <p className="email-capture-label">
              Where should we send your free Coverage Report?
            </p>
            <div className="email-capture-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="email-capture-input"
              />
              <button
                type="submit"
                disabled={emailSubmitting}
                className="email-capture-btn"
              >
                {emailSubmitting ? "..." : <>Get My Report <ArrowRight size={16} /></>}
              </button>
            </div>
          </form>
        </div>

        <div className="email-capture-privacy">
          <Lock size={12} />
          <span>No spam. Your data is encrypted. Unsubscribe anytime.</span>
        </div>
      </div>
    );
  }

  // ── Render: Step 2 — Choose path (A: upload or B: quiz) ──
  if (step === "choose-path") {
    return (
      <div>
        <p style={{ fontSize: 14, color: "var(--accent)", marginBottom: 16, fontWeight: 500, textAlign: "center" }}>
          <CheckCircle2 size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          We&apos;ll send your report to {email}
        </p>

        <div className="path-chooser">
          <button
            className="path-option path-option-primary"
            onClick={() => setStep("upload")}
          >
            <div className="path-option-icon">
              <Upload size={24} />
            </div>
            <div className="path-option-content">
              <h4>I have my policy PDF</h4>
              <p>Upload it now for a full AI analysis in 60 seconds</p>
            </div>
            <ArrowRight size={18} className="path-arrow" />
          </button>

          <div className="path-divider">
            <span>or</span>
          </div>

          <button
            className="path-option"
            onClick={() => setStep("quiz")}
          >
            <div className="path-option-icon path-option-icon-alt">
              <ClipboardList size={24} />
            </div>
            <div className="path-option-content">
              <h4>I don&apos;t have it handy</h4>
              <p>Answer 5 quick questions for an estimated coverage score</p>
            </div>
            <ArrowRight size={18} className="path-arrow" />
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Path B — Quiz flow ──
  if (step === "quiz") {
    const q = quizQuestions[quizStep];
    const isLast = quizStep === quizQuestions.length - 1;

    return (
      <div>
        <div className="quiz-card">
          {/* Progress */}
          <div className="quiz-progress">
            {quizQuestions.map((_, i) => (
              <div
                key={i}
                className={`quiz-progress-dot ${i === quizStep ? "active" : i < quizStep ? "complete" : ""}`}
              />
            ))}
          </div>

          <p className="quiz-step-label">
            Question {quizStep + 1} of {quizQuestions.length}
          </p>
          <h4 className="quiz-question">{q.label}</h4>
          {q.content}

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, color: "#DC2626", fontSize: 14 }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="quiz-nav">
            {quizStep > 0 && (
              <button
                className="quiz-back-btn"
                onClick={() => { setQuizStep(quizStep - 1); setError(null); }}
              >
                Back
              </button>
            )}
            {isLast ? (
              <button
                className="quiz-next-btn"
                disabled={!q.valid || quizSubmitting}
                onClick={handleQuizSubmit}
              >
                {quizSubmitting ? (
                  <><span className="spinner" style={{ width: 16, height: 16 }} /> Analyzing...</>
                ) : (
                  <>Get My Score <ArrowRight size={16} /></>
                )}
              </button>
            ) : (
              <button
                className="quiz-next-btn"
                disabled={!q.valid}
                onClick={() => { setQuizStep(quizStep + 1); setError(null); }}
              >
                Next <ArrowRight size={16} />
              </button>
            )}
          </div>

          <button
            className="quiz-switch-link"
            onClick={() => { setStep("upload"); setError(null); }}
          >
            I found my policy PDF — upload instead
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Path A — File upload ──
  return (
    <div>
      <p style={{ fontSize: 14, color: "var(--accent)", marginBottom: 12, fontWeight: 500, textAlign: "center" }}>
        <CheckCircle2 size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
        Great! Upload your policy to get your full report.
      </p>

      <div
        className={`hero-upload-zone${dragOver ? " dragover" : ""}${file ? " has-file" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          onChange={handleChange}
          style={{ display: "none" }}
        />

        {file ? (
          <>
            <CheckCircle2 size={32} style={{ color: "var(--accent)" }} />
            <p style={{ fontWeight: 600, marginTop: 8 }}>{file.name}</p>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </>
        ) : (
          <>
            <div className="upload-cta-btn">
              <Upload size={18} />
              Upload My Policy — Free Decode
            </div>
            <p className="upload-help">
              Drag &amp; drop your policy PDF here, or tap to upload
            </p>
            <p className="upload-help" style={{ fontSize: 13 }}>
              Don&apos;t have the PDF? Take a photo of your declarations page
              — that works too.
            </p>
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            color: "#DC2626",
            fontSize: 14,
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <button
        className="quiz-switch-link"
        onClick={() => { setStep("quiz"); setError(null); }}
        style={{ marginTop: 16 }}
      >
        Don&apos;t have your policy? Answer 5 questions instead
      </button>

      <p
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          marginTop: 12,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        <Lock size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
        Your policy is encrypted and analyzed by AI only. No human reads your
        document.
      </p>
    </div>
  );
}
