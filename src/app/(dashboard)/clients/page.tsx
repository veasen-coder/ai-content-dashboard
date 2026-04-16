"use client";

import { useState, useEffect, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Search,
  RefreshCw,
  Plus,
  X,
  Building2,
  Mail,
  Phone,
  StickyNote,
  Trash2,
  AlertCircle,
  Users,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Clock,
  Target,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Circle,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { ClientDetailPanel } from "@/components/client-detail-panel";
import {
  getClientStatus,
  STATUS_TONE_CLASSES,
} from "@/lib/client-status";

// --------------- Types ---------------

interface Client {
  id: string;
  name: string;
  business: string | null;
  email: string | null;
  phone: string | null;
  stage: string;
  notes: string | null;
  ai_summary: string | null;
  industry: string | null;
  source: string | null;
  deal_value: string | null;
  close_probability: number | null;
  status: string | null;
  onboarding_checklist: Record<string, boolean> | null;
  created_at: string;
  updated_at: string | null;
}

// --------------- Constants ---------------

const STAGES = [
  { key: "lead", label: "Lead", color: "#6B7280" },
  { key: "contacted", label: "Contacted", color: "#3B82F6" },
  { key: "demo_sent", label: "Demo Sent", color: "#8B5CF6" },
  { key: "negotiation", label: "Negotiation", color: "#F59E0B" },
  { key: "closed", label: "Closed", color: "#10B981" },
] as const;

const STAGE_MAP = Object.fromEntries(
  STAGES.map((s) => [s.key, s])
) as Record<string, (typeof STAGES)[number]>;

const INDUSTRIES = [
  "F&B",
  "Real Estate",
  "Hair & Beauty",
  "Healthcare",
  "Education",
  "E-commerce",
  "Finance",
  "Tech",
  "Retail",
  "Hospitality",
  "Other",
];

const SOURCES = [
  "Cold List",
  "IG DM",
  "WhatsApp",
  "Referral",
  "LinkedIn",
  "Website",
  "Event",
  "Other",
];

const DEFAULT_ONBOARDING_CHECKLIST: Record<string, boolean> = {
  "Contract Signed": false,
  "Payment Received": false,
  "Access Granted": false,
  "Kickoff Call Scheduled": false,
  "Kickoff Call Completed": false,
  "Assets Received": false,
  "Project Setup Done": false,
};

// --------------- Helpers ---------------

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "today";
}

function getNextStage(
  currentStage: string
): (typeof STAGES)[number] | undefined {
  const idx = STAGES.findIndex((s) => s.key === currentStage);
  if (idx >= 0 && idx < STAGES.length - 1) return STAGES[idx + 1];
  return undefined;
}

