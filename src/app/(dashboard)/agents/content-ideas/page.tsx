"use client";

import { useState, useEffect, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Camera,
  Globe,
  Archive,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

// --------------- Types ---------------

interface ContentIdea {
  id: string;
  platform: string;
  post_use: string;
  copywriting: string;
  posting_style: string;
  color_palette: string;
  generation_prompt: string;
  reference_notes: string | null;
  status: string;
  created_at: string;
}

// --------------- Helpers ---------------

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function platformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "instagram":
      return <Camera className="h-4 w-4 text-pink-400" />;
    case "facebook":
      return <Globe className="h-4 w-4 text-blue-400" />;
    case "rednote":
      return <span className="text-sm font-bold text-red-400">小红书</span>;
    default:
      return <Sparkles className="h-4 w-4 text-violet-400" />;
  }
}

function platformColor(platform: string) {
  switch (platform.toLowerCase()) {
    case "instagram":
      return "border-pink-500/30 bg-pink-500/10";
    case "facebook":
      return "border-blue-500/30 bg-blue-500/10";
    case "rednote":
      return "border-red-500/30 bg-red-500/10";
    default:
      return "border-violet-500/30 bg-violet-500/10";
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "new":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
          <Clock className="h-3 w-3" /> New
        </span>
      );
    case "used":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-400">
          <CheckCircle2 className="h-3 w-3" /> Used
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/20 px-2 py-0.5 text-xs font-medium text-zinc-400">
          <Archive className="h-3 w-3" /> Archived
        </span>
      );
    default:
      return null;
  }
}

const POST_USE_COLORS: Record<string, string> = {
  "Brand Awareness": "#7C3AED",
  "CTA - Lead Gen": "#EF4444",
  "Social Proof": "#10B981",
  Education: "#3B82F6",
  "Engagement Bait": "#F59E0B",
  "Product Showcase": "#EC4899",
  "Behind The Scenes": "#8B5CF6",
  Testimonial: "#14B8A6",
};

// --------------- Component ---------------

