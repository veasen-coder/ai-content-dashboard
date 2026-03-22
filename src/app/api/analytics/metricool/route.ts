import { NextRequest, NextResponse } from "next/server";

const METRICOOL_BASE = "https://app.metricool.com/api/v2";

async function metricoolFetch(path: string) {
  const res = await fetch(`${METRICOOL_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.METRICOOL_API_KEY}`,
      "X-User-Token": process.env.METRICOOL_USER_TOKEN ?? "",
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Metricool ${path} → ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? getDefaultFrom();
  const to = searchParams.get("to") ?? getDefaultTo();

  // If no API keys configured, return demo data
  if (!process.env.METRICOOL_API_KEY || !process.env.METRICOOL_USER_TOKEN) {
    return NextResponse.json(getDemoData(from, to));
  }

  try {
    const [daily, followers, kpi] = await Promise.all([
      metricoolFetch(`/stats/instagram?from=${from}&to=${to}`),
      metricoolFetch(`/stats/instagram/followers?from=${from}&to=${to}`),
      metricoolFetch(`/stats/instagram/kpi?from=${from}&to=${to}`),
    ]);

    return NextResponse.json({ daily, followers, kpi });
  } catch (err) {
    console.error("Metricool error:", err);
    // Fallback to demo data so the UI never breaks
    return NextResponse.json(getDemoData(from, to));
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getDefaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().split("T")[0];
}

function getDefaultTo() {
  return new Date().toISOString().split("T")[0];
}

function getDemoData(from: string, to: string) {
  const days = dateSeries(from, to);
  return {
    _demo: true,
    kpi: {
      total_impressions: 24830,
      avg_engagement_rate: 4.2,
      new_followers: 312,
      total_posts: 18,
      best_day: days[Math.floor(days.length * 0.6)],
    },
    daily: days.map((date, i) => ({
      date,
      impressions: 600 + Math.round(Math.sin(i * 0.4) * 300 + Math.random() * 200),
      reach: 500 + Math.round(Math.sin(i * 0.4) * 250 + Math.random() * 150),
      engagement: 20 + Math.round(Math.random() * 30),
      engagement_rate: +(2.5 + Math.random() * 4).toFixed(2),
      saves: Math.round(Math.random() * 15),
      shares: Math.round(Math.random() * 8),
    })),
    followers: days.map((date, i) => ({
      date,
      followers: 2800 + i * 10 + Math.round(Math.random() * 5),
      net_change: Math.round(Math.random() * 15) - 2,
    })),
    top_posts: [
      {
        id: "demo-1",
        caption: "How WhatsApp AI saved a local bakery 3 hours every day 🍞",
        impressions: 3420,
        engagement_rate: 7.8,
        platform: "instagram",
        published_at: days[days.length - 5],
        thumbnail_url: null,
      },
      {
        id: "demo-2",
        caption: "5 signs your business needs a WhatsApp AI Agent RIGHT NOW",
        impressions: 2910,
        engagement_rate: 6.4,
        platform: "instagram",
        published_at: days[days.length - 12],
        thumbnail_url: null,
      },
      {
        id: "demo-3",
        caption: "客户自动回复？让AI帮你搞定！ #AI #WhatsApp",
        impressions: 2105,
        engagement_rate: 5.9,
        platform: "xiaohongshu",
        published_at: days[days.length - 8],
        thumbnail_url: null,
      },
    ],
  };
}

function dateSeries(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from);
  const end = new Date(to);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
