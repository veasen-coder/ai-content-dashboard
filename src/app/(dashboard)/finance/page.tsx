"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Camera,
  Loader2,
  ExternalLink,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useDemoModeStore } from "@/store/demo-mode-store";
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
  const formatted = new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(amount);
  // Demo Mode: replace digits with X so format/shape stays but values hide.
  // Subscribing happens at the page level so React re-renders propagate here.
  if (typeof window !== "undefined" && useDemoModeStore.getState().isCensorMode) {
    return formatted.replace(/\d/g, "X");
  }
  return formatted;
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
        <span
          className={`truncate text-sm font-medium text-foreground ${
            entry.description && useDemoModeStore.getState().isCensorMode
              ? "demo-blur"
              : ""
          }`}
        >
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
        className="shrink-0 rounded-md p-1.5 text-muted-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
        title="Delete entry"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// --------------- Add Entry Modal ---------------

interface ReceiptDefaults {
  type?: "income" | "expense";
  category?: string;
  description?: string;
  amount?: string;
  date?: string;
}

function AddEntryModal({
  isOpen,
  onClose,
  onCreated,
  defaults,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaults?: ReceiptDefaults | null;
}) {
  const [type, setType] = useState<"income" | "expense">(defaults?.type || "income");
  const [category, setCategory] = useState(defaults?.category || "");
  const [description, setDescription] = useState(defaults?.description || "");
  const [amount, setAmount] = useState(defaults?.amount || "");
  const [account, setAccount] = useState("ocbc");
  const [date, setDate] = useState(defaults?.date || new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  // Apply defaults when they change
  useEffect(() => {
    if (defaults) {
      if (defaults.type) setType(defaults.type);
      if (defaults.category) setCategory(defaults.category);
      if (defaults.description) setDescription(defaults.description);
      if (defaults.amount) setAmount(defaults.amount);
      if (defaults.date) setDate(defaults.date);
    }
  }, [defaults]);

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

// --------------- Mass Upload Modal ---------------

interface ParsedRow {
  date: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  account: string;
  valid: boolean;
  error?: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(raw: string): string | null {
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // Try MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (mdy) {
    const m = parseInt(mdy[1]), d = parseInt(mdy[2]);
    if (m > 12 && d <= 12) return `${mdy[3]}-${mdy[2].padStart(2, "0")}-${mdy[1].padStart(2, "0")}`;
  }
  // Try Date parse
  const dt = new Date(raw);
  if (!isNaN(dt.getTime())) return dt.toISOString().split("T")[0];
  return null;
}

function parseRows(text: string): ParsedRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detect if first line is header
  const firstLower = lines[0].toLowerCase();
  const hasHeader = firstLower.includes("date") || firstLower.includes("type") || firstLower.includes("amount") || firstLower.includes("description");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = parseCSVLine(line);
    // Expected: date, type, category, description, amount, account
    // Also support: date, description, amount (auto-detect type from +/-)
    if (cols.length >= 5) {
      const date = parseDate(cols[0]);
      const rawType = cols[1].toLowerCase().trim();
      const type = rawType.startsWith("expense") || rawType === "debit" || rawType === "dr" || rawType === "out" ? "expense" : "income";
      const category = cols[2] || "";
      const description = cols[3] || "";
      const amount = Math.abs(parseFloat(cols[4].replace(/[^0-9.\-]/g, "")));
      const account = (cols[5] || "ocbc").toLowerCase().trim();

      if (!date) return { date: cols[0], type, category, description, amount: amount || 0, account, valid: false, error: "Invalid date" };
      if (!amount || isNaN(amount)) return { date, type, category, description, amount: 0, account, valid: false, error: "Invalid amount" };

      return { date, type, category, description, amount, account, valid: true };
    } else if (cols.length >= 3) {
      // Short format: date, description, amount
      const date = parseDate(cols[0]);
      const description = cols[1] || "";
      const rawAmount = parseFloat(cols[2].replace(/[^0-9.\-]/g, ""));
      const type = rawAmount < 0 ? "expense" : "income";
      const amount = Math.abs(rawAmount);
      const account = (cols[3] || "ocbc").toLowerCase().trim();

      if (!date) return { date: cols[0], type, category: "", description, amount: amount || 0, account, valid: false, error: "Invalid date" };
      if (!amount || isNaN(amount)) return { date, type, category: "", description, amount: 0, account, valid: false, error: "Invalid amount" };

      return { date, type, category: "", description, amount, account, valid: true };
    }

    return { date: "", type: "expense" as const, category: "", description: line, amount: 0, account: "ocbc", valid: false, error: "Not enough columns" };
  });
}

