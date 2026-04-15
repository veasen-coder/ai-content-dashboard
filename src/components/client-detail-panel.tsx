"use client";

import { useState, useEffect } from "react";
import {
  X,
  Building2,
  Mail,
  Phone,
  Sparkles,
  Loader2,
  Edit3,
  Check,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { DemoScriptSection } from "./demo-script-section";
import {
  getClientStatus,
  STATUS_TONE_CLASSES,
  shouldShowDemoButton,
} from "@/lib/client-status";

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

interface Props {
  client: Client;
  onClose: () => void;
  onUpdate: (updated: Client) => void;
  onOpenFullEdit: () => void;
  hasDemoScript?: boolean;
}

export function ClientDetailPanel({
  client,
  onClose,
  onUpdate,
  onOpenFullEdit,
  hasDemoScript = false,
}: Props) {
  // Inline editable fields
  const [summary, setSummary] = useState(client.ai_summary || "");
  const [notes, setNotes] = useState(client.notes || "");
  const [editingSummary, setEditingSummary] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [savingField, setSavingField] = useState(false);
  const [demoScriptExists, setDemoScriptExists] = useState(hasDemoScript);

  // Keep local state in sync when panel switches clients
  useEffect(() => {
    setSummary(client.ai_summary || "");
    setNotes(client.notes || "");
    setEditingSummary(false);
    setEditingNotes(false);
  }, [client.id, client.ai_summary, client.notes]);

  // Check if demo script exists on mount
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(
          `/api/supabase/demo-scripts?client_id=${client.id}`
        );
        if (res.ok) {
          const data = await res.json();
          setDemoScriptExists(data && data.length > 0);
        }
      } catch {
        // ignore
      }
    }
    check();
  }, [client.id]);

  async function saveField(field: keyof Client, value: string | null) {
    setSavingField(true);
    try {
      const res = await fetch("/api/supabase/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.id, [field]: value }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = { ...client, [field]: value };
      onUpdate(updated);
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingField(false);
    }
  }

  async function handleGenerateSummary() {
    setGeneratingSummary(true);
    try {
      const res = await fetch("/api/claude/generate-client-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client }),
      });
      if (!res.ok) throw new Error("Failed");
      const { summary: newSummary } = await res.json();
      if (!newSummary) {
        toast.error("Not enough info to summarize — add notes first");
        return;
      }
      setSummary(newSummary);
      await saveField("ai_summary", newSummary);
    } catch {
      toast.error("Failed to generate summary");
    } finally {
      setGeneratingSummary(false);
    }
  }

  const status = getClientStatus({
    stage: client.stage,
    has_ai_summary: !!client.ai_summary,
    has_demo_script: demoScriptExists,
    close_probability: client.close_probability,
    status: client.status,
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over */}
      <aside className="h-full w-full max-w-[500px] overflow-y-auto border-l border-[#1E1E1E] bg-[#111111] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[#1E1E1E] bg-[#111111]/95 backdrop-blur px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground truncate">
                {client.name}
              </h2>
              {client.business && (
                <p className="text-xs text-muted-foreground truncate">
                  {client.business}
                </p>
              )}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE_CLASSES[status.tone]}`}
                >
                  {status.label}
                </span>
                {client.industry && (
                  <span className="rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {client.industry}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenFullEdit}
                className="rounded-md border border-[#1E1E1E] bg-[#0A0A0A] p-1.5 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                title="Full edit"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          {/* AI Summary */}
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                AI Summary
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleGenerateSummary}
                  disabled={generatingSummary}
                  className="flex items-center gap-1 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:opacity-50"
                >
                  {generatingSummary ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {client.ai_summary ? "Regenerate" : "Generate"}
                </button>
                <button
                  onClick={() => setEditingSummary(!editingSummary)}
                  className="rounded-md border border-[#1E1E1E] bg-[#0A0A0A] p-1 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  {editingSummary ? (
                    <Check className="h-3 w-3 text-[#10B981]" />
                  ) : (
                    <Pencil className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
            {editingSummary ? (
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                onBlur={async () => {
                  setEditingSummary(false);
                  if (summary !== (client.ai_summary || "")) {
                    await saveField("ai_summary", summary || null);
                  }
                }}
                autoFocus
                rows={2}
                className="w-full resize-none rounded-lg border border-primary/30 bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary"
              />
            ) : (
              <p className="text-sm text-foreground/80 leading-relaxed min-h-[1.5rem]">
                {client.ai_summary || (
                  <span className="italic text-muted-foreground/60">
                    No summary yet — click Generate.
                  </span>
                )}
              </p>
            )}
          </section>

          {/* Contact info */}
          <section className="grid grid-cols-2 gap-3">
            {client.business && (
              <Info icon={<Building2 className="h-3 w-3" />} label="Business">
                {client.business}
              </Info>
            )}
            {client.email && (
              <Info icon={<Mail className="h-3 w-3" />} label="Email">
                {client.email}
              </Info>
            )}
            {client.phone && (
              <Info icon={<Phone className="h-3 w-3" />} label="Phone">
                {client.phone}
              </Info>
            )}
            {client.source && (
              <Info label="Source">{client.source}</Info>
            )}
            {client.deal_value && (
              <Info label="Deal Value">
                <span className="font-mono text-primary">
                  {client.deal_value}
                </span>
              </Info>
            )}
            {client.close_probability != null && (
              <Info label="Close Probability">
                <span className="font-mono">{client.close_probability}%</span>
              </Info>
            )}
          </section>

          {/* Notes (inline editable) */}
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Notes
              </p>
              <button
                onClick={() => setEditingNotes(!editingNotes)}
                className="rounded-md border border-[#1E1E1E] bg-[#0A0A0A] p-1 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                {editingNotes ? (
                  <Check className="h-3 w-3 text-[#10B981]" />
                ) : (
                  <Pencil className="h-3 w-3" />
                )}
              </button>
            </div>
            {editingNotes ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={async () => {
                  setEditingNotes(false);
                  if (notes !== (client.notes || "")) {
                    await saveField("notes", notes || null);
                  }
                }}
                autoFocus
                rows={6}
                className="w-full resize-y rounded-lg border border-primary/30 bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary"
              />
            ) : (
              <p className="rounded-lg bg-[#0A0A0A] px-3 py-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap min-h-[3rem]">
                {client.notes || (
                  <span className="italic text-muted-foreground/60">
                    No notes yet.
                  </span>
                )}
              </p>
            )}
          </section>

          {/* Demo Script section */}
          {shouldShowDemoButton(client.stage) && (
            <section>
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Demo Package
              </p>
              <DemoScriptSection
                client={{
                  id: client.id,
                  name: client.name,
                  business: client.business,
                  email: client.email,
                  industry: client.industry,
                  stage: client.stage,
                  source: client.source,
                  notes: client.notes,
                  ai_summary: client.ai_summary,
                  deal_value: client.deal_value,
                }}
              />
            </section>
          )}

          {/* Footer status */}
          {savingField && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Info({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-xs text-foreground flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="truncate">{children}</span>
      </p>
    </div>
  );
}
