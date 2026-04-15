import { NextRequest, NextResponse } from "next/server";
import { buildClientProgressPrompt } from "@/lib/client-progress-prompt";

export const maxDuration = 10;

// Pure template — zero token cost. Returns a prompt string the user
// pastes into Claude Code/claude.ai alongside their screenshots for a
// specific client's progress update.

export async function POST(request: NextRequest) {
  try {
    const { client, notes, image_count } = await request.json();

    if (!client?.name) {
      return NextResponse.json(
        { error: "client context with name is required" },
        { status: 400 }
      );
    }

    const prompt = buildClientProgressPrompt(
      client,
      image_count || "N",
      notes
    );

    return NextResponse.json({ prompt });
  } catch {
    return NextResponse.json(
      { error: "Failed to build prompt" },
      { status: 500 }
    );
  }
}
