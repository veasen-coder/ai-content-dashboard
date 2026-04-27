import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SELECT = "id, title, category, url, description, icon, created_at, updated_at";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("resources")
      .select(SELECT)
      .order("category", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const { title, category, url, description, icon } = body;

    if (!title?.trim() || !url?.trim()) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("resources")
      .insert({
        title: title.trim(),
        category: category || "general",
        url: url.trim(),
        description: description?.trim() || null,
        icon: icon || null,
      })
      .select(SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to create resource" },
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
      return NextResponse.json({ error: "Missing resource id" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if ("title" in rest) updates.title = String(rest.title || "").trim();
    if ("category" in rest) updates.category = rest.category || "general";
    if ("url" in rest) updates.url = String(rest.url || "").trim();
    if ("description" in rest)
      updates.description = rest.description?.trim?.() || rest.description || null;
    if ("icon" in rest) updates.icon = rest.icon || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("resources")
      .update(updates)
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to update resource" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing resource id" }, { status: 400 });
    }

    const { error } = await supabase.from("resources").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete resource" },
      { status: 500 }
    );
  }
}
