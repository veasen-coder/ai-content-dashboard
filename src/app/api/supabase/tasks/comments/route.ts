import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SELECT =
  "id, task_id, member_id, content, created_at, member:members(id, name, initials, color_hex, bg_hex)";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");
    if (!taskId) {
      return NextResponse.json(
        { error: "Missing task_id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("task_comments")
      .select(SELECT)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch comments", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { task_id, member_id, content } = body;

    if (!task_id || !member_id || !content?.trim()) {
      return NextResponse.json(
        { error: "task_id, member_id, and content are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("task_comments")
      .insert({ task_id, member_id, content: content.trim() })
      .select(SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to add comment", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const { error } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete comment", detail: String(err) },
      { status: 500 }
    );
  }
}
