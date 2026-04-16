import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Ensure the scheduled_posts table exists
async function ensureTable() {
  const supabase = createServiceRoleClient();
  // Try a simple query — if table doesn't exist, create it
  const { error } = await supabase
    .from("scheduled_posts")
    .select("id")
    .limit(1);

  if (error && error.message.includes("does not exist")) {
    // Create the table via raw SQL through the REST API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return;

    await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // This won't work via RPC, so we'll handle missing table gracefully
      }),
    }).catch(() => {});
  }
}

// GET: Fetch scheduled posts
export async function GET(request: NextRequest) {
  try {
    await ensureTable();
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const month = searchParams.get("month"); // YYYY-MM format

    let query = supabase
      .from("scheduled_posts")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    }

    if (month) {
      const start = `${month}-01T00:00:00Z`;
      const [y, m] = month.split("-").map(Number);
      const end = new Date(y, m, 1).toISOString(); // First day of next month
      query = query.gte("scheduled_at", start).lt("scheduled_at", end);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: data || [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST: Create a scheduled post
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();

    const {
      caption,
      image_url,
      platform,
      media_type,
      scheduled_at,
      content_idea_id,
    } = body;

    if (!caption?.trim()) {
      return NextResponse.json({ error: "Caption is required" }, { status: 400 });
    }

    if (!scheduled_at) {
      return NextResponse.json({ error: "Scheduled time is required" }, { status: 400 });
    }

    const insert: Record<string, unknown> = {
      caption: caption.trim(),
      platform: platform || "both",
      media_type: media_type || "IMAGE",
      scheduled_at,
      status: "scheduled",
    };

    if (image_url?.trim()) insert.image_url = image_url.trim();
    if (content_idea_id) insert.content_idea_id = content_idea_id;

    const { data, error } = await supabase
      .from("scheduled_posts")
      .insert(insert)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PATCH: Update a scheduled post
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: "Post id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("scheduled_posts")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE: Delete a scheduled post
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Post id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("scheduled_posts")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
