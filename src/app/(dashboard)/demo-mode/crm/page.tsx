"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useDemoModeStore } from "@/store/demo-mode-store";
import {
  getPreset,
  type LeadStatus,
  type DemoLead,
  type DemoActivity,
  type DemoKPI,
  type IndustryPreset,
} from "@/lib/demo-industry-presets";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  MessageSquare,
  CalendarCheck,
  FileText,
  Phone,
  Mail,
  X,
  Plus,
  MessageCircle,
  Calendar as CalendarIconLucide,
  CircleCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Icon maps (string → lucide component) ───────────────────
const KPI_ICONS: Record<DemoKPI["icon"], React.ElementType> = {
  users: Users,
  check: CheckCircle2,
  money: DollarSign,
  clock: Clock,
};

const ACTIVITY_ICONS: Record<DemoActivity["icon"], React.ElementType> = {
  message: MessageSquare,
  calendar: CalendarCheck,
  file: FileText,
  phone: Phone,
  check: CheckCircle2,
  mail: Mail,
};

const ACTIVITY_TONE: Record<DemoActivity["tone"], string> = {
  primary: "text-primary",
  success: "text-[#10B981]",
  warning: "text-amber-400",
  muted: "text-muted-foreground",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  New: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Contacted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Qualified: "bg-primary/15 text-primary border-primary/30",
  Demo: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Closed: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
};

const FUNNEL_COLORS = [
  "bg-primary/80",
  "bg-primary/60",
  "bg-primary/45",
  "bg-primary/30",
  "bg-[#10B981]",
];

const STATUS_CYCLE: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Demo",
  "Closed",
];

