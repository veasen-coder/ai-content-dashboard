import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API not configured" },
      { status: 503 }
    );
  }

  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Parse base64 image — expects "data:image/png;base64,..." format
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid image format. Expected base64 data URI." },
        { status: 400 }
      );
    }

    const mediaType = match[1];
    const base64Data = match[2];

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
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: `Extract the following from this receipt/payment screenshot and return ONLY valid JSON (no markdown, no code blocks, just the raw JSON object):
{
  "type": "income" or "expense" (determine from context — if it's a payment made or bill, it's expense; if it's money received, it's income),
  "amount": number (the total/main amount — use the numeric value only, no currency symbols),
  "description": "string (merchant name, payment description, or what the transaction is for)",
  "date": "YYYY-MM-DD" (extract from the receipt, or use today if not visible),
  "category": "string (one of: Client Payment, Consultation, Recurring Revenue, Other Income, Tools/Subscriptions, Marketing, Operations, Salary, Office, Other Expense)"
}

If you cannot determine a field with confidence, make your best guess based on context. Always return valid JSON.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: `Claude API error: ${error}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    // Parse the JSON response from Claude
    try {
      const extracted = JSON.parse(text);
      return NextResponse.json(extracted);
    } catch {
      // Try to extract JSON from the response if Claude wrapped it
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        return NextResponse.json(extracted);
      }
      return NextResponse.json(
        { error: "Failed to parse receipt data", raw: text },
        { status: 422 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to extract receipt data" },
      { status: 500 }
    );
  }
}
