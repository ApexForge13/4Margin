"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PaymentGate } from "@/components/supplements/payment-gate";
import { DownloadButton } from "@/components/supplements/download-button";
import { toast } from "sonner";

interface LineItem {
  id: string;
  xactimate_code: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  justification: string | null;
  irc_reference: string | null;
  status: string;
  confidence?: number;
}

interface LineItemsReviewProps {
  supplementId: string;
  items: LineItem[];
  supplementStatus: string;
  hasPdf: boolean;
  paid: boolean;
  isFirstSupplement: boolean;
  supplementTotal: number | null;
}

export function LineItemsReview({
  supplementId,
  items,
  supplementStatus,
  hasPdf,
  paid,
  isFirstSupplement,
  supplementTotal,
}: LineItemsReviewProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  // Editable mode: items can be toggled before PDF is generated
  const canEdit = supplementStatus === "complete" && !hasPdf;

  // Initialize selected set: items with status "detected" or "accepted" are checked
  const [selected, setSelected] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    items.forEach((item) => {
      if (item.status === "detected" || item.status === "accepted") {
        initial.add(item.id);
      }
    });
    return initial;
  });

  // Expanded items for showing supporting arguments
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    () => new Set(items.map((i) => i.id)) // All expanded by default
  );

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleItem = (id: string) => {
    if (!canEdit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!canEdit) return;
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  const selectedTotal = items
    .filter((i) => selected.has(i.id))
    .reduce((sum, i) => sum + Number(i.total_price || 0), 0);

  const displayTotal = hasPdf
    ? Number(supplementTotal || 0)
    : selectedTotal;

  const handleFinalize = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one line item to include.");
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch(`/api/supplements/${supplementId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedItemIds: Array.from(selected) }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate supplement");
      }

      toast.success("Supplement PDF generated successfully!");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate supplement"
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Supplement Line Items
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({canEdit ? `${selected.size} of ${items.length} selected` : items.filter((i) => i.status !== "rejected").length})
            </span>
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-green-600">
              +$
              {displayTotal.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </span>
            {/* Show PaymentGate + Download when PDF exists */}
            {hasPdf &&
              (supplementStatus === "complete" ||
                supplementStatus === "submitted" ||
                supplementStatus === "approved" ||
                supplementStatus === "partially_approved" ||
                supplementStatus === "denied") && (
                <PaymentGate
                  supplementId={supplementId}
                  paid={paid}
                  isFirstSupplement={isFirstSupplement}
                >
                  <DownloadButton supplementId={supplementId} variant="button" />
                </PaymentGate>
              )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Select All toggle + Expand All (in edit mode) */}
        {canEdit && (
          <div className="flex items-center justify-between mb-4 pb-3 border-b">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selected.size === items.length}
                onCheckedChange={toggleAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer"
              >
                {selected.size === items.length
                  ? "Deselect All"
                  : "Select All"}
              </label>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                if (expandedItems.size === items.length) {
                  setExpandedItems(new Set());
                } else {
                  setExpandedItems(new Set(items.map((i) => i.id)));
                }
              }}
            >
              {expandedItems.size === items.length ? "Collapse All Arguments" : "Expand All Arguments"}
            </button>
          </div>
        )}

        {/* Line items as expandable cards */}
        <div className="space-y-3">
          {items.map((item) => {
            const isSelected = selected.has(item.id);
            const isRejected = !canEdit && item.status === "rejected";
            const isExpanded = expandedItems.has(item.id);

            return (
              <div
                key={item.id}
                className={`rounded-lg border transition-all ${
                  canEdit
                    ? isSelected
                      ? "border-primary/30 bg-primary/5"
                      : "opacity-50 hover:opacity-70"
                    : isRejected
                      ? "opacity-40 border-dashed"
                      : "border-gray-200"
                }`}
              >
                {/* Header row — click to toggle selection */}
                <div
                  className={`flex items-center gap-3 p-3 ${canEdit ? "cursor-pointer" : ""}`}
                  onClick={() => canEdit && toggleItem(item.id)}
                >
                  {canEdit && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItem(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {item.xactimate_code}
                      </span>
                      <span className="font-medium text-sm">{item.description}</span>
                      {!canEdit && (
                        <Badge
                          variant={
                            item.status === "accepted"
                              ? "default"
                              : item.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {item.status === "accepted"
                            ? "Included"
                            : item.status === "rejected"
                              ? "Excluded"
                              : "Detected"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{item.quantity} {item.unit} @ ${Number(item.unit_price).toFixed(2)}</span>
                      <span className="font-semibold text-sm text-foreground">
                        ${Number(item.total_price).toFixed(2)}
                      </span>
                      {item.irc_reference && (
                        <span className="text-blue-600">{item.irc_reference}</span>
                      )}
                    </div>
                  </div>
                  {/* Expand/collapse button */}
                  {item.justification && (
                    <button
                      type="button"
                      className="shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(item.id);
                      }}
                      title={isExpanded ? "Hide supporting argument" : "Show supporting argument"}
                    >
                      <svg
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Supporting argument — expanded view */}
                {item.justification && isExpanded && (
                  <div className="px-3 pb-3 pt-0">
                    <Separator className="mb-3" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Supporting Argument
                      </p>
                      <div className="text-sm bg-gray-50 rounded-md p-3 whitespace-pre-wrap leading-relaxed">
                        {item.justification}
                      </div>
                      {item.irc_reference && (
                        <p className="text-xs text-blue-600">
                          Code Reference: {item.irc_reference}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t-2">
          <span className="font-bold text-sm">
            {canEdit ? "Selected Total:" : "Supplement Total:"}
          </span>
          <span className="font-bold text-lg text-green-600">
            ${displayTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Generate Supplement button (shown when items detected but no PDF yet) */}
        {canEdit && (
          <div className="flex items-center justify-end gap-4 mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selected.size} item{selected.size !== 1 ? "s" : ""} selected
            </p>
            <Button
              size="lg"
              onClick={handleFinalize}
              disabled={generating || selected.size === 0}
            >
              {generating ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
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
                  Generating PDF...
                </>
              ) : (
                "Generate Supplement"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
