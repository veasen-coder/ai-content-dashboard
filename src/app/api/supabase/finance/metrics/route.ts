import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Fetch all finance entries and clients in parallel
    const [financeRes, clientsRes] = await Promise.all([
      supabase
        .from("finance_entries")
        .select("id, type, category, amount, date, description")
        .order("date", { ascending: true }),
      supabase
        .from("clients")
        .select("id, name, stage, deal_value, close_probability, created_at, updated_at"),
    ]);

    const entries = financeRes.data || [];
    const clients = clientsRes.data || [];

    // ---- Monthly Revenue Breakdown ----
    const monthlyMap = new Map<string, { income: number; expense: number }>();

    for (const e of entries) {
      const month = e.date?.substring(0, 7); // YYYY-MM
      if (!month) continue;
      const current = monthlyMap.get(month) || { income: 0, expense: 0 };
      if (e.type === "income") current.income += e.amount;
      else if (e.type === "expense") current.expense += e.amount;
      monthlyMap.set(month, current);
    }

    const monthlyRevenue = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income * 100) / 100,
        expense: Math.round(data.expense * 100) / 100,
        profit: Math.round((data.income - data.expense) * 100) / 100,
      }));

    // ---- MRR (Monthly Recurring Revenue) ----
    // Look at "Recurring Revenue" category income entries
    const recurringEntries = entries.filter(
      (e) =>
        e.type === "income" &&
        (e.category?.toLowerCase().includes("recurring") ||
          e.category?.toLowerCase().includes("subscription") ||
          e.description?.toLowerCase().includes("recurring") ||
          e.description?.toLowerCase().includes("monthly"))
    );

    // Group recurring by month
    const recurringByMonth = new Map<string, number>();
    for (const e of recurringEntries) {
      const month = e.date?.substring(0, 7);
      if (!month) continue;
      recurringByMonth.set(month, (recurringByMonth.get(month) || 0) + e.amount);
    }

    const mrrHistory = Array.from(recurringByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, mrr]) => ({ month, mrr: Math.round(mrr * 100) / 100 }));

    const currentMonth = new Date().toISOString().substring(0, 7);
    const currentMRR = recurringByMonth.get(currentMonth) || 0;

    // ---- Average Deal Size ----
    const closedClients = clients.filter((c) => c.stage === "closed");
    const dealValues = closedClients
      .map((c) => {
        if (!c.deal_value) return 0;
        const num = parseFloat(c.deal_value.replace(/[^0-9.]/g, ""));
        return isNaN(num) ? 0 : num;
      })
      .filter((v) => v > 0);

    const avgDealSize =
      dealValues.length > 0
        ? dealValues.reduce((a, b) => a + b, 0) / dealValues.length
        : 0;

    // ---- Win Rate ----
    // Clients who reached "closed" vs total clients who entered pipeline
    const totalPipelineClients = clients.length;
    const winRate =
      totalPipelineClients > 0
        ? (closedClients.length / totalPipelineClients) * 100
        : 0;

    // ---- Client Lifetime Value (CLV) ----
    // Sum of all income from client payments / number of closed clients
    const clientPayments = entries.filter(
      (e) =>
        e.type === "income" &&
        (e.category?.toLowerCase().includes("client") ||
          e.category?.toLowerCase().includes("payment") ||
          e.category?.toLowerCase().includes("consultation"))
    );
    const totalClientRevenue = clientPayments.reduce(
      (sum, e) => sum + e.amount,
      0
    );
    const clv =
      closedClients.length > 0
        ? totalClientRevenue / closedClients.length
        : 0;

    // ---- Revenue by Category ----
    const catMap = new Map<string, number>();
    for (const e of entries.filter((e) => e.type === "income")) {
      const cat = e.category || "Uncategorized";
      catMap.set(cat, (catMap.get(cat) || 0) + e.amount);
    }
    const revenueByCategory = Array.from(catMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    // ---- Expense by Category ----
    const expCatMap = new Map<string, number>();
    for (const e of entries.filter((e) => e.type === "expense")) {
      const cat = e.category || "Uncategorized";
      expCatMap.set(cat, (expCatMap.get(cat) || 0) + e.amount);
    }
    const expenseByCategory = Array.from(expCatMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    // ---- Totals ----
    const totalIncome = entries
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = entries
      .filter((e) => e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0);

    // ---- Pipeline Value ----
    const pipelineValue = clients
      .filter((c) => c.stage !== "closed")
      .reduce((sum, c) => {
        if (!c.deal_value) return sum;
        const num = parseFloat(c.deal_value.replace(/[^0-9.]/g, ""));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);

    const weightedPipelineValue = clients
      .filter((c) => c.stage !== "closed")
      .reduce((sum, c) => {
        if (!c.deal_value) return sum;
        const num = parseFloat(c.deal_value.replace(/[^0-9.]/g, ""));
        const prob = (c.close_probability || 0) / 100;
        return sum + (isNaN(num) ? 0 : num * prob);
      }, 0);

    return NextResponse.json({
      mrr: Math.round(currentMRR * 100) / 100,
      mrrHistory,
      avgDealSize: Math.round(avgDealSize * 100) / 100,
      winRate: Math.round(winRate * 10) / 10,
      clv: Math.round(clv * 100) / 100,
      closedClients: closedClients.length,
      totalClients: totalPipelineClients,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      totalProfit: Math.round((totalIncome - totalExpense) * 100) / 100,
      pipelineValue: Math.round(pipelineValue * 100) / 100,
      weightedPipelineValue: Math.round(weightedPipelineValue * 100) / 100,
      monthlyRevenue,
      revenueByCategory,
      expenseByCategory,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to compute business metrics" },
      { status: 500 }
    );
  }
}
