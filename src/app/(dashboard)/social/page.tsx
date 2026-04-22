"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useCensor } from "@/hooks/use-censor";
import {
  Camera,
  RefreshCw,
  MessageCircle,
  Heart,
  ThumbsUp,
  Share2,
  ExternalLink,
  Image,
  Plus,
  X,
  Loader2,
  Upload,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  List,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Edit3,
  Send,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

// --------------- Types ---------------

interface FacebookProfile {
  name: string;
  fan_count: number;
  followers_count: number;
  talking_about_count: number;
}

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  likes?: { summary?: { total_count: number } };
  comments?: { summary?: { total_count: number } };
  shares?: { count: number };
}

interface IGProfile {
  id: string;
  username: string;
  followers_count: number;
  media_count: number;
  profile_picture_url?: string;
  biography?: string;
}

interface IGMedia {
  id: string;
  caption?: string;
  like_count?: number;
  comments_count?: number;
  timestamp: string;
  media_type: string;
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
}

interface ScheduledPost {
  id: string;
  caption: string;
  image_url?: string;
  platform: "instagram" | "facebook" | "both";
  media_type: "IMAGE" | "VIDEO" | "REELS" | "CAROUSEL_ALBUM";
  scheduled_at: string;
  status: "scheduled" | "published" | "failed";
  error_message?: string;
  content_idea_id?: string;
  created_at: string;
}

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

type SocialTab = "overview" | "calendar" | "scheduler";

// --------------- Helpers ---------------

function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return "\u2014";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
    }).format(date);
  }
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
}

function formatScheduledDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // Returns 0=Sun, 1=Mon, ... 6=Sat
  const day = new Date(year, month, 1).getDay();
  // Convert to Mon=0 ... Sun=6
  return day === 0 ? 6 : day - 1;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  both: "#7C3AED",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]" },
  published: { bg: "bg-[#10B981]/10", text: "text-[#10B981]" },
  failed: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]" },
};

// --------------- Sub-components ---------------

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
    </div>
  );
}

