"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useDemoModeStore } from "@/store/demo-mode-store";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type LeadStatus = "New" | "Contacted" | "Qualified" | "Demo" | "Closed";

interface Lead {
  name: string;
  phone: string;
  email: string;
  source: string;
  status: LeadStatus;
  value: string;
  notes: string;
  lastContact: string;
  lastContactHours: number;
}

const KPIS = [
  {
    key: "leads",
    label: "Total Leads This Month",
    value: "142",
    change: "+23%",
    trend: "up" as const,
    icon: Users,
  },
  {
    key: "closed",
    label: "Closed Deals",
    value: "18",
    change: "+40%",
    trend: "up" as const,
    icon: CheckCircle2,
  },
  {
    key: "pipeline",
    label: "Pipeline Value",
    value: "RM 48,500",
    change: "+15%",
    trend: "up" as const,
    icon: DollarSign,
  },
  {
    key: "response",
    label: "Avg Response Time",
    value: "3.2 hrs",
    change: "-45%",
    trend: "up" as const,
    icon: Clock,
  },
];

const INITIAL_LEADS: Lead[] = [
  {
    name: "Ahmad Rahman",
    phone: "+60 12-345-6789",
    email: "ahmad.r@gmail.com",
    source: "Instagram",
    status: "Qualified",
    value: "RM 2,500",
    notes: "Interested in premium package. Follow up Wednesday.",
    lastContact: "2 hrs ago",
    lastContactHours: 2,
  },
  {
    name: "Siti Nurhaliza",
    phone: "+60 19-876-5432",
    email: "siti.n@outlook.com",
    source: "WhatsApp",
    status: "Contacted",
    value: "RM 1,200",
    notes: "Asked about pricing tiers. Needs proposal by Friday.",
    lastContact: "5 hrs ago",
    lastContactHours: 5,
  },
  {
    name: "Raj Kumar",
    phone: "+60 16-234-5678",
    email: "raj.kumar@gmail.com",
    source: "Facebook",
    status: "Demo",
    value: "RM 4,800",
    notes: "Demo booked for Friday 3PM. Bring case studies.",
    lastContact: "18 min ago",
    lastContactHours: 0.3,
  },
  {
    name: "Mei Ling Tan",
    phone: "+60 17-345-9876",
    email: "meiling@yahoo.com",
    source: "Google",
    status: "New",
    value: "RM 950",
    notes: "Inquired via Google Ads. Assigned to AI follow-up.",
    lastContact: "1 day ago",
    lastContactHours: 24,
  },
  {
    name: "Farah Aziz",
    phone: "+60 11-987-6543",
    email: "farah.a@gmail.com",
    source: "Referral",
    status: "Closed",
    value: "RM 3,200",
    notes: "Deal closed. Onboarding scheduled.",
    lastContact: "3 hrs ago",
    lastContactHours: 3,
  },
];

const INITIAL_ACTIVITIES = [
  {
    icon: MessageSquare,
    text: "AI replied to Ahmad Rahman on WhatsApp",
    detail: "AI replied: \"Thanks Ahmad! I've added you to our priority list. Someone will reach out shortly with pricing for the premium package you asked about.\"",
    time: "2 min ago",
    color: "text-primary",
  },
  {
    icon: CalendarCheck,
    text: "Demo scheduled with Raj Kumar for Fri 3PM",
    detail: "Meeting link sent via email. Calendar invite auto-accepted. 45 min slot blocked with sales team.",
    time: "18 min ago",
    color: "text-[#10B981]",
  },
  {
    icon: FileText,
    text: "Proposal sent to Mei Ling Tan — RM 950",
    detail: "Proposal PDF generated from template, sent via email with 7-day expiry. Awaiting response.",
    time: "1 hr ago",
    color: "text-primary",
  },
  {
    icon: Phone,
    text: "Missed call from Siti Nurhaliza — AI follow-up sent",
    detail: "Missed call at 14:03. AI auto-sent WhatsApp: \"Sorry we missed you! When's a good time to call back?\"",
    time: "2 hrs ago",
    color: "text-amber-400",
  },
  {
    icon: CheckCircle2,
    text: "Deal closed with Farah Aziz — RM 3,200",
    detail: "Contract signed electronically. Invoice generated. Client moved to onboarding pipeline.",
    time: "3 hrs ago",
    color: "text-[#10B981]",
  },
  {
    icon: Mail,
    text: "Email campaign sent to 247 prospects",
    detail: "Subject: \"A smarter way to run your business.\" Open rate so far: 34%. Click rate: 8.2%.",
    time: "5 hrs ago",
    color: "text-muted-foreground",
  },
];

