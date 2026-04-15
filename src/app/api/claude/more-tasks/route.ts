import { NextRequest, NextResponse } from "next/server";
import { logClaudeUsage } from "@/lib/claude-usage";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API not configured" },
      { status: 503 }
    );
  }

  try {
    const {
      conversation_summary,
      contacts,
      category,
      lead_potential,
      existing_tasks,
    } = await request.json();

    const contactStr = Array.isArray(contacts) && contacts.length
      ? contacts
          .map(
            (c: { name?: string; business?: string }) =>
              `${c.name || "Unknown"}${c.business ? ` (${c.business})` : ""}`
          )
          .join(", ")
      : "Unknown";

    const existingStr = Array.isArray(existing_tasks) && existing_tasks.length
      ? existing_tasks.map((t: string) => `- ${t}`).join("\n")
      : "(none)";

    const prompt = `You are generating additional task suggestions for a lead follow-up.

Context:
- Contact(s): ${contactStr}
- Category: ${category || "unknown"}
- Lead potential: ${lead_potential || "unknown"}
- Conversation summary: ${conversation_summary || "n/a"}

Existing tasks (do NOT duplicate these):
${existingStr}

Generate exactly 5 NEW, distinct, actionable tasks that would add value beyond the existing list. Think of angles not yet covered — research, prep work, outreach variations, cross-sell opportunities, follow-up touchpoints, etc. Each task should be a short actionable phrase under 12 words.

Return ONLY valid JSON (no markdown, no code fences) in this exact shape:
{ "tasks": ["task 1", "task 2", "task 3", "task 4", "task 5"] }`;

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
          "You are an AI assistant for Flogen AI, a Malaysian AI automation business. Generate practical, business-focused task suggestions. Always return valid JSON only — no markdown, no code fences.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      let errMsg = "Failed to generate tasks";
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
        endpoint: "/api/claude/more-tasks",
        model: "claude-sonnet-4-20250514",
        input_tokens: data.usage.input_tokens || 0,
        output_tokens: data.usage.output_tokens || 0,
      });
    }

    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    try {
      const parsed = JSON.parse(jsonStr);
      const tasks: string[] = Array.isArray(parsed.tasks) ? parsed.tasks : [];
      return NextResponse.json({ tasks });
    } catch {
      return NextResponse.json({ tasks: [] });
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Claude API" },
      { status: 500 }
    );
  }
}