export default function ContentIdeasPage() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [customContext, setCustomContext] = useState("");

  const fetchIdeas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/agents/content-ideas?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIdeas(data.ideas || []);
    } catch {
      toast.error("Failed to load content ideas");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const generateIdeas = async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/agents/content-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: customContext || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Generated ${data.count} new content ideas!`);
      setCustomContext("");
      fetchIdeas();
    } catch (e) {
      toast.error((e as Error).message || "Failed to generate ideas");
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/agents/content-ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === id ? { ...idea, status } : idea))
      );
      toast.success(`Marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard");
  };

  const filteredIdeas = filterPlatform === "all"
    ? ideas
    : ideas.filter((i) => i.platform.toLowerCase() === filterPlatform.toLowerCase());

  // Group by date
  const groupedIdeas: Record<string, ContentIdea[]> = {};
  for (const idea of filteredIdeas) {
    const dateKey = new Date(idea.created_at).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    if (!groupedIdeas[dateKey]) groupedIdeas[dateKey] = [];
    groupedIdeas[dateKey].push(idea);
  }

  return (
    <PageWrapper title="Content Ideas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
              <Sparkles className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Content Ideas Agent</h1>
              <p className="text-sm text-muted-foreground">
                AI-generated posting ideas · Auto-runs every 3 days
              </p>
            </div>
          </div>
        </div>

        {/* Generate Section */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <h3 className="mb-3 text-sm font-medium">Generate New Ideas</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Optional context (e.g. 'Focus on Ramadan promos' or 'Bundle Vaults digital products')"
              className="h-10 flex-1 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            />
            <button
              onClick={generateIdeas}
              disabled={generating}
              className="flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate 5 Ideas
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          {["all", "new", "used", "archived"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                filterStatus === s
                  ? "bg-violet-500/20 text-violet-400"
                  : "text-muted-foreground hover:bg-[#1E1E1E]"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="mx-2 h-4 w-px bg-[#1E1E1E]" />
          <span className="text-xs font-medium text-muted-foreground">Platform:</span>
          {["all", "Instagram", "Facebook", "RedNote"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p === "all" ? "all" : p)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                filterPlatform.toLowerCase() === p.toLowerCase()
                  ? "bg-violet-500/20 text-violet-400"
                  : "text-muted-foreground hover:bg-[#1E1E1E]"
              }`}
            >
              {p}
            </button>
          ))}
          <div className="ml-auto">
            <button
              onClick={fetchIdeas}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E1E1E] text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && ideas.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E1E1E] py-16">
            <Sparkles className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No content ideas yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click &quot;Generate 5 Ideas&quot; to get started
            </p>
          </div>
        ) : (
          Object.entries(groupedIdeas).map(([date, dateIdeas]) => (
            <div key={date} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">{date}</h3>
              {dateIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  isExpanded={expandedId === idea.id}
                  onToggle={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
                  onStatusChange={updateStatus}
                  onCopy={copyToClipboard}
                  isCopied={copiedId === idea.id}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </PageWrapper>
  );
}

// --------------- Idea Card ---------------

function IdeaCard({
  idea,
  isExpanded,
  onToggle,
  onStatusChange,
  onCopy,
  isCopied,
}: {
  idea: ContentIdea;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: string) => void;
  onCopy: (text: string, id: string) => void;
  isCopied: boolean;
}) {
  const postUseColor = POST_USE_COLORS[idea.post_use] || "#6B7280";

  return (
    <div className={`rounded-xl border ${platformColor(idea.platform)} overflow-hidden transition-all`}>
      {/* Header - always visible */}
      <div
        onClick={onToggle}
        className="flex cursor-pointer items-center gap-3 p-4"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A]">
          {platformIcon(idea.platform)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{idea.platform}</span>
            <span
              className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${postUseColor}20`, color: postUseColor }}
            >
              {idea.post_use}
            </span>
            {statusBadge(idea.status)}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {idea.posting_style} · {idea.color_palette}
          </p>
        </div>
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[#1E1E1E] bg-[#0A0A0A] p-4 space-y-4">
          {/* Copywriting */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Copywriting</h4>
              <button
                onClick={() => onCopy(idea.copywriting, idea.id)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
              >
                {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {isCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {idea.copywriting}
            </div>
          </div>

          {/* Posting Style & Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <h4 className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Posting Style</h4>
              <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-3 text-sm">
                {idea.posting_style}
              </div>
            </div>
            <div>
              <h4 className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Color Palette</h4>
              <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-3 text-sm">
                {idea.color_palette}
              </div>
            </div>
          </div>

          {/* Generation Prompt */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Image Generation Prompt</h4>
              <button
                onClick={() => onCopy(idea.generation_prompt, idea.id + "-prompt")}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
                Copy Prompt
              </button>
            </div>
            <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-3 text-sm leading-relaxed whitespace-pre-wrap font-mono text-xs">
              {idea.generation_prompt}
            </div>
          </div>

          {/* Reference Notes */}
          {idea.reference_notes && (
            <div>
              <h4 className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Reference Notes</h4>
              <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-3 text-sm leading-relaxed">
                {idea.reference_notes}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {idea.status === "new" && (
              <button
                onClick={() => onStatusChange(idea.id, "used")}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark as Used
              </button>
            )}
            {idea.status !== "archived" && (
              <button
                onClick={() => onStatusChange(idea.id, "archived")}
                className="flex items-center gap-1.5 rounded-lg border border-[#1E1E1E] px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground transition-colors"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
            )}
            {idea.status === "archived" && (
              <button
                onClick={() => onStatusChange(idea.id, "new")}
                className="flex items-center gap-1.5 rounded-lg border border-[#1E1E1E] px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground transition-colors"
              >
                Restore
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {formatDate(idea.created_at)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
