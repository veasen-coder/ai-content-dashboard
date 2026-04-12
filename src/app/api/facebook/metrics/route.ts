import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!userToken || !pageId) {
    return NextResponse.json(
      { error: "Facebook not configured" },
      { status: 503 }
    );
  }

  try {
    // Step 1: Exchange user token for page token via /me/accounts
    const accountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`
    );

    if (!accountsRes.ok) {
      const err = await accountsRes.json();
      return NextResponse.json(
        { error: err.error?.message || "Failed to fetch page accounts" },
        { status: accountsRes.status }
      );
    }

    const accountsData = await accountsRes.json();
    const page = (accountsData.data || []).find(
      (p: { id: string }) => p.id === pageId
    );

    if (!page) {
      return NextResponse.json(
        { error: `Page ${pageId} not found in user accounts` },
        { status: 404 }
      );
    }

    const pageToken = page.access_token;

    // Step 2: Fetch page profile info
    const profileRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=name,fan_count,followers_count,talking_about_count,picture&access_token=${pageToken}`
    );

    if (!profileRes.ok) {
      const err = await profileRes.json();
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
