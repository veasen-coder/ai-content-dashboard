import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API not configured" },
      { status: 503 }
    );
  }

  try {
    const { images, notes } = await request.json();

    if (!images?.length) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }

    const imageBlocks = images.map(
      (img: { mime_type: string; base64_data: string }) => ({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mime_type,
          data: img.base64_data,
        },
      })
    );

    const textBlock = {
      type: "text",
      text: `${notes ? `User notes: ${notes}\n\n` : ""}Analyze these ${images.length} screenshot(s) and extract structured data. Return ONLY valid JSON matching this exact schema — no markdown, no code fences, just raw JSON:

{
  "groups": [
    {
      "id": "unique-id",
      "label": "Descriptive label e.g. WhatsApp conversation with Ahmad",
      "image_item_ids": [],
      "contacts": [{ "name": "...", "phone": "...", "email": "...", "business": "..." }],
      "conversation_summary": "Brief summary of the conversation",
      "sentiment": "positive" | "neutral" | "negative",
      "action_items": ["Follow up on pricing", "Send proposal"],
      "lead_potential": "high" | "medium" | "low" | "none",
      "lead_reasoning": "Why this is/isn't a good lead",
      "category": "whatsapp" | "instagram_dm" | "facebook" | "email" | "other",
      "clarifying_questions": ["Any questions if unsure"]
    }
  ],
  "raw_notes": "Overall assessment of all screenshots"
}

Group related screenshots together (e.g. multiple screenshots from same conversation). For each group extract: contacts with all available info, conversation summary, sentiment, actionable tasks, and lead potential. If you're unsure about anything, add clarifying questions.`,
    };

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
        system:
          "You are an AI assistant for Flogen AI, a Malaysian AI automation business. You analyze screenshots from messaging platforms (WhatsApp, Instagram, Facebook, email, etc.) and extract structured lead and conversation data. Always return valid JSON only — no markdown formatting, no code fences. Be thorough in extracting contact information and identifying business opportunities. All monetary values should be in MYR unless otherwise specified.",
        messages: [
          {
            role: "user",
            content: [...imageBlocks, textBlock],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errData.error?.message || "Failed to analyze images with Claude",
        },
        { status: res.status }
      );
    }

    const data = await res.json();
    const rawText = data.content?.[0]?.text || "";

    try {
      const analysis = JSON.parse(rawText);
      return NextResponse.json(analysis);
    } catch {
      return NextResponse.json({
        groups: [],
        raw_notes: rawText,
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Claude API" },
      { status: 500 }
    );
  }
}
