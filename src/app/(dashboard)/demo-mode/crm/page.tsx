"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";

const KPIS = [
  {
    label: "Total Leads This Month",
    value: "142",
    change: "+23%",
    trend: "up" as const,
    icon: Users,
  },
  {
    label: "Closed Deals",
    value: "18",
    change: "+40%",
    trend: "up" as const,
    icon: CheckCircle2,
  },
  {
    label: "Pipeline Value",
    value: "RM 48,500",
    change: "+15%",
    trend: "up" as const,
    icon: DollarSign,
  },
  {
    label: "Avg Response Time",
    value: "3.2 hrs",
    change: "-45%",
    trend: "up" as const,
    icon: Clock,
  },
];

const LEADS = [
  {
    name: "Ahmad Rahman",
    phone: "+60 12-345-6789",
    source: "Instagram",
    status: "Qualified",
    value: "RM 2,500",
  },
  {
    name: "Siti Nurhaliza",
    phone: "+60 19-876-5432",
    source: "WhatsApp",
    status: "Contacted",
    value: "RM 1,200",
  },
  {
    name: "Raj Kumar",
    phone: "+60 16-234-5678",
    source: "Facebook",
    status: "Demo",
    value: "RM 4,800",
  },
  {
    name: "Mei Ling Tan",
    phone: "+60 17-345-9876",
    source: "Google",
    status: "New",
    value: "RM 950",
  },
  {
    name: "Farah Aziz",
    phone: "+60 11-987-6543",
    source: "Referral",
    status: "Closed",
    value: "RM 3,200",
  },
];

const ACTIVITIES = [
  {
    icon: MessageSquare,
    text: "AI replied to Ahmad Rahman on WhatsApp",
    time: "2 min ago",
    color: "text-primary",
  },
  {
    icon: CalendarCheck,
    text: "Demo scheduled with Raj Kumar for Fri 3PM",
    time: "18 min ago",
    color: "text-[#10B981]",
  },
  {
    icon: FileText,
    text: "Proposal sent to Mei Ling Tan — RM 950",
    time: "1 hr ago",
    color: "text-primary",
  },
  {
    icon: Phone,
    text: "Missed call from Siti Nurhaliza — AI follow-up sent",
    time: "2 hrs ago",
    color: "text-amber-400",
  },
  {
    icon: CheckCircle2,
    text: "Deal closed with Farah Aziz — RM 3,200",
    time: "3 hrs ago",
    color: "text-[#10B981]",
  },
  {
    icon: Mail,
    text: "Email campaign sent to 247 prospects",
    time: "5 hrs ago",
    color: "text-muted-foreground",
  },
];

const FUNNEL = [
  { label: "Leads", count: 142, color: "bg-primary/80" },
  { label: "Contacted", count: 98, color: "bg-primary/60" },
  { label: "Qualified", count: 54, color: "bg-primary/45" },
  { label: "Demo", count: 31, color: "bg-primary/30" },
  { label: "Closed", count: 18, color: "bg-[#10B981]" },
];

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Contacted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Qualified: "bg-primary/15 text-primary border-primary/30",
  Demo: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Closed: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
};

export default function DemoCRMPage() {
  const { demoClientName } = useDemoModeStore();

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
          {KPIS.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </span>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
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
            </div>
          ))}
        </div>

        {/* Pipeline funnel */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Sales Pipeline</h3>
              <p className="text-xs text-muted-foreground">
                Conversion from lead to closed deal
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              12.7% conversion
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {FUNNEL.map((stage) => {
              const pct = (stage.count / FUNNEL[0].count) * 100;
              return (
                <div key={stage.label} className="flex items-center gap-3">
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
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Leads + Activity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Leads */}
          <div className="rounded-xl border border-border bg-card lg:col-span-2">
            <div className="border-b border-border p-5">
              <h3 className="text-sm font-semibold">Recent Leads</h3>
              <p className="text-xs text-muted-foreground">
                Auto-captured from WhatsApp, Instagram, Facebook & Google
              </p>
            </div>
            <div className="divide-y divide-border">
              {LEADS.map((lead) => (
                <div
                  key={lead.phone}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {lead.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{lead.name}</span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium",
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
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <h3 className="text-sm font-semibold">Activity Feed</h3>
              <p className="text-xs text-muted-foreground">Real-time events</p>
            </div>
            <div className="space-y-3 p-4">
              {ACTIVITIES.map((a, i) => (
                <div key={i} className="flex gap-3">
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
