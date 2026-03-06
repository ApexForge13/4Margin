"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
} from "lucide-react";
import { trackEvent } from "@/lib/tracking";

interface FunnelEntryProps {
  onSelectQuiz: (email: string) => void;
}

type Step = "email" | "choose" | "upload";

export function FunnelEntry({ onSelectQuiz }: FunnelEntryProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step management
  const [step, setStep] = useState<Step>("email");

  // Step 1: Email
  const [email, setEmail] = useState("");

  // Step 3A: Upload flow
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [consentContact, setConsentContact] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Helpers ---

  const getUtmParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get("utm_source") || "direct",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
    };
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 6)
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    if (digits.length >= 3)
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return digits;
  };

  // --- Step 1: Email Submit ---

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Fire-and-forget lead capture
    const utm = getUtmParams();
    fetch("/api/leads/email-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        utmSource: utm.utmSource,
        utmMedium: utm.utmMedium,
        utmCampaign: utm.utmCampaign,
      }),
    }).catch(() => {});

    trackEvent("email_captured", { method: "hero_form" });
    setStep("choose");
  };

  // --- Step 3A: File handling ---

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
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  // --- Step 3A: Submit ---

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !firstName || !lastName) return;

    setSubmitting(true);
    setError(null);
    trackEvent("upload_started", { file_type: file.type });

    try {
      const formData = new FormData();
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("consentTerms", "true");
      formData.append("consentContact", String(consentContact));
      formData.append("consentTimestamp", new Date().toISOString());
      formData.append("consentPageUrl", window.location.href);
      formData.append(
        "consentTermsText",
        "I agree to the Terms of Service and Privacy Policy."
      );
      formData.append(
        "consentContactText",
        consentContact
          ? "I agree to be contacted by a licensed agent if I choose to get a quote."
          : ""
      );

      const utm = getUtmParams();
      formData.append("utmSource", utm.utmSource);
      formData.append("utmMedium", utm.utmMedium);
      formData.append("utmCampaign", utm.utmCampaign);

      formData.append("policy", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed. Please try again.");
      }

      const data = await res.json();
      trackEvent("upload_complete", { lead_id: data.id });
      router.push(`/results/${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  // --- Step 1: Email Capture ---
  if (step === "email") {
    return (
      <div className="funnel-entry">
        <div className="form-card" style={{ textAlign: "center" }}>
          <h3
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              marginBottom: 24,
              lineHeight: 1.3,
            }}
          >
            Where should we send your free Coverage Report?
          </h3>

          <form onSubmit={handleEmailSubmit}>
            <input
              type="email"
              className="funnel-email-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: 16 }}
            >
              Get My Free Report
              <ArrowRight size={16} />
            </button>
          </form>

          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginTop: 16,
            }}
          >
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </div>
    );
  }

  // --- Step 2: Choose Your Path ---
  if (step === "choose") {
    return (
      <div className="funnel-entry">
        <div className="form-card" style={{ textAlign: "center" }}>
          <h3
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              marginBottom: 28,
              lineHeight: 1.3,
            }}
          >
            How would you like to check your coverage?
          </h3>

          <div className="path-chooser">
            {/* Option A: Upload */}
            <div
              className="path-card"
              onClick={() => setStep("upload")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setStep("upload");
              }}
            >
              <span className="path-badge">Most accurate</span>
              <div className="path-icon">
                <Upload size={24} />
              </div>
              <h3>Upload Your Policy</h3>
              <p>Get your full Coverage Health Score in 60 seconds</p>
            </div>

            {/* Option B: Quiz */}
            <div
              className="path-card"
              onClick={() => onSelectQuiz(email)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectQuiz(email);
              }}
            >
              <span className="path-badge">Fastest</span>
              <div className="path-icon">
                <ClipboardList size={24} />
              </div>
              <h3>Answer 5 Questions</h3>
              <p>Get an estimated score — no documents needed</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Step 3A: Upload Flow ---
  if (step === "upload") {
    if (submitting) {
      return (
        <div className="funnel-entry">
          <div className="form-card" style={{ textAlign: "center" }}>
            <div className="processing-spinner" />
            <p style={{ fontWeight: 600, fontSize: 17 }}>
              Uploading &amp; analyzing...
            </p>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                marginTop: 8,
              }}
            >
              This takes about 30-60 seconds. Don&apos;t close this page.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="funnel-entry">
        <div className="form-card">
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Upload your policy
          </h3>
          <p className="step-desc">
            Upload your declarations page and we&apos;ll analyze it instantly.
          </p>

          <form onSubmit={handleUploadSubmit}>
            {/* File Upload Zone */}
            <div className="form-group">
              <div
                className={`upload-zone${file ? " has-file" : ""}${dragOver ? " dragover" : ""}`}
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
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <div className="upload-icon">
                  {file ? (
                    <CheckCircle2 size={24} />
                  ) : (
                    <Upload size={24} />
                  )}
                </div>
                {file ? (
                  <>
                    <h4>{file.name}</h4>
                    <p>{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </>
                ) : (
                  <>
                    <h4>Drop your policy here or click to browse</h4>
                    <p>PDF or image &middot; Max 25MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Name Fields */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="funnel-firstName">First name</label>
                <input
                  id="funnel-firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="funnel-lastName">Last name</label>
                <input
                  id="funnel-lastName"
                  type="text"
                  placeholder="Smith"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Phone (optional) */}
            <div className="form-group">
              <label htmlFor="funnel-phone">
                Phone{" "}
                <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
                  (optional)
                </span>
              </label>
              <input
                id="funnel-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
              />
            </div>

            {/* Consent */}
            <div className="consent-block">
              <div className="consent-item">
                <input
                  type="checkbox"
                  id="funnel-consentContact"
                  checked={consentContact}
                  onChange={(e) => setConsentContact(e.target.checked)}
                />
                <label htmlFor="funnel-consentContact">
                  I agree to be contacted by a licensed agent if I choose to get
                  a quote.
                </label>
              </div>
            </div>

            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              By continuing you agree to our{" "}
              <a
                href="/terms"
                style={{
                  color: "var(--accent)",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                style={{
                  color: "var(--accent)",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                Privacy Policy
              </a>
              .
            </p>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 16,
                  color: "#DC2626",
                  fontSize: 14,
                }}
              >
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!file || !firstName || !lastName}
            >
              Analyze My Policy — Free
              <ArrowRight size={16} />
            </button>
          </form>

          <button
            className="btn btn-back"
            onClick={() => setStep("choose")}
          >
            &larr; Back
          </button>

          <p className="form-note">
            <Lock size={12} />
            Your policy is encrypted and analyzed by AI only. No human reads
            your document.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
