import { NextRequest } from "next/server";
import { logClaudeUsage } from "@/lib/claude-usage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// --------------- Dashboard data fetcher (direct DB, no self-referencing) ---------------

async function fetchDashboardContext() {
  const supabase = createServerSupabaseClient();
  const results: Record<string, unknown> = {};

  const fetchers: Array<{ key: string; fn: () => Promise<unknown> }> = [
    {
      key: "clients",
      fn: async () => {
        const { data } = await supabase
          .from("clients")
          .select("id, name, business, email, phone, stage, notes, deal_value, close_probability, industry, source, status, created_at")
          .order("created_at", { ascending: false });
        return data || [];
      },
    },
    {
      key: "finance",
      fn: async () => {
        const month = new Date().toISOString().substring(0, 7);
        const { data } = await supabase
          .from("finance_entries")
          .select("id, type, category, description, amount, currency, account, date")
          .gte("date", `${month}-01`)
          .order("date", { ascending: false })
          .limit(50);
        return data || [];
      },
    },
    {
      key: "balances",
      fn: async () => {
        const { data } = await supabase
          .from("account_balances")
          .select("account, balance, updated_at");
        return data || [];
      },
    },
    {
      key: "tasks",
      fn: async () => {
        const apiKey = process.env.CLICKUP_API_KEY;
        const listId = process.env.CLICKUP_LIST_ID_TASKS;
        if (!apiKey || !listId) return [];
        const res = await fetch(
          `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=false&subtasks=true`,
          { headers: { Authorization: apiKey }, cache: "no-store" }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.tasks || []).map((t: Record<string, unknown>) => ({
          id: t.id,
          name: t.name,
          status: (t.status as Record<string, unknown>)?.status || "unknown",
          priority: (t.priority as Record<string, unknown>)?.priority || null,
          due_date: t.due_date ? new Date(Number(t.due_date)).toISOString().split("T")[0] : null,
          tags: ((t.tags || []) as Array<Record<string, unknown>>).map((tag) => tag.name),
        }));
      },
    },
    {
      key: "metrics",
      fn: async () => {
        // Compute metrics directly instead of calling own API
        const { data: entries } = await supabase
          .from("finance_entries")
          .select("type, category, amount, date, description")
          .order("date", { ascending: true });

        const { data: clients } = await supabase
          .from("clients")
          .select("id, stage, deal_value, close_probability");

        const allEntries = entries || [];
        const allClients = clients || [];

        const totalIncome = allEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
        const totalExpense = allEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);

        // Monthly breakdown
        const monthlyMap = new Map<string, { income: number; expense: number }>();
        for (const e of allEntries) {
          const m = e.date?.substring(0, 7);
          if (!m) continue;
          const cur = monthlyMap.get(m) || { income: 0, expense: 0 };
          if (e.type === "income") cur.income += e.amount;
          else if (e.type === "expense") cur.expense += e.amount;
          monthlyMap.set(m, cur);
        }

        const currentMonth = new Date().toISOString().substring(0, 7);
        const thisMonth = monthlyMap.get(currentMonth) || { income: 0, expense: 0 };

        // Pipeline
        const pipelineValue = allClients
          .filter((c) => c.stage !== "closed")
          .reduce((s, c) => {
            if (!c.deal_value) return s;
            const n = parseFloat(String(c.deal_value).replace(/[^0-9.]/g, ""));
            return s + (isNaN(n) ? 0 : n);
          }, 0);

        return {
          totalIncome: Math.round(totalIncome * 100) / 100,
          totalExpense: Math.round(totalExpense * 100) / 100,
          totalProfit: Math.round((totalIncome - totalExpense) * 100) / 100,
          thisMonthIncome: Math.round(thisMonth.income * 100) / 100,
          thisMonthExpense: Math.round(thisMonth.expense * 100) / 100,
          pipelineValue: Math.round(pipelineValue * 100) / 100,
          totalClients: allClients.length,
        };
      },
    },
    {
      key: "resources",
      fn: async () => {
        const { data } = await supabase
          .from("resources")
          .select("id, title, category, type, url, description, is_pinned")
          .order("is_pinned", { ascending: false })
          .limit(20);
        return data || [];
      },
    },
  ];

  await Promise.all(
    fetchers.map(async ({ key, fn }) => {
      try {
        results[key] = await fn();
      } catch {
        results[key] = null;
      }
    })
  );

  return results;
}

// --------------- Tool definitions ---------------

