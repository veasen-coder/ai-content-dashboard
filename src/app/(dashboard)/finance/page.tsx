"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  X,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
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
} from "recharts";

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

interface AccountBalance {
  id: string;
  account: string;
  balance: number;
  updated_at: string;
}

// --------------- Constants ---------------

const CATEGORY_OPTIONS: Record<string, { label: string; color: string }[]> = {
  income: [
    { label: "Client Payment", color: "#10B981" },
    { label: "Consultation", color: "#34D399" },
    { label: "Recurring Revenue", color: "#6EE7B7" },
    { label: "Other Income", color: "#A7F3D0" },
  ],
  expense: [
    { label: "Tools/Subscriptions", color: "#F59E0B" },
    { label: "Marketing", color: "#EF4444" },
    { label: "Operations", color: "#8B5CF6" },
    { label: "Salary", color: "#EC4899" },
    { label: "Office", color: "#F97316" },
    { label: "Other Expense", color: "#6B7280" },
  ],
};

const ACCOUNT_OPTIONS = [
  { value: "ocbc", label: "OCBC", icon: "🏦" },
  { value: "paypal", label: "PayPal", icon: "💳" },
  { value: "stripe", label: "Stripe", icon: "💰" },
];

const TYPE_ICONS = {
  income: ArrowUpRight,
  expense: ArrowDownRight,
  transfer: ArrowLeftRight,
};

const TYPE_COLORS = {
  income: "#10B981",
  expense: "#EF4444",
  transfer: "#6B7280",
};

const PIE_COLORS = [
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#10B981",
  "#EC4899",
  "#F97316",
  "#6366F1",
  "#14B8A6",
];

// --------------- Helpers ---------------

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

// --------------- Sub-components ---------------

