import { NextResponse } from "next/server";

export async function GET() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    return NextResponse.json(
      { error: "Instagram not configured" },
      { status: 503 }
    );
  }

  try {
    // Fetch profile info
    const profileRes = await fetch(
      `https://graph.instagram.com/v18.0/${accountId}?fields=followers_count,media_count,username,profile_picture_url&access_token=${accessToken}`
    );

    if (!profileRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Instagram profile" },
        { status: profileRes.status }
      );
    }

    const profile = await profileRes.json();

    // Fetch recent media
    const mediaRes = await fetch(
      `https://graph.instagram.com/v18.0/${accountId}/media?fields=id,caption,like_count,comments_count,timestamp,media_url,media_type,permalink&limit=10&access_token=${accessToken}`
    );

    const media = mediaRes.ok ? await mediaRes.json() : { data: [] };

    return NextResponse.json({ profile, media: media.data || [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Instagram API" },
      { status: 500 }
    );
  }
}
