"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CheckoutButtonProps {
  supplementId: string;
  isFirstSupplement?: boolean;
  size?: "sm" | "default" | "lg" | "icon";
}

/**
 * Compact checkout button for dashboard list rows.
 * Triggers Stripe checkout (or free auto-unlock) for a supplement.
 */
export function CheckoutButton({
  supplementId,
  isFirstSupplement,
  size = "sm",
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

      window.location.href = data.url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Payment failed"
      );
      setLoading(false);
    }
  };

  return (
    <Button
      size={size}
      onClick={handleCheckout}
      disabled={loading}
      className="bg-green-600 hover:bg-green-700 text-white"
    >
      {loading ? (
        "..."
      ) : isFirstSupplement ? (
        "Pay — FREE"
      ) : (
        "Pay"
      )}
    </Button>
  );
}
