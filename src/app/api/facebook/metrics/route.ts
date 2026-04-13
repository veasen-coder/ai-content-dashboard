import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export async function GET() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!accessToken || !pageId) {
    return NextResponse.json(
      { error: "Facebook not configured. Set FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID." },
      { status: 503 }
    );
  }

  try {
    // Step 1: Fetch page profile info
    const profileRes = await fetch(
      `${GRAPH_BASE}/${pageId}?fields=name,fan_count,followers_count,talking_about_count,picture&access_token=${accessToken}`
    );

    const profile = await profileRes.json();

    if (profile.error) {
      return NextResponse.json(
        { error: profile.error.message || "Failed to fetch page profile" },
        { status: profileRes.status }
      );
    }

    // Step 2: Fetch recent posts
    let posts: unknown[] = [];
    try {
      let postsRes = await fetch(
        `${GRAPH_BASE}/${pageId}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=6&access_token=${accessToken}`
      );

      if (!postsRes.ok) {
        postsRes = await fetch(
          `${GRAPH_BASE}/${pageId}/posts?fields=id,message,created_time&limit=6&access_token=${accessToken}`
        );
      }

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        posts = postsData.data || [];
      }
    } catch {
      // Graceful fallback
    }

    return NextResponse.json({ profile, posts });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Facebook API" },
      { status: 500 }
    );
  }
}
