import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { systemPrompt, userMessage, maxTokens = 1200, apiKey: clientKey, model } = await req.json();

  // Use client-provided key (from Settings page) or fall back to env var
  const key = clientKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json(
      { error: "No API key configured. Go to Settings → AI Behaviour and add your Anthropic API key." },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey: key });
  const selectedModel = model || "claude-sonnet-4-5";

  try {
    const msg = await client.messages.create({
      model: selectedModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const content = msg.content[0].type === "text" ? msg.content[0].text : "";
    return Response.json({
      content,
      usage: {
        input_tokens: msg.usage.input_tokens,
        output_tokens: msg.usage.output_tokens,
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return Response.json({ error: e.message ?? "Agent call failed" }, { status: e.status ?? 500 });
  }
}
