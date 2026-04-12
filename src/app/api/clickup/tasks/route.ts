import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.CLICKUP_API_KEY;
  const listId = process.env.CLICKUP_LIST_ID_TASKS;

  if (!apiKey || !listId) {
    return NextResponse.json(
      { error: "ClickUp not configured" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true`,
      {
        headers: { Authorization: apiKey },
        next: { revalidate: 120 },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch tasks from ClickUp" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to ClickUp" },
      { status: 500 }
    );
  }
}
