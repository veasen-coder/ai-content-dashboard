/**
 * Metricool API integration layer.
 *
 * Live usage:
 *   1. Set METRICOOL_API_KEY and METRICOOL_USER_TOKEN in .env.local
 *   2. Replace the mock generators below with real fetch() calls.
 *
 * Metricool REST API base: https://app.metricool.com/api/v2
 * Docs: https://app.metricool.com/api/v2/swagger
 *
 * All exported functions return the same shape whether they use
 * live data or mock data, so switching is a one-line change per fn.
 */

import { addDays, format, subDays } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
}

// ─── Metric shapes ────────────────────────────────────────────────────────────

export interface DailyMetric {
  date: string; // "YYYY-MM-DD"
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface FollowerMetric {
  date: string;
  followers: number;
  gained: number;
  lost: number;
}

export interface KpiSummary {
  totalImpressions: number;
  impressionsDelta: number; // percentage vs previous period
  engagementRate: number;
  engagementDelta: number;
  followerGrowth: number;
  followerDelta: number;
  totalReach: number;
  reachDelta: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
}

export interface TopPost {
  id: string;
  type: "feed" | "reel" | "story" | "carousel";
  caption: string;
  publishedAt: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  coverHue: number;
}

// ─── Mock data generators ─────────────────────────────────────────────────────

function seededRand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function makeDailyMetrics(range: DateRange): DailyMetric[] {
  const days: DailyMetric[] = [];
  let current = new Date(range.from);
  let i = 0;
  while (current <= range.to) {
    const r = seededRand(i + current.getDate() * 3);
    const r2 = seededRand(i + 7);
    days.push({
      date: format(current, "yyyy-MM-dd"),
      impressions: Math.round(2400 + r * 4200 + Math.sin(i * 0.4) * 800),
      reach: Math.round(1800 + r * 3000 + Math.sin(i * 0.4) * 600),
      likes: Math.round(120 + r * 380),
      comments: Math.round(15 + r2 * 60),
      shares: Math.round(8 + r2 * 40),
      saves: Math.round(30 + r * 120),
    });
    current = addDays(current, 1);
    i++;
  }
  return days;
}

function makeFollowerMetrics(range: DateRange): FollowerMetric[] {
  const days: FollowerMetric[] = [];
  let current = new Date(range.from);
  let followers = 12480;
  let i = 0;
  while (current <= range.to) {
    const r = seededRand(i + 13);
    const gained = Math.round(30 + r * 80);
    const lost = Math.round(5 + seededRand(i + 99) * 20);
    followers += gained - lost;
    days.push({
      date: format(current, "yyyy-MM-dd"),
      followers,
      gained,
      lost,
    });
    current = addDays(current, 1);
    i++;
  }
  return days;
}

function makeKpiSummary(metrics: DailyMetric[], followers: FollowerMetric[]): KpiSummary {
  const totalImpressions = metrics.reduce((s, d) => s + d.impressions, 0);
  const totalReach = metrics.reduce((s, d) => s + d.reach, 0);
  const totalLikes = metrics.reduce((s, d) => s + d.likes, 0);
  const totalComments = metrics.reduce((s, d) => s + d.comments, 0);
  const totalShares = metrics.reduce((s, d) => s + d.shares, 0);
  const totalSaves = metrics.reduce((s, d) => s + d.saves, 0);
  const totalEngagement = totalLikes + totalComments + totalShares + totalSaves;
  const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

  const followerGrowth =
    followers.length > 1
      ? followers[followers.length - 1].followers - followers[0].followers
      : 0;

  return {
    totalImpressions,
    impressionsDelta: 12.4,
    engagementRate: parseFloat(engagementRate.toFixed(2)),
    engagementDelta: 3.1,
    followerGrowth,
    followerDelta: 8.7,
    totalReach,
    reachDelta: -2.3,
    totalLikes,
    totalComments,
    totalShares,
    totalSaves,
  };
}

const TOP_POSTS_SEED: TopPost[] = [
  {
    id: "tp1",
    type: "reel",
    caption: "How a local F&B owner in KL saved 3 hours daily using WhatsApp AI 🍜 — real case study from our client.",
    publishedAt: "2026-03-12T08:00:00",
    impressions: 48200,
    likes: 2140,
    comments: 318,
    shares: 890,
    saves: 1240,
    engagementRate: 9.5,
    coverHue: 140,
  },
  {
    id: "tp2",
    type: "carousel",
    caption: "5 signs your business NEEDS a WhatsApp AI Agent right now 🚨 Swipe to see if you qualify.",
    publishedAt: "2026-03-08T10:00:00",
    impressions: 31500,
    likes: 1860,
    comments: 204,
    shares: 440,
    saves: 980,
    engagementRate: 11.1,
    coverHue: 100,
  },
  {
    id: "tp3",
    type: "feed",
    caption: "Case study: We reduced customer support workload by 70% for a Malaysian e-commerce brand in 30 days. 📉",
    publishedAt: "2026-03-15T12:00:00",
    impressions: 22800,
    likes: 1120,
    comments: 87,
    shares: 260,
    saves: 510,
    engagementRate: 8.7,
    coverHue: 130,
  },
  {
    id: "tp4",
    type: "reel",
    caption: "Chatbot vs AI Agent — what's the difference and why it matters for your WhatsApp strategy",
    publishedAt: "2026-03-10T09:00:00",
    impressions: 19600,
    likes: 940,
    comments: 142,
    shares: 310,
    saves: 670,
    engagementRate: 10.5,
    coverHue: 160,
  },
  {
    id: "tp5",
    type: "feed",
    caption: "3 WhatsApp AI reply scripts every Malaysian business should be using right now 📋",
    publishedAt: "2026-03-05T11:00:00",
    impressions: 14300,
    likes: 720,
    comments: 95,
    shares: 180,
    saves: 390,
    engagementRate: 9.7,
    coverHue: 80,
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch daily engagement/impression metrics for a date range.
 * Swap the mock for a real Metricool call:
 *   GET /api/v2/stats/instagram?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function fetchDailyMetrics(range: DateRange): Promise<DailyMetric[]> {
  // TODO: replace with live fetch when METRICOOL_API_KEY is configured
  // const res = await fetch(
  //   `https://app.metricool.com/api/v2/stats/instagram` +
  //   `?from=${format(range.from, 'yyyy-MM-dd')}&to=${format(range.to, 'yyyy-MM-dd')}`,
  //   { headers: { Authorization: `Bearer ${process.env.METRICOOL_API_KEY}` } }
  // );
  // const data = await res.json();
  // return data.data;

  return makeDailyMetrics(range);
}

/**
 * Fetch follower timeline for a date range.
 */
export async function fetchFollowerMetrics(range: DateRange): Promise<FollowerMetric[]> {
  return makeFollowerMetrics(range);
}

/**
 * Compute KPI summary from fetched metrics.
 */
export async function fetchKpiSummary(range: DateRange): Promise<KpiSummary> {
  const [metrics, followers] = await Promise.all([
    fetchDailyMetrics(range),
    fetchFollowerMetrics(range),
  ]);
  return makeKpiSummary(metrics, followers);
}

/**
 * Fetch top performing posts for the period.
 */
export async function fetchTopPosts(_range: DateRange): Promise<TopPost[]> {
  return TOP_POSTS_SEED;
}

/**
 * Default date range presets.
 */
export const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;

export function presetRange(days: number): DateRange {
  const to = new Date();
  const from = subDays(to, days - 1);
  return { from, to };
}
