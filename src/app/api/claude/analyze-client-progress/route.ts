import { NextRequest, NextResponse } from "next/server";
import { logClaudeUsage } from "@/lib/claude-usage";
import { buildClientProgressPrompt } from "@/lib/client-progress-prompt";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API not configured" },
      { status: 503 }
    );
  }

  try {
    const { client, images, notes } = await request.json();

    if (!client?.name) {
      return NextResponse.json(
        { error: "client context with name is required" },
        { status: 400 }
      );
    }

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
      text: buildClientProgressPrompt(client, images.length, notes),
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
        max_tokens: 2048,
        system:
          "You are an AI assistant for Flogen AI, a Malaysian AI automation business. You review client progress screenshots and extract structured updates. Focus on what's NEW or CHANGED, not on re-describing known info. Always return valid JSON only — no markdown formatting, no code fences. All monetary values in MYR unless specified.",
        messages: [
          {
            role: "user",
            content: [...imageBlocks, textBlock],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      let errMsg = "Failed to analyze client progress";
      try {
        const errData = JSON.parse(errText);
        errMsg = errData.error?.message || errMsg;
      } catch {
        errMsg = errText.slice(0, 200);
      }
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    const data = await res.json();
    const rawText = data.content?.[0]?.text || "";

    if (data.usage) {
      logClaudeUsage({
        endpoint: "/api/claude/analyze-client-progress",
        model: "claude-sonnet-4-20250514",
        input_tokens: data.usage.input_tokens || 0,
        output_tokens: data.usage.output_tokens || 0,
      });
    }

    // Strip markdown code fences + leading preambles if present
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const firstBrace = jsonStr.indexOf("{");
    if (firstBrace > 0) jsonStr = jsonStr.slice(firstBrace);

    try {
      const analysis = JSON.parse(jsonStr);
      if (!analysis.kind) analysis.kind = "progress_update";
      return NextResponse.json(analysis);
    } catch {
      return NextResponse.json({
        kind: "progress_update",
        summary: "Could not parse AI response",
        key_points: [],
        next_actions: [],
        sentiment: "neutral",
        raw_extract: rawText,
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Claude API" },
      { status: 500 }
    );
  }
}
