"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { uploadPolicyFile } from "@/app/(dashboard)/dashboard/policy-decoder/actions";

interface PolicyUploadProps {
  decodingId: string;
}

const CLAIM_TYPES = [
  { value: "", label: "Any / General" },
  { value: "hail", label: "Hail" },
  { value: "wind", label: "Wind" },
  { value: "water", label: "Water / Flood" },
  { value: "fire", label: "Fire" },
  { value: "other", label: "Other" },
] as const;

/**
 * Drag-and-drop PDF upload for a paid policy decoding.
 * Includes optional claim context fields so the decoder
 * can focus on damage-specific coverages and exclusions.
 */
export function PolicyUpload({ decodingId }: PolicyUploadProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "done" | "error"
  >("idle");
  const [fileName, setFileName] = useState<string | null>(null);

  // Claim context fields
  const [claimType, setClaimType] = useState("");
  const [claimDescription, setClaimDescription] = useState("");

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
      setUploading(true);
      setUploadStatus("uploading");

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

        setUploadStatus("processing");

        // 3. Trigger the parse API
        const res = await fetch("/api/parse/policy-standalone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ policyDecodingId: decodingId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Processing failed");
        }

        setUploadStatus("done");
        toast.success("Policy decoded successfully!");
        router.refresh();
      } catch (err) {
        setUploadStatus("error");
        toast.error(
          err instanceof Error ? err.message : "Upload failed"
        );
      } finally {
        setUploading(false);
      }
    },
    [decodingId, router, claimType, claimDescription]
  );

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

  if (uploadStatus === "processing") {
    return (
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-8 text-center">
        <div className="mx-auto flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-blue-500"
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
          <h3 className="text-lg font-semibold text-blue-900">
            Decoding your policy...
          </h3>
          <p className="text-sm text-blue-700">
            {fileName && <span className="font-medium">{fileName}</span>}
            {" — "}
            This typically takes 30-60 seconds. Our AI is analyzing coverages,
            deductibles, endorsements, and exclusions.
          </p>
        </div>
      </div>
    );
  }

  if (uploadStatus === "done") {
    return (
      <div className="rounded-lg border-2 border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 text-green-500"
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
          <h3 className="text-lg font-semibold text-green-900">
            Policy decoded!
          </h3>
          <p className="text-sm text-green-700">
            Scroll down to see the results.
          </p>
        </div>
      </div>
    );
  }

  if (uploadStatus === "error") {
    return (
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
            Processing failed
          </h3>
          <p className="text-sm text-red-700 mb-2">
            Try uploading again or contact support.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadStatus("idle")}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Claim context fields — optional */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div>
          <h4 className="text-sm font-medium mb-1">Claim Context <span className="text-muted-foreground font-normal">(optional)</span></h4>
          <p className="text-xs text-muted-foreground">
            Help the decoder focus on coverages and exclusions most relevant to your claim.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="claim-type" className="text-xs font-medium text-muted-foreground block mb-1">
              Damage Type
            </label>
            <select
              id="claim-type"
              value={claimType}
              onChange={(e) => setClaimType(e.target.value)}
              disabled={uploading}
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
            <label htmlFor="claim-desc" className="text-xs font-medium text-muted-foreground block mb-1">
              Claim Description
            </label>
            <input
              id="claim-desc"
              type="text"
              value={claimDescription}
              onChange={(e) => setClaimDescription(e.target.value)}
              disabled={uploading}
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
              For best results, upload the <span className="font-medium">full policy</span> — not just the declarations page.
            </p>
          </div>
          <label>
            <Button variant="outline" asChild disabled={uploading}>
              <span>{uploading ? "Uploading..." : "Browse Files"}</span>
            </Button>
            <input
              type="file"
              className="sr-only"
              accept=".pdf,application/pdf"
              onChange={handleFileInput}
              disabled={uploading}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
