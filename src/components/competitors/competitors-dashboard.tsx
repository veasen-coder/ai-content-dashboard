"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpDown, ArrowUp, ArrowDown,
  ChevronRight, Plus, RefreshCw, Search,
  Trash2, TrendingUp, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORM_META } from "@/types/calendar";
import { PlatformIcon } from "@/components/calendar/platform-icons";
import {
  DEFAULT_COMPETITORS,
  buildCompetitor,
  buildCompetitorFromHandle,
  followerGrowthPct,
  formatFollowers,
} from "@/lib/competitor-service";
import { AddCompetitorDialog } from "./add-competitor-dialog";
import { CompetitorDetailPanel } from "./competitor-detail-panel";
import { Sparkline } from "./sparkline";
import type { Competitor, Platform, SortDir, SortKey } from "@/types/competitor";

// ── Bootstrap seed data ──────────────────────────────────────────────────────
const SEED: Competitor[] = DEFAULT_COMPETITORS.map(buildCompetitor);

// ── Sort icon helper ─────────────────────────────────────────────────────────
function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 text-zinc-600" />;
  return dir === "asc"
    ? <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
    : <ArrowDown className="h-3.5 w-3.5 text-emerald-400" />;
}

// ── Column header button ─────────────────────────────────────────────────────
function ColHeader({
  label, sortKey, current, dir, onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {label}
      <SortIcon col={sortKey} active={current === sortKey} dir={dir} />
    </button>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export function CompetitorsDashboard() {
  const [competitors, setCompetitors] = useState<Competitor[]>(SEED);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("totalFollowers");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const selectedCompetitor = competitors.find((c) => c.id === selectedId) ?? null;

  // ── Sort + filter ──
  const filtered = useMemo(() => {
    let list = competitors.filter((c) => {
      const matchQuery =
        !query ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.accounts.some((a) => a.handle.toLowerCase().includes(query.toLowerCase()));
      const matchPlatform =
        platformFilter === "all" || c.accounts.some((a) => a.platform === platformFilter);
      return matchQuery && matchPlatform;
    });

    list = [...list].sort((a, b) => {
      let av = 0, bv = 0;
      switch (sortKey) {
        case "name":
          return sortDir === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case "totalFollowers":
          av = a.totalFollowers; bv = b.totalFollowers; break;
        case "avgEngagementRate":
          av = a.avgEngagementRate; bv = b.avgEngagementRate; break;
        case "postsPerWeek":
          av = a.accounts.reduce((s, acc) => s + acc.postsPerWeek, 0) / a.accounts.length;
          bv = b.accounts.reduce((s, acc) => s + acc.postsPerWeek, 0) / b.accounts.length;
          break;
        case "followerGrowth":
          av = a.accounts.reduce((s, acc) => s + followerGrowthPct(acc), 0) / a.accounts.length;
          bv = b.accounts.reduce((s, acc) => s + followerGrowthPct(acc), 0) / b.accounts.length;
          break;
        case "lastPosted":
          av = Math.max(...a.accounts.map((acc) => new Date(acc.lastPostedAt).getTime()));
          bv = Math.max(...b.accounts.map((acc) => new Date(acc.lastPostedAt).getTime()));
          break;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });

    return list;
  }, [competitors, query, platformFilter, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  async function handleRefresh(id: string) {
    setRefreshing(id);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(null);
  }

  function handleDelete(id: string) {
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleAdd(handle: string, name: string, platforms: Platform[]) {
    const c = buildCompetitorFromHandle(handle, name, platforms);
    setCompetitors((prev) => [c, ...prev]);
    setSelectedId(c.id);
  }

  // ── Aggregated KPIs ──
  const avgFollowers = competitors.length
    ? Math.round(competitors.reduce((s, c) => s + c.totalFollowers, 0) / competitors.length)
    : 0;
  const avgEngagement = competitors.length
    ? parseFloat((competitors.reduce((s, c) => s + c.avgEngagementRate, 0) / competitors.length).toFixed(2))
    : 0;
  const totalPlatforms = new Set(competitors.flatMap((c) => c.accounts.map((a) => a.platform))).size;

  return (
    <div className="flex h-full gap-0">
      {/* ── Left: table pane ── */}
      <div className={`flex flex-col gap-5 min-w-0 transition-all duration-300 ${selectedId ? "w-0 overflow-hidden lg:w-auto lg:overflow-visible lg:flex-1" : "flex-1"}`}>
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">Competitor Tracker</h1>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">
                  AI Estimated
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {competitors.length} WhatsApp AI competitors · {totalPlatforms} platforms monitored
              </p>
            </div>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0 h-9"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Competitor
          </Button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Competitors tracked", value: competitors.length, color: "text-zinc-200" },
            { label: "Avg. total followers", value: formatFollowers(avgFollowers), color: "text-emerald-400" },
            { label: "Avg. engagement rate", value: `${avgEngagement}%`, color: "text-violet-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + platform filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              placeholder="Search competitors…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-8 bg-zinc-900 border-zinc-800 text-sm"
            />
          </div>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setPlatformFilter("all")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all
                ${platformFilter === "all" ? "bg-zinc-700 border-zinc-600 text-white" : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"}`}
            >
              All
            </button>
            {(Object.keys(PLATFORM_META) as Platform[]).map((p) => {
              const pm = PLATFORM_META[p];
              const active = platformFilter === p;
              return (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all
                    ${active ? `${pm.bg} ${pm.border} ${pm.color}` : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"}`}
                >
                  <PlatformIcon platform={p} className="h-3 w-3" />
                  {pm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-0 border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5">
            <ColHeader label="Competitor"    sortKey="name"              current={sortKey} dir={sortDir} onSort={handleSort} />
            <ColHeader label="Followers"     sortKey="totalFollowers"    current={sortKey} dir={sortDir} onSort={handleSort} />
            <ColHeader label="Eng. Rate"     sortKey="avgEngagementRate" current={sortKey} dir={sortDir} onSort={handleSort} />
            <ColHeader label="Posts/Wk"      sortKey="postsPerWeek"      current={sortKey} dir={sortDir} onSort={handleSort} />
            <ColHeader label="Growth (12w)"  sortKey="followerGrowth"    current={sortKey} dir={sortDir} onSort={handleSort} />
            <ColHeader label="Last Post"     sortKey="lastPosted"        current={sortKey} dir={sortDir} onSort={handleSort} />
            <div className="w-16" />
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center bg-zinc-900/30">
              <Users className="h-10 w-10 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                {competitors.length === 0 ? "No competitors tracked yet." : "No results match your filters."}
              </p>
              {competitors.length === 0 && (
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add first competitor
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {filtered.map((c) => {
                const isRefreshing = refreshing === c.id;
                const isSelected = selectedId === c.id;
                const avgGrowth = parseFloat(
                  (c.accounts.reduce((s, a) => s + followerGrowthPct(a), 0) / c.accounts.length).toFixed(1)
                );
                const avgPostsPerWeek = parseFloat(
                  (c.accounts.reduce((s, a) => s + a.postsPerWeek, 0) / c.accounts.length).toFixed(1)
                );
                const lastPosted = c.accounts.reduce((latest, a) => {
                  const t = new Date(a.lastPostedAt).getTime();
                  return t > latest ? t : latest;
                }, 0);
                // Use first account's follower history for sparkline
                const sparkData = c.accounts[0]?.followerHistory ?? [];
                const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(isSelected ? null : c.id)}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-0 items-center px-4 py-3 cursor-pointer transition-colors group
                      ${isSelected ? "bg-emerald-500/5 border-l-2 border-l-emerald-500/50" : "hover:bg-zinc-800/40 border-l-2 border-l-transparent"}`}
                  >
                    {/* Competitor name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: `linear-gradient(135deg, hsl(${c.avatarHue},55%,38%), hsl(${(c.avatarHue + 40) % 360},55%,28%))` }}
                      >
                        {isRefreshing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {c.accounts.map((a) => {
                            const pm = PLATFORM_META[a.platform];
                            return (
                              <span key={a.platform} title={pm.label}>
                                <PlatformIcon platform={a.platform} className={`h-3 w-3 ${pm.color}`} />
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Total followers */}
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold tabular-nums">{formatFollowers(c.totalFollowers)}</span>
                      <span className="text-[10px] text-zinc-500">across {c.accounts.length} platform{c.accounts.length !== 1 ? "s" : ""}</span>
                    </div>

                    {/* Engagement */}
                    <div className="flex flex-col">
                      <span className={`text-sm font-semibold tabular-nums ${c.avgEngagementRate >= 5 ? "text-emerald-400" : c.avgEngagementRate >= 2 ? "text-amber-400" : "text-zinc-300"}`}>
                        {c.avgEngagementRate}%
                      </span>
                      <span className="text-[10px] text-zinc-500">avg rate</span>
                    </div>

                    {/* Posts/week */}
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold tabular-nums">{avgPostsPerWeek}</span>
                      <span className="text-[10px] text-zinc-500">per week</span>
                    </div>

                    {/* Growth sparkline */}
                    <div className="flex flex-col gap-1 w-[90px]">
                      <span className={`text-xs font-semibold tabular-nums ${avgGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {avgGrowth >= 0 ? "+" : ""}{avgGrowth}%
                      </span>
                      <div className="w-full">
                        <Sparkline data={sparkData} color="auto" height={28} />
                      </div>
                    </div>

                    {/* Last posted */}
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-300">
                        {lastPosted ? formatDistanceToNow(new Date(lastPosted), { addSuffix: true }) : "—"}
                      </span>
                      <span className="text-[10px] text-zinc-600">last post</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-16 justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-zinc-500 hover:text-zinc-200"
                        onClick={() => handleRefresh(c.id)}
                        title="Refresh data"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-zinc-500 hover:text-red-400"
                        onClick={() => handleDelete(c.id)}
                        title="Remove competitor"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-[11px] text-zinc-600 text-right">
            Showing {filtered.length} of {competitors.length} competitors
          </p>
        )}
      </div>

      {/* ── Right: detail panel ── */}
      {selectedCompetitor && (
        <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 -mr-6 -my-6 h-[calc(100vh-56px)] sticky top-14 overflow-hidden">
          <CompetitorDetailPanel
            competitor={selectedCompetitor}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}

      <AddCompetitorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAdd}
      />
    </div>
  );
}
