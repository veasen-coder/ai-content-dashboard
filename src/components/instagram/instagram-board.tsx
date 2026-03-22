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
  Zap,
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
} from "@/types/instagram";

// ─── Flogen AI seed posts ─────────────────────────────────────────────────────
const SEED_POSTS: InstagramPost[] = [
  {
    id: "1",
    caption:
      "How a local F&B owner in KL saved 3 hours every day using WhatsApp AI 🍜\n\nHe used to manually reply to every 'are you open?' and 'what's on the menu?' message. Now his AI agent handles it — 24/7, in Bahasa and English.",
    hashtags: "#whatsappai #malaysia #sme #aiagent #floGenAI",
    type: "carousel",
    status: "scheduled",
    scheduledDate: "2026-03-25T10:00",
    createdAt: "2026-03-20T09:00:00",
    coverHue: 140,
  },
  {
    id: "2",
    caption:
      "5 signs your business NEEDS a WhatsApp AI Agent right now 🚨\n\n1. You're answering the same 10 questions every day\n2. Leads go cold because you reply too slow\n3. Your team is drowning in DMs...",
    hashtags: "#whatsappbusiness #ai #automation #malaysiabusiness",
    type: "reel",
    status: "scheduled",
    scheduledDate: "2026-03-27T08:00",
    createdAt: "2026-03-19T14:00:00",
    coverHue: 100,
  },
  {
    id: "3",
    caption:
      "The difference between a chatbot and an AI Agent — and why it matters for your business.",
    hashtags: "#chatbot #aiagent #whatsapp #b2b",
    type: "feed",
    status: "draft",
    scheduledDate: null,
    createdAt: "2026-03-18T11:00:00",
    coverHue: 160,
  },
  {
    id: "4",
    caption:
      "POV: Your customer WhatsApps at 11pm asking for a quote. Your AI Agent replies instantly with pricing, availability, and a booking link. 🤖",
    hashtags: "#automation #customerservice #whatsapp",
    type: "reel",
    status: "draft",
    scheduledDate: null,
    createdAt: "2026-03-17T16:00:00",
    coverHue: 120,
  },
  {
    id: "5",
    caption:
      "Case study: How Flogen AI helped a Malaysian e-commerce brand reduce their customer support load by 70% in 30 days. 📉\n\nFull breakdown in our bio link.",
    hashtags: "#casestudy #ecommerce #malaysia #AI",
    type: "carousel",
    status: "published",
    scheduledDate: "2026-03-15T12:00",
    createdAt: "2026-03-10T08:00:00",
    coverHue: 130,
  },
  {
    id: "6",
    caption:
      "3 WhatsApp AI scripts every Malaysian business owner should steal 📋",
    hashtags: "#whatsapp #scripts #businesstips #floGenAI",
    type: "reel",
    status: "published",
    scheduledDate: "2026-03-12T09:00",
    createdAt: "2026-03-08T10:00:00",
    coverHue: 80,
  },
  {
    id: "7",
    caption: "Idea: Show 'before AI vs after AI' transformation for a retailer's WhatsApp inbox",
    hashtags: "",
    type: "reel",
    status: "backlog",
    scheduledDate: null,
    createdAt: "2026-03-16T20:00:00",
    coverHue: 45,
  },
  {
    id: "8",
    caption: "XHS version: 如何用WhatsApp AI帮您的生意自动回复客户？ (需要中文版内容)",
    hashtags: "#AI #WhatsApp #小红书 #马来西亚",
    type: "feed",
    status: "backlog",
    scheduledDate: null,
    createdAt: "2026-03-14T15:00:00",
    coverHue: 0,
  },
];

// ─── Tab config ───────────────────────────────────────────────────────────────
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

// ─── Type filter pills ────────────────────────────────────────────────────────
const TYPE_FILTERS: { value: PostType | "all"; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All types", icon: Instagram },
  { value: "feed", label: "Feed", icon: ImageIcon },
  { value: "reel", label: "Reels", icon: Film },
  { value: "story", label: "Stories", icon: Tv2 },
  { value: "carousel", label: "Carousel", icon: Grid2x2 },
];

function randomHue() {
  return Math.floor(Math.random() * 360);
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function InstagramBoard() {
  const [posts, setPosts] = useState<InstagramPost[]>(SEED_POSTS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<InstagramPost | null>(null);
  const [typeFilter, setTypeFilter] = useState<PostType | "all">("all");

  const counts: Record<PostStatus | "all", number> = {
    all: posts.length,
    backlog: posts.filter((p) => p.status === "backlog").length,
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
  };

  function handleSave(data: Omit<InstagramPost, "id" | "createdAt" | "coverHue">) {
    if (editingPost) {
      setPosts((ps) => ps.map((p) => (p.id === editingPost.id ? { ...p, ...data } : p)));
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#bbf088]">
            <Zap className="h-5 w-5 text-[#0a0a0a]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Content Studio</h1>
            <p className="text-sm text-muted-foreground">
              {counts.all} post{counts.all !== 1 ? "s" : ""} in pipeline
            </p>
          </div>
        </div>
        <Button
          onClick={openNewDialog}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <ImagePlus className="h-4 w-4 mr-1.5" />
          New Post
        </Button>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["scheduled", "draft", "published", "backlog"] as PostStatus[]).map((s) => {
          const styles: Record<PostStatus, { bg: string; text: string; border: string }> = {
            scheduled: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
            draft: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
            published: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
            backlog: { bg: "bg-muted/50", text: "text-muted-foreground", border: "border-border" },
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

      {/* ── Type filters ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Filter:</span>
        {TYPE_FILTERS.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTypeFilter(tf.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
              ${
                typeFilter === tf.value
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-transparent border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
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
        <TabsList className="bg-muted border border-border h-9 p-0.5 gap-0.5">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-8 px-3 text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-none rounded-md"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              <Badge
                variant="secondary"
                className="ml-0.5 h-4 min-w-[1rem] px-1 text-[10px]"
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
                  <button
                    onClick={openNewDialog}
                    className="min-h-[260px] rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
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

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ status, onAdd }: { status?: PostStatus; onAdd: () => void }) {
  const messages: Record<string, { title: string; desc: string }> = {
    scheduled: {
      title: "Nothing scheduled",
      desc: "Set a date on any draft to add it to the schedule.",
    },
    draft: {
      title: "No drafts",
      desc: "Capture Flogen AI content ideas here before they're ready.",
    },
    published: {
      title: "Nothing published yet",
      desc: "Posts you mark as published will appear here.",
    },
    backlog: {
      title: "Backlog is empty",
      desc: "Add rough content ideas to revisit later.",
    },
    default: {
      title: "No posts found",
      desc: "Create your first Flogen AI content idea to get started.",
    },
  };

  const msg = messages[status ?? "default"] ?? messages["default"];

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border py-20 text-center">
      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Zap className="h-7 w-7 text-primary/60" />
      </div>
      <div>
        <p className="text-sm font-medium">{msg.title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">{msg.desc}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onAdd}
      >
        <ImagePlus className="h-4 w-4 mr-1.5" />
        Add Post
      </Button>
    </div>
  );
}
