import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { CaptionRequest, CaptionResponse } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body: CaptionRequest = await req.json();
    const { topic, pillar, platform, tone = "professional yet conversational", context = "" } = body;

    if (!topic || !pillar || !platform) {
      return NextResponse.json(
        { error: "topic, pillar, and platform are required" },
        { status: 400 }
      );
    }

    const platformGuidance: Record<string, string> = {
      instagram: "Instagram — use emojis sparingly, line breaks for readability, 150-220 words",
      xiaohongshu: "Xiaohongshu (小红书) — write in Simplified Chinese, use a relatable lifestyle tone, include ✨ and relevant Chinese hashtags like #AI助手 #企业微信 #数字化",
      linkedin: "LinkedIn — professional, insight-driven, no hashtag spam, 150-300 words",
      twitter: "Twitter/X — punchy, under 280 characters for the main post",
      youtube: "YouTube — hook in first line, keyword-rich description",
    };

    const guide = platformGuidance[platform] ?? `${platform} — match platform norms`;

    const systemPrompt = `You are the content strategist for Flogen AI, a Malaysian B2B WhatsApp AI Agent agency.
Flogen AI helps Malaysian SMEs automate customer service with AI agents on WhatsApp.
Our brand voice: confident, modern, grounded in real business value. We speak to business owners, not tech people.
Content pillar this post belongs to: ${pillar}.
Platform: ${guide}.
Tone: ${tone}.`;

    const userPrompt = `Write 2 caption variants (Variant A and Variant B) for this topic:
"${topic}"
${context ? `\nAdditional context: ${context}` : ""}

Return ONLY valid JSON in this exact shape:
{
  "variant_a": "...",
  "variant_b": "...",
  "hashtags": ["...", "...", "..."]
}
Include 6-8 relevant hashtags in the hashtags array. Do not add hashtags inside the caption text itself.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();

    // Strip markdown fences if present
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const result: CaptionResponse = JSON.parse(jsonStr);

    return NextResponse.json(result);
  } catch (err) {
    console.error("generate-caption error:", err);
    return NextResponse.json(
      { error: "Failed to generate caption" },
      { status: 500 }
    );
  }
}
