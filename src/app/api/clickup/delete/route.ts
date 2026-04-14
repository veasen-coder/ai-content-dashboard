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
    const { task_id } = await request.json();

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://api.clickup.com/api/v2/task/${task_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to delete task in ClickUp" },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to ClickUp" },
      { status: 500 }
    );
  }
}
