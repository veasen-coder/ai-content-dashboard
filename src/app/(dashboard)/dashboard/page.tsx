"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckSquare,
  ArrowRight,
  Wallet,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Megaphone,
  FolderOpen,
  MessageSquare,
  Lightbulb,
  Calendar,
  Plus,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useCensor } from "@/hooks/use-censor";

// --------------- Types ---------------

interface AccountBalance {
  account: string;
  balance: number;
  updated_at: string;
}

interface FinanceEntry {
  id: string;
  type: "income" | "expense";
  category: string | null;
  description: string | null;
  amount: number;
  date: string;
}

interface Client {
  id: string;
  name: string;
  stage: string;
  industry: string | null;
  deal_value: string | null;
  close_probability: number | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
}

interface ClickUpTask {
  id: string;
  name: string;
  status: { status: string; color: string };
  priority?: { priority: string };
  due_date?: string;
}

interface IGProfile {
  username: string;
  followers_count: number;
  media_count: number;
}

interface FBProfile {
  name: string;
  fan_count: number;
  followers_count: number;
}

interface MetaAdSummary {
  spend: number;
  impressions: number;
  purchases: number;
  roas: number;
}

interface Resource {
  id: string;
  name: string;
  category: string;
  url?: string;
}

interface ContentIdea {
  id: string;
  platform: string;
  post_use: string;
  copywriting: string;
  status: string;
  created_at: string;
}

interface ChatChannel {
  id: string;
  name: string;
  members_count?: number;
}

interface CalendarEvent {
  id: string;
  name: string;
  description: string | null;
  status: string;
  statusColor: string;
  priority: string | null;
  priorityColor: string | null;
  dueDate: number | null;
  startDate: number | null;
  assignees: { id: number; username: string; initials: string; profilePicture: string | null }[];
  tags: { name: string; bg: string; fg: string }[];
  url: string;
}

// --------------- Helpers ---------------