function BalanceCard({
  account,
  balance,
  updatedAt,
  onEdit,
}: {
  account: string;
  balance: number;
  updatedAt: string;
  onEdit: (account: string, balance: number) => void;
}) {
  const opt = ACCOUNT_OPTIONS.find((a) => a.value === account);
  const label = opt ? opt.label : account.toUpperCase();
  const icon = opt ? opt.icon : "💵";

  return (
    <div className="group rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <p className="text-sm font-medium text-muted-foreground">
            {label} Balance
          </p>
        </div>
        <button
          onClick={() => {
            const val = prompt(`Update ${label} balance:`, balance.toString());
            if (val !== null) onEdit(account, parseFloat(val));
          }}
          className="text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          Edit
        </button>
      </div>
      <p
        className={`mt-2 text-2xl font-bold font-mono ${balance >= 0 ? "text-foreground" : "text-[#EF4444]"}`}
      >
        {formatMYR(balance)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Updated: {updatedAt ? formatShortDate(updatedAt) : "—"}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  icon: Icon,
  color,
}: {
  label: string;
  amount: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p className="mt-2 text-2xl font-bold font-mono" style={{ color }}>
        {formatMYR(amount)}
      </p>
    </div>
  );
}

function TransactionRow({
  entry,
  onDelete,
}: {
  entry: FinanceEntry;
  onDelete: (id: string) => void;
}) {
  const Icon = TYPE_ICONS[entry.type];
  const color = TYPE_COLORS[entry.type];
  const acc = ACCOUNT_OPTIONS.find((a) => a.value === entry.account);

  return (
    <div className="group flex items-center gap-4 border-b border-[#1E1E1E] px-4 py-3 transition-colors hover:bg-[#1A1A1A]">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: color + "20" }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {entry.description || entry.category || entry.type}
        </span>
        <span className="text-xs text-muted-foreground">
          {entry.category} {acc ? `· ${acc.label}` : ""}
        </span>
      </div>
      <div className="text-right">
        <p
          className="text-sm font-mono font-medium"
          style={{ color }}
        >
          {entry.type === "income" ? "+" : entry.type === "expense" ? "-" : ""}
          {formatMYR(entry.amount)}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {formatShortDate(entry.date)}
        </p>
      </div>
      <button
        onClick={() => onDelete(entry.id)}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-[#EF4444]" />
      </button>
    </div>
  );
}

// --------------- Add Entry Modal ---------------

function AddEntryModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("ocbc");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setType("income");
    setCategory("");
    setDescription("");
    setAmount("");
    setAccount("ocbc");
    setDate(new Date().toISOString().split("T")[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/supabase/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category: category || CATEGORY_OPTIONS[type][0].label,
          description: description.trim() || null,
          amount,
          account,
          date,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add entry");
      }

      toast.success(
        `${type === "income" ? "Income" : "Expense"} of ${formatMYR(parseFloat(amount))} added`
      );
      reset();
      onClose();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add entry");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const categories = CATEGORY_OPTIONS[type] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4">
          <h2 className="text-base font-semibold">Add Finance Entry</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Type
            </label>
            <div className="flex gap-2">
              {(["income", "expense"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setCategory("");
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                    type === t
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-[#1E1E1E] bg-[#0A0A0A] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "income" ? (
                    <ArrowUpRight className="h-4 w-4 text-[#10B981]" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-[#EF4444]" />
                  )}
                  {t === "income" ? "Income" : "Expense"}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setCategory(cat.label)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                    category === cat.label
                      ? "text-white ring-1 ring-white/20"
                      : "bg-[#1E1E1E] text-muted-foreground hover:text-foreground"
                  }`}
                  style={{
                    backgroundColor:
                      category === cat.label ? cat.color : undefined,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this entry for?"
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Amount + Account */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Amount (MYR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">RM</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] pl-10 pr-3 py-2.5 text-sm font-mono outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Account
              </label>
              <div className="flex gap-1.5">
                {ACCOUNT_OPTIONS.map((acc) => (
                  <button
                    key={acc.value}
                    type="button"
                    onClick={() => setAccount(acc.value)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-all ${
                      account === acc.value
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-[#1E1E1E] bg-[#0A0A0A] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#1E1E1E] pt-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              Saved to Supabase
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!amount || parseFloat(amount) <= 0 || submitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Entry"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --------------- Main Page ---------------

export default function FinancePage() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(getCurrentMonth());
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [entriesRes, balancesRes] = await Promise.all([
        fetch(`/api/supabase/finance?month=${month}`),
        fetch("/api/supabase/balances"),
      ]);

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(Array.isArray(data) ? data : []);
      }

      if (balancesRes.ok) {
        const data = await balancesRes.json();
        setBalances(Array.isArray(data) ? data : []);
      }

      setLastFetched(new Date().toISOString());
    } catch {
      toast.error("Failed to fetch finance data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigate months
  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  async function updateBalance(account: string, balance: number) {
    if (isNaN(balance)) return;
    try {
      const res = await fetch("/api/supabase/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, balance }),
      });
      if (res.ok) {
        toast.success(`${account.toUpperCase()} balance updated`);
        fetchData();
      }
    } catch {
      toast.error("Failed to update balance");
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this entry?")) return;
    try {
      const res = await fetch("/api/supabase/finance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Entry deleted");
        fetchData();
      }
    } catch {
      toast.error("Failed to delete entry");
    }
  }

  // Computed values
  const totalBalance = balances.reduce((sum, b) => sum + (b.balance || 0), 0);

  const monthlyIncome = useMemo(
    () =>
      entries
        .filter((e) => e.type === "income")
        .reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );

  const monthlyExpenses = useMemo(
    () =>
      entries
        .filter((e) => e.type === "expense")
        .reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );

  const netProfit = monthlyIncome - monthlyExpenses;

  // Chart data — daily breakdown for the month
  const dailyChartData = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const days: { day: string; income: number; expense: number }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, "0")}`;
      const dayEntries = entries.filter((e) => e.date === dateStr);
      days.push({
        day: String(d),
        income: dayEntries
          .filter((e) => e.type === "income")
          .reduce((sum, e) => sum + e.amount, 0),
        expense: dayEntries
          .filter((e) => e.type === "expense")
          .reduce((sum, e) => sum + e.amount, 0),
      });
    }

    return days.filter((d) => d.income > 0 || d.expense > 0);
  }, [entries, month]);

  // Expense breakdown for pie chart
  const expenseBreakdown = useMemo(() => {
    const catMap = new Map<string, number>();
    entries
      .filter((e) => e.type === "expense")
      .forEach((e) => {
        const cat = e.category || "Other";
        catMap.set(cat, (catMap.get(cat) || 0) + e.amount);
      });
    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [entries]);

  return (
    <PageWrapper title="Finance" lastSynced={lastFetched}>
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Entry
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-[#1E1E1E] bg-[#111111]"
                />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl border border-[#1E1E1E] bg-[#111111]" />
          </div>
        ) : (
          <>
            {/* Account Balances */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              {balances.map((b) => (
                <BalanceCard
                  key={b.id}
                  account={b.account}
                  balance={b.balance}
                  updatedAt={b.updated_at}
                  onEdit={updateBalance}
                />
              ))}
              <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Balance
                  </p>
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <p
                  className={`mt-2 text-2xl font-bold font-mono ${totalBalance >= 0 ? "text-foreground" : "text-[#EF4444]"}`}
                >
                  {formatMYR(totalBalance)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Across all accounts
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Monthly Income"
                amount={monthlyIncome}
                icon={TrendingUp}
                color="#10B981"
              />
              <SummaryCard
                label="Monthly Expenses"
                amount={monthlyExpenses}
                icon={TrendingDown}
                color="#EF4444"
              />
              <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    Net Profit
                  </p>
                  <DollarSign
                    className="h-4 w-4"
                    style={{ color: netProfit >= 0 ? "#10B981" : "#EF4444" }}
                  />
                </div>
                <p
                  className="mt-2 text-2xl font-bold font-mono"
                  style={{ color: netProfit >= 0 ? "#10B981" : "#EF4444" }}
                >
                  {formatMYR(netProfit)}
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Income vs Expenses Bar Chart */}
              <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
                <h3 className="mb-4 text-sm font-semibold">
                  Income vs Expenses
                </h3>
                {dailyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dailyChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1E1E1E"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: "#6B7280", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#6B7280", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111111",
                          border: "1px solid #1E1E1E",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value) => [formatMYR(Number(value))]}
                      />
                      <Bar
                        dataKey="income"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                        name="Income"
                      />
                      <Bar
                        dataKey="expense"
                        fill="#EF4444"
                        radius={[4, 4, 0, 0]}
                        name="Expense"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No data for {getMonthLabel(month)}
                  </div>
                )}
              </div>

              {/* Expense Breakdown Pie */}
              <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
                <h3 className="mb-4 text-sm font-semibold">
                  Expense Breakdown
                </h3>
                {expenseBreakdown.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={220}>
                      <PieChart>
                        <Pie
                          data={expenseBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {expenseBreakdown.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#111111",
                            border: "1px solid #1E1E1E",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value) => [formatMYR(Number(value))]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-1 flex-col gap-2">
                      {expenseBreakdown.map((cat, i) => (
                        <div key={cat.name} className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                          <span className="flex-1 text-xs text-muted-foreground">
                            {cat.name}
                          </span>
                          <span className="text-xs font-mono text-foreground">
                            {formatMYR(cat.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No expenses for {getMonthLabel(month)}
                  </div>
                )}
              </div>
            </div>

            {/* Transactions List */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111]">
              <div className="flex items-center justify-between border-b border-[#1E1E1E] px-4 py-3">
                <h3 className="text-sm font-semibold">
                  Transactions — {getMonthLabel(month)}
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  {entries.length} entries
                </span>
              </div>
              {entries.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto">
                  {entries.map((entry) => (
                    <TransactionRow
                      key={entry.id}
                      entry={entry}
                      onDelete={deleteEntry}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <DollarSign className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No transactions for {getMonthLabel(month)}
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-3 w-3" />
                    Add your first entry
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AddEntryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchData}
      />
    </PageWrapper>
  );
}
