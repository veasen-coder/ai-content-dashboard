"use client";

import { useState, useCallback } from "react";
import {
  Newspaper,
  RefreshCw,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Loader2,
  CheckCheck,
  Zap,
  Tag,
  Clock,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NewsArticle, PostIdea } from "@/types";

// ─── Default Flogen AI feeds ──────────────────────────────────────────────────
const DEFAULT_FEEDS = [
  { id: "default-1", name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", category: "Technology" },
  { id: "default-2", name: "Marketing In Asia", url: "https://www.marketinginasia.com/feed/", category: "Marketing" },
  { id: "default-3", name: "The Rakyat Post Business", url: "https://www.therakyatpost.com/category/business/feed/", category: "Business" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Technology: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Marketing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Business: "bg-primary/20 text-primary border-primary/30",
  technology: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  marketing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  business: "bg-primary/20 text-primary border-primary/30",
};

interface LocalArticle extends Omit<NewsArticle, "id" | "created_at" | "feed_id"> {
  id: string;
  feed_id: string;
  feed_name: string;
  created_at: string;
  category: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NewsDashboard() {
  const [articles, setArticles] = useState<LocalArticle[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingToDraft, setSavingToDraft] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState<Set<string>>(new Set());

  const fetchArticles = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/news/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.articles) {
        const mapped: LocalArticle[] = data.articles.map(
          (a: {
            feed_id: string;
            title: string;
            summary: string | null;
            url: string;
            image_url: string | null;
            published_at: string | null;
          }, idx: number) => {
            const feed = DEFAULT_FEEDS.find((f) => f.id === a.feed_id);
            return {
              id: `art-${idx}-${Date.now()}`,
              feed_id: a.feed_id,
              feed_name: feed?.name ?? "Unknown Feed",
              title: a.title,
              summary: a.summary,
              url: a.url,
              image_url: a.image_url,
              published_at: a.published_at,
              is_saved: false,
              is_read: false,
              post_idea: null,
              created_at: new Date().toISOString(),
              category: feed?.category ?? "General",
            };
          }
        );
        setArticles(mapped);
        setLastFetched(new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      console.error("Failed to fetch articles:", err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  function toggleSave(id: string) {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_saved: !a.is_saved } : a))
    );
  }

  function markRead(id: string) {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    );
  }

  async function generatePostIdea(article: LocalArticle) {
    setGeneratingId(article.id);
    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: article.title,
          pillar: "education",
          platform: "instagram",
          context: `Article summary: ${article.summary ?? ""}. Source: ${article.feed_name}. Flogen AI is a Malaysian B2B WhatsApp AI Agency.`,
        }),
      });
      const data = await res.json();

      const postIdea: PostIdea = {
        hook: data.variant_a?.split("\n")[0] ?? article.title,
        body: data.variant_a?.split("\n").slice(1, 4) ?? [],
        cta: "Want to know how this applies to your business? Drop a comment 👇",
        hashtags: data.hashtags ?? [],
      };

      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, post_idea: postIdea } : a))
      );
    } catch (err) {
      console.error("generatePostIdea error:", err);
    } finally {
      setGeneratingId(null);
    }
  }

  async function copyPostIdea(article: LocalArticle) {
    if (!article.post_idea) return;
    const text = [
      article.post_idea.hook,
      "",
      ...article.post_idea.body,
      "",
      article.post_idea.cta,
      "",
      article.post_idea.hashtags.join(" "),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedId(article.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function saveToDrafts(article: LocalArticle) {
    if (!article.post_idea) return;
    setSavingToDraft(article.id);

    // Optimistic: save to local pipeline
    // In full integration, this would POST to /api/instagram/posts
    await new Promise((r) => setTimeout(r, 600));

    setDraftSaved((prev) => new Set([...prev, article.id]));
    setSavingToDraft(null);
  }

  const unread = articles.filter((a) => !a.is_read).length;
  const saved = articles.filter((a) => a.is_saved).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Newspaper className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">News & Inspiration</h1>
            <p className="text-sm text-muted-foreground">
              AI, marketing and business news for Flogen AI content ideas
            </p>
          </div>
        </div>
        <Button
          onClick={fetchArticles}
          disabled={isFetching}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          {isFetching ? "Fetching…" : "Refresh Feeds"}
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Active Feeds</p>
            <p className="text-2xl font-bold text-foreground">{DEFAULT_FEEDS.length}</p>
          </div>
          <Newspaper className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Unread</p>
            <p className="text-2xl font-bold text-primary">{unread}</p>
          </div>
          <Clock className="h-5 w-5 text-primary/60" />
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Saved</p>
            <p className="text-2xl font-bold text-foreground">{saved}</p>
          </div>
          <Tag className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* ── Feed sources sidebar ── */}
        <div className="lg:col-span-1 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Feed Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DEFAULT_FEEDS.map((feed) => (
                <div
                  key={feed.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{feed.name}</p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 mt-0.5 ${CATEGORY_COLORS[feed.category] ?? ""}`}
                    >
                      {feed.category}
                    </Badge>
                  </div>
                  <a href={feed.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </a>
                </div>
              ))}
              {lastFetched && (
                <p className="text-[11px] text-muted-foreground/60 pt-1">
                  Last fetched: {lastFetched}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Article list ── */}
        <div className="lg:col-span-3 space-y-3">
          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border py-20 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Newspaper className="h-7 w-7 text-primary/40" />
              </div>
              <div>
                <p className="text-sm font-medium">No articles yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[300px] mx-auto">
                  Click <span className="font-medium text-foreground">Refresh Feeds</span> to pull
                  the latest articles from TechCrunch AI, Marketing In Asia, and The Rakyat Post.
                </p>
              </div>
              <Button size="sm" onClick={fetchArticles} disabled={isFetching}>
                {isFetching ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                {isFetching ? "Fetching…" : "Fetch Articles"}
              </Button>
            </div>
          ) : (
            articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                isGenerating={generatingId === article.id}
                isCopied={copiedId === article.id}
                isSavingDraft={savingToDraft === article.id}
                isDraftSaved={draftSaved.has(article.id)}
                onToggleSave={() => toggleSave(article.id)}
                onMarkRead={() => markRead(article.id)}
                onGenerateIdea={() => generatePostIdea(article)}
                onCopyIdea={() => copyPostIdea(article)}
                onSaveToDrafts={() => saveToDrafts(article)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────
function ArticleCard({
  article,
  isGenerating,
  isCopied,
  isSavingDraft,
  isDraftSaved,
  onToggleSave,
  onMarkRead,
  onGenerateIdea,
  onCopyIdea,
  onSaveToDrafts,
}: {
  article: LocalArticle;
  isGenerating: boolean;
  isCopied: boolean;
  isSavingDraft: boolean;
  isDraftSaved: boolean;
  onToggleSave: () => void;
  onMarkRead: () => void;
  onGenerateIdea: () => void;
  onCopyIdea: () => void;
  onSaveToDrafts: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`transition-colors ${article.is_read ? "opacity-60" : ""}`}>
      <CardContent className="p-4 space-y-3">
        {/* Article header */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[article.category] ?? ""}`}
              >
                {article.feed_name}
              </Badge>
              {!article.is_read && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
              )}
              {article.published_at && (
                <span className="text-[11px] text-muted-foreground">
                  {new Date(article.published_at).toLocaleDateString("en-MY", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onMarkRead}
              className="group"
            >
              <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {article.title}
                <ExternalLink className="inline h-3 w-3 ml-1 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </p>
            </a>
            {article.summary && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {article.summary}
              </p>
            )}
          </div>
          <button onClick={onToggleSave} className="shrink-0 mt-0.5">
            {article.is_saved ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            )}
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {!article.is_read && (
            <button
              onClick={onMarkRead}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark read
            </button>
          )}

          {!article.post_idea ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerateIdea}
              disabled={isGenerating}
              className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 ml-auto"
            >
              {isGenerating ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1" />
              )}
              {isGenerating ? "Generating…" : "Generate Post Idea"}
            </Button>
          ) : (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-primary ml-auto"
            >
              <Zap className="h-3 w-3" />
              Post idea ready
              <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          )}
        </div>

        {/* Post idea panel */}
        {article.post_idea && expanded && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                ✨ AI Post Idea
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onCopyIdea}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isCopied ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {isCopied ? "Copied!" : "Copy"}
                </button>
                <Button
                  size="sm"
                  onClick={onSaveToDrafts}
                  disabled={isSavingDraft || isDraftSaved}
                  className="h-6 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSavingDraft ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : isDraftSaved ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Zap className="h-3 w-3 mr-1" />
                  )}
                  {isDraftSaved ? "Saved!" : isSavingDraft ? "Saving…" : "Save to Drafts"}
                </Button>
              </div>
            </div>
            <p className="text-xs font-medium">{article.post_idea.hook}</p>
            {article.post_idea.body.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-3">
                {article.post_idea.body.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground italic">{article.post_idea.cta}</p>
            {article.post_idea.hashtags.length > 0 && (
              <p className="text-[11px] text-primary/60">
                {article.post_idea.hashtags.join(" ")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