// ═════════════════════════════════════════════════════════════
// WIN STORY HERO — the #1 reason someone should buy
// ═════════════════════════════════════════════════════════════
function WinStoryHero({
  preset,
  clientName,
}: {
  preset: IndustryPreset;
  clientName: string;
}) {
  const [showBefore, setShowBefore] = useState(false);
  const w = preset.win_story;

  const v = showBefore
    ? {
        messages: w.before_messages_replied,
        bookings: w.before_appointments_booked,
        hours: w.before_hours_saved,
        revenue: w.before_revenue_made,
      }
    : {
        messages: w.messages_replied,
        bookings: w.appointments_booked,
        hours: w.hours_saved,
        revenue: w.revenue_made,
      };

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/20 via-primary/5 to-card p-6">
      {/* Glow accents */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Live · This Week
          </div>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs font-medium text-foreground">
            {preset.emoji} {preset.label}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="truncate text-xs font-semibold text-foreground">
            {clientName}
          </span>
        </div>

        {/* The punch line */}
        <h2 className="mt-3 text-xl font-bold leading-snug tracking-tight md:text-2xl">
          {showBefore ? (
            <>
              Before Flogen, you replied to{" "}
              <span className="font-mono">{v.messages.toLocaleString()}</span>{" "}
              messages and booked{" "}
              <span className="font-mono">{v.bookings}</span>{" "}
              {preset.booking_noun_plural} — manually, during working hours.
            </>
          ) : (
            <>
              This week, AI replied to{" "}
              <span className="text-primary">
                {v.messages.toLocaleString()}
              </span>{" "}
              messages, booked{" "}
              <span className="text-primary">{v.bookings}</span>{" "}
              {preset.booking_noun_plural}, and saved you{" "}
              <span className="text-primary">~{v.hours}</span> hours.
            </>
          )}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          {showBefore ? (
            <>
              Revenue:{" "}
              <span className="font-mono font-semibold text-foreground">
                {v.revenue}
              </span>
            </>
          ) : (
            <>
              You made{" "}
              <span className="font-mono font-semibold text-[#10B981]">
                {v.revenue}
              </span>{" "}
              — up{" "}
              <span className="font-semibold text-[#10B981]">
                {w.revenue_delta_pct}%
              </span>{" "}
              from before we set up AI automation.
            </>
          )}
        </p>

        {/* Before/After toggle */}
        <div className="mt-5 inline-flex items-center gap-0.5 rounded-lg border border-border bg-background/60 p-0.5">
          <button
            onClick={() => setShowBefore(false)}
            className={cn(
              "flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              !showBefore
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-3 w-3" />
            After Flogen
          </button>
          <button
            onClick={() => setShowBefore(true)}
            className={cn(
              "flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              showBefore
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Before Flogen
          </button>
        </div>

        {/* Delta pills */}
        {!showBefore && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DeltaPill
              label="Messages"
              before={w.before_messages_replied}
              after={w.messages_replied}
            />
            <DeltaPill
              label={preset.booking_noun_plural}
              before={w.before_appointments_booked}
              after={w.appointments_booked}
            />
            <DeltaPill
              label="Hours saved"
              before={w.before_hours_saved}
              after={w.hours_saved}
              suffix="hrs"
              forceDelta
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DeltaPill({
  label,
  before,
  after,
  suffix,
  forceDelta,
}: {
  label: string;
  before: number;
  after: number;
  suffix?: string;
  forceDelta?: boolean;
}) {
  const delta = forceDelta
    ? after
    : before > 0
      ? Math.round(((after - before) / before) * 100)
      : 100;
  const up = after >= before;

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/60" />
      <span
        className={cn(
          "font-mono font-semibold",
          up ? "text-[#10B981]" : "text-[#EF4444]"
        )}
      >
        {forceDelta ? `+${after}${suffix || ""}` : `+${delta}%`}
      </span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════
export default function DemoCRMPage() {
  const { demoClientName, selectedIndustry } = useDemoModeStore();
  const preset = useMemo(() => getPreset(selectedIndustry), [selectedIndustry]);

  // Reset leads when the industry preset changes so the list reflects the new industry
  const [leads, setLeads] = useState<DemoLead[]>(preset.leads);
  useEffect(() => {
    setLeads(preset.leads);
    setSelectedLead(null);
    setActiveKpi(null);
    setActiveStage(null);
  }, [preset]);

  const [selectedLead, setSelectedLead] = useState<DemoLead | null>(null);
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<LeadStatus | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "Instagram",
  });

  // Esc key closes modals/panels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedLead(null);
        setAddLeadOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const displayedLeads = useMemo(() => {
    let list = [...leads];
    if (activeStage) {
      list = list.filter((l) => l.status === activeStage);
    }
    if (activeKpi === "response") {
      list.sort((a, b) => a.lastContactHours - b.lastContactHours);
    } else if (activeKpi === "pipeline" || activeKpi === "revenue") {
      list.sort(
        (a, b) =>
          parseFloat(b.value.replace(/[^0-9.]/g, "")) -
          parseFloat(a.value.replace(/[^0-9.]/g, ""))
      );
    } else if (activeKpi === "closed" || activeKpi === "appointments" || activeKpi === "orders" || activeKpi === "bookings" || activeKpi === "viewings") {
      list.sort((a, b) =>
        a.status === "Closed" ? -1 : b.status === "Closed" ? 1 : 0
      );
    }
    return list;
  }, [leads, activeStage, activeKpi]);

  function cycleStatus(lead: DemoLead, e: React.MouseEvent) {
    e.stopPropagation();
    const idx = STATUS_CYCLE.indexOf(lead.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    setLeads((prev) =>
      prev.map((l) => (l.phone === lead.phone ? { ...l, status: next } : l))
    );
    if (selectedLead?.phone === lead.phone) {
      setSelectedLead({ ...lead, status: next });
    }
    toast.success(`Moved ${lead.name} to ${next}`);
  }

  function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    const newLead: DemoLead = {
      name: form.name,
      phone: form.phone,
      email: form.email || "—",
      source: form.source,
      status: "New",
      value: "RM " + (Math.floor(Math.random() * 4000) + 500).toLocaleString(),
      notes: "Recently added lead. AI follow-up queued.",
      lastContact: "just now",
      lastContactHours: 0,
    };
    setLeads((prev) => [newLead, ...prev]);
    setAddLeadOpen(false);
    setForm({ name: "", phone: "", email: "", source: "Instagram" });
    toast.success("Lead added", {
      description: `${newLead.name} was added to your pipeline.`,
    });
  }

  const funnelTop = preset.funnel[0]?.count || 1;
  const conversionPct =
    preset.funnel.length > 0
      ? ((preset.funnel[preset.funnel.length - 1].count / funnelTop) * 100).toFixed(1)
      : "0";

  return (
    <PageWrapper title="CRM Dashboard">
      <div className="space-y-6">
        {/* Win Story Hero — replaces the generic "AI-powered CRM" line */}
        <WinStoryHero preset={preset} clientName={demoClientName} />

        {/* KPI Row — industry-specific labels */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {preset.kpis.map((kpi) => {
            const isActive = activeKpi === kpi.key;
            const Icon = KPI_ICONS[kpi.icon];
            return (
              <button
                key={kpi.key}
                onClick={() => {
                  const next = isActive ? null : kpi.key;
                  setActiveKpi(next);
                  if (next) {
                    toast(`Sorted by ${kpi.label}`, { icon: "📊" });
                  }
                }}
                className={cn(
                  "rounded-xl border bg-card p-5 text-left transition-all",
                  isActive
                    ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/40"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </span>
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="mt-3 font-mono text-2xl font-bold text-foreground">
                  {kpi.value}
                </div>
                <div
                  className={cn(
                    "mt-2 flex items-center gap-1 text-xs font-medium",
                    kpi.trend === "up" ? "text-[#10B981]" : "text-[#EF4444]"
                  )}
                >
                  {kpi.trend === "up" ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  <span>{kpi.change}</span>
                  <span className="text-muted-foreground">vs last month</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Pipeline funnel — industry-aware labels */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Pipeline</h3>
              <p className="text-xs text-muted-foreground">
                {preset.industry === "Retail"
                  ? "Visitor → order conversion"
                  : `Enquiry → ${preset.booking_noun} conversion`}
                {activeStage && ` — filtered: ${activeStage}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeStage && (
                <button
                  onClick={() => setActiveStage(null)}
                  className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear filter
                </button>
              )}
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {conversionPct}% conversion
              </span>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {preset.funnel.map((stage, i) => {
              const pct = (stage.count / funnelTop) * 100;
              const isActive = activeStage === stage.status;
              const color = FUNNEL_COLORS[i] || "bg-primary/40";
              return (
                <button
                  key={stage.label}
                  onClick={() => {
                    if (!stage.status) {
                      setActiveStage(null);
                      toast("Showing all leads");
                    } else {
                      const next =
                        activeStage === stage.status ? null : stage.status;
                      setActiveStage(next);
                      if (next)
                        toast(`Filtered to ${stage.label}`, { icon: "🔎" });
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-1 text-left transition-colors",
                    isActive && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                >
                  <div className="w-24 text-xs font-medium text-muted-foreground">
                    {stage.label}
                  </div>
                  <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-muted/40">
                    <div
                      className={cn(
                        "flex h-full items-center rounded-lg px-3 transition-all duration-500",
                        color
                      )}
                      style={{ width: `${pct}%` }}
                    >
                      <span className="font-mono text-xs font-semibold text-white">
                        {stage.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="w-14 text-right font-mono text-xs text-muted-foreground">
                    {pct.toFixed(0)}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Leads + Activity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Leads */}
          <div className="rounded-xl border border-border bg-card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h3 className="text-sm font-semibold">Recent Leads</h3>
                <p className="text-xs text-muted-foreground">
                  Auto-captured from WhatsApp, Instagram, Facebook &amp; Google
                </p>
              </div>
              <button
                onClick={() => setAddLeadOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-primary/20 hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Lead
              </button>
            </div>
            <div className="divide-y divide-border">
              {displayedLeads.map((lead) => (
                <button
                  key={lead.phone}
                  onClick={() => setSelectedLead(lead)}
                  className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {lead.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{lead.name}</span>
                      <span
                        onClick={(e) => cycleStatus(lead, e)}
                        role="button"
                        className={cn(
                          "cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-medium transition-transform hover:scale-105",
                          STATUS_COLORS[lead.status]
                        )}
                      >
                        {lead.status}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{lead.phone}</span>
                      <span className="mx-1.5">·</span>
                      <span>{lead.source}</span>
                      <span className="mx-1.5">·</span>
                      <span>{lead.lastContact}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">
                      {lead.value}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Est. value
                    </div>
                  </div>
                </button>
              ))}
              {displayedLeads.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No leads match this filter.
                </div>
              )}
            </div>
          </div>

          {/* Activity */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <h3 className="text-sm font-semibold">Activity Feed</h3>
              <p className="text-xs text-muted-foreground">Real-time events</p>
            </div>
            <div className="space-y-1 p-3">
              {preset.activities.map((a, i) => {
                const Icon = ACTIVITY_ICONS[a.icon];
                const isOpen = expandedActivity === i;
                return (
                  <button
                    key={i}
                    onClick={() => setExpandedActivity(isOpen ? null : i)}
                    className={cn(
                      "flex w-full gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/40",
                      isOpen && "bg-muted/40"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50",
                        ACTIVITY_TONE[a.tone]
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-snug text-foreground">
                        {a.text}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {a.time}
                      </p>
                      {isOpen && (
                        <p className="mt-2 rounded-md bg-background/60 p-2 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-line">
                          {a.detail}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scenario list — ties pitch to industry */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">
            What AI handles for your {preset.label.toLowerCase()}
          </h3>
          <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {preset.scenarios.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-foreground/90"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Lead detail slide-in panel */}
      {selectedLead && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedLead(null)}
          />
          <div className="animate-in slide-in-from-right fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-auto border-l border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {selectedLead.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {selectedLead.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Lead · {selectedLead.source}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Status
                </div>
                <button
                  onClick={(e) => cycleStatus(selectedLead, e)}
                  className={cn(
                    "mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium transition-transform hover:scale-105",
                    STATUS_COLORS[selectedLead.status]
                  )}
                >
                  {selectedLead.status}
                </button>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Click to cycle status
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">{selectedLead.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{selectedLead.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Last contact: {selectedLead.lastContact}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">
                    {selectedLead.value} est. value
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Notes
                </div>
                <p className="mt-1 rounded-lg border border-border bg-background/50 p-3 text-xs leading-relaxed">
                  {selectedLead.notes}
                </p>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Status Timeline
                </div>
                <div className="mt-2 space-y-2">
                  {STATUS_CYCLE.map((s) => {
                    const reached =
                      STATUS_CYCLE.indexOf(s) <=
                      STATUS_CYCLE.indexOf(selectedLead.status);
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <CircleCheck
                          className={cn(
                            "h-3.5 w-3.5",
                            reached
                              ? "text-primary"
                              : "text-muted-foreground/40"
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs",
                            reached
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                          )}
                        >
                          {s}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() =>
                    toast(`Calling ${selectedLead.name}...`, { icon: "📞" })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </button>
                <button
                  onClick={() =>
                    toast(`WhatsApp opened for ${selectedLead.name}`, {
                      icon: "💬",
                    })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
                <button
                  onClick={() =>
                    toast(`Email composer opened for ${selectedLead.name}`, {
                      icon: "📧",
                    })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Send Email
                </button>
                <button
                  onClick={() =>
                    toast.success(`Demo scheduled with ${selectedLead.name}`)
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  <CalendarIconLucide className="h-3.5 w-3.5" />
                  Schedule {preset.booking_noun === "viewing" ? "Viewing" : "Demo"}
                </button>
                <button
                  onClick={() => {
                    setLeads((prev) =>
                      prev.map((l) =>
                        l.phone === selectedLead.phone
                          ? { ...l, status: "Closed" as LeadStatus }
                          : l
                      )
                    );
                    setSelectedLead({ ...selectedLead, status: "Closed" });
                    toast.success(`${selectedLead.name} marked as Closed`);
                  }}
                  className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark as Closed
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Lead modal */}
      {addLeadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setAddLeadOpen(false)}
        >
          <form
            onSubmit={handleAddLead}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Add Lead</h3>
              <button
                type="button"
                onClick={() => setAddLeadOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              New leads go straight into your pipeline with AI follow-up queued.
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ahmad Rahman"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Phone *
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+60 12-345 6789"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@email.com"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Source
                </label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option>Instagram</option>
                  <option>WhatsApp</option>
                  <option>Facebook</option>
                  <option>Google</option>
                  <option>Referral</option>
                  <option>Walk-in</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddLeadOpen(false)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
              >
                Add Lead
              </button>
            </div>
          </form>
        </div>
      )}
    </PageWrapper>
  );
}
