import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Query params:
//   ?client_id=<uuid>  → dumps for that client only
//   ?client_id=none    → global dumps (client_id IS NULL)  — used by image-summary
//   (no param)         → all dumps (legacy / admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const clientIdParam = request.nextUrl.searchParams.get("client_id");

    let query = supabase
      .from("image_dumps")
      .select("*")
      .order("created_at", { ascending: false });

    if (clientIdParam === "none") {
      query = query.is("client_id", null);
    } else if (clientIdParam) {
      query = query.eq("client_id", clientIdParam);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch image dumps" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("image_dumps")
      .insert({
        title: body.title || null,
        notes: body.notes || null,
        status: "pending",
        client_id: body.client_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create image dump" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Image dump id is required" },
        { status: 400 }
      );
    }

    const { id, ...fields } = body;

    const { data, error } = await supabase
      .from("image_dumps")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to update image dump" },
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
        { error: "Image dump id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("image_dumps")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete image dump" },
      { status: 500 }
    );
  }
}
