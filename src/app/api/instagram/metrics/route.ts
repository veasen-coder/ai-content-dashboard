import { NextResponse } from "next/server";
import {
  getPageToken,
  exchangeForLongLivedToken,
  isTokenExpiredError,
} from "@/lib/facebook/token";

export const dynamic = "force-dynamic";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

async function fetchInstagramData(userToken: string, pageId: string, igAccountId?: string) {
  // Step 1: Get page access token
  const pageResult = await getPageToken(userToken, pageId);
  if (!pageResult) {
    return { error: "Facebook page not found", status: 404 };
  }

  const pageToken = pageResult.pageToken;

  // Step 2: Get IG Business Account ID (use env or discover from page)
  let igId = igAccountId;
  if (!igId) {
    const igRes = await fetch(
      `${GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
    );
    const igData = await igRes.json();
    igId = igData.instagram_business_account?.id;
  }

  if (!igId) {
    return { error: "No Instagram Business Account linked to this page", status: 404 };
  }

  // Step 3: Fetch IG profile
  const profileRes = await fetch(
    `${GRAPH_BASE}/${igId}?fields=id,username,followers_count,media_count,profile_picture_url,biography&access_token=${pageToken}`
  );

  if (!profileRes.ok) {
    const err = await profileRes.json().catch(() => ({}));
    if (err.error && isTokenExpiredError(err.error)) {
      return { error: "token_expired", detail: err.error.message, status: 401 };
    }
    return { error: "Failed to fetch Instagram profile", detail: err, status: profileRes.status };
  }

  const profile = await profileRes.json();

  // Step 4: Fetch recent media
  let media: unknown[] = [];
  let mediaError: unknown = null;
  try {
    // Try full fields first, fall back to basic fields if permission denied
    let mediaRes = await fetch(
      `${GRAPH_BASE}/${igId}/media?fields=id,caption,like_count,comments_count,timestamp,media_url,media_type,permalink,thumbnail_url&limit=6&access_token=${pageToken}`
    );
    if (!mediaRes.ok) {
      // Retry with minimal fields
      mediaRes = await fetch(
        `${GRAPH_BASE}/${igId}/media?fields=id,caption,timestamp,media_type,permalink&limit=6&access_token=${pageToken}`
      );
    }
    const mediaData = await mediaRes.json();
    if (mediaRes.ok) {
      media = mediaData.data || [];
    } else {
      mediaError = mediaData.error || mediaData;
      console.error("[Instagram] Media fetch error:", JSON.stringify(mediaError));
    }
  } catch (err) {
    mediaError = String(err);
    console.error("[Instagram] Media fetch exception:", mediaError);
  }

  // Step 5: Try to get insights
  let insights = null;
  try {
    const insightsRes = await fetch(
      `${GRAPH_BASE}/${igId}/insights?metric=reach,impressions,profile_views&period=day&since=${Math.floor(Date.now() / 1000) - 7 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${pageToken}`
    );
    if (insightsRes.ok) {
      const insightsData = await insightsRes.json();
      insights = insightsData.data || null;
    }
  } catch {
    // Insights may not be available
  }

  return { data: { profile, media, insights } };
}

export async function GET() {
  let accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!accessToken || !pageId) {
    return NextResponse.json(
      { error: "Facebook/Instagram not configured. Set FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID." },
      { status: 503 }
    );
  }

  try {
    let result = await fetchInstagramData(accessToken, pageId, igAccountId);

    // If token expired, try auto-exchange with app credentials
    if (result.error === "token_expired" && appId && appSecret) {
      console.log("[Instagram] Token expired, attempting auto-exchange...");
      try {
        const exchanged = await exchangeForLongLivedToken(accessToken, appId, appSecret);
        accessToken = exchanged.access_token;
        console.log("[Instagram] Token exchanged successfully. Update FACEBOOK_ACCESS_TOKEN in .env.local with the new long-lived token.");
        result = await fetchInstagramData(accessToken, pageId, igAccountId);
      } catch {
        console.error("[Instagram] Auto-exchange failed — token is fully expired. Get a new one from https://developers.facebook.com/tools/explorer/");
      }
    }

    if (result.error) {
      const message =
        result.error === "token_expired"
          ? "Facebook access token has expired. Visit /api/instagram/debug for details and instructions to refresh."
          : result.error;

      return NextResponse.json(
        { error: message, detail: result.detail },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("[Instagram] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to connect to Instagram API", detail: String(err) },
      { status: 500 }
    );
  }
}
