"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createDraftDecoding } from "@/app/(dashboard)/dashboard/policy-decoder/actions";

interface NewDecodeButtonProps {
  isFirstDecode?: boolean;
}

/**
 * Creates a draft decoding, then redirects to Stripe checkout.
 * Pay first, upload after.
 */
export function NewDecodeButton({ isFirstDecode }: NewDecodeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    try {
      // 1. Create a draft row
      const { decodingId, error: createError } = await createDraftDecoding();
      if (createError || !decodingId) {
        throw new Error(createError || "Failed to create decoding");
      }

      // 2. Redirect to Stripe checkout (or free unlock)
      const res = await fetch("/api/stripe/policy-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyDecodingId: decodingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Processing...
        </span>
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Policy Decode{isFirstDecode ? " — FREE" : " — $50"}
        </>
      )}
    </Button>
  );
}