function MassUploadModal({
  isOpen,
  onClose,
  onUploaded,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRawText("");
    setRows([]);
    setStep("input");
  }

  function handleParse() {
    const parsed = parseRows(rawText);
    setRows(parsed);
    setStep("preview");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function loadSheetJS(): Promise<any> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).XLSX) { resolve((window as any).XLSX); return; }
      const script = document.createElement("script");
      script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      script.onload = () => resolve((window as any).XLSX);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv" || ext === "txt" || ext === "tsv") {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setRawText(text);
        setRows(parseRows(text));
        setStep("preview");
      };
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls" || ext === "numbers") {
      try {
        const XLSX = await loadSheetJS();
        if (!XLSX) throw new Error("Failed to load parser");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(firstSheet);
        setRawText(csv);
        setRows(parseRows(csv));
        setStep("preview");
      } catch {
        toast.error("Could not parse spreadsheet. Please export as CSV and try again.");
      }
    } else {
      toast.error("Unsupported file type. Use CSV, XLSX, or Numbers.");
    }
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleType(idx: number) {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, type: r.type === "income" ? "expense" : "income" } : r
      )
    );
  }

  async function handleUpload() {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setUploading(true);
    try {
      const res = await fetch("/api/supabase/finance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: validRows.map((r) => ({
            type: r.type,
            category: r.category,
            description: r.description,
            amount: r.amount,
            account: r.account,
            date: r.date,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bulk upload failed");
      }

      const data = await res.json();
      toast.success(`${data.count} entries uploaded successfully`);
      reset();
      onClose();
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!isOpen) return null;

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;
  const totalAmount = rows
    .filter((r) => r.valid)
    .reduce((s, r) => s + (r.type === "income" ? r.amount : -r.amount), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { reset(); onClose(); }} />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold">Mass Upload</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === "input" ? "Paste CSV data or upload a file" : `${validCount} valid rows ready`}
            </p>
          </div>
          <button
            onClick={() => { reset(); onClose(); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "input" ? (
          <div className="p-5 space-y-4">
            {/* Format guide */}
            <div className="rounded-lg bg-[#0A0A0A] border border-[#1E1E1E] p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">CSV Format (6 columns):</p>
              <code className="text-[11px] text-violet-400 block">
                date, type, category, description, amount, account
              </code>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Or short format (3 columns): <code className="text-violet-400">date, description, amount</code> — negative = expense, positive = income
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Date formats: YYYY-MM-DD, DD/MM/YYYY · Account: ocbc, paypal, stripe · Headers auto-detected
              </p>
            </div>

            {/* Textarea */}
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"2026-04-01, income, Client Payment, Flogen monthly, 3500, ocbc\n2026-04-02, expense, Tools/Subscriptions, Vercel Pro, 80, stripe\n2026-04-05, Lunch meeting, -45"}
              rows={10}
              className="w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3 text-sm font-mono text-foreground outline-none focus:border-primary resize-none placeholder:text-muted-foreground/30"
            />

            {/* Actions */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv,.xlsx,.xls,.numbers"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground"
              >
                <ArrowUpRight className="h-4 w-4" />
                Upload CSV File
              </button>
              <div className="flex-1" />
              <button
                onClick={handleParse}
                disabled={!rawText.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Preview Entries
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Preview summary */}
            <div className="flex items-center gap-4 border-b border-[#1E1E1E] px-5 py-3 shrink-0">
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                {validCount} valid
              </span>
              {invalidCount > 0 && (
                <span className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
                  {invalidCount} invalid
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                Net: <span className={`font-mono font-semibold ${totalAmount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {totalAmount >= 0 ? "+" : ""}{formatMYR(totalAmount)}
                </span>
              </span>
              <div className="flex-1" />
              <button
                onClick={() => setStep("input")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Edit data
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1E1E1E] text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Type</th>
                    <th className="pb-2 pr-3 font-medium">Category</th>
                    <th className="pb-2 pr-3 font-medium">Description</th>
                    <th className="pb-2 pr-3 font-medium text-right">Amount</th>
                    <th className="pb-2 pr-3 font-medium">Account</th>
                    <th className="pb-2 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b border-[#1E1E1E]/50 ${!row.valid ? "opacity-50" : ""}`}>
                      <td className="py-2 pr-3 font-mono">{row.date}</td>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => toggleType(i)}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            row.type === "income"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {row.type}
                        </button>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.category || "—"}</td>
                      <td className="py-2 pr-3 max-w-[180px] truncate">{row.description || "—"}</td>
                      <td className="py-2 pr-3 text-right font-mono font-semibold">
                        {formatMYR(row.amount)}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.account}</td>
                      <td className="py-2">
                        {!row.valid ? (
                          <span className="text-[10px] text-red-400" title={row.error}>{row.error}</span>
                        ) : (
                          <button
                            onClick={() => removeRow(i)}
                            className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No rows parsed</p>
              )}
            </div>

            {/* Upload button */}
            <div className="flex items-center justify-end gap-3 border-t border-[#1E1E1E] px-5 py-4 shrink-0">
              <button
                onClick={() => { reset(); onClose(); }}
                className="rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={validCount === 0 || uploading}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Upload {validCount} Entries
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --------------- Receipt Upload Modal ---------------

function ReceiptUploadModal({
  isOpen,
  onClose,
  onExtracted,
}: {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (data: ReceiptDefaults) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleExtract() {
    if (!preview) return;
    setExtracting(true);
    try {
      const res = await fetch("/api/claude/extract-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to extract receipt");
      }

      const data = await res.json();
      toast.success("Receipt analyzed successfully");
      onExtracted({
        type: data.type || "expense",
        category: data.category || "",
        description: data.description || "",
        amount: data.amount ? String(data.amount) : "",
        date: data.date || new Date().toISOString().split("T")[0],
      });
      setPreview(null);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to analyze receipt");
    } finally {
      setExtracting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4">
          <h2 className="text-base font-semibold">Upload Receipt</h2>
          <button
            onClick={() => { setPreview(null); onClose(); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!preview ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#2E2E2E] bg-[#0A0A0A] py-12 transition-colors hover:border-primary/50"
            >
              <Camera className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop a receipt image, or
              </p>
              <label className="mt-2 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Browse files
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-[#1E1E1E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Receipt preview" className="w-full object-contain max-h-64" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 rounded-lg border border-[#1E1E1E] px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
                >
                  Change Image
                </button>
                <button
                  onClick={handleExtract}
                  disabled={extracting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Extract Data"
                  )}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            AI will extract amount, description, date, and category from the image
          </p>
        </div>
      </div>
    </div>
  );
}

// --------------- Main Page ---------------

export default function FinancePage() {
  // Subscribe to censor mode so the entire tree re-renders when it toggles
  // (formatMYR reads useDemoModeStore.getState() non-reactively).
  useDemoModeStore((s) => s.isCensorMode);

  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(getCurrentMonth());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showMassUpload, setShowMassUpload] = useState(false);
  const [receiptDefaults, setReceiptDefaults] = useState<ReceiptDefaults | null>(null);
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
            <Link
              href="/finance/metrics"
              className="flex items-center gap-2 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-3 py-2 text-sm font-medium text-[#7C3AED] transition-colors hover:bg-[#7C3AED]/20"
            >
              <TrendingUp className="h-4 w-4" />
              Business Metrics
            </Link>
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
              onClick={() => setShowReceiptModal(true)}
              className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground"
            >
              <Camera className="h-4 w-4" />
              Receipt
            </button>
            <button
              onClick={() => setShowMassUpload(true)}
              className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground"
            >
              <Upload className="h-4 w-4" />
              Mass Upload
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
              <Link href="/finance/income" className="group">
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5 transition-colors group-hover:border-[#2E2E2E] group-hover:bg-[#161616]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Monthly Income</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-[#10B981]" />
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-bold font-mono text-[#10B981]">
                    {formatMYR(monthlyIncome)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">View all income &rarr;</p>
                </div>
              </Link>
              <Link href="/finance/expenses" className="group">
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5 transition-colors group-hover:border-[#2E2E2E] group-hover:bg-[#161616]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Monthly Expenses</p>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-4 w-4 text-[#EF4444]" />
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-bold font-mono text-[#EF4444]">
                    {formatMYR(monthlyExpenses)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">View all expenses &rarr;</p>
                </div>
              </Link>
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
        onClose={() => { setShowAddModal(false); setReceiptDefaults(null); }}
        onCreated={fetchData}
        defaults={receiptDefaults}
      />

      <ReceiptUploadModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        onExtracted={(data) => {
          setReceiptDefaults(data);
          setShowAddModal(true);
        }}
      />

      <MassUploadModal
        isOpen={showMassUpload}
        onClose={() => setShowMassUpload(false)}
        onUploaded={fetchData}
      />
    </PageWrapper>
  );
}
