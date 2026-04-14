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
} from "lucide-react";
import { toast } from "sonner";

// --------------- Types ---------------

interface Client {
  id: string;
  name: string;
  business: string | null;
  email: string | null;
  phone: string | null;
  stage: string;
  notes: string | null;
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

const INDUSTRY_COLORS: Record<string, string> = {
  "F&B": "#EF4444",
  "Real Estate": "#3B82F6",
  "Hair & Beauty": "#EC4899",
  Healthcare: "#10B981",
  Education: "#8B5CF6",
  "E-commerce": "#F59E0B",
  Finance: "#6366F1",
  Tech: "#06B6D4",
  Retail: "#F97316",
  Hospitality: "#14B8A6",
  Other: "#6B7280",
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

// --------------- Client Card ---------------

function ClientCard({
  client,
  onClick,
  onMove,
  onProbChange,
  onDelete,
}: {
  client: Client;
  onClick: () => void;
  onMove: (newStage: string) => void;
  onProbChange: (prob: number) => void;
  onDelete: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const isClosed = client.stage === "closed";
  const nextStage = getNextStage(client.stage);
  const isStalled = client.status === "stalled";
  const isActive = client.status === "active";

  return (
    <div className="group relative rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-4 transition-all hover:border-[#333]">
      {/* Delete button — top right */}
      {!confirmDel ? (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDel(true); }}
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground/0 transition-all group-hover:text-muted-foreground hover:!bg-red-500/20 hover:!text-red-400"
          title="Delete client"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); setConfirmDel(false); }}
            className="rounded-md bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDel(false); }}
            className="rounded-md bg-[#1E1E1E] px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Header — Name + alert */}
      <div className="mb-2 flex items-start justify-between gap-2 pr-6">
        <h4
          onClick={onClick}
          className="cursor-pointer text-sm font-semibold text-foreground leading-tight hover:text-primary transition-colors"
        >
          {client.name}
        </h4>
        {isStalled && (
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#F59E0B]" />
        )}
      </div>

      {/* Tags — Industry + Source */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {client.industry && (
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{
              backgroundColor: INDUSTRY_COLORS[client.industry] || "#6B7280",
            }}
          >
            {client.industry}
          </span>
        )}
        {client.source && (
          <span className="rounded-md border border-[#333] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            via {client.source}
          </span>
        )}
      </div>

      {/* Time + Status */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground/60">
          {timeAgo(client.created_at)}
        </span>
        {isStalled && (
          <span className="rounded-md bg-[#F59E0B]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#F59E0B]">
            Stalled ⚠
          </span>
        )}
        {isActive && client.stage !== "lead" && !isClosed && (
          <span className="rounded-md bg-[#10B981]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#10B981]">
            Active
          </span>
        )}
      </div>

      {/* Deal Value */}
      {!isClosed && (
        <p className="mb-2 text-sm font-semibold text-primary font-mono">
          {client.deal_value || "—"}
        </p>
      )}

      {/* Close Probability */}
      {!isClosed && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Close prob:</span>
          <input
            type="number"
            min={0}
            max={100}
            value={client.close_probability ?? 0}
            onChange={(e) => {
              const v = Math.max(0, Math.min(100, Number(e.target.value)));
              onProbChange(v);
            }}
            className="w-14 rounded-md border border-[#1E1E1E] bg-[#111111] px-2 py-1 text-xs font-mono text-foreground outline-none focus:border-primary text-center"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      )}

      {/* Notes */}
      {client.notes && (
        <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
          {client.notes}
        </p>
      )}

      {/* Closed state */}
      {isClosed && (
        <div className="mb-2 space-y-2">
          <div className="flex items-center gap-1.5 text-[#10B981]">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-semibold">
              Closed — paid client
            </span>
          </div>
          <button
            onClick={onClick}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#10B981]/10 py-2 text-xs font-semibold text-[#10B981] transition-colors hover:bg-[#10B981]/20"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Onboarding Checklist
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Move button */}
      {!isClosed && nextStage && (
        <button
          onClick={() => onMove(nextStage.key)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#1E1E1E] py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
        >
          Move to {nextStage.label}
          <ArrowRight className="h-3 w-3" />
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

// --------------- Client Detail (Read-Only) Modal ---------------

function ClientDetailModal({
  client,
  onClose,
  onEdit,
}: {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
}) {
  const stageInfo = STAGE_MAP[client.stage];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4">
          <h2 className="text-base font-semibold">{client.name}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {stageInfo && (
              <span
                className="rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: stageInfo.color }}
              >
                {stageInfo.label}
              </span>
            )}
            {client.industry && (
              <span
                className="rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: INDUSTRY_COLORS[client.industry] || "#6B7280" }}
              >
                {client.industry}
              </span>
            )}
            {client.status && (
              <span
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  client.status === "stalled"
                    ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                    : "bg-[#10B981]/15 text-[#10B981]"
                }`}
              >
                {client.status === "stalled" ? "Stalled" : "Active"}
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {client.business && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Business</p>
                <p className="text-sm flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{client.business}</p>
              </div>
            )}
            {client.email && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Email</p>
                <p className="text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Phone</p>
                <p className="text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{client.phone}</p>
              </div>
            )}
            {client.source && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Source</p>
                <p className="text-sm">{client.source}</p>
              </div>
            )}
            {client.deal_value && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Deal Value</p>
                <p className="text-sm font-semibold font-mono text-primary">{client.deal_value}</p>
              </div>
            )}
            {client.close_probability != null && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Close Probability</p>
                <p className="text-sm font-mono">{client.close_probability}%</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {client.notes && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex gap-4 text-[10px] text-muted-foreground/60 pt-2 border-t border-[#1E1E1E]">
            <span>Created {timeAgo(client.created_at)}</span>
            {client.updated_at && <span>Updated {timeAgo(client.updated_at)}</span>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onEdit}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Edit Client
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-[#1E1E1E] px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
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

  useEffect(() => {
    fetchClients();
    const interval = setInterval(fetchClients, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchClients]);

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

  // Filter
  const filtered = search
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.business?.toLowerCase().includes(search.toLowerCase()) ||
          c.industry?.toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  // Group by stage
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

  const totalClients = filtered.length;

  return (
    <PageWrapper title="Client Pipeline" lastSynced={lastFetched}>
      <div className="space-y-4">
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
      </div>

      {/* Client Detail (Read-Only) Modal */}
      {viewingClient && (
        <ClientDetailModal
          client={viewingClient}
          onClose={() => setViewingClient(null)}
          onEdit={() => {
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
