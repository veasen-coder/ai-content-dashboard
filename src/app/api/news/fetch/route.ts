import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { upsertArticles, getNewsFeeds } from "@/lib/supabase/queries";

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "Flogen AI Content OS / 1.0" },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { feedId } = body as { feedId?: string };

    // Get active feeds from Supabase (or fallback to defaults)
    let feeds = await getNewsFeeds();

    // If Supabase isn't configured yet, use hardcoded defaults
    if (!feeds.length) {
      feeds = [
        {
          id: "default-1",
          name: "TechCrunch AI",
          url: "https://techcrunch.com/category/artificial-intelligence/feed/",
          category: "technology",
          is_active: true,
          last_fetched_at: null,
          created_at: new Date().toISOString(),
        },
        {
          id: "default-2",
          name: "Marketing In Asia",
          url: "https://www.marketinginasia.com/feed/",
          category: "marketing",
          is_active: true,
          last_fetched_at: null,
          created_at: new Date().toISOString(),
        },
        {
          id: "default-3",
          name: "The Rakyat Post Business",
          url: "https://www.therakyatpost.com/category/business/feed/",
          category: "business",
          is_active: true,
          last_fetched_at: null,
          created_at: new Date().toISOString(),
        },
      ];
    }

    if (feedId) {
      feeds = feeds.filter((f) => f.id === feedId);
    }

    const allArticles: {
      feed_id: string;
      title: string;
      summary: string | null;
      url: string;
      image_url: string | null;
      published_at: string | null;
    }[] = [];

    await Promise.allSettled(
      feeds.map(async (feed) => {
        try {
          const rss = await parser.parseURL(feed.url);
          const articles = (rss.items ?? []).slice(0, 10).map((item) => ({
            feed_id: feed.id,
            title: item.title ?? "Untitled",
            summary: item.contentSnippet ?? item.summary ?? null,
            url: item.link ?? item.guid ?? "",
            image_url:
              item.enclosure?.url ||
              (item["media:content"] as { $?: { url?: string } } | undefined)?.$?.url ||
              null,
            published_at: item.isoDate ?? item.pubDate ?? null,
          }));
          allArticles.push(...articles.filter((a) => a.url));
        } catch (err) {
          console.warn(`Failed to fetch feed ${feed.name}:`, err);
        }
      })
    );

    // Persist to Supabase (deduplicates by URL)
    if (allArticles.length > 0) {
      await upsertArticles(allArticles);
    }

    return NextResponse.json({
      success: true,
      fetched: allArticles.length,
      articles: allArticles,
    });
  } catch (err) {
    console.error("news/fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
