import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.CLICKUP_API_KEY;
  const listId = process.env.CLICKUP_LIST_ID_TASKS;

  if (!apiKey || !listId) {
    return NextResponse.json(
      { error: "ClickUp not configured", apiKey: !!apiKey, listId: !!listId },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true`,
      {
        headers: { Authorization: apiKey },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: "Failed to fetch tasks from ClickUp", detail: errorText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to connect to ClickUp", detail: String(err) },
      { status: 500 }
    );
  }
}
