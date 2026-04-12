import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!accessToken || !pageId) {
    return NextResponse.json(
      { error: "Facebook/Instagram not configured" },
      { status: 503 }
    );
  }

  try {
    // Step 1: Get page access token
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();
    const page = pagesData.data?.find(
      (p: { id: string }) => p.id === pageId
    );

    if (!page) {
      return NextResponse.json(
        { error: "Facebook page not found" },
        { status: 404 }
      );
    }

    const pageToken = page.access_token;

    // Step 2: Get IG Business Account ID (use env or discover from page)
    let igId = igAccountId;
    if (!igId) {
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
      );
      const igData = await igRes.json();
      igId = igData.instagram_business_account?.id;
    }

    if (!igId) {
      return NextResponse.json(
        { error: "No Instagram Business Account linked to this page" },
        { status: 404 }
      );
    }

    // Step 3: Fetch IG profile
    const profileRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?fields=id,username,followers_count,media_count,profile_picture_url,biography&access_token=${pageToken}`
    );

    if (!profileRes.ok) {
      const err = await profileRes.text();
      return NextResponse.json(
        { error: "Failed to fetch Instagram profile", detail: err },
        { status: profileRes.status }
      );
    }

    const profile = await profileRes.json();

    // Step 4: Fetch recent media
    let media: unknown[] = [];
    try {
      const mediaRes = await fetch(
        `https://graph.facebook.com/v21.0/${igId}/media?fields=id,caption,like_count,comments_count,timestamp,media_url,media_type,permalink,thumbnail_url&limit=6&access_token=${pageToken}`
      );
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        media = mediaData.data || [];
      }
    } catch {
      // Gracefully handle media fetch failure
    }

    // Step 5: Try to get insights (may require additional permissions)
    let insights = null;
    try {
      const insightsRes = await fetch(
        `https://graph.facebook.com/v21.0/${igId}/insights?metric=reach,impressions,profile_views&period=day&since=${Math.floor(Date.now() / 1000) - 7 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${pageToken}`
      );
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        insights = insightsData.data || null;
      }
    } catch {
      // Insights may not be available
    }

    return NextResponse.json({ profile, media, insights });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Instagram API" },
      { status: 500 }
    );
  }
}
