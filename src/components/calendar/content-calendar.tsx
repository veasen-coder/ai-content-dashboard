"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarPost, Platform, ContentStatus, PLATFORM_META, STATUS_META } from "@/types/calendar";
import { SEED_POSTS } from "@/lib/calendar-data";
import { PlatformIcon } from "./platform-icons";
import { PostDetailPopover } from "./post-detail-popover";
import { PostFormDialog } from "./post-form-dialog";

const PLATFORMS = Object.keys(PLATFORM_META) as Platform[];
const STATUSES = Object.keys(STATUS_META) as ContentStatus[];
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Chip ──────────────────────────────────────────────────────────────────────
// Map Tailwind chip class → hex color for inline styles
const CHIP_HEX: Record<string, string> = {
  "bg-pink-500": "#ec4899",
  "bg-red-500": "#ef4444",
  "bg-cyan-400": "#22d3ee",
  "bg-sky-400": "#38bdf8",
  "bg-blue-500": "#3b82f6",
  "bg-indigo-500": "#6366f1",
  "bg-rose-500": "#f43f5e",
};

function PostChip({
  post,
  onEdit,
  onDelete,
}: {
  post: CalendarPost;
  onEdit: (p: CalendarPost) => void;
  onDelete: (id: string) => void;
}) {
  const pm = PLATFORM_META[post.platform];
  const isDraft = post.status === "draft";
  const isFailed = post.status === "failed";
  const chipColor = CHIP_HEX[pm.chip] ?? "#a78bfa";

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            className={`group flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight transition-all hover:brightness-125 focus:outline-none
              ${isDraft ? "opacity-50 ring-1 ring-inset ring-zinc-600" : ""}
              ${isFailed ? "opacity-60" : ""}
            `}
            style={{
              background: `${chipColor}22`,
              borderLeft: `2.5px solid ${chipColor}`,
            }}
          />
        }
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: chipColor }}
        />
        <span className="truncate text-zinc-200">{post.title}</span>
        {post.type === "story" && (
          <span className="shrink-0 rounded px-1 text-[9px] font-bold" style={{ background: "rgba(249,115,22,.18)", color: "#fb923c", border: "1px solid rgba(249,115,22,.3)" }}>24h</span>
        )}
        {isDraft && (
          <span className="ml-auto shrink-0 text-[9px] text-zinc-500">draft</span>
        )}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="p-3 bg-zinc-900 border-zinc-800 shadow-2xl shadow-black/50 w-auto"
      >
        <PostDetailPopover post={post} onEdit={onEdit} onDelete={onDelete} />
      </PopoverContent>
    </Popover>
  );
}

