import { NextRequest } from "next/server";
import { logClaudeUsage } from "@/lib/claude-usage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// --------------- Dashboard data fetcher ---------------

async function fetchDashboardContext() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const supabase = createServerSupabaseClient();

  const results: Record<string, unknown> = {};

  // Fetch all data in parallel — each one is best-effort
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
        const res = await fetch(`${baseUrl}/api/supabase/finance/metrics`, {
          cache: "no-store",
        });
        if (!res.ok) return null;
        return res.json();
      },
    },
    {
      key: "social",
      fn: async () => {
        const out: Record<string, unknown> = {};
        try {
          const igRes = await fetch(`${baseUrl}/api/instagram/metrics`, { cache: "no-store" });
          if (igRes.ok) out.instagram = await igRes.json();
        } catch { /* skip */ }
        try {
          const fbRes = await fetch(`${baseUrl}/api/facebook/metrics`, { cache: "no-store" });
          if (fbRes.ok) out.facebook = await fbRes.json();
        } catch { /* skip */ }
        return out;
      },
    },
    {
      key: "resources",
      fn: async () => {
        const { data } = await supabase
          .from("resources")
          .select("id, title, category, type, url, description, is_pinned")
          .order("is_pinned", { ascending: false })
          .limit(30);
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

// --------------- Tool definitions for Claude ---------------

const TOOLS = [
  {
    name: "create_task",
    description:
      "Create a new task in ClickUp. Use this when the user asks to add a task, to-do item, or action item.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" as const, description: "Task name" },
        description: {
          type: "string" as const,
          description: "Task description (optional)",
        },
        priority: {
          type: "number" as const,
          description: "1=urgent, 2=high, 3=normal, 4=low (optional)",
        },
        due_date: {
          type: "string" as const,
          description: "Due date in YYYY-MM-DD format (optional)",
        },
        tags: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Tags to add (optional)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "add_client",
    description:
      "Add a new client to the CRM pipeline. Use when the user wants to add a lead or client.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" as const, description: "Client contact name" },
        business: { type: "string" as const, description: "Business name (optional)" },
        email: { type: "string" as const, description: "Email address (optional)" },
        phone: { type: "string" as const, description: "Phone number (optional)" },
        stage: {
          type: "string" as const,
          description:
            "Pipeline stage: lead, book_call, call, thank_you, meeting_minutes, demo, follow_up, closing, onboarding, active, churned. Default: lead",
        },
        notes: { type: "string" as const, description: "Notes about the client (optional)" },
        industry: { type: "string" as const, description: "Industry (optional)" },
        source: { type: "string" as const, description: "Lead source (optional)" },
        deal_value: { type: "string" as const, description: "Deal value e.g. '5000' (optional)" },
      },
      required: ["name"],
    },
  },
  {
    name: "add_finance_entry",
    description:
      "Add an income or expense entry. Use when the user wants to log a payment, expense, or financial transaction.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string" as const,
          description: "income or expense",
        },
        category: {
          type: "string" as const,
          description:
            "Category: Client Payment, Consultation, Recurring Revenue, Other Income, Tools/Subscriptions, Marketing, Operations, Salary, Office, Other Expense",
        },
        description: { type: "string" as const, description: "Description of the entry" },
        amount: { type: "number" as const, description: "Amount in MYR" },
        account: {
          type: "string" as const,
          description: "Account: ocbc, paypal, or stripe (optional)",
        },
        date: {
          type: "string" as const,
          description: "Date in YYYY-MM-DD format. Default: today",
        },
      },
      required: ["type", "description", "amount"],
    },
  },
  {
    name: "send_email",
    description:
      "Draft and send an email via Gmail. Use when the user asks to email someone or send an outreach.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string" as const, description: "Recipient email address" },
        subject: { type: "string" as const, description: "Email subject" },
        body: { type: "string" as const, description: "Email body (can include HTML)" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "get_fresh_data",
    description:
      "Fetch the latest live data from a specific section of the dashboard. Use this when the user asks about current/latest data after the conversation has started, or to verify something just changed.",
    input_schema: {
      type: "object" as const,
      properties: {
        section: {
          type: "string" as const,
          description: "Which data to refresh: tasks, clients, finance, balances, metrics, social, resources",
        },
      },
      required: ["section"],
    },
  },
];