const TOOLS = [
  {
    name: "create_task",
    description: "Create a new task in ClickUp. Use when user wants to add a task, to-do, or action item.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" as const, description: "Task name" },
        description: { type: "string" as const, description: "Task description (optional)" },
        priority: { type: "number" as const, description: "1=urgent, 2=high, 3=normal, 4=low (optional)" },
        due_date: { type: "string" as const, description: "Due date YYYY-MM-DD (optional)" },
        tags: { type: "array" as const, items: { type: "string" as const }, description: "Tags (optional)" },
      },
      required: ["name"],
    },
  },
  {
    name: "add_client",
    description: "Add a new client to CRM pipeline.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" as const, description: "Client contact name" },
        business: { type: "string" as const, description: "Business name (optional)" },
        email: { type: "string" as const, description: "Email (optional)" },
        phone: { type: "string" as const, description: "Phone (optional)" },
        stage: { type: "string" as const, description: "Pipeline stage: lead, book_call, call, thank_you, meeting_minutes, demo, follow_up, closing, onboarding, active, churned. Default: lead" },
        notes: { type: "string" as const, description: "Notes (optional)" },
        industry: { type: "string" as const, description: "Industry (optional)" },
        source: { type: "string" as const, description: "Lead source (optional)" },
        deal_value: { type: "string" as const, description: "Deal value e.g. '5000' (optional)" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_client",
    description: "Update an existing client in the CRM. Use when user wants to rename, change stage, update details of an existing client.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" as const, description: "Client UUID (look it up from the dashboard data)" },
        name: { type: "string" as const, description: "New name (optional)" },
        business: { type: "string" as const, description: "New business name (optional)" },
        email: { type: "string" as const, description: "New email (optional)" },
        phone: { type: "string" as const, description: "New phone (optional)" },
        stage: { type: "string" as const, description: "New pipeline stage (optional)" },
        notes: { type: "string" as const, description: "New notes (optional)" },
        deal_value: { type: "string" as const, description: "New deal value (optional)" },
      },
      required: ["id"],
    },
  },
  {
    name: "add_finance_entry",
    description: "Add an income or expense entry to finance tracking.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string" as const, description: "income or expense" },
        category: { type: "string" as const, description: "Category: Client Payment, Consultation, Recurring Revenue, Other Income, Tools/Subscriptions, Marketing, Operations, Salary, Office, Other Expense" },
        description: { type: "string" as const, description: "Description" },
        amount: { type: "number" as const, description: "Amount in MYR" },
        account: { type: "string" as const, description: "Account: ocbc, paypal, or stripe (optional)" },
        date: { type: "string" as const, description: "Date YYYY-MM-DD. Default: today" },
      },
      required: ["type", "description", "amount"],
    },
  },
  {
    name: "create_calendar_event",
    description: "Create a task in ClickUp with a due date to act as a calendar event / meeting / schedule entry.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" as const, description: "Event/meeting name" },
        description: { type: "string" as const, description: "Details, location, attendees, etc." },
        date: { type: "string" as const, description: "Date in YYYY-MM-DD format" },
        time: { type: "string" as const, description: "Time in HH:MM 24h format (optional)" },
        tags: { type: "array" as const, items: { type: "string" as const }, description: "Tags like 'meeting', 'call' (optional)" },
      },
      required: ["name", "date"],
    },
  },
  {
    name: "send_email",
    description: "Send an email via Gmail. ALWAYS show the draft to the user and get confirmation before using this tool.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string" as const, description: "Recipient email" },
        subject: { type: "string" as const, description: "Subject" },
        body: { type: "string" as const, description: "Email body (HTML allowed)" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "get_fresh_data",
    description: "Refresh live data from a specific dashboard section.",
    input_schema: {
      type: "object" as const,
      properties: {
        section: { type: "string" as const, description: "Which data: tasks, clients, finance, balances, metrics, resources" },
      },
      required: ["section"],
    },
  },
];

