/**
 * Competitor data service.
 *
 * Architecture
 * ────────────
 * Each exported fn accepts a handle + platform and returns typed data.
 * Today they return deterministic mock data (seeded by handle string)
 * so the UI behaves consistently across refreshes.
 *
 * To wire up real sources, replace the body of each function:
 *
 *   Instagram public data  → unofficial scrapers / RapidAPI Instagram endpoints
 *   YouTube                → YouTube Data API v3  (youtube.googleapis.com)
 *   TikTok                 → TikTok Research API  (developers.tiktok.com)
 *   Twitter / X            → Twitter API v2       (api.twitter.com)
 *   LinkedIn               → LinkedIn API         (api.linkedin.com)  [limited public]
 *   Facebook               → Meta Graph API       (graph.facebook.com)
 *
 * All real calls should be server-side (Next.js Route Handlers) to
 * protect API keys — just proxy from /api/competitors/[id]/refresh.
 */

import { subWeeks, subDays, formatISO } from "date-fns";
import type { Competitor, CompetitorAccount, RecentPost, Platform } from "@/types/competitor";

// ── Seeded RNG ──────────────────────────────────────────────────────────────
function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
function sr(str: string, offset = 0) {
  return seed(str + String(offset));
}

// ── Account builder ─────────────────────────────────────────────────────────
function buildAccount(
  handle: string,
  platform: Platform,
  baseFollowers: number
): CompetitorAccount {
  const s = (n: number) => sr(handle + platform, n);

  const followers = Math.round(baseFollowers * (0.6 + s(0) * 0.8));
  const engRate = parseFloat((2 + s(1) * 10).toFixed(2));
  const postsPerWeek = parseFloat((1 + s(2) * 6).toFixed(1));
  const avgLikes = Math.round(followers * (engRate / 100) * 0.7);
  const avgComments = Math.round(avgLikes * (0.04 + s(3) * 0.08));
  const avgShares = Math.round(avgLikes * (0.02 + s(4) * 0.06));
  const avgSaves = Math.round(avgLikes * (0.05 + s(5) * 0.12));

  // 12-week follower history (growth trend)
  const followerHistory: number[] = [];
  let f = Math.round(followers * (0.7 + s(6) * 0.1));
  for (let i = 0; i < 12; i++) {
    const delta = Math.round(f * (sr(handle + platform + i, 7) * 0.04 - 0.005));
    f = Math.max(0, f + delta);
    followerHistory.push(f);
  }
  followerHistory.push(followers);

  // 12-week engagement history
  const engagementHistory: number[] = Array.from({ length: 12 }, (_, i) =>
    parseFloat((engRate * (0.75 + sr(handle + i, 9) * 0.5)).toFixed(2))
  );

  const lastPostedDaysAgo = Math.round(s(10) * 5);

  return {
    platform,
    handle: platform === "youtube" ? handle : `@${handle}`,
    profileUrl: `https://${platform}.com/${handle}`,
    followers,
    following: Math.round(s(11) * 2000),
    postCount: Math.round(50 + s(12) * 800),
    avgLikes,
    avgComments,
    avgShares,
    avgSaves,
    engagementRate: engRate,
    postsPerWeek,
    lastPostedAt: formatISO(subDays(new Date("2026-03-22"), lastPostedDaysAgo)),
    followerHistory,
    engagementHistory,
  };
}

// ── Post builder ────────────────────────────────────────────────────────────
const POST_TYPES: Record<Platform, string[]> = {
  instagram: ["Reel", "Carousel", "Feed Post", "Story"],
  youtube: ["Video", "Short", "Live"],
  tiktok: ["Video", "Duet", "Stitch"],
  twitter: ["Tweet", "Thread", "Poll"],
  linkedin: ["Article", "Post", "Poll"],
  facebook: ["Post", "Video", "Reel"],
};

const CAPTION_TEMPLATES = [
  "Breaking down exactly how we hit {n}k views in 7 days 🔥",
  "The strategy no one talks about (until now) 👀",
  "If you're still doing {n} things the old way, read this thread",
  "Sharing my full {n}-step content system — save this!",
  "We tested {n} content formats. Here's what actually worked.",
  "POV: you finally cracked the algorithm 💡",
  "Unpopular opinion: consistency > virality every time",
  "How I grew from {n}k to {n2}k in 90 days (no ads)",
  "The one metric most creators completely ignore 📊",
  "Content batching system walkthrough — full breakdown inside",
];

