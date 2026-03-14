"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { FileList } from "@/components/upload/file-list";
import { toast } from "sonner";
import { createSupplementFromJob } from "./actions";

// ── Types ──────────────────────────────────────────────────

interface JobContext {
  jobId: string;
  companyId: string;
  propertyAddress: string | null;
  propertyCity: string | null;
  propertyState: string | null;
  propertyZip: string | null;
  claimNumber: string | null;
  policyNumber: string | null;
  dateOfLoss: string | null;
  carrierName: string | null;
  carrierId: string | null;
  adjusterName: string | null;
  adjusterEmail: string | null;
  adjusterPhone: string | null;
  jobName: string;
  hasMeasurements: boolean;
  roofSquares: number | null;
  roofPitch: string | null;
  hasInspection: boolean;
  inspectionStatus: string | null;
  hasPolicy: boolean;
  policyStatus: string | null;
  policyStoragePath: string | null;
  photoCount: number;
  existingSupplementCount: number;
}

interface JobSupplementFormProps {
  jobContext: JobContext;
}

// ── Component ──────────────────────────────────────────────

export function JobSupplementForm({ jobContext }: JobSupplementFormProps) {
  const router = useRouter();
  const [estimateFiles, setEstimateFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleFilesSelected = useCallback((files: File[]) => {
    setEstimateFiles((prev) => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setEstimateFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async () => {
    if (estimateFiles.length === 0) {
      toast.error("Please upload an adjuster estimate PDF.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress("Uploading estimate...");

    try {
      // Upload estimate to Supabase Storage
      const file = estimateFiles[0];
      const ext = file.name.split(".").pop() || "pdf";
      const storagePath = `${jobContext.companyId}/${jobContext.jobId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("estimates")
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        setIsSubmitting(false);
        return;
      }

      setUploadProgress("Creating supplement...");

      // Create supplement via server action
      const result = await createSupplementFromJob({
        jobId: jobContext.jobId,
        companyId: jobContext.companyId,
        estimateStoragePath: storagePath,
        policyStoragePath: jobContext.policyStoragePath,
      });

      if (result.error) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      toast.success("Supplement created successfully!");
      router.push(`/dashboard/supplements/${result.supplementId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setIsSubmitting(false);
    }
  };

  const fullAddress = [
    jobContext.propertyAddress,
    [jobContext.propertyCity, jobContext.propertyState, jobContext.propertyZip]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join(", ");

  const uploadedFiles = estimateFiles.map((f) => ({
    file: f,
    progress: 0,
    status: "pending" as const,
  }));

  return (
    <>
      {/* Back nav */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/dashboard/jobs/${jobContext.jobId}`}>
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Job
        </Link>
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New Supplement
        </h1>
        <p className="text-muted-foreground mt-1">
          {jobContext.jobName}
        </p>
      </div>

      {/* Baltimore pricing disclaimer */}
      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
        <svg
          className="h-4 w-4 text-blue-600 mt-0.5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-blue-800">
          Note: All pricing in this supplement reflects Baltimore, MD area
          Xactimate pricing. Actual pricing may vary by region.
        </p>
      </div>

      {/* Job Context Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Context</CardTitle>
          <CardDescription>
            The following data from this job will be used automatically. Only an
            adjuster estimate upload is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Claim Details */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Claim Details
              </h3>
              <ContextRow label="Property" value={fullAddress} />
              <ContextRow label="Claim #" value={jobContext.claimNumber} />
              <ContextRow label="Policy #" value={jobContext.policyNumber} />
              <ContextRow label="Carrier" value={jobContext.carrierName} />
              <ContextRow
                label="Date of Loss"
                value={
                  jobContext.dateOfLoss
                    ? new Date(jobContext.dateOfLoss).toLocaleDateString("en-US")
                    : null
                }
              />
            </div>

            {/* Adjuster Info */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Adjuster
              </h3>
              <ContextRow label="Name" value={jobContext.adjusterName} />
              <ContextRow label="Email" value={jobContext.adjusterEmail} />
              <ContextRow label="Phone" value={jobContext.adjusterPhone} />
            </div>
          </div>

          <Separator className="my-4" />

          {/* Available Data Indicators */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Available Data
            </h3>
            <div className="flex flex-wrap gap-2">
              <DataBadge
                label="Measurements"
                available={jobContext.hasMeasurements}
                detail={
                  jobContext.hasMeasurements
                    ? `${jobContext.roofSquares ?? "?"} sq, ${jobContext.roofPitch ?? "?"} pitch`
                    : undefined
                }
              />
              <DataBadge
                label="Inspection"
                available={jobContext.hasInspection}
                detail={jobContext.inspectionStatus ?? undefined}
              />
              <DataBadge
                label="Policy Analysis"
                available={jobContext.hasPolicy}
                detail={jobContext.policyStatus ?? undefined}
              />
              <DataBadge
                label="Photos"
                available={jobContext.photoCount > 0}
                detail={
                  jobContext.photoCount > 0
                    ? `${jobContext.photoCount} photo${jobContext.photoCount !== 1 ? "s" : ""}`
                    : undefined
                }
              />
            </div>
          </div>

          {jobContext.existingSupplementCount > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <svg
                  className="h-4 w-4 text-amber-600 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <p className="text-sm text-amber-800">
                  This job already has {jobContext.existingSupplementCount}{" "}
                  supplement{jobContext.existingSupplementCount !== 1 ? "s" : ""}.
                  This will create an additional supplement.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Estimate Upload — the only required input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Adjuster Estimate
            <span className="text-destructive ml-1">*</span>
          </CardTitle>
          <CardDescription>
            Upload the adjuster&apos;s Xactimate estimate PDF. This is the only
            file you need to provide — all other data will be pulled from the
            job.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileDropzone
            accept=".pdf"
            maxSizeMB={25}
            multiple={false}
            label="Drop your estimate PDF here"
            description="PDF up to 25MB"
            icon={
              <svg
                className="h-8 w-8 text-muted-foreground"
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
            }
            onFilesSelected={handleFilesSelected}
          />

          {uploadedFiles.length > 0 && (
            <FileList files={uploadedFiles} onRemove={handleRemoveFile} />
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/jobs/${jobContext.jobId}`}>Cancel</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={estimateFiles.length === 0 || isSubmitting}
          className="min-w-[160px]"
        >
          {isSubmitting ? (
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {uploadProgress}
            </span>
          ) : (
            "Create Supplement"
          )}
        </Button>
      </div>
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────

function ContextRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right truncate">
        {value || <span className="text-muted-foreground italic">Not set</span>}
      </span>
    </div>
  );
}

function DataBadge({
  label,
  available,
  detail,
}: {
  label: string;
  available: boolean;
  detail?: string;
}) {
  return (
    <Badge
      variant={available ? "default" : "outline"}
      className={
        available
          ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
          : "text-muted-foreground"
      }
    >
      {available ? (
        <svg
          className="mr-1 h-3 w-3"
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
      ) : (
        <svg
          className="mr-1 h-3 w-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 12H4"
          />
        </svg>
      )}
      {label}
      {detail && available && (
        <span className="ml-1 text-xs opacity-70">({detail})</span>
      )}
    </Badge>
  );
}
