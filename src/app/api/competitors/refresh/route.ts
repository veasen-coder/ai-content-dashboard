import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { handle, platform } = await req.json() as { handle: string; platform: string };

    if (!handle || !platform) {
      return NextResponse.json(
        { error: "handle and platform are required" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(getMockData(handle, platform));
    }

    const prompt = `You are a social media analyst. Research the following account and return publicly available data.

Account: @${handle} on ${platform}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "name": "Display Name",
  "followers": 12500,
  "following": 340,
  "posts_count": 89,
  "avg_engagement_rate": 3.2,
  "posting_frequency": 4.5,
  "growth_7d": 1.2,
  "growth_30d": 4.8,
  "bio": "Short bio or description",
  "recent_posts": [
    {
      "caption": "Post caption excerpt...",
      "likes": 450,
      "comments": 23,
      "engagement_rate": 3.8,
      "published_at": "2026-03-18T10:00:00Z"
    }
  ]
}

If you cannot find accurate data, use realistic estimates based on account size in the industry. Keep recent_posts to 3 items.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const data = JSON.parse(jsonStr);

    return NextResponse.json({ ...data, last_refreshed_at: new Date().toISOString() });
  } catch (err) {
    console.error("competitors/refresh error:", err);
    return NextResponse.json(
      { error: "Failed to refresh competitor data" },
      { status: 500 }
    );
  }
}

function getMockData(handle: string, platform: string) {
  return {
    name: handle,
    followers: 15200 + Math.round(Math.random() * 5000),
    following: 340,
    posts_count: 120,
    avg_engagement_rate: +(2 + Math.random() * 5).toFixed(1),
    posting_frequency: +(3 + Math.random() * 4).toFixed(1),
    growth_7d: +(Math.random() * 3).toFixed(2),
    growth_30d: +(Math.random() * 8).toFixed(2),
    bio: `${platform} account for ${handle}`,
    recent_posts: [],
    last_refreshed_at: new Date().toISOString(),
  };
}