function formatMYR(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PIPELINE_STAGES = [
  { key: "lead", label: "Lead", color: "#6B7280" },
  { key: "contacted", label: "Contacted", color: "#3B82F6" },
  { key: "demo_sent", label: "Demo Sent", color: "#8B5CF6" },
  { key: "negotiation", label: "Negotiation", color: "#F59E0B" },
  { key: "closed", label: "Closed", color: "#10B981" },
];

// --------------- Metric Card ---------------

function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  trendDown,
  href,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  subtitle?: string;
  trend?: string;
  trendDown?: boolean;
  href?: string;
}) {
  const content = (
    <div className={`rounded-xl border border-[#1E1E1E] bg-[#111111] p-5 transition-colors ${href ? "hover:border-[#2E2E2E] hover:bg-[#161616] cursor-pointer" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-bold font-mono">{value}</p>
      {(subtitle || trend) && (
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span
              className={`text-xs font-medium ${
                trendDown ? "text-[#EF4444]" : "text-[#10B981]"
              }`}
            >
              {trend}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// --------------- Section Card ---------------

function SectionCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </div>
  );
}

// --------------- Add Event Modal ---------------

function AddEventModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState(3); // 3 = normal
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    // Set default date to today
    const today = new Date();
    setDate(today.toISOString().split("T")[0]);
    setTime("10:00");
  }, []);

  async function handleCreate() {
    if (!name.trim() || !date) return;
    setCreating(true);

    try {
      // Build timestamp
      const [y, m, d] = date.split("-").map(Number);
      const [hr, min] = (time || "00:00").split(":").map(Number);
      const dueMs = new Date(y, m - 1, d, hr, min).getTime();
      const startMs = dueMs; // start = due for simple events

      const res = await fetch("/api/clickup/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          dueDate: dueMs,
          startDate: startMs,
          priority,
          assignToTeam: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create event");
        return;
      }

      const data = await res.json();
      toast.success(data.message || "Event created!");
      onCreated();
    } catch {
      toast.error("Failed to create event");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#1E1E1E] bg-[#111111] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Add Calendar Event</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-[#1E1E1E] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Event Name *
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Client Demo with Dr. Timothy"
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[#7B68EE] focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting agenda, notes..."
              rows={2}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[#7B68EE] focus:outline-none resize-none"
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground focus:border-[#7B68EE] focus:outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground focus:border-[#7B68EE] focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Priority
            </label>
            <div className="flex gap-2">
              {[
                { value: 1, label: "Urgent", color: "#EF4444" },
                { value: 2, label: "High", color: "#F59E0B" },
                { value: 3, label: "Normal", color: "#3B82F6" },
                { value: 4, label: "Low", color: "#6B7280" },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    priority === p.value
                      ? "border-current"
                      : "border-[#1E1E1E] hover:border-[#2E2E2E]"
                  }`}
                  style={{
                    color: priority === p.value ? p.color : "#6B7280",
                    backgroundColor:
                      priority === p.value ? `${p.color}15` : "transparent",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignees info */}
          <div className="rounded-lg bg-[#0A0A0A] border border-[#1E1E1E] px-3 py-2">
            <p className="text-[10px] text-muted-foreground mb-1.5">
              Auto-assigned & notified:
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b388ff]/20 text-[8px] font-bold text-[#b388ff]">
                  WH
                </div>
                <span className="text-xs">Way Hann</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#006063]/20 text-[8px] font-bold text-[#26A69A]">
                  VT
                </div>
                <span className="text-xs">Veasen</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm text-muted-foreground hover:bg-[#1A1A1A] hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !date || creating}
            className="flex items-center gap-2 rounded-lg bg-[#7B68EE] px-4 py-2 text-sm font-medium text-white hover:bg-[#6C5CE7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Calendar className="h-3.5 w-3.5" />
                Create Event
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------- Main Page ---------------

export default function DashboardPage() {
  const censor = useCensor();
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<ClickUpTask[]>([]);
  const [igProfile, setIgProfile] = useState<IGProfile | null>(null);
  const [fbProfile, setFbProfile] = useState<FBProfile | null>(null);
  const [metaAds, setMetaAds] = useState<MetaAdSummary | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarUrl, setCalendarUrl] = useState<string>("https://app.clickup.com");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    try {
      const [balRes, finRes, cliRes, taskRes, igRes, fbRes, adsRes, resRes, ideasRes, chatRes, calRes] =
        await Promise.allSettled([
          fetch("/api/supabase/balances"),
          fetch(`/api/supabase/finance?month=${month}`),
          fetch("/api/supabase/clients"),
          fetch("/api/clickup/tasks"),
          fetch("/api/instagram/metrics"),
          fetch("/api/facebook/metrics"),
          fetch("/api/meta-ads/campaigns?date_preset=last_30d"),
          fetch("/api/supabase/resources"),
          fetch("/api/agents/content-ideas?limit=5&status=new"),
          fetch("/api/clickup/chat?action=channels"),
          fetch("/api/clickup/calendar?days=14"),
        ]);

      if (balRes.status === "fulfilled" && balRes.value.ok) {
        setBalances(await balRes.value.json());
      }
      if (finRes.status === "fulfilled" && finRes.value.ok) {
        setEntries(await finRes.value.json());
      }
      if (cliRes.status === "fulfilled" && cliRes.value.ok) {
        setClients(await cliRes.value.json());
      }
      if (taskRes.status === "fulfilled" && taskRes.value.ok) {
        const taskData = await taskRes.value.json();
        setTasks(taskData.tasks || []);
      }
      if (igRes.status === "fulfilled" && igRes.value.ok) {
        const igData = await igRes.value.json();
        if (igData.profile) setIgProfile(igData.profile);
      }
      if (fbRes.status === "fulfilled" && fbRes.value.ok) {
        const fbData = await fbRes.value.json();
        if (fbData.profile) setFbProfile(fbData.profile);
      }
      if (adsRes.status === "fulfilled" && adsRes.value.ok) {
        const adsData = await adsRes.value.json();
        if (adsData.summary) {
          setMetaAds({
            spend: parseFloat(adsData.summary.spend || "0"),
            impressions: parseInt(adsData.summary.impressions || "0"),
            purchases: parseInt(adsData.summary.purchases || "0"),
            roas: parseFloat(adsData.summary.roas || "0"),
          });
        }
      }
      if (resRes.status === "fulfilled" && resRes.value.ok) {
        const resData = await resRes.value.json();
        setResources(Array.isArray(resData) ? resData : resData.data || []);
      }
      if (ideasRes.status === "fulfilled" && ideasRes.value.ok) {
        const ideasData = await ideasRes.value.json();
        setContentIdeas(ideasData.ideas || []);
      }
      if (chatRes.status === "fulfilled" && chatRes.value.ok) {
        const chatData = await chatRes.value.json();
        setChatChannels(chatData.channels || []);
      }
      if (calRes.status === "fulfilled" && calRes.value.ok) {
        const calData = await calRes.value.json();
        setCalendarEvents(calData.events || []);
        if (calData.calendarUrl) setCalendarUrl(calData.calendarUrl);
      }

      setLastFetched(new Date().toISOString());
    } catch {
      // Partial data is fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ---------- Computed metrics ----------

  const totalBalance = balances.reduce((sum, b) => sum + (b.balance || 0), 0);

  const monthlyIncome = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlyExpense = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  const netProfit = monthlyIncome - monthlyExpense;

  const activeClients = clients.filter((c) => c.stage === "closed").length;
  const totalLeads = clients.filter((c) => c.stage !== "closed").length;
  const stalledClients = clients.filter((c) => c.status === "stalled").length;

  const stageCounts = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: clients.filter((c) => c.stage === s.key).length,
  }));

  const openTasks = tasks.filter(
    (t) => t.status.status.toLowerCase() !== "complete"
  );
  const urgentTasks = openTasks.filter(
    (t) => t.priority?.priority === "urgent" || t.priority?.priority === "high"
  );

  // ---------- Loading skeleton ----------

  if (loading) {
    return (
      <PageWrapper title="Overview" lastSynced={lastFetched}>
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
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-xl border border-[#1E1E1E] bg-[#111111]"
              />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Overview" lastSynced={lastFetched}>
      <div className="space-y-6">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Balance"
            value={censor.amount(formatMYR(totalBalance))}
            icon={Wallet}
            subtitle={`Across ${balances.length} accounts`}
            href="/finance"
          />
          <MetricCard
            title="Monthly Profit"
            value={censor.amount(formatMYR(netProfit))}
            icon={netProfit >= 0 ? TrendingUp : TrendingDown}
            href="/finance"
            trend={
              monthlyIncome > 0
                ? `${censor.amount(formatMYR(monthlyIncome))} in`
                : undefined
            }
            trendDown={netProfit < 0}
            subtitle={
              monthlyExpense > 0
                ? `${censor.amount(formatMYR(monthlyExpense))} out`
                : "April 2026"
            }
          />
          <MetricCard
            title="Pipeline"
            value={`${activeClients} closed`}
            icon={Users}
            subtitle={`${totalLeads} leads in pipeline`}
            href="/clients"
            trend={
              stalledClients > 0
                ? `${stalledClients} stalled`
                : undefined
            }
            trendDown={stalledClients > 0}
          />
          <MetricCard
            title="Open Tasks"
            value={String(openTasks.length)}
            icon={CheckSquare}
            subtitle={`${tasks.length} total in ClickUp`}
            href="/tasks"
            trend={
              urgentTasks.length > 0
                ? `${urgentTasks.length} urgent`
                : undefined
            }
            trendDown={urgentTasks.length > 0}
          />
        </div>

        {/* Calendar — Upcoming ClickUp Events */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#7B68EE]" />
              <h2 className="text-sm font-semibold">Upcoming Schedule</h2>
              <span className="text-[10px] text-muted-foreground">(Next 14 days)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[#7B68EE]/10 px-3 py-1.5 text-[11px] font-medium text-[#7B68EE] hover:bg-[#7B68EE]/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Event
              </button>
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-[#1E1E1E] px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-[#1A1A1A] transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                ClickUp Calendar
              </a>
            </div>
          </div>
          {calendarEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {calendarEvents.slice(0, 8).map((event) => {
                const dueDate = event.dueDate ? new Date(event.dueDate) : null;
                const isToday = dueDate
                  ? dueDate.toDateString() === new Date().toDateString()
                  : false;
                const isTomorrow = dueDate
                  ? dueDate.toDateString() ===
                    new Date(Date.now() + 86400000).toDateString()
                  : false;
                const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;

                const dayLabel = isToday
                  ? "Today"
                  : isTomorrow
                  ? "Tomorrow"
                  : dueDate
                  ? dueDate.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : "";

                const timeLabel = dueDate
                  ? dueDate.toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <a
                    key={event.id}
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group rounded-lg border bg-[#0A0A0A] px-3 py-2.5 transition-colors hover:bg-[#111111] ${
                      isOverdue && !isToday
                        ? "border-[#EF4444]/30"
                        : isToday
                        ? "border-[#7B68EE]/30"
                        : "border-[#1E1E1E]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: event.statusColor }}
                          />
                          <p className="text-xs font-medium truncate">
                            {event.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span
                            className={`text-[10px] ${
                              isOverdue && !isToday
                                ? "text-[#EF4444] font-medium"
                                : isToday
                                ? "text-[#7B68EE] font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isOverdue && !isToday ? "Overdue · " : ""}
                            {dayLabel}
                            {timeLabel && timeLabel !== "00:00" ? ` · ${timeLabel}` : ""}
                          </span>
                        </div>
                        {/* Assignees */}
                        {event.assignees.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            {event.assignees.slice(0, 3).map((a) => (
                              <div
                                key={a.id}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1E1E1E] text-[8px] font-medium text-muted-foreground"
                                title={a.username}
                              >
                                {a.initials}
                              </div>
                            ))}
                            {event.assignees.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{event.assignees.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Priority badge */}
                      {event.priority && (
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            event.priority === "urgent"
                              ? "bg-[#EF4444]/10 text-[#EF4444]"
                              : event.priority === "high"
                              ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                              : event.priority === "normal"
                              ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                              : "bg-[#6B7280]/10 text-[#6B7280]"
                          }`}
                        >
                          {event.priority}
                        </span>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Calendar className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">No upcoming deadlines in the next 14 days</p>
            </div>
          )}
          {calendarEvents.length > 8 && (
            <p className="text-center text-[10px] text-muted-foreground mt-3">
              +{calendarEvents.length - 8} more events
            </p>
          )}
        </div>

        {/* Add Event Modal */}
        {showAddEvent && (
          <AddEventModal
            onClose={() => setShowAddEvent(false)}
            onCreated={() => {
              setShowAddEvent(false);
              fetchAll();
            }}
          />
        )}

        {/* Second Row — Pipeline + Finance */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Client Pipeline Summary */}
          <SectionCard title="Client Pipeline" href="/clients">
            <div className="space-y-3">
              {/* Pipeline bar */}
              <div className="flex items-center gap-1 rounded-lg bg-[#0A0A0A] p-3">
                {stageCounts.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-1">
                    <div className="flex flex-col items-center min-w-[50px]">
                      <span className="text-lg font-bold font-mono text-foreground">
                        {s.count}
                      </span>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                        {s.label}
                      </span>
                    </div>
                    {i < stageCounts.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground/30 mx-1" />
                    )}
                  </div>
                ))}
              </div>

              {/* Recent clients */}
              {clients.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          PIPELINE_STAGES.find((s) => s.key === c.stage)
                            ?.color || "#6B7280",
                      }}
                    />
                    <span className="text-sm font-medium truncate">
                      {censor.name(c.name, c.id)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {c.status === "stalled" && (
                      <AlertTriangle className="h-3 w-3 text-[#F59E0B]" />
                    )}
                    {c.deal_value && (
                      <span className="text-xs font-mono text-primary">
                        {censor.amount(c.deal_value)}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {clients.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  No clients yet — add leads in the pipeline
                </p>
              )}
            </div>
          </SectionCard>

          {/* Finance Summary */}
          <SectionCard title="Finance" href="/finance">
            <div className="space-y-3">
              {/* Account balances */}
              <div className="grid grid-cols-3 gap-2">
                {balances.map((b) => (
                  <div
                    key={b.account}
                    className="rounded-lg bg-[#0A0A0A] p-3 text-center"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {b.account}
                    </p>
                    <p className="mt-1 text-sm font-bold font-mono">
                      {censor.amount(formatMYR(b.balance || 0))}
                    </p>
                  </div>
                ))}
              </div>

              {/* Income vs Expense bars */}
              <div className="space-y-2 rounded-lg bg-[#0A0A0A] p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Income</span>
                  <span className="font-mono text-[#10B981]">
                    {censor.amount(formatMYR(monthlyIncome))}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#1E1E1E] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#10B981] transition-all"
                    style={{
                      width: `${
                        monthlyIncome + monthlyExpense > 0
                          ? (monthlyIncome / (monthlyIncome + monthlyExpense)) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Expenses</span>
                  <span className="font-mono text-[#EF4444]">
                    {censor.amount(formatMYR(monthlyExpense))}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#1E1E1E] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#EF4444] transition-all"
                    style={{
                      width: `${
                        monthlyIncome + monthlyExpense > 0
                          ? (monthlyExpense / (monthlyIncome + monthlyExpense)) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Recent transactions */}
              {entries.slice(0, 3).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-medium truncate ${e.description ? censor.blurClass : ""}`}
                    >
                      {e.description || e.category || "Entry"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {e.category}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold shrink-0 ml-2 ${
                      e.type === "income" ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    {e.type === "income" ? "+" : "-"}
                    {censor.amount(formatMYR(e.amount))}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Third Row — Tasks + Social */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Tasks */}
          <SectionCard title="Tasks" href="/tasks">
            <div className="space-y-2">
              {openTasks.length > 0 ? (
                openTasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5"
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: t.status.color || "#6B7280" }}
                    />
                    <span className="flex-1 text-xs font-medium truncate">
                      {t.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.priority?.priority && (
                        <span
                          className={`text-[10px] font-semibold uppercase ${
                            t.priority.priority === "urgent"
                              ? "text-[#EF4444]"
                              : t.priority.priority === "high"
                              ? "text-[#F59E0B]"
                              : "text-muted-foreground"
                          }`}
                        >
                          {t.priority.priority}
                        </span>
                      )}
                      {t.due_date && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(parseInt(t.due_date)).toLocaleDateString(
                            "en-GB",
                            { day: "2-digit", month: "short" }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 text-[#10B981]/30" />
                  <p className="text-xs">All tasks complete!</p>
                </div>
              )}
              {openTasks.length > 5 && (
                <p className="text-center text-[10px] text-muted-foreground">
                  +{openTasks.length - 5} more tasks
                </p>
              )}
            </div>
          </SectionCard>

          {/* Social Media */}
          <SectionCard title="Social Media" href="/social">
            <div className="space-y-3">
              {/* Instagram */}
              <div className="flex items-center gap-3 rounded-lg bg-[#0A0A0A] p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]">
                  <Camera className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {igProfile ? `@${igProfile.username}` : "Instagram"}
                  </p>
                  {igProfile ? (
                    <p className="text-xs text-muted-foreground">
                      {igProfile.followers_count.toLocaleString()} followers · {igProfile.media_count} posts
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">
                      Not connected
                    </p>
                  )}
                </div>
                {igProfile && (
                  <span className="rounded-md bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
                    LIVE
                  </span>
                )}
              </div>

              {/* Facebook */}
              <div className="flex items-center gap-3 rounded-lg bg-[#0A0A0A] p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1877F2] text-white font-bold text-sm">
                  f
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {fbProfile ? fbProfile.name : "Facebook"}
                  </p>
                  {fbProfile ? (
                    <p className="text-xs text-muted-foreground">
                      {fbProfile.followers_count.toLocaleString()} followers · {fbProfile.fan_count.toLocaleString()} likes
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">
                      Not connected
                    </p>
                  )}
                </div>
                {fbProfile && (
                  <span className="rounded-md bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
                    LIVE
                  </span>
                )}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Fourth Row — Meta Ads + Resources */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Meta Ads */}
          <SectionCard title="Meta Ads" href="/meta-ads">
            {metaAds ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#0A0A0A] p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Spend (30d)
                  </p>
                  <p className="mt-1 text-sm font-bold font-mono">
                    {censor.amount(formatMYR(metaAds.spend))}
                  </p>
                </div>
                <div className="rounded-lg bg-[#0A0A0A] p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    ROAS
                  </p>
                  <p className={`mt-1 text-sm font-bold font-mono ${metaAds.roas >= 1 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {metaAds.roas.toFixed(2)}x
                  </p>
                </div>
                <div className="rounded-lg bg-[#0A0A0A] p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Impressions
                  </p>
                  <p className="mt-1 text-sm font-bold font-mono">
                    {metaAds.impressions.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-[#0A0A0A] p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Purchases
                  </p>
                  <p className="mt-1 text-sm font-bold font-mono">
                    {metaAds.purchases}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Megaphone className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">No ad data available</p>
              </div>
            )}
          </SectionCard>

          {/* Resources */}
          <SectionCard title="Resources" href="/resources">
            {resources.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-[#0A0A0A] p-3">
                  <span className="text-sm font-medium">{resources.length} resources</span>
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </div>
                {(() => {
                  const cats = resources.reduce((acc, r) => {
                    const c = r.category || "Uncategorized";
                    acc[c] = (acc[c] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  return Object.entries(cats).slice(0, 4).map(([cat, count]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2"
                    >
                      <span className="text-xs font-medium">{cat}</span>
                      <span className="text-xs font-mono text-muted-foreground">{count}</span>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <FolderOpen className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">No resources yet</p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Fifth Row — Content Ideas + Team Chat */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Content Ideas */}
          <SectionCard title="Content Ideas" href="/agents/content-ideas">
            {contentIdeas.length > 0 ? (
              <div className="space-y-2">
                {contentIdeas.slice(0, 4).map((idea) => (
                  <div
                    key={idea.id}
                    className="flex items-center gap-3 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5"
                  >
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{idea.copywriting}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {idea.platform} · {idea.post_use}
                      </p>
                    </div>
                    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                      idea.status === "new"
                        ? "bg-amber-500/10 text-amber-400"
                        : idea.status === "used"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-gray-500/10 text-gray-400"
                    }`}>
                      {idea.status}
                    </span>
                  </div>
                ))}
                {contentIdeas.length > 4 && (
                  <p className="text-center text-[10px] text-muted-foreground">
                    +{contentIdeas.length - 4} more ideas
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Lightbulb className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">No pending content ideas</p>
              </div>
            )}
          </SectionCard>

          {/* Chat */}
          <SectionCard title="Chat" href="/chat">
            {chatChannels.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-[#0A0A0A] p-3">
                  <span className="text-sm font-medium">{chatChannels.length} channels</span>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                {chatChannels.slice(0, 3).map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center gap-3 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5"
                  >
                    <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs font-medium flex-1 truncate">
                      {ch.name}
                    </span>
                    {ch.members_count && (
                      <span className="text-[10px] text-muted-foreground">
                        {ch.members_count} members
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">No chat channels</p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh All Data
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
