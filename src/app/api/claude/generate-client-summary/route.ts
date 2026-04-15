import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// Generate a short 1-2 sentence AI summary of a client from their notes + context.
// Used to replace long raw descriptions on pipeline cards.

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { client } = body;

    if (!client?.name) {
      return NextResponse.json(
        { error: "client with at least name is required" },
        { status: 400 }
      );
    }

    if (!client.notes && !client.business && !client.industry) {
      return NextResponse.json(
        { summary: null },
        { status: 200 }
      );
    }

    const contextLines: string[] = [];
    contextLines.push(`Name: ${client.name}`);
    if (client.business) contextLines.push(`Business: ${client.business}`);
    if (client.industry) contextLines.push(`Industry: ${client.industry}`);
    if (client.stage) contextLines.push(`Stage: ${client.stage}`);
    if (client.source) contextLines.push(`Source: ${client.source}`);
    if (client.notes) contextLines.push(`Notes: ${client.notes}`);

    const prompt = `Summarise this lead/client in ONE short sentence (max 20 words). Focus on what makes them interesting or actionable — their intent, pain point, or next step. No fluff.

${contextLines.join("\n")}

Return ONLY the summary sentence. No prefix, no quotes, no explanation.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system:
          "You write ultra-concise one-sentence summaries of business leads. No fluff, no preamble, just the summary.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      return NextResponse.json(
        { error: errText.slice(0, 200) },
        { status: res.status }
      );
    }

    const data = await res.json();
    const summary = (data.content?.[0]?.text || "").trim().replace(/^["']|["']$/g, "");

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