// --------------- Tool executor ---------------

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const supabase = createServerSupabaseClient();

  try {
    switch (name) {
      case "create_task": {
        const apiKey = process.env.CLICKUP_API_KEY;
        const listId = process.env.CLICKUP_LIST_ID_TASKS;
        if (!apiKey || !listId) return JSON.stringify({ error: "ClickUp not configured" });

        const body: Record<string, unknown> = { name: input.name };
        if (input.description) body.description = input.description;
        if (input.priority) body.priority = input.priority;
        if (input.due_date) {
          body.due_date = new Date(input.due_date as string).getTime();
          body.due_date_time = false;
        }
        if (input.tags) body.tags = input.tags;

        const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
          method: "POST",
          headers: { Authorization: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return JSON.stringify({ error: "Failed to create task", status: res.status });
        const data = await res.json();
        return JSON.stringify({ success: true, task_id: data.id, name: data.name, url: data.url });
      }

      case "add_client": {
        const insert: Record<string, unknown> = { name: input.name, stage: input.stage || "lead" };
        if (input.business) insert.business = input.business;
        if (input.email) insert.email = input.email;
        if (input.phone) insert.phone = input.phone;
        if (input.notes) insert.notes = input.notes;
        if (input.industry) insert.industry = input.industry;
        if (input.source) insert.source = input.source;
        if (input.deal_value) insert.deal_value = input.deal_value;

        const { data, error } = await supabase.from("clients").insert(insert).select().single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, client_id: data.id, name: data.name, stage: data.stage });
      }

      case "update_client": {
        const { id, ...fields } = input;
        if (!id) return JSON.stringify({ error: "Client ID required" });

        const { data, error } = await supabase
          .from("clients")
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, client_id: data.id, name: data.name, stage: data.stage, business: data.business });
      }

      case "add_finance_entry": {
        const entry = {
          type: input.type,
          category: input.category || (input.type === "income" ? "Other Income" : "Other Expense"),
          description: input.description,
          amount: parseFloat(String(input.amount)),
          currency: "MYR",
          account: input.account || null,
          date: input.date || new Date().toISOString().split("T")[0],
        };

        const { data, error } = await supabase.from("finance_entries").insert(entry).select().single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, entry_id: data.id, type: data.type, amount: data.amount, description: data.description });
      }

      case "create_calendar_event": {
        const apiKey = process.env.CLICKUP_API_KEY;
        const listId = process.env.CLICKUP_LIST_ID_TASKS;
        if (!apiKey || !listId) return JSON.stringify({ error: "ClickUp not configured" });

        const dueDate = new Date(input.date as string);
        if (input.time) {
          const [h, m] = (input.time as string).split(":").map(Number);
          dueDate.setHours(h, m, 0, 0);
        }

        const body: Record<string, unknown> = {
          name: input.name,
          description: input.description || "",
          due_date: dueDate.getTime(),
          due_date_time: !!input.time,
          tags: [...((input.tags as string[]) || []), "calendar"],
        };

        const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
          method: "POST",
          headers: { Authorization: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return JSON.stringify({ error: "Failed to create calendar event" });
        const data = await res.json();
        return JSON.stringify({ success: true, task_id: data.id, name: data.name, url: data.url, due_date: input.date, time: input.time || "all day" });
      }

      case "send_email": {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/gmail/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) return JSON.stringify({ error: "Failed to send email" });
        const data = await res.json();
        return JSON.stringify({ success: true, messageId: data.messageId || data.id });
      }

      case "get_fresh_data": {
        const ctx = await fetchDashboardContext();
        const section = input.section as string;
        if (ctx[section] !== undefined) return JSON.stringify(ctx[section]);
        return JSON.stringify({ error: `Unknown section: ${section}` });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}` });
  }
}

// --------------- Build system prompt ---------------

function buildSystemPrompt(context: Record<string, unknown>): string {
  const today = new Date().toISOString().split("T")[0];
  const clients = (context.clients as Array<Record<string, unknown>>) || [];
  const tasks = (context.tasks as Array<Record<string, unknown>>) || [];
  const finance = (context.finance as Array<Record<string, unknown>>) || [];
  const balances = (context.balances as Array<Record<string, unknown>>) || [];
  const metrics = (context.metrics as Record<string, unknown>) || {};
  const resources = (context.resources as Array<Record<string, unknown>>) || [];

  // Summarize clients by stage
  const stageCount: Record<string, number> = {};
  for (const c of clients) {
    const stage = (c.stage as string) || "unknown";
    stageCount[stage] = (stageCount[stage] || 0) + 1;
  }

  // Summarize tasks by status
  const statusCount: Record<string, number> = {};
  const overdueTasks: string[] = [];
  for (const t of tasks) {
    const status = (t.status as string) || "unknown";
    statusCount[status] = (statusCount[status] || 0) + 1;
    if (t.due_date && (t.due_date as string) < today && status !== "complete" && status !== "closed") {
      overdueTasks.push(t.name as string);
    }
  }

  // Finance summary
  let monthIncome = 0;
  let monthExpense = 0;
  for (const f of finance) {
    if (f.type === "income") monthIncome += (f.amount as number) || 0;
    if (f.type === "expense") monthExpense += (f.amount as number) || 0;
  }

  return `You are the Flogen AI Dashboard Mastermind — the central intelligence hub for Flogen AI, a Malaysian AI automation business run by Veasen.

TODAY: ${today}
CURRENCY: All amounts in MYR (Malaysian Ringgit) unless stated otherwise.

═══ LIVE DASHBOARD DATA ═══

📋 TASKS (ClickUp) — ${tasks.length} open tasks
Status: ${Object.entries(statusCount).map(([s, c]) => `${s}: ${c}`).join(", ") || "none"}
${overdueTasks.length > 0 ? `⚠️ OVERDUE: ${overdueTasks.join(", ")}` : "No overdue tasks"}
${tasks.slice(0, 15).map((t) => `- [${t.status}]${t.priority ? ` P${t.priority}` : ""} ${t.name}${t.due_date ? ` (due: ${t.due_date})` : ""} [id:${t.id}]`).join("\n") || "None loaded"}

