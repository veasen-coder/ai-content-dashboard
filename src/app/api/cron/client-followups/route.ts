import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CLICKUP_V3 = "https://api.clickup.com/api/v3";
const CHANNEL_ID = "7-90182500820-8"; // Flogen's Workspace channel
const STALE_DAYS = 2; // Remind after 2 days without contact

interface Client {
  id: string;
  name: string;
  business: string | null;
  stage: string;
  deal_value: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
}

function daysSince(dateStr: string): number {
  const now = new Date();
  const date = new Date(dateStr);
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  contacted: "Contacted",
  demo_sent: "Demo Sent",
  negotiation: "Negotiation",
};

const STAGE_ACTIONS: Record<string, string> = {
  lead: "Send intro message",
  contacted: "Schedule a demo call",
  demo_sent: "Follow up on the demo",
  negotiation: "Send proposal or check in",
};

// Build a rich ClickUp chat message with all overdue clients
function buildMessage(staleClients: { client: Client; days: number }[]): string {
  const lines: string[] = [];

  lines.push("🔔 **Client Follow-Up Reminder**\n");
  lines.push(`${staleClients.length} client${staleClients.length > 1 ? "s" : ""} need${staleClients.length === 1 ? "s" : ""} follow-up:\n`);

  for (const { client, days } of staleClients) {
    const name = client.business
      ? `**${client.name}** (${client.business})`
      : `**${client.name}**`;
    const stage = STAGE_LABELS[client.stage] || client.stage;
    const action = STAGE_ACTIONS[client.stage] || "Follow up";
    const deal = client.deal_value ? ` · ${client.deal_value}` : "";
    const stalled = client.status === "stalled" ? " ⚠️ STALLED" : "";

    lines.push(`• ${name} — ${days}d since last contact${stalled}`);
    lines.push(`  Stage: ${stage}${deal}`);
    lines.push(`  → ${action}\n`);
  }

  lines.push("---");
  lines.push("_Auto-generated daily by Flogen AI_");

  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.CLICKUP_API_KEY;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
  if (!apiKey || !workspaceId) {
    return NextResponse.json({ error: "ClickUp not configured" }, { status: 503 });
  }

  try {
    // Test mode: send a sample message to verify it sends as Flogen AI
    const isTest = new URL(request.url).searchParams.get("test") === "true";
    if (isTest) {
      const testMessage = buildMessage([
        {
          client: {
            id: "test",
            name: "The Great Haus Sdn Bhd",
            business: "Interior Design",
            stage: "negotiation",
            deal_value: "RM 399,899",
            status: "stalled",
            updated_at: null,
            created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
          days: 8,
        },
        {
          client: {
            id: "test2",
            name: "Bella Hair Studio",
            business: null,
            stage: "demo_sent",
            deal_value: "RM 1,200/mo",
            status: "active",
            updated_at: null,
            created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
          },
          days: 4,
        },
        {
          client: {
            id: "test3",
            name: "KL Fresh Bites",
            business: "F&B",
            stage: "lead",
            deal_value: null,
            status: "active",
            updated_at: null,
            created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
          days: 2,
        },
      ]);

      const testRes = await fetch(
        `${CLICKUP_V3}/workspaces/${workspaceId}/chat/channels/${CHANNEL_ID}/messages`,
        {
          method: "POST",
          headers: { Authorization: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ content: testMessage }),
        }
      );

      if (!testRes.ok) {
        const err = await testRes.json();
        return NextResponse.json({ error: `Test failed: ${err.err || testRes.status}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Test reminder sent as Flogen AI" });
    }

    // 1. Fetch all active pipeline clients (not closed)
    const supabase = createServerSupabaseClient();
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, name, business, stage, deal_value, status, updated_at, created_at")
      .neq("stage", "closed")
      .order("updated_at", { ascending: true, nullsFirst: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, message: "No active clients", sent: 0 });
    }

    // 2. Find clients that are 2+ days without contact
    const staleClients: { client: Client; days: number }[] = [];
    for (const client of clients) {
      const lastContact = client.updated_at || client.created_at;
      const days = daysSince(lastContact);
      if (days >= STALE_DAYS) {
        staleClients.push({ client, days });
      }
    }

    if (staleClients.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All clients contacted recently",
        sent: 0,
      });
    }

    // Sort by most overdue first
    staleClients.sort((a, b) => b.days - a.days);

    // 3. Send a single consolidated message to ClickUp chat
    const message = buildMessage(staleClients);

    const res = await fetch(
      `${CLICKUP_V3}/workspaces/${workspaceId}/chat/channels/${CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: message }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: `ClickUp message failed: ${err.err || res.status}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Sent follow-up reminders for ${staleClients.length} client(s)`,
      clients: staleClients.map((s) => ({
        name: s.client.name,
        days: s.days,
        stage: s.client.stage,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
