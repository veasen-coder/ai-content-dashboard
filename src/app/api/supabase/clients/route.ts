import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    const insert: Record<string, unknown> = {
      name: body.name.trim(),
      stage: body.stage || "lead",
    };

    if (body.business) insert.business = body.business.trim();
    if (body.email) insert.email = body.email.trim();
    if (body.phone) insert.phone = body.phone.trim();
    if (body.notes) insert.notes = body.notes.trim();
    if (body.industry) insert.industry = body.industry;
    if (body.source) insert.source = body.source;
    if (body.deal_value) insert.deal_value = body.deal_value.trim();
    if (body.close_probability !== undefined) insert.close_probability = body.close_probability;
    if (body.status) insert.status = body.status;
    if (body.onboarding_checklist) insert.onboarding_checklist = body.onboarding_checklist;

    const { data, error } = await supabase
      .from("clients")
      .insert(insert)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create client" },
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
        { error: "Client id is required" },
        { status: 400 }
      );
    }

    const { id, ...fields } = body;

    const { data, error } = await supabase
      .from("clients")
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
      { error: "Failed to update client" },
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
        { error: "Client id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
