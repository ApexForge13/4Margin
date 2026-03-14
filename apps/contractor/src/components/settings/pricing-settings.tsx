"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, X, ChevronUp, ChevronDown, DollarSign } from "lucide-react";
import type { TierConfig } from "@/types/quote";
import { DEFAULT_LINE_ITEMS } from "@/types/pricing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Internal line-item shape — adds a stable client-side id for React keys. */
interface LineItemRow {
  _id: string;
  description: string;
}

/** Internal add-on shape — adds a stable client-side id for React keys. */
interface AddOnRow {
  _id: string;
  description: string;
  /** Stored as string so the number input is freely editable. */
  defaultPrice: string;
}

/** API response/request shape matching the `company_pricing` table. */
interface PricingPayload {
  good_tier: TierConfig;
  better_tier: TierConfig;
  best_tier: TierConfig;
  default_line_items: { description: string }[];
  addon_templates: { description: string; default_price: number }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return Math.random().toString(36).slice(2);
}

const TIER_KEYS: Array<"good_tier" | "better_tier" | "best_tier"> = [
  "good_tier",
  "better_tier",
  "best_tier",
];

const TIER_LABELS: Record<string, string> = {
  good_tier: "Good",
  better_tier: "Better",
  best_tier: "Best",
};

function emptyTier(label: string): TierConfig {
  return { label, manufacturer: "", product_line: "", price_per_square: 0 };
}

function defaultTiers(): Record<
  "good_tier" | "better_tier" | "best_tier",
  TierConfig
> {
  return {
    good_tier: emptyTier("Good"),
    better_tier: emptyTier("Better"),
    best_tier: emptyTier("Best"),
  };
}

function toLineItemRows(
  items: { description: string }[]
): LineItemRow[] {
  return items.map((item) => ({ _id: makeId(), description: item.description }));
}

function toAddOnRows(
  addOns: { description: string; default_price: number }[]
): AddOnRow[] {
  return addOns.map((t) => ({
    _id: makeId(),
    description: t.description,
    defaultPrice: t.default_price === 0 ? "" : String(t.default_price),
  }));
}

// ---------------------------------------------------------------------------
// Tier row sub-component
// ---------------------------------------------------------------------------

interface TierRowEditorProps {
  tierKey: "good_tier" | "better_tier" | "best_tier";
  tier: TierConfig;
  showHeaders: boolean;
  onChange: (
    key: "good_tier" | "better_tier" | "best_tier",
    field: keyof TierConfig,
    value: string
  ) => void;
  disabled: boolean;
}

