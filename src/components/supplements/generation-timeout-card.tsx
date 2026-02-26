"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface GenerationTimeoutCardProps {
  supplementId: string;
}

/**
 * Shown when a supplement has been in "generating" status for too long (>3 min).
 * This usually means the Vercel serverless function timed out before the pipeline
 * could complete and write results/errors to the database.
 */
export function GenerationTimeoutCard({ supplementId }: GenerationTimeoutCardProps) {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);

  const handleRetry = async () => {
    setRegenerating(true);

    fetch(`/api/supplements/${supplementId}/generate`, {
      method: "POST",
    }).catch((err) => {
      console.error("[GenerationTimeoutCard] Generate request failed:", err);
    });

    toast.success("Re-analyzing your estimate. This usually takes 1-2 minutes.");

    await new Promise((r) => setTimeout(r, 2500));
    router.refresh();
  };

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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <p className="font-medium text-amber-900">Analysis timed out</p>
          <p className="text-sm text-amber-700 mt-1">
            The analysis took longer than expected and may have been interrupted.
            This can happen with large estimate PDFs. Click below to try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={handleRetry}
          >
            Retry Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
