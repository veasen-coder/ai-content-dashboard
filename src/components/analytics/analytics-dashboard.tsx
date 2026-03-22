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
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardDescription className="text-xs text-zinc-500">{label}</CardDescription>
        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${accent}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <Skeleton className="h-7 w-24 bg-zinc-800" />
        ) : (
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        )}
        <div className="flex items-center gap-1">
          {loading ? (
            <Skeleton className="h-3.5 w-16 bg-zinc-800" />
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
              <span className="text-xs text-zinc-600">vs prev. period</span>
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
    <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-sm font-semibold">{value.toLocaleString()}</span>
      <span className="text-[10px] text-zinc-500">{label}</span>
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

export function AnalyticsDashboard() {
  const [range, setRange] = useState<DateRange>(presetRange(30));
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KpiSummary | null>(null);
  const [daily, setDaily] = useState<DailyMetric[]>([]);
  const [followers, setFollowers] = useState<FollowerMetric[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 shadow-lg shadow-blue-900/20">
            <BarChart2 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Instagram performance · {days}-day window
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-[11px] border-zinc-700 text-zinc-400 gap-1.5"
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            Powered by Metricool
          </Badge>
          <Separator orientation="vertical" className="h-5" />
          <DateRangePicker value={range} onChange={(r) => { setRange(r); load(r); }} />
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs h-9"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total Impressions"
          value={kpi ? kpi.totalImpressions.toLocaleString() : "—"}
          delta={kpi?.impressionsDelta ?? 0}
          icon={Eye}
          accent="bg-blue-500/20 text-blue-400"
          loading={loading}
        />
        <KpiCard
          label="Engagement Rate"
          value={kpi ? `${kpi.engagementRate}%` : "—"}
          delta={kpi?.engagementDelta ?? 0}
          icon={TrendingUp}
          accent="bg-emerald-500/20 text-emerald-400"
          loading={loading}
        />
        <KpiCard
          label="Follower Growth"
          value={kpi ? `+${kpi.followerGrowth.toLocaleString()}` : "—"}
          delta={kpi?.followerDelta ?? 0}
          icon={Users}
          accent="bg-violet-500/20 text-violet-400"
          loading={loading}
        />
        <KpiCard
          label="Total Reach"
          value={kpi ? kpi.totalReach.toLocaleString() : "—"}
          delta={kpi?.reachDelta ?? 0}
          icon={BarChart2}
          accent="bg-pink-500/20 text-pink-400"
          loading={loading}
        />
      </div>

      {/* ── Micro stats ── */}
      {kpi && !loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-zinc-500 mr-1">Period totals:</span>
          <MicroStat icon={Heart} label="Likes" value={kpi.totalLikes} color="text-rose-400" />
          <MicroStat icon={MessageCircle} label="Comments" value={kpi.totalComments} color="text-blue-400" />
          <MicroStat icon={Repeat2} label="Shares" value={kpi.totalShares} color="text-emerald-400" />
          <MicroStat icon={Bookmark} label="Saves" value={kpi.totalSaves} color="text-violet-400" />
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Impressions & Reach — 2 cols */}
        <Card className="xl:col-span-2 border-zinc-800 bg-zinc-900/60">
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
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top Performing Posts</CardTitle>
            <CardDescription className="text-xs">Ranked by impressions this period</CardDescription>
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
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Engagement Breakdown</CardTitle>
            <CardDescription className="text-xs">Likes, comments, shares, and saves over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <ChartSkeleton height={320} /> : <EngagementChart data={daily} />}
          </CardContent>
        </Card>

        {/* Follower growth chart */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Follower Growth</CardTitle>
                <CardDescription className="text-xs">Daily follower trajectory and churn</CardDescription>
              </div>
              {kpi && !loading && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-800 text-emerald-400 bg-emerald-500/10"
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