const FUNNEL = [
  { label: "Leads", status: null as LeadStatus | null, count: 142, color: "bg-primary/80" },
  { label: "Contacted", status: "Contacted" as LeadStatus, count: 98, color: "bg-primary/60" },
  { label: "Qualified", status: "Qualified" as LeadStatus, count: 54, color: "bg-primary/45" },
  { label: "Demo", status: "Demo" as LeadStatus, count: 31, color: "bg-primary/30" },
  { label: "Closed", status: "Closed" as LeadStatus, count: 18, color: "bg-[#10B981]" },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  New: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Contacted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Qualified: "bg-primary/15 text-primary border-primary/30",
  Demo: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Closed: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
};

const STATUS_CYCLE: LeadStatus[] = ["New", "Contacted", "Qualified", "Demo", "Closed"];

export default function DemoCRMPage() {
  const { demoClientName } = useDemoModeStore();
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<LeadStatus | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", source: "Instagram" });

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
    } else if (activeKpi === "pipeline") {
      list.sort(
        (a, b) =>
          parseFloat(b.value.replace(/[^0-9.]/g, "")) -
          parseFloat(a.value.replace(/[^0-9.]/g, ""))
      );
    } else if (activeKpi === "closed") {
      list.sort((a, b) => (a.status === "Closed" ? -1 : b.status === "Closed" ? 1 : 0));
    }
    return list;
  }, [leads, activeStage, activeKpi]);

  function cycleStatus(lead: Lead, e: React.MouseEvent) {
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
    const newLead: Lead = {
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
    toast.success("Lead added", { description: `${newLead.name} was added to your pipeline.` });
  }

  return (
    <PageWrapper title="CRM Dashboard">
      <div className="space-y-6">
        {/* Hero header */}
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Live
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            {demoClientName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your AI-powered CRM is handling leads, bookings, and customer
            conversations around the clock.
          </p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((kpi) => {
            const isActive = activeKpi === kpi.key;
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
                    ? "border-primary ring-1 ring-primary/40 shadow-lg shadow-primary/10"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </span>
                  <kpi.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
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

        {/* Pipeline funnel */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Sales Pipeline</h3>
              <p className="text-xs text-muted-foreground">
                Conversion from lead to closed deal {activeStage && `— filtered: ${activeStage}`}
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
                12.7% conversion
              </span>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {FUNNEL.map((stage) => {
              const pct = (stage.count / FUNNEL[0].count) * 100;
              const isActive = activeStage === stage.status;
              return (
                <button
                  key={stage.label}
                  onClick={() => {
                    if (!stage.status) {
                      setActiveStage(null);
                      toast("Showing all leads");
                    } else {
                      const next = activeStage === stage.status ? null : stage.status;
                      setActiveStage(next);
                      if (next) toast(`Filtered to ${stage.label}`, { icon: "🔎" });
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
                  <div className="relative flex-1 h-8 rounded-lg bg-muted/40 overflow-hidden">
                    <div
                      className={cn(
                        "h-full flex items-center px-3 transition-all duration-500 rounded-lg",
                        stage.color
                      )}
                      style={{ width: `${pct}%` }}
                    >
                      <span className="text-xs font-mono font-semibold text-white">
                        {stage.count}
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
              {INITIAL_ACTIVITIES.map((a, i) => {
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
                        a.color
                      )}
                    >
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-snug text-foreground">
                        {a.text}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {a.time}
                      </p>
                      {isOpen && (
                        <p className="mt-2 rounded-md bg-background/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
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
      </div>

      {/* Lead detail slide-in panel */}
      {selectedLead && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedLead(null)}
          />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-auto border-l border-border bg-card shadow-2xl animate-in slide-in-from-right">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {selectedLead.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{selectedLead.name}</div>
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
              {/* Current status */}
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

              {/* Contact info */}
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
                  <span className="font-mono">{selectedLead.value} est. value</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Notes
                </div>
                <p className="mt-1 rounded-lg border border-border bg-background/50 p-3 text-xs leading-relaxed">
                  {selectedLead.notes}
                </p>
              </div>

              {/* Status timeline */}
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
                            reached ? "text-primary" : "text-muted-foreground/40"
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs",
                            reached ? "text-foreground" : "text-muted-foreground/50"
                          )}
                        >
                          {s}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
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
                    toast(`WhatsApp opened for ${selectedLead.name}`, { icon: "💬" })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
                <button
                  onClick={() =>
                    toast(`Email composer opened for ${selectedLead.name}`, { icon: "📧" })
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
                  Schedule Demo
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
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
                  placeholder="+60 12-345-6789"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
