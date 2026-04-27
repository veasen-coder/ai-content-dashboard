import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TASK_SELECT =
  "id, title, description, status, priority, due_date, member_id, event_id, needs_qc, created_at, updated_at, member:members(id, name, initials, color_hex, bg_hex, role)";

const STATUSES = ["todo", "in-progress", "blocked", "done"] as const;
const PRIORITIES = ["normal", "high"] as const;

type Status = (typeof STATUSES)[number];
type Priority = (typeof PRIORITIES)[number];

function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}
function isPriority(v: unknown): v is Priority {
  return typeof v === "string" && (PRIORITIES as readonly string[]).includes(v);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    let query = supabase.from("tasks").select(TASK_SELECT);

    const status = searchParams.get("status");
    const memberId = searchParams.get("member_id");
    const eventId = searchParams.get("event_id");

    if (status && isStatus(status)) query = query.eq("status", status);
    if (memberId) query = query.eq("member_id", memberId);
    if (eventId) query = query.eq("event_id", eventId);

    const { data, error } = await query
      .order("status", { ascending: true })
      .order("priority", { ascending: false })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch tasks", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const {
      title,
      description,
      status,
      priority,
      due_date,
      member_id,
      event_id,
      needs_qc,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (!member_id) {
      return NextResponse.json(
        { error: "Assignee (member_id) is required" },
        { status: 400 }
      );
    }

    const insert = {
      title: title.trim(),
      description: description?.trim() || null,
      status: isStatus(status) ? status : "todo",
      priority: isPriority(priority) ? priority : "normal",
      due_date: due_date || null,
      member_id,
      event_id: event_id || null,
      needs_qc: !!needs_qc,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(insert)
      .select(TASK_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create task", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing task id" }, { status: 400 });
    }

    // Whitelist updatable fields
    const updates: Record<string, unknown> = {};
    if ("title" in rest) updates.title = String(rest.title || "").trim();
    if ("description" in rest)
      updates.description = rest.description?.trim?.() || rest.description || null;
    if ("status" in rest && isStatus(rest.status)) updates.status = rest.status;
    if ("priority" in rest && isPriority(rest.priority))
      updates.priority = rest.priority;
    if ("due_date" in rest) updates.due_date = rest.due_date || null;
    if ("member_id" in rest && rest.member_id) updates.member_id = rest.member_id;
    if ("event_id" in rest) updates.event_id = rest.event_id || null;
    if ("needs_qc" in rest) updates.needs_qc = !!rest.needs_qc;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select(TASK_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update task", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing task id" }, { status: 400 });
    }

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete task", detail: String(err) },
      { status: 500 }
    );
  }
}
