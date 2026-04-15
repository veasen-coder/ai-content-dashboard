import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Fetch usage summary + budget
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const period = request.nextUrl.searchParams.get("period") || "month";

  // Calculate date range
  const now = new Date();
  let fromDate: string;
  if (period === "today") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (period === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    fromDate = weekAgo.toISOString();
  } else {
    // month (default)
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  try {
    // Get budget — use .limit(1) instead of .single() which can fail silently
    const { data: budgetRows, error: budgetError } = await supabase
      .from("claude_budget")
      .select("budget_usd")
      .limit(1);

    let budget = 50;
    if (budgetError) {
      console.error("Budget fetch error:", budgetError.message);
    } else if (budgetRows && budgetRows.length > 0) {
      const parsed = parseFloat(String(budgetRows[0].budget_usd));
      if (!isNaN(parsed) && parsed > 0) {
        budget = parsed;
      }
    }

    // Get total spend (all time)
    const { data: allTimeData } = await supabase
      .from("claude_usage")
      .select("cost_usd, input_tokens, output_tokens");

    const totalSpend = (allTimeData || []).reduce(
      (sum, r) => sum + parseFloat(r.cost_usd || "0"),
      0
    );
    const totalInputTokens = (allTimeData || []).reduce(
      (sum, r) => sum + (r.input_tokens || 0),
      0
    );
    const totalOutputTokens = (allTimeData || []).reduce(
      (sum, r) => sum + (r.output_tokens || 0),
      0
    );

    // Get period spend
    const { data: periodData } = await supabase
      .from("claude_usage")
      .select("cost_usd, input_tokens, output_tokens, endpoint, created_at")
      .gte("created_at", fromDate)
      .order("created_at", { ascending: false });

    const periodSpend = (periodData || []).reduce(
      (sum, r) => sum + parseFloat(r.cost_usd || "0"),
      0
    );
    const periodInputTokens = (periodData || []).reduce(
      (sum, r) => sum + (r.input_tokens || 0),
      0
    );
    const periodOutputTokens = (periodData || []).reduce(
      (sum, r) => sum + (r.output_tokens || 0),
      0
    );
    const periodCalls = (periodData || []).length;

    // Get per-endpoint breakdown for period
    const endpointBreakdown: Record<
      string,
      { calls: number; cost: number; tokens: number }
    > = {};
    for (const row of periodData || []) {
      const ep = row.endpoint || "unknown";
      if (!endpointBreakdown[ep]) {
        endpointBreakdown[ep] = { calls: 0, cost: 0, tokens: 0 };
      }
      endpointBreakdown[ep].calls++;
      endpointBreakdown[ep].cost += parseFloat(row.cost_usd || "0");
      endpointBreakdown[ep].tokens +=
        (row.input_tokens || 0) + (row.output_tokens || 0);
    }

    // Recent calls (last 20)
    const recentCalls = (periodData || []).slice(0, 20).map((r) => ({
      endpoint: r.endpoint,
      tokens: (r.input_tokens || 0) + (r.output_tokens || 0),
      cost: parseFloat(r.cost_usd || "0"),
      time: r.created_at,
    }));

    const remaining = Math.max(0, budget - totalSpend);

    return NextResponse.json({
      budget,
      totalSpend,
      remaining,
      totalInputTokens,
      totalOutputTokens,
      period: {
        name: period,
        from: fromDate,
        spend: periodSpend,
        inputTokens: periodInputTokens,
        outputTokens: periodOutputTokens,
        calls: periodCalls,
      },
      endpointBreakdown,
      recentCalls,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch usage", detail: String(err) },
      { status: 500 }
    );
  }
}

// POST: Update budget
export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const { budget } = await request.json();

    if (typeof budget !== "number" || budget < 0) {
      return NextResponse.json(
        { error: "Invalid budget amount" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("claude_budget")
      .upsert({ id: 1, budget_usd: budget, updated_at: new Date().toISOString() });

    if (error) {
      return NextResponse.json(
        { error: "Failed to update budget", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, budget });
  } catch {
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}
