import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Member IDs for auto-assigning calendar events
const TEAM_MEMBERS = {
  WAY_HANN: 107691573,
  VEASEN: 107691572,
  FLOGEN: 306772193,
};

// GET: Fetch upcoming tasks with due dates (calendar view data)
export async function GET(request: NextRequest) {
  const apiKey = process.env.CLICKUP_API_KEY;
  const listId = process.env.CLICKUP_LIST_ID_TASKS;

  if (!apiKey || !listId) {
    return NextResponse.json(
      { error: "ClickUp not configured" },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "14");

    const now = Date.now();
    const futureMs = now + days * 24 * 60 * 60 * 1000;

    // Fetch tasks with due dates from ClickUp
    // Use date_done_gt to filter for upcoming tasks
    const url = new URL(
      `https://api.clickup.com/api/v2/list/${listId}/task`
    );
    url.searchParams.set("include_closed", "false");
    url.searchParams.set("subtasks", "true");
    url.searchParams.set("due_date_gt", String(now - 86400000)); // include today
    url.searchParams.set("due_date_lt", String(futureMs));
    url.searchParams.set("order_by", "due_date");

    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: "Failed to fetch calendar from ClickUp", detail: err },
        { status: res.status }
      );
    }

    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (data.tasks || []).map((task: any) => ({
      id: task.id,
      name: task.name,
      description: task.description || null,
      status: task.status?.status || "unknown",
      statusColor: task.status?.color || "#6B7280",
      priority: task.priority?.priority || null,
      priorityColor: task.priority?.color || null,
      dueDate: task.due_date ? parseInt(task.due_date) : null,
      startDate: task.start_date ? parseInt(task.start_date) : null,
      assignees: (task.assignees || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any) => ({
          id: a.id,
          username: a.username,
          initials: a.initials,
          profilePicture: a.profilePicture,
        })
      ),
      tags: (task.tags || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (t: any) => ({ name: t.name, bg: t.tag_bg, fg: t.tag_fg })
      ),
      url: task.url,
    }));

    // Sort by due date
    events.sort(
      (a: { dueDate: number | null }, b: { dueDate: number | null }) =>
        (a.dueDate || Infinity) - (b.dueDate || Infinity)
    );

    // Also get the ClickUp calendar URL for linking
    const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
    const calendarUrl = workspaceId
      ? `https://app.clickup.com/${workspaceId}/calendar`
      : "https://app.clickup.com";

    return NextResponse.json({
      events,
      total: events.length,
      calendarUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to ClickUp" },
      { status: 500 }
    );
  }
}

// POST: Create a calendar event (task with due date) and assign to team
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
    const {
      name,
      description,
      dueDate,
      startDate,
      priority,
      assignToTeam = true,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Event name is required" },
        { status: 400 }
      );
    }

    if (!dueDate) {
      return NextResponse.json(
        { error: "Due date is required for calendar events" },
        { status: 400 }
      );
    }

    // Build assignees list — always include Way Hann and Veasen
    const assignees = assignToTeam
      ? [TEAM_MEMBERS.WAY_HANN, TEAM_MEMBERS.VEASEN]
      : [];

    // Create the task in ClickUp
    const taskPayload: Record<string, unknown> = {
      name: name.trim(),
      assignees,
      due_date: dueDate, // millisecond timestamp
      due_date_time: true,
      notify_all: true, // This sends notifications/invitations to assignees
    };

    if (description) taskPayload.description = description;
    if (startDate) {
      taskPayload.start_date = startDate;
      taskPayload.start_date_time = true;
    }
    if (priority) taskPayload.priority = priority; // 1=urgent, 2=high, 3=normal, 4=low

    // Add a "calendar" tag to distinguish calendar events
    taskPayload.tags = ["calendar-event"];

    const res = await fetch(
      `https://api.clickup.com/api/v2/list/${listId}/task`,
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskPayload),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: "Failed to create event in ClickUp", detail: err },
        { status: res.status }
      );
    }

    const task = await res.json();

    return NextResponse.json(
      {
        success: true,
        event: {
          id: task.id,
          name: task.name,
          url: task.url,
          dueDate: task.due_date,
          assignees: (task.assignees || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (a: any) => a.username
          ),
        },
        message: `Event created and assigned to Way Hann & Veasen`,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}
