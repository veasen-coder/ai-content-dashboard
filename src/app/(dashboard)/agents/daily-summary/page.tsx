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

export default function DailySummaryPage() {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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
      // Refresh the list
      await fetchSummaries();
    } catch {
      toast.error("Failed to generate summary");
    } finally {
      setGenerating(false);
    }
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
