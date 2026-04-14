import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const dumpId = request.nextUrl.searchParams.get("dump_id");

    if (!dumpId) {
      return NextResponse.json(
        { error: "dump_id query param is required" },
        { status: 400 }
      );
    }

    const includeData = request.nextUrl.searchParams.get("include_data") === "true";
    const columns = includeData
      ? "*"
      : "id, dump_id, file_name, mime_type, sort_order, created_at";

    const { data, error } = await supabase
      .from("image_dump_items")
      .select(columns)
      .eq("dump_id", dumpId)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch image dump items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    if (!body.dump_id || !body.items?.length) {
      return NextResponse.json(
        { error: "dump_id and items array are required" },
        { status: 400 }
      );
    }

    const rows = body.items.map(
      (
        item: { file_name?: string; mime_type: string; base64_data: string },
        i: number
      ) => ({
        dump_id: body.dump_id,
        file_name: item.file_name || null,
        mime_type: item.mime_type,
        base64_data: item.base64_data,
        sort_order: i,
      })
    );

    const { data, error } = await supabase
      .from("image_dump_items")
      .insert(rows)
      .select("id, dump_id, file_name, mime_type, sort_order, created_at");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload image dump items" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Item id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("image_dump_items")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete image dump item" },
      { status: 500 }
    );
  }
}
