"use client";

import { useState } from "react";
import { DashboardStats } from "./dashboard-stats";
import { JobsPipeline } from "./jobs-pipeline";
import type { JobsPipelineProps } from "./jobs-pipeline";
import { PipelineChart } from "./pipeline-chart";
import { RecoveryChart } from "./recovery-chart";
import { ActionItems } from "./action-items";
import { ActivityFeed } from "./activity-feed";
import type { DashboardStatsProps } from "./dashboard-stats";
import type { PipelineChartProps } from "./pipeline-chart";
import type { RecoveryChartProps } from "./recovery-chart";
import type { ActionItemsProps } from "./action-items";
import type { ActivityItem } from "./activity-feed";

export type Period = "month" | "quarter" | "year" | "all";

export interface DashboardClientProps {
  // Full-range data (all time)
  allStats: DashboardStatsProps;
  allPipeline: PipelineChartProps["data"];
  allRecovery: RecoveryChartProps["data"];
  allActionItems: ActionItemsProps;
  allActivity: ActivityItem[];

  // Per-period data
  periodStats: Record<Period, DashboardStatsProps>;

  // Jobs pipeline
  jobs: JobsPipelineProps["jobs"];
}

const PERIOD_LABELS: Record<Period, string> = {
  month: "This Month",
  quarter: "Quarter",
  year: "This Year",
  all: "All Time",
};

export function DashboardClient({
  allPipeline,
  allRecovery,
  allActionItems,
  allActivity,
  periodStats,
  jobs,
}: DashboardClientProps) {
  const [period, setPeriod] = useState<Period>("month");

  const stats = periodStats[period];

  return (
    <div className="space-y-5">
      {/* Period toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#344767]">Overview</h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Performance metrics for your supplement pipeline
          </p>
        </div>
        <div
          className="flex items-center gap-1 rounded-xl border border-gray-100 bg-white p-1"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                period === p
                  ? "bg-[#344767] text-white shadow-sm"
                  : "text-[#94a3b8] hover:text-[#344767]"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: KPI cards */}
      <DashboardStats {...stats} />

      {/* Row 2: Jobs pipeline */}
      <JobsPipeline jobs={jobs} />

      {/* Supplement Analytics */}
      <div>
        <h2 className="text-base font-bold text-[#344767] mb-1">Supplement Analytics</h2>
        <p className="text-xs text-[#94a3b8] mb-4">
          Supplement pipeline status and recovery trends
        </p>

        {/* Pipeline donut + Recovery chart */}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="md:col-span-1">
            <PipelineChart data={allPipeline} />
          </div>
          <div className="md:col-span-2">
            <RecoveryChart data={allRecovery} />
          </div>
        </div>
      </div>

      {/* Row 3: Action items + Activity feed */}
      <div className="grid gap-5 md:grid-cols-2">
        <ActionItems {...allActionItems} />
        <ActivityFeed items={allActivity} />
      </div>
    </div>
  );
}
