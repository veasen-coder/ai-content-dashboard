import { NextRequest } from "next/server";
import { logClaudeUsage } from "@/lib/claude-usage";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Anthropic API not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, model = "claude-sonnet-4-20250514", system } =
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

    // Pipe through a transform stream that logs usage from the final event
    let inputTokens = 0;
    let outputTokens = 0;
    const usedModel = model;

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);

        // Try to parse SSE events to capture usage
        try {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data && data !== "[DONE]") {
                const parsed = JSON.parse(data);
                // message_start has input token count
                if (parsed.type === "message_start" && parsed.message?.usage) {
                  inputTokens = parsed.message.usage.input_tokens || 0;
                }
                // message_delta has output token count
                if (parsed.type === "message_delta" && parsed.usage) {
                  outputTokens = parsed.usage.output_tokens || 0;
                }
              }
            }
          }
        } catch {
          // Parsing SSE is best-effort for logging
        }
      },
      flush() {
        // Log usage after stream completes
        if (inputTokens > 0 || outputTokens > 0) {
          logClaudeUsage({
            endpoint: "/api/claude/chat",
            model: usedModel,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
          });
        }
      },
    });

    return new Response(res.body!.pipeThrough(transformStream), {
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
