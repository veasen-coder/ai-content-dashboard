"use client";

import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { CalendarClock, CheckCircle2, Plus, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Goal } from "@/types/habits";
import { CATEGORY_META } from "@/types/habits";

interface GoalCardProps {
  goal: Goal;
  today: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, current: number) => void;
}

function GoalCard({ goal, today, onDelete, onUpdate }: GoalCardProps) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const daysLeft = differenceInCalendarDays(parseISO(goal.targetDate), parseISO(today));
  const done = pct >= 100;
  const urgent = !done && daysLeft <= 14;
  const cat = CATEGORY_META[goal.category];

  const nextMilestone = goal.milestones.find((m) => m.value > goal.current);
  const toNext = nextMilestone ? nextMilestone.value - goal.current : 0;

  const isPercent = goal.unit.includes("%");
  const isCurrency = goal.unit.startsWith("$");

  function fmt(n: number) {
    if (isCurrency) return `$${n.toLocaleString()}`;
    return `${n.toLocaleString()} ${goal.unit}`;
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 hover:border-zinc-700
        ${done ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/60"}
      `}
    >
      {/* Top accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: `hsl(${goal.colorHue}, 65%, 50%)` }}
      />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">{goal.emoji}</span>
            <div>
              <p className={`text-sm font-semibold ${done ? "text-emerald-400" : "text-zinc-100"}`}>
                {goal.name}
              </p>
              <p className="text-[11px] text-zinc-500 line-clamp-1">{goal.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 ${cat.bg} ${cat.color}`}>
              {cat.label}
            </Badge>
            {done && (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 tabular-nums">{fmt(goal.current)}</span>
            <span className="text-zinc-600 tabular-nums">{fmt(goal.target)}</span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
            {/* Milestone ticks */}
            {goal.milestones.map((m) => {
              const pos = Math.min(100, (m.value / goal.target) * 100);
              const passed = goal.current >= m.value;
              return (
                <div
                  key={m.value}
                  className={`absolute top-0 h-full w-0.5 -translate-x-px transition-colors
                    ${passed ? "bg-white/30" : "bg-zinc-600/60"}`}
                  style={{ left: `${pos}%` }}
                  title={m.label}
                />
              );
            })}
            {/* Fill */}
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: done
                  ? "linear-gradient(90deg, #10b981, #34d399)"
                  : `linear-gradient(90deg, hsl(${goal.colorHue}, 65%, 42%), hsl(${goal.colorHue}, 65%, 58%))`,
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold tabular-nums
              ${done ? "text-emerald-400" : pct >= 75 ? "text-amber-400" : "text-zinc-400"}`}>
              {pct}%
            </span>
            {nextMilestone && !done && (
              <span className="text-[11px] text-zinc-600">
                {fmt(toNext)} to "{nextMilestone.label}"
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
          <div className="flex items-center gap-1.5 text-[11px]">
            <CalendarClock className={`h-3.5 w-3.5 ${urgent ? "text-red-400" : "text-zinc-500"}`} />
            {done ? (
              <span className="text-emerald-400 font-medium">Completed! 🎉</span>
            ) : daysLeft < 0 ? (
              <span className="text-red-400">Overdue by {Math.abs(daysLeft)} days</span>
            ) : (
              <span className={urgent ? "text-red-400" : "text-zinc-500"}>
                {daysLeft === 0 ? "Due today!" : `${daysLeft} days left`}
                <span className="text-zinc-600"> · {format(parseISO(goal.targetDate), "MMM d, yyyy")}</span>
              </span>
            )}
          </div>

          {/* Quick +/- controls */}
          {!done && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onUpdate(goal.id, Math.max(0, goal.current - (isPercent ? 5 : isCurrency ? 100 : 1)))}
                className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-xs"
              >−</button>
              <button
                onClick={() => onUpdate(goal.id, Math.min(goal.target, goal.current + (isPercent ? 5 : isCurrency ? 100 : 1)))}
                className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-xs"
              >+</button>
              <button onClick={() => onDelete(goal.id)} className="ml-1 text-zinc-600 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface GoalCardsProps {
  goals: Goal[];
  today: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, current: number) => void;
  onAddClick: () => void;
}

export function GoalCards({ goals, today, onDelete, onUpdate, onAddClick }: GoalCardsProps) {
  const done = goals.filter((g) => g.current >= g.target).length;
  const inProgress = goals.length - done;

  return (
    <div className="space-y-3">
      {/* Summary row */}
      {goals.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span><span className="text-zinc-200 font-semibold">{goals.length}</span> goals total</span>
          <span className="text-zinc-700">·</span>
          <span><span className="text-emerald-400 font-semibold">{done}</span> completed</span>
          <span className="text-zinc-700">·</span>
          <span><span className="text-amber-400 font-semibold">{inProgress}</span> in progress</span>
        </div>
      )}

      {/* Cards grid */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-800 py-12">
          <Target className="h-10 w-10 text-zinc-700" />
          <p className="text-sm text-zinc-500">No goals yet. Set your first one!</p>
          <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400" onClick={onAddClick}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Goal
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} today={today} onDelete={onDelete} onUpdate={onUpdate} />
            ))}
            {/* Add card */}
            <button
              onClick={onAddClick}
              className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400 transition-colors"
            >
              <Plus className="h-6 w-6" />
              <span className="text-xs">Add goal</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
