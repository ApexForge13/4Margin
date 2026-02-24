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
        {/* Select All toggle (only in edit mode) */}
        {canEdit && (
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
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
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                {canEdit && <th className="pb-2 pr-2 w-8" />}
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Description</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Unit</th>
                <th className="pb-2 pr-4 text-right">Price</th>
                <th className="pb-2 text-right">Total</th>
                {!canEdit && <th className="pb-2 pl-3 w-20">Status</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isSelected = selected.has(item.id);
                const isRejected = !canEdit && item.status === "rejected";

                return (
                  <tr
                    key={item.id}
                    className={`border-b last:border-0 transition-colors ${
                      canEdit
                        ? isSelected
                          ? "hover:bg-muted/50"
                          : "opacity-40 hover:opacity-60"
                        : isRejected
                          ? "opacity-40 line-through"
                          : ""
                    } ${canEdit ? "cursor-pointer" : ""}`}
                    onClick={() => canEdit && toggleItem(item.id)}
                  >
                    {canEdit && (
                      <td className="py-2 pr-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    <td className="py-2 pr-4 font-mono text-xs">
                      {item.xactimate_code}
                    </td>
                    <td className="py-2 pr-4">
                      <p className="font-medium">{item.description}</p>
                      {item.justification && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {item.justification}
                        </p>
                      )}
                    </td>
                    <td className="py-2 pr-4">{item.quantity}</td>
                    <td className="py-2 pr-4">{item.unit}</td>
                    <td className="py-2 pr-4 text-right">
                      ${Number(item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-medium">
                      ${Number(item.total_price).toFixed(2)}
                    </td>
                    {!canEdit && (
                      <td className="py-2 pl-3">
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
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-bold">
                <td
                  colSpan={canEdit ? 6 : 5}
                  className="pt-2 text-right pr-4"
                >
                  {canEdit ? "Selected Total:" : "Supplement Total:"}
                </td>
                <td className="pt-2 text-right text-green-600">
                  $
                  {displayTotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                {!canEdit && <td />}
              </tr>
            </tfoot>
          </table>
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
