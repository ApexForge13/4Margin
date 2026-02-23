"use client";

import { useCallback } from "react";
import { useWizard } from "./wizard-context";
import { parseEstimatePdf } from "@/lib/parsers/stub";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { FileList, type UploadedFile } from "@/components/upload/file-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export function StepEstimate() {
  const { state, dispatch, nextStep, canProceed } = useWizard();
  const { claimDetails, estimateParsingStatus } = state;

  const handleEstimateFiles = useCallback(
    async (files: File[]) => {
      const newFiles: UploadedFile[] = files.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));
      dispatch({ type: "ADD_ESTIMATE_FILES", files: newFiles });

      // Trigger parsing
      const file = files[0];
      if (file) {
        dispatch({ type: "SET_ESTIMATE_PARSING", status: "parsing" });
        try {
          const parsed = await parseEstimatePdf(file);
          dispatch({ type: "UPDATE_CLAIM_DETAILS", details: parsed });
          dispatch({ type: "SET_ESTIMATE_PARSING", status: "done" });
        } catch {
          dispatch({ type: "SET_ESTIMATE_PARSING", status: "error" });
        }
      }
    },
    [dispatch]
  );

  const handlePolicyFiles = useCallback(
    (files: File[]) => {
      const newFiles: UploadedFile[] = files.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));
      dispatch({ type: "ADD_POLICY_FILES", files: newFiles });
    },
    [dispatch]
  );

  const updateField = (field: string, value: string) => {
    dispatch({ type: "UPDATE_CLAIM_DETAILS", details: { [field]: value } });
  };

  const isParsing = estimateParsingStatus === "parsing";

  return (
    <div className="space-y-8">
      {/* Estimate Upload */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">
            Adjuster Estimate
            <span className="ml-2 text-xs font-medium text-red-500 uppercase">
              Required
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload the PDF estimate from the insurance adjuster. We&apos;ll
            extract claim details automatically.
          </p>
        </div>
        <FileDropzone
          accept=".pdf,application/pdf"
          maxSizeMB={25}
          multiple={false}
          label="Drop the adjuster's PDF estimate here"
          description="PDF files only — this is the Xactimate scope from the carrier"
          icon={
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
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          }
          onFilesSelected={handleEstimateFiles}
        />
        <FileList
          files={state.estimateFiles}
          onRemove={(i) => dispatch({ type: "REMOVE_ESTIMATE_FILE", index: i })}
        />
      </div>

      <Separator />

      {/* Policy Upload */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">
            Insurance Policy
            <span className="ml-2 text-xs font-medium text-muted-foreground uppercase">
              Optional
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload the homeowner&apos;s insurance policy to help verify coverage
            and endorsements.
          </p>
        </div>
        <FileDropzone
          accept=".pdf,application/pdf"
          maxSizeMB={25}
          multiple={true}
          label="Drop policy documents here"
          description="PDF files only — declarations page, full policy, or endorsements"
          icon={
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
          onFilesSelected={handlePolicyFiles}
        />
        <FileList
          files={state.policyFiles}
          onRemove={(i) => dispatch({ type: "REMOVE_POLICY_FILE", index: i })}
        />
      </div>

      <Separator />

      {/* Claim Details Form */}
      <div className="space-y-4 relative">
        <div>
          <h2 className="text-lg font-semibold">Claim Details</h2>
          <p className="text-sm text-muted-foreground">
            {isParsing
              ? "Analyzing document..."
              : estimateParsingStatus === "done"
                ? "Review the extracted details below and make any corrections."
                : "Enter the claim information from the estimate."}
          </p>
        </div>

        {/* Parsing overlay */}
        {isParsing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm font-medium text-muted-foreground">
                Analyzing estimate...
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="claimNumber">Claim number *</Label>
            <Input
              id="claimNumber"
              placeholder="e.g. CLM-2024-001234"
              value={claimDetails.claimNumber}
              onChange={(e) => updateField("claimNumber", e.target.value)}
              disabled={isParsing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyNumber">Policy number</Label>
            <Input
              id="policyNumber"
              placeholder="e.g. HO-9876543"
              value={claimDetails.policyNumber}
              onChange={(e) => updateField("policyNumber", e.target.value)}
              disabled={isParsing}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="claimDescription">Claim description *</Label>
          <Textarea
            id="claimDescription"
            placeholder="Briefly describe the claim situation — e.g. &quot;Hail storm on 3/15 damaged the entire north-facing slope. Adjuster only scoped partial ridge cap and missed starter strip entirely. Homeowner reported interior leak at valley.&quot;"
            rows={4}
            value={claimDetails.claimDescription}
            onChange={(e) => updateField("claimDescription", e.target.value)}
            disabled={isParsing}
            className="resize-y"
          />
          <p className="text-xs text-muted-foreground">
            This helps us understand the full picture and build stronger supplement justifications.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="carrierName">Insurance carrier</Label>
            <Input
              id="carrierName"
              placeholder="e.g. State Farm, Allstate"
              value={claimDetails.carrierName}
              onChange={(e) => updateField("carrierName", e.target.value)}
              disabled={isParsing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfLoss">Date of loss</Label>
            <Input
              id="dateOfLoss"
              type="date"
              value={claimDetails.dateOfLoss}
              onChange={(e) => updateField("dateOfLoss", e.target.value)}
              disabled={isParsing}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="propertyAddress">Property address *</Label>
          <Input
            id="propertyAddress"
            placeholder="123 Main St"
            value={claimDetails.propertyAddress}
            onChange={(e) => updateField("propertyAddress", e.target.value)}
            disabled={isParsing}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="propertyCity">City</Label>
            <Input
              id="propertyCity"
              placeholder="Dallas"
              value={claimDetails.propertyCity}
              onChange={(e) => updateField("propertyCity", e.target.value)}
              disabled={isParsing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyState">State</Label>
            <Input
              id="propertyState"
              placeholder="TX"
              maxLength={2}
              value={claimDetails.propertyState}
              onChange={(e) =>
                updateField("propertyState", e.target.value.toUpperCase())
              }
              disabled={isParsing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyZip">ZIP</Label>
            <Input
              id="propertyZip"
              placeholder="75201"
              maxLength={10}
              value={claimDetails.propertyZip}
              onChange={(e) => updateField("propertyZip", e.target.value)}
              disabled={isParsing}
            />
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="adjusterName">Adjuster name</Label>
            <Input
              id="adjusterName"
              placeholder="John Smith"
              value={claimDetails.adjusterName}
              onChange={(e) => updateField("adjusterName", e.target.value)}
              disabled={isParsing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjusterEmail">Adjuster email</Label>
            <Input
              id="adjusterEmail"
              type="email"
              placeholder="john@carrier.com"
              value={claimDetails.adjusterEmail}
              onChange={(e) => updateField("adjusterEmail", e.target.value)}
              disabled={isParsing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjusterPhone">Adjuster phone</Label>
            <Input
              id="adjusterPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={claimDetails.adjusterPhone}
              onChange={(e) => updateField("adjusterPhone", e.target.value)}
              disabled={isParsing}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex justify-end">
        <Button onClick={nextStep} disabled={!canProceed() || isParsing}>
          Next: Photos &amp; Notes
        </Button>
      </div>
    </div>
  );
}
