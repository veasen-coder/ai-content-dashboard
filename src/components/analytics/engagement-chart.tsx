"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { DailyMetric } from "@/lib/metricool";

interface EngagementChartProps {
  data: DailyMetric[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const SERIES = [
  { key: "likes", color: "#f43f5e", label: "Likes" },
  { key: "comments", color: "#f59e0b", label: "Comments" },
  { key: "shares", color: "#10b981", label: "Shares" },
  { key: "saves", color: "#8b5cf6", label: "Saves" },
];

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2.5 shadow-xl text-xs space-y-1.5 backdrop-blur-sm min-w-[160px]">
      <p className="text-zinc-400 font-medium">
        {label ? format(parseISO(label), "MMM d, yyyy") : ""}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-zinc-300 capitalize">{p.name}:</span>
          <span className="font-semibold text-white ml-auto pl-4">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
      {SERIES.map((s) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-full" style={{ background: s.color }} />
          <span className="text-[11px] text-zinc-500">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export function EngagementChart({ data }: EngagementChartProps) {
  const tickData = data.filter((_, i) => {
    if (data.length <= 14) return true;
    if (data.length <= 31) return i % 3 === 0;
    return i % 7 === 0;
  });
  const tickDates = new Set(tickData.map((d) => d.date));

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d) => (tickDates.has(d) ? format(parseISO(d), "MMM d") : "")}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#3f3f46", strokeWidth: 1 }} />
          {SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
}
