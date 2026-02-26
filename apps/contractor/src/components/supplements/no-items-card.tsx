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
  const [retryCount, setRetryCount] = useState(0);
  /** Show generating state locally while the pipeline runs in background */
  const [regenerating, setRegenerating] = useState(false);

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRIES) return;

    setRetryCount((c) => c + 1);
    setRegenerating(true);

    // Fire the generate request but DON'T await the full response.
    // The generate API sets status="generating" via DB update immediately,
    // then runs the 1-2 minute pipeline. We show a local spinner and refresh
    // the page after a short delay so the server component picks up the
    // "generating" status and renders the full generating card + AutoRefresh.
    fetch(`/api/supplements/${supplementId}/generate`, {
      method: "POST",
    }).catch((err) => {
      console.error("[NoItemsCard] Generate request failed:", err);
    });

    toast.success("Re-analyzing your estimate. This usually takes 1-2 minutes.");

    // Wait for the DB status update to propagate, then refresh.
    // The server component will render the full generating spinner
    // and AutoRefresh will poll until complete.
    await new Promise((r) => setTimeout(r, 2500));
    router.refresh();
  };

  const retriesLeft = MAX_RETRIES - retryCount;

  // ── Regenerating state: show a proper spinner like the generating card ──
  if (regenerating) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-center gap-3 py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <div>
            <p className="font-medium text-blue-900">Re-analyzing your estimate...</p>
            <p className="text-sm text-blue-700">
              Our AI is reviewing the adjuster&apos;s scope and identifying missing items.
              This usually takes 1-2 minutes. The page will update automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            >
              Retry Analysis
              <span className="ml-1.5 text-xs opacity-60">
                ({retriesLeft} left)
              </span>
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
