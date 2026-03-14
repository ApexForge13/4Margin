'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Plus,
  X,
  AlertTriangle,
  DollarSign,
  Percent,
  FileText,
  Download,
  Mail,
} from 'lucide-react';
import { QuoteTierPreview } from './quote-tier-preview';
import {
  EMPTY_TIER,
  type TierCalculated,
  type QuoteAddOn,
  type QuoteDiscount,
} from '@/types/quote';
import { DEFAULT_LINE_ITEMS, type CompanyPricing } from '@/types/pricing';
import type { Job } from '@/types/job';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateTier(
  tier: { label: string; manufacturer: string; product_line: string; price_per_square: number },
  squares: number,
  addOns: QuoteAddOn[],
  discounts: QuoteDiscount[],
): TierCalculated {
  const base = squares * tier.price_per_square;
  const addOnsTotal = addOns.reduce((sum, a) => sum + (a.price || 0), 0);
  const subtotal = base + addOnsTotal;

  let discountTotal = 0;
  for (const d of discounts) {
    if (d.amount <= 0) continue;
    if (d.type === '$') discountTotal += d.amount;
    else discountTotal += subtotal * (d.amount / 100);
  }

  return {
    ...tier,
    subtotal,
    total: Math.max(0, subtotal - discountTotal),
  };
}

function emptyAddOn(): QuoteAddOn {
  return { description: '', price: 0 };
}