function IGPostCard({ post }: { post: IGMedia }) {
  const censor = useCensor();
  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] overflow-hidden transition-colors hover:border-primary/30"
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-[#1A1A1A]">
        {post.media_url || post.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnail_url || post.media_url}
            alt={post.caption?.slice(0, 50) || "Instagram post"}
            className={`h-full w-full object-cover ${censor.imageBlurClass}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Image className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-1 text-sm font-medium text-white">
            <Heart className="h-4 w-4" />
            {post.like_count ?? 0}
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-white">
            <MessageCircle className="h-4 w-4" />
            {post.comments_count ?? 0}
          </span>
        </div>
      </div>
      {/* Caption */}
      <div className="p-3">
        <p className={`line-clamp-2 text-xs text-muted-foreground ${censor.blurClass}`}>
          {post.caption || "No caption"}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">
          {timeAgo(post.timestamp)}
        </p>
      </div>
    </a>
  );
}

function FBPostRow({ post }: { post: FacebookPost }) {
  const censor = useCensor();
  const likes = post.likes?.summary?.total_count ?? 0;
  const comments = post.comments?.summary?.total_count ?? 0;
  const shares = post.shares?.count ?? 0;

  return (
    <div className="group flex items-start gap-4 border-b border-[#1E1E1E] px-4 py-4 transition-colors hover:bg-[#1A1A1A]">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={`line-clamp-2 text-sm text-foreground ${censor.blurClass}`}>
          {post.message || "(No text)"}
        </p>
        <p className="text-xs text-muted-foreground">
          {timeAgo(post.created_time)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ThumbsUp className="h-3.5 w-3.5" />
          <span className="font-mono">{likes}</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="font-mono">{comments}</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Share2 className="h-3.5 w-3.5" />
          <span className="font-mono">{shares}</span>
        </span>
        <a
          href={`https://facebook.com/${post.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
        </a>
      </div>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform] || "#6B7280";
  const label = platform === "both" ? "IG + FB" : platform.charAt(0).toUpperCase() + platform.slice(1);
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.scheduled;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.bg} ${s.text}`}>
      {status}
    </span>
  );
}

// --------------- Create Post Modal (original) ---------------

function CreatePostModal({
  isOpen,
  onClose,
  onPosted,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [platform, setPlatform] = useState<"instagram" | "facebook" | "both">(
    "both"
  );
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mediaType, setMediaType] = useState<
    "IMAGE" | "VIDEO" | "REELS" | "CAROUSEL_ALBUM"
  >("IMAGE");
  const [shareToFeed, setShareToFeed] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setCaption("");
    setImageUrl("");
    setPreviewUrl("");
    setMediaType("IMAGE");
    setPlatform("both");
    setShareToFeed(true);
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/social/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }
      setImageUrl(data.url);
      setPreviewUrl(URL.createObjectURL(file));
      toast.success("Image uploaded!");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim()) return;

    setPublishing(true);
    try {
      const body: Record<string, unknown> = {
        platform,
        caption: caption.trim(),
        media_type: mediaType,
        share_to_feed: shareToFeed,
      };
      if (imageUrl.trim()) body.image_url = imageUrl.trim();

      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to publish");
        return;
      }

      const targets = [];
      if (data.instagram) targets.push("Instagram");
      if (data.facebook) targets.push("Facebook");
      toast.success(`Published to ${targets.join(" & ")}`);
      reset();
      onClose();
      onPosted();
    } catch {
      toast.error("Failed to publish post");
    } finally {
      setPublishing(false);
    }
  }

  if (!isOpen) return null;

  const PLATFORM_OPTIONS = [
    { value: "instagram" as const, label: "Instagram", color: "#E1306C" },
    { value: "facebook" as const, label: "Facebook", color: "#1877F2" },
    { value: "both" as const, label: "Both", color: "#7C3AED" },
  ];

  const MEDIA_TYPES = [
    { value: "IMAGE" as const, label: "Photo" },
    { value: "VIDEO" as const, label: "Video" },
    { value: "REELS" as const, label: "Reels" },
    { value: "CAROUSEL_ALBUM" as const, label: "Carousel" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4">
          <h2 className="text-base font-semibold">Create Post</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handlePublish} className="p-5 space-y-4">
          {/* Platform */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Post To
            </label>
            <div className="flex gap-2">
              {PLATFORM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlatform(opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                    platform === opt.value
                      ? "text-white ring-1 ring-white/20"
                      : "border-[#1E1E1E] bg-[#0A0A0A] text-muted-foreground hover:text-foreground"
                  }`}
                  style={{
                    backgroundColor:
                      platform === opt.value ? opt.color : undefined,
                    borderColor:
                      platform === opt.value ? opt.color : undefined,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Media Type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Media Type
            </label>
            <div className="flex gap-1.5">
              {MEDIA_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMediaType(opt.value)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                    mediaType === opt.value
                      ? "bg-primary text-white"
                      : "bg-[#1E1E1E] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Image / Video
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            {previewUrl ? (
              <div className="relative rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-32 w-full rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setPreviewUrl("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#333] bg-[#0A0A0A] py-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Click to upload image or video
                  </>
                )}
              </button>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">
              Or paste a URL:
            </p>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setPreviewUrl("");
              }}
              placeholder="https://example.com/image.jpg"
              className="mt-1 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-xs outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your caption... #hashtags @mentions"
              rows={5}
              required
              className="w-full resize-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {caption.length} / 2,200
            </p>
          </div>

          {/* Reels: Share to Feed */}
          {mediaType === "REELS" && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shareToFeed}
                onChange={(e) => setShareToFeed(e.target.checked)}
                className="h-4 w-4 rounded border-[#1E1E1E] bg-[#0A0A0A]"
              />
              <span className="text-xs text-muted-foreground">
                Also share to feed
              </span>
            </label>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#1E1E1E] pt-4">
            <p className="text-[10px] text-muted-foreground">
              Posts via Facebook Graph API
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!caption.trim() || publishing}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --------------- Schedule Post Modal ---------------

