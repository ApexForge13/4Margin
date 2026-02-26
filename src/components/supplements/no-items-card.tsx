"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_RETRIES = 3;

interface NoItemsCardProps {
  supplementId: string;
}

export function NoItemsCard({ supplementId }: NoItemsCardProps) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRIES) return;

    setRetrying(true);
    try {
      const res = await fetch(`/api/supplements/${supplementId}/generate`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to retry");
      }

      setRetryCount((c) => c + 1);
      toast.success("Re-analyzing your estimate. This may take 1-2 minutes.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to retry analysis"
      );
    } finally {
      setRetrying(false);
    }
  };

  const retriesLeft = MAX_RETRIES - retryCount;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="flex items-start gap-3 py-6">
        <svg
          className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <p className="font-medium text-amber-900">No line items detected</p>
          <p className="text-sm text-amber-700 mt-1">
            The AI analysis did not find missing items for this claim. This can
            happen due to processing issues — try re-running the analysis.
          </p>
          {retriesLeft > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? (
                <>
                  <svg
                    className="mr-2 h-3.5 w-3.5 animate-spin"
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
                  Re-analyzing...
                </>
              ) : (
                <>
                  Retry Analysis
                  <span className="ml-1.5 text-xs opacity-60">
                    ({retriesLeft} left)
                  </span>
                </>
              )}
            </Button>
          ) : (
            <p className="text-xs text-amber-600 mt-3">
              Maximum retries reached. Please contact support if the issue
              persists.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
