import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Anthropic API not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, model = "claude-sonnet-4-5-20250514", system } =
      await request.json();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system:
          system ||
          "You are Flogen AI Assistant — an internal operations AI for Flogen AI, a Malaysian AI automation business. You help with strategy, client management, content writing, automation planning, and business operations. Be direct, specific, and actionable.",
        messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      return new Response(JSON.stringify({ error }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream the response
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to connect to Claude API" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