function emptyDiscount(): QuoteDiscount {
  return { type: '$', amount: 0, reason: '' };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuoteBuilderProps {
  initialJob: Job | null;
  inspectionSquares: number | null;
  companyPricing: CompanyPricing | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuoteBuilder({
  initialJob,
  inspectionSquares,
  companyPricing,
}: QuoteBuilderProps) {
  const hasInspection = inspectionSquares !== null;

  // Derive initial squares: inspection > job.suggested_squares > 0
  const defaultSquares =
    inspectionSquares ??
    initialJob?.suggested_squares ??
    0;

  // Derive line items from pricing config or fall back to defaults
  const lineItems =
    companyPricing?.default_line_items?.length
      ? companyPricing.default_line_items
      : DEFAULT_LINE_ITEMS;

  // Form state
  const [homeownerName, setHomeownerName] = useState(
    initialJob?.homeowner_name ?? '',
  );
  const [totalSquares, setTotalSquares] = useState<number>(defaultSquares);
  const [addOns, setAddOns] = useState<QuoteAddOn[]>([]);
  const [discounts, setDiscounts] = useState<QuoteDiscount[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Tier calculations (live)
  // ---------------------------------------------------------------------------

  const goodConfig = companyPricing?.good_tier ?? {
    label: 'Good',
    manufacturer: '',
    product_line: '',
    price_per_square: 0,
  };
  const betterConfig = companyPricing?.better_tier ?? {
    label: 'Better',
    manufacturer: '',
    product_line: '',
    price_per_square: 0,
  };
  const bestConfig = companyPricing?.best_tier ?? {
    label: 'Best',
    manufacturer: '',
    product_line: '',
    price_per_square: 0,
  };

  const goodTier = calculateTier(goodConfig, totalSquares, addOns, discounts);
  const betterTier = calculateTier(betterConfig, totalSquares, addOns, discounts);
  const bestTier = calculateTier(bestConfig, totalSquares, addOns, discounts);

  // ---------------------------------------------------------------------------
  // Add-on handlers
  // ---------------------------------------------------------------------------

  const addAddOn = useCallback(() => {
    setAddOns((prev) => [...prev, emptyAddOn()]);
  }, []);

  const removeAddOn = useCallback((index: number) => {
    setAddOns((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateAddOn = useCallback(
    (index: number, field: keyof QuoteAddOn, value: string | number) => {
      setAddOns((prev) =>
        prev.map((a, i) =>
          i === index ? { ...a, [field]: value } : a,
        ),
      );
    },
    [],
  );

  const applyAddonTemplate = useCallback(
    (template: { description: string; default_price: number }) => {
      setAddOns((prev) => [
        ...prev,
        { description: template.description, price: template.default_price },
      ]);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Discount handlers
  // ---------------------------------------------------------------------------

  const addDiscount = useCallback(() => {
    setDiscounts((prev) => [...prev, emptyDiscount()]);
  }, []);

  const removeDiscount = useCallback((index: number) => {
    setDiscounts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateDiscount = useCallback(
    (index: number, field: keyof QuoteDiscount, value: string | number) => {
      setDiscounts((prev) =>
        prev.map((d, i) =>
          i === index ? { ...d, [field]: value } : d,
        ),
      );
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Save / generate
  // ---------------------------------------------------------------------------

  async function persistQuote(status: 'draft' | 'sent') {
    const body = {
      job_id: initialJob?.id ?? null,
      homeowner_name: homeownerName || null,
      total_squares: totalSquares,
      good_tier: goodTier,
      better_tier: betterTier,
      best_tier: bestTier,
      add_ons: addOns,
      discounts,
      line_items: lineItems,
      status,
    };

    const url = quoteId ? `/api/quotes/${quoteId}` : '/api/quotes';
    const method = quoteId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: string }).error ?? 'Failed to save quote');
    }

    const json = (await res.json()) as { id: string };
    return json.id;
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError(null);
    try {
      const id = await persistQuote('draft');
      setQuoteId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (!homeownerName.trim()) {
      setError('Homeowner name is required before generating.');
      return;
    }
    if (totalSquares <= 0) {
      setError('Total squares must be greater than 0.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const id = await persistQuote('draft');
      setQuoteId(id);

      const res = await fetch(`/api/quotes/${id}/generate`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? 'Generation failed');
      }

      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render — post-generation success state
  // ---------------------------------------------------------------------------

  if (generated && quoteId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">New Quote</h1>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <FileText className="h-8 w-8 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-green-900">Quote generated successfully</p>
                <p className="text-sm text-green-700">
                  Your Good / Better / Best quote is ready.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              <Button
                variant="outline"
                disabled
                className="gap-2 opacity-60"
                title="PDF download coming soon"
              >
                <Download className="h-4 w-4" />
                Download PDF
                <Badge variant="secondary" className="ml-1 text-xs">
                  Soon
                </Badge>
              </Button>

              <Button
                variant="outline"
                disabled={!initialJob?.homeowner_email}
                className="gap-2"
                title={
                  initialJob?.homeowner_email
                    ? undefined
                    : 'No homeowner email on file'
                }
              >
                <Mail className="h-4 w-4" />
                Email to Homeowner
              </Button>

              {initialJob && (
                <Button variant="ghost" asChild>
                  <Link href={`/dashboard/jobs/${initialJob.id}`}>
                    Back to Job
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Read-only tier preview */}
        <div className="flex flex-col md:flex-row gap-4">
          <QuoteTierPreview
            tier={goodTier}
            lineItems={lineItems}
            addOns={addOns}
            discounts={discounts}
          />
          <QuoteTierPreview
            tier={betterTier}
            lineItems={lineItems}
            addOns={addOns}
            discounts={discounts}
          />
          <QuoteTierPreview
            tier={bestTier}
            lineItems={lineItems}
            addOns={addOns}
            discounts={discounts}
          />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — builder
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Quote</h1>
          {initialJob && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {initialJob.property_address}
              {initialJob.property_city ? `, ${initialJob.property_city}` : ''}
            </p>
          )}
        </div>
        {initialJob && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/jobs/${initialJob.id}`}>
              Back to Job
            </Link>
          </Button>
        )}
      </div>

      {/* Global error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6 items-start">
        {/* ------------------------------------------------------------------ */}
        {/* LEFT — form inputs                                                  */}
        {/* ------------------------------------------------------------------ */}
        <div className="space-y-4">
          {/* No-inspection warning */}
          {!hasInspection && (
            <div className="flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                No inspection on file. You will need to enter total squares manually.
              </p>
            </div>
          )}

          {/* Homeowner Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Homeowner Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="homeowner-name">
                  Homeowner Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="homeowner-name"
                  placeholder="Jane Smith"
                  value={homeownerName}
                  onChange={(e) => setHomeownerName(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Measurements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="total-squares">
                  Total Squares{' '}
                  {hasInspection && (
                    <Badge variant="secondary" className="ml-1 text-xs font-normal">
                      From inspection
                    </Badge>
                  )}
                </Label>
                <Input
                  id="total-squares"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="0"
                  value={totalSquares === 0 ? '' : totalSquares}
                  onChange={(e) =>
                    setTotalSquares(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Add-On Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Add-On Line Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Quick-add templates from pricing config */}
              {companyPricing?.addon_templates?.length ? (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Quick add:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {companyPricing.addon_templates.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyAddonTemplate(tpl)}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium hover:bg-muted transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        {tpl.description}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Add-on rows */}
              {addOns.length > 0 && (
                <div className="space-y-2">
                  {addOns.map((addon, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="e.g., Gutter guards, Skylight replacement"
                        value={addon.description}
                        onChange={(e) =>
                          updateAddOn(i, 'description', e.target.value)
                        }
                        className="flex-1"
                      />
                      <div className="relative w-28 flex-shrink-0">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="number"
                          min={0}
                          step={10}
                          placeholder="0"
                          value={addon.price === 0 ? '' : addon.price}
                          onChange={(e) =>
                            updateAddOn(i, 'price', parseFloat(e.target.value) || 0)
                          }
                          className="pl-7"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAddOn(i)}
                        className="flex-shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Remove line item"
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
                onClick={addAddOn}
                className="gap-1.5 w-full"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Line Item
              </Button>
            </CardContent>
          </Card>

          {/* Discounts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Discounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {discounts.length > 0 && (
                <div className="space-y-2">
                  {discounts.map((discount, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {/* Type toggle */}
                      <div className="flex rounded-md border overflow-hidden flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => updateDiscount(i, 'type', '$')}
                          className={cn(
                            'flex items-center justify-center w-8 h-9 transition-colors text-sm',
                            discount.type === '$'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background text-muted-foreground hover:bg-muted',
                          )}
                          aria-label="Dollar amount"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDiscount(i, 'type', '%')}
                          className={cn(
                            'flex items-center justify-center w-8 h-9 transition-colors text-sm',
                            discount.type === '%'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background text-muted-foreground hover:bg-muted',
                          )}
                          aria-label="Percentage"
                        >
                          <Percent className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Amount */}
                      <Input
                        type="number"
                        min={0}
                        step={discount.type === '$' ? 50 : 1}
                        placeholder="0"
                        value={discount.amount === 0 ? '' : discount.amount}
                        onChange={(e) =>
                          updateDiscount(i, 'amount', parseFloat(e.target.value) || 0)
                        }
                        className="w-24 flex-shrink-0"
                      />

                      {/* Reason */}
                      <Input
                        placeholder="Reason (e.g., Senior discount)"
                        value={discount.reason}
                        onChange={(e) =>
                          updateDiscount(i, 'reason', e.target.value)
                        }
                        className="flex-1"
                      />

                      <button
                        type="button"
                        onClick={() => removeDiscount(i)}
                        className="flex-shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Remove discount"
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
                onClick={addDiscount}
                className="gap-1.5 w-full"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Discount
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleGenerate}
              disabled={generating || saving}
              className="flex-1 gap-2"
            >
              <FileText className="h-4 w-4" />
              {generating ? 'Generating...' : 'Generate Quote PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving || generating}
              className="gap-2"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* RIGHT — live tier preview                                           */}
        {/* ------------------------------------------------------------------ */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Live Preview
          </p>

          {!companyPricing && (
            <div className="flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                No pricing configured.{' '}
                <Link
                  href="/dashboard/settings/pricing"
                  className="underline underline-offset-2 font-medium"
                >
                  Set up your tiers
                </Link>{' '}
                to see accurate totals.
              </p>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4">
            <QuoteTierPreview
              tier={goodTier}
              lineItems={lineItems}
              addOns={addOns}
              discounts={discounts}
            />
            <QuoteTierPreview
              tier={betterTier}
              lineItems={lineItems}
              addOns={addOns}
              discounts={discounts}
            />
            <QuoteTierPreview
              tier={bestTier}
              lineItems={lineItems}
              addOns={addOns}
              discounts={discounts}
            />
          </div>

          {totalSquares > 0 && companyPricing && (
            <p className="text-xs text-muted-foreground text-right">
              Calculated on {totalSquares} square{totalSquares !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
