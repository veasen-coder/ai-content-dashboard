"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  ComposedChart,
  Area,
} from "recharts";
import { format, parseISO } from "date-fns";
import { FollowerMetric } from "@/lib/metricool";

interface FollowerChartProps {
  data: FollowerMetric[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; fill?: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const followers = payload.find((p) => p.name === "followers");
  const gained = payload.find((p) => p.name === "gained");
  const lost = payload.find((p) => p.name === "lost");

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2.5 shadow-xl text-xs space-y-1.5 backdrop-blur-sm min-w-[180px]">
      <p className="text-zinc-400 font-medium">
        {label ? format(parseISO(label), "MMM d, yyyy") : ""}
      </p>
      {followers && (
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-1.5 mb-1.5">
          <span className="h-2 w-2 rounded-full shrink-0 bg-blue-400" />
          <span className="text-zinc-300">Total followers:</span>
          <span className="font-bold text-white ml-auto">{followers.value.toLocaleString()}</span>
        </div>
      )}
      {gained && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm shrink-0 bg-emerald-500" />
          <span className="text-zinc-400">Gained:</span>
          <span className="font-semibold text-emerald-400 ml-auto">+{gained.value}</span>
        </div>
      )}
      {lost && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm shrink-0 bg-red-500" />
          <span className="text-zinc-400">Lost:</span>
          <span className="font-semibold text-red-400 ml-auto">-{lost.value}</span>
        </div>
      )}
    </div>
  );
}

function formatK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function FollowerChart({ data }: FollowerChartProps) {
  const tickData = data.filter((_, i) => {
    if (data.length <= 14) return true;
    if (data.length <= 31) return i % 4 === 0;
    return i % 9 === 0;
  });
  const tickDates = new Set(tickData.map((d) => d.date));

  return (
    <div className="space-y-6">
      {/* Follower count line chart */}
      <div>
        <p className="text-xs text-zinc-500 mb-3">Total followers over time</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="followerLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
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
              tickFormatter={formatK}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#3f3f46", strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="followers"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily gained vs lost bars */}
      <div>
        <p className="text-xs text-zinc-500 mb-3">Daily gained vs. lost</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} margin={{ top: 0, right: 4, left: -10, bottom: 0 }} barGap={1}>
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="gained" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={10} />
            <Bar dataKey="lost" fill="#ef4444" radius={[2, 2, 0, 0]} maxBarSize={10} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-zinc-500">Gained</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-full bg-red-500" />
            <span className="text-[11px] text-zinc-500">Lost</span>
          </div>
        </div>
      </div>
    </div>
  );
}
