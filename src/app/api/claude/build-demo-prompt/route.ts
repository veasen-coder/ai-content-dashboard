import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// Build a self-contained prompt string for the paste-bridge flow.
// No Claude API call — pure template with client data baked in.
// User pastes this into Claude Code, Claude returns delimited output,
// user pastes the full response back into the website for parsing.

export async function POST(request: NextRequest) {
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

    const contextLines: string[] = [];
    contextLines.push(`- Client: ${client.name}`);
    if (client.business) contextLines.push(`- Business: ${client.business}`);
    if (client.industry) contextLines.push(`- Industry: ${client.industry}`);
    if (client.stage) contextLines.push(`- Pipeline stage: ${client.stage}`);
    if (client.source) contextLines.push(`- Lead source: ${client.source}`);
    if (client.ai_summary) contextLines.push(`- AI summary: ${client.ai_summary}`);
    if (client.notes) contextLines.push(`- Full notes: ${client.notes}`);
    if (client.deal_value) contextLines.push(`- Deal value: ${client.deal_value}`);

    const contextBlock = contextLines.join("\n");

    const prompt = `You are generating a FULL pre-demo package for Flogen AI (a Malaysian AI automation agency). The output must be tailored specifically to the client below — never generic.

=== CLIENT CONTEXT ===
${contextBlock}

=== DEMO PARAMETERS ===
- Duration: ${duration_minutes} minutes
- Focus: ${focus}
- Tone: ${tone}
- Include objection handling: ${include_objections ? "yes" : "no"}
- Pricing discussion level: ${include_pricing}

=== OUTPUT FORMAT ===
Return your response using these EXACT delimiters. Do NOT wrap in markdown code fences. Do NOT add any commentary before or after.

---PITCH_DECK_START---
{
  "client_name": "...",
  "business_name": "...",
  "slides": [
    {
      "slide_number": 1,
      "type": "title" | "problem" | "solution" | "why_us" | "demo_intro" | "features" | "case_study" | "pricing" | "objections" | "close" | "next_steps",
      "title": "...",
      "subtitle": "... (optional)",
      "bullets": ["..."],
      "speaker_notes": "... what the presenter says on this slide, tailored to this client",
      "visual_suggestion": "... describe diagrams, metrics, or imagery to show (optional)"
    }
  ]
}
---PITCH_DECK_END---

---DEMO_HTML_START---
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Flogen AI Demo for [business name]</title>
<style>
  /* Inline CSS — dark, modern, Flogen purple accent (#7C3AED) */
</style>
</head>
<body>
  <!-- A working, standalone chatbot demo UI tailored to this client's business.
       Must include:
       - Flogen AI header/branding
       - A chat interface that visually resembles WhatsApp/iMessage
       - Pre-scripted conversation flows covering at least 5 scenarios relevant to their industry
       - Scenario selector buttons at the top to switch between flows
       - Working JavaScript that animates typing and reveals messages on click
       - Self-contained — no external JS/CSS dependencies
  -->
  <script>
    // Scripted scenarios go here
  </script>
</body>
</html>
---DEMO_HTML_END---

---SCENARIOS_START---
[
  { "title": "Scenario name", "description": "What happens", "trigger": "User says / does X" }
]
---SCENARIOS_END---

---PRESENTER_NOTES_START---
Overall coaching tips: timing per section, when to pause for questions, body language, pricing framing, close signals to watch for. 200-400 words.
---PRESENTER_NOTES_END---

=== RULES ===
1. Pitch deck: 8-12 slides, each speaker_notes section must reference THIS client's specific business, not generic copy
2. Demo HTML: MUST be a fully working standalone file — include all CSS inline, all JS inline, no CDN libs. The chatbot must have at least 5 scenarios the presenter can click through during the live demo
3. Scenarios should cover common customer interactions in ${client.industry || client.business || "their"} industry — bookings, FAQs, upsells, complaints, escalations, etc.
4. Tone throughout: ${tone}
5. Reference any context from the client notes naturally — show you did your homework
6. Return ONLY the 4 delimited blocks above. No markdown fences. No "Here is..." preamble.`;

    return NextResponse.json({ prompt });
  } catch {
    return NextResponse.json(
      { error: "Failed to build prompt" },
      { status: 500 }
    );
  }
}
