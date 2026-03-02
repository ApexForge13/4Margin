"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createDraftDecoding } from "@/app/(dashboard)/dashboard/policy-decoder/actions";

interface NewDecodeButtonProps {
  isFirstDecode?: boolean;
}

/**
 * Creates a draft decoding and redirects to the detail page.
 * Upload-first flow: user uploads PDF, then pays (or gets first free).
 */
export function NewDecodeButton({ isFirstDecode }: NewDecodeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    try {
      const { decodingId, error: createError } = await createDraftDecoding();
      if (createError || !decodingId) {
        throw new Error(createError || "Failed to create decoding");
      }

      // Go straight to detail page — upload first, pay after
      router.push(`/dashboard/policy-decoder/${decodingId}`);
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
          Creating...
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
