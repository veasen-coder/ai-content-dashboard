import { NextRequest, NextResponse } from "next/server";
import { logClaudeUsage } from "@/lib/claude-usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST: Generate leads using Claude AI
export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API not configured" },
      { status: 503 }
    );
  }

  try {
    const { niche, country, state, count } = await request.json();

    if (!niche) {
      return NextResponse.json(
        { error: "Niche is required" },
        { status: 400 }
      );
    }

    const numLeads = Math.min(count || 5, 10);
    const location = state
      ? `${state}, ${country || "Malaysia"}`
      : country || "Malaysia";

    const systemPrompt = `You are a lead research specialist for Flogen AI, a Malaysian AI automation company that sells WhatsApp AI agents, automation workflows, and AI customer service systems to SMEs.

Your task: Generate ${numLeads} realistic potential client leads for the "${niche}" industry in ${location}.

For EACH lead, generate a complete profile as a JSON object with these exact fields:
- businessName: The business name (realistic Malaysian SME name)
- niche: "${niche}"
- country: "${country || "Malaysia"}"
- state: The state/city in ${location}
- phone: A realistic Malaysian phone number (format: 01X-XXXX XXXX)
- email: A realistic business email (use common formats like info@, hello@, admin@ with the business domain)
- subject: A personalised cold email subject line specific to this business (NOT generic)
- emailBody: A complete cold email (150-200 words) that:
  * Opens with something specific about their business type
  * Identifies one pain point they likely face (slow responses, missed messages, manual work)
  * Explains how Flogen AI solves it in one sentence
  * Includes social proof (e.g. "We've helped F&B businesses reduce response time by 80%")
  * Soft CTA: "Would you be open to a quick 15-min call this week?"
  * Sign off as: Haikal, Founder — Flogen AI | flogen.team@gmail.com | +60 11-7557 4966

IMPORTANT: Return ONLY a valid JSON array of objects. No markdown, no explanation, no code fences. Just the raw JSON array.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Generate ${numLeads} leads for "${niche}" businesses in ${location}. Return only the JSON array.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: "Claude API error", detail: err },
        { status: res.status }
      );
    }

    const data = await res.json();
    const text =
      data.content?.[0]?.text || "";

    if (data.usage) {
      logClaudeUsage({
        endpoint: "/api/agents/lead-research",
        model: "claude-sonnet-4-20250514",
        input_tokens: data.usage.input_tokens || 0,
        output_tokens: data.usage.output_tokens || 0,
      });
    }

    // Parse JSON from response (handle possible markdown fences)
    let leads;
    try {
      const cleaned = text
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      leads = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse leads from AI response",
          raw: text.substring(0, 500),
        },
        { status: 500 }
      );
    }

    if (!Array.isArray(leads)) {
      return NextResponse.json(
        { error: "AI returned invalid format", raw: text.substring(0, 500) },
        { status: 500 }
      );
    }

    // Generate a batch ID
    const batchId = `batch_${Date.now()}_${niche.toLowerCase().replace(/\s+/g, "_")}`;

    // Add batch ID to each lead
    const enrichedLeads = leads.map(
      (
        lead: Record<string, string>,
        i: number
      ) => ({
        ...lead,
        id: `${batchId}_${i}`,
        batchId,
        status: "draft",
      })
    );

    return NextResponse.json({
      leads: enrichedLeads,
      batchId,
      count: enrichedLeads.length,
      niche,
      location,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate leads" },
      { status: 500 }
    );
  }
}
