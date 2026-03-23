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
  instagram:   ["Reel", "Carousel", "Feed Post", "Story"],
  youtube:     ["Video", "Short", "Live"],
  tiktok:      ["Video", "Duet", "Stitch"],
  twitter:     ["Tweet", "Thread", "Poll"],
  linkedin:    ["Article", "Post", "Poll"],
  facebook:    ["Post", "Video", "Reel"],
  xiaohongshu: ["Post", "Carousel", "Video"],
};

const CAPTION_TEMPLATES = [
  "Your customers are messaging you right now. Are you responding fast enough? 📲",
  "{n}% of WhatsApp leads go cold within 1 hour. Here's how to fix it.",
  "We automated {n}00 customer replies in one week — here's how 🤖",
  "Stop hiring customer service staff. Do this instead 👇",
  "The WhatsApp AI setup that saved our client {n} hours a week ⏱️",
  "POV: your WhatsApp replies itself at 2am 💡",
  "Chatbot vs AI Agent — the difference no one talks about",
  "How a {n}-person SME handles {n2}+ daily enquiries without extra staff",
  "The #1 reason Malaysian businesses lose WhatsApp leads 📊",
  "We built a WhatsApp AI for a KL clinic — here's what happened in 30 days",
  "Your competitor is already using AI. Are you? 🇲🇾",
  "3 WhatsApp automation flows every SME should have right now",
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
  /** Context passed to AI estimator for accurate mock data */
  description: string;
}

export const DEFAULT_COMPETITORS: CompetitorDef[] = [
  {
    id: "c1",
    name: "Mampu.ai",
    handle: "mampu.ai",
    avatarHue: 160,
    platforms: ["instagram", "xiaohongshu"],
    baseFollowers: 1200,
    description: "Malaysian AI automation startup targeting SMEs. Early-stage, KL-based. Posts in BM and English. Focuses on WhatsApp & business automation for local SMEs.",
  },
  {
    id: "c2",
    name: "ChatsHero",
    handle: "chatshero",
    avatarHue: 200,
    platforms: ["instagram", "facebook"],
    baseFollowers: 4500,
    description: "WhatsApp automation platform focused on Malaysian market. Offers chatbot builder and broadcast tools. Posts product demos and SME use cases.",
  },
  {
    id: "c3",
    name: "Wati",
    handle: "wati.io",
    avatarHue: 45,
    platforms: ["instagram", "linkedin"],
    baseFollowers: 22000,
    description: "Global WhatsApp Business API provider (YC-backed). Enterprise-grade platform. Posts case studies, product updates, and WhatsApp marketing tips. Large international following.",
  },
  {
    id: "c4",
    name: "Respond.io",
    handle: "respond.io",
    avatarHue: 260,
    platforms: ["instagram", "linkedin"],
    baseFollowers: 18000,
    description: "Omnichannel messaging automation platform (WhatsApp, IG, FB Messenger). Regional Southeast Asia focus. Posts messaging strategy content and platform comparisons.",
  },
  {
    id: "c5",
    name: "AiSensy",
    handle: "aisensy",
    avatarHue: 20,
    platforms: ["instagram", "linkedin"],
    baseFollowers: 14000,
    description: "WhatsApp marketing & AI platform from India. Strong in e-commerce and D2C brands. Posts WhatsApp automation tips, campaign results, and feature launches.",
  },
  {
    id: "c6",
    name: "Supamoto MY",
    handle: "supamoto.my",
    avatarHue: 340,
    platforms: ["instagram", "facebook"],
    baseFollowers: 600,
    description: "Local Malaysian automation agency. Very small, early-stage. Posts automation and business productivity tips for local SME audience in BM and English.",
  },
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
    description: `Custom competitor: ${name} on ${platforms.join(", ")}`,
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
