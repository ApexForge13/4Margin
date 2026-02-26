"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  /** Current supplement status */
  status: string;
  /** Whether the supplement has been paid for */
  paid?: boolean;
  /** Polling interval in milliseconds (default: 5000) */
  intervalMs?: number;
}

/**
 * Invisible component that polls router.refresh() while the supplement
 * is still generating (or in draft awaiting pipeline start after payment).
 * Once the server component re-runs and status changes to "complete",
 * the effect cleans up and stops polling.
 */
export function AutoRefresh({ status, paid, intervalMs = 5000 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    // Poll during generating (pipeline running)
    // Also poll during draft if paid (waiting for pipeline to start after payment)
    const shouldPoll =
      status === "generating" || status === "processing" || (status === "draft" && paid);

    if (!shouldPoll) return;

    const timer = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [status, paid, intervalMs, router]);

  return null;
}
