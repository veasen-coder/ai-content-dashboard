import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_COMPETITORS } from "@/lib/competitor-service";

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

    // Find competitor context for better AI estimates
    const cleanHandle = handle.replace(/^@/, "");
    const competitorDef = DEFAULT_COMPETITORS.find(
      c => c.handle === cleanHandle || c.handle === handle
    );
    const context = competitorDef?.description ?? `${platform} account for @${handle}`;

    const prompt = `You are a social media analyst with expertise in the WhatsApp automation and AI SaaS space.

Research context for this account:
- Handle: @${cleanHandle} on ${platform}
- About: ${context}

Today's date: March 2026. Using your knowledge of this company/account, return realistic estimated social media data.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "name": "Display Name",
  "followers": 12500,
  "following": 340,
  "posts_count": 89,
  "avg_engagement_rate": 3.2,
  "posting_frequency": 4.5,
  "growth_7d": 1.2,
  "growth_30d": 4.8,
  "bio": "Short bio based on what you know about this company",
  "recent_posts": [
    {
      "caption": "Realistic post caption for this company's content style...",
      "likes": 450,
      "comments": 23,
      "engagement_rate": 3.8,
      "published_at": "2026-03-18T10:00:00Z"
    }
  ]
}

Important: Use realistic numbers based on the account size described. For small/local accounts, use lower follower counts (hundreds to low thousands). For established global SaaS companies, use higher counts (10k–50k). Keep recent_posts to 3 items with captions that match this company's actual content style.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const data = JSON.parse(jsonStr);

    return NextResponse.json({
      ...data,
      last_refreshed_at: new Date().toISOString(),
      data_source: "ai_estimated",
    });
  } catch (err) {
    console.error("competitors/refresh error:", err);
    return NextResponse.json(
      { error: "Failed to refresh competitor data" },
      { status: 500 }
    );
  }
}

function getMockData(handle: string, platform: string) {
  const cleanHandle = handle.replace(/^@/, "");
  const competitorDef = DEFAULT_COMPETITORS.find(c => c.handle === cleanHandle);
  const base = competitorDef?.baseFollowers ?? 5000;
  return {
    name: competitorDef?.name ?? handle,
    followers: base + Math.round(Math.random() * base * 0.2),
    following: Math.round(base * 0.1),
    posts_count: 80 + Math.round(Math.random() * 200),
    avg_engagement_rate: +(2 + Math.random() * 5).toFixed(1),
    posting_frequency: +(2 + Math.random() * 4).toFixed(1),
    growth_7d: +(Math.random() * 2).toFixed(2),
    growth_30d: +(Math.random() * 6).toFixed(2),
    bio: competitorDef?.description ?? `${platform} account for ${handle}`,
    recent_posts: [],
    last_refreshed_at: new Date().toISOString(),
    data_source: "estimated",
  };
}
