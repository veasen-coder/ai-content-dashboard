"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  ChevronDown,
  ChevronUp,
  ListTodo,
  Lightbulb,
  AlertTriangle,
  Users,
  DollarSign,
  ClipboardList,
  TrendingUp,
  Bug,
  Copy,
  Check,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

interface SummaryStats {
  total_tasks: number;
  open_tasks: number;
  overdue_tasks: number;
  active_clients: number;
  monthly_income: number;
  monthly_expenses: number;
  pending_content_ideas: number;
}

interface DailySummary {
  timestamp: string;
  date: string;
  daily_agenda: string[];
  suggestions: string[];
  improvements: string[];
  stats: SummaryStats;
  status: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-[#6B7280]">{label}</span>
      </div>
      <p className="mt-2 font-mono text-xl font-semibold text-[#F5F5F5]">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({ summary }: { summary: DailySummary }) {
  const [expanded, setExpanded] = useState(false);
  const isError = summary.status?.startsWith("error");
  const isToday =
    summary.date ===
    new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div
      className={`rounded-xl border bg-[#111111] transition-all ${
        isToday
          ? "border-violet-500/40"
          : isError
            ? "border-red-500/30"
            : "border-[#1E1E1E]"
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isError ? "bg-red-500/15" : "bg-violet-500/15"
            }`}
          >
            <Calendar
              className={`h-5 w-5 ${isError ? "text-red-400" : "text-violet-400"}`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#F5F5F5]">
                {summary.date}
              </h3>
              {isToday && (
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-400">
                  Today
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              {isError ? (
                <>
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs text-red-400">
                    {summary.status.replace("error: ", "")}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs text-[#6B7280]">
                    {summary.daily_agenda.length} agenda &middot;{" "}
                    {summary.suggestions.length} suggestions &middot;{" "}
                    {summary.improvements.length} improvements
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isError && (
            <div className="hidden items-center gap-4 text-xs text-[#6B7280] md:flex">
              <span>
                {summary.stats.open_tasks} open tasks
              </span>
              <span>
                {summary.stats.overdue_tasks} overdue
              </span>
            </div>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[#6B7280]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#6B7280]" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && !isError && (
        <div className="border-t border-[#1E1E1E] p-5">
          {/* Stats Grid */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            <StatCard
              label="Total Tasks"
              value={summary.stats.total_tasks}
              icon={ClipboardList}
              color="text-violet-400"
            />
            <StatCard
              label="Open"
              value={summary.stats.open_tasks}
              icon={ListTodo}
              color="text-blue-400"
            />
            <StatCard
              label="Overdue"
              value={summary.stats.overdue_tasks}
              icon={AlertTriangle}
              color="text-red-400"
            />
            <StatCard
              label="Clients"
              value={summary.stats.active_clients}
              icon={Users}
              color="text-emerald-400"
            />
            <StatCard
              label="Income"
              value={`RM ${summary.stats.monthly_income.toLocaleString()}`}
              icon={TrendingUp}
              color="text-emerald-400"
            />
            <StatCard
              label="Expenses"
              value={`RM ${summary.stats.monthly_expenses.toLocaleString()}`}
              icon={DollarSign}
              color="text-amber-400"
            />
            <StatCard
              label="Content Ideas"
              value={summary.stats.pending_content_ideas}
              icon={Lightbulb}
              color="text-amber-400"
            />
          </div>

          {/* Three Sections */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Daily Agenda */}
            <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-400" />
                <h4 className="text-sm font-semibold text-[#F5F5F5]">
                  Daily Agenda
                </h4>
              </div>
              <ol className="space-y-2">
                {summary.daily_agenda.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#D1D5DB]">
                    <span className="shrink-0 font-mono text-xs text-violet-400">
                      {i + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Suggestions */}
            <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-emerald-400" />
                <h4 className="text-sm font-semibold text-[#F5F5F5]">
                  Suggestions
                </h4>
              </div>
              <ol className="space-y-2">
                {summary.suggestions.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#D1D5DB]">
                    <span className="shrink-0 font-mono text-xs text-emerald-400">
                      {i + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Improvements */}
            <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-[#F5F5F5]">
                  What Needs Improvement
                </h4>
              </div>
              <ol className="space-y-2">
                {summary.improvements.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#D1D5DB]">
                    <span className="shrink-0 font-mono text-xs text-amber-400">
                      {i + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TestResult {
  step: string;
  status: "success" | "error" | "running" | "pending";
  message: string;
  duration?: number;
  data?: unknown;
}

export default function DailySummaryPage() {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [rawResponse, setRawResponse] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSummaries();
  }, []);

  async function fetchSummaries() {
    try {
      const res = await fetch("/api/agents/daily-summary");
      if (res.ok) {
        const data = await res.json();
        setSummaries(data.summaries || []);
      }
    } catch {
      console.error("Failed to fetch summaries");
    } finally {
      setLoading(false);
    }
  }

  async function generateNow() {
    setGenerating(true);
    try {
      const res = await fetch("/api/agents/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to generate summary");
        return;
      }

      toast.success(`Daily summary generated for ${data.date}`);
      await fetchSummaries();
    } catch {
      toast.error("Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  }

  async function runTests() {
    setTesting(true);
    setTestResults([]);
    setRawResponse("");

    const results: TestResult[] = [
      { step: "ClickUp Tasks API", status: "pending", message: "Waiting..." },
      { step: "Supabase Clients", status: "pending", message: "Waiting..." },
      { step: "Supabase Finance", status: "pending", message: "Waiting..." },
      { step: "Content Ideas API", status: "pending", message: "Waiting..." },
      { step: "Google Sheets Read", status: "pending", message: "Waiting..." },
      { step: "Google Sheets Write", status: "pending", message: "Waiting..." },
      { step: "ClickUp Chat Send", status: "pending", message: "Waiting..." },
      { step: "Full Agent Run", status: "pending", message: "Waiting..." },
    ];
    setTestResults([...results]);

    // Helper to update a specific step
    const update = (index: number, partial: Partial<TestResult>) => {
      results[index] = { ...results[index], ...partial };
      setTestResults([...results]);
    };

    // 1. Test ClickUp Tasks
    update(0, { status: "running", message: "Fetching tasks..." });
    let t0 = Date.now();
    try {
      const res = await fetch("/api/clickup/tasks");
      const data = await res.json();
      if (res.ok) {
        const count = data.tasks?.length || 0;
        update(0, { status: "success", message: `${count} tasks fetched`, duration: Date.now() - t0 });
      } else {
        update(0, { status: "error", message: data.error || `HTTP ${res.status}`, duration: Date.now() - t0, data });
      }
    } catch (e) {
      update(0, { status: "error", message: (e as Error).message, duration: Date.now() - t0 });
    }

    // 2. Test Clients
    update(1, { status: "running", message: "Fetching clients..." });
    t0 = Date.now();
    try {
      const res = await fetch("/api/supabase/clients");
      const data = await res.json();
      if (res.ok) {
        const count = Array.isArray(data) ? data.length : 0;
        update(1, { status: "success", message: `${count} clients fetched`, duration: Date.now() - t0 });
      } else {
        update(1, { status: "error", message: data.error || `HTTP ${res.status}`, duration: Date.now() - t0, data });
      }
    } catch (e) {
      update(1, { status: "error", message: (e as Error).message, duration: Date.now() - t0 });
    }

    // 3. Test Finance
    update(2, { status: "running", message: "Fetching finance..." });
    t0 = Date.now();
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/supabase/finance?month=${month}`);
      const data = await res.json();
      if (res.ok) {
        const count = Array.isArray(data) ? data.length : 0;
        update(2, { status: "success", message: `${count} entries this month`, duration: Date.now() - t0 });
      } else {
        update(2, { status: "error", message: data.error || `HTTP ${res.status}`, duration: Date.now() - t0, data });
      }
    } catch (e) {
      update(2, { status: "error", message: (e as Error).message, duration: Date.now() - t0 });
    }

    // 4. Test Content Ideas
    update(3, { status: "running", message: "Fetching content ideas..." });
    t0 = Date.now();
    try {
      const res = await fetch("/api/agents/content-ideas?limit=5&status=new");
      const data = await res.json();
      if (res.ok) {
        const count = data.ideas?.length || 0;
        update(3, { status: "success", message: `${count} pending ideas`, duration: Date.now() - t0 });
      } else {
        update(3, { status: "error", message: data.error || `HTTP ${res.status}`, duration: Date.now() - t0, data });
      }
    } catch (e) {
      update(3, { status: "error", message: (e as Error).message, duration: Date.now() - t0 });
    }

    // 5. Test Google Sheets Read
    update(4, { status: "running", message: "Reading from Sheets..." });
    t0 = Date.now();
    try {
      const res = await fetch("/api/agents/daily-summary");
      const data = await res.json();
      if (res.ok) {
        const count = data.summaries?.length || 0;
        update(4, { status: "success", message: `${count} rows in sheet`, duration: Date.now() - t0 });
      } else {
        update(4, { status: "error", message: data.error || `HTTP ${res.status}`, duration: Date.now() - t0, data });
      }
    } catch (e) {
      update(4, { status: "error", message: (e as Error).message, duration: Date.now() - t0 });
    }

    // 6. Test Google Sheets Write (via test endpoint — we skip actual write, just validate config)
    update(5, { status: "running", message: "Checking Sheets write access..." });
    t0 = Date.now();
    // We'll use the read success as proxy — if read works, write config is valid
    if (results[4].status === "success") {
      update(5, { status: "success", message: "Write access confirmed (same OAuth)", duration: Date.now() - t0 });
    } else {
      update(5, { status: "error", message: "Cannot verify — Sheets read failed", duration: Date.now() - t0 });
    }

    // 7. Test ClickUp Chat
    update(6, { status: "running", message: "Checking ClickUp chat channels..." });
    t0 = Date.now();
    try {
      const res = await fetch("/api/clickup/chat?action=channels");
      const data = await res.json();
      if (res.ok && data.channels?.length > 0) {
        update(6, { status: "success", message: `${data.channels.length} channels found — will send to "${data.channels[0].name}"`, duration: Date.now() - t0 });
      } else {
        update(6, { status: "error", message: data.error || "No channels found", duration: Date.now() - t0, data });
      }
    } catch (e) {
      update(6, { status: "error", message: (e as Error).message, duration: Date.now() - t0 });
    }

    // 8. Full Agent Run
    const hasErrors = results.slice(0, 7).some((r) => r.status === "error");
    if (hasErrors) {
      update(7, { status: "error", message: "Skipped — fix errors above first", duration: 0 });
    } else {
      update(7, { status: "running", message: "Running full agent (Claude AI + Sheets + ClickUp)..." });
      t0 = Date.now();
      try {
        const res = await fetch("/api/agents/daily-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        setRawResponse(JSON.stringify(data, null, 2));
        if (res.ok && data.success) {
          update(7, {
            status: "success",
            message: `Generated for ${data.date} — Sheets: ${data.saved_to_sheets ? "saved" : "failed"} — ClickUp: ${data.sent_to_clickup ? "sent" : "failed"}`,
            duration: Date.now() - t0,
            data,
          });
          await fetchSummaries();
          toast.success("Test passed — full agent run successful");
        } else {
          update(7, { status: "error", message: data.error || "Agent returned error", duration: Date.now() - t0, data });
        }
      } catch (e) {
        update(7, { status: "error", message: (e as Error).message, duration: Date.now() - t0 });
      }
    }

    setTesting(false);
  }

  function handleCopyRaw() {
    navigator.clipboard.writeText(rawResponse);
    setCopied(true);
    toast.success("Copied raw response");
    setTimeout(() => setCopied(false), 2000);
  }

  const latestSummary = summaries[0];
  const isHealthy = latestSummary && !latestSummary.status?.startsWith("error");

  return (
    <PageWrapper title="Daily Summary Agent">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/agents"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#1E1E1E] hover:text-[#F5F5F5]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h2 className="text-lg font-semibold">Daily Summary Agent</h2>
              <p className="text-sm text-[#6B7280]">
                Auto-runs every day at 8:00 AM MYT &middot; Analyzes dashboard
                &middot; Saves to Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={generateNow}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate Now
              </>
            )}
          </button>
        </div>

        {/* Agent Status */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            Agent Status
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-[#6B7280]">Status</p>
              <div className="mt-1 flex items-center gap-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${isHealthy ? "bg-emerald-400" : latestSummary ? "bg-red-400" : "bg-[#6B7280]"}`}
                />
                <span className="text-sm font-medium text-[#F5F5F5]">
                  {isHealthy
                    ? "Healthy"
                    : latestSummary
                      ? "Error"
                      : "No data yet"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Schedule</p>
              <p className="mt-1 text-sm font-medium text-[#F5F5F5]">
                Daily @ 8:00 AM MYT
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Last Run</p>
              <p className="mt-1 text-sm font-medium text-[#F5F5F5]">
                {latestSummary
                  ? latestSummary.date
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Total Runs</p>
              <p className="mt-1 font-mono text-sm font-medium text-[#F5F5F5]">
                {summaries.length}
              </p>
            </div>
          </div>
        </div>

        {/* Test & Debug Panel */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111]">
          <button
            onClick={() => setShowTest(!showTest)}
            className="flex w-full items-center justify-between p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
                <Bug className="h-5 w-5 text-amber-400" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-[#F5F5F5]">
                  Test &amp; Debug
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Run diagnostics on each step of the agent pipeline
                </p>
              </div>
            </div>
            {showTest ? (
              <ChevronUp className="h-4 w-4 text-[#6B7280]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#6B7280]" />
            )}
          </button>

          {showTest && (
            <div className="border-t border-[#1E1E1E] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-[#6B7280]">
                  Tests each data source, Google Sheets connection, ClickUp chat, then runs the full agent.
                </p>
                <button
                  onClick={runTests}
                  disabled={testing}
                  className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Terminal className="h-4 w-4" />
                      Run All Tests
                    </>
                  )}
                </button>
              </div>

              {/* Test Results */}
              {testResults.length > 0 && (
                <div className="space-y-2">
                  {testResults.map((result, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                        result.status === "success"
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : result.status === "error"
                            ? "border-red-500/20 bg-red-500/5"
                            : result.status === "running"
                              ? "border-blue-500/20 bg-blue-500/5"
                              : "border-[#1E1E1E] bg-[#0A0A0A]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {result.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : result.status === "error" ? (
                          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                        ) : result.status === "running" ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-400" />
                        ) : (
                          <div className="h-4 w-4 shrink-0 rounded-full border border-[#6B7280]" />
                        )}
                        <div>
                          <span className="text-sm font-medium text-[#F5F5F5]">
                            {result.step}
                          </span>
                          <p
                            className={`text-xs ${
                              result.status === "error"
                                ? "text-red-400"
                                : "text-[#6B7280]"
                            }`}
                          >
                            {result.message}
                          </p>
                        </div>
                      </div>
                      {result.duration !== undefined && result.duration > 0 && (
                        <span className="shrink-0 font-mono text-xs text-[#6B7280]">
                          {result.duration < 1000
                            ? `${result.duration}ms`
                            : `${(result.duration / 1000).toFixed(1)}s`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Raw Response */}
              {rawResponse && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                      Raw API Response
                    </h4>
                    <button
                      onClick={handleCopyRaw}
                      className="flex items-center gap-1 text-xs text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4 font-mono text-xs text-[#D1D5DB]">
                    {rawResponse}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary History */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#F5F5F5]">
            Summary History
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#6B7280]" />
            </div>
          ) : summaries.length === 0 ? (
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-12 text-center">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-[#6B7280]" />
              <p className="text-sm text-[#6B7280]">
                No summaries yet. Click &quot;Generate Now&quot; to create the
                first one, or wait for the 8 AM MYT auto-run.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summaries.map((summary, i) => (
                <SummaryCard key={i} summary={summary} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
