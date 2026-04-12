import { NextResponse } from "next/server";

export async function GET() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!accessToken || !pageId) {
    return NextResponse.json(
      { error: "Facebook not configured" },
      { status: 503 }
    );
  }

  try {
    const profileRes = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=fan_count,name,picture&access_token=${accessToken}`
    );

    if (!profileRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Facebook page" },
        { status: profileRes.status }
      );
    }

    const profile = await profileRes.json();

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Facebook API" },
      { status: 500 }
    );
  }
}
