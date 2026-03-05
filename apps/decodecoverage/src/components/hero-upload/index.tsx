"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

export function HeroUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Capture UTM params
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

  if (uploading) {
    return (
      <div className="hero-upload-zone uploading">
        <div className="upload-spinner" />
        <p style={{ marginTop: 12, fontWeight: 500 }}>
          Uploading &amp; analyzing...
        </p>
        <p
          style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}
        >
          This takes about 30–60 seconds. Don&apos;t close this page.
        </p>
      </div>
    );
  }

  return (
    <div>
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

      <p
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          marginTop: 16,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        Your policy is encrypted and analyzed by AI only. No human reads your
        document.
      </p>
    </div>
  );
}
