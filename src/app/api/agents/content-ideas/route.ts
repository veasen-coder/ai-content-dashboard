import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logClaudeUsage } from "@/lib/claude-usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a social media content strategist for Flogen AI, a Malaysian AI automation business. You also help with content for Bundle Vaults (digital products brand).

Your job is to generate 5 creative content ideas for social media posting. For EACH idea, provide ALL of the following fields in a structured JSON format.

Return ONLY a valid JSON array with exactly 5 objects. No markdown, no explanation, no code fences. Just the raw JSON array.

Each object must have these exact keys:
- "platform": one of "Instagram", "Facebook", "RedNote" (distribute across platforms)
- "post_use": the strategic purpose (e.g. "Brand Awareness", "CTA - Lead Gen", "Social Proof", "Education", "Engagement Bait", "Product Showcase", "Behind The Scenes", "Testimonial")
- "copywriting": the full caption/copy ready to post (include emojis, hashtags, CTA)
- "posting_style": describe the visual layout (e.g. "Carousel - 5 slides", "Single image with bold text overlay", "Reel / Short video", "Infographic", "Before/After comparison")
- "color_palette": specific colors to use (e.g. "Deep violet #7C3AED + white #FFFFFF on dark #0A0A0A", "Warm amber gradient with cream text")
- "generation_prompt": a detailed prompt that can be used in an AI image generator (Midjourney/DALL-E/Canva AI) to create the visual. Be very specific about layout, text placement, style, mood.
- "reference_notes": any additional context, trending formats to reference, or tips for the content creator

Make the ideas diverse — mix platforms, post types, and purposes. Keep the Malaysian market in mind. Use current social media trends.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API not configured" }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const customContext = body.context || "";

    const userMessage = customContext
      ? `Generate 5 content ideas. Additional context: ${customContext}`
      : "Generate 5 fresh content ideas for this week's social media calendar.";

    // Call Claude API (non-streaming)
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    if (data.usage) {
      logClaudeUsage({
        endpoint: "/api/agents/content-ideas",
        model: "claude-sonnet-4-20250514",
        input_tokens: data.usage.input_tokens || 0,
        output_tokens: data.usage.output_tokens || 0,
      });
    }

    // Parse the JSON array from Claude's response
    let ideas;
    try {
      // Try direct parse first
      ideas = JSON.parse(text);
    } catch {
      // Try extracting JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        ideas = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "Failed to parse content ideas from AI response" }, { status: 500 });
      }
    }

    if (!Array.isArray(ideas) || ideas.length === 0) {
      return NextResponse.json({ error: "No ideas generated" }, { status: 500 });
    }

    // Save to Supabase
    const supabase = createServiceRoleClient();
    const rows = ideas.map((idea: Record<string, string>) => ({
      platform: idea.platform || "Instagram",
      post_use: idea.post_use || "Brand Awareness",
      copywriting: idea.copywriting || "",
      posting_style: idea.posting_style || "",
      color_palette: idea.color_palette || "",
      generation_prompt: idea.generation_prompt || "",
      reference_notes: idea.reference_notes || null,
      status: "new",
    }));

    const { data: saved, error: dbError } = await supabase
      .from("content_ideas")
      .insert(rows)
      .select();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ ideas: saved, count: saved?.length || 0 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// GET: Fetch saved content ideas
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");

    let query = supabase
      .from("content_ideas")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ideas: data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch content ideas" }, { status: 500 });
  }
}

// PATCH: Update idea status (new → used → archived)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("content_ideas")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to update idea" }, { status: 500 });
  }
}
