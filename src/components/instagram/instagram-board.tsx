"use client";

import { useState } from "react";
import {
  Film,
  Grid2x2,
  ImagePlus,
  Instagram,
  Tv2,
  ImageIcon,
  Clock,
  CheckCircle2,
  Archive,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PostCard } from "./post-card";
import { PostDialog } from "./post-dialog";
import {
  InstagramPost,
  PostStatus,
  PostType,
  POST_TYPE_LABELS,
} from "@/types/instagram";

// ─── Seed data ──────────────────────────────────────────────────────────────
const SEED_POSTS: InstagramPost[] = [
  {
    id: "1",
    caption:
      "Behind the scenes of our latest photoshoot 📸 Swipe to see the magic happen from setup to final shot.",
    hashtags: "#bts #photoshoot #contentcreator #behindthescenes",
    type: "carousel",
    status: "scheduled",
    scheduledDate: "2026-03-25T10:00",
    createdAt: "2026-03-20T09:00:00",
    coverHue: 260,
  },
  {
    id: "2",
    caption:
      "Morning routine that changed my life ☀️ 5am wake up, journaling, movement, and intentional planning.",
    hashtags: "#morningroutine #productivity #lifestyle #wellness",
    type: "reel",
    status: "scheduled",
    scheduledDate: "2026-03-26T08:00",
    createdAt: "2026-03-19T14:00:00",
    coverHue: 200,
  },
  {
    id: "3",
    caption:
      "This week's content strategy breakdown — how I plan 30 days of content in just 2 hours.",
    hashtags: "#contentstrategy #socialmedia #creator",
    type: "feed",
    status: "draft",
    scheduledDate: null,
    createdAt: "2026-03-18T11:00:00",
    coverHue: 30,
  },
  {
    id: "4",
    caption: "Quick poll: which content type do you prefer? Let me know 👇",
    hashtags: "#poll #engagement #community",
    type: "story",
    status: "draft",
    scheduledDate: null,
    createdAt: "2026-03-17T16:00:00",
    coverHue: 340,
  },
  {
    id: "5",
    caption:
      "Just dropped our new guide on personal branding — link in bio! 🔗",
    hashtags: "#personalbranding #marketing #growth",
    type: "feed",
    status: "published",
    scheduledDate: "2026-03-15T12:00",
    createdAt: "2026-03-10T08:00:00",
    coverHue: 150,
  },
  {
    id: "6",
    caption: "3 tools I use every single day as a content creator.",
    hashtags: "#tools #creator #productivity",
    type: "reel",
    status: "published",
    scheduledDate: "2026-03-12T09:00",
    createdAt: "2026-03-08T10:00:00",
    coverHue: 180,
  },
  {
    id: "7",
    caption: "Idea: time-lapse of workspace setup and reset",
    hashtags: "",
    type: "reel",
    status: "backlog",
    scheduledDate: null,
    createdAt: "2026-03-16T20:00:00",
    coverHue: 45,
  },
  {
    id: "8",
    caption: "Seasonal content — spring aesthetic flatlay concept",
    hashtags: "#spring #aesthetic #flatlay",
    type: "feed",
    status: "backlog",
    scheduledDate: null,
    createdAt: "2026-03-14T15:00:00",
    coverHue: 90,
  },
];

// ─── Tab config ─────────────────────────────────────────────────────────────
const TABS: {
  value: "all" | PostStatus;
  label: string;
  icon: React.ElementType;
  status?: PostStatus;
}[] = [
  { value: "all", label: "All Posts", icon: Instagram },
  { value: "scheduled", label: "Scheduled", icon: Clock, status: "scheduled" },
  { value: "draft", label: "Drafts", icon: FileText, status: "draft" },
  { value: "published", label: "Published", icon: CheckCircle2, status: "published" },
  { value: "backlog", label: "Backlog", icon: Archive, status: "backlog" },
];

const TAB_ACCENT: Record<string, string> = {
  all: "text-white",
  scheduled: "text-blue-400",
  draft: "text-amber-400",
  published: "text-emerald-400",
  backlog: "text-zinc-400",
};

