import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.CLICKUP_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ClickUp not configured" },
      { status: 503 }
    );
  }

  try {
    const { task_id, ...fields } = await request.json();

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://api.clickup.com/api/v2/task/${task_id}`,
      {
        method: "PUT",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fields),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to update task in ClickUp" },
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
