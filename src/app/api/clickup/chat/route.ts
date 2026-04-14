import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CLICKUP_BASE = "https://api.clickup.com/api/v3";

function getConfig() {
  const apiKey = process.env.CLICKUP_API_KEY;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
  return { apiKey, workspaceId };
}

function headers(apiKey: string) {
  return {
    Authorization: apiKey,
    "Content-Type": "application/json",
  };
}

// GET: List channels or messages for a channel
export async function GET(request: NextRequest) {
  const { apiKey, workspaceId } = getConfig();
  if (!apiKey || !workspaceId) {
    return NextResponse.json({ error: "ClickUp not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channel_id");
  const action = searchParams.get("action") || "channels";

  try {
    if (action === "members" && channelId) {
      // Get channel members
      const res = await fetch(
        `${CLICKUP_BASE}/workspaces/${workspaceId}/chat/channels/${channelId}/members`,
        { headers: headers(apiKey) }
      );
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: data.err || "Failed" }, { status: res.status });
      return NextResponse.json({ members: data.data || [] });
    }

    if (action === "messages" && channelId) {
      // Get messages for a channel
      const res = await fetch(
        `${CLICKUP_BASE}/workspaces/${workspaceId}/chat/channels/${channelId}/messages`,
        { headers: headers(apiKey) }
      );
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: data.err || "Failed" }, { status: res.status });
      return NextResponse.json({ messages: data.data || [] });
    }

    // Default: list channels
    const res = await fetch(
      `${CLICKUP_BASE}/workspaces/${workspaceId}/chat/channels`,
      { headers: headers(apiKey) }
    );
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.err || "Failed" }, { status: res.status });
    return NextResponse.json({ channels: data.data || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch from ClickUp" }, { status: 500 });
  }
}

// POST: Send a message to a channel
export async function POST(request: NextRequest) {
  const { apiKey, workspaceId } = getConfig();
  if (!apiKey || !workspaceId) {
    return NextResponse.json({ error: "ClickUp not configured" }, { status: 503 });
  }

  try {
    const { channel_id, content } = await request.json();

    if (!channel_id || !content) {
      return NextResponse.json({ error: "channel_id and content required" }, { status: 400 });
    }

    const res = await fetch(
      `${CLICKUP_BASE}/workspaces/${workspaceId}/chat/channels/${channel_id}/messages`,
      {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify({ content }),
      }
    );

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.err || "Failed to send" }, { status: res.status });
    return NextResponse.json({ message: data });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
