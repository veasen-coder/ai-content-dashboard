"use client";

import { useState, useEffect, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Trophy,
  Users,
  Briefcase,
  ArrowLeft,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from "recharts";

// --------------- Types ---------------

interface Metrics {
  mrr: number;
  mrrHistory: { month: string; mrr: number }[];
  avgDealSize: number;
  winRate: number;
  clv: number;
  closedClients: number;
  totalClients: number;
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  monthlyRevenue: {
    month: string;
    income: number;
    expense: number;
    profit: number;
  }[];
  revenueByCategory: { category: string; amount: number }[];
  expenseByCategory: { category: string; amount: number }[];
}

// --------------- Helpers ---------------

function formatMYR(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

const COLORS = [
  "#7C3AED",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
  "#6B7280",
];

// --------------- Metric Card ---------------

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color || "#7C3AED"}20` }}
        >
          <Icon className="h-4 w-4" style={{ color: color || "#7C3AED" }} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold font-mono">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

// --------------- Chart Tooltip ---------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {label}
      </p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs font-mono" style={{ color: entry.color }}>
          {entry.name}: {formatMYR(entry.value)}
        </p>
      ))}
    </div>
  );
}

// --------------- Main Page ---------------

export default function BusinessMetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/supabase/finance/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        setLastFetched(new Date().toISOString());
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <PageWrapper title="Business Metrics" lastSynced={lastFetched}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-[#1E1E1E] bg-[#111111]"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-xl border border-[#1E1E1E] bg-[#111111]"
              />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!metrics) {
    return (
      <PageWrapper title="Business Metrics">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">Failed to load metrics</p>
          <button
            onClick={fetchMetrics}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </PageWrapper>
    );
  }

  const revenueChartData = metrics.monthlyRevenue.map((m) => ({
    ...m,
    month: formatMonth(m.month),
  }));

  const profitMargin =
    metrics.totalIncome > 0
      ? ((metrics.totalProfit / metrics.totalIncome) * 100).toFixed(1)
      : "0";

  return (
    <PageWrapper title="Business Metrics" lastSynced={lastFetched}>
      <div className="space-y-6">
        {/* Back to Finance */}
        <Link
          href="/finance"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Finance
        </Link>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Monthly Recurring Revenue"
            value={formatMYR(metrics.mrr)}
            subtitle={
              metrics.mrrHistory.length > 1
                ? `${metrics.mrrHistory.length} months tracked`
                : "Track recurring income"
            }
            icon={TrendingUp}
            color="#10B981"
          />
          <MetricCard
            title="Average Deal Size"
            value={formatMYR(metrics.avgDealSize)}
            subtitle={`From ${metrics.closedClients} closed deals`}
            icon={Target}
            color="#7C3AED"
          />
          <MetricCard
            title="Win Rate"
            value={`${metrics.winRate}%`}
            subtitle={`${metrics.closedClients} won / ${metrics.totalClients} total`}
            icon={Trophy}
            color="#F59E0B"
          />
          <MetricCard
            title="Client Lifetime Value"
            value={formatMYR(metrics.clv)}
            subtitle="Avg revenue per client"
            icon={Users}
            color="#3B82F6"
          />
        </div>

        {/* Second Row — Pipeline + Financial Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Income"
            value={formatMYR(metrics.totalIncome)}
            subtitle="All-time revenue"
            icon={DollarSign}
            color="#10B981"
          />
          <MetricCard
            title="Total Expenses"
            value={formatMYR(metrics.totalExpense)}
            subtitle="All-time spending"
            icon={TrendingDown}
            color="#EF4444"
          />
          <MetricCard
            title="Net Profit"
            value={formatMYR(metrics.totalProfit)}
            subtitle={`${profitMargin}% profit margin`}
            icon={metrics.totalProfit >= 0 ? TrendingUp : TrendingDown}
            color={metrics.totalProfit >= 0 ? "#10B981" : "#EF4444"}
          />
          <MetricCard
            title="Pipeline Value"
            value={formatMYR(metrics.pipelineValue)}
            subtitle={`Weighted: ${formatMYR(metrics.weightedPipelineValue)}`}
            icon={Briefcase}
            color="#8B5CF6"
          />
        </div>

        {/* Charts Row 1 — Revenue Trend + MRR */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Monthly Revenue Chart */}
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <h3 className="text-sm font-semibold mb-4">Monthly Revenue vs Expenses</h3>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={{ stroke: "#1E1E1E" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={{ stroke: "#1E1E1E" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#6B7280" }}
                  />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name="Expenses"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-xs">
                No revenue data yet
              </div>
            )}
          </div>

          {/* Profit Trend */}
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <h3 className="text-sm font-semibold mb-4">Monthly Profit Trend</h3>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={{ stroke: "#1E1E1E" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={{ stroke: "#1E1E1E" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#7C3AED"
                    fill="url(#profitGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-xs">
                No profit data yet
              </div>
            )}
          </div>
        </div>

        {/* Charts Row 2 — MRR History + Revenue by Category */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* MRR History */}
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <h3 className="text-sm font-semibold mb-4">MRR History</h3>
            {metrics.mrrHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={metrics.mrrHistory.map((m) => ({
                    ...m,
                    month: formatMonth(m.month),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={{ stroke: "#1E1E1E" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={{ stroke: "#1E1E1E" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="mrr"
                    name="MRR"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: "#10B981", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <TrendingUp className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">No recurring revenue tracked</p>
                <p className="text-[10px] mt-1 text-muted-foreground/60">
                  Add entries with &quot;Recurring Revenue&quot; category
                </p>
              </div>
            )}
          </div>

          {/* Revenue by Category */}
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <h3 className="text-sm font-semibold mb-4">Revenue by Category</h3>
            {metrics.revenueByCategory.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={280}>
                  <PieChart>
                    <Pie
                      data={metrics.revenueByCategory}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                    >
                      {metrics.revenueByCategory.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {metrics.revenueByCategory.map((cat, i) => (
                    <div key={cat.category} className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                      <span className="text-xs text-muted-foreground flex-1 truncate">
                        {cat.category}
                      </span>
                      <span className="text-xs font-mono">
                        {formatMYR(cat.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-xs">
                No income data yet
              </div>
            )}
          </div>
        </div>

        {/* Expense Breakdown */}
        {metrics.expenseByCategory.length > 0 && (
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <h3 className="text-sm font-semibold mb-4">Expense Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {metrics.expenseByCategory.map((cat, i) => {
                const pct =
                  metrics.totalExpense > 0
                    ? ((cat.amount / metrics.totalExpense) * 100).toFixed(1)
                    : "0";
                return (
                  <div
                    key={cat.category}
                    className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                      <span className="text-xs font-medium">{cat.category}</span>
                    </div>
                    <p className="text-lg font-bold font-mono">
                      {formatMYR(cat.amount)}
                    </p>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>{pct}% of total</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1E1E1E] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={fetchMetrics}
            className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Metrics
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
