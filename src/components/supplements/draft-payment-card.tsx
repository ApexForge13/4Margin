"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SUPPLEMENT_PRICE_DISPLAY } from "@/lib/stripe/constants";

interface DraftPaymentCardProps {
  supplementId: string;
  isFirstSupplement: boolean;
}

/**
 * Prominent payment card shown on the supplement detail page
 * when the supplement is in "draft" (awaiting payment) status.
 * Includes a large "Complete Payment" button that triggers Stripe checkout.
 */
export function DraftPaymentCard({
  supplementId,
  isFirstSupplement,
}: DraftPaymentCardProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplementId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout (or free redirect URL)
      window.location.href = data.url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Payment failed. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-6">
        {/* Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <svg
            className="h-6 w-6 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 text-center sm:text-left">
          <p className="font-semibold text-amber-900">
            {isFirstSupplement
              ? "Complete Payment to Start Analysis — Your First Is Free!"
              : "Complete Payment to Start Analysis"}
          </p>
          <p className="text-sm text-amber-700 mt-0.5">
            {isFirstSupplement
              ? "Unlock your supplement — no charge for your first claim. Our AI will analyze your estimate and identify missing items."
              : `Pay ${SUPPLEMENT_PRICE_DISPLAY} to unlock your supplement. Our AI will analyze your estimate and identify missing items.`}
          </p>
        </div>

        {/* Button */}
        <Button
          size="lg"
          onClick={handleCheckout}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 shrink-0"
        >
          {loading ? (
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
              Redirecting...
            </>
          ) : (
            <>
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
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              {isFirstSupplement
                ? "Unlock — FREE"
                : `Pay ${SUPPLEMENT_PRICE_DISPLAY}`}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
