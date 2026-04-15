import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

// Instant generation via Anthropic API.
// Uses same delimited format as paste-bridge for consistent parsing.

interface ClientInput {
  name: string;
  business?: string;
  industry?: string;
  stage?: string;
  source?: string;
  ai_summary?: string;
  notes?: string;
  deal_value?: string;
}

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

    const {
      client,
      duration_minutes = 30,
      focus = "ROI and practical automation wins",
      tone = "consultative",
      include_objections = true,
      include_pricing = "soft",
    } = body;

    if (!client?.name) {
      return NextResponse.json(
        { error: "client with at least name is required" },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(client, {
      duration_minutes,
      focus,
      tone,
      include_objections,
      include_pricing,
    });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        system:
          "You are generating full pre-demo packages for Flogen AI, a Malaysian AI automation agency. You tailor every output specifically to the client — never generic. You return responses using exact delimiter blocks as instructed and include fully working standalone HTML.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      let errMsg = "Failed to generate demo script";
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

    const parsed = parseDelimited(rawText);
    if (!parsed) {
      return NextResponse.json(
        { error: "Failed to parse Claude output", raw: rawText.slice(0, 500) },
        { status: 500 }
      );
    }

    return NextResponse.json({ content: parsed });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Claude API" },
      { status: 500 }
    );
  }
}

function buildPrompt(
  client: ClientInput,
  params: {
    duration_minutes: number;
    focus: string;
    tone: string;
    include_objections: boolean;
    include_pricing: string;
  }
): string {
  const contextLines: string[] = [];
  contextLines.push(`- Client: ${client.name}`);
  if (client.business) contextLines.push(`- Business: ${client.business}`);
  if (client.industry) contextLines.push(`- Industry: ${client.industry}`);
  if (client.stage) contextLines.push(`- Pipeline stage: ${client.stage}`);
  if (client.source) contextLines.push(`- Lead source: ${client.source}`);
  if (client.ai_summary) contextLines.push(`- AI summary: ${client.ai_summary}`);
  if (client.notes) contextLines.push(`- Full notes: ${client.notes}`);
  if (client.deal_value) contextLines.push(`- Deal value: ${client.deal_value}`);

  const industry = client.industry || client.business || "their";

  return `Generate a FULL pre-demo package for Flogen AI (Malaysian AI automation agency). Tailor everything specifically to this client.

=== CLIENT CONTEXT ===
${contextLines.join("\n")}

=== PARAMETERS ===
- Duration: ${params.duration_minutes} minutes
- Focus: ${params.focus}
- Tone: ${params.tone}
- Objection handling: ${params.include_objections ? "yes" : "no"}
- Pricing: ${params.include_pricing}

=== OUTPUT ===
Return with these EXACT delimiters. No markdown fences. No preamble.

---PITCH_DECK_START---
{
  "client_name": "...",
  "business_name": "...",
  "slides": [
    {
      "slide_number": 1,
      "type": "title",
      "title": "...",
      "subtitle": "...",
      "bullets": ["..."],
      "speaker_notes": "...",
      "visual_suggestion": "..."
    }
  ]
}
---PITCH_DECK_END---

---DEMO_HTML_START---
<!DOCTYPE html>... standalone chatbot demo HTML with inline CSS/JS, tailored to ${industry} industry, with 5+ clickable scenarios ...
---DEMO_HTML_END---

---SCENARIOS_START---
[{ "title": "...", "description": "...", "trigger": "..." }]
---SCENARIOS_END---

---PRESENTER_NOTES_START---
Coaching tips (200-400 words).
---PRESENTER_NOTES_END---

Rules:
1. 8-12 slides, each speaker_notes must reference this client's specific business
2. Demo HTML must be fully working standalone file (all CSS/JS inline, no CDN libs)
3. At least 5 scenarios common in ${industry} (bookings, FAQs, upsells, complaints, escalations)
4. Tone: ${params.tone}
5. Return ONLY the 4 delimited blocks. No fences. No preamble.`;
}

// Parse delimited response into structured content
function parseDelimited(raw: string): {
  pitch_deck: unknown;
  demo_html: string;
  scenarios_covered: unknown;
  presenter_notes: string;
} | null {
  try {
    const extract = (start: string, end: string): string | null => {
      const sIdx = raw.indexOf(start);
      const eIdx = raw.indexOf(end);
      if (sIdx < 0 || eIdx < 0 || eIdx <= sIdx) return null;
      return raw.slice(sIdx + start.length, eIdx).trim();
    };

    const deckStr = extract("---PITCH_DECK_START---", "---PITCH_DECK_END---");
    const html = extract("---DEMO_HTML_START---", "---DEMO_HTML_END---");
    const scenStr = extract("---SCENARIOS_START---", "---SCENARIOS_END---");
    const notes = extract(
      "---PRESENTER_NOTES_START---",
      "---PRESENTER_NOTES_END---"
    );

    if (!deckStr || !html || !scenStr || !notes) return null;

    // Strip possible markdown fences inside JSON blocks
    const cleanJson = (s: string) =>
      s
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "")
        .trim();

    const pitch_deck = JSON.parse(cleanJson(deckStr));
    const scenarios_covered = JSON.parse(cleanJson(scenStr));

    return {
      pitch_deck,
      demo_html: html,
      scenarios_covered,
      presenter_notes: notes,
    };
  } catch {
    return null;
  }
}
