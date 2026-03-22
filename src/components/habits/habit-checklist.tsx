"use client";

import { useState } from "react";
import { Flame, Trophy, Pencil, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Habit } from "@/types/habits";
import { calcStreak, isCompletedToday, isScheduledToday } from "@/lib/habits-data";

interface HabitRowProps {
  habit: Habit;
  today: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function HabitRow({ habit, today, onToggle, onDelete }: HabitRowProps) {
  const completed = isCompletedToday(habit, today);
  const scheduled = isScheduledToday(habit, today);
  const { current, longest } = calcStreak(habit, today);

  const freqLabel: Record<string, string> = {
    daily: "Every day",
    weekdays: "Weekdays",
    weekends: "Weekends",
  };

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200
        ${completed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
        }
        ${!scheduled ? "opacity-50" : ""}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={() => scheduled && onToggle(habit.id)}
        disabled={!scheduled}
        className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200
          ${completed
            ? "border-emerald-500 bg-emerald-500"
            : "border-zinc-600 bg-transparent hover:border-zinc-400"
          }
          ${!scheduled ? "cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {completed && (
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Emoji + name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-lg leading-none">{habit.emoji}</span>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${completed ? "line-through text-zinc-500" : "text-zinc-100"}`}>
            {habit.name}
          </p>
          <p className="text-[11px] text-zinc-600">{freqLabel[habit.frequency]}</p>
        </div>
      </div>

      {/* Streak badges */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Current streak */}
        {current > 0 && (
          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold
            ${current >= 7 ? "bg-orange-500/20 text-orange-400" : "bg-zinc-800 text-zinc-400"}`}
          >
            <Flame className={`h-3 w-3 ${current >= 7 ? "text-orange-400" : "text-zinc-500"}`} />
            {current}d
          </div>
        )}
        {/* Best streak */}
        {longest >= 7 && (
          <div className="hidden sm:flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
            <Trophy className="h-3 w-3" />
            {longest}
          </div>
        )}
        {!scheduled && (
          <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-600">Rest day</Badge>
        )}
      </div>

      {/* Row actions */}
      <button
        onClick={() => onDelete(habit.id)}
        className="ml-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface HabitChecklistProps {
  habits: Habit[];
  today: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
}

export function HabitChecklist({ habits, today, onToggle, onDelete, onAddClick }: HabitChecklistProps) {
  const scheduledToday = habits.filter((h) => isScheduledToday(h, today));
  const completedToday = scheduledToday.filter((h) => isCompletedToday(h, today));
  const pct = scheduledToday.length > 0
    ? Math.round((completedToday.length / scheduledToday.length) * 100)
    : 0;

  return (
    <div className="space-y-3">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-zinc-300">
            {completedToday.length}/{scheduledToday.length} done today
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-xs font-semibold ${pct === 100 ? "text-emerald-400" : "text-zinc-500"}`}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Habit rows */}
      <div className="space-y-2">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-800 py-10">
            <p className="text-sm text-zinc-500">No habits yet. Add your first one!</p>
            <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400" onClick={onAddClick}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Habit
            </Button>
          </div>
        ) : (
          habits.map((h) => (
            <HabitRow key={h.id} habit={h} today={today} onToggle={onToggle} onDelete={onDelete} />
          ))
        )}
      </div>

      {/* Add button */}
      {habits.length > 0 && (
        <button
          onClick={onAddClick}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-800 py-2.5 text-xs text-zinc-600 hover:border-zinc-700 hover:text-zinc-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add habit
        </button>
      )}
    </div>
  );
}
