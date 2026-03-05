"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck } from "lucide-react";

const EPOCH = new Date("2025-06-01T00:00:00Z").getTime();
const BASE_COUNT = 9500;
const MIN_DAILY = 85;
const MAX_DAILY = 115;
const STORAGE_KEY = "dc_policies_count";

/** Simple seeded PRNG (mulberry32) — deterministic per seed */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Get the deterministic count for a given timestamp. Same seed = same result for all users. */
function getCountAt(now: number): number {
  const msPerDay = 86400000;
  const totalDays = Math.floor((now - EPOCH) / msPerDay);
  const dayFraction = ((now - EPOCH) % msPerDay) / msPerDay;

  // Sum up each past day's deterministic daily add
  let count = BASE_COUNT;
  for (let d = 0; d < totalDays; d++) {
    const rng = seededRandom(d * 31337 + 42);
    const dailyAdd = Math.floor(rng() * (MAX_DAILY - MIN_DAILY + 1)) + MIN_DAILY;
    count += dailyAdd;
  }

  // Add today's partial progress (trickle throughout the day)
  const todayRng = seededRandom(totalDays * 31337 + 42);
  const todayTotal = Math.floor(todayRng() * (MAX_DAILY - MIN_DAILY + 1)) + MIN_DAILY;
  count += Math.floor(todayTotal * dayFraction);

  return count;
}

/** Read the high-water mark from localStorage */
function getStoredMax(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Persist the high-water mark */
function setStoredMax(value: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
}

export function PoliciesCounter() {
  const [count, setCount] = useState<number | null>(null);

  const computeCount = useCallback(() => {
    const calculated = getCountAt(Date.now());
    const stored = getStoredMax();
    const final = Math.max(calculated, stored);
    setStoredMax(final);
    return final;
  }, []);

  useEffect(() => {
    // Initial render
    setCount(computeCount());

    // Update every 30-90 seconds (randomized to feel organic)
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      setCount(computeCount());
      const next = 30000 + Math.random() * 60000;
      timeout = setTimeout(tick, next);
    };
    timeout = setTimeout(tick, 30000 + Math.random() * 60000);

    return () => clearTimeout(timeout);
  }, [computeCount]);

  return (
    <div className="policies-counter fade-up">
      <ShieldCheck size={16} />
      <span>
        {count !== null ? count.toLocaleString("en-US") : "9,500"} policies decoded
      </span>
    </div>
  );
}