// ─── Type filter pills ───────────────────────────────────────────────────────
const TYPE_FILTERS: { value: PostType | "all"; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All types", icon: Instagram },
  { value: "feed", label: "Feed", icon: ImageIcon },
  { value: "reel", label: "Reels", icon: Film },
  { value: "story", label: "Stories", icon: Tv2 },
  { value: "carousel", label: "Carousel", icon: Grid2x2 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function randomHue() {
  return Math.floor(Math.random() * 360);
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Component ───────────────────────────────────────────────────────────────
export function InstagramBoard() {
  const [posts, setPosts] = useState<InstagramPost[]>(SEED_POSTS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<InstagramPost | null>(null);
  const [typeFilter, setTypeFilter] = useState<PostType | "all">("all");

  // ── Stats ──
  const counts: Record<PostStatus | "all", number> = {
    all: posts.length,
    backlog: posts.filter((p) => p.status === "backlog").length,
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
  };

  // ── Actions ──
  function handleSave(data: Omit<InstagramPost, "id" | "createdAt" | "coverHue">) {
    if (editingPost) {
      setPosts((ps) =>
        ps.map((p) =>
          p.id === editingPost.id ? { ...p, ...data } : p
        )
      );
    } else {
      const newPost: InstagramPost = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        coverHue: randomHue(),
      };
      setPosts((ps) => [newPost, ...ps]);
    }
    setEditingPost(null);
  }

  function handleStatusChange(id: string, status: PostStatus) {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  function handleDelete(id: string) {
    setPosts((ps) => ps.filter((p) => p.id !== id));
  }

  function handleEdit(post: InstagramPost) {
    setEditingPost(post);
    setDialogOpen(true);
  }

  function openNewDialog() {
    setEditingPost(null);
    setDialogOpen(true);
  }

  // ── Filter helpers ──
  function filterPosts(status?: PostStatus) {
    return posts.filter(
      (p) =>
        (status ? p.status === status : true) &&
        (typeFilter === "all" ? true : p.type === typeFilter)
    );
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-pink-900/30">
            <Instagram className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Instagram Manager</h1>
            <p className="text-sm text-muted-foreground">
              {counts.all} post{counts.all !== 1 ? "s" : ""} in pipeline
            </p>
          </div>
        </div>
        <Button
          onClick={openNewDialog}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-md shadow-pink-900/30"
        >
          <ImagePlus className="h-4 w-4 mr-1.5" />
          New Post
        </Button>
      </div>

      {/* ── Quick stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["scheduled", "draft", "published", "backlog"] as PostStatus[]).map((s) => {
          const styles: Record<PostStatus, { bg: string; text: string; border: string }> = {
            scheduled: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
            draft: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
            published: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
            backlog: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-700/50" },
          };
          const st = styles[s];
          return (
            <div
              key={s}
              className={`rounded-xl border ${st.border} ${st.bg} px-4 py-3 flex items-center justify-between`}
            >
              <div>
                <p className="text-xs text-muted-foreground capitalize">{s}</p>
                <p className={`text-2xl font-bold ${st.text}`}>{counts[s]}</p>
              </div>
              <div className={`h-8 w-8 rounded-lg ${st.bg} flex items-center justify-center`}>
                {s === "scheduled" && <Clock className={`h-4 w-4 ${st.text}`} />}
                {s === "draft" && <FileText className={`h-4 w-4 ${st.text}`} />}
                {s === "published" && <CheckCircle2 className={`h-4 w-4 ${st.text}`} />}
                {s === "backlog" && <Archive className={`h-4 w-4 ${st.text}`} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Type filter pills ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Filter:</span>
        {TYPE_FILTERS.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTypeFilter(tf.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
              ${
                typeFilter === tf.value
                  ? "bg-zinc-700 border-zinc-600 text-white"
                  : "bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
          >
            <tf.icon className="h-3 w-3" />
            {tf.label}
          </button>
        ))}
        <Separator orientation="vertical" className="h-4 mx-1" />
        <span className="text-xs text-muted-foreground">
          {filterPosts().length} result{filterPosts().length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800 h-9 p-0.5 gap-0.5">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={`h-8 px-3 text-xs gap-1.5 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md
                ${TAB_ACCENT[tab.value]}`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              <Badge
                variant="secondary"
                className="ml-0.5 h-4 min-w-[1rem] px-1 text-[10px] bg-zinc-700/60 text-zinc-400"
              >
                {counts[tab.value]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => {
          const tabPosts = filterPosts(tab.status);
          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              {tabPosts.length === 0 ? (
                <EmptyState status={tab.status} onAdd={openNewDialog} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {tabPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))}
                  {/* Add card */}
                  <button
                    onClick={openNewDialog}
                    className="min-h-[260px] rounded-xl border-2 border-dashed border-zinc-800 hover:border-zinc-600 flex flex-col items-center justify-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium">Add post</span>
                  </button>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* ── Dialog ── */}
      <PostDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPost(null);
        }}
        onSave={handleSave}
        editPost={editingPost}
      />
    </>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({
  status,
  onAdd,
}: {
  status?: PostStatus;
  onAdd: () => void;
}) {
  const messages: Record<string, { title: string; desc: string }> = {
    scheduled: {
      title: "Nothing scheduled",
      desc: "Set a date on any draft to add it to the schedule.",
    },
    draft: {
      title: "No drafts",
      desc: "Capture your ideas here before they're ready to publish.",
    },
    published: {
      title: "Nothing published yet",
      desc: "Posts you mark as published will appear here.",
    },
    backlog: {
      title: "Backlog is empty",
      desc: "Add rough ideas and post concepts to revisit later.",
    },
    default: {
      title: "No posts found",
      desc: "Create your first post idea to get started.",
    },
  };

  const msg = messages[status ?? "default"] ?? messages["default"];

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-zinc-800 py-20 text-center">
      <div className="h-14 w-14 rounded-full bg-zinc-800/60 flex items-center justify-center">
        <Instagram className="h-7 w-7 text-zinc-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300">{msg.title}</p>
        <p className="text-xs text-zinc-600 mt-1 max-w-[260px] mx-auto">{msg.desc}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onAdd}
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
      >
        <ImagePlus className="h-4 w-4 mr-1.5" />
        Add Post
      </Button>
    </div>
  );
}
