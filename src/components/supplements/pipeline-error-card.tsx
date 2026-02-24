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
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/supplements/${supplementId}/generate`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to retry");
      }

      toast.success("Re-analyzing your estimate. This may take 1-2 minutes.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry pipeline");
    } finally {
      setRetrying(false);
    }
  };

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
          <p className="font-medium text-red-900">Analysis failed</p>
          <p className="text-sm text-red-700 mt-1">
            The AI pipeline encountered an error while analyzing your estimate: {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Retrying...
              </>
            ) : (
              "Retry Analysis"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
