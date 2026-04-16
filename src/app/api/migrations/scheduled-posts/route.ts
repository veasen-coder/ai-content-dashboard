import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// One-time migration: create scheduled_posts table
// Call GET /api/migrations/scheduled-posts to run
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Check if table already exists
    const { error: checkError } = await supabase
      .from("scheduled_posts")
      .select("id")
      .limit(1);

    if (!checkError) {
      return NextResponse.json({ message: "Table already exists" });
    }

    // Create table using Supabase's SQL via rpc or raw query
    // Since we can't run raw DDL via the JS client, we'll use the REST API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const sql = `
      CREATE TABLE IF NOT EXISTS scheduled_posts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        caption TEXT NOT NULL,
        image_url TEXT,
        platform TEXT NOT NULL DEFAULT 'both',
        media_type TEXT NOT NULL DEFAULT 'IMAGE',
        scheduled_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        content_idea_id UUID REFERENCES content_ideas(id) ON DELETE SET NULL,
        published_at TIMESTAMPTZ,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Allow all for authenticated" ON scheduled_posts
        FOR ALL USING (true) WITH CHECK (true);

      CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
      CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
    `;

    // Use the Supabase SQL endpoint
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!res.ok) {
      // Fallback: try the postgres endpoint directly
      const pgRes = await fetch(`${supabaseUrl}/pg`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!pgRes.ok) {
        return NextResponse.json({
          error: "Could not create table automatically. Please run the SQL manually in Supabase Dashboard.",
          sql,
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: "scheduled_posts table created" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
