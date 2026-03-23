export type Platform =
  | "instagram"
  | "youtube"
  | "tiktok"
  | "twitter"
  | "linkedin"
  | "facebook"
  | "xiaohongshu";

export type ContentType =
  | "post"
  | "reel"
  | "story"
  | "short"
  | "video"
  | "tweet"
  | "article"
  | "carousel";

export type ContentStatus = "scheduled" | "published" | "draft" | "failed";

export interface CalendarPost {
  id: string;
  title: string;
  caption: string;
  platform: Platform;
  type: ContentType;
  status: ContentStatus;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  coverHue: number;
}

export const PLATFORM_META: Record<
  Platform,
  { label: string; color: string; bg: string; border: string; chip: string }
> = {
  instagram: {
    label: "Instagram",
    color: "text-pink-400",
    bg: "bg-pink-500/15",
    border: "border-pink-500/30",
    chip: "bg-pink-500",
  },
  youtube: {
    label: "YouTube",
    color: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    chip: "bg-red-500",
  },
  tiktok: {
    label: "TikTok",
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
    chip: "bg-cyan-400",
  },
  twitter: {
    label: "X / Twitter",
    color: "text-sky-400",
    bg: "bg-sky-500/15",
    border: "border-sky-500/30",
    chip: "bg-sky-400",
  },
  linkedin: {
    label: "LinkedIn",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    chip: "bg-blue-500",
  },
  facebook: {
    label: "Facebook",
    color: "text-indigo-400",
    bg: "bg-indigo-500/15",
    border: "border-indigo-500/30",
    chip: "bg-indigo-500",
  },
  xiaohongshu: {
    label: "Xiaohongshu",
    color: "text-rose-400",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
    chip: "bg-rose-500",
  },
};

export const STATUS_META: Record<
  ContentStatus,
  { label: string; color: string; dot: string }
> = {
  scheduled: { label: "Scheduled", color: "text-blue-400", dot: "bg-blue-400" },
  published: { label: "Published", color: "text-emerald-400", dot: "bg-emerald-400" },
  draft: { label: "Draft", color: "text-amber-400", dot: "bg-amber-400" },
  failed: { label: "Failed", color: "text-red-400", dot: "bg-red-400" },
};
