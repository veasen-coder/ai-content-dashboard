import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.CLICKUP_API_KEY;
  const listId = process.env.CLICKUP_LIST_ID_TASKS;

  if (!apiKey || !listId) {
    return NextResponse.json(
      { error: "ClickUp not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const res = await fetch(
      `https://api.clickup.com/api/v2/list/${listId}/task`,
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to create task in ClickUp" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to ClickUp" },
      { status: 500 }
    );
  }
}
