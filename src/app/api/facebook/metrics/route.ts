import { NextResponse } from "next/server";
import {
  getPageToken,
  exchangeForLongLivedToken,
  isTokenExpiredError,
} from "@/lib/facebook/token";

export const dynamic = "force-dynamic";

export async function GET() {
  let userToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!userToken || !pageId) {
    return NextResponse.json(
      { error: "Facebook not configured. Set FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID." },
      { status: 503 }
    );
  }

  try {
    // Step 1: Get page token
    let pageResult: Awaited<ReturnType<typeof getPageToken>> = null;
    try {
      pageResult = await getPageToken(userToken, pageId);
    } catch (err) {
      // Check if token expired and try auto-exchange
      const errMsg = String(err);
      if (errMsg.includes("expired") || errMsg.includes("Session has expired") || errMsg.includes("Invalid OAuth")) {
        if (appId && appSecret) {
          console.log("[Facebook] Token expired, attempting auto-exchange...");
          try {
            const exchanged = await exchangeForLongLivedToken(userToken, appId, appSecret);
            userToken = exchanged.access_token;
            console.log("[Facebook] Token exchanged. Update FACEBOOK_ACCESS_TOKEN in .env.local.");
            pageResult = await getPageToken(userToken, pageId);
          } catch {
            console.error("[Facebook] Auto-exchange failed — token is fully expired.");
          }
        }
        if (!pageResult) {
          return NextResponse.json(
            { error: "Facebook access token has expired. Visit /api/instagram/debug for details." },
            { status: 401 }
          );
        }
      } else {
        throw err;
      }
    }

    if (!pageResult) {
      return NextResponse.json(
        { error: `Page ${pageId} not found in user accounts` },
        { status: 404 }
      );
    }

    const pageToken = pageResult.pageToken;

    // Step 2: Fetch page profile info
    const profileRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=name,fan_count,followers_count,talking_about_count,picture&access_token=${pageToken}`
    );

    if (!profileRes.ok) {
      const err = await profileRes.json();
      if (err.error && isTokenExpiredError(err.error)) {
        return NextResponse.json(
          { error: "Facebook access token has expired. Visit /api/instagram/debug for details." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: err.error?.message || "Failed to fetch page profile" },
        { status: profileRes.status }
      );
    }

    const profile = await profileRes.json();

    // Step 3: Fetch recent posts — try enriched fields first, fall back to basic
    let posts: unknown[] = [];
    try {
      // Try with engagement metrics (needs pages_read_engagement)
      let postsRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=6&access_token=${pageToken}`
      );

      if (!postsRes.ok) {
        // Fall back to basic fields only
        postsRes = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/posts?fields=id,message,created_time&limit=6&access_token=${pageToken}`
        );
      }

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        posts = postsData.data || [];
      }
    } catch {
      // Graceful fallback — posts endpoint not available
    }

    return NextResponse.json({ profile, posts });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Facebook API" },
      { status: 500 }
    );
  }
}
