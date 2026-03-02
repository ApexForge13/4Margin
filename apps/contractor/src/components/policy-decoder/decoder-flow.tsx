"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  uploadPolicyFile,
  unlockFreeDecoding,
} from "@/app/(dashboard)/dashboard/policy-decoder/actions";
import { PolicyDecoderResults } from "./decoder-results";

/* ─── Types ─── */

type Phase =
  | "upload"
  | "uploading"
  | "payment"
  | "paying"
  | "processing"
  | "complete"
  | "error";

interface DecoderFlowProps {
  decodingId: string;
  isFirstDecode: boolean;
  /** Pre-computed starting phase from the server component */
  initialPhase: Phase;
  fileName: string | null;
  /** If already complete, the analysis data */
  analysis: Record<string, unknown> | null;
  documentMeta: Record<string, unknown> | null;
  /** True when paid + hasFile + status still draft — triggers auto-process */
  autoProcess: boolean;
}

/* ─── Claim types ─── */

const CLAIM_TYPES = [
  { value: "", label: "Any / General" },
  { value: "hail", label: "Hail" },
  { value: "wind", label: "Wind" },
  { value: "water", label: "Water / Flood" },
  { value: "fire", label: "Fire" },
  { value: "other", label: "Other" },
] as const;

/* ─── Processing steps ─── */

const PROCESSING_STEPS = [
  "Uploading to secure storage",
  "Parsing PDF document",
  "Analyzing coverages & exclusions",
  "Identifying risks & landmines",
  "Generating report",
] as const;

/* ─── Component ─── */

