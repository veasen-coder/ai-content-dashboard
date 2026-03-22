"use client";

import { format, parseISO, startOfWeek, getWeek } from "date-fns";
import { HeatmapDay } from "@/lib/habits-data";

interface ContributionHeatmapProps {
  data: HeatmapDay[];
  today: string;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function rateToColor(rate: number, scheduled: boolean): string {
  if (!scheduled) return "bg-zinc-900 border-zinc-800/60";
  if (rate === 0)   return "bg-zinc-800 border-zinc-700/50";
  if (rate < 0.25)  return "bg-emerald-900/60 border-emerald-800/40";
  if (rate < 0.50)  return "bg-emerald-800/70 border-emerald-700/40";
  if (rate < 0.75)  return "bg-emerald-700/80 border-emerald-600/40";
  if (rate < 1)     return "bg-emerald-600/90 border-emerald-500/50";
  return "bg-emerald-500 border-emerald-400/60";
}

function rateToLabel(rate: number, completed: number, scheduled: number): string {
  if (scheduled === 0) return "No habits scheduled";
  return `${completed}/${scheduled} habits (${Math.round(rate * 100)}%)`;
}

export function ContributionHeatmap({ data, today }: ContributionHeatmapProps) {
  // Chunk into weeks (each chunk = 7 days)
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  // Build month label positions — show month name at first week of each month
  const monthLabels: { idx: number; label: string }[] = [];
  weeks.forEach((week, wIdx) => {
    const firstDay = week[0];
    if (!firstDay) return;
    const d = parseISO(firstDay.date);
    // Show label if it's the 1st or the very first week
    const dayOfMonth = parseInt(format(d, "d"));
    if (dayOfMonth <= 7 || wIdx === 0) {
      const label = format(d, "MMM");
      if (!monthLabels.length || monthLabels[monthLabels.length - 1].label !== label) {
        monthLabels.push({ idx: wIdx, label });
      }
    }
  });

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div className="flex gap-[3px] pl-8">
        {weeks.map((_, wIdx) => {
          const ml = monthLabels.find((m) => m.idx === wIdx);
          return (
            <div key={wIdx} className="w-[14px] shrink-0 text-[9px] text-zinc-500 text-center">
              {ml ? ml.label : ""}
            </div>
          );
        })}
      </div>

      {/* Grid: 7 rows (days) × N cols (weeks) */}
      <div className="flex gap-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-[3px] pr-1 justify-around">
          {DOW_LABELS.map((d, i) => (
            <div key={d} className={`text-[9px] text-zinc-600 w-6 text-right ${i % 2 === 1 ? "" : "opacity-0"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-[3px]">
              {week.map((day) => {
                const isToday = day.date === today;
                const isFuture = day.date > today;
                const scheduled = day.scheduled > 0;
                const colorClass = isFuture
                  ? "bg-zinc-900/40 border-zinc-800/30 opacity-30"
                  : rateToColor(day.rate, scheduled);

                return (
                  <div key={day.date} className="group relative">
                    <div
                      className={`h-[14px] w-[14px] rounded-[3px] border transition-all duration-150 group-hover:ring-1 group-hover:ring-white/20
                        ${colorClass}
                        ${isToday ? "ring-2 ring-emerald-400/60" : ""}
                      `}
                    />
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 hidden group-hover:block">
                      <div className="whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 shadow-xl">
                        <span className="font-medium">{format(parseISO(day.date), "EEE, MMM d")}</span>
                        <br />
                        <span className="text-zinc-400">
                          {isFuture ? "Future" : rateToLabel(day.rate, day.completed, day.scheduled)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 pt-1 justify-end">
        <span className="text-[10px] text-zinc-600">Less</span>
        {["bg-zinc-800", "bg-emerald-900/60", "bg-emerald-700/80", "bg-emerald-600/90", "bg-emerald-500"].map((c) => (
          <div key={c} className={`h-[10px] w-[10px] rounded-[2px] ${c}`} />
        ))}
        <span className="text-[10px] text-zinc-600">More</span>
      </div>
    </div>
  );
}
