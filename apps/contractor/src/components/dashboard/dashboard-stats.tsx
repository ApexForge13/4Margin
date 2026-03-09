"use client";

export interface DashboardStatsProps {
  totalSupplements: number;
  supplementsTrend: number;
  totalRecovery: number;
  recoveryTrend: number;
  approvalRate: number;
  approvalTrend: number;
  totalDecodes: number;
  decodesTrend: number;
}

function formatDollars(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return `$${amount}`;
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend === 0) {
    return <span className="text-xs text-[#94a3b8] font-medium">—</span>;
  }

  const isPositive = trend > 0;
  const color = isPositive ? "#10b981" : "#ef4444";
  const arrow = isPositive ? "↑" : "↓";

  return (
    <span
      className="flex items-center gap-0.5 text-xs font-semibold"
      style={{ color }}
    >
      <span>{arrow}</span>
      <span>{Math.abs(trend).toFixed(0)}%</span>
      <span className="text-[#94a3b8] font-normal ml-0.5">vs last period</span>
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  trend: number;
  iconBg: string;
  icon: React.ReactNode;
}

function KpiCard({ label, value, trend, iconBg, icon }: KpiCardProps) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3"
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
          {label}
        </span>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-[#344767] leading-none">{value}</p>
      </div>
      <TrendBadge trend={trend} />
    </div>
  );
}

export function DashboardStats({
  totalSupplements,
  supplementsTrend,
  totalRecovery,
  recoveryTrend,
  approvalRate,
  approvalTrend,
  totalDecodes,
  decodesTrend,
}: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total Supplements"
        value={String(totalSupplements)}
        trend={supplementsTrend}
        iconBg="rgba(59, 130, 246, 0.12)"
        icon={
          <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
      <KpiCard
        label="Recovery Value"
        value={formatDollars(totalRecovery)}
        trend={recoveryTrend}
        iconBg="rgba(16, 185, 129, 0.12)"
        icon={
          <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <KpiCard
        label="Approval Rate"
        value={`${approvalRate.toFixed(0)}%`}
        trend={approvalTrend}
        iconBg="rgba(0, 191, 255, 0.12)"
        icon={
          <svg className="h-4 w-4 text-[#00BFFF]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <KpiCard
        label="Policy Decodes"
        value={String(totalDecodes)}
        trend={decodesTrend}
        iconBg="rgba(139, 92, 246, 0.12)"
        icon={
          <svg className="h-4 w-4 text-violet-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        }
      />
    </div>
  );
}