function SchedulePostModal({
  isOpen,
  onClose,
  onSaved,
  editingPost,
  prefillDate,
  prefillIdea,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingPost?: ScheduledPost | null;
  prefillDate?: string | null;
  prefillIdea?: ContentIdea | null;
}) {
  const isEdit = !!editingPost;

  const [platform, setPlatform] = useState<"instagram" | "facebook" | "both">("both");
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO" | "REELS" | "CAROUSEL_ALBUM">("IMAGE");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [contentIdeaId, setContentIdeaId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPost) {
      setPlatform(editingPost.platform);
      setCaption(editingPost.caption);
      setImageUrl(editingPost.image_url || "");
      setMediaType(editingPost.media_type);
      const dt = new Date(editingPost.scheduled_at);
      setScheduledDate(toDateKey(dt));
      setScheduledTime(`${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`);
      setContentIdeaId(editingPost.content_idea_id || null);
      setPreviewUrl("");
    } else {
      resetForm();
      if (prefillDate) {
        setScheduledDate(prefillDate);
      }
      if (prefillIdea) {
        setCaption(prefillIdea.copywriting);
        setContentIdeaId(prefillIdea.id);
        if (prefillIdea.platform.toLowerCase().includes("instagram") && prefillIdea.platform.toLowerCase().includes("facebook")) {
          setPlatform("both");
        } else if (prefillIdea.platform.toLowerCase().includes("instagram")) {
          setPlatform("instagram");
        } else if (prefillIdea.platform.toLowerCase().includes("facebook")) {
          setPlatform("facebook");
        }
      }
    }
  }, [editingPost, prefillDate, prefillIdea, isOpen]);

  function resetForm() {
    setPlatform("both");
    setCaption("");
    setImageUrl("");
    setPreviewUrl("");
    setMediaType("IMAGE");
    setScheduledDate("");
    setScheduledTime("09:00");
    setContentIdeaId(null);
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/social/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }
      setImageUrl(data.url);
      setPreviewUrl(URL.createObjectURL(file));
      toast.success("Image uploaded!");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent, publishNow = false) {
    e.preventDefault();
    if (!caption.trim()) return;
    if (!publishNow && !scheduledDate) {
      toast.error("Please select a date");
      return;
    }

    setSubmitting(true);
    try {
      if (publishNow) {
        // Publish immediately using existing endpoint
        const body: Record<string, unknown> = {
          platform,
          caption: caption.trim(),
          media_type: mediaType,
        };
        if (imageUrl.trim()) body.image_url = imageUrl.trim();

        const res = await fetch("/api/social/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to publish");
          return;
        }
        // Mark content idea as used if applicable
        if (contentIdeaId) {
          await fetch("/api/agents/content-ideas", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: contentIdeaId, status: "used" }),
          }).catch(() => {});
        }
        toast.success("Post published!");
      } else {
        // Schedule
        const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
        const body: Record<string, unknown> = {
          caption: caption.trim(),
          platform,
          media_type: mediaType,
          scheduled_at: scheduledAt,
        };
        if (imageUrl.trim()) body.image_url = imageUrl.trim();
        if (contentIdeaId) body.content_idea_id = contentIdeaId;

        if (isEdit) {
          body.id = editingPost!.id;
          const res = await fetch("/api/social/scheduled", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const data = await res.json();
            toast.error(data.error || "Failed to update scheduled post");
            return;
          }
          toast.success("Scheduled post updated");
        } else {
          const res = await fetch("/api/social/scheduled", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const data = await res.json();
            toast.error(data.error || "Failed to schedule post");
            return;
          }
          // Mark content idea as used
          if (contentIdeaId) {
            await fetch("/api/agents/content-ideas", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: contentIdeaId, status: "used" }),
            }).catch(() => {});
          }
          toast.success("Post scheduled!");
        }
      }

      resetForm();
      onClose();
      onSaved();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingPost) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/social/scheduled", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingPost.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Scheduled post deleted");
      resetForm();
      onClose();
      onSaved();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  if (!isOpen) return null;

  const PLATFORM_OPTIONS = [
    { value: "instagram" as const, label: "Instagram", color: "#E1306C" },
    { value: "facebook" as const, label: "Facebook", color: "#1877F2" },
    { value: "both" as const, label: "Both", color: "#7C3AED" },
  ];

  const MEDIA_TYPES = [
    { value: "IMAGE" as const, label: "Photo" },
    { value: "VIDEO" as const, label: "Video" },
    { value: "REELS" as const, label: "Reels" },
    { value: "CAROUSEL_ALBUM" as const, label: "Carousel" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edit Scheduled Post" : "Schedule Post"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="p-5 space-y-4">
          {/* Platform */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Platform
            </label>
            <div className="flex gap-2">
              {PLATFORM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlatform(opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                    platform === opt.value
                      ? "text-white ring-1 ring-white/20"
                      : "border-[#1E1E1E] bg-[#0A0A0A] text-muted-foreground hover:text-foreground"
                  }`}
                  style={{
                    backgroundColor: platform === opt.value ? opt.color : undefined,
                    borderColor: platform === opt.value ? opt.color : undefined,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Media Type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Media Type
            </label>
            <div className="flex gap-1.5">
              {MEDIA_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMediaType(opt.value)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                    mediaType === opt.value
                      ? "bg-primary text-white"
                      : "bg-[#1E1E1E] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Image / Video
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            {previewUrl || imageUrl ? (
              <div className="relative rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl || imageUrl}
                  alt="Preview"
                  className="h-32 w-full rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setPreviewUrl("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#333] bg-[#0A0A0A] py-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Click to upload image or video
                  </>
                )}
              </button>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">Or paste a URL:</p>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setPreviewUrl("");
              }}
              placeholder="https://example.com/image.jpg"
              className="mt-1 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-xs outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your caption... #hashtags @mentions"
              rows={5}
              required
              className="w-full resize-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {caption.length} / 2,200
            </p>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary font-mono [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary font-mono [color-scheme:dark]"
              />
            </div>
          </div>

          {contentIdeaId && (
            <p className="flex items-center gap-1.5 text-[10px] text-[#7C3AED]">
              <Lightbulb className="h-3 w-3" />
              Linked to content idea
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#1E1E1E] pt-4">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
                disabled={!caption.trim() || submitting}
                className="flex items-center gap-1.5 rounded-lg border border-[#1E1E1E] px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Publish Now
              </button>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!caption.trim() || submitting}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEdit ? "Saving..." : "Scheduling..."}
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    {isEdit ? "Update" : "Schedule"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --------------- Content Calendar View ---------------

function ContentCalendarView({
  onOpenScheduler,
}: {
  onOpenScheduler: (opts: { date?: string; post?: ScheduledPost; idea?: ContentIdea }) => void;
}) {
  const censor = useCensor();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  const fetchScheduled = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/scheduled?month=${toMonthKey(year, month)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 500 || data?.error?.includes("does not exist") || data?.error?.includes("setup")) {
          setSetupRequired(true);
          setScheduledPosts([]);
        } else {
          setScheduledPosts([]);
        }
        return;
      }
      const data = await res.json();
      setScheduledPosts(data.posts || []);
      setSetupRequired(false);
    } catch {
      setScheduledPosts([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/content-ideas?status=new");
      if (!res.ok) return;
      const data = await res.json();
      setContentIdeas(Array.isArray(data) ? data : data.ideas || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
    fetchIdeas();
  }, [fetchScheduled, fetchIdeas]);

  // Group posts by date key
  const postsByDate = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const post of scheduledPosts) {
      const key = toDateKey(new Date(post.scheduled_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    }
    return map;
  }, [scheduledPosts]);

  function goToPrevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayKey = toDateKey(today);

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (setupRequired) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E1E1E] bg-[#111111] py-20">
        <AlertTriangle className="mb-3 h-8 w-8 text-[#F59E0B]" />
        <p className="text-sm font-medium text-[#F5F5F5]">Setup Required</p>
        <p className="mt-1 text-xs text-[#6B7280] max-w-sm text-center">
          The scheduled_posts table has not been created yet. Create the required database table to use the Content Calendar and Post Scheduler.
        </p>
        <button
          onClick={async () => {
            toast.info("Please run the migration to create the scheduled_posts table in Supabase.");
          }}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Setup Instructions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
        {/* Month Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={goToPrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E1E1E] text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-semibold">
            {MONTH_NAMES[month]} {year}
          </h3>
          <button
            onClick={goToNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E1E1E] text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-[#1A1A1A]" />
            ))}
          </div>
        ) : (
          <>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">
                  {d}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before start of month */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 rounded-lg bg-[#0A0A0A]/30" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayPosts = postsByDate.get(dateKey) || [];
                const isToday = dateKey === todayKey;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (dayPosts.length === 0) {
                        onOpenScheduler({ date: dateKey });
                      }
                    }}
                    className={`relative h-24 rounded-lg border p-1.5 text-left transition-colors ${
                      isToday
                        ? "border-[#7C3AED]/50 bg-[#7C3AED]/5"
                        : "border-[#1E1E1E] bg-[#0A0A0A] hover:border-[#333]"
                    }`}
                  >
                    <span
                      className={`text-[11px] font-mono ${
                        isToday ? "font-bold text-[#7C3AED]" : "text-[#6B7280]"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="mt-0.5 space-y-0.5 overflow-hidden">
                      {dayPosts.slice(0, 3).map((post) => {
                        const color = PLATFORM_COLORS[post.platform] || "#7C3AED";
                        return (
                          <button
                            key={post.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenScheduler({ post });
                            }}
                            className="block w-full truncate rounded px-1 py-0.5 text-[9px] font-medium text-white transition-opacity hover:opacity-80"
                            style={{ backgroundColor: color }}
                            title={censor.short(post.caption, 10)}
                          >
                            {censor.short(post.caption.length > 30 ? post.caption.slice(0, 30) + "..." : post.caption, 10)}
                          </button>
                        );
                      })}
                      {dayPosts.length > 3 && (
                        <span className="block text-[9px] text-[#6B7280] pl-1">
                          +{dayPosts.length - 3} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Content Ideas */}
      {contentIdeas.length > 0 && (
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[#F59E0B]" />
            <h3 className="text-sm font-semibold">Content Ideas</h3>
            <span className="text-xs font-mono text-muted-foreground">
              {contentIdeas.length} new
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contentIdeas.map((idea) => (
              <div
                key={idea.id}
                className="rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-4 transition-colors hover:border-[#333]"
              >
                <div className="mb-2 flex items-center gap-2">
                  <PlatformBadge platform={idea.platform.toLowerCase()} />
                  <span className="text-[10px] text-[#6B7280]">{idea.posting_style}</span>
                </div>
                <p className="mb-2 text-xs text-[#F5F5F5] line-clamp-3">
                  {idea.copywriting}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#6B7280]">{idea.post_use}</span>
                  <button
                    type="button"
                    onClick={() => onOpenScheduler({ idea })}
                    className="flex items-center gap-1 rounded-md bg-[#7C3AED] px-2.5 py-1 text-[10px] font-medium text-white transition-colors hover:bg-[#7C3AED]/80"
                  >
                    <Calendar className="h-3 w-3" />
                    Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --------------- Post Scheduler View ---------------

function PostSchedulerView({
  onOpenScheduler,
}: {
  onOpenScheduler: (opts: { post?: ScheduledPost }) => void;
}) {
  const censor = useCensor();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [filter, setFilter] = useState<"all" | "scheduled" | "published" | "failed">("all");
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/scheduled");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 500 || data?.error?.includes("does not exist") || data?.error?.includes("setup")) {
          setSetupRequired(true);
          setPosts([]);
        } else {
          setPosts([]);
        }
        return;
      }
      const data = await res.json();
      setPosts(data.posts || []);
      setSetupRequired(false);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleRetry(post: ScheduledPost) {
    setRetrying(post.id);
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: post.platform,
          caption: post.caption,
          media_type: post.media_type,
          image_url: post.image_url,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Retry failed");
        return;
      }
      toast.success("Post published!");
      fetchPosts();
    } catch {
      toast.error("Retry failed");
    } finally {
      setRetrying(null);
    }
  }

  const filtered = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  // Sort: scheduled first (by date asc), then published, then failed
  const sorted = [...filtered].sort((a, b) => {
    const statusOrder = { scheduled: 0, failed: 1, published: 2 };
    const aOrder = statusOrder[a.status] ?? 1;
    const bOrder = statusOrder[b.status] ?? 1;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });

  if (setupRequired) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E1E1E] bg-[#111111] py-20">
        <AlertTriangle className="mb-3 h-8 w-8 text-[#F59E0B]" />
        <p className="text-sm font-medium text-[#F5F5F5]">Setup Required</p>
        <p className="mt-1 text-xs text-[#6B7280] max-w-sm text-center">
          The scheduled_posts table has not been created yet. Create the required database table to use the Content Calendar and Post Scheduler.
        </p>
        <button
          onClick={async () => {
            toast.info("Please run the migration to create the scheduled_posts table in Supabase.");
          }}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Setup Instructions
        </button>
      </div>
    );
  }

  const FILTER_TABS = [
    { key: "all" as const, label: "All", count: posts.length },
    { key: "scheduled" as const, label: "Scheduled", count: posts.filter((p) => p.status === "scheduled").length },
    { key: "published" as const, label: "Published", count: posts.filter((p) => p.status === "published").length },
    { key: "failed" as const, label: "Failed", count: posts.filter((p) => p.status === "failed").length },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-[#1E1E1E] bg-[#111111] p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                filter === tab.key
                  ? "bg-[#1E1E1E] text-[#F5F5F5]"
                  : "text-[#6B7280] hover:text-[#F5F5F5]"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 font-mono text-[10px]">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => onOpenScheduler({})}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Schedule New Post
        </button>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-[#1E1E1E] bg-[#111111]" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E1E1E] bg-[#111111] py-16">
          <Calendar className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "No scheduled posts yet" : `No ${filter} posts`}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] divide-y divide-[#1E1E1E]">
          {sorted.map((post) => (
            <div key={post.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[#1A1A1A]">
              {/* Time */}
              <div className="w-36 shrink-0">
                <p className="text-xs font-mono text-[#F5F5F5]">
                  {formatScheduledDate(post.scheduled_at)}
                </p>
              </div>

              {/* Platform */}
              <div className="shrink-0">
                <PlatformBadge platform={post.platform} />
              </div>

              {/* Caption */}
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm text-[#F5F5F5] ${censor.blurClass}`}>
                  {post.caption}
                </p>
                {post.status === "failed" && post.error_message && (
                  <p className="mt-0.5 truncate text-[10px] text-[#EF4444]">
                    {post.error_message}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="shrink-0">
                <StatusBadge status={post.status} />
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                {post.status === "failed" && (
                  <button
                    onClick={() => handleRetry(post)}
                    disabled={retrying === post.id}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50"
                    title="Retry"
                  >
                    {retrying === post.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                {post.status === "scheduled" && (
                  <button
                    onClick={() => onOpenScheduler({ post })}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
                    title="Edit"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --------------- Main Page ---------------

export default function SocialPage() {
  const censor = useCensor();
  const [activeTab, setActiveTab] = useState<SocialTab>("overview");

  // Account Overview state
  const [fbProfile, setFbProfile] = useState<FacebookProfile | null>(null);
  const [fbPosts, setFbPosts] = useState<FacebookPost[]>([]);
  const [igProfile, setIgProfile] = useState<IGProfile | null>(null);
  const [igMedia, setIgMedia] = useState<IGMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingScheduledPost, setEditingScheduledPost] = useState<ScheduledPost | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [prefillIdea, setPrefillIdea] = useState<ContentIdea | null>(null);
  const [schedulerRefreshKey, setSchedulerRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    setRefreshing(true);

    const [fbRes, igRes] = await Promise.allSettled([
      fetch("/api/facebook/metrics"),
      fetch("/api/instagram/metrics"),
    ]);

    // Facebook
    if (fbRes.status === "fulfilled" && fbRes.value.ok) {
      const json = await fbRes.value.json();
      setFbProfile(json.profile || null);
      setFbPosts(json.posts || []);
    }

    // Instagram
    if (igRes.status === "fulfilled" && igRes.value.ok) {
      const json = await igRes.value.json();
      setIgProfile(json.profile || null);
      setIgMedia(json.media || []);
    }

    setLastFetched(new Date().toISOString());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const igConnected = igProfile !== null;
  const fbConnected = fbProfile !== null;

  // IG engagement totals
  const igTotalLikes = igMedia.reduce((sum, m) => sum + (m.like_count ?? 0), 0);
  const igTotalComments = igMedia.reduce(
    (sum, m) => sum + (m.comments_count ?? 0),
    0
  );

  function openScheduleModal(opts: { date?: string; post?: ScheduledPost; idea?: ContentIdea }) {
    setEditingScheduledPost(opts.post || null);
    setPrefillDate(opts.date || null);
    setPrefillIdea(opts.idea || null);
    setShowScheduleModal(true);
  }

  function onScheduleSaved() {
    setSchedulerRefreshKey((k) => k + 1);
  }

  // Tab switcher
  const TABS: { key: SocialTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "overview", label: "Account Overview", icon: Camera },
    { key: "calendar", label: "Content Calendar", icon: Calendar },
    { key: "scheduler", label: "Post Scheduler", icon: List },
  ];

  const tabSwitcher = (
    <div className="inline-flex rounded-lg border border-[#1E1E1E] bg-[#111111] p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
            activeTab === tab.key
              ? "bg-[#7C3AED] text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#F5F5F5]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <PageWrapper title="Social Media" lastSynced={lastFetched} headerExtra={tabSwitcher}>
      {/* ==================== Account Overview Tab ==================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={() => setShowCreatePost(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create Post
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-52 animate-pulse rounded-xl border border-[#1E1E1E] bg-[#111111]"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Platform Cards */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Instagram Card */}
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {igConnected
                            ? `@${censor.name(igProfile.username, "ig-username")}`
                            : "Instagram"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {igConnected ? "Connected" : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider ${
                        igConnected
                          ? "bg-[#10B981]/10 text-[#10B981]"
                          : "bg-[#1E1E1E] text-muted-foreground"
                      }`}
                    >
                      {igConnected ? "Live" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <MetricItem
                      label="Followers"
                      value={
                        igConnected
                          ? formatNumber(igProfile.followers_count)
                          : "\u2014"
                      }
                    />
                    <MetricItem
                      label="Posts"
                      value={
                        igConnected
                          ? formatNumber(igProfile.media_count)
                          : "\u2014"
                      }
                    />
                    <MetricItem
                      label="Likes (Recent)"
                      value={igConnected ? formatNumber(igTotalLikes) : "\u2014"}
                    />
                    <MetricItem
                      label="Comments (Recent)"
                      value={
                        igConnected ? formatNumber(igTotalComments) : "\u2014"
                      }
                    />
                  </div>
                </div>

                {/* Facebook Card */}
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                        <span className="text-lg font-bold text-white">f</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {fbProfile?.name || "Facebook"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {fbConnected ? "Connected" : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider ${
                        fbConnected
                          ? "bg-[#10B981]/10 text-[#10B981]"
                          : "bg-[#1E1E1E] text-muted-foreground"
                      }`}
                    >
                      {fbConnected ? "Live" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <MetricItem
                      label="Page Likes"
                      value={
                        fbConnected
                          ? formatNumber(fbProfile?.fan_count)
                          : "\u2014"
                      }
                    />
                    <MetricItem
                      label="Followers"
                      value={
                        fbConnected
                          ? formatNumber(fbProfile?.followers_count)
                          : "\u2014"
                      }
                    />
                    <MetricItem
                      label="Talking About"
                      value={
                        fbConnected
                          ? formatNumber(fbProfile?.talking_about_count)
                          : "\u2014"
                      }
                    />
                    <MetricItem
                      label="Recent Posts"
                      value={
                        fbConnected ? formatNumber(fbPosts.length) : "\u2014"
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Instagram Posts Grid */}
              {igConnected && igMedia.length > 0 && (
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      Instagram — Recent Posts
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground">
                      {igMedia.length} posts
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {igMedia.map((post) => (
                      <IGPostCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              )}

              {/* Facebook Posts List */}
              {fbPosts.length > 0 && (
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111]">
                  <div className="flex items-center justify-between border-b border-[#1E1E1E] px-4 py-3">
                    <h3 className="text-sm font-semibold">
                      Facebook — Recent Posts
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground">
                      {fbPosts.length} posts
                    </span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {fbPosts.map((post) => (
                      <FBPostRow key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state if no posts at all */}
              {fbPosts.length === 0 && igMedia.length === 0 && (
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111]">
                  <div className="flex flex-col items-center justify-center py-16">
                    <MessageCircle className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No recent posts to display
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ==================== Content Calendar Tab ==================== */}
      {activeTab === "calendar" && (
        <ContentCalendarView
          key={schedulerRefreshKey}
          onOpenScheduler={openScheduleModal}
        />
      )}

      {/* ==================== Post Scheduler Tab ==================== */}
      {activeTab === "scheduler" && (
        <PostSchedulerView
          key={schedulerRefreshKey}
          onOpenScheduler={openScheduleModal}
        />
      )}

      {/* Create Post Modal (original) */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPosted={fetchData}
      />

      {/* Schedule Post Modal */}
      <SchedulePostModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setEditingScheduledPost(null);
          setPrefillDate(null);
          setPrefillIdea(null);
        }}
        onSaved={onScheduleSaved}
        editingPost={editingScheduledPost}
        prefillDate={prefillDate}
        prefillIdea={prefillIdea}
      />
    </PageWrapper>
  );
}
