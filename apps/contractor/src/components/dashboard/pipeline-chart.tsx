"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface PipelineChartProps {
  data: { status: string; count: number; color: string }[];
}

const STATUS_DISPLAY: Record<string, string> = {
  draft: "Awaiting Payment",
  generating: "Generating",
  complete: "Complete",
  approved: "Approved",
  partially_approved: "Partially Approved",
  denied: "Denied",
};

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { status: string; count: number; color: string };
}

function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  total: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";

  return (
    <div
      className="rounded-xl bg-white border border-gray-100 px-3 py-2 shadow-lg text-sm"
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.10)" }}
    >
      <p className="font-semibold text-[#344767]">
        {STATUS_DISPLAY[item.payload.status] ?? item.payload.status}
      </p>
      <p className="text-[#94a3b8]">
        {item.value} supplement{item.value !== 1 ? "s" : ""} — {pct}%
      </p>
    </div>
  );
}

export function PipelineChart({ data }: PipelineChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const hasData = total > 0;

  // Filter out zero-count items for the chart but keep all for legend
  const chartData = hasData ? data.filter((d) => d.count > 0) : [];

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col h-full"
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
    >
      <h3 className="text-sm font-semibold text-[#344767] mb-1">Pipeline Status</h3>
      <p className="text-xs text-[#94a3b8] mb-4">Supplement status breakdown</p>

      {!hasData ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[#94a3b8]">No supplements yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-1">
          {/* Donut */}
          <div className="relative h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={2}
                  dataKey="count"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip total={total} />}
                  wrapperStyle={{ outline: "none" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-[#344767]">{total}</span>
              <span className="text-[10px] font-medium text-[#94a3b8] uppercase tracking-wide">Total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-xs text-[#344767]">
                    {STATUS_DISPLAY[item.status] ?? item.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#344767]">{item.count}</span>
                  <span className="text-[10px] text-[#94a3b8] w-8 text-right">
                    {total > 0 ? `${((item.count / total) * 100).toFixed(0)}%` : "0%"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
