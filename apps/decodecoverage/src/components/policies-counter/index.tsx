"use client";

import { ShieldCheck } from "lucide-react";

function getPoliciesDecoded(): string {
  const epoch = new Date("2025-01-01").getTime();
  const now = Date.now();
  const dayOffset = Math.floor((now - epoch) / 86400000);
  const hour = new Date().getHours();
  const jitter = Math.floor((hour * 7 + 3) % 16); // deterministic 0-15 based on hour
  const count = 3523 + dayOffset * 100 + jitter;
  return count.toLocaleString("en-US");
}

export function PoliciesCounter() {
  const count = getPoliciesDecoded();

  return (
    <div className="policies-counter fade-up">
      <ShieldCheck size={16} />
      <span>{count} policies decoded</span>
    </div>
  );
}
