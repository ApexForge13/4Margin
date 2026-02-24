"use client";

import { useRouter } from "next/navigation";
import { useWizard, clearWizardStorage } from "./wizard-context";
import { createClaimAndSupplement } from "@/app/(dashboard)/dashboard/upload/actions";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function StepReview() {
  const router = useRouter();
  const { state, dispatch, prevStep, goToStep, canProceed } = useWizard();
  const { claimDetails, measurementData, isSubmitting, uploadProgress } = state;

  const totalFiles =
    state.estimateFiles.length +
    state.policyFiles.length +
    state.measurementFiles.length +
    state.photos.length;

  const handleGenerate = async () => {
    if (!canProceed()) return;

    dispatch({ type: "SET_SUBMITTING", isSubmitting: true });
    dispatch({ type: "SET_UPLOAD_PROGRESS", current: 0, total: totalFiles });

    try {
      // Get user + company
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Session expired. Please sign in again.");
        dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) {
        toast.error("Company not found.");
        dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
        return;
      }

      const companyId = profile.company_id;
      const ts = Date.now();
      let uploaded = 0;

      // Upload estimates
      let estimateStoragePath = "";
      for (const f of state.estimateFiles) {
        const path = `${companyId}/estimates/${ts}_${f.file.name}`;
        const result = await uploadFile("estimates", path, f.file);
        if (result.error) {
          toast.error(`Failed to upload ${f.file.name}: ${result.error}`);
          dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
          return;
        }
        if (!estimateStoragePath) estimateStoragePath = result.path;
        uploaded++;
        dispatch({ type: "SET_UPLOAD_PROGRESS", current: uploaded, total: totalFiles });
      }

      // Upload policies
      for (const f of state.policyFiles) {
        const path = `${companyId}/policies/${ts}_${f.file.name}`;
        const result = await uploadFile("policies", path, f.file);
        if (result.error) {
          toast.error(`Failed to upload ${f.file.name}: ${result.error}`);
          dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
          return;
        }
        uploaded++;
        dispatch({ type: "SET_UPLOAD_PROGRESS", current: uploaded, total: totalFiles });
      }

      // Upload measurements
      for (const f of state.measurementFiles) {
        const path = `${companyId}/measurements/${ts}_${f.file.name}`;
        const result = await uploadFile("measurements", path, f.file);
        if (result.error) {
          toast.error(`Failed to upload ${f.file.name}: ${result.error}`);
          dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
          return;
        }
        uploaded++;
        dispatch({ type: "SET_UPLOAD_PROGRESS", current: uploaded, total: totalFiles });
      }

      // Upload photos
      const photoMeta: {
        fileName: string;
        fileSize: number;
        mimeType: string;
        note: string;
        storagePath: string;
      }[] = [];

      for (const p of state.photos) {
        const path = `${companyId}/photos/${ts}_${p.file.name}`;
        const result = await uploadFile("photos", path, p.file);
        if (result.error) {
          toast.error(`Failed to upload ${p.file.name}: ${result.error}`);
          dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
          return;
        }
        photoMeta.push({
          fileName: p.file.name,
          fileSize: p.file.size,
          mimeType: p.file.type,
          note: p.note,
          storagePath: result.path,
        });
        uploaded++;
        dispatch({ type: "SET_UPLOAD_PROGRESS", current: uploaded, total: totalFiles });
      }

      // Create DB records
      const result = await createClaimAndSupplement({
        claimName: state.claimName,
        claimDetails: state.claimDetails,
        measurementData: state.measurementData,
        photoMeta,
        estimateStoragePath,
      });

      if (result.error) {
        toast.error(result.error);
        dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
        return;
      }

      toast.success("Supplement created successfully!");
      clearWizardStorage();
      router.push("/dashboard");
    } catch (err) {
      console.error("Generate error:", err);
      toast.error("Something went wrong. Please try again.");
      dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
    }
  };

  return (
    <div className="space-y-8">
      {/* Claim Name */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Name Your Claim</h2>
          <p className="text-sm text-muted-foreground">
            Give this claim a display name for your dashboard.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="claimName">Claim name *</Label>
          <Input
            id="claimName"
            placeholder="e.g. Smith Residence — Hail Damage 2024"
            value={state.claimName}
            onChange={(e) =>
              dispatch({ type: "SET_CLAIM_NAME", name: e.target.value })
            }
            disabled={isSubmitting}
            autoFocus
          />
        </div>
      </div>

      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Claim Details + Overview (combined) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Claim Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToStep(1)}
                disabled={isSubmitting}
              >
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Claim #" value={claimDetails.claimNumber} />
            <Row label="Policy #" value={claimDetails.policyNumber} />
            <Row label="Carrier" value={claimDetails.carrierName} />
            <Row
              label="Property"
              value={[
                claimDetails.propertyAddress,
                [claimDetails.propertyCity, claimDetails.propertyState, claimDetails.propertyZip]
                  .filter(Boolean)
                  .join(", "),
              ]
                .filter(Boolean)
                .join(", ")}
            />
            <Row label="Date of Loss" value={claimDetails.dateOfLoss} />
            <Row label="Adjuster" value={claimDetails.adjusterName} />

            {/* Claim Overview (inline) */}
            {(claimDetails.claimDescription ||
              claimDetails.itemsBelievedMissing ||
              claimDetails.priorSupplementHistory) && (
              <>
                <Separator className="!my-3" />
                {claimDetails.claimDescription && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Description</span>
                    <p className="line-clamp-3">{claimDetails.claimDescription}</p>
                  </div>
                )}
                {claimDetails.itemsBelievedMissing && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Items Missing / Incomplete</span>
                    <p className="line-clamp-3">{claimDetails.itemsBelievedMissing}</p>
                  </div>
                )}
                {claimDetails.priorSupplementHistory && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Prior History</span>
                    <p className="line-clamp-3">{claimDetails.priorSupplementHistory}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Files */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Uploaded Files</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToStep(1)}
                disabled={isSubmitting}
              >
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {state.estimateFiles.map((f, i) => (
              <FileRow key={`e-${i}`} name={f.file.name} size={f.file.size} badge="Estimate" />
            ))}
            {state.policyFiles.map((f, i) => (
              <FileRow key={`p-${i}`} name={f.file.name} size={f.file.size} badge="Policy" />
            ))}
            {state.measurementFiles.map((f, i) => (
              <FileRow key={`m-${i}`} name={f.file.name} size={f.file.size} badge="Measurement" />
            ))}
            {state.photos.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {state.photos.length} inspection photo
                  {state.photos.length !== 1 ? "s" : ""}
                </span>
                <Badge variant="secondary">Photos</Badge>
              </div>
            )}
            {totalFiles === 0 && (
              <p className="text-muted-foreground">No files uploaded</p>
            )}
          </CardContent>
        </Card>

        {/* Photos & Notes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Photos &amp; Notes</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToStep(2)}
                disabled={isSubmitting}
              >
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {state.photos.length === 0 ? (
              <p className="text-muted-foreground">No photos added</p>
            ) : (
              <div className="space-y-2">
                {state.photos.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="h-10 w-10 shrink-0 rounded overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.previewUrl}
                        alt={p.file.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.file.name}</p>
                      {p.note && (
                        <p className="text-xs text-muted-foreground truncate">
                          {p.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {state.photos.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{state.photos.length - 5} more photos
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Measurements */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Measurements</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToStep(3)}
                disabled={isSubmitting}
              >
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {!measurementData.measuredSquares && !measurementData.predominantPitch ? (
              <p className="text-muted-foreground">No measurements entered</p>
            ) : (
              <div className="space-y-1">
                <Row label="Measured Sq" value={measurementData.measuredSquares} />
                <Row label="Waste %" value={measurementData.wastePercent} />
                <Row label="Suggested Sq" value={measurementData.suggestedSquares} />
                <Row label="Pitch" value={measurementData.predominantPitch} />
                <Row label="Ridges (ft)" value={measurementData.ftRidges} />
                <Row label="Hips (ft)" value={measurementData.ftHips} />
                <Row label="Valleys (ft)" value={measurementData.ftValleys} />
                <Row label="Rakes (ft)" value={measurementData.ftRakes} />
                <Row label="Eaves (ft)" value={measurementData.ftEaves} />
                <Row label="Drip Edge (ft)" value={measurementData.ftDripEdge} />
                <Row label="Parapet (ft)" value={measurementData.ftParapet} />
                <Row label="Flashing (ft)" value={measurementData.ftFlashing} />
                <Row label="Step Flash (ft)" value={measurementData.ftStepFlashing} />
                {measurementData.accessories && (
                  <Row label="Accessories" value={measurementData.accessories} />
                )}
                {measurementData.damageTypes.length > 0 && (
                  <Row
                    label="Damage"
                    value={measurementData.damageTypes
                      .map((t) =>
                        t === "wind_hail"
                          ? "Wind/Hail"
                          : t === "age_wear"
                            ? "Age/Wear"
                            : t.charAt(0).toUpperCase() + t.slice(1)
                      )
                      .join(", ")}
                  />
                )}
                {measurementData.confirmed && (
                  <Badge
                    variant="outline"
                    className="mt-2 border-green-300 text-green-700"
                  >
                    Confirmed
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Submission */}
      {isSubmitting && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-medium">
              {uploadProgress.current < uploadProgress.total
                ? `Uploading files... ${uploadProgress.current}/${uploadProgress.total}`
                : "Creating supplement record..."}
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{
                width: `${
                  uploadProgress.total > 0
                    ? (uploadProgress.current / uploadProgress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
          Back
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={!canProceed() || isSubmitting}
          size="lg"
        >
          {isSubmitting ? "Generating..." : "Generate Supplement"}
        </Button>
      </div>
    </div>
  );
}

// --- Helper components ---

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}

function FileRow({
  name,
  size,
  badge,
}: {
  name: string;
  size: number;
  badge: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate">{name}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">
          {formatFileSize(size)}
        </span>
        <Badge variant="secondary" className="text-xs">
          {badge}
        </Badge>
      </div>
    </div>
  );
}