function daysSinceContact(dateStr: string | null): number {
  if (!dateStr) return 0;
  const now = new Date();
  const date = new Date(dateStr);
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function contactBadgeColor(days: number): string {
  if (days < 7) return "bg-[#10B981]/15 text-[#10B981]";
  if (days <= 14) return "bg-[#F59E0B]/15 text-[#F59E0B]";
  return "bg-[#EF4444]/15 text-[#EF4444]";
}

const NEXT_ACTION_MAP: Record<string, string> = {
  lead: "Send intro message",
  contacted: "Schedule demo",
  demo_sent: "Follow up on demo",
  negotiation: "Send proposal",
  closed: "Start onboarding",
};

function parseDealValueNumber(val: string | null): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

function formatMYR(value: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getChecklist(client: Client): Record<string, boolean> {
  return client.onboarding_checklist ?? { ...DEFAULT_ONBOARDING_CHECKLIST };
}

function getChecklistProgress(checklist: Record<string, boolean>): number {
  const items = Object.values(checklist);
  if (items.length === 0) return 0;
  const done = items.filter(Boolean).length;
  return Math.round((done / items.length) * 100);
}

// --------------- Pipeline Summary Stats ---------------

function PipelineSummaryStats({ clients }: { clients: Client[] }) {
  const nonClosed = clients.filter((c) => c.stage !== "closed");
  const closed = clients.filter((c) => c.stage === "closed");

  const totalPipelineValue = nonClosed.reduce(
    (sum, c) => sum + parseDealValueNumber(c.deal_value),
    0
  );

  const weightedForecast = nonClosed.reduce(
    (sum, c) =>
      sum +
      (parseDealValueNumber(c.deal_value) * (c.close_probability || 0)) / 100,
    0
  );

  const conversionRate =
    clients.length > 0
      ? Math.round((closed.length / clients.length) * 100)
      : 0;

  const allValues = clients
    .map((c) => parseDealValueNumber(c.deal_value))
    .filter((v) => v > 0);
  const avgDealSize =
    allValues.length > 0
      ? allValues.reduce((a, b) => a + b, 0) / allValues.length
      : 0;

  const stats = [
    {
      label: "Pipeline Value",
      value: formatMYR(totalPipelineValue),
      icon: DollarSign,
      color: "#7C3AED",
    },
    {
      label: "Weighted Forecast",
      value: formatMYR(weightedForecast),
      icon: Target,
      color: "#3B82F6",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: "#10B981",
    },
    {
      label: "Avg Deal Size",
      value: formatMYR(avgDealSize),
      icon: DollarSign,
      color: "#F59E0B",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <s.icon
              className="h-4 w-4"
              style={{ color: s.color }}
            />
            <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">
              {s.label}
            </span>
          </div>
          <p className="text-lg font-bold font-mono text-[#F5F5F5]">
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// --------------- Onboarding Summary Stats ---------------

function OnboardingSummaryStats({ clients }: { clients: Client[] }) {
  const totalOnboarding = clients.length;

  const completions = clients.map((c) => getChecklistProgress(getChecklist(c)));
  const avgCompletion =
    completions.length > 0
      ? Math.round(completions.reduce((a, b) => a + b, 0) / completions.length)
      : 0;

  const needsAttention = clients.filter((c) => {
    const progress = getChecklistProgress(getChecklist(c));
    const days = daysSinceContact(c.updated_at || c.created_at);
    return progress < 50 && days > 14;
  }).length;

  const stats = [
    {
      label: "Total Onboarding",
      value: `${totalOnboarding}`,
      icon: Users,
      color: "#7C3AED",
    },
    {
      label: "Avg Completion",
      value: `${avgCompletion}%`,
      icon: BarChart3,
      color: "#3B82F6",
    },
    {
      label: "Needs Attention",
      value: `${needsAttention}`,
      icon: AlertTriangle,
      color: needsAttention > 0 ? "#EF4444" : "#10B981",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <s.icon className="h-4 w-4" style={{ color: s.color }} />
            <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">
              {s.label}
            </span>
          </div>
          <p className="text-lg font-bold font-mono text-[#F5F5F5]">
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// --------------- Onboarding Client Card ---------------

function OnboardingCard({
  client,
  onToggleItem,
  onCompleteOnboarding,
}: {
  client: Client;
  onToggleItem: (clientId: string, itemKey: string, checked: boolean) => void;
  onCompleteOnboarding: (clientId: string) => void;
}) {
  const checklist = getChecklist(client);
  const entries = Object.entries(checklist);
  const doneCount = entries.filter(([, v]) => v).length;
  const totalCount = entries.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const allDone = doneCount === totalCount && totalCount > 0;
  const days = daysSinceContact(client.updated_at || client.created_at);

  return (
    <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5 transition-all hover:border-[#2A2A2A]">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[#F5F5F5] truncate">
            {client.name}
          </h3>
          {client.business && (
            <p className="mt-0.5 text-[12px] text-[#6B7280] truncate">
              {client.business}
            </p>
          )}
        </div>
        <div className="ml-4 flex items-center gap-3 shrink-0">
          {client.deal_value && (
            <span className="text-sm font-mono font-semibold text-[#7C3AED]">
              {client.deal_value}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${contactBadgeColor(days)}`}
          >
            <Clock className="h-2.5 w-2.5" />
            {days}d since closed
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] text-[#6B7280]">Onboarding Progress</span>
          <span className="text-[11px] font-mono font-semibold text-[#F5F5F5]">
            {progress}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#1E1E1E]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: progress === 100 ? "#10B981" : "#7C3AED",
            }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {entries.map(([key, done]) => (
          <button
            key={key}
            type="button"
            onClick={() => onToggleItem(client.id, key, !done)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#1A1A1A]"
          >
            {done ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-[#10B981]" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-[#6B7280]" />
            )}
            <span
              className={`text-sm ${
                done
                  ? "text-[#6B7280] line-through"
                  : "text-[#F5F5F5]"
              }`}
            >
              {key}
            </span>
          </button>
        ))}
      </div>

      {/* Complete onboarding button */}
      {allDone && (
        <button
          onClick={() => onCompleteOnboarding(client.id)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#10B981] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#059669]"
        >
          <CheckCircle2 className="h-4 w-4" />
          Complete Onboarding
        </button>
      )}
    </div>
  );
}

// --------------- Client Card ---------------

function ClientCard({
  client,
  onClick,
  onMove,
  onDelete,
  hasDemoScript,
}: {
  client: Client;
  onClick: () => void;
  onMove: (newStage: string) => void;
  onProbChange: (prob: number) => void;
  onDelete: () => void;
  hasDemoScript: boolean;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const isClosed = client.stage === "closed";
  const nextStage = getNextStage(client.stage);
  const isStalled = client.status === "stalled";

  const status = getClientStatus({
    stage: client.stage,
    has_ai_summary: !!client.ai_summary,
    has_demo_script: hasDemoScript,
    close_probability: client.close_probability,
    status: client.status,
  });

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-3 transition-all hover:border-primary/40 hover:bg-[#0F0F0F]"
    >
      {/* Delete button — top right */}
      {!confirmDel ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDel(true);
          }}
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground/0 transition-all group-hover:text-muted-foreground hover:!bg-red-500/20 hover:!text-red-400"
          title="Delete client"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setConfirmDel(false);
            }}
            className="rounded-md bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDel(false);
            }}
            className="rounded-md bg-[#1E1E1E] px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Header — Name + alert */}
      <div className="mb-1.5 flex items-start justify-between gap-2 pr-6">
        <h4 className="text-sm font-semibold text-foreground leading-tight truncate">
          {client.name}
        </h4>
        {isStalled && (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
        )}
      </div>

      {/* Business — secondary line */}
      {client.business && (
        <p className="mb-2 truncate text-[11px] text-muted-foreground">
          {client.business}
        </p>
      )}

      {/* Smart status badge + days since contact */}
      <div className="mb-2 flex items-center gap-1.5 flex-wrap">
        <span
          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE_CLASSES[status.tone]}`}
        >
          {status.label}
        </span>
        {(() => {
          const days = daysSinceContact(client.updated_at || client.created_at);
          return (
            <span
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${contactBadgeColor(days)}`}
            >
              <Clock className="h-2.5 w-2.5" />
              {days}d ago
            </span>
          );
        })()}
      </div>

      {/* Next action prompt */}
      {NEXT_ACTION_MAP[client.stage] && (
        <p className="mb-2 text-[10px] italic text-[#6B7280]">
          {NEXT_ACTION_MAP[client.stage]}
        </p>
      )}

      {/* Short AI summary — single line with ellipsis */}
      {client.ai_summary ? (
        <p className="mb-2 text-[11px] text-muted-foreground/80 leading-relaxed line-clamp-2">
          {client.ai_summary}
        </p>
      ) : client.notes ? (
        <p className="mb-2 text-[11px] text-muted-foreground/50 italic leading-relaxed line-clamp-1">
          Click to generate AI summary
        </p>
      ) : null}

      {/* Footer — time + deal value + arrow */}
      <div className="flex items-center justify-between pt-1.5 border-t border-[#1E1E1E]">
        <span className="text-[10px] text-muted-foreground/60">
          {timeAgo(client.created_at)}
        </span>
        {client.deal_value && !isClosed && (
          <span className="text-[11px] font-mono font-semibold text-primary truncate ml-2">
            {client.deal_value}
          </span>
        )}
        {isClosed && (
          <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
        )}
      </div>

      {/* Quick move button — only visible on hover */}
      {!isClosed && nextStage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMove(nextStage.key);
          }}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-[#1E1E1E] py-1 text-[10px] font-medium text-muted-foreground/70 opacity-0 transition-all group-hover:opacity-100 hover:border-primary/30 hover:text-foreground"
        >
          → {nextStage.label}
          <ArrowRight className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

// --------------- Pipeline Progress Bar ---------------

function PipelineProgress({
  stageGroups,
}: {
  stageGroups: Map<string, Client[]>;
}) {
  const counts = STAGES.map((s) => ({
    ...s,
    count: stageGroups.get(s.key)?.length || 0,
  }));

  // Calculate conversion rates between stages
  const rates: (string | null)[] = [];
  for (let i = 0; i < counts.length - 1; i++) {
    if (counts[i].count > 0 && counts[i + 1].count > 0) {
      const rate = Math.round((counts[i + 1].count / counts[i].count) * 100);
      rates.push(`${rate}%`);
    } else {
      rates.push("—");
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-[#1E1E1E] bg-[#111111] px-5 py-3 overflow-x-auto">
      {counts.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-xl font-bold font-mono text-foreground">
              {s.count}
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {s.label}
            </span>
          </div>
          {i < counts.length - 1 && (
            <div className="flex flex-col items-center mx-2">
              <span className="text-[10px] font-mono text-muted-foreground/60 mb-0.5">
                {rates[i]}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --------------- Add / Edit Client Modal ---------------

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  client?: Client | null;
}

function ClientModal({ isOpen, onClose, onSaved, client }: ClientModalProps) {
  const isEdit = !!client;

  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState("lead");
  const [notes, setNotes] = useState("");
  const [industry, setIndustry] = useState("");
  const [source, setSource] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [closeProb, setCloseProb] = useState(0);
  const [status, setStatus] = useState("active");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setBusiness(client.business || "");
      setEmail(client.email || "");
      setPhone(client.phone || "");
      setStage(client.stage);
      setNotes(client.notes || "");
      setIndustry(client.industry || "");
      setSource(client.source || "");
      setDealValue(client.deal_value || "");
      setCloseProb(client.close_probability ?? 0);
      setStatus(client.status || "active");
    } else {
      resetForm();
    }
    setConfirmDelete(false);
  }, [client, isOpen]);

  function resetForm() {
    setName("");
    setBusiness("");
    setEmail("");
    setPhone("");
    setStage("lead");
    setNotes("");
    setIndustry("");
    setSource("");
    setDealValue("");
    setCloseProb(0);
    setStatus("active");
    setConfirmDelete(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        business: business.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        stage,
        notes: notes.trim() || null,
        industry: industry || null,
        source: source || null,
        deal_value: dealValue.trim() || null,
        close_probability: closeProb,
        status,
      };

      if (isEdit) {
        payload.id = client!.id;
        const res = await fetch("/api/supabase/clients", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update client");
        }
        toast.success("Client updated");
      } else {
        const res = await fetch("/api/supabase/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create client");
        }
        toast.success("Client added to pipeline");
      }

      resetForm();
      onClose();
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save client"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/supabase/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client!.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete client");
      }
      toast.success("Client deleted");
      resetForm();
      onClose();
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete client"
      );
    } finally {
      setSubmitting(false);
      setConfirmDelete(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edit Client" : "Add Lead"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client or business name..."
              autoFocus
              required
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Industry + Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              >
                <option value="">Select...</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              >
                <option value="">Select...</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deal Value + Close Probability */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Deal Value
              </label>
              <input
                type="text"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="RM 399/mo"
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary font-mono"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Close Probability
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={closeProb}
                  onChange={(e) =>
                    setCloseProb(
                      Math.max(0, Math.min(100, Number(e.target.value)))
                    )
                  }
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary font-mono"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Business */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Contact / Business
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                placeholder="Company name..."
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+60 12-345 6789"
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Stage + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Stage
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStage(s.key)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                      stage === s.key
                        ? "text-white ring-1 ring-white/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={{
                      backgroundColor:
                        stage === s.key ? s.color : "#1E1E1E",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </label>
              <div className="flex gap-1.5">
                {[
                  { key: "active", label: "Active", color: "#10B981" },
                  { key: "stalled", label: "Stalled", color: "#F59E0B" },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatus(s.key)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                      status === s.key
                        ? "text-white ring-1 ring-white/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={{
                      backgroundColor:
                        status === s.key ? s.color : "#1E1E1E",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Notes / Next Action
            </label>
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Next steps, context, or strategy..."
                rows={3}
                className="w-full resize-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#1E1E1E] pt-4">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  confirmDelete
                    ? "bg-[#EF4444] text-white"
                    : "text-[#EF4444] hover:bg-[#EF4444]/10"
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirmDelete ? "Confirm Delete" : "Delete"}
              </button>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                Client will be added as Lead
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || submitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting
                  ? isEdit
                    ? "Saving..."
                    : "Adding..."
                  : isEdit
                  ? "Save Changes"
                  : "Add Lead"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --------------- Main Page ---------------

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [demoScriptClientIds, setDemoScriptClientIds] = useState<Set<string>>(
    new Set()
  );
  const [activeView, setActiveView] = useState<"leads" | "clients" | "onboarding">("leads");

  const fetchClients = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/supabase/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data || []);
      setLastFetched(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch which clients have demo scripts (for status computation on cards)
  const fetchDemoScriptIds = useCallback(async () => {
    try {
      const res = await fetch("/api/supabase/demo-scripts");
      if (!res.ok) return;
      const data: { client_id: string }[] = await res.json();
      setDemoScriptClientIds(new Set(data.map((d) => d.client_id)));
    } catch {
      // silent — not critical
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchDemoScriptIds();
    const interval = setInterval(() => {
      fetchClients();
      fetchDemoScriptIds();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchClients, fetchDemoScriptIds]);

  // Inline update helper
  async function updateClient(id: string, fields: Record<string, unknown>) {
    try {
      const res = await fetch("/api/supabase/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...fields }),
      });
      if (!res.ok) throw new Error("Update failed");

      // Update local state immediately
      setClients((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...fields } as Client : c))
      );
    } catch {
      toast.error("Failed to update client");
    }
  }

  async function moveClient(client: Client, newStage: string) {
    await updateClient(client.id, { stage: newStage });
    toast.success(`Moved ${client.name} to ${STAGE_MAP[newStage]?.label}`);
  }

  async function deleteClient(client: Client) {
    try {
      const res = await fetch("/api/supabase/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      toast.success(`Deleted ${client.name}`);
    } catch {
      toast.error("Failed to delete client");
    }
  }

  // Onboarding checklist toggle
  async function toggleOnboardingItem(
    clientId: string,
    itemKey: string,
    checked: boolean
  ) {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const currentChecklist = getChecklist(client);
    const updatedChecklist = { ...currentChecklist, [itemKey]: checked };

    // Optimistic update
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, onboarding_checklist: updatedChecklist }
          : c
      )
    );

    try {
      const res = await fetch("/api/supabase/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: clientId,
          onboarding_checklist: updatedChecklist,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch {
      // Revert on failure
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? { ...c, onboarding_checklist: client.onboarding_checklist }
            : c
        )
      );
      toast.error("Failed to update checklist");
    }
  }

  async function completeOnboarding(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    toast.success(`${client.name} onboarding completed!`);
  }

  // Filter
  const filtered = search
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.business?.toLowerCase().includes(search.toLowerCase()) ||
          c.industry?.toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  // Group by stage (for leads view)
  const stageGroups = new Map<string, Client[]>();
  for (const s of STAGES) {
    stageGroups.set(s.key, []);
  }
  for (const client of filtered) {
    const group = stageGroups.get(client.stage);
    if (group) {
      group.push(client);
    } else {
      stageGroups.get("lead")!.push(client);
    }
  }

  // Onboarding clients (closed stage only)
  const onboardingClients = filtered.filter((c) => c.stage === "closed");

  const totalClients = filtered.length;

  const activeClients = filtered.filter(
    (c) => c.stage === "closed" && c.status !== "stalled"
  );

  // MRR calculation for "Clients" tab — parse monthly values from closed clients
  const totalMRR = activeClients.reduce((sum, c) => {
    const val = parseDealValueNumber(c.deal_value);
    // If deal_value contains "/mo" or is a monthly value, use directly
    return sum + val;
  }, 0);

  const viewSwitcher = (
    <div className="inline-flex rounded-lg border border-[#1E1E1E] bg-[#111111] p-1">
      {([
        { key: "leads" as const, label: "Leads" },
        { key: "clients" as const, label: "Clients", count: activeClients.length },
        { key: "onboarding" as const, label: "Onboarding", count: onboardingClients.length },
      ]).map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveView(tab.key)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
            activeView === tab.key
              ? "bg-[#7C3AED] text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#F5F5F5]"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <PageWrapper title="Client Pipeline" lastSynced={lastFetched} headerExtra={viewSwitcher}>
      <div className="space-y-4">
        {activeView === "leads" ? (
          <>
            {/* Pipeline Summary Stats */}
            {!loading && !error && filtered.length > 0 && (
              <PipelineSummaryStats clients={filtered} />
            )}

            {/* Pipeline Progress */}
            {!loading && !error && (
              <PipelineProgress stageGroups={stageGroups} />
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-3">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#111111] py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono text-muted-foreground">
                  {totalClients}
                </span>
              </div>
              <button
                onClick={fetchClients}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex gap-3 overflow-x-auto pb-4">
                {STAGES.map((s) => (
                  <div key={s.key} className="min-w-[260px] flex-shrink-0 space-y-2">
                    <div className="h-6 w-24 animate-pulse rounded bg-[#1E1E1E]" />
                    <div className="space-y-2 rounded-xl border border-[#1E1E1E] bg-[#111111] p-2">
                      {[1, 2].map((j) => (
                        <div
                          key={j}
                          className="h-32 animate-pulse rounded-lg bg-[#1E1E1E]"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E1E1E] bg-[#111111] py-16">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={fetchClients}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Kanban Columns */}
            {!loading && !error && (
              <div className="flex gap-3 overflow-x-auto pb-4 pr-4">
                {STAGES.map((s) => {
                  const stageClients = stageGroups.get(s.key) || [];
                  return (
                    <div
                      key={s.key}
                      className="min-w-[260px] w-[260px] flex-shrink-0"
                    >
                      {/* Stage Header */}
                      <div className="mb-2 flex items-center gap-2 px-1">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <h3 className="text-sm font-semibold text-foreground">
                          {s.label}
                        </h3>
                        <span className="text-xs font-mono text-muted-foreground">
                          {stageClients.length}
                        </span>
                      </div>

                      {/* Column */}
                      <div className="space-y-3 min-h-[200px]">
                        {stageClients.length === 0 ? (
                          <div className="flex items-center justify-center rounded-xl border border-dashed border-[#1E1E1E] py-16">
                            <p className="text-xs text-muted-foreground/50">
                              No clients
                            </p>
                          </div>
                        ) : (
                          stageClients.map((client) => (
                            <ClientCard
                              key={client.id}
                              client={client}
                              hasDemoScript={demoScriptClientIds.has(client.id)}
                              onClick={() => {
                                setViewingClient(client);
                              }}
                              onMove={(newStage) => moveClient(client, newStage)}
                              onProbChange={(prob) =>
                                updateClient(client.id, {
                                  close_probability: prob,
                                })
                              }
                              onDelete={() => deleteClient(client)}
                            />
                          ))
                        )}

                        {/* Add lead button — only on Lead column */}
                        {s.key === "lead" && (
                          <button
                            onClick={() => {
                              setSelectedClient(null);
                              setShowModal(true);
                            }}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#1E1E1E] py-3 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add lead
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : activeView === "clients" ? (
          <>
            {/* Active Clients View */}

            {/* Client Stats */}
            {!loading && !error && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#7C3AED]" />
                    <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">
                      Active Clients
                    </span>
                  </div>
                  <p className="text-lg font-bold font-mono text-[#F5F5F5]">
                    {activeClients.length}
                  </p>
                </div>
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#10B981]" />
                    <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">
                      MRR
                    </span>
                  </div>
                  <p className="text-lg font-bold font-mono text-[#10B981]">
                    {formatMYR(totalMRR)}
                    <span className="text-xs text-[#6B7280] font-normal ml-1">/mo</span>
                  </p>
                </div>
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#3B82F6]" />
                    <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">
                      ARR
                    </span>
                  </div>
                  <p className="text-lg font-bold font-mono text-[#F5F5F5]">
                    {formatMYR(totalMRR * 12)}
                    <span className="text-xs text-[#6B7280] font-normal ml-1">/yr</span>
                  </p>
                </div>
                <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#F59E0B]" />
                    <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">
                      Avg Revenue / Client
                    </span>
                  </div>
                  <p className="text-lg font-bold font-mono text-[#F5F5F5]">
                    {activeClients.length > 0
                      ? formatMYR(totalMRR / activeClients.length)
                      : "RM 0"}
                    <span className="text-xs text-[#6B7280] font-normal ml-1">/mo</span>
                  </p>
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-3">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#111111] py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={fetchClients}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl border border-[#1E1E1E] bg-[#111111]"
                  />
                ))}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E1E1E] bg-[#111111] py-16">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={fetchClients}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Client List */}
            {!loading && !error && (
              <div className="space-y-3">
                {activeClients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E1E1E] bg-[#111111] py-16">
                    <Users className="mb-3 h-8 w-8 text-[#6B7280]" />
                    <p className="text-sm text-[#6B7280]">No active clients yet</p>
                    <p className="mt-1 text-xs text-[#6B7280]/60">
                      Close deals in the Leads pipeline to see them here
                    </p>
                  </div>
                ) : (
                  activeClients.map((client) => {
                    const days = daysSinceContact(client.updated_at || client.created_at);
                    const dealVal = parseDealValueNumber(client.deal_value);
                    return (
                      <div
                        key={client.id}
                        onClick={() => setViewingClient(client)}
                        className="group flex cursor-pointer items-center gap-4 rounded-xl border border-[#1E1E1E] bg-[#111111] p-4 transition-all hover:border-primary/40 hover:bg-[#141414]"
                      >
                        {/* Avatar */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/15 text-sm font-bold text-[#7C3AED]">
                          {client.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-[#F5F5F5] truncate">
                            {client.name}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-2">
                            {client.business && (
                              <span className="text-xs text-[#6B7280] truncate">
                                {client.business}
                              </span>
                            )}
                            {client.industry && (
                              <span className="rounded border border-[#1E1E1E] px-1.5 py-0.5 text-[10px] text-[#6B7280]">
                                {client.industry}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Deal Value */}
                        <div className="text-right shrink-0">
                          {dealVal > 0 && (
                            <p className="text-sm font-mono font-semibold text-[#10B981]">
                              {client.deal_value}
                            </p>
                          )}
                        </div>

                        {/* Last Contact */}
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${contactBadgeColor(days)}`}
                        >
                          <Clock className="h-2.5 w-2.5" />
                          {days}d ago
                        </span>

                        {/* Arrow */}
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#6B7280] opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Onboarding View */}

            {/* Onboarding Summary Stats */}
            {!loading && !error && (
              <OnboardingSummaryStats clients={onboardingClients} />
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-3">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search onboarding clients..."
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#111111] py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono text-muted-foreground">
                  {onboardingClients.length}
                </span>
              </div>
              <button
                onClick={fetchClients}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1A1A1A] hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-xl border border-[#1E1E1E] bg-[#111111]"
                  />
                ))}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E1E1E] bg-[#111111] py-16">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={fetchClients}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Onboarding Cards */}
            {!loading && !error && (
              <div className="space-y-3">
                {onboardingClients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E1E1E] bg-[#111111] py-16">
                    <CheckCircle2 className="mb-3 h-8 w-8 text-[#6B7280]" />
                    <p className="text-sm text-[#6B7280]">
                      No clients in onboarding
                    </p>
                    <p className="mt-1 text-xs text-[#6B7280]/60">
                      Close a deal in the Leads pipeline to start onboarding
                    </p>
                  </div>
                ) : (
                  onboardingClients.map((client) => (
                    <OnboardingCard
                      key={client.id}
                      client={client}
                      onToggleItem={toggleOnboardingItem}
                      onCompleteOnboarding={completeOnboarding}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Client Detail Slide-over (with Demo Generator) */}
      {viewingClient && (
        <ClientDetailPanel
          client={viewingClient}
          hasDemoScript={demoScriptClientIds.has(viewingClient.id)}
          onClose={() => {
            setViewingClient(null);
            // Refresh demo script map after panel closes (might have created one)
            fetchDemoScriptIds();
          }}
          onUpdate={(updated) => {
            setViewingClient(updated);
            setClients((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
          }}
          onOpenFullEdit={() => {
            setSelectedClient(viewingClient);
            setViewingClient(null);
            setShowModal(true);
          }}
        />
      )}

      {/* Add / Edit Client Modal */}
      <ClientModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedClient(null);
        }}
        onSaved={fetchClients}
        client={selectedClient}
      />
    </PageWrapper>
  );
}
