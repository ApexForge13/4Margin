'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TierCalculated, QuoteAddOn, QuoteDiscount } from '@/types/quote';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface QuoteTierPreviewProps {
  tier: TierCalculated;
  lineItems: { description: string }[];
  addOns: QuoteAddOn[];
  discounts: QuoteDiscount[];
}

export function QuoteTierPreview({
  tier,
  lineItems,
  addOns,
  discounts,
}: QuoteTierPreviewProps) {
  const activeAddOns = addOns.filter((a) => a.description.trim() !== '');

  // Recalculate discount total for display
  const addOnsTotal = activeAddOns.reduce((sum, a) => sum + (a.price || 0), 0);
  const subtotal = tier.price_per_square > 0 ? tier.subtotal : 0;

  const discountLines = discounts
    .filter((d) => d.amount > 0)
    .map((d) => {
      const value =
        d.type === '$'
          ? d.amount
          : subtotal * (d.amount / 100);
      return { label: d.reason || `${d.amount}${d.type} discount`, value };
    });

  const isEmpty = !tier.label && !tier.manufacturer;

  if (isEmpty) {
    return (
      <Card className="flex-1 min-w-0 border-dashed opacity-50">
        <CardContent className="p-6 flex items-center justify-center h-full text-sm text-muted-foreground">
          No tier configured
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 min-w-0 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold tracking-wide uppercase">
          {tier.label}
        </CardTitle>
        <p className="text-sm font-medium text-foreground">{tier.manufacturer}</p>
        <p className="text-xs text-muted-foreground">{tier.product_line}</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1 pt-0">
        {/* Work included */}
        {lineItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Work Included
            </p>
            <ul className="space-y-1">
              {lineItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/60" />
                  <span className="text-muted-foreground">{item.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Add-ons */}
        {activeAddOns.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Additional Items
            </p>
            <ul className="space-y-1">
              {activeAddOns.map((addon, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{addon.description}</span>
                  <span className="font-medium tabular-nums">{fmt.format(addon.price || 0)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pricing breakdown */}
        <div className="mt-auto pt-4 border-t space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Materials &amp; Labor</span>
            <span className="tabular-nums">
              {fmt.format(subtotal - addOnsTotal)}
            </span>
          </div>

          {activeAddOns.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Additional Items</span>
              <span className="tabular-nums">{fmt.format(addOnsTotal)}</span>
            </div>
          )}

          {discountLines.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{fmt.format(subtotal)}</span>
              </div>
              {discountLines.map((dl, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[60%]">
                    {dl.label}
                  </span>
                  <span className="tabular-nums text-red-600">
                    -{fmt.format(dl.value)}
                  </span>
                </div>
              ))}
            </>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-green-600 tabular-nums">
              {fmt.format(tier.total)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
