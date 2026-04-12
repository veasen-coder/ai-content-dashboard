import { NextResponse } from "next/server";

const PAGE_ID = "897824556757957";

export async function GET() {
  const userToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!userToken) {
    return NextResponse.json(
      { error: "Facebook not configured" },
      { status: 503 }
    );
  }

  try {
    // Step 1: Exchange user token for page token via /me/accounts
    const accountsRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}`
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
      (p: { id: string }) => p.id === PAGE_ID
    );

    if (!page) {
      return NextResponse.json(
        { error: `Page ${PAGE_ID} not found in user accounts` },
        { status: 404 }
      );
    }

    const pageToken = page.access_token;

    // Step 2: Fetch page profile info
    const profileRes = await fetch(
      `https://graph.facebook.com/v18.0/${PAGE_ID}?fields=name,fan_count,followers_count,talking_about_count,picture&access_token=${pageToken}`
    );

    if (!profileRes.ok) {
      const err = await profileRes.json();
      return NextResponse.json(
        { error: err.error?.message || "Failed to fetch page profile" },
        { status: profileRes.status }
      );
    }

    const profile = await profileRes.json();

    // Step 3: Try to fetch recent posts (requires pages_read_engagement)
    let posts: unknown[] = [];
    try {
      const postsRes = await fetch(
        `https://graph.facebook.com/v18.0/${PAGE_ID}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${pageToken}`
      );

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        posts = postsData.data || [];
      }
      // If posts fetch fails (permission error), we silently return empty posts
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