// --------------- Tool executor ---------------

async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  switch (name) {
    case "create_task": {
      const body: Record<string, unknown> = { name: input.name };
      if (input.description) body.description = input.description;
      if (input.priority) body.priority = input.priority;
      if (input.due_date) {
        body.due_date = new Date(input.due_date as string).getTime();
        body.due_date_time = false;
      }
      if (input.tags) {
        body.tags = (input.tags as string[]).map((t) => t);
      }
      const res = await fetch(`${baseUrl}/api/clickup/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return JSON.stringify({ error: "Failed to create task" });
      const data = await res.json();
      return JSON.stringify({
        success: true,
        task_id: data.id,
        name: data.name,
        url: data.url,
      });
    }

    case "add_client": {
      const res = await fetch(`${baseUrl}/api/supabase/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) return JSON.stringify({ error: "Failed to add client" });
      const data = await res.json();
      return JSON.stringify({
        success: true,
        client_id: data.id,
        name: data.name,
        stage: data.stage,
      });
    }

    case "add_finance_entry": {
      const body = {
        type: input.type,
        category: input.category || (input.type === "income" ? "Other Income" : "Other Expense"),
        description: input.description,
        amount: input.amount,
        account: input.account || null,
        date: input.date || new Date().toISOString().split("T")[0],
      };
      const res = await fetch(`${baseUrl}/api/supabase/finance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return JSON.stringify({ error: "Failed to add entry" });
      const data = await res.json();
      return JSON.stringify({
        success: true,
        entry_id: data.id,
        type: data.type,
        amount: data.amount,
        description: data.description,
      });
    }

    case "send_email": {
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
      if (ctx[section] !== undefined) {
        return JSON.stringify(ctx[section]);
      }
      return JSON.stringify({ error: `Unknown section: ${section}` });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// --------------- Build system prompt ---------------

function buildSystemPrompt(context: Record<string, unknown>): string {
  const today = new Date().toISOString().split("T")[0];
  const clients = context.clients as Array<Record<string, unknown>> || [];
  const tasks = context.tasks as Array<Record<string, unknown>> || [];
  const finance = context.finance as Array<Record<string, unknown>> || [];
  const balances = context.balances as Array<Record<string, unknown>> || [];
  const metrics = context.metrics as Record<string, unknown> || {};
  const social = context.social as Record<string, unknown> || {};
  const resources = context.resources as Array<Record<string, unknown>> || [];

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

  // Finance summary for current month
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
Status breakdown: ${Object.entries(statusCount).map(([s, c]) => `${s}: ${c}`).join(", ") || "none"}
${overdueTasks.length > 0 ? `⚠️ OVERDUE: ${overdueTasks.join(", ")}` : "No overdue tasks"}
Recent tasks:
${tasks.slice(0, 15).map((t) => `- [${t.status}]${t.priority ? ` P${t.priority}` : ""} ${t.name}${t.due_date ? ` (due: ${t.due_date})` : ""}`).join("\n") || "None loaded"}

👥 CLIENTS — ${clients.length} total
Pipeline: ${Object.entries(stageCount).map(([s, c]) => `${s}: ${c}`).join(", ") || "empty"}
${clients.slice(0, 15).map((c) => `- ${c.name}${c.business ? ` (${c.business})` : ""} — stage: ${c.stage}${c.deal_value ? `, deal: RM${c.deal_value}` : ""}${c.industry ? `, ${c.industry}` : ""}`).join("\n") || "None"}

💰 FINANCE (This Month)
Income: RM${monthIncome.toFixed(2)} | Expenses: RM${monthExpense.toFixed(2)} | Net: RM${(monthIncome - monthExpense).toFixed(2)}
${balances.length > 0 ? `Account balances: ${balances.map((b) => `${(b.account as string).toUpperCase()}: RM${((b.balance as number) || 0).toFixed(2)}`).join(" | ")}` : ""}
${metrics ? `Total Income (all-time): RM${metrics.totalIncome || 0} | MRR: RM${metrics.mrr || 0} | Pipeline Value: RM${metrics.pipelineValue || 0} | Win Rate: ${metrics.winRate || 0}%` : ""}
Recent entries:
${finance.slice(0, 10).map((f) => `- ${f.date} [${f.type}] ${f.description}: RM${f.amount} (${f.category})`).join("\n") || "None this month"}

📊 SOCIAL MEDIA
${social.instagram ? `Instagram: ${JSON.stringify(social.instagram).substring(0, 300)}` : "Instagram: not connected"}
${social.facebook ? `Facebook: ${JSON.stringify(social.facebook).substring(0, 300)}` : "Facebook: not connected"}

📁 RESOURCES — ${resources.length} items
${resources.slice(0, 10).map((r) => `- [${r.category}] ${r.title}${r.description ? `: ${r.description}` : ""}`).join("\n") || "None"}

═══ YOUR CAPABILITIES ═══

You can TAKE ACTIONS using tools:
1. **create_task** — Add tasks to ClickUp (with priority, due date, tags)
2. **add_client** — Add clients/leads to the CRM pipeline
3. **add_finance_entry** — Log income or expense transactions
4. **send_email** — Send emails via Gmail
5. **get_fresh_data** — Refresh any dashboard section for latest data

═══ BEHAVIOR ═══

- Be the strategic brain of the business. Proactively spot issues, suggest improvements, and connect dots across data.
- When you see overdue tasks, low pipeline, dropping metrics — flag them proactively.
- When adding items via tools, confirm what you did with specific details (task name, client name, amount, etc.)
- For finance entries, always confirm the type (income/expense), amount, and category before adding.
- If the user asks something vague like "what should I focus on today?", analyze the data and give a prioritized actionable plan.
- Use the dashboard data to give context-aware suggestions — don't give generic advice.
- When sending emails, ALWAYS show the user the draft first and get confirmation before actually sending.
- Format responses with clear headers, bullet points, and emojis for readability.
- Keep monetary values in MYR with RM prefix.`;
}

// --------------- Main POST handler ---------------

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

    // Fetch dashboard context on first message or if requested
    const context = clientContext || (await fetchDashboardContext());
    const systemPrompt = buildSystemPrompt(context);

    // Initial Claude call with tools
    const makeRequest = async (
      msgs: Array<{ role: string; content: unknown }>
    ) => {
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

    // Tool-use loop — Claude may call tools, we execute and feed back results
    let currentMessages = [...messages];
    let maxIterations = 5; // Safety limit

    while (maxIterations > 0) {
      maxIterations--;

      const res = await makeRequest(currentMessages);

      if (!res.ok) {
        const error = await res.text();
        return new Response(JSON.stringify({ error }), {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      totalInputTokens += data.usage?.input_tokens || 0;
      totalOutputTokens += data.usage?.output_tokens || 0;

      // If no tool use, return the final text response
      if (data.stop_reason === "end_turn" || !data.content.some((c: Record<string, unknown>) => c.type === "tool_use")) {
        // Extract text from content blocks
        const text = data.content
          .filter((c: Record<string, unknown>) => c.type === "text")
          .map((c: Record<string, unknown>) => c.text)
          .join("");

        // Log usage
        logClaudeUsage({
          endpoint: "/api/claude/assistant",
          model: "claude-sonnet-4-20250514",
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
        });

        return new Response(
          JSON.stringify({
            content: text,
            context, // Send context back so client can cache it
            tool_calls: [], // No pending tool calls
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Process tool calls
      const toolResults: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }> = [];

      const toolCallSummaries: Array<{ tool: string; input: Record<string, unknown>; result: string }> = [];

      for (const block of data.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
          toolCallSummaries.push({
            tool: block.name,
            input: block.input,
            result,
          });
        }
      }

      // Add assistant message and tool results to conversation
      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: data.content },
        { role: "user", content: toolResults },
      ];
    }

    // If we hit the iteration limit, return what we have
    return new Response(
      JSON.stringify({
        content:
          "I tried to process your request but hit a complexity limit. Could you try breaking it into smaller steps?",
        context,
        tool_calls: [],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Assistant API error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
