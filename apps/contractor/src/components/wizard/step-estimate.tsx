"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWizard } from "./wizard-context";
import { parseEstimatePdf } from "@/lib/parsers/stub";
import { lookupCountyByZip } from "@/data/county-jurisdictions";
import type { CountyJurisdiction } from "@/data/county-jurisdictions";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { FileList, type UploadedFile } from "@/components/upload/file-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";

export function StepEstimate() {
  const { state, dispatch, nextStep, canProceed } = useWizard();
  const { claimDetails, estimateParsingStatus } = state;

  const [resolvedCounty, setResolvedCounty] = useState<CountyJurisdiction | null>(null);
  const [zipChecked, setZipChecked] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [geocodeCountyName, setGeocodeCountyName] = useState<string | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Geocode with Census API when we have a full address, debounced 800ms
  useEffect(() => {
    // Clear any pending timer
    if (geocodeTimerRef.current) {
      clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = null;
    }

    const street = claimDetails.propertyAddress?.trim();
    const city = claimDetails.propertyCity?.trim();
    const stateVal = claimDetails.propertyState?.trim();
    const zip = claimDetails.propertyZip?.trim();

    // Need at least street + city + state for geocoding
    if (street && street.length >= 3 && city && city.length >= 2 && stateVal && stateVal.length === 2) {
      geocodeTimerRef.current = setTimeout(async () => {
        setGeocodeStatus("loading");
        try {
          const res = await fetch("/api/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ street, city, state: stateVal, zip }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.countyJurisdiction) {
              // We have full jurisdiction data from our database
              setResolvedCounty(data.countyJurisdiction);
              setGeocodeCountyName(null);
            } else {
              // Census found the county but it's outside our coverage
              setResolvedCounty(null);
              setGeocodeCountyName(`${data.countyFull || data.county}, ${data.state}`);
            }
            setZipChecked(true);
            setGeocodeStatus("done");
          } else {
            // API error — fall back to ZIP lookup
            fallbackToZipLookup(zip);
            setGeocodeStatus("error");
          }
        } catch {
          // Network error — fall back to ZIP lookup
          fallbackToZipLookup(zip);
          setGeocodeStatus("error");
        }
      }, 800);
    } else {
      // Not enough address data — fall back to ZIP-only lookup
      fallbackToZipLookup(zip);
      setGeocodeStatus("idle");
    }

    return () => {
      if (geocodeTimerRef.current) {
        clearTimeout(geocodeTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimDetails.propertyAddress, claimDetails.propertyCity, claimDetails.propertyState, claimDetails.propertyZip]);

  /** Fall back to static ZIP-to-county lookup */
  function fallbackToZipLookup(zip: string | undefined) {
    if (zip && zip.length === 5 && /^\d{5}$/.test(zip)) {
      const county = lookupCountyByZip(zip) || null;
      setResolvedCounty(county);
      setGeocodeCountyName(null);
      setZipChecked(true);
    } else {
      setResolvedCounty(null);
      setGeocodeCountyName(null);
      setZipChecked(false);
    }
  }

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
      // Policy PDF is stored and analyzed during pipeline generation
      // with full claim context for better accuracy
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

        {/* Policy upload confirmation */}
        {state.policyFiles.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Policy uploaded — will be analyzed during supplement generation
              with your full claim details for better accuracy.
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Claim Details Form */}
      <div className="space-y-4 relative">
        <div>
          <h2 className="text-lg font-semibold">Job Details</h2>
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

        {/* Property Condition — intake questions */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Property Condition</h3>
            <p className="text-sm text-muted-foreground">
              These details help generate stronger supplement justifications.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guttersNailedThroughDripEdge">
                Are gutters nailed through drip edge?
              </Label>
              <select
                id="guttersNailedThroughDripEdge"
                value={claimDetails.guttersNailedThroughDripEdge}
                onChange={(e) =>
                  updateField("guttersNailedThroughDripEdge", e.target.value)
                }
                disabled={isParsing}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Not sure</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              <p className="text-xs text-muted-foreground">
                If yes, drip edge removal/replacement may require gutter re-hang.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roofUnderWarranty">
                Is current roof under manufacturer warranty?
              </Label>
              <select
                id="roofUnderWarranty"
                value={claimDetails.roofUnderWarranty}
                onChange={(e) =>
                  updateField("roofUnderWarranty", e.target.value)
                }
                disabled={isParsing}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Warranty status affects whether manufacturer installation requirements can be used in rebuttals.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preExistingConditions">
              Pre-existing conditions
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Optional
              </span>
            </Label>
            <Textarea
              id="preExistingConditions"
              placeholder='e.g. "Previous patch repairs on the north slope. Sagging gutters on east side. One layer of existing shingles — no prior tear-off."'
              rows={2}
              value={claimDetails.preExistingConditions}
              onChange={(e) =>
                updateField("preExistingConditions", e.target.value)
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

        {/* County verification status */}
        {geocodeStatus === "loading" && (
          <div className="mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200">
            <svg className="h-4 w-4 animate-spin text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Verifying address...
          </div>
        )}

        {zipChecked && geocodeStatus !== "loading" && (
          <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
            resolvedCounty
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}>
            {resolvedCounty ? (
              <>
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ✓ {resolvedCounty.county}, {resolvedCounty.state} — Zone {resolvedCounty.climateZone} — {resolvedCounty.state === "DE" ? "2021 IRC" : "2018 IRC"}
              </>
            ) : geocodeCountyName ? (
              <>
                <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {geocodeCountyName} — outside coverage area (MD/PA/DE). Supplement will generate without jurisdiction-specific code authority.
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Outside coverage area (MD/PA/DE). Supplement will generate without jurisdiction-specific code authority.
              </>
            )}
          </div>
        )}

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
