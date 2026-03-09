"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface RecoveryChartProps {
  data: { month: string; amount: number; count: number }[];
}

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const amountEntry = payload.find((p) => p.dataKey === "amount");
  const countEntry = payload.find((p) => p.dataKey === "count");

  return (
    <div
      className="rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-lg text-sm min-w-[160px]"
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.10)" }}
    >
      <p className="font-semibold text-[#344767] mb-2">{label}</p>
      {amountEntry && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#94a3b8] text-xs">Recovery</span>
          <span className="font-semibold text-[#344767]">
            {amountEntry.value >= 1_000
              ? `$${amountEntry.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
              : `$${amountEntry.value}`}
          </span>
        </div>
      )}
      {countEntry && (
        <div className="flex items-center justify-between gap-4 mt-1">
          <span className="text-[#94a3b8] text-xs">Supplements</span>
          <span className="font-semibold text-[#344767]">{countEntry.value}</span>
        </div>
      )}
    </div>
  );
}

export function RecoveryChart({ data }: RecoveryChartProps) {
  const hasData = data.some((d) => d.amount > 0 || d.count > 0);

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col h-full"
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
    >
      <h3 className="text-sm font-semibold text-[#344767] mb-1">Recovery Trends</h3>
      <p className="text-xs text-[#94a3b8] mb-4">Monthly recovery value + supplement volume</p>

      {!hasData ? (
        <div className="flex flex-1 items-center justify-center min-h-[220px]">
          <p className="text-sm text-[#94a3b8]">No recovery data yet</p>
        </div>
      ) : (
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart
              data={data}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                yAxisId="amount"
                orientation="left"
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(0,191,255,0.04)" }}
                wrapperStyle={{ outline: "none" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
                formatter={(value) =>
                  value === "amount" ? "Recovery ($)" : "Supplements"
                }
              />
              <Bar
                yAxisId="amount"
                dataKey="amount"
                fill="#00BFFF"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                fillOpacity={0.85}
              />
              <Line
                yAxisId="count"
                dataKey="count"
                stroke="#344767"
                strokeWidth={2}
                dot={{ r: 3, fill: "#344767", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#344767" }}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
