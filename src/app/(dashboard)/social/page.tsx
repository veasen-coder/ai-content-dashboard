"use client";

import { useState, useEffect, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
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
            className="h-full w-full object-cover"
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
        <p className="line-clamp-2 text-xs text-muted-foreground">
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
  const likes = post.likes?.summary?.total_count ?? 0;
  const comments = post.comments?.summary?.total_count ?? 0;
  const shares = post.shares?.count ?? 0;

  return (
    <div className="group flex items-start gap-4 border-b border-[#1E1E1E] px-4 py-4 transition-colors hover:bg-[#1A1A1A]">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-sm text-foreground">
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

// --------------- Create Post Modal ---------------

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

  function reset() {
    setCaption("");
    setImageUrl("");
    setMediaType("IMAGE");
    setPlatform("both");
    setShareToFeed(true);
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

          {/* Image URL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Image / Video URL
            </label>
            <div className="relative">
              <Upload className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg (public URL)"
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Must be a publicly accessible URL. Required for Instagram.
            </p>
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

// --------------- Main Page ---------------

export default function SocialPage() {
  const [fbProfile, setFbProfile] = useState<FacebookProfile | null>(null);
  const [fbPosts, setFbPosts] = useState<FacebookPost[]>([]);
  const [igProfile, setIgProfile] = useState<IGProfile | null>(null);
  const [igMedia, setIgMedia] = useState<IGMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);

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

  return (
    <PageWrapper title="Social Media" lastSynced={lastFetched}>
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
                          ? `@${igProfile.username}`
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

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPosted={fetchData}
      />
    </PageWrapper>
  );
}
