"use client";

import Link from "next/link";

export interface ActivityItem {
  id: string;
  type: "created" | "finalized" | "approved" | "denied";
  claimName: string;
  timestamp: string;
  amount?: number;
}

const TYPE_CONFIG = {
  created: {
    label: "Created",
    dotColor: "#3b82f6",
    dotBg: "rgba(59,130,246,0.12)",
  },
  finalized: {
    label: "Finalized",
    dotColor: "#00BFFF",
    dotBg: "rgba(0,191,255,0.12)",
  },
  approved: {
    label: "Approved",
    dotColor: "#10b981",
    dotBg: "rgba(16,185,129,0.12)",
  },
  denied: {
    label: "Denied",
    dotColor: "#ef4444",
    dotBg: "rgba(239,68,68,0.12)",
  },
} as const;

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDollars(amount: number): string {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col h-full"
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#344767]">Recent Activity</h3>
        <p className="text-xs text-[#94a3b8] mt-0.5">Latest job and supplement events</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
            <svg className="h-5 w-5 text-[#94a3b8]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#344767]">No activity yet</p>
          <p className="text-xs text-[#94a3b8]">Job events will appear here</p>
        </div>
      ) : (
        <div className="relative flex-1 overflow-y-auto">
          {/* Vertical line */}
          <div
            className="absolute left-[11px] top-0 bottom-0 w-px"
            style={{ background: "linear-gradient(to bottom, #e2e8f0, transparent)" }}
          />

          <div className="space-y-1">
            {items.map((item, index) => {
              const config = TYPE_CONFIG[item.type];
              return (
                <div key={`${item.id}-${index}`} className="relative flex items-start gap-3 pl-7 py-2.5">
                  {/* Dot */}
                  <div
                    className="absolute left-0 top-[13px] flex h-[22px] w-[22px] items-center justify-center rounded-full flex-shrink-0"
                    style={{ background: config.dotBg }}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ background: config.dotColor }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/supplements/${item.id}`}
                          className="text-xs font-semibold text-[#344767] hover:text-[#00BFFF] transition-colors truncate block"
                        >
                          {item.claimName}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: config.dotColor }}
                          >
                            {config.label}
                          </span>
                          {item.amount != null && item.amount > 0 && (
                            <>
                              <span className="text-[10px] text-[#94a3b8]">·</span>
                              <span className="text-[10px] font-medium text-[#344767]">
                                {formatDollars(item.amount)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-[#94a3b8] flex-shrink-0 mt-0.5">
                        {relativeTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <Link
            href="/dashboard/supplements"
            className="text-xs font-semibold text-[#00BFFF] hover:text-[#0090cc] transition-colors flex items-center gap-1"
          >
            View all jobs
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
