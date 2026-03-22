"use client";

import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
}

function SparkTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 shadow-lg">
      {payload[0].value.toLocaleString()}
    </div>
  );
}

export function Sparkline({ data, color = "#10b981", height = 36 }: SparklineProps) {
  const points = data.map((v, i) => ({ i, v }));
  const first = data[0] ?? 0;
  const last = data[data.length - 1] ?? 0;
  const trending = last >= first;
  const lineColor = color === "auto" ? (trending ? "#10b981" : "#ef4444") : color;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Tooltip content={<SparkTooltip />} />
        <Line
          type="monotone"
          dataKey="v"
          stroke={lineColor}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
