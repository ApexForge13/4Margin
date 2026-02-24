"use client";

import { useCallback, useMemo } from "react";
import { useWizard } from "./wizard-context";
import { parseMeasurementPdf } from "@/lib/parsers/stub";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { FileList, type UploadedFile } from "@/components/upload/file-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const DAMAGE_TYPES = [
  { value: "wind", label: "Wind" },
  { value: "hail", label: "Hail" },
  { value: "wind_hail", label: "Wind / Hail" },
  { value: "fire", label: "Fire" },
  { value: "impact", label: "Impact" },
  { value: "age_wear", label: "Age / Wear" },
];

export function StepMeasurements() {
  const { state, dispatch, nextStep, prevStep } = useWizard();
  const { measurementData, measurementParsingStatus } = state;
  const isParsing = measurementParsingStatus === "parsing";
  const isConfirmed = measurementData.confirmed;

  const handleMeasurementFiles = useCallback(
    async (files: File[]) => {
      const newFiles: UploadedFile[] = files.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));
      dispatch({ type: "ADD_MEASUREMENT_FILES", files: newFiles });

      // Trigger parsing
      const file = files[0];
      if (file) {
        dispatch({ type: "SET_MEASUREMENT_PARSING", status: "parsing" });
        try {
          const parsed = await parseMeasurementPdf(file);
          dispatch({ type: "UPDATE_MEASUREMENT_DATA", data: parsed });
          dispatch({ type: "SET_MEASUREMENT_PARSING", status: "done" });
        } catch {
          dispatch({ type: "SET_MEASUREMENT_PARSING", status: "error" });
        }
      }
    },
    [dispatch]
  );

  const updateField = (field: string, value: string) => {
    dispatch({ type: "UPDATE_MEASUREMENT_DATA", data: { [field]: value } });
  };

  // Auto-calculate suggested squares with waste
  const calculatedSuggestedSquares = useMemo(() => {
    const sq = parseFloat(measurementData.measuredSquares);
    const wp = parseFloat(measurementData.wastePercent);
    if (!isNaN(sq) && !isNaN(wp) && sq > 0) {
      return (sq * (1 + wp / 100)).toFixed(2);
    }
    return "";
  }, [measurementData.measuredSquares, measurementData.wastePercent]);

  return (
    <div className="space-y-8">
      {/* Measurement File Upload */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">
            Roof Measurements
            <span className="ml-2 text-xs font-medium text-muted-foreground uppercase">
              Optional
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload measurement reports from EagleView, HOVER, or other platforms.
            We&apos;ll extract the data automatically.
          </p>
        </div>
        <FileDropzone
          accept=".pdf,application/pdf"
          maxSizeMB={25}
          multiple={true}
          label="Drop measurement reports here"
          description="PDF files only — EagleView, HOVER, GAF QuickMeasure, Roofr, etc."
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
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          }
          onFilesSelected={handleMeasurementFiles}
        />
        <FileList
          files={state.measurementFiles}
          onRemove={(i) =>
            dispatch({ type: "REMOVE_MEASUREMENT_FILE", index: i })
          }
        />
      </div>

      <Separator />

      {/* Measurement Data Form */}
      <div className="space-y-6 relative">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Measurement Data</h2>
            <p className="text-sm text-muted-foreground">
              {isParsing
                ? "Analyzing measurement report..."
                : isConfirmed
                  ? "Measurements confirmed. Click Edit to make changes."
                  : "Review and enter the roof measurement values."}
            </p>
          </div>
          {isConfirmed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: "UNCONFIRM_MEASUREMENTS" })}
            >
              Edit
            </Button>
          )}
        </div>

        {/* Confirmed banner */}
        {isConfirmed && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
            <svg
              className="h-5 w-5 text-green-600 shrink-0"
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
            <p className="text-sm font-medium text-green-800">
              Measurements confirmed
            </p>
          </div>
        )}

        {/* Parsing overlay */}
        {isParsing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm font-medium text-muted-foreground">
                Analyzing measurement report...
              </p>
            </div>
          </div>
        )}

        {/* Info callout */}
        {!isConfirmed && state.measurementFiles.length === 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              Upload a measurement report above and we&apos;ll fill these fields
              automatically, or enter the values manually below.
            </p>
          </div>
        )}

        {/* ── Area Section ── */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Area
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="measuredSquares">Squares</Label>
              <Input
                id="measuredSquares"
                type="number"
                step="0.01"
                placeholder="e.g. 28.50"
                value={measurementData.measuredSquares}
                onChange={(e) => updateField("measuredSquares", e.target.value)}
                disabled={isParsing || isConfirmed}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wastePercent">Waste %</Label>
              <Input
                id="wastePercent"
                type="number"
                step="0.1"
                placeholder="e.g. 15"
                value={measurementData.wastePercent}
                onChange={(e) => updateField("wastePercent", e.target.value)}
                disabled={isParsing || isConfirmed}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggestedSquares">Suggested Squares w/ Waste</Label>
              <Input
                id="suggestedSquares"
                type="number"
                step="0.01"
                placeholder="auto-calculated"
                value={calculatedSuggestedSquares || measurementData.suggestedSquares}
                onChange={(e) => updateField("suggestedSquares", e.target.value)}
                disabled={isParsing || isConfirmed}
              />
              <p className="text-xs text-muted-foreground">
                {calculatedSuggestedSquares
                  ? "Auto-calculated from squares + waste %"
                  : "Enter squares & waste % to auto-calculate"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="steepSquares">Steep Squares</Label>
              <Input
                id="steepSquares"
                type="number"
                step="0.01"
                placeholder="e.g. 12.00"
                value={measurementData.steepSquares}
                onChange={(e) => updateField("steepSquares", e.target.value)}
                disabled={isParsing || isConfirmed}
              />
              <p className="text-xs text-muted-foreground">Pitch 7/12 or steeper</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="highStorySquares">High Story Squares</Label>
              <Input
                id="highStorySquares"
                type="number"
                step="0.01"
                placeholder="e.g. 8.00"
                value={measurementData.highStorySquares}
                onChange={(e) => updateField("highStorySquares", e.target.value)}
                disabled={isParsing || isConfirmed}
              />
              <p className="text-xs text-muted-foreground">2+ stories above ground</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="structureComplexity">Structure Complexity</Label>
              <select
                id="structureComplexity"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={measurementData.structureComplexity}
                onChange={(e) => updateField("structureComplexity", e.target.value)}
                disabled={isParsing || isConfirmed}
              >
                <option value="">—</option>
                <option value="Simple">Simple</option>
                <option value="Normal">Normal</option>
                <option value="Complex">Complex</option>
              </select>
            </div>
          </div>

          {/* Additional area fields — shown if populated from EagleView parsing */}
          {(measurementData.totalRoofArea || measurementData.totalRoofAreaLessPenetrations) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="totalRoofArea">Total Roof Area (sq ft)</Label>
                <Input
                  id="totalRoofArea"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 3169"
                  value={measurementData.totalRoofArea}
                  onChange={(e) => updateField("totalRoofArea", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalRoofAreaLessPenetrations">Less Penetrations (sq ft)</Label>
                <Input
                  id="totalRoofAreaLessPenetrations"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 3168"
                  value={measurementData.totalRoofAreaLessPenetrations}
                  onChange={(e) => updateField("totalRoofAreaLessPenetrations", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Pitch Breakdown (from EagleView) ── */}
        {measurementData.pitchBreakdown.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Pitch Breakdown
              </h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Pitch</th>
                      <th className="px-3 py-2 text-right font-medium">Area (sq ft)</th>
                      <th className="px-3 py-2 text-right font-medium">% of Roof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurementData.pitchBreakdown.map((pb, i) => {
                      const rise = parseInt(pb.pitch.split("/")[0]);
                      const isSteep = rise >= 7;
                      return (
                        <tr key={i} className={`border-b last:border-0 ${isSteep ? "bg-amber-50" : ""}`}>
                          <td className="px-3 py-2 font-mono">
                            {pb.pitch}
                            {isSteep && (
                              <span className="ml-2 text-xs font-medium text-amber-600">STEEP</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{pb.areaSqFt}</td>
                          <td className="px-3 py-2 text-right">{pb.percentOfRoof}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* ── Linear Measurements Section ── */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Lengths, Areas &amp; Counts
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ftRidges">Ridges</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="ftRidges"
                  type="number"
                  step="0.01"
                  placeholder="LF"
                  value={measurementData.ftRidges}
                  onChange={(e) => updateField("ftRidges", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
                <Input
                  type="number"
                  placeholder="#"
                  value={measurementData.numRidges}
                  onChange={(e) => updateField("numRidges", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ftHips">Hips</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="ftHips"
                  type="number"
                  step="0.01"
                  placeholder="LF"
                  value={measurementData.ftHips}
                  onChange={(e) => updateField("ftHips", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
                <Input
                  type="number"
                  placeholder="#"
                  value={measurementData.numHips}
                  onChange={(e) => updateField("numHips", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ftValleys">Valleys</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="ftValleys"
                  type="number"
                  step="0.01"
                  placeholder="LF"
                  value={measurementData.ftValleys}
                  onChange={(e) => updateField("ftValleys", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
                <Input
                  type="number"
                  placeholder="#"
                  value={measurementData.numValleys}
                  onChange={(e) => updateField("numValleys", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ftRakes">Rakes</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="ftRakes"
                  type="number"
                  step="0.01"
                  placeholder="LF"
                  value={measurementData.ftRakes}
                  onChange={(e) => updateField("ftRakes", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
                <Input
                  type="number"
                  placeholder="#"
                  value={measurementData.numRakes}
                  onChange={(e) => updateField("numRakes", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ftEaves">Eaves / Starter</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="ftEaves"
                  type="number"
                  step="0.01"
                  placeholder="LF"
                  value={measurementData.ftEaves}
                  onChange={(e) => updateField("ftEaves", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
                <Input
                  type="number"
                  placeholder="#"
                  value={measurementData.numEaves}
                  onChange={(e) => updateField("numEaves", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ftDripEdge">Drip Edge (Eaves + Rakes)</Label>
              <Input
                id="ftDripEdge"
                type="number"
                step="0.01"
                placeholder="LF"
                value={measurementData.ftDripEdge}
                onChange={(e) => updateField("ftDripEdge", e.target.value)}
                disabled={isParsing || isConfirmed}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ftParapet">Parapet Walls</Label>
              <Input
                id="ftParapet"
                type="number"
                step="0.01"
                placeholder="LF"
                value={measurementData.ftParapet}
                onChange={(e) => updateField("ftParapet", e.target.value)}
                disabled={isParsing || isConfirmed}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ftFlashing">Flashing</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="ftFlashing"
                  type="number"
                  step="0.01"
                  placeholder="LF"
                  value={measurementData.ftFlashing}
                  onChange={(e) => updateField("ftFlashing", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
                <Input
                  type="number"
                  placeholder="#"
                  value={measurementData.numFlashingLengths}
                  onChange={(e) => updateField("numFlashingLengths", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ftStepFlashing">Step Flashing</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="ftStepFlashing"
                  type="number"
                  step="0.01"
                  placeholder="LF"
                  value={measurementData.ftStepFlashing}
                  onChange={(e) => updateField("ftStepFlashing", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
                <Input
                  type="number"
                  placeholder="#"
                  value={measurementData.numStepFlashingLengths}
                  onChange={(e) => updateField("numStepFlashingLengths", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
              </div>
            </div>
          </div>

          {/* Penetrations sub-section */}
          {(measurementData.totalPenetrationsArea || measurementData.totalPenetrationsPerimeter) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="totalPenetrationsArea">Penetrations Area (sq ft)</Label>
                <Input
                  id="totalPenetrationsArea"
                  type="number"
                  step="0.01"
                  placeholder="sq ft"
                  value={measurementData.totalPenetrationsArea}
                  onChange={(e) => updateField("totalPenetrationsArea", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalPenetrationsPerimeter">Penetrations Perimeter (LF)</Label>
                <Input
                  id="totalPenetrationsPerimeter"
                  type="number"
                  step="0.01"
                  placeholder="LF"
                  value={measurementData.totalPenetrationsPerimeter}
                  onChange={(e) => updateField("totalPenetrationsPerimeter", e.target.value)}
                  disabled={isParsing || isConfirmed}
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* ── Roof Details Section ── */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Roof Details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="predominantPitch">Predominant Pitch</Label>
              <Input
                id="predominantPitch"
                placeholder="e.g. 7/12"
                value={measurementData.predominantPitch}
                onChange={(e) => updateField("predominantPitch", e.target.value)}
                disabled={isParsing || isConfirmed}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessories">Accessories</Label>
              <Textarea
                id="accessories"
                placeholder="e.g. Skylights (2), Pipe boots (4), Chimney, Satellite dish"
                value={measurementData.accessories}
                onChange={(e) => updateField("accessories", e.target.value)}
                disabled={isParsing || isConfirmed}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                List roof accessories, penetrations, and features
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Damage Types Section (multi-select) ── */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Damage Type
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Select all that apply.
          </p>
          <div className="flex flex-wrap gap-2">
            {DAMAGE_TYPES.map((dt) => {
              const isSelected = measurementData.damageTypes.includes(dt.value);
              return (
                <button
                  key={dt.value}
                  type="button"
                  disabled={isParsing || isConfirmed}
                  onClick={() =>
                    dispatch({ type: "TOGGLE_DAMAGE_TYPE", damageType: dt.value })
                  }
                  className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  } ${isParsing || isConfirmed ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {isSelected && (
                    <svg
                      className="mr-1.5 h-3.5 w-3.5"
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
                  )}
                  {dt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm button */}
        {!isConfirmed && (
          <Button
            onClick={() => dispatch({ type: "CONFIRM_MEASUREMENTS" })}
            disabled={isParsing}
            variant="outline"
            className="w-full"
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            Confirm All Measurements
          </Button>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={nextStep}>Next: Review &amp; Generate</Button>
      </div>
    </div>
  );
}