function TierRowEditor({
  tierKey,
  tier,
  showHeaders,
  onChange,
  disabled,
}: TierRowEditorProps) {
  const id = tierKey;
  return (
    <div className="grid gap-3 sm:grid-cols-4 items-end py-3">
      {/* Tier label */}
      <div className="space-y-1">
        {showHeaders && <Label>Tier</Label>}
        <Input
          id={`${id}-label`}
          value={tier.label}
          onChange={(e) => onChange(tierKey, "label", e.target.value)}
          placeholder={TIER_LABELS[tierKey]}
          disabled={disabled}
        />
      </div>

      {/* Manufacturer */}
      <div className="space-y-1">
        {showHeaders && <Label>Manufacturer</Label>}
        <Input
          id={`${id}-manufacturer`}
          value={tier.manufacturer}
          onChange={(e) => onChange(tierKey, "manufacturer", e.target.value)}
          placeholder="e.g. CertainTeed"
          disabled={disabled}
        />
      </div>

      {/* Product line */}
      <div className="space-y-1">
        {showHeaders && <Label>Product line</Label>}
        <Input
          id={`${id}-product-line`}
          value={tier.product_line}
          onChange={(e) => onChange(tierKey, "product_line", e.target.value)}
          placeholder="e.g. Landmark Pro"
          disabled={disabled}
        />
      </div>

      {/* Price per square */}
      <div className="space-y-1">
        {showHeaders && <Label>Price / square</Label>}
        <div className="relative">
          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id={`${id}-price`}
            type="number"
            min="0"
            step="0.01"
            value={tier.price_per_square === 0 ? "" : tier.price_per_square}
            onChange={(e) =>
              onChange(tierKey, "price_per_square", e.target.value)
            }
            placeholder="450.00"
            className="pl-7"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PricingSettingsProps {
  companyId: string;
}

export function PricingSettings({ companyId: _companyId }: PricingSettingsProps) {
  const [tiers, setTiers] = useState<
    Record<"good_tier" | "better_tier" | "best_tier", TierConfig>
  >(defaultTiers());

  const [lineItems, setLineItems] = useState<LineItemRow[]>(
    toLineItemRows(DEFAULT_LINE_ITEMS)
  );

  const [addOns, setAddOns] = useState<AddOnRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---- fetch on mount ----
  const fetchPricing = useCallback(async () => {
    try {
      const res = await fetch("/api/company/pricing");
      if (res.ok) {
        const data = (await res.json()) as PricingPayload;
        if (data?.good_tier) {
          setTiers({
            good_tier: data.good_tier,
            better_tier: data.better_tier,
            best_tier: data.best_tier,
          });
        }
        if (Array.isArray(data?.default_line_items)) {
          setLineItems(toLineItemRows(data.default_line_items));
        }
        if (Array.isArray(data?.addon_templates)) {
          setAddOns(toAddOnRows(data.addon_templates));
        }
      }
      // 404 or non-ok = no saved config yet — keep defaults
    } catch {
      // network error — keep defaults silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPricing();
  }, [fetchPricing]);

  // ---- tier handlers ----
  const handleTierChange = (
    key: "good_tier" | "better_tier" | "best_tier",
    field: keyof TierConfig,
    value: string
  ) => {
    setTiers((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]:
          field === "price_per_square"
            ? value === ""
              ? 0
              : parseFloat(value) || 0
            : value,
      },
    }));
  };

  // ---- line item handlers ----
  const handleLineItemChange = (id: string, value: string) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, description: value } : item
      )
    );
  };

  const handleLineItemRemove = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item._id !== id));
  };

  const handleLineItemMove = (id: string, direction: "up" | "down") => {
    setLineItems((prev) => {
      const items = [...prev];
      const idx = items.findIndex((item) => item._id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= items.length) return prev;
      [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
      return items;
    });
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { _id: makeId(), description: "" },
    ]);
  };

  // ---- add-on handlers ----
  const handleAddOnChange = (
    id: string,
    field: keyof Omit<AddOnRow, "_id">,
    value: string
  ) => {
    setAddOns((prev) =>
      prev.map((t) => (t._id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleAddOnRemove = (id: string) => {
    setAddOns((prev) => prev.filter((t) => t._id !== id));
  };

  const handleAddAddOn = () => {
    setAddOns((prev) => [
      ...prev,
      { _id: makeId(), description: "", defaultPrice: "" },
    ]);
  };

  // ---- save ----
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: PricingPayload = {
        good_tier: tiers.good_tier,
        better_tier: tiers.better_tier,
        best_tier: tiers.best_tier,
        default_line_items: lineItems
          .filter((item) => item.description.trim() !== "")
          .map(({ description }) => ({ description: description.trim() })),
        addon_templates: addOns
          .filter((t) => t.description.trim() !== "")
          .map(({ description, defaultPrice }) => ({
            description: description.trim(),
            default_price: parseFloat(defaultPrice) || 0,
          })),
      };

      const res = await fetch("/api/company/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Pricing settings saved.");
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to save pricing settings.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // suppress layout shift while loading
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Section 1 — Tier Configuration                                      */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground mb-4">
            Define your Good / Better / Best roofing package tiers with a
            manufacturer, product line, and price per square.
          </p>

          {TIER_KEYS.map((key, i) => (
            <div key={key}>
              {i > 0 && <Separator className="my-1" />}
              <TierRowEditor
                tierKey={key}
                tier={tiers[key]}
                showHeaders={i === 0}
                onChange={handleTierChange}
                disabled={saving}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2 — Default Line Items                                      */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>Default Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            These descriptions appear on every quote. Reorder, edit, or remove
            as needed.
          </p>

          <div className="space-y-2">
            {lineItems.map((item, idx) => (
              <div key={item._id} className="flex items-center gap-2">
                {/* Up / Down controls */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleLineItemMove(item._id, "up")}
                    disabled={idx === 0 || saving}
                    aria-label="Move up"
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLineItemMove(item._id, "down")}
                    disabled={idx === lineItems.length - 1 || saving}
                    aria-label="Move down"
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Description input */}
                <Input
                  value={item.description}
                  onChange={(e) =>
                    handleLineItemChange(item._id, e.target.value)
                  }
                  placeholder="Line item description"
                  disabled={saving}
                  className="flex-1"
                />

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => handleLineItemRemove(item._id)}
                  disabled={saving}
                  aria-label="Remove line item"
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLineItem}
            disabled={saving}
            className="mt-1"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Line Item
          </Button>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3 — Add-On Templates                                        */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>Add-On Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pre-configured optional add-ons with default prices. These can be
            toggled on or off per quote.
          </p>

          {addOns.length > 0 && (
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_140px_36px] gap-2 px-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Description
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  Default price
                </span>
                <span />
              </div>

              {addOns.map((t) => (
                <div
                  key={t._id}
                  className="grid grid-cols-[1fr_140px_36px] gap-2 items-center"
                >
                  <Input
                    value={t.description}
                    onChange={(e) =>
                      handleAddOnChange(t._id, "description", e.target.value)
                    }
                    placeholder="e.g. Gutter guard installation"
                    disabled={saving}
                  />

                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={t.defaultPrice}
                      onChange={(e) =>
                        handleAddOnChange(t._id, "defaultPrice", e.target.value)
                      }
                      placeholder="0.00"
                      className="pl-7"
                      disabled={saving}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddOnRemove(t._id)}
                    disabled={saving}
                    aria-label="Remove add-on"
                    className="flex items-center justify-center rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddAddOn}
            disabled={saving}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Add-On Template
          </Button>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Save                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Pricing Settings"}
        </Button>
      </div>
    </div>
  );
}
