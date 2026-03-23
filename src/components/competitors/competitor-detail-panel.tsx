"use client";

import { format } from "date-fns";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Bookmark, ExternalLink, Film, Grid2x2, Heart,
  ImageIcon, MessageCircle, Repeat2, Tv2, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PLATFORM_META } from "@/types/calendar";
import { PlatformIcon } from "@/components/calendar/platform-icons";
import { Sparkline } from "./sparkline";
import type { Competitor, CompetitorAccount, RecentPost } from "@/types/competitor";
import { followerGrowthPct, formatFollowers } from "@/lib/competitor-service";

// ── Tooltip ─────────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 px-2.5 py-2 text-[11px] shadow-xl space-y-1">
      <p className="text-zinc-400">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.fill ?? p.stroke }} />
          <span className="text-zinc-300">{p.name}:</span>
          <span className="font-semibold text-white">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Per-account card ─────────────────────────────────────────────────────────
function AccountCard({ account }: { account: CompetitorAccount }) {
  const pm = PLATFORM_META[account.platform];
  const growth = followerGrowthPct(account);
  const positive = growth >= 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${pm.bg} border ${pm.border}`}>
            <PlatformIcon platform={account.platform} className={`h-4 w-4 ${pm.color}`} />
          </div>
          <div>
            <p className={`text-sm font-medium ${pm.color}`}>{account.handle}</p>
            <p className="text-[11px] text-zinc-500">{pm.label}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
          render={<a href={account.profileUrl} target="_blank" rel="noopener noreferrer" />}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Followers", value: formatFollowers(account.followers) },
          { label: "Eng. Rate", value: `${account.engagementRate}%` },
          { label: "Posts/wk", value: account.postsPerWeek },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-zinc-800/50 px-2 py-2">
            <p className="text-sm font-bold">{s.value}</p>
            <p className="text-[10px] text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500">Follower growth (12 weeks)</span>
          <span className={positive ? "text-emerald-400" : "text-red-400"}>
            {positive ? "+" : ""}{growth}%
          </span>
        </div>
        <Sparkline data={account.followerHistory} color="auto" height={40} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Heart className="h-3 w-3 text-rose-400" />
          Avg {account.avgLikes.toLocaleString()} likes
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <MessageCircle className="h-3 w-3 text-blue-400" />
          Avg {account.avgComments.toLocaleString()} comments
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Repeat2 className="h-3 w-3 text-emerald-400" />
          Avg {account.avgShares.toLocaleString()} shares
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Bookmark className="h-3 w-3 text-violet-400" />
          Avg {account.avgSaves.toLocaleString()} saves
        </div>
      </div>
    </div>
  );
}

// ── Post card ────────────────────────────────────────────────────────────────
function PostCard({ post }: { post: RecentPost }) {
  const pm = PLATFORM_META[post.platform];
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 hover:border-zinc-700 transition-colors">
      <div
        className="h-12 w-12 shrink-0 rounded-lg flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, hsl(${post.coverHue},45%,14%), hsl(${(post.coverHue + 40) % 360},45%,20%))`,
        }}
      >
        <PlatformIcon platform={post.platform} className={`h-5 w-5 ${pm.color} opacity-60`} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pm.bg} ${pm.border} ${pm.color}`}>
            {pm.label}
          </Badge>
          <span className="text-[10px] text-zinc-500 capitalize">{post.type}</span>
          <span className="text-[10px] text-zinc-600 ml-auto">
            {format(new Date(post.postedAt), "MMM d")}
          </span>
        </div>
        <p className="text-xs text-zinc-300 line-clamp-2">{post.caption}</p>
        <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-0.5">
          <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-rose-400" />{post.likes.toLocaleString()}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-blue-400" />{post.comments.toLocaleString()}</span>
          <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3 text-emerald-400" />{post.shares.toLocaleString()}</span>
          <span className="ml-auto font-medium text-emerald-400">{post.engagementRate}% eng.</span>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────
interface CompetitorDetailPanelProps {
  competitor: Competitor;
  onClose: () => void;
}

export function CompetitorDetailPanel({ competitor, onClose }: CompetitorDetailPanelProps) {
  const initials = competitor.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Per-platform bar chart data
  const platformData = competitor.accounts.map((a) => ({
    platform: PLATFORM_META[a.platform].label,
    followers: a.followers,
    engagement: a.engagementRate,
  }));

  // Engagement over 12 weeks (average across accounts)
  const weekCount = competitor.accounts[0]?.engagementHistory.length ?? 12;
  const engLineData = Array.from({ length: weekCount }, (_, i) => ({
    week: `W${i + 1}`,
    eng: parseFloat(
      (competitor.accounts.reduce((s, a) => s + (a.engagementHistory[i] ?? 0), 0) / competitor.accounts.length).toFixed(2)
    ),
  }));

  return (
    <div className="flex h-full flex-col border-l border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: `linear-gradient(135deg, hsl(${competitor.avatarHue},60%,40%), hsl(${(competitor.avatarHue + 40) % 360},60%,30%))` }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{competitor.name}</p>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-400 bg-amber-500/10 shrink-0">
              AI Estimated
            </Badge>
          </div>
          <p className="text-[11px] text-zinc-500">
            {competitor.accounts.length} platform{competitor.accounts.length !== 1 ? "s" : ""} · Added{" "}
            {format(new Date(competitor.addedAt), "MMM d, yyyy")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:text-zinc-300 shrink-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-5">
          <Tabs defaultValue="overview">
            <TabsList className="bg-zinc-900 border border-zinc-800 h-8 p-0.5 gap-0.5 w-full">
              {["overview", "accounts", "posts"].map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="flex-1 h-7 text-xs capitalize data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Overview tab ── */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Followers", value: formatFollowers(competitor.totalFollowers) },
                  { label: "Avg Eng. Rate", value: `${competitor.avgEngagementRate}%` },
                  { label: "Platforms Tracked", value: competitor.accounts.length },
                  {
                    label: "Top Platform",
                    value: PLATFORM_META[competitor.topPlatform].label,
                  },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
                    <p className="text-base font-bold">{s.value}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Followers by platform */}
              <div>
                <p className="text-xs text-zinc-400 font-medium mb-2">Followers by platform</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={platformData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="platform" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="followers" name="Followers" fill="url(#barGrad)" radius={[3, 3, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Engagement trend */}
              <div>
                <p className="text-xs text-zinc-400 font-medium mb-2">Engagement rate trend (12 weeks)</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={engLineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<ChartTip />} cursor={{ stroke: "#3f3f46", strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="eng" name="Eng. Rate" stroke="#8b5cf6" strokeWidth={2}
                      dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            {/* ── Accounts tab ── */}
            <TabsContent value="accounts" className="space-y-3 mt-4">
              {competitor.accounts.map((acc) => (
                <AccountCard key={acc.platform} account={acc} />
              ))}
            </TabsContent>

            {/* ── Posts tab ── */}
            <TabsContent value="posts" className="space-y-2.5 mt-4">
              <p className="text-[11px] text-zinc-500">
                {competitor.recentPosts.length} recent posts across all platforms
              </p>
              {competitor.recentPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
