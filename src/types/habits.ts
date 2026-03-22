export type HabitFrequency = "daily" | "weekdays" | "weekends";

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  colorHue: number;
  frequency: HabitFrequency;
  completions: string[]; // "YYYY-MM-DD"
  createdAt: string;     // "YYYY-MM-DD"
}

export type GoalCategory =
  | "health"
  | "learning"
  | "finance"
  | "fitness"
  | "career"
  | "personal";

export interface GoalMilestone {
  value: number;
  label: string;
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  emoji: string;
  colorHue: number;
  category: GoalCategory;
  current: number;
  target: number;
  unit: string;
  targetDate: string; // "YYYY-MM-DD"
  createdAt: string;
  milestones: GoalMilestone[];
}

export const CATEGORY_META: Record<
  GoalCategory,
  { label: string; color: string; bg: string }
> = {
  health:   { label: "Health",    color: "text-emerald-400", bg: "bg-emerald-500/15" },
  learning: { label: "Learning",  color: "text-blue-400",    bg: "bg-blue-500/15" },
  finance:  { label: "Finance",   color: "text-amber-400",   bg: "bg-amber-500/15" },
  fitness:  { label: "Fitness",   color: "text-orange-400",  bg: "bg-orange-500/15" },
  career:   { label: "Career",    color: "text-violet-400",  bg: "bg-violet-500/15" },
  personal: { label: "Personal",  color: "text-pink-400",    bg: "bg-pink-500/15" },
};
