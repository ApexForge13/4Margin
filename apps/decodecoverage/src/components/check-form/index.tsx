"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle, ArrowRight, Lock } from "lucide-react";

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

const CLAIM_TYPES = [
  { value: "wind", label: "Wind" },
  { value: "hail", label: "Hail" },
  { value: "fire", label: "Fire" },
  { value: "water_flood", label: "Water / Flood" },
  { value: "impact", label: "Impact (tree, debris)" },
  { value: "theft", label: "Theft" },
  { value: "other", label: "Other" },
];

interface CheckFormProps {
  token: string;
  prefill: {
    firstName: string;
    lastName: string;
    claimType: string;
  };
}

export function CheckForm({ token, prefill }: CheckFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Form data
  const [firstName, setFirstName] = useState(prefill.firstName);
  const [lastName, setLastName] = useState(prefill.lastName);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [carrier, setCarrier] = useState("");
  const [claimType, setClaimType] = useState(prefill.claimType);
  const [file, setFile] = useState<File | null>(null);
  const [consentTerms, setConsentTerms] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 6)
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    if (digits.length >= 3) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return digits;
  };

  const goNext = (nextStep: number) => {
    if (step === 1 && (!firstName || !lastName)) return;
    if (step === 2 && !file) return;
    setStep(nextStep);
  };

  const handleFile = useCallback((f: File | null) => {
    if (f && f.size > 25 * 1024 * 1024) {
      alert("File must be under 25MB");
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleSubmit = async () => {
    if (!consentTerms || !file) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("phone", phone);
      formData.append("address", address);
      formData.append("carrier", carrier);
      formData.append("claimType", claimType);
      formData.append("consentTerms", String(consentTerms));
      formData.append("consentTimestamp", new Date().toISOString());
      formData.append("consentPageUrl", window.location.href);
      formData.append("policy", file);

      const res = await fetch(`/api/check/${token}/submit`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Submission failed");
      }

      router.push(`/check/${token}/results`);
    } catch (err) {
      console.error("Submit error:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="form-card">
      {/* Step Indicator */}
      <div className="step-indicator">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`step-dot ${s === step ? "active" : s < step ? "complete" : ""}`}
          />
        ))}
      </div>

      {/* STEP 1: Contact Info + Claim Type */}
      <div className={`form-step ${step === 1 ? "active" : ""}`}>
        <h3>Your info</h3>
        <p className="step-desc">
          Help your contractor understand your situation
        </p>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First name</label>
            <input
              id="firstName"
              type="text"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              type="text"
              placeholder="Smith"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="address">Property address</label>
          <input
            id="address"
            type="text"
            placeholder="123 Main St, Atlanta, GA 30301"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="claimType">Type of damage</label>
          <select
            id="claimType"
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
          >
            <option value="">Select damage type</option>
            {CLAIM_TYPES.map((ct) => (
              <option key={ct.value} value={ct.value}>
                {ct.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => goNext(2)}>
          Continue <ArrowRight size={16} />
        </button>
      </div>

      {/* STEP 2: Upload Policy */}
      <div className={`form-step ${step === 2 ? "active" : ""}`}>
        <h3>Upload your policy</h3>
        <p className="step-desc">
          Upload your homeowners insurance declarations page or full policy PDF
        </p>
        <div className="form-group">
          <label htmlFor="carrier">Insurance carrier</label>
          <select
            id="carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          >
            <option value="">Select your carrier</option>
            {CARRIERS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Policy PDF</label>
          <div
            className={`upload-zone ${file ? "has-file" : ""} ${dragOver ? "dragover" : ""}`}
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
              accept=".pdf"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                cursor: "pointer",
              }}
            />
            <div className="upload-icon">
              {file ? <CheckCircle size={24} /> : <Upload size={24} />}
            </div>
            {file ? (
              <>
                <h4>{file.name}</h4>
                <p>{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
              </>
            ) : (
              <>
                <h4>Drop your policy here or click to browse</h4>
                <p>PDF &middot; Max 25MB</p>
              </>
            )}
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => goNext(3)}
          disabled={!file}
        >
          Continue <ArrowRight size={16} />
        </button>
        <button className="btn btn-back" onClick={() => setStep(1)}>
          &larr; Back
        </button>
      </div>

      {/* STEP 3: Consent + Submit */}
      <div className={`form-step ${step === 3 ? "active" : ""}`}>
        <h3>Almost done</h3>
        <p className="step-desc">Review and submit your policy for analysis</p>

        {/* Summary */}
        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              fontWeight: 600,
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Submission Summary
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            {firstName} {lastName}
          </div>
          {address && (
            <div
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                marginBottom: 4,
              }}
            >
              {address}
            </div>
          )}
          {claimType && (
            <div
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                marginBottom: 4,
              }}
            >
              Damage type:{" "}
              {CLAIM_TYPES.find((ct) => ct.value === claimType)?.label ||
                claimType}
            </div>
          )}
          {carrier && (
            <div
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                marginBottom: 4,
              }}
            >
              {carrier}
            </div>
          )}
          <div
            style={{ fontSize: 14, color: "var(--accent)", fontWeight: 500 }}
          >
            {file ? `\u{1F4C4} ${file.name}` : "No policy uploaded"}
          </div>
        </div>

        {/* Terms */}
        <div className="consent-block">
          <div className="consent-item">
            <input
              type="checkbox"
              id="consentTerms"
              checked={consentTerms}
              onChange={(e) => setConsentTerms(e.target.checked)}
            />
            <label htmlFor="consentTerms">
              I agree to the <a href="/terms">Terms of Service</a> and{" "}
              <a href="/privacy">Privacy Policy</a>.
            </label>
          </div>
        </div>

        <button
          className="btn btn-primary"
          disabled={!consentTerms || submitting}
          onClick={handleSubmit}
        >
          {submitting ? (
            <>
              <span className="spinner" />
              Analyzing...
            </>
          ) : (
            <>
              Submit Policy <ArrowRight size={16} />
            </>
          )}
        </button>
        <button
          className="btn btn-back"
          onClick={() => setStep(2)}
          disabled={submitting}
        >
          &larr; Back
        </button>

        <p className="form-note">
          <Lock size={12} />
          Your data is encrypted and secure. Your policy will be analyzed by AI
          and shared with your contractor.
        </p>
      </div>
    </div>
  );
}
