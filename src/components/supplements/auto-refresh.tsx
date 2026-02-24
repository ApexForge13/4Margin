"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  /** Current supplement status */
  status: string;
  /** Polling interval in milliseconds (default: 5000) */
  intervalMs?: number;
}

/**
 * Invisible component that polls router.refresh() while the supplement
 * is still generating.  Once the server component re-runs and status
 * changes to "complete", the effect cleans up and stops polling.
 */
export function AutoRefresh({ status, intervalMs = 5000 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "generating") return;

    const timer = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [status, intervalMs, router]);

  return null;
}
