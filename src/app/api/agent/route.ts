import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured. Go to Settings → API Keys and add it, then redeploy on Vercel." },
      { status: 400 }
    );
  }

  const { systemPrompt, userMessage, maxTokens = 1200 } = await req.json();

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const content = msg.content[0].type === "text" ? msg.content[0].text : "";
    return Response.json({ content });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return Response.json({ error: e.message ?? "Agent call failed" }, { status: e.status ?? 500 });
  }
}
