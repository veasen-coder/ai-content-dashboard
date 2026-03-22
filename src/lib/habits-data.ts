import { format, subDays, parseISO, differenceInCalendarDays, isSameDay } from "date-fns";
import type { Habit, Goal, HabitFrequency } from "@/types/habits";

export const TODAY = "2026-03-22";

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function sr(str: string, off = 0): number {
  let h = 2166136261;
  const s = str + off;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

// ─── Generate realistic completion history ────────────────────────────────────
function genCompletions(
  id: string,
  frequency: HabitFrequency,
  daysBack: number,
  baseRate: number   // 0-1, higher = more consistent
): string[] {
  const completions: string[] = [];
  for (let i = 0; i < daysBack; i++) {
    const d = subDays(parseISO(TODAY), i);
    const dow = d.getDay(); // 0=Sun
    const scheduled =
      frequency === "daily" ? true :
      frequency === "weekdays" ? dow >= 1 && dow <= 5 :
      dow === 0 || dow === 6;
    if (!scheduled) continue;

    // Higher rate for recent days, slight weekend dip, random misses
    const recencyBonus = i < 7 ? 0.15 : i < 14 ? 0.05 : 0;
    const dayPenalty = (dow === 0 || dow === 6) ? -0.08 : 0;
    const rate = Math.min(0.97, Math.max(0, baseRate + recencyBonus + dayPenalty));
    if (sr(id + format(d, "yyyy-MM-dd")) < rate) {
      completions.push(format(d, "yyyy-MM-dd"));
    }
  }
  return completions;
}

// ─── Seed habits ──────────────────────────────────────────────────────────────
export const SEED_HABITS: Habit[] = [
  {
    id: "h1", name: "Morning Meditation", emoji: "🧘", colorHue: 200, frequency: "daily",
    createdAt: "2026-01-01",
    completions: genCompletions("h1", "daily", 90, 0.78),
  },
  {
    id: "h2", name: "Read 30 Minutes", emoji: "📚", colorHue: 260, frequency: "daily",
    createdAt: "2026-01-01",
    completions: genCompletions("h2", "daily", 90, 0.83),
  },
  {
    id: "h3", name: "Exercise", emoji: "🏃", colorHue: 30, frequency: "weekdays",
    createdAt: "2026-01-01",
    completions: genCompletions("h3", "weekdays", 90, 0.70),
  },
  {
    id: "h4", name: "Drink 8 Glasses of Water", emoji: "💧", colorHue: 195, frequency: "daily",
    createdAt: "2026-01-15",
    completions: genCompletions("h4", "daily", 66, 0.88),
  },
  {
    id: "h5", name: "Journal", emoji: "✍️", colorHue: 340, frequency: "daily",
    createdAt: "2026-02-01",
    completions: genCompletions("h5", "daily", 49, 0.65),
  },
  {
    id: "h6", name: "No Social Media Before 10am", emoji: "📵", colorHue: 15, frequency: "weekdays",
    createdAt: "2026-02-15",
    completions: genCompletions("h6", "weekdays", 35, 0.72),
  },
  {
    id: "h7", name: "Weekend Walk", emoji: "🚶", colorHue: 120, frequency: "weekends",
    createdAt: "2026-01-01",
    completions: genCompletions("h7", "weekends", 90, 0.80),
  },
];

// ─── Seed goals ───────────────────────────────────────────────────────────────
export const SEED_GOALS: Goal[] = [
  {
    id: "g1", name: "Run a Half Marathon",
    description: "Complete 21.1km race by end of Q2",
    emoji: "🏅", colorHue: 30, category: "fitness",
    current: 14, target: 21.1, unit: "km longest run",
    targetDate: "2026-06-15", createdAt: "2026-01-01",
    milestones: [
      { value: 5,    label: "5k done" },
      { value: 10,   label: "10k done" },
      { value: 15,   label: "15k done" },
      { value: 21.1, label: "Race day 🎉" },
    ],
  },
  {
    id: "g2", name: "Read 24 Books",
    description: "2 books per month throughout the year",
    emoji: "📖", colorHue: 260, category: "learning",
    current: 6, target: 24, unit: "books",
    targetDate: "2026-12-31", createdAt: "2026-01-01",
    milestones: [
      { value: 6,  label: "Q1 done" },
      { value: 12, label: "Halfway" },
      { value: 18, label: "Q3 done" },
      { value: 24, label: "Goal hit! 📚" },
    ],
  },
  {
    id: "g3", name: "Save $10,000",
    description: "Emergency fund fully stocked",
    emoji: "💰", colorHue: 45, category: "finance",
    current: 6800, target: 10000, unit: "$",
    targetDate: "2026-09-30", createdAt: "2026-01-01",
    milestones: [
      { value: 2500,  label: "25% saved" },
      { value: 5000,  label: "Halfway" },
      { value: 7500,  label: "75% done" },
      { value: 10000, label: "Goal hit! 🎉" },
    ],
  },
  {
    id: "g4", name: "Launch Side Project",
    description: "Ship v1 of the SaaS product publicly",
    emoji: "🚀", colorHue: 200, category: "career",
    current: 65, target: 100, unit: "% complete",
    targetDate: "2026-04-30", createdAt: "2026-01-15",
    milestones: [
      { value: 25, label: "MVP spec done" },
      { value: 50, label: "Beta launched" },
      { value: 75, label: "Feedback loop" },
      { value: 100, label: "Public launch 🚀" },
    ],
  },
  {
    id: "g5", name: "Learn Spanish",
    description: "Reach B1 conversational level",
    emoji: "🇪🇸", colorHue: 0, category: "learning",
    current: 340, target: 500, unit: "hours studied",
    targetDate: "2026-12-31", createdAt: "2026-01-01",
    milestones: [
      { value: 100, label: "A1 achieved" },
      { value: 250, label: "A2 achieved" },
      { value: 400, label: "B1 soon" },
      { value: 500, label: "B1 done! 🎉" },
    ],
  },
  {
    id: "g6", name: "Lose 10kg",
    description: "Reach target weight through diet + exercise",
    emoji: "⚖️", colorHue: 160, category: "health",
    current: 6.5, target: 10, unit: "kg lost",
    targetDate: "2026-06-30", createdAt: "2026-01-01",
    milestones: [
      { value: 2.5, label: "First 2.5kg" },
      { value: 5,   label: "Halfway" },
      { value: 7.5, label: "Almost there" },
      { value: 10,  label: "Goal hit! ⚖️" },
    ],
  },
];

// ─── Streak calculation ───────────────────────────────────────────────────────
export function calcStreak(habit: Habit, today: string): { current: number; longest: number } {
  const todayDate = parseISO(today);
  const set = new Set(habit.completions);

  const isScheduled = (d: Date) => {
    const dow = d.getDay();
    if (habit.frequency === "daily") return true;
    if (habit.frequency === "weekdays") return dow >= 1 && dow <= 5;
    return dow === 0 || dow === 6;
  };

  // current streak: walk back from today counting consecutive scheduled+completed days
  let current = 0;
  let cursor = new Date(todayDate);
  while (true) {
    if (isScheduled(cursor)) {
      if (set.has(format(cursor, "yyyy-MM-dd"))) current++;
      else break;
    }
    cursor = subDays(cursor, 1);
    if (differenceInCalendarDays(todayDate, cursor) > 365) break;
  }

  // longest streak
  const sorted = [...habit.completions].sort();
  let longest = 0, run = 0, prev: Date | null = null;
  for (const ds of sorted) {
    const d = parseISO(ds);
    if (prev && differenceInCalendarDays(d, prev) === 1) run++;
    else run = 1;
    if (run > longest) longest = run;
    prev = d;
  }

  return { current, longest };
}

export function isCompletedToday(habit: Habit, today: string): boolean {
  return habit.completions.includes(today);
}

export function isScheduledToday(habit: Habit, today: string): boolean {
  const dow = parseISO(today).getDay();
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekdays") return dow >= 1 && dow <= 5;
  return dow === 0 || dow === 6;
}

// ─── Heatmap data ─────────────────────────────────────────────────────────────
export interface HeatmapDay {
  date: string;
  completed: number;
  scheduled: number;
  rate: number; // 0-1
}

export function buildHeatmapData(habits: Habit[], today: string, weeks = 16): HeatmapDay[] {
  const todayDate = parseISO(today);
  const days: HeatmapDay[] = [];

  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = subDays(todayDate, i);
    const ds = format(d, "yyyy-MM-dd");
    const dow = d.getDay();

    let scheduled = 0, completed = 0;
    for (const h of habits) {
      const active = parseISO(h.createdAt) <= d;
      if (!active) continue;
      const sched =
        h.frequency === "daily" ? true :
        h.frequency === "weekdays" ? dow >= 1 && dow <= 5 :
        dow === 0 || dow === 6;
      if (sched) {
        scheduled++;
        if (h.completions.includes(ds)) completed++;
      }
    }

    days.push({ date: ds, completed, scheduled, rate: scheduled > 0 ? completed / scheduled : 0 });
  }
  return days;
}

// ─── Motivational copy ────────────────────────────────────────────────────────
export function getMotivationalMessage(
  completedToday: number,
  totalToday: number,
  bestStreak: number
): { headline: string; sub: string } {
  const pct = totalToday > 0 ? completedToday / totalToday : 0;
  if (pct === 1)  return { headline: "Perfect day! 🔥", sub: "Every habit checked. You're on a roll — keep the streak alive tomorrow." };
  if (pct >= 0.8) return { headline: "Almost flawless ⚡", sub: "Just one or two left. A small push now keeps your streak intact." };
  if (pct >= 0.5) return { headline: "Solid progress 💪", sub: "You're past the halfway mark. Finish strong to protect that streak." };
  if (pct > 0)    return { headline: "Good start 🌱", sub: "You've begun — that's the hardest part. Keep building momentum." };
  if (bestStreak >= 7) return { headline: "Your streak is waiting 🎯", sub: `You've hit ${bestStreak} days before. Today is a chance to start again.` };
  return { headline: "Let's build something ✨", sub: "Check off your first habit and start the chain. Consistency compounds." };
}
