// Shared prompt template for client progress updates.
// Used by both:
//   - /api/claude/analyze-client-progress (instant API call)
//   - /api/claude/build-client-progress-prompt (paste-bridge)

export interface ClientContext {
  name: string;
  business?: string | null;
  stage?: string | null;
  ai_summary?: string | null;
  notes?: string | null;
  close_probability?: number | null;
}

export function buildClientProgressPrompt(
  client: ClientContext,
  imageCount: number | string,
  userNotes?: string
) {
  return `You are reviewing screenshots of a PROGRESS UPDATE for an existing client in Flogen AI's pipeline (Malaysian AI automation agency). Your job is to extract what's NEW or CHANGED — not to re-describe what we already know.

CLIENT CONTEXT (what we already know):
- Name: ${client.name}
- Business: ${client.business || "—"}
- Current pipeline stage: ${client.stage || "—"}
- Close probability: ${client.close_probability != null ? `${client.close_probability}%` : "—"}
- AI summary: ${client.ai_summary || "—"}
- Existing notes: ${client.notes ? client.notes.slice(0, 800) : "—"}

You're seeing ${imageCount} new screenshot(s) (could be WhatsApp, email, meeting photos, design mockups, contract scans, etc.).
${userNotes ? `\nUser notes: ${userNotes}\n` : ""}
Return ONLY valid JSON — no markdown fences, no preamble:

{
  "kind": "progress_update",
  "summary": "1-2 sentence headline of what this update represents",
  "key_points": [
    "3-7 bullet points of what's new or changed",
    "Focus on FACTS, not re-summary of known info",
    "Include specific details (dates, amounts, names, decisions)"
  ],
  "next_actions": [
    "3-5 concrete next steps for Flogen based on this update",
    "Under 12 words each"
  ],
  "sentiment": "positive" | "neutral" | "negative",
  "stage_suggestion": "lead" | "contacted" | "demo_sent" | "negotiation" | "closed" | null,
  "close_probability_suggestion": <0-100 integer or null>,
  "raw_extract": "Verbatim extraction of any dialogue/text visible in screenshots, preserving speaker attribution where visible"
}

Rules:
- stage_suggestion: set ONLY if the update shows a clear pipeline change (e.g. they signed → "closed", they agreed to demo → "demo_sent"). Otherwise null.
- close_probability_suggestion: set ONLY if confidence clearly shifts (e.g. "we'll sign next week" = 80+, "we're going with competitor" = 0-10). Otherwise null.
- All monetary values in MYR unless specified.
- If something is unclear, note it in key_points as "Unclear: ..."`;
}
