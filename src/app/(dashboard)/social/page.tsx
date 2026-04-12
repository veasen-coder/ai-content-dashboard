"use client";

import { useState, useEffect, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Camera,
  RefreshCw,
  MessageCircle,
  ThumbsUp,
  Share2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

// --------------- Types ---------------

interface FacebookProfile {
  name: string;
  fan_count: number;
  followers_count: number;
  talking_about_count: number;
  picture?: { data?: { url?: string } };
}

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  likes?: { summary?: { total_count: number } };
  comments?: { summary?: { total_count: number } };
  shares?: { count: number };
}

interface SocialData {
  facebook: {
    profile: FacebookProfile | null;
    posts: FacebookPost[];
    error: string | null;
  };
}

// --------------- Helpers ---------------

function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return "\u2014";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatPostDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) return formatPostDate(dateStr);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
}

// --------------- Sub-components ---------------

function MetricItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
    </div>
  );
}

function PostRow({ post }: { post: FacebookPost }) {
  const likes = post.likes?.summary?.total_count ?? 0;
  const comments = post.comments?.summary?.total_count ?? 0;
  const shares = post.shares?.count ?? 0;
  const message = post.message || "(No text)";
  const postUrl = `https://facebook.com/${post.id}`;

  return (
    <div className="group flex items-start gap-4 border-b border-[#1E1E1E] px-4 py-4 transition-colors hover:bg-[#1A1A1A]">
      {/* Post content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-sm text-foreground">
          {message}
        </p>
        <p className="text-xs text-muted-foreground">
          {timeAgo(post.created_time)}
        </p>
      </div>

      {/* Engagement metrics */}
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
          href={postUrl}
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

// --------------- Main Page ---------------

export default function SocialPage() {
  const [data, setData] = useState<SocialData>({
    facebook: { profile: null, posts: [], error: null },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setRefreshing(true);

    // Fetch Facebook
    let fbProfile: FacebookProfile | null = null;
    let fbPosts: FacebookPost[] = [];
    let fbError: string | null = null;

    try {
      const res = await fetch("/api/facebook/metrics");
      if (res.ok) {
        const json = await res.json();
        fbProfile = json.profile || null;
        fbPosts = json.posts || [];
      } else {
        const json = await res.json().catch(() => ({}));
        fbError = json.error || `Failed to fetch (${res.status})`;
      }
    } catch {
      fbError = "Network error";
    }

    setData({
      facebook: { profile: fbProfile, posts: fbPosts, error: fbError },
    });
    setLastFetched(new Date().toISOString());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fb = data.facebook;
  const fbConnected = fb.profile !== null;

  const totalPosts = fb.posts.length;
  const totalEngagement = fb.posts.reduce((sum, p) => {
    return (
      sum +
      (p.likes?.summary?.total_count ?? 0) +
      (p.comments?.summary?.total_count ?? 0) +
      (p.shares?.count ?? 0)
    );
  }, 0);

  return (
    <PageWrapper title="Social Media" lastSynced={lastFetched}>
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-end">
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
            <div className="h-64 animate-pulse rounded-xl border border-[#1E1E1E] bg-[#111111]" />
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
                      <h3 className="font-semibold">Instagram</h3>
                      <p className="text-xs text-muted-foreground">
                        Not connected
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-[#1E1E1E] px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Inactive
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <MetricItem label="Followers" value={"\u2014"} />
                  <MetricItem label="Posts" value={"\u2014"} />
                  <MetricItem label="Reach (7d)" value={"\u2014"} />
                  <MetricItem label="Engagement" value={"\u2014"} />
                </div>

                <div className="mt-5 flex items-start gap-2 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Instagram API access is currently deactivated. Complete
                    the developer registration and App Review for Instagram
                    Basic Display or Instagram Graph API to enable metrics.
                  </p>
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
                        {fb.profile?.name || "Facebook"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {fbConnected
                          ? "Connected"
                          : fb.error || "Not connected"}
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
                        ? formatNumber(fb.profile?.fan_count)
                        : "\u2014"
                    }
                  />
                  <MetricItem
                    label="Followers"
                    value={
                      fbConnected
                        ? formatNumber(fb.profile?.followers_count)
                        : "\u2014"
                    }
                  />
                  <MetricItem
                    label="Talking About"
                    value={
                      fbConnected
                        ? formatNumber(fb.profile?.talking_about_count)
                        : "\u2014"
                    }
                  />
                  <MetricItem
                    label="Engagement"
                    value={
                      fbConnected && totalPosts > 0
                        ? formatNumber(totalEngagement)
                        : "\u2014"
                    }
                  />
                </div>

                {fb.error && (
                  <div className="mt-5 flex items-start gap-2 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {fb.error}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Posts */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111]">
              <div className="flex items-center justify-between border-b border-[#1E1E1E] px-4 py-3">
                <h3 className="text-sm font-semibold">Recent Posts</h3>
                <span className="text-xs font-mono text-muted-foreground">
                  {totalPosts} {totalPosts === 1 ? "post" : "posts"}
                </span>
              </div>

              {totalPosts > 0 ? (
                <div className="max-h-[400px] overflow-y-auto">
                  {fb.posts.map((post) => (
                    <PostRow key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <MessageCircle className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {fbConnected
                      ? "No posts available yet. The pages_read_engagement permission may be required to fetch posts."
                      : "Connect a platform to see recent posts"}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