// ─── Day cell ──────────────────────────────────────────────────────────────────
function DayCell({
  date,
  posts,
  isCurrentMonth,
  onAddClick,
  onEdit,
  onDelete,
}: {
  date: Date;
  posts: CalendarPost[];
  isCurrentMonth: boolean;
  onAddClick: (date: string) => void;
  onEdit: (p: CalendarPost) => void;
  onDelete: (id: string) => void;
}) {
  const today = isToday(date);
  const MAX_VISIBLE = 3;
  const visible = posts.slice(0, MAX_VISIBLE);
  const overflow = posts.length - MAX_VISIBLE;
  const dateStr = format(date, "yyyy-MM-dd");

  return (
    <div
      className={`group relative flex min-h-[110px] flex-col rounded-lg border p-1.5 transition-colors
        ${!isCurrentMonth ? "border-transparent opacity-30" : "border-zinc-800 hover:border-zinc-700"}
        ${today ? "border-violet-500/60 bg-violet-500/5 hover:border-violet-500/80" : ""}
      `}
    >
      {/* Date number */}
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold
            ${today ? "bg-violet-500 text-white" : "text-zinc-400"}
          `}
        >
          {format(date, "d")}
        </span>
        {isCurrentMonth && (
          <button
            onClick={() => onAddClick(dateStr)}
            className="flex h-4 w-4 items-center justify-center rounded text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-700 hover:text-zinc-300 group-hover:opacity-100"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Chips */}
      <div className="flex flex-col gap-0.5">
        {visible.map((p) => (
          <PostChip key={p.id} post={p} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {overflow > 0 && (
          <span className="px-1 text-[10px] text-zinc-500">+{overflow} more</span>
        )}
      </div>
    </div>
  );
}

// ─── List view row ─────────────────────────────────────────────────────────────
function ListRow({
  post,
  onEdit,
  onDelete,
}: {
  post: CalendarPost;
  onEdit: (p: CalendarPost) => void;
  onDelete: (id: string) => void;
}) {
  const pm = PLATFORM_META[post.platform];
  const sm = STATUS_META[post.status];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 hover:border-zinc-700 transition-colors group">
      {/* Platform icon */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${pm.bg} border ${pm.border}`}>
        <PlatformIcon platform={post.platform} className={`h-4 w-4 ${pm.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{post.title}</p>
        <p className="text-xs text-zinc-500 truncate">{post.caption}</p>
      </div>

      {/* Type */}
      <span className="hidden sm:block text-[11px] text-zinc-500 capitalize shrink-0">
        {post.type}{post.type === "story" ? " · 24h" : ""}
      </span>

      {/* Date + time */}
      <span className="hidden md:block text-[11px] text-zinc-400 shrink-0 tabular-nums">
        {format(new Date(`${post.date}T${post.time}`), "MMM d · h:mm a")}
      </span>

      {/* Status */}
      <div className="flex items-center gap-1 shrink-0">
        <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
        <span className={`text-[11px] ${sm.color} hidden sm:block`}>{sm.label}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
          onClick={() => onEdit(post)}
        >
          <span className="text-[10px]">✎</span>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-zinc-500 hover:text-red-400"
          onClick={() => onDelete(post.id)}
        >
          <span className="text-[10px]">✕</span>
        </Button>
      </div>
    </div>
  );
}

// ─── Ops CalPost → CalendarPost converter (syncs ops Calendar tab data) ───────
interface OpsCalPost {
  id: number; date: string; platform: string; type: string;
  topic: string; caption: string; status: string; pillar?: string;
}

const STATUS_MAP: Record<string, ContentStatus> = {
  Draft: "draft", Approved: "scheduled", Scheduled: "scheduled", Posted: "published",
};

function opsToCalendarPost(op: OpsCalPost): CalendarPost {
  return {
    id: `ops-${op.id}`,
    title: op.topic || op.caption?.slice(0, 40) || "Untitled",
    caption: op.caption || "",
    platform: (op.platform === "xiaohongshu" ? "xiaohongshu" : "instagram") as Platform,
    type: (["reel", "carousel", "story", "post"].includes(op.type) ? op.type : "post") as CalendarPost["type"],
    status: STATUS_MAP[op.status] ?? "draft",
    date: op.date,
    time: "09:00",
    coverHue: Math.abs(op.id * 37) % 360,
  };
}

const LS_CC_KEY = "flogen_content_calendar";
const LS_OPS_KEY = "flogen_calendar";

// ─── Main calendar ─────────────────────────────────────────────────────────────
export function ContentCalendar() {
  const [ownPosts, setOwnPosts] = useState<CalendarPost[]>(SEED_POSTS);
  const [opsPosts, setOpsPosts] = useState<CalendarPost[]>([]);

  // Load own posts + ops posts from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CC_KEY);
      if (raw) setOwnPosts(JSON.parse(raw));
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(LS_OPS_KEY);
      if (raw) {
        const ops: OpsCalPost[] = JSON.parse(raw);
        setOpsPosts(ops.map(opsToCalendarPost));
      }
    } catch { /* ignore */ }
  }, []);

  // Persist own posts whenever they change
  const setPosts = useCallback((fn: CalendarPost[] | ((prev: CalendarPost[]) => CalendarPost[])) => {
    setOwnPosts(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      try { localStorage.setItem(LS_CC_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Merged view: own posts + ops posts (ops posts have id starting with "ops-")
  const posts = useMemo(() => {
    const ownIds = new Set(ownPosts.map(p => p.id));
    const deduped = opsPosts.filter(op => !ownIds.has(op.id));
    return [...ownPosts, ...deduped];
  }, [ownPosts, opsPosts]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ContentStatus>>(new Set());
  const [view, setView] = useState<"month" | "list">("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);
  const [clickedDate, setClickedDate] = useState<string>("");

  // ── Calendar grid days ──
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // ── Filtering ──
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const platformOk = selectedPlatforms.size === 0 || selectedPlatforms.has(p.platform);
      const statusOk = selectedStatuses.size === 0 || selectedStatuses.has(p.status);
      return platformOk && statusOk;
    });
  }, [posts, selectedPlatforms, selectedStatuses]);

  // ── Posts by date map ──
  const postsByDate = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    filteredPosts.forEach((p) => {
      const existing = map.get(p.date) ?? [];
      map.set(p.date, [...existing, p]);
    });
    // Sort each day's posts by time
    map.forEach((arr, k) =>
      map.set(k, arr.sort((a, b) => a.time.localeCompare(b.time)))
    );
    return map;
  }, [filteredPosts]);

  // ── List view: posts in current month ──
  const monthStr = format(currentDate, "yyyy-MM");
  const monthPosts = useMemo(
    () =>
      filteredPosts
        .filter((p) => p.date.startsWith(monthStr))
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
    [filteredPosts, monthStr]
  );

  // ── Stats ──
  const monthAll = posts.filter((p) => p.date.startsWith(monthStr));
  const counts = {
    total: monthAll.length,
    scheduled: monthAll.filter((p) => p.status === "scheduled").length,
    published: monthAll.filter((p) => p.status === "published").length,
    draft: monthAll.filter((p) => p.status === "draft").length,
  };

  // ── Actions ──
  function togglePlatform(p: Platform) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  function toggleStatus(s: ContentStatus) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  function handleAddClick(date: string) {
    setEditingPost(null);
    setClickedDate(date);
    setDialogOpen(true);
  }

  function handleEdit(post: CalendarPost) {
    setEditingPost(post);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSave(data: Omit<CalendarPost, "id" | "coverHue">) {
    if (editingPost) {
      setPosts((prev) =>
        prev.map((p) => (p.id === editingPost.id ? { ...p, ...data } : p))
      );
    } else {
      const newPost: CalendarPost = {
        ...data,
        id: Math.random().toString(36).slice(2, 9),
        coverHue: Math.floor(Math.random() * 360),
      };
      setPosts((prev) => [...prev, newPost]);
    }
    setEditingPost(null);
  }

  return (
    <>
      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 shadow-lg shadow-violet-900/20">
              <CalendarDays className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Content Calendar</h1>
              <p className="text-sm text-muted-foreground">
                {counts.total} posts in {format(currentDate, "MMMM yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
              <button
                onClick={() => setView("month")}
                className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                  view === "month" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                  view === "list" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button
              size="sm"
              onClick={() => handleAddClick(format(new Date(), "yyyy-MM-dd"))}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 h-9"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Content
            </Button>
          </div>
        </div>

        {/* ── Stat strip ── */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: "Total", value: counts.total, color: "text-zinc-300" },
            { label: "Published", value: counts.published, color: "text-emerald-400" },
            { label: "Scheduled", value: counts.scheduled, color: "text-blue-400" },
            { label: "Draft", value: counts.draft, color: "text-amber-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5"
            >
              <span className={`text-base font-bold tabular-nums ${s.color}`}>{s.value}</span>
              <span className="text-xs text-zinc-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          {/* Platform filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider w-16 shrink-0">
              Platform
            </span>
            {PLATFORMS.map((p) => {
              const pm = PLATFORM_META[p];
              const active = selectedPlatforms.has(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all
                    ${
                      active
                        ? `${pm.bg} ${pm.border} ${pm.color}`
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 bg-transparent"
                    }`}
                >
                  <PlatformIcon platform={p} className="h-3 w-3" />
                  {pm.label}
                </button>
              );
            })}
            {selectedPlatforms.size > 0 && (
              <button
                onClick={() => setSelectedPlatforms(new Set())}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
              >
                Clear
              </button>
            )}
          </div>

          <Separator className="bg-zinc-800" />

          {/* Status filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider w-16 shrink-0">
              Status
            </span>
            {STATUSES.map((s) => {
              const sm = STATUS_META[s];
              const active = selectedStatuses.has(s);
              const count = monthAll.filter((p) => p.status === s).length;
              const isEmpty = count === 0;
              return (
                <button
                  key={s}
                  onClick={() => !isEmpty && toggleStatus(s)}
                  disabled={isEmpty}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all
                    ${isEmpty
                      ? "border-zinc-800/50 text-zinc-600 bg-transparent cursor-default opacity-40"
                      : active
                        ? "bg-zinc-700 border-zinc-600 text-zinc-200"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 bg-transparent"
                    }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isEmpty ? "bg-zinc-700" : sm.dot}`} />
                  {sm.label}{isEmpty ? " · 0" : ""}
                </button>
              );
            })}
            {selectedStatuses.size > 0 && (
              <button
                onClick={() => setSelectedStatuses(new Set())}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
              >
                Clear
              </button>
            )}
          </div>

          {/* Active filter summary */}
          {(selectedPlatforms.size > 0 || selectedStatuses.size > 0) && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-300">
                Showing {filteredPosts.filter((p) => p.date.startsWith(monthStr)).length} of {counts.total} posts
              </Badge>
              <button
                onClick={() => { setSelectedPlatforms(new Set()); setSelectedStatuses(new Set()); }}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* ── Month nav ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              onClick={() => setCurrentDate((d) => subMonths(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-semibold min-w-[160px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              onClick={() => setCurrentDate((d) => addMonths(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 h-8"
            onClick={() => setCurrentDate(new Date("2026-03-22"))}
          >
            Today
          </Button>
        </div>

        {/* ── Calendar / List view ── */}
        {view === "month" ? (
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEK_DAYS.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date) => {
                const dateStr = format(date, "yyyy-MM-dd");
                return (
                  <DayCell
                    key={dateStr}
                    date={date}
                    posts={postsByDate.get(dateStr) ?? []}
                    isCurrentMonth={isSameMonth(date, currentDate)}
                    onAddClick={handleAddClick}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          /* List view */
          <div className="space-y-1.5">
            {monthPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-800 py-16 text-center">
                <CalendarDays className="h-10 w-10 text-zinc-700" />
                <p className="text-sm text-zinc-500">No posts match the current filters.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 text-zinc-400"
                  onClick={() => handleAddClick(format(new Date(), "yyyy-MM-dd"))}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Content
                </Button>
              </div>
            ) : (
              monthPosts.map((p) => (
                <ListRow key={p.id} post={p} onEdit={handleEdit} onDelete={handleDelete} />
              ))
            )}
          </div>
        )}

        {/* ── Platform legend ── */}
        <div className="flex items-center gap-4 flex-wrap pt-1">
          <span className="text-[11px] text-zinc-600">Legend:</span>
          {PLATFORMS.map((p) => (
            <div key={p} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: CHIP_HEX[PLATFORM_META[p].chip] ?? "#a78bfa",
                }}
              />
              <span className="text-[11px] text-zinc-500">{PLATFORM_META[p].label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dialog ── */}
      <PostFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPost(null);
        }}
        onSave={handleSave}
        editPost={editingPost}
        defaultDate={clickedDate}
      />
    </>
  );
}
