"use client";

import { useMemo } from "react";

/**
 * Fake "policies decoded" counter.
 * Starts at 3,523 on Jan 1 2026 and increases ~100/day with some daily variance.
 * Uses a deterministic seed per day so the number is consistent across renders.
 */
export function PoliciesCounter() {
  const count = useMemo(() => {
    const baseDate = new Date("2026-01-01T00:00:00Z");
    const now = new Date();
    const daysSinceBase = Math.floor(
      (now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Deterministic per-day variance using a simple hash
    let accumulated = 3523;
    for (let d = 0; d < daysSinceBase; d++) {
      // Seed: day number XOR'd with a constant for pseudo-randomness
      const seed = (d * 2654435761) >>> 0;
      const dailyGain = 85 + (seed % 31); // 85–115 per day
      accumulated += dailyGain;
    }

    return accumulated;
  }, []);

  return (
    <span className="policies-counter">
      {count.toLocaleString()} policies decoded
    </span>
  );
}
