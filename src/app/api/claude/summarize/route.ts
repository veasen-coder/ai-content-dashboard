import { NextRequest, NextResponse } from "next/server";
import { logClaudeUsage } from "@/lib/claude-usage";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API not configured" },
      { status: 503 }
    );
  }

  try {
    const { messages } = await request.json();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system:
          "Generate a concise executive summary of this conversation. Focus on key decisions, action items, and important insights. Keep it under 200 words.",
        messages: [
          {
            role: "user",
            content: `Summarize this conversation:\n\n${messages
              .map(
                (m: { role: string; content: string }) =>
                  `${m.role}: ${m.content}`
              )
              .join("\n\n")}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to generate summary" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const summary = data.content?.[0]?.text || "Unable to generate summary";

    // Log usage
    if (data.usage) {
      logClaudeUsage({
        endpoint: "/api/claude/summarize",
        model: "claude-sonnet-4-20250514",
        input_tokens: data.usage.input_tokens || 0,
        output_tokens: data.usage.output_tokens || 0,
      });
    }

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Claude API" },
      { status: 500 }
    );
  }
}
