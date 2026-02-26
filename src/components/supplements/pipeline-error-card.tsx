"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PipelineErrorCardProps {
  supplementId: string;
  error: string;
}

export function PipelineErrorCard({ supplementId, error }: PipelineErrorCardProps) {
  const router = useRouter();
  /** Show generating state locally while the pipeline retries in background */
  const [regenerating, setRegenerating] = useState(false);

  const handleRetry = async () => {
    setRegenerating(true);

    // Fire the generate request — don't await the full pipeline response.
    // The API sets status="generating" immediately, then runs the 1-2 min pipeline.
    fetch(`/api/supplements/${supplementId}/generate`, {
      method: "POST",
    }).catch((err) => {
      console.error("[PipelineErrorCard] Generate request failed:", err);
    });

    toast.success("Re-analyzing your estimate. This usually takes 1-2 minutes.");

    // Wait for the DB status to update, then refresh.
    // The server component will render the generating spinner + AutoRefresh.
    await new Promise((r) => setTimeout(r, 2500));
    router.refresh();
  };

  // ── Regenerating state: show generating spinner ──
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

  // Determine if this is a "0 items" error vs a real pipeline failure
  const isZeroItems = error.includes("0 missing items") || error.includes("0 items");

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="flex items-start gap-3 py-6">
        <svg
          className="h-5 w-5 text-red-600 shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <div className="flex-1">
          <p className="font-medium text-red-900">
            {isZeroItems ? "No items found — retrying may help" : "Analysis failed"}
          </p>
          <p className="text-sm text-red-700 mt-1">
            {isZeroItems
              ? "The AI could not identify missing items on this attempt. This can happen if the PDF is hard to read or the AI was too conservative. Try again — results often improve on retry."
              : `The AI pipeline encountered an error: ${error}`}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
            onClick={handleRetry}
          >
            Retry Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