function buildPosts(handle: string, accounts: CompetitorAccount[]): RecentPost[] {
  const posts: RecentPost[] = [];
  let idx = 0;

  accounts.forEach((acc) => {
    const count = 4 + Math.round(sr(handle + acc.platform, 20) * 3);
    for (let i = 0; i < count; i++) {
      const s = (n: number) => sr(handle + acc.platform + i, n);
      const types = POST_TYPES[acc.platform];
      const type = types[Math.floor(s(0) * types.length)];
      const tpl = CAPTION_TEMPLATES[Math.floor(s(1) * CAPTION_TEMPLATES.length)];
      const n = Math.floor(s(2) * 90) + 10;
      const n2 = n + Math.floor(s(3) * 50);
      const caption = tpl.replace("{n}", String(n)).replace("{n2}", String(n2));
      const likes = Math.round(acc.avgLikes * (0.4 + s(4) * 1.6));
      const comments = Math.round(acc.avgComments * (0.4 + s(5) * 1.6));
      const shares = Math.round(acc.avgShares * (0.4 + s(6) * 1.6));
      const saves = Math.round(acc.avgSaves * (0.4 + s(7) * 1.6));
      const total = likes + comments + shares + saves;
      const engRate = acc.followers > 0
        ? parseFloat(((total / acc.followers) * 100).toFixed(2))
        : 0;

      posts.push({
        id: `${handle}-${acc.platform}-${i}`,
        platform: acc.platform,
        type,
        caption,
        postedAt: formatISO(subDays(new Date("2026-03-22"), Math.round(s(8) * 28))),
        likes,
        comments,
        shares,
        saves,
        engagementRate: engRate,
        coverHue: Math.round(s(9) * 360),
      });
      idx++;
    }
  });

  return posts.sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  );
}

// ── Competitor profiles ─────────────────────────────────────────────────────
interface CompetitorDef {
  id: string;
  name: string;
  handle: string;
  avatarHue: number;
  platforms: Platform[];
  baseFollowers: number;
}

export const DEFAULT_COMPETITORS: CompetitorDef[] = [
  { id: "c1", name: "GrowthLab Studio",  handle: "growthlabstudio",  avatarHue: 210, platforms: ["instagram","youtube","tiktok"],             baseFollowers: 85000 },
  { id: "c2", name: "The Content Co.",   handle: "thecontentco",    avatarHue: 340, platforms: ["instagram","twitter","linkedin"],             baseFollowers: 52000 },
  { id: "c3", name: "Creator Pulse",     handle: "creatorpulse",    avatarHue: 150, platforms: ["youtube","tiktok","instagram"],              baseFollowers: 210000 },
  { id: "c4", name: "BrandWave Agency",  handle: "brandwaveagency", avatarHue: 30,  platforms: ["instagram","facebook","linkedin"],            baseFollowers: 38000 },
  { id: "c5", name: "Vibe Social",       handle: "vibesocial",      avatarHue: 280, platforms: ["tiktok","instagram","twitter"],               baseFollowers: 125000 },
];

export function buildCompetitor(def: CompetitorDef): Competitor {
  const accounts = def.platforms.map((p) => buildAccount(def.handle, p, def.baseFollowers));

  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
  const avgEngagementRate = parseFloat(
    (accounts.reduce((s, a) => s + a.engagementRate, 0) / accounts.length).toFixed(2)
  );
  const topPlatform = accounts.reduce((best, a) =>
    a.followers > best.followers ? a : best
  ).platform;

  return {
    id: def.id,
    name: def.name,
    avatarHue: def.avatarHue,
    addedAt: formatISO(subDays(new Date("2026-03-22"), Math.round(seed(def.id) * 60))),
    accounts,
    recentPosts: buildPosts(def.handle, accounts),
    totalFollowers,
    avgEngagementRate,
    topPlatform,
  };
}

export function buildCompetitorFromHandle(
  handle: string,
  name: string,
  platforms: Platform[]
): Competitor {
  const def: CompetitorDef = {
    id: `custom-${handle}`,
    name,
    handle: handle.replace(/^@/, ""),
    avatarHue: Math.round(seed(handle) * 360),
    platforms,
    baseFollowers: 10000 + Math.round(seed(handle) * 200000),
  };
  return buildCompetitor(def);
}

// Follower growth % over tracked period (last vs first snapshot)
export function followerGrowthPct(account: CompetitorAccount): number {
  const h = account.followerHistory;
  if (h.length < 2) return 0;
  const first = h[0];
  const last = h[h.length - 1];
  if (first === 0) return 0;
  return parseFloat((((last - first) / first) * 100).toFixed(1));
}

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
