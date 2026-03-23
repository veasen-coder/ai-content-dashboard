"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Bookmark,
  Download,
  Eye,
  Heart,
  MessageCircle,
  Repeat2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DateRangePicker } from "./date-range-picker";
import { ImpressionsChart } from "./impressions-chart";
import { EngagementChart } from "./engagement-chart";
import { FollowerChart } from "./follower-chart";
import { TopPostsTable } from "./top-posts-table";
import {
  DateRange,
  DailyMetric,
  FollowerMetric,
  KpiSummary,
  TopPost,
  fetchDailyMetrics,
  fetchFollowerMetrics,
  fetchKpiSummary,
  fetchTopPosts,
  presetRange,
} from "@/lib/metricool";

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  delta: number;
  icon: React.ElementType;
  accent: string;
  loading: boolean;
}

function KpiCard({ label, value, delta, icon: Icon, accent, loading }: KpiCardProps) {
  const positive = delta >= 0;
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardDescription className="text-xs">{label}</CardDescription>
        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${accent}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        )}
        <div className="flex items-center gap-1">
          {loading ? (
            <Skeleton className="h-3.5 w-16" />
          ) : (
            <>
              {positive ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
              )}
              <span
                className={`text-xs font-medium ${
                  positive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {positive ? "+" : ""}
                {delta}%
              </span>
              <span className="text-xs text-muted-foreground">vs prev. period</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Micro stat pill ──────────────────────────────────────────────────────────

function MicroStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-card border border-border">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-sm font-semibold">{value.toLocaleString()}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Chart skeleton ───────────────────────────────────────────────────────────

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="space-y-2" style={{ height }}>
      <Skeleton className="h-full w-full bg-zinc-800/60 rounded-lg" />
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

// ── Live Instagram analytics shape ───────────────────────────────────────────
interface IGAnalytics {
  profile: { followers: number; username: string };
  kpi: {
    totalLikes: number;
    totalComments: number;
    totalEngagement: number;
    engagementRate: number;
    avgLikesPerPost: number;
    totalPosts: number;
    followers: number;
  };
  topPosts: Array<{
    id: string;
    type: string;
    caption: string;
    publishedAt: string;
    permalink: string;
    mediaUrl: string;
    likes: number;
    comments: number;
    engagementRate: number;
  }>;
}

export function AnalyticsDashboard() {
  const [range, setRange] = useState<DateRange>(presetRange(30));
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KpiSummary | null>(null);
  const [daily, setDaily] = useState<DailyMetric[]>([]);
  const [followers, setFollowers] = useState<FollowerMetric[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [igLive, setIgLive] = useState<IGAnalytics | null>(null);

  const load = useCallback(async (r: DateRange) => {
    setLoading(true);
    const [k, d, f, tp] = await Promise.all([
      fetchKpiSummary(r),
      fetchDailyMetrics(r),
      fetchFollowerMetrics(r),
      fetchTopPosts(r),
    ]);
    setKpi(k);
    setDaily(d);
    setFollowers(f);
    setTopPosts(tp);
    // Fetch live Instagram data in parallel (non-blocking — won't crash if token missing)
    try {
      const igRes = await fetch("/api/instagram/analytics");
      if (igRes.ok) {
        const igData = await igRes.json() as IGAnalytics & { error?: string };
        if (!igData.error) {
          setIgLive(igData);
          // Merge real top posts into TopPost shape (mock impressions/shares/saves)
          const realTopPosts: TopPost[] = igData.topPosts.slice(0, 5).map((p, i) => ({
            id: p.id,
            type: p.type as "feed" | "reel" | "story" | "carousel",
            caption: p.caption,
            publishedAt: p.publishedAt,
            impressions: Math.round(p.likes * 12 + p.comments * 30), // estimated
            likes: p.likes,
            comments: p.comments,
            shares: Math.round(p.likes * 0.08),
            saves: Math.round(p.likes * 0.15),
            engagementRate: p.engagementRate,
            coverHue: [140, 100, 60, 200, 280][i % 5],
          }));
          if (realTopPosts.length > 0) setTopPosts(realTopPosts);
        }
      }
    } catch { /* live data unavailable — keep mock */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  const days = Math.round(
    (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <BarChart2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              {igLive ? `@${igLive.profile.username}` : "Instagram"} · {igLive ? `${igLive.profile.followers.toLocaleString()} followers` : "Xiaohongshu"} · {days}-day window
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[11px] gap-1.5 ${igLive ? "border-emerald-500/30 text-emerald-400" : "border-primary/30 text-primary/80"}`}
          >
            <Sparkles className="h-3 w-3" />
            {igLive ? "● Live Instagram Data" : "Powered by Metricool"}
          </Badge>
          <Separator orientation="vertical" className="h-5" />
          <DateRangePicker value={range} onChange={(r) => { setRange(r); load(r); }} />
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-9"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label={igLive ? "Total Followers" : "Total Impressions"}
          value={igLive ? igLive.profile.followers.toLocaleString() : (kpi ? kpi.totalImpressions.toLocaleString() : "—")}
          delta={kpi?.impressionsDelta ?? 0}
          icon={igLive ? Users : Eye}
          accent="bg-primary/20 text-primary"
          loading={loading}
        />
        <KpiCard
          label="Engagement Rate"
          value={igLive ? `${igLive.kpi.engagementRate}%` : (kpi ? `${kpi.engagementRate}%` : "—")}
          delta={kpi?.engagementDelta ?? 0}
          icon={TrendingUp}
          accent="bg-emerald-500/20 text-emerald-400"
          loading={loading}
        />
        <KpiCard
          label={igLive ? "Total Likes" : "Follower Growth"}
          value={igLive ? igLive.kpi.totalLikes.toLocaleString() : (kpi ? `+${kpi.followerGrowth.toLocaleString()}` : "—")}
          delta={kpi?.followerDelta ?? 0}
          icon={igLive ? Heart : Users}
          accent="bg-rose-500/20 text-rose-400"
          loading={loading}
        />
        <KpiCard
          label={igLive ? "Total Comments" : "Total Reach"}
          value={igLive ? igLive.kpi.totalComments.toLocaleString() : (kpi ? kpi.totalReach.toLocaleString() : "—")}
          delta={kpi?.reachDelta ?? 0}
          icon={igLive ? MessageCircle : BarChart2}
          accent="bg-blue-500/20 text-blue-400"
          loading={loading}
        />
      </div>

      {/* ── Micro stats ── */}
      {!loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-zinc-500 mr-1">{igLive ? "All-time totals:" : "Period totals:"}</span>
          <MicroStat icon={Heart} label="Likes" value={igLive ? igLive.kpi.totalLikes : (kpi?.totalLikes ?? 0)} color="text-rose-400" />
          <MicroStat icon={MessageCircle} label="Comments" value={igLive ? igLive.kpi.totalComments : (kpi?.totalComments ?? 0)} color="text-blue-400" />
          <MicroStat icon={Repeat2} label="Avg Likes/Post" value={igLive ? igLive.kpi.avgLikesPerPost : (kpi?.totalShares ?? 0)} color="text-emerald-400" />
          <MicroStat icon={Bookmark} label="Posts" value={igLive ? igLive.kpi.totalPosts : (kpi?.totalSaves ?? 0)} color="text-violet-400" />
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Impressions & Reach — 2 cols */}
        <Card className="xl:col-span-2 border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Impressions & Reach</CardTitle>
                <CardDescription className="text-xs">Daily breakdown over the selected period</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-sm bg-blue-500" /> Impressions
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-sm bg-violet-500" /> Reach
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <ChartSkeleton /> : <ImpressionsChart data={daily} />}
          </CardContent>
        </Card>

        {/* Top posts — 1 col */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top Performing Posts</CardTitle>
            <CardDescription className="text-xs">{igLive ? "Ranked by real engagement from Instagram" : "Ranked by impressions this period"}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full bg-zinc-800/60 rounded-lg" />
                ))}
              </div>
            ) : (
              <TopPostsTable posts={topPosts} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom charts ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Engagement chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Engagement Breakdown</CardTitle>
            <CardDescription className="text-xs">Likes, comments, shares, and saves over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <ChartSkeleton height={320} /> : <EngagementChart data={daily} />}
          </CardContent>
        </Card>

        {/* Follower growth chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Follower Growth</CardTitle>
                <CardDescription className="text-xs">Daily follower trajectory and churn</CardDescription>
              </div>
              {kpi && !loading && (
                <Badge
                  variant="outline"
                  className="text-[10px] text-primary border-primary/30 bg-primary/10"
                >
                  +{kpi.followerGrowth.toLocaleString()} this period
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <ChartSkeleton height={320} /> : <FollowerChart data={followers} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
