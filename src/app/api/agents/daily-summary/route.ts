import { NextResponse } from "next/server";
import { logClaudeUsage } from "@/lib/claude-usage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SHEET_ID = "1f1sZT-_z-dGFwXzyBY4AbmiQAQCw3GyvY0y88ElKHVU";
const SHEET_NAME = "Daily Summary Data";
const CLICKUP_BASE = "https://api.clickup.com/api/v3";

async function getGoogleAccessToken() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  return data.access_token || null;
}

function formatSummaryForChat(summary: {
  daily_agenda: string[];
  suggestions: string[];
  improvements: string[];
  stats: Record<string, number>;
}, date: string): string {
  let msg = `🤖 **Daily Summary — ${date}**\n\n`;

  msg += `📊 **Stats:** ${summary.stats.open_tasks || 0} open tasks | ${summary.stats.overdue_tasks || 0} overdue | ${summary.stats.active_clients || 0} clients | RM ${(summary.stats.monthly_income || 0).toLocaleString()} income\n\n`;

  msg += `📋 **Daily Agenda:**\n`;
  summary.daily_agenda.forEach((item, i) => {
    msg += `${i + 1}. ${item}\n`;
  });

  msg += `\n💡 **Suggestions:**\n`;
  summary.suggestions.forEach((item, i) => {
    msg += `${i + 1}. ${item}\n`;
  });

  msg += `\n⚠️ **What Needs Improvement:**\n`;
  summary.improvements.forEach((item, i) => {
    msg += `${i + 1}. ${item}\n`;
  });

  return msg;
}

