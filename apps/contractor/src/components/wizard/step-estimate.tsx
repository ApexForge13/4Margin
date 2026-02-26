"use client";

import { useCallback } from "react";
import { useWizard } from "./wizard-context";
import { parseEstimatePdf, parsePolicyPdf } from "@/lib/parsers/stub";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { FileList, type UploadedFile } from "@/components/upload/file-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

export function StepEstimate() {
  const { state, dispatch, nextStep, canProceed } = useWizard();
  const { claimDetails, estimateParsingStatus, policyParsingStatus, policyAnalysis } = state;

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
    async (files: File[]) => {
      const newFiles: UploadedFile[] = files.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));
      dispatch({ type: "ADD_POLICY_FILES", files: newFiles });

      // Trigger policy parsing on the first PDF
      const file = files[0];
      if (file) {
        dispatch({ type: "SET_POLICY_PARSING", status: "parsing" });
        try {
          const analysis = await parsePolicyPdf(file);
          dispatch({ type: "SET_POLICY_ANALYSIS", analysis });
          dispatch({ type: "SET_POLICY_PARSING", status: "done" });
        } catch (err) {
          console.error("[StepEstimate] Policy parse failed:", err);
          dispatch({ type: "SET_POLICY_PARSING", status: "error" });
        }
      }
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

        {/* Policy parsing status indicator */}
        {policyParsingStatus === "parsing" && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing policy for coverage, exclusions, and landmines…</span>
          </div>
        )}

        {policyParsingStatus === "error" && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span>Policy analysis failed — you can still proceed without it.</span>
          </div>
        )}

        {policyParsingStatus === "done" && policyAnalysis && (
          <PolicyQuickSummary analysis={policyAnalysis} />
        )}
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

        <Separator />

        {/* Claim Overview — narrative context */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Claim Overview</h3>
            <p className="text-sm text-muted-foreground">
              Help us understand what happened so we can build stronger supplement justifications.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="claimDescription">Describe the claim *</Label>
            <Textarea
              id="claimDescription"
              placeholder="e.g. &quot;Hail storm on 3/15 damaged the entire north-facing slope. Adjuster only scoped partial ridge cap and missed starter strip entirely. Homeowner reported interior leak at valley.&quot;"
              rows={3}
              value={claimDetails.claimDescription}
              onChange={(e) => updateField("claimDescription", e.target.value)}
              disabled={isParsing}
              className="resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemsBelievedMissing">
              What items are missing, incomplete, or underpaid in the adjuster&apos;s scope?
            </Label>
            <Textarea
              id="itemsBelievedMissing"
              placeholder="e.g. &quot;Adjuster scoped 22 SQ shingles + ridge cap but missed: starter strip, drip edge, ice &amp; water at valleys. Waste % should be 22% not 10% — hip/valley roof with 6 valleys and 4 dormers.&quot;"
              rows={3}
              value={claimDetails.itemsBelievedMissing}
              onChange={(e) =>
                updateField("itemsBelievedMissing", e.target.value)
              }
              disabled={isParsing}
              className="resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priorSupplementHistory">
              Previous supplement history
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Optional
              </span>
            </Label>
            <Textarea
              id="priorSupplementHistory"
              placeholder="e.g. &quot;First supplement submitted 1/15 for O&amp;P — denied. Second supplement for waste % submitted 2/1 — pending response.&quot;"
              rows={2}
              value={claimDetails.priorSupplementHistory}
              onChange={(e) =>
                updateField("priorSupplementHistory", e.target.value)
              }
              disabled={isParsing}
              className="resize-y"
            />
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="carrierName">Insurance carrier *</Label>
            <Input
              id="carrierName"
              placeholder="e.g. State Farm, Allstate"
              value={claimDetails.carrierName}
              onChange={(e) => updateField("carrierName", e.target.value)}
              disabled={isParsing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfLoss">Date of loss *</Label>
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
            <Label htmlFor="propertyCity">City *</Label>
            <Input
              id="propertyCity"
              placeholder="Dallas"
              value={claimDetails.propertyCity}
              onChange={(e) => updateField("propertyCity", e.target.value)}
              disabled={isParsing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyState">State *</Label>
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
            <Label htmlFor="propertyZip">ZIP *</Label>
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

/* ─── Policy Quick Summary (shown inline after parsing) ─── */

import type { PolicyAnalysis } from "@/lib/ai/policy-parser";

function PolicyQuickSummary({ analysis }: { analysis: PolicyAnalysis }) {
  const criticalLandmines = analysis.landmines.filter(
    (l) => l.severity === "critical"
  );
  const warningLandmines = analysis.landmines.filter(
    (l) => l.severity === "warning"
  );
  const hasDanger = criticalLandmines.length > 0;

  return (
    <div
      className={`rounded-lg border p-4 text-sm space-y-3 ${
        hasDanger
          ? "border-red-200 bg-red-50"
          : "border-green-200 bg-green-50"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 font-semibold">
        {hasDanger ? (
          <>
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <span className="text-red-800">
              Policy Analysis — {criticalLandmines.length} Landmine
              {criticalLandmines.length !== 1 ? "s" : ""} Detected
            </span>
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span className="text-green-800">Policy Analysis — Low Risk</span>
          </>
        )}
      </div>

      {/* Quick info row */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span>
          <strong>Type:</strong> {analysis.policyType || "—"}
        </span>
        <span>
          <strong>Carrier:</strong> {analysis.carrier || "—"}
        </span>
        <span>
          <strong>Depreciation:</strong> {analysis.depreciationMethod || "—"}
        </span>
        {analysis.deductibles[0] && (
          <span>
            <strong>Deductible:</strong> {analysis.deductibles[0].amount}
          </span>
        )}
      </div>

      {/* Critical landmines */}
      {criticalLandmines.length > 0 && (
        <div className="space-y-1">
          {criticalLandmines.map((l, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-red-800"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                <strong>{l.name}:</strong> {l.impact}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Warning landmines */}
      {warningLandmines.length > 0 && (
        <div className="space-y-1">
          {warningLandmines.map((l, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-amber-800"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                <strong>{l.name}:</strong> {l.impact}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Favorable provisions */}
      {analysis.favorableProvisions.length > 0 && (
        <div className="space-y-1">
          {analysis.favorableProvisions.map((p, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-green-800"
            >
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                <strong>{p.name}:</strong> {p.impact}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Contractor summary */}
      {analysis.summaryForContractor && (
        <p className="text-xs text-muted-foreground italic border-t pt-2">
          {analysis.summaryForContractor}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground/60">
        Educational summary only — not insurance or legal advice. Full analysis
        available after supplement generation.
      </p>
    </div>
  );
}
