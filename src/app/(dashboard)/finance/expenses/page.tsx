"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// --------------- Types ---------------

interface FinanceEntry {
  id: string;
  type: "income" | "expense" | "transfer";
  category: string | null;
  description: string | null;
  amount: number;
  currency: string;
  account: string | null;
  date: string;
  created_at: string;
}

// --------------- Helpers ---------------

const ACCOUNT_LABELS: Record<string, string> = {
  ocbc: "OCBC",
  paypal: "PayPal",
  stripe: "Stripe",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Tools/Subscriptions": "#F59E0B",
  Marketing: "#EF4444",
  Operations: "#8B5CF6",
  Salary: "#EC4899",
  Office: "#F97316",
  "Other Expense": "#6B7280",
};

function formatMYR(amount: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// --------------- Main Page ---------------

export default function ExpensesPage() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(getCurrentMonth());
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/supabase/finance?month=${month}&type=expense`);
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
      }
      setLastFetched(new Date().toISOString());
    } catch {
      toast.error("Failed to fetch expense data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const totalExpenses = useMemo(
    () => entries.reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      const cat = e.category || "Other";
      map.set(cat, (map.get(cat) || 0) + e.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  return (
    <PageWrapper title="Expenses" lastSynced={lastFetched}>
      <div className="space-y-6">
        {/* Back + Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/finance"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E1E1E] text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E1E1E] text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[160px] text-center text-sm font-semibold">
                {getMonthLabel(month)}
              </span>
              <button
                onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E1E1E] text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
            <p className="mt-2 text-2xl font-bold font-mono text-[#EF4444]">
              {formatMYR(totalExpenses)}
            </p>
          </div>
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <p className="text-sm font-medium text-muted-foreground">Transactions</p>
            <p className="mt-2 text-2xl font-bold font-mono">{entries.length}</p>
          </div>
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <p className="text-sm font-medium text-muted-foreground">Average</p>
            <p className="mt-2 text-2xl font-bold font-mono text-[#EF4444]">
              {entries.length > 0 ? formatMYR(totalExpenses / entries.length) : "RM 0.00"}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <h3 className="mb-3 text-sm font-semibold">By Category</h3>
            <div className="space-y-2">
              {categoryBreakdown.map(([cat, amount]) => {
                const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                const color = CATEGORY_COLORS[cat] || "#6B7280";
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-36 truncate text-sm text-muted-foreground">{cat}</span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-[#1E1E1E]">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                    <span className="w-28 text-right text-sm font-mono text-foreground">
                      {formatMYR(amount)}
                    </span>
                    <span className="w-12 text-right text-xs font-mono text-muted-foreground">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full Transaction List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-[#111111]" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111]">
            <div className="flex items-center justify-between border-b border-[#1E1E1E] px-4 py-3">
              <h3 className="text-sm font-semibold">All Expenses — {getMonthLabel(month)}</h3>
              <span className="text-xs font-mono text-muted-foreground">
                {entries.length} entries
              </span>
            </div>
            {entries.length > 0 ? (
              <div>
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 border-b border-[#1E1E1E] px-4 py-3 transition-colors hover:bg-[#1A1A1A]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EF4444]/20">
                      <ArrowDownRight className="h-4 w-4 text-[#EF4444]" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {entry.description || entry.category || "Expense"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.category}
                        {entry.account ? ` · ${ACCOUNT_LABELS[entry.account] || entry.account}` : ""}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium text-[#EF4444]">
                        -{formatMYR(entry.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatShortDate(entry.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">
                  No expenses for {getMonthLabel(month)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