👥 CLIENTS — ${clients.length} total
Pipeline: ${Object.entries(stageCount).map(([s, c]) => `${s}: ${c}`).join(", ") || "empty"}
${clients.slice(0, 20).map((c) => `- ${c.name}${c.business ? ` (${c.business})` : ""} — stage: ${c.stage}${c.deal_value ? `, deal: RM${c.deal_value}` : ""}${c.email ? `, ${c.email}` : ""} [id:${c.id}]`).join("\n") || "None"}

💰 FINANCE (This Month)
Income: RM${monthIncome.toFixed(2)} | Expenses: RM${monthExpense.toFixed(2)} | Net: RM${(monthIncome - monthExpense).toFixed(2)}
${balances.length > 0 ? `Balances: ${balances.map((b) => `${(b.account as string).toUpperCase()}: RM${((b.balance as number) || 0).toFixed(2)}`).join(" | ")}` : ""}
${metrics.totalIncome !== undefined ? `All-time: Income RM${metrics.totalIncome} | Expense RM${metrics.totalExpense} | Profit RM${metrics.totalProfit} | Pipeline: RM${metrics.pipelineValue}` : ""}
${finance.slice(0, 10).map((f) => `- ${f.date} [${f.type}] ${f.description}: RM${f.amount} (${f.category})`).join("\n") || "None this month"}

📁 RESOURCES — ${resources.length} items
${resources.slice(0, 10).map((r) => `- [${r.category}] ${r.title}${r.description ? `: ${r.description}` : ""}`).join("\n") || "None"}

═══ CAPABILITIES ═══

You can take these actions with tools:
1. **create_task** — Add tasks to ClickUp
2. **add_client** — Add new clients/leads to CRM
3. **update_client** — Update existing client details (rename, change stage, etc.) — use the [id:...] from client list above
4. **add_finance_entry** — Log income/expense
5. **create_calendar_event** — Schedule meetings/events (creates ClickUp task with due date+time)
6. **send_email** — Send emails via Gmail (ALWAYS show draft first)
7. **get_fresh_data** — Refresh dashboard data mid-conversation

═══ BEHAVIOR ═══

- Be the strategic brain. Proactively spot issues and suggest improvements.
- When updating a client, look up their ID from the dashboard data above. Don't ask the user for UUIDs.
- For calendar events, always include the date and time. Use the create_calendar_event tool.
- When sending emails, ALWAYS show the draft and get confirmation first.
- Use RM prefix for monetary values.
- Be concise but thorough. Use headers, bullets, and emojis for readability.
- If the user references a client by name, find them in the list and use their ID for updates.`;
}

// --------------- POST handler ---------------

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Anthropic API not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages, context: clientContext } = await request.json();

    // Fetch dashboard context (use cached from client if available)
    const context = clientContext || (await fetchDashboardContext());
    const systemPrompt = buildSystemPrompt(context);

    const makeRequest = async (msgs: Array<{ role: string; content: unknown }>) => {
      return fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          tools: TOOLS,
          messages: msgs,
        }),
      });
    };

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let currentMessages = [...messages];
    const allToolCalls: Array<{ tool: string; input: Record<string, unknown>; result: string }> = [];
    let maxIterations = 5;

    while (maxIterations > 0) {
      maxIterations--;

      const res = await makeRequest(currentMessages);

      if (!res.ok) {
        const errText = await res.text();
        console.error("Claude API error:", errText);
        return new Response(
          JSON.stringify({ error: "Claude API request failed", detail: errText.slice(0, 200) }),
          { status: res.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      totalInputTokens += data.usage?.input_tokens || 0;
      totalOutputTokens += data.usage?.output_tokens || 0;

      const hasToolUse = data.content.some((c: Record<string, unknown>) => c.type === "tool_use");

      if (data.stop_reason === "end_turn" || !hasToolUse) {
        const text = data.content
          .filter((c: Record<string, unknown>) => c.type === "text")
          .map((c: Record<string, unknown>) => c.text)
          .join("");

        // Log usage (fire and forget)
        logClaudeUsage({
          endpoint: "/api/claude/assistant",
          model: "claude-sonnet-4-20250514",
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
        });

        return new Response(
          JSON.stringify({ content: text, context, tool_calls: allToolCalls }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Execute tool calls
      const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = [];

      for (const block of data.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
          allToolCalls.push({ tool: block.name, input: block.input, result });
        }
      }

      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: data.content },
        { role: "user", content: toolResults },
      ];
    }

    return new Response(
      JSON.stringify({
        content: "I hit a processing limit. Could you try a simpler request?",
        context,
        tool_calls: allToolCalls,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Assistant error:", err);
    return new Response(
      JSON.stringify({ error: `Failed to process request: ${err instanceof Error ? err.message : "unknown error"}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
