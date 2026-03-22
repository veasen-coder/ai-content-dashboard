"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { DailyMetric } from "@/lib/metricool";

interface ImpressionsChartProps {
  data: DailyMetric[];
}

function formatK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2.5 shadow-xl text-xs space-y-1.5 backdrop-blur-sm">
      <p className="text-zinc-400 font-medium">
        {label ? format(parseISO(label), "MMM d, yyyy") : ""}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-sm shrink-0"
            style={{ background: p.fill }}
          />
          <span className="text-zinc-300 capitalize">{p.name}:</span>
          <span className="font-semibold text-white ml-auto pl-4">
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ImpressionsChart({ data }: ImpressionsChartProps) {
  const tickData = data.filter((_, i) => {
    if (data.length <= 14) return true;
    if (data.length <= 31) return i % 3 === 0;
    return i % 7 === 0;
  });
  const tickDates = new Set(tickData.map((d) => d.date));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barGap={2}>
        <defs>
          <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(d) =>
            tickDates.has(d) ? format(parseISO(d), "MMM d") : ""
          }
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatK}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="impressions" fill="url(#impGrad)" radius={[3, 3, 0, 0]} maxBarSize={16} />
        <Bar dataKey="reach" fill="url(#reachGrad)" radius={[3, 3, 0, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
