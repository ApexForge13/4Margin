"use client";

import Link from "next/link";

export interface ActionItemsProps {
  stuckGenerating: { id: string; claimName: string; createdAt: string }[];
  needsReview: { id: string; claimName: string; itemCount: number }[];
  pendingPayment: { id: string; claimName: string; total: number }[];
}

function SectionBadge({
  label,
  color,
}: {
  label: string;
  color: "amber" | "blue" | "violet";
}) {
  const styles = {
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[color]}`}
    >
      {label}
    </span>
  );
}

function formatDollars(amount: number): string {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export function ActionItems({
  stuckGenerating,
  needsReview,
  pendingPayment,
}: ActionItemsProps) {
  const total =
    stuckGenerating.length + needsReview.length + pendingPayment.length;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col h-full"
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#344767]">Action Items</h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">Supplements needing your attention</p>
        </div>
        {total > 0 && (
          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-50 border border-red-100 px-1.5 text-[10px] font-bold text-red-500">
            {total}
          </span>
        )}
      </div>

      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#344767]">All caught up</p>
          <p className="text-xs text-[#94a3b8]">No action items right now</p>
        </div>
      ) : (
        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Stuck generating */}
          {stuckGenerating.length > 0 && (
            <div>
              <div className="mb-2">
                <SectionBadge label="Stuck" color="amber" />
              </div>
              <div className="space-y-2">
                {stuckGenerating.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/supplements/${item.id}`}
                    className="flex items-center justify-between rounded-xl border border-amber-50 bg-amber-50/40 px-3 py-2.5 hover:bg-amber-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />
                      <span className="text-xs font-medium text-[#344767] truncate">
                        {item.claimName}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] flex-shrink-0 ml-2">
                      {timeAgo(item.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Needs review */}
          {needsReview.length > 0 && (
            <div>
              <div className="mb-2">
                <SectionBadge label="Ready to Review" color="blue" />
              </div>
              <div className="space-y-2">
                {needsReview.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/supplements/${item.id}`}
                    className="flex items-center justify-between rounded-xl border border-blue-50 bg-blue-50/40 px-3 py-2.5 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-[#344767] truncate">
                        {item.claimName}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] flex-shrink-0 ml-2">
                      {item.itemCount} item{item.itemCount !== 1 ? "s" : ""}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pending payment */}
          {pendingPayment.length > 0 && (
            <div>
              <div className="mb-2">
                <SectionBadge label="Awaiting Payment" color="violet" />
              </div>
              <div className="space-y-2">
                {pendingPayment.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/supplements/${item.id}`}
                    className="flex items-center justify-between rounded-xl border border-violet-50 bg-violet-50/40 px-3 py-2.5 hover:bg-violet-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-violet-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-[#344767] truncate">
                        {item.claimName}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-violet-600 flex-shrink-0 ml-2">
                      {formatDollars(item.total)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
