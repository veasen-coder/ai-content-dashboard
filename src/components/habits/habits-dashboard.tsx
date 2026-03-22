"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  CheckSquare, Flame, Target, Trophy,
  Sparkles, TrendingUp, CalendarDays, Plus,
  BarChart2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { HabitChecklist } from "./habit-checklist";
import { ContributionHeatmap } from "./contribution-heatmap";
import { GoalCards } from "./goal-cards";
import { AddHabitDialog } from "./add-habit-dialog";
import { AddGoalDialog } from "./add-goal-dialog";
import {
  SEED_HABITS, SEED_GOALS, TODAY,
  buildHeatmapData, calcStreak,
  isCompletedToday, isScheduledToday,
  getMotivationalMessage,
} from "@/lib/habits-data";
import type { Habit, Goal } from "@/types/habits";

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 flex items-center gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums">{value}</p>
        <p className="text-[11px] text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Motivational summary banner ──────────────────────────────────────────────
function MotivationalBanner({
  habits, goals, today,
}: {
  habits: Habit[];
  goals: Goal[];
  today: string;
}) {
  const scheduled = habits.filter((h) => isScheduledToday(h, today));
  const completed = scheduled.filter((h) => isCompletedToday(h, today));
  const bestStreak = Math.max(0, ...habits.map((h) => calcStreak(h, today).current));
  const msg = getMotivationalMessage(completed.length, scheduled.length, bestStreak);
  const pct = scheduled.length > 0 ? Math.round((completed.length / scheduled.length) * 100) : 0;

  // Goals summary
  const doneGoals = goals.filter((g) => g.current >= g.target).length;
  const avgGoalPct = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + Math.min(100, (g.current / g.target) * 100), 0) / goals.length)
    : 0;

  const dayOfWeek = format(parseISO(today), "EEEE");
  const dateLabel = format(parseISO(today), "MMMM d, yyyy");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-5">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-10 blur-3xl"
        style={{ background: `hsl(${pct === 100 ? 160 : 200}, 80%, 60%)` }}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: message */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-zinc-400">{dayOfWeek}, {dateLabel}</span>
          </div>
          <h2 className="text-lg font-bold text-zinc-100">{msg.headline}</h2>
          <p className="text-sm text-zinc-400 max-w-md">{msg.sub}</p>
        </div>

        {/* Right: today's ring */}
        <div className="flex items-center gap-5 shrink-0">
          {/* Circular progress */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#27272a" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="32" fill="none"
                stroke={pct === 100 ? "#10b981" : "#3b82f6"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums leading-none">{pct}%</p>
              <p className="text-[9px] text-zinc-500 mt-0.5">today</p>
            </div>
          </div>

          {/* Mini stats */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-zinc-400">Best streak:</span>
              <span className="font-semibold text-zinc-200">{bestStreak}d</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Target className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-zinc-400">Goals avg:</span>
              <span className="font-semibold text-zinc-200">{avgGoalPct}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-zinc-400">Goals done:</span>
              <span className="font-semibold text-zinc-200">{doneGoals}/{goals.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Week bar ─────────────────────────────────────────────────────────────────
function WeekBar({ habits, today }: { habits: Habit[]; today: string }) {
  const todayDate = parseISO(today);
  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  // Build Mon→Sun for current week
  const dayOfWeek = todayDate.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - mondayOffset + i);
    return format(d, "yyyy-MM-dd");
  });

  return (
    <div className="flex items-end gap-1.5 h-16">
      {weekDays.map((ds, i) => {
        const isFuture = ds > today;
        const isToday2 = ds === today;
        const scheduled = habits.filter((h) => {
          const dow = parseISO(ds).getDay();
          if (h.frequency === "daily") return true;
          if (h.frequency === "weekdays") return dow >= 1 && dow <= 5;
          return dow === 0 || dow === 6;
        });
        const done = scheduled.filter((h) => h.completions.includes(ds));
        const rate = scheduled.length > 0 ? done.length / scheduled.length : 0;
        const barH = scheduled.length === 0 ? 8 : Math.max(8, Math.round(rate * 48));

        return (
          <div key={ds} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full justify-center items-end" style={{ height: 48 }}>
              <div
                className={`w-full max-w-[28px] rounded-t-md transition-all duration-500
                  ${isFuture ? "bg-zinc-800/40" :
                    rate === 1 ? "bg-emerald-500" :
                    rate > 0 ? "bg-emerald-700/70" : "bg-zinc-700/50"
                  }`}
                style={{ height: isFuture ? 8 : barH }}
              />
            </div>
            <span className={`text-[10px] font-medium ${isToday2 ? "text-emerald-400" : "text-zinc-600"}`}>
              {DAYS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export function HabitsDashboard() {
  const [habits, setHabits] = useState<Habit[]>(SEED_HABITS);
  const [goals, setGoals] = useState<Goal[]>(SEED_GOALS);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const today = TODAY;

  // ── Habit actions ──
  function toggleHabit(id: string) {
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const has = h.completions.includes(today);
      return {
        ...h,
        completions: has
          ? h.completions.filter((d) => d !== today)
          : [...h.completions, today],
      };
    }));
  }

  function deleteHabit(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  function addHabit(data: Omit<Habit, "id" | "completions" | "createdAt">) {
    const newHabit: Habit = {
      ...data,
      id: `h-${Date.now()}`,
      completions: [],
      createdAt: today,
    };
    setHabits((prev) => [...prev, newHabit]);
  }

  // ── Goal actions ──
  function deleteGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  function updateGoalProgress(id: string, current: number) {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, current } : g));
  }

  function addGoal(data: Omit<Goal, "id" | "createdAt">) {
    const newGoal: Goal = { ...data, id: `g-${Date.now()}`, createdAt: today };
    setGoals((prev) => [...prev, newGoal]);
  }

  // ── Derived stats ──
  const heatmapData = useMemo(() => buildHeatmapData(habits, today, 16), [habits, today]);

  const scheduledToday = habits.filter((h) => isScheduledToday(h, today));
  const completedToday = scheduledToday.filter((h) => isCompletedToday(h, today));

  const allStreaks = habits.map((h) => calcStreak(h, today).current);
  const longestCurrentStreak = Math.max(0, ...allStreaks);
  const totalStreakDays = allStreaks.reduce((a, b) => a + b, 0);

  const doneGoals = goals.filter((g) => g.current >= g.target).length;

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 shadow-lg shadow-emerald-900/20">
            <CheckSquare className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Habit & Goal Tracker</h1>
            <p className="text-sm text-muted-foreground">
              {habits.length} habits · {goals.length} goals · {format(parseISO(today), "MMMM yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline"
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs h-9 text-zinc-300"
            onClick={() => setHabitDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Habit
          </Button>
          <Button size="sm"
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 h-9"
            onClick={() => setGoalDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Goal
          </Button>
        </div>
      </div>

      {/* ── Motivational banner ── */}
      <MotivationalBanner habits={habits} goals={goals} today={today} />

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={CheckSquare}  label="Done today"       value={`${completedToday.length}/${scheduledToday.length}`} sub="" accent="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={Flame}        label="Longest streak"   value={`${longestCurrentStreak}d`}    sub="" accent="bg-orange-500/20 text-orange-400" />
        <StatCard icon={Target}       label="Goals completed"  value={`${doneGoals}/${goals.length}`} sub="" accent="bg-violet-500/20 text-violet-400" />
        <StatCard icon={TrendingUp}   label="Total streak days" value={totalStreakDays}               sub="" accent="bg-blue-500/20 text-blue-400" />
      </div>

      {/* ── Main tabs ── */}
      <Tabs defaultValue="habits" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800 h-9 p-0.5 gap-0.5">
          {[
            { value: "habits",   label: "Habits",          icon: CheckSquare },
            { value: "goals",    label: "Goals",           icon: Target },
            { value: "heatmap",  label: "Activity",        icon: BarChart2 },
          ].map((t) => (
            <TabsTrigger key={t.value} value={t.value}
              className="h-8 px-4 text-xs gap-1.5 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md text-zinc-400 data-[state=active]:text-zinc-100">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Habits tab ── */}
        <TabsContent value="habits" className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Checklist — 2 cols */}
            <div className="lg:col-span-2">
              <Card className="border-zinc-800 bg-zinc-900/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Today's Habits</CardTitle>
                      <CardDescription className="text-xs">
                        {format(parseISO(today), "EEEE, MMMM d")}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={`text-xs border-0
                      ${completedToday.length === scheduledToday.length && scheduledToday.length > 0
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-zinc-800 text-zinc-400"}`}>
                      {completedToday.length}/{scheduledToday.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <HabitChecklist
                    habits={habits}
                    today={today}
                    onToggle={toggleHabit}
                    onDelete={deleteHabit}
                    onAddClick={() => setHabitDialogOpen(true)}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar: streak leaderboard + week bar */}
            <div className="space-y-4">
              {/* Week completion bar chart */}
              <Card className="border-zinc-800 bg-zinc-900/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <CardDescription className="text-xs">Daily completion rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <WeekBar habits={habits} today={today} />
                </CardContent>
              </Card>

              {/* Streak leaderboard */}
              <Card className="border-zinc-800 bg-zinc-900/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Streak Board</CardTitle>
                  <CardDescription className="text-xs">Current streaks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[...habits]
                    .map((h) => ({ h, streak: calcStreak(h, today) }))
                    .sort((a, b) => b.streak.current - a.streak.current)
                    .slice(0, 6)
                    .map(({ h, streak }, i) => (
                      <div key={h.id} className="flex items-center gap-2.5">
                        <span className={`text-[11px] font-bold w-4 text-right
                          ${i === 0 ? "text-amber-400" : "text-zinc-600"}`}>
                          {i + 1}
                        </span>
                        <span className="text-base leading-none">{h.emoji}</span>
                        <span className="flex-1 text-xs text-zinc-400 truncate">{h.name}</span>
                        <div className="flex items-center gap-1">
                          <Flame className={`h-3 w-3 ${streak.current >= 7 ? "text-orange-400" : "text-zinc-600"}`} />
                          <span className={`text-xs font-semibold tabular-nums
                            ${streak.current >= 14 ? "text-orange-400" :
                              streak.current >= 7 ? "text-amber-400" : "text-zinc-400"}`}>
                            {streak.current}d
                          </span>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Goals tab ── */}
        <TabsContent value="goals">
          <GoalCards
            goals={goals}
            today={today}
            onDelete={deleteGoal}
            onUpdate={updateGoalProgress}
            onAddClick={() => setGoalDialogOpen(true)}
          />
        </TabsContent>

        {/* ── Activity/Heatmap tab ── */}
        <TabsContent value="heatmap" className="space-y-5">
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">Habit Activity</CardTitle>
                  <CardDescription className="text-xs">
                    Daily completion rate across all habits — last 16 weeks
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                  <span>{habits.length} habits tracked</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-medium">
                    {heatmapData.filter((d) => d.rate === 1 && d.scheduled > 0).length} perfect days
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ContributionHeatmap data={heatmapData} today={today} />
            </CardContent>
          </Card>

          {/* Per-habit mini stats */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Per-Habit Stats</CardTitle>
              <CardDescription className="text-xs">Completion rates and streaks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {habits.map((h) => {
                const { current, longest } = calcStreak(h, today);
                const rate = h.completions.length > 0
                  ? Math.round((h.completions.length / Math.max(1, h.completions.length + 5)) * 100)
                  : 0;
                const totalDays = h.completions.length;

                return (
                  <div key={h.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-800/40 transition-colors">
                    <span className="text-lg leading-none w-6 text-center">{h.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-zinc-300 truncate">{h.name}</span>
                        <span className="text-[11px] text-zinc-500 shrink-0 ml-2">{totalDays} days</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (totalDays / 90) * 100)}%`,
                            background: `hsl(${h.colorHue}, 60%, 50%)`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {current > 0 && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Flame className="h-3 w-3 text-orange-400" />
                          <span className="font-semibold text-zinc-300">{current}</span>
                        </div>
                      )}
                      {longest > 0 && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Trophy className="h-3 w-3 text-amber-500" />
                          <span className="font-semibold text-zinc-400">{longest}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <AddHabitDialog
        open={habitDialogOpen}
        onOpenChange={setHabitDialogOpen}
        onAdd={addHabit}
        today={today}
      />
      <AddGoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        onAdd={addGoal}
      />
    </div>
  );
}
