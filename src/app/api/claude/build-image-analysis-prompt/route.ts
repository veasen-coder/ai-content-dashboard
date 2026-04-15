import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 10;

// Pure template — zero token cost. Returns a prompt string the user
// pastes into Claude Code (alongside dragging in their screenshots).
// Output schema matches AnalysisResult shape used by image-summary page.

export async function POST(request: NextRequest) {
  try {
    const { notes, image_count } = await request.json();

    const imgCount = image_count || "N";

    const prompt = `You are analysing screenshots for Flogen AI (Malaysian AI automation agency). I've attached ${imgCount} screenshot(s) from messaging platforms (WhatsApp, Instagram DMs, Facebook, email, etc.). Extract structured lead and conversation data.
${notes ? `\nUser notes: ${notes}\n` : ""}
Return ONLY valid JSON matching this exact schema — no markdown fences, no preamble, no explanation:

{
  "groups": [
    {
      "id": "unique-id-1",
      "label": "Descriptive label e.g. WhatsApp with Ahmad from Banyan Tree",
      "image_item_ids": [],
      "contacts": [
        { "name": "...", "phone": "...", "email": "...", "business": "..." }
      ],
      "conversation_summary": "Brief summary of the conversation",
      "sentiment": "positive" | "neutral" | "negative",
      "action_items": [
        "5-6 primary tasks that are HIGH-CONFIDENCE and essential",
        "Short actionable phrase under 12 words each"
      ],
      "additional_suggestions": [
        "4-5 supplementary tasks that could add value but less certain",
        "Nice-to-have research, optional outreach, related prep"
      ],
      "lead_potential": "high" | "medium" | "low" | "none",
      "lead_reasoning": "Why this is/isn't a good lead",
      "category": "whatsapp" | "instagram_dm" | "facebook" | "email" | "other",
      "clarifying_questions": ["Any questions if you're unsure"]
    }
  ],
  "raw_notes": "Overall assessment across all screenshots"
}

Rules:
1. Group related screenshots together (same conversation = one group)
2. Extract ALL contact info visible: name, phone, email, business
3. action_items = 5-6 primary, essential next steps
4. additional_suggestions = 4-5 nice-to-have extras
5. Each task under 12 words
6. All monetary values in MYR unless specified
7. Return ONLY the JSON object — no markdown fences`;

    return NextResponse.json({ prompt });
  } catch {
    return NextResponse.json(
      { error: "Failed to build prompt" },
      { status: 500 }
    );
  }
}
