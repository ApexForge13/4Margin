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

export function ScanForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Form data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [carrier, setCarrier] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentContact, setConsentContact] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 6)
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    if (digits.length >= 3)
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return digits;
  };

  const goNext = (nextStep: number) => {
    if (step === 1 && (!firstName || !lastName || !email || !phone)) return;
    if (step === 2 && (!address || !carrier)) return;
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
    if (!consentTerms) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("address", address);
      formData.append("carrier", carrier);
      formData.append("consentTerms", String(consentTerms));
      formData.append("consentContact", String(consentContact));
      formData.append("consentTimestamp", new Date().toISOString());

      // UTM params
      const params = new URLSearchParams(window.location.search);
      formData.append("utmSource", params.get("utm_source") || "direct");
      formData.append("utmMedium", params.get("utm_medium") || "");
      formData.append("utmCampaign", params.get("utm_campaign") || "");

      if (file) {
        formData.append("policy", file);
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }

      const { id } = await res.json();
      router.push(`/results/${id}`);
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

      {/* STEP 1: Contact Info */}
      <div className={`form-step ${step === 1 ? "active" : ""}`}>
        <h3>Your info</h3>
        <p className="step-desc">So we can send your scan results</p>
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
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
        <button className="btn btn-primary" onClick={() => goNext(2)}>
          Continue <ArrowRight size={16} />
        </button>
      </div>

      {/* STEP 2: Property + Upload */}
      <div className={`form-step ${step === 2 ? "active" : ""}`}>
        <h3>Your property</h3>
        <p className="step-desc">Help us understand your coverage needs</p>
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
          <label htmlFor="carrier">Current insurance carrier</label>
          <select
            id="carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          >
            <option value="" disabled>
              Select your carrier
            </option>
            {CARRIERS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Upload your policy (PDF)</label>
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
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
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
        <button className="btn btn-primary" onClick={() => goNext(3)}>
          Continue <ArrowRight size={16} />
        </button>
        <button className="btn btn-back" onClick={() => setStep(1)}>
          &larr; Back
        </button>
      </div>

      {/* STEP 3: Consent + Submit */}
      <div className={`form-step ${step === 3 ? "active" : ""}`}>
        <h3>Almost done</h3>
        <p className="step-desc">Review and start your free scan</p>

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
            Scan Summary
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            {firstName} {lastName}
          </div>
          <div
            style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}
          >
            {address}
          </div>
          <div
            style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}
          >
            {carrier}
          </div>
          <div style={{ fontSize: 14, color: "var(--accent)", fontWeight: 500 }}>
            {file ? `\u{1F4C4} ${file.name}` : "No policy uploaded"}
          </div>
        </div>

        {/* Consent */}
        <div className="consent-block">
          <div className="consent-item">
            <input
              type="checkbox"
              id="consentTerms"
              checked={consentTerms}
              onChange={(e) => setConsentTerms(e.target.checked)}
            />
            <label htmlFor="consentTerms">
              <span className="consent-required">Required.</span> I agree to the{" "}
              <a href="/terms">Terms of Service</a> and{" "}
              <a href="/privacy">Privacy Policy</a>, and I understand my policy
              information will be analyzed by AI to provide my scan results.
            </label>
          </div>
          <div className="consent-item">
            <input
              type="checkbox"
              id="consentContact"
              checked={consentContact}
              onChange={(e) => setConsentContact(e.target.checked)}
            />
            <label htmlFor="consentContact">
              I consent to be contacted by licensed insurance professionals who
              may offer coverage options based on my scan results. I may receive
              calls, emails, or text messages at the number and email provided. I
              can opt out anytime by emailing{" "}
              <strong>optout@decodecoverage.com</strong> or replying STOP.{" "}
              <em>This is not required to receive your scan results.</em>
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
              Start My Free Scan
              <ArrowRight size={16} />
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
          Your data is encrypted and secure. We never share your information
          without your explicit consent.
        </p>
      </div>
    </div>
  );
}
