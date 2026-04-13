import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export async function GET() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!accessToken || !pageId) {
    return NextResponse.json(
      { error: "Facebook/Instagram not configured. Set FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID." },
      { status: 503 }
    );
  }

  try {
    // Step 1: Get IG Business Account ID from the page
    const igRes = await fetch(
      `${GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
    );
    const igData = await igRes.json();

    if (igData.error) {
      return NextResponse.json(
        { error: igData.error.message || "Failed to fetch page data" },
        { status: 400 }
      );
    }

    const igId = igData.instagram_business_account?.id;
    if (!igId) {
      return NextResponse.json(
        { error: "No Instagram Business Account linked to this page" },
        { status: 404 }
      );
    }

    // Step 2: Fetch IG profile
    const profileRes = await fetch(
      `${GRAPH_BASE}/${igId}?fields=id,username,followers_count,media_count,profile_picture_url,biography&access_token=${accessToken}`
    );
    const profile = await profileRes.json();

    if (profile.error) {
      return NextResponse.json(
        { error: profile.error.message || "Failed to fetch Instagram profile" },
        { status: profileRes.status }
      );
    }

    // Step 3: Fetch recent media
    let media: unknown[] = [];
    try {
      const mediaRes = await fetch(
        `${GRAPH_BASE}/${igId}/media?fields=id,caption,like_count,comments_count,timestamp,media_url,media_type,permalink,thumbnail_url&limit=6&access_token=${accessToken}`
      );
      const mediaData = await mediaRes.json();
      if (mediaRes.ok) {
        media = mediaData.data || [];
      }
    } catch {
      // Gracefully handle media fetch failure
    }

    // Step 4: Try to get insights
    let insights = null;
    try {
      const insightsRes = await fetch(
        `${GRAPH_BASE}/${igId}/insights?metric=reach,impressions,profile_views&period=day&since=${Math.floor(Date.now() / 1000) - 7 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${accessToken}`
      );
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        insights = insightsData.data || null;
      }
    } catch {
      // Insights may not be available
    }

    return NextResponse.json({ profile, media, insights });
  } catch (err) {
    console.error("[Instagram] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to connect to Instagram API", detail: String(err) },
      { status: 500 }
    );
  }
}
