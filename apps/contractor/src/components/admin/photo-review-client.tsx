"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Camera,
  Eye,
  Loader2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface TrainingPhoto {
  id: string;
  storage_path: string;
  signedUrl: string | null;
  category: string;
  subcategory: string | null;
  confidence: number;
  damage_severity: string | null;
  components_visible: string[] | null;
  description: string | null;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface CategoryStat {
  category: string;
  count: number;
  reviewed_count: number;
}

interface Filters {
  category: string | null;
  minConfidence: number | null;
  maxConfidence: number | null;
  reviewed: string | null;
  showNonRoofing: boolean;
  page: number;
}

interface Props {
  photos: TrainingPhoto[];
  stats: CategoryStat[];
  userId: string;
  filters: Filters;
  hasMore: boolean;
}

// ── Constants ────────────────────────────────────────────────

const CATEGORIES = [
  "elevation",
  "roof_overview",
  "damage",
  "component",
  "repair_install",
  "interior_damage",
  "estimate_photo",
  "other",
] as const;

const SUBCATEGORY_OPTIONS: Record<string, string[]> = {
  elevation: [
    "front",
    "front_left",
    "left",
    "back_left",
    "back",
    "back_right",
    "right",
    "front_right",
  ],
  damage: [
    "hail",
    "wind",
    "mechanical",
    "thermal",
    "blistering",
    "wear",
    "tree",
    "other",
  ],
  component: [
    "pipe_jack",
    "ridge_cap",
    "vent",
    "flashing",
    "valley",
    "drip_edge",
    "gutter",
    "skylight",
    "chimney",
    "soffit",
    "fascia",
    "starter_strip",
    "hip_cap",
    "step_flashing",
    "counter_flashing",
    "boot",
    "turbine",
    "satellite_mount",
    "other",
  ],
};

const DAMAGE_SEVERITIES = ["none", "minor", "moderate", "severe"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  elevation: "bg-blue-100 text-blue-800",
  roof_overview: "bg-purple-100 text-purple-800",
  damage: "bg-red-100 text-red-800",
  component: "bg-amber-100 text-amber-800",
  repair_install: "bg-green-100 text-green-800",
  interior_damage: "bg-orange-100 text-orange-800",
  estimate_photo: "bg-gray-100 text-gray-800",
  other: "bg-slate-100 text-slate-800",
  non_roofing: "bg-zinc-100 text-zinc-500",
};

// ── Helpers ──────────────────────────────────────────────────

function confidenceColor(c: number): string {
  if (c >= 90) return "text-green-600";
  if (c >= 70) return "text-amber-600";
  return "text-red-600";
}

function confidenceBg(c: number): string {
  if (c >= 90) return "bg-green-100 text-green-800";
  if (c >= 70) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ────────────────────────────────────────────────

export function PhotoReviewClient({
  photos: initialPhotos,
  stats,
  userId,
  filters,
  hasMore,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [photos, setPhotos] = useState(initialPhotos);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [batchConfirming, setBatchConfirming] = useState(false);

  // Modal edit state
  const [editCategory, setEditCategory] = useState("");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editSeverity, setEditSeverity] = useState("");
  const [editComponents, setEditComponents] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Sync photos when props change
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  const selectedPhoto =
    selectedIndex !== null ? photos[selectedIndex] : null;

  // ── Open modal and populate edit fields ──────────────────
  const openDetail = useCallback(
    (index: number) => {
      const photo = photos[index];
      if (!photo) return;
      setSelectedIndex(index);
      setEditCategory(photo.category || "");
      setEditSubcategory(photo.subcategory || "");
      setEditSeverity(photo.damage_severity || "");
      setEditComponents(
        Array.isArray(photo.components_visible)
          ? photo.components_visible.join(", ")
          : ""
      );
      setEditDescription(photo.description || "");
    },
    [photos]
  );

  const closeDetail = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  // ── Filter helpers ───────────────────────────────────────
  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Reset to page 1 when filters change
      params.delete("page");
      router.push(`/dashboard/admin/photo-review?${params.toString()}`);
    },
    [router, searchParams]
  );

  // ── Save single photo ───────────────────────────────────
  const savePhoto = useCallback(
    async (photoId: string, advance: boolean) => {
      setSaving(true);
      try {
        const body: Record<string, unknown> = {
          category: editCategory || undefined,
          subcategory: editSubcategory || undefined,
          damage_severity: editSeverity || undefined,
          components_visible: editComponents
            ? editComponents.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
          description: editDescription || undefined,
        };

        const res = await fetch(`/api/admin/training-photos/${photoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save");
        }

        // Mark as reviewed in local state
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? { ...p, ...body, reviewed: true, reviewed_by: userId } as TrainingPhoto
              : p
          )
        );

        toast.success("Photo confirmed");

        if (advance && selectedIndex !== null) {
          const nextIndex = selectedIndex + 1;
          if (nextIndex < photos.length) {
            openDetail(nextIndex);
          } else {
            closeDetail();
          }
        } else {
          closeDetail();
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save photo"
        );
      } finally {
        setSaving(false);
      }
    },
    [
      editCategory,
      editSubcategory,
      editSeverity,
      editComponents,
      editDescription,
      userId,
      selectedIndex,
      photos.length,
      openDetail,
      closeDetail,
    ]
  );

  // ── Batch confirm ───────────────────────────────────────
  const batchConfirm = useCallback(async () => {
    const unreviewedIds = photos.filter((p) => !p.reviewed).map((p) => p.id);
    if (unreviewedIds.length === 0) {
      toast.info("No unreviewed photos to confirm");
      return;
    }

    setBatchConfirming(true);
    try {
      const res = await fetch("/api/admin/training-photos/batch-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreviewedIds }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Batch confirm failed");
      }

      setPhotos((prev) =>
        prev.map((p) =>
          unreviewedIds.includes(p.id)
            ? { ...p, reviewed: true, reviewed_by: userId }
            : p
        )
      );

      toast.success(`Confirmed ${unreviewedIds.length} photos`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Batch confirm failed"
      );
    } finally {
      setBatchConfirming(false);
    }
  }, [photos, userId]);

  // ── Keyboard navigation ─────────────────────────────────
  useEffect(() => {
    if (selectedIndex === null) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDetail();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (selectedPhoto) savePhoto(selectedPhoto.id, false);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (selectedIndex < photos.length - 1) {
          openDetail(selectedIndex + 1);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (selectedIndex > 0) {
          openDetail(selectedIndex - 1);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex, selectedPhoto, photos.length, savePhoto, openDetail, closeDetail]);

  // ── Stats computation ───────────────────────────────────
  const totalRoofing = stats
    .filter((s) => s.category !== "non_roofing")
    .reduce((sum, s) => sum + s.count, 0);
  const totalReviewed = stats
    .filter((s) => s.category !== "non_roofing")
    .reduce((sum, s) => sum + s.reviewed_count, 0);
  const remaining = totalRoofing - totalReviewed;
  const unreviewedCount = photos.filter((p) => !p.reviewed).length;

  // ── Subcategory options for current edit ─────────────────
  const subcatOptions = SUBCATEGORY_OPTIONS[editCategory] || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Photo Review</h1>
          <p className="text-muted-foreground">
            Review and correct AI-classified training photos
          </p>
        </div>
        <Button
          onClick={batchConfirm}
          disabled={batchConfirming || unreviewedCount === 0}
          variant="default"
        >
          {batchConfirming ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Confirm {unreviewedCount} photos
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Roofing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRoofing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reviewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalReviewed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{remaining}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {stats
                .filter((s) => s.category !== "non_roofing")
                .slice(0, 4)
                .map((s) => (
                  <Badge
                    key={s.category}
                    variant="secondary"
                    className={CATEGORY_COLORS[s.category] || ""}
                  >
                    {formatLabel(s.category)} ({s.count})
                  </Badge>
                ))}
              {stats.filter((s) => s.category !== "non_roofing").length > 4 && (
                <Badge variant="secondary">
                  +{stats.filter((s) => s.category !== "non_roofing").length - 4} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Category */}
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select
                value={filters.category || "all"}
                onValueChange={(v) => updateFilter("category", v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {formatLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Confidence range */}
            <div className="space-y-1">
              <Label className="text-xs">Min confidence</Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                className="w-[90px]"
                value={filters.minConfidence ?? ""}
                onChange={(e) =>
                  updateFilter("minConfidence", e.target.value || null)
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max confidence</Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="100"
                className="w-[90px]"
                value={filters.maxConfidence ?? ""}
                onChange={(e) =>
                  updateFilter("maxConfidence", e.target.value || null)
                }
              />
            </div>

            {/* Reviewed toggle */}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select
                value={filters.reviewed ?? "false"}
                onValueChange={(v) =>
                  updateFilter("reviewed", v === "all" ? null : v)
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="false">Unreviewed</SelectItem>
                  <SelectItem value="true">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show non-roofing */}
            <div className="flex items-center space-x-2 pb-1">
              <Checkbox
                id="showNonRoofing"
                checked={filters.showNonRoofing}
                onCheckedChange={(checked) =>
                  updateFilter(
                    "showNonRoofing",
                    checked ? "true" : null
                  )
                }
              />
              <Label htmlFor="showNonRoofing" className="text-sm">
                Show non-roofing
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Camera className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">No photos found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo, index) => (
            <Card
              key={photo.id}
              className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
              onClick={() => openDetail(index)}
            >
              <div className="relative aspect-[4/3] bg-muted">
                {photo.signedUrl ? (
                  <img
                    src={photo.signedUrl}
                    alt={photo.description || "Training photo"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Camera className="h-8 w-8" />
                  </div>
                )}
                {/* Reviewed overlay */}
                {photo.reviewed && (
                  <div className="absolute right-2 top-2 rounded-full bg-green-500 p-1 text-white shadow">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                {/* Confidence badge */}
                <div className="absolute bottom-2 right-2">
                  <Badge className={confidenceBg(photo.confidence)}>
                    {Math.round(photo.confidence)}%
                  </Badge>
                </div>
              </div>
              <CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-1">
                  <Badge
                    variant="secondary"
                    className={CATEGORY_COLORS[photo.category] || ""}
                  >
                    {formatLabel(photo.category)}
                  </Badge>
                  {photo.subcategory && (
                    <Badge variant="outline" className="text-xs">
                      {formatLabel(photo.subcategory)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4">
        {filters.page > 1 && (
          <Button
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(filters.page - 1));
              router.push(
                `/dashboard/admin/photo-review?${params.toString()}`
              );
            }}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
        )}
        {hasMore && (
          <Button
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(filters.page + 1));
              router.push(
                `/dashboard/admin/photo-review?${params.toString()}`
              );
            }}
          >
            Load More
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Photo Review
                  {selectedIndex !== null && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({selectedIndex + 1} of {photos.length})
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              {/* Image preview */}
              <div className="relative w-full overflow-hidden rounded-lg bg-muted">
                {selectedPhoto.signedUrl ? (
                  <img
                    src={selectedPhoto.signedUrl}
                    alt={selectedPhoto.description || "Training photo"}
                    className="max-h-[60vh] w-full object-contain"
                  />
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                    <Camera className="h-12 w-12" />
                    <span className="ml-2">No preview available</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Current labels */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className={CATEGORY_COLORS[selectedPhoto.category] || ""}
                >
                  {formatLabel(selectedPhoto.category)}
                </Badge>
                {selectedPhoto.subcategory && (
                  <Badge variant="outline">
                    {formatLabel(selectedPhoto.subcategory)}
                  </Badge>
                )}
                <Badge className={confidenceBg(selectedPhoto.confidence)}>
                  Confidence: {Math.round(selectedPhoto.confidence)}%
                </Badge>
                {selectedPhoto.reviewed && (
                  <Badge className="bg-green-100 text-green-800">
                    Reviewed
                  </Badge>
                )}
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select
                    value={editCategory}
                    onValueChange={(v) => {
                      setEditCategory(v);
                      // Reset subcategory when category changes
                      setEditSubcategory("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {formatLabel(cat)}
                        </SelectItem>
                      ))}
                      <SelectItem value="non_roofing">Non-Roofing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcategory */}
                <div className="space-y-1">
                  <Label>Subcategory</Label>
                  {subcatOptions ? (
                    <Select
                      value={editSubcategory}
                      onValueChange={setEditSubcategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcatOptions.map((sub) => (
                          <SelectItem key={sub} value={sub}>
                            {formatLabel(sub)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={editSubcategory}
                      onChange={(e) => setEditSubcategory(e.target.value)}
                      placeholder="Free text subcategory"
                    />
                  )}
                </div>

                {/* Damage severity (conditional) */}
                {editCategory === "damage" && (
                  <div className="space-y-1">
                    <Label>Damage Severity</Label>
                    <Select
                      value={editSeverity}
                      onValueChange={setEditSeverity}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAMAGE_SEVERITIES.map((sev) => (
                          <SelectItem key={sev} value={sev}>
                            {formatLabel(sev)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Components visible */}
                <div className="space-y-1">
                  <Label>Components Visible</Label>
                  <Input
                    value={editComponents}
                    onChange={(e) => setEditComponents(e.target.value)}
                    placeholder="pipe_jack, ridge_cap, vent..."
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Photo description..."
                  rows={3}
                />
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIndex === 0}
                    onClick={() => {
                      if (selectedIndex !== null && selectedIndex > 0) {
                        openDetail(selectedIndex - 1);
                      }
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      selectedIndex === null ||
                      selectedIndex >= photos.length - 1
                    }
                    onClick={() => {
                      if (
                        selectedIndex !== null &&
                        selectedIndex < photos.length - 1
                      ) {
                        openDetail(selectedIndex + 1);
                      }
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={closeDetail}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => savePhoto(selectedPhoto.id, false)}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => savePhoto(selectedPhoto.id, true)}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & Next
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
