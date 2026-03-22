"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { InstagramPost, PostStatus, PostType } from "@/types/instagram";
import type { ContentPillar, CaptionResponse } from "@/types";

interface PostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (post: Omit<InstagramPost, "id" | "createdAt" | "coverHue">) => void;
  editPost?: InstagramPost | null;
}

const EMPTY_FORM = {
  caption: "",
  hashtags: "",
  type: "feed" as PostType,
  status: "backlog" as PostStatus,
  scheduledDate: "",
  pillar: "education" as ContentPillar,
  topic: "",
};

const PILLAR_OPTIONS: { value: ContentPillar; label: string; emoji: string }[] = [
  { value: "education", label: "Education", emoji: "📚" },
  { value: "inspiration", label: "Inspiration", emoji: "✨" },
  { value: "promotion", label: "Promotion", emoji: "📣" },
  { value: "behind-the-scenes", label: "Behind the Scenes", emoji: "🎬" },
  { value: "engagement", label: "Engagement", emoji: "💬" },
  { value: "case-study", label: "Case Study", emoji: "📊" },
];

export function PostDialog({
  open,
  onOpenChange,
  onSave,
  editPost,
}: PostDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isGenerating, setIsGenerating] = useState(false);
  const [captionVariants, setCaptionVariants] = useState<CaptionResponse | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<"a" | "b" | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (editPost) {
      setForm({
        caption: editPost.caption,
        hashtags: editPost.hashtags,
        type: editPost.type,
        status: editPost.status,
        scheduledDate: editPost.scheduledDate ?? "",
        pillar: "education",
        topic: "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setCaptionVariants(null);
    setSelectedVariant(null);
    setAiError(null);
  }, [editPost, open]);

  async function handleGenerateCaption() {
    if (!form.topic.trim()) {
      setAiError("Enter a topic first so the AI knows what to write about.");
      return;
    }
    setIsGenerating(true);
    setAiError(null);
    setCaptionVariants(null);
    setSelectedVariant(null);

    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: form.topic,
          pillar: form.pillar,
          platform: "instagram",
          context: "Flogen AI is a Malaysian B2B WhatsApp AI Agent agency helping SMEs automate customer service.",
        }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data: CaptionResponse = await res.json();
      setCaptionVariants(data);
    } catch {
      setAiError("Couldn't generate — check your ANTHROPIC_API_KEY in .env.local");
    } finally {
      setIsGenerating(false);
    }
  }

  function pickVariant(variant: "a" | "b") {
    if (!captionVariants) return;
    const text = variant === "a" ? captionVariants.variant_a : captionVariants.variant_b;
    const hashtags = captionVariants.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    setForm((f) => ({ ...f, caption: text, hashtags }));
    setSelectedVariant(variant);
  }

  function handleSave() {
    onSave({
      caption: form.caption,
      hashtags: form.hashtags,
      type: form.type,
      status: form.status,
      scheduledDate:
        form.status === "scheduled" && form.scheduledDate
          ? form.scheduledDate
          : null,
    });
    onOpenChange(false);
  }

  const isScheduled = form.status === "scheduled";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editPost ? "Edit Post" : "New Content Idea"}
            <Badge variant="secondary" className="text-[10px] font-normal">
              Content Studio
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {editPost
              ? "Update this post's details and status."
              : "Add a new idea to your Flogen AI content pipeline."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Post Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as PostType }))}
              >
                <SelectTrigger className="bg-muted/50 border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feed">Feed Post</SelectItem>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as PostStatus }))}
              >
                <SelectTrigger className="bg-muted/50 border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Pillar */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Content Pillar</Label>
            <Select
              value={form.pillar}
              onValueChange={(v) => setForm((f) => ({ ...f, pillar: v as ContentPillar }))}
            >
              <SelectTrigger className="bg-muted/50 border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PILLAR_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.emoji} {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scheduled date */}
          {isScheduled && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Scheduled Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.scheduledDate}
                onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                className="bg-muted/50 border-border text-sm [color-scheme:dark]"
              />
            </div>
          )}

          {/* ── AI Caption Generator ── */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI Caption Generator</span>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/80 ml-auto">
                Powered by Claude
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Topic / Idea</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. How WhatsApp AI saved a local restaurant 2 hours daily"
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  className="bg-background border-border text-sm flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateCaption()}
                />
                <Button
                  size="sm"
                  onClick={handleGenerateCaption}
                  disabled={isGenerating || !form.topic.trim()}
                  className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : captionVariants ? (
                    <RefreshCw className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5 text-xs">
                    {isGenerating ? "Writing…" : captionVariants ? "Regenerate" : "Generate"}
                  </span>
                </Button>
              </div>
            </div>

            {aiError && (
              <p className="text-xs text-destructive">{aiError}</p>
            )}

            {/* Variants */}
            {captionVariants && (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">Pick a variant to use:</p>
                {(["a", "b"] as const).map((v) => {
                  const text = v === "a" ? captionVariants.variant_a : captionVariants.variant_b;
                  const isSelected = selectedVariant === v;
                  return (
                    <button
                      key={v}
                      onClick={() => pickVariant(v)}
                      className={`w-full text-left rounded-lg border p-3 text-xs leading-relaxed transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/70">
                            Variant {v.toUpperCase()}
                          </span>
                          <p className="line-clamp-3">{text}</p>
                        </div>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
                {captionVariants.hashtags.length > 0 && (
                  <p className="text-[11px] text-primary/60">
                    Suggested hashtags: {captionVariants.hashtags.join(" ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Caption</Label>
            <Textarea
              placeholder="Write your caption here, or use the AI generator above…"
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
              rows={4}
              className="bg-muted/50 border-border text-sm resize-none"
            />
            <p className="text-[11px] text-muted-foreground/60 text-right">
              {form.caption.length} / 2200
            </p>
          </div>

          {/* Hashtags */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Hashtags</Label>
            <Input
              placeholder="#whatsapp #aiagent #malaysia"
              value={form.hashtags}
              onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
              className="bg-muted/50 border-border text-sm"
            />
            <p className="text-[11px] text-muted-foreground/60">
              Separate with spaces. Max 30 recommended.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.caption.trim() && !form.hashtags.trim()}
          >
            {editPost ? "Save Changes" : "Add to Pipeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