async function sendToClickUpChat(message: string) {
  const apiKey = process.env.CLICKUP_API_KEY;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;

  if (!apiKey || !workspaceId) return false;

  try {
    // Get channels to find the main workspace chat
    const channelsRes = await fetch(
      `${CLICKUP_BASE}/workspaces/${workspaceId}/chat/channels`,
      { headers: { Authorization: apiKey, "Content-Type": "application/json" } }
    );

    if (!channelsRes.ok) return false;

    const channelsData = await channelsRes.json();
    const channels = channelsData.data || [];

    if (channels.length === 0) return false;

    // Send to the first channel (main workspace chat)
    const channelId = channels[0].id;

    const res = await fetch(
      `${CLICKUP_BASE}/workspaces/${workspaceId}/chat/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: { Authorization: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      }
    );

    return res.ok;
  } catch {
    return false;
  }
}

async function fetchDashboardData() {
  const supabase = createServerSupabaseClient();
  const results: Record<string, unknown> = {};

  // Fetch ClickUp tasks directly
  try {
    const apiKey = process.env.CLICKUP_API_KEY;
    const listId = process.env.CLICKUP_LIST_ID_TASKS;
    if (apiKey && listId) {
      const res = await fetch(
        `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=false&subtasks=true`,
        { headers: { Authorization: apiKey }, cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        results.tasks = (data.tasks || []).map((t: Record<string, unknown>) => ({
          id: t.id,
          name: t.name,
          status: (t.status as Record<string, unknown>)?.status || "unknown",
          priority: (t.priority as Record<string, unknown>)?.priority || null,
          due_date: t.due_date ? new Date(Number(t.due_date)).toISOString().split("T")[0] : null,
          assignees: ((t.assignees || []) as Array<Record<string, unknown>>).map((a) => a.username),
          tags: ((t.tags || []) as Array<Record<string, unknown>>).map((tag) => tag.name),
        }));
      }
    }
  } catch {
    results.tasks = [];
  }

  // Fetch clients from Supabase directly
  try {
    const { data } = await supabase
      .from("clients")
      .select("id, name, business, stage, deal_value, notes, created_at")
      .order("created_at", { ascending: false });
    results.clients = data || [];
  } catch {
    results.clients = [];
  }

  // Fetch finance (current month) from Supabase directly
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const { data } = await supabase
      .from("finance_entries")
      .select("id, type, category, description, amount, currency, date")
      .gte("date", `${month}-01`)
      .order("date", { ascending: false });
    results.finance = data || [];
  } catch {
    results.finance = [];
  }

  // Fetch content ideas from Supabase directly
  try {
    const { data } = await supabase
      .from("content_ideas")
      .select("id, topic, status, created_at")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(10);
    results.contentIdeas = data || [];
  } catch {
    results.contentIdeas = [];
  }

  return results;
}

const SYSTEM_PROMPT = `You are the Daily Operations Agent for Flogen AI, a Malaysian AI automation business. You analyze the current state of the dashboard and produce a structured daily briefing.

You will receive raw data from the dashboard: tasks, clients, finance, and content ideas.

Produce a summary in this EXACT JSON format. Return ONLY valid JSON — no markdown, no code fences, no explanation.

{
  "daily_agenda": [
    "Task description here — be specific with names, deadlines, amounts"
  ],
  "suggestions": [
    "Actionable suggestion — tell them exactly what to do and why"
  ],
  "improvements": [
    "What needs improvement — be specific about what's falling behind or needs attention"
  ],
  "stats": {
    "total_tasks": 0,
    "open_tasks": 0,
    "overdue_tasks": 0,
    "active_clients": 0,
    "monthly_income": 0,
    "monthly_expenses": 0,
    "pending_content_ideas": 0
  }
}

Rules:
- daily_agenda: 3-7 items. Focus on what needs to be done TODAY. Prioritize overdue tasks, upcoming deadlines, pending client follow-ups, and content that needs posting.
- suggestions: 3-5 items. Practical actions to improve the business today. Reference specific tasks, clients, or numbers.
- improvements: 3-5 items. What's falling behind, what metrics are concerning, what processes need fixing.
- stats: Pull exact numbers from the data.
- Use MYR for all monetary values.
- Be direct, no fluff. Malaysian business context.
- Today's date is provided — use it to calculate what's overdue or upcoming.`;

// POST: Generate daily summary
export async function POST() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API not configured" }, { status: 503 });
  }

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Google Sheets not configured" }, { status: 503 });
  }

  try {
    // 1. Gather all dashboard data (direct DB queries, no self-referencing HTTP)
    const dashboardData = await fetchDashboardData();

    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const userMessage = `Today is ${dateStr} (Malaysia Time, GMT+8).

Here is the current dashboard data:

TASKS (from ClickUp):
${JSON.stringify(dashboardData.tasks, null, 2)}

CLIENTS:
${JSON.stringify(dashboardData.clients, null, 2)}

FINANCE (this month):
${JSON.stringify(dashboardData.finance, null, 2)}

CONTENT IDEAS (pending):
${JSON.stringify(dashboardData.contentIdeas, null, 2)}

Analyze this data and produce today's daily briefing.`;

    // 2. Call Claude for analysis
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!claudeRes.ok) {
      const error = await claudeRes.text();
      return NextResponse.json({ error: `Claude API error: ${error}` }, { status: claudeRes.status });
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text || "";

    if (claudeData.usage) {
      logClaudeUsage({
        endpoint: "/api/agents/daily-summary",
        model: "claude-sonnet-4-20250514",
        input_tokens: claudeData.usage.input_tokens || 0,
        output_tokens: claudeData.usage.output_tokens || 0,
      });
    }

    // 3. Parse the JSON response
    let summary;
    try {
      summary = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
      }
    }

    // 4. Save to Google Sheets
    const timestamp = today.toISOString();
    const dateShort = today.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    const row = [
      timestamp,
      dateShort,
      JSON.stringify(summary.daily_agenda),
      JSON.stringify(summary.suggestions),
      JSON.stringify(summary.improvements),
      summary.stats?.total_tasks || 0,
      summary.stats?.open_tasks || 0,
      summary.stats?.overdue_tasks || 0,
      summary.stats?.active_clients || 0,
      summary.stats?.monthly_income || 0,
      summary.stats?.monthly_expenses || 0,
      summary.stats?.pending_content_ideas || 0,
      "success",
    ];

    // Ensure sheet exists with headers
    await ensureSheetExists(accessToken);

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:M:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [row] }),
      }
    );

    if (!appendRes.ok) {
      const err = await appendRes.text();
      return NextResponse.json({
        error: `Failed to save to Google Sheets: ${err}`,
        summary,
      }, { status: 500 });
    }

    // 5. Send to ClickUp workspace chat
    const chatMessage = formatSummaryForChat(summary, dateShort);
    const sentToChat = await sendToClickUpChat(chatMessage);

    return NextResponse.json({
      success: true,
      summary,
      date: dateShort,
      saved_to_sheets: true,
      sent_to_clickup: sentToChat,
    });
  } catch (e) {
    // Log error to sheets
    try {
      const accessToken2 = await getGoogleAccessToken();
      if (accessToken2) {
        const errorRow = [
          new Date().toISOString(),
          new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          "[]", "[]", "[]",
          0, 0, 0, 0, 0, 0, 0,
          `error: ${(e as Error).message}`,
        ];
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:M:append?valueInputOption=USER_ENTERED`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken2}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ values: [errorRow] }),
          }
        );
      }
    } catch {
      // Silent fail on error logging
    }

    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function ensureSheetExists(accessToken: string) {
  // Check if the tab exists by trying to read it
  const readRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A1:M1`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (readRes.ok) {
    const data = await readRes.json();
    if (data.values && data.values.length > 0) return; // Tab exists with headers
  }

  // If 400 error, the tab doesn't exist — create it
  if (!readRes.ok) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: { title: SHEET_NAME },
              },
            },
          ],
        }),
      }
    );
  }

  // Add headers
  const headers = [
    "Timestamp", "Date", "Daily Agenda", "Suggestions", "Improvements",
    "Total Tasks", "Open Tasks", "Overdue Tasks", "Active Clients",
    "Monthly Income (MYR)", "Monthly Expenses (MYR)", "Pending Content Ideas", "Status",
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A1:M1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [headers] }),
    }
  );
}

// GET: Fetch summary history from Google Sheets
export async function GET() {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Google Sheets not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Failed to read from Sheets: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const rows = data.values || [];

    if (rows.length <= 1) {
      return NextResponse.json({ summaries: [] });
    }

    // Parse rows into objects (skip header row)
    const summaries = rows.slice(1).reverse().map((row: string[]) => {
      let dailyAgenda: string[] = [];
      let suggestions: string[] = [];
      let improvements: string[] = [];

      try { dailyAgenda = JSON.parse(row[2] || "[]"); } catch { dailyAgenda = []; }
      try { suggestions = JSON.parse(row[3] || "[]"); } catch { suggestions = []; }
      try { improvements = JSON.parse(row[4] || "[]"); } catch { improvements = []; }

      return {
        timestamp: row[0] || "",
        date: row[1] || "",
        daily_agenda: dailyAgenda,
        suggestions,
        improvements,
        stats: {
          total_tasks: parseInt(row[5] || "0"),
          open_tasks: parseInt(row[6] || "0"),
          overdue_tasks: parseInt(row[7] || "0"),
          active_clients: parseInt(row[8] || "0"),
          monthly_income: parseFloat(row[9] || "0"),
          monthly_expenses: parseFloat(row[10] || "0"),
          pending_content_ideas: parseInt(row[11] || "0"),
        },
        status: row[12] || "unknown",
      };
    });

    return NextResponse.json({ summaries });
  } catch {
    return NextResponse.json({ error: "Failed to fetch summaries" }, { status: 500 });
  }
}