export function DecoderFlow({
  decodingId,
  isFirstDecode,
  initialPhase,
  fileName: initialFileName,
  analysis: initialAnalysis,
  documentMeta: initialDocumentMeta,
  autoProcess,
}: DecoderFlowProps) {
  const router = useRouter();

  // ── State ──
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [fileName, setFileName] = useState<string | null>(initialFileName);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(
    initialAnalysis
  );
  const [documentMeta, setDocumentMeta] = useState<Record<
    string,
    unknown
  > | null>(initialDocumentMeta);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Claim context
  const [claimType, setClaimType] = useState("");
  const [claimDescription, setClaimDescription] = useState("");

  // Refs for timers
  const processingTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoProcessedRef = useRef(false);

  // ── Cleanup timers on unmount ──
  useEffect(() => {
    return () => {
      if (processingTimerRef.current) clearInterval(processingTimerRef.current);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, []);

  // ── Auto-process on mount when conditions are met ──
  useEffect(() => {
    if (autoProcess && !autoProcessedRef.current) {
      autoProcessedRef.current = true;
      startProcessing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoProcess]);

  // ── Start processing (call the parse API) ──
  const startProcessing = useCallback(async () => {
    setPhase("processing");
    setProcessingStep(1); // Skip step 0 ("uploading") since file is already uploaded
    setElapsedSeconds(0);

    // Start elapsed timer
    processingTimerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    // Advance steps on a timed schedule
    stepTimerRef.current = setInterval(() => {
      setProcessingStep((s) => {
        if (s < PROCESSING_STEPS.length - 1) return s + 1;
        return s;
      });
    }, 10000); // advance step every 10s

    try {
      const res = await fetch("/api/parse/policy-standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyDecodingId: decodingId }),
      });

      // Stop timers
      if (processingTimerRef.current)
        clearInterval(processingTimerRef.current);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Processing failed");
      }

      const data = await res.json();

      // Store results for inline display
      setAnalysis(data.analysis);
      setDocumentMeta({
        documentType: data.analysis?.documentType,
        scanQuality: data.analysis?.scanQuality,
        endorsementFormNumbers: data.analysis?.endorsementFormNumbers,
      });
      setProcessingStep(PROCESSING_STEPS.length); // all steps done
      setPhase("complete");
      toast.success("Policy decoded successfully!");
    } catch (err) {
      if (processingTimerRef.current)
        clearInterval(processingTimerRef.current);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);

      setErrorMessage(
        err instanceof Error ? err.message : "Processing failed"
      );
      setPhase("error");
      toast.error(err instanceof Error ? err.message : "Processing failed");
    }
  }, [decodingId]);

  // ── Handle file upload ──
  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
        toast.error("Please upload a PDF file");
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        toast.error("File must be under 25 MB");
        return;
      }

      setFileName(file.name);
      setPhase("uploading");
      setUploadProgress(0);

      // Animate progress bar during upload
      const progressTimer = setInterval(() => {
        setUploadProgress((p) => {
          if (p >= 90) {
            clearInterval(progressTimer);
            return 90;
          }
          return p + Math.random() * 15;
        });
      }, 200);

      try {
        // 1. Upload to Supabase storage
        const supabase = createClient();
        const storagePath = `policy-decoder/${decodingId}/${file.name}`;

        const { error: storageError } = await supabase.storage
          .from("temp-parsing")
          .upload(storagePath, file, { upsert: true });

        if (storageError) {
          throw new Error(storageError.message);
        }

        // 2. Update the decoding row with file path + claim context
        const { error: updateError } = await uploadPolicyFile(
          decodingId,
          storagePath,
          file.name,
          claimType || undefined,
          claimDescription || undefined
        );

        if (updateError) {
          throw new Error(updateError);
        }

        clearInterval(progressTimer);
        setUploadProgress(100);

        // 3. Check if this is a free decode — auto-unlock and proceed
        if (isFirstDecode) {
          const unlockResult = await unlockFreeDecoding(decodingId);
          if (unlockResult.error) {
            // Not actually free — fall through to payment
            setPhase("payment");
            return;
          }
          // Free decode unlocked — start processing immediately
          toast.success("First decode is free!");
          await startProcessing();
          return;
        }

        // 4. Not free — show payment gate
        setPhase("payment");
      } catch (err) {
        clearInterval(progressTimer);
        setErrorMessage(
          err instanceof Error ? err.message : "Upload failed"
        );
        setPhase("error");
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [decodingId, claimType, claimDescription, isFirstDecode, startProcessing]
  );

  // ── Handle payment button click ──
  const handlePay = useCallback(async () => {
    setPhase("paying");

    try {
      const res = await fetch("/api/stripe/policy-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyDecodingId: decodingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe (or back to this page if somehow free)
      window.location.href = data.url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Payment failed"
      );
      setPhase("payment");
    }
  }, [decodingId]);

  // ── Drag & drop handlers ──
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      e.target.value = "";
    },
    [handleFile]
  );

  // ── Reset to retry ──
  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setUploadProgress(0);
    setProcessingStep(0);
    setElapsedSeconds(0);
    setPhase("upload");
  }, []);

  // ──────────────────────────────────────────────────────────────
  //  RENDER
  // ──────────────────────────────────────────────────────────────

  /* ── Stepper bar ── */
  const stepLabels = ["Upload", "Payment", "Processing", "Results"];
  const stepIndex =
    phase === "upload" || phase === "uploading"
      ? 0
      : phase === "payment" || phase === "paying"
        ? 1
        : phase === "processing"
          ? 2
          : phase === "complete"
            ? 3
            : 0;

  const renderStepper = () => (
    <div className="flex items-center gap-1 mb-6">
      {stepLabels.map((label, i) => {
        const isActive = i === stepIndex;
        const isDone = i < stepIndex;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isDone
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive
                    ? "text-foreground"
                    : isDone
                      ? "text-green-600"
                      : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded transition-colors ${
                  isDone ? "bg-green-500" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  /* ── Upload phase ── */
  if (phase === "upload") {
    return (
      <div className="space-y-4">
        {renderStepper()}

        {/* Claim context fields — optional */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1">
              Claim Context{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Help the decoder focus on coverages and exclusions most relevant to
              your claim.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="claim-type"
                className="text-xs font-medium text-muted-foreground block mb-1"
              >
                Damage Type
              </label>
              <select
                id="claim-type"
                value={claimType}
                onChange={(e) => setClaimType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CLAIM_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="claim-desc"
                className="text-xs font-medium text-muted-foreground block mb-1"
              >
                Claim Description
              </label>
              <input
                id="claim-desc"
                type="text"
                value={claimDescription}
                onChange={(e) => setClaimDescription(e.target.value)}
                placeholder="e.g., Hail damage to roof, siding, and gutters"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* File drop zone */}
        <div
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="mx-auto flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                Upload your insurance policy
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Drag & drop a PDF, or click Browse. Max 25 MB.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                For best results, upload the{" "}
                <span className="font-medium">full policy</span> — not just the
                declarations page.
              </p>
            </div>
            <label>
              <Button variant="outline" asChild>
                <span>Browse Files</span>
              </Button>
              <input
                type="file"
                className="sr-only"
                accept=".pdf,application/pdf"
                onChange={handleFileInput}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  /* ── Uploading phase ── */
  if (phase === "uploading") {
    return (
      <div className="space-y-4">
        {renderStepper()}
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-8">
          <div className="mx-auto flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-6 w-6 text-blue-600 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-900">
                Uploading policy...
              </h3>
              {fileName && (
                <p className="text-sm text-blue-700 mt-1">{fileName}</p>
              )}
            </div>
            {/* Progress bar */}
            <div className="w-full max-w-md">
              <div className="h-2 rounded-full bg-blue-200 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-blue-600 mt-1 text-center">
                {Math.round(Math.min(uploadProgress, 100))}%
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Payment phase ── */
  if (phase === "payment" || phase === "paying") {
    return (
      <div className="space-y-4">
        {renderStepper()}
        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-8 text-center">
          <div className="mx-auto flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Policy uploaded!</h3>
              {fileName && (
                <p className="text-sm text-muted-foreground mt-1">
                  {fileName}
                </p>
              )}
            </div>
            <div className="border-t pt-4 mt-2 w-full max-w-sm">
              <p className="text-sm text-muted-foreground mb-4">
                Pay <span className="font-semibold text-foreground">$50</span>{" "}
                to decode your policy and get a full coverage analysis.
              </p>
              <Button
                size="lg"
                onClick={handlePay}
                disabled={phase === "paying"}
                className="w-full"
              >
                {phase === "paying" ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Redirecting to checkout...
                  </span>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    Pay $50 to Decode
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Processing phase ── */
  if (phase === "processing") {
    const formatTime = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return mins > 0
        ? `${mins}:${secs.toString().padStart(2, "0")}`
        : `${secs}s`;
    };

    return (
      <div className="space-y-4">
        {renderStepper()}
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-8">
          <div className="mx-auto flex flex-col items-center gap-5 max-w-md">
            {/* Spinner */}
            <svg
              className="h-10 w-10 animate-spin text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-900">
                Decoding your policy...
              </h3>
              <p className="text-sm text-blue-600 mt-1">
                Elapsed: {formatTime(elapsedSeconds)}
              </p>
            </div>

            {/* Step indicators */}
            <div className="w-full space-y-2.5">
              {PROCESSING_STEPS.map((step, i) => {
                const isDone = i < processingStep;
                const isCurrent = i === processingStep;
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-3 text-sm transition-opacity ${
                      isDone || isCurrent ? "opacity-100" : "opacity-40"
                    }`}
                  >
                    {isDone ? (
                      <svg
                        className="h-5 w-5 text-green-500 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : isCurrent ? (
                      <svg
                        className="h-5 w-5 animate-spin text-blue-500 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 shrink-0" />
                    )}
                    <span
                      className={
                        isDone
                          ? "text-green-700 line-through"
                          : isCurrent
                            ? "text-blue-900 font-medium"
                            : "text-gray-500"
                      }
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="w-full">
              <div className="h-1.5 rounded-full bg-blue-200 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.min(
                      (processingStep / PROCESSING_STEPS.length) * 100,
                      95
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error phase ── */
  if (phase === "error") {
    return (
      <div className="space-y-4">
        {renderStepper()}
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto flex flex-col items-center gap-3">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-red-900">
              Something went wrong
            </h3>
            <p className="text-sm text-red-700 mb-2">
              {errorMessage || "Try uploading again or contact support."}
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Complete phase — inline results ── */
  if (phase === "complete" && analysis) {
    return (
      <div className="space-y-6">
        {renderStepper()}

        {/* Success banner */}
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-center gap-2">
          <svg
            className="h-5 w-5 text-green-500 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>
            Policy decoded successfully!
            {fileName && (
              <>
                {" "}
                — <span className="font-medium">{fileName}</span>
              </>
            )}
          </span>
        </div>

        {/* Download PDF button */}
        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <a
              href={`/api/policy-decoder/${decodingId}/download`}
              download
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download PDF
            </a>
          </Button>
        </div>

        <PolicyDecoderResults
          analysis={analysis}
          documentMeta={documentMeta}
        />
      </div>
    );
  }

  // Fallback — shouldn't reach here
  return null;
}
