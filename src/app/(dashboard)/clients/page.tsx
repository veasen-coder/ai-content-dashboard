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
  ChevronRight,
  AlertCircle,
  Users,
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
  onboarding_checklist: Record<string, boolean> | null;
  created_at: string;
  updated_at: string | null;
}

// --------------- Constants ---------------

const STAGES = [
  { key: "lead", label: "Lead", color: "#6B7280" },
  { key: "book_call", label: "Book Call", color: "#F59E0B" },
  { key: "call", label: "Call", color: "#3B82F6" },
  { key: "thank_you", label: "Thank You", color: "#8B5CF6" },
  { key: "meeting_minutes", label: "Meeting Minutes", color: "#EC4899" },
  { key: "demo", label: "Demo", color: "#14B8A6" },
  { key: "follow_up", label: "Follow Up", color: "#F97316" },
  { key: "closing", label: "Closing", color: "#EF4444" },
  { key: "onboarding", label: "Onboarding", color: "#6366F1" },
  { key: "active", label: "Active", color: "#10B981" },
  { key: "churned", label: "Churned", color: "#374151" },
] as const;

const STAGE_MAP = Object.fromEntries(
  STAGES.map((s) => [s.key, s])
) as Record<string, (typeof STAGES)[number]>;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// --------------- Client Card ---------------

function ClientCard({
  client,
  onClick,
}: {
  client: Client;
  onClick: () => void;
}) {
  const stage = STAGE_MAP[client.stage] || STAGES[0];

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3 transition-all hover:border-[#333] hover:bg-[#141414]"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground leading-tight truncate">
          {client.name}
        </h4>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
      </div>
      {client.business && (
        <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <Building2 className="h-3 w-3 shrink-0" />
          {client.business}
        </p>
      )}
      {client.email && (
        <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <Mail className="h-3 w-3 shrink-0" />
          {client.email}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span
          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: stage.color }}
        >
          {stage.label}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60">
          {formatDate(client.created_at)}
        </span>
      </div>
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
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (client) {
      setName(client.name);
      setBusiness(client.business || "");
      setEmail(client.email || "");
      setPhone(client.phone || "");
      setStage(client.stage);
      setNotes(client.notes || "");
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-5 py-4">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edit Client" : "Add Client"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
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
              placeholder="Client name..."
              autoFocus
              required
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Business */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Business
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

          {/* Email + Phone Row */}
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

          {/* Stage */}
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

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Notes
            </label>
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
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
                Client will be added to pipeline
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
                  : "Add Client"}
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

  // Filter clients by search
  const filtered = search
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.business?.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
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
      // Unknown stage, put in lead
      stageGroups.get("lead")!.push(client);
    }
  }

  const totalClients = filtered.length;

  function openAdd() {
    setSelectedClient(null);
    setShowModal(true);
  }

  function openEdit(client: Client) {
    setSelectedClient(client);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedClient(null);
  }

  return (
    <PageWrapper title="Clients" lastSynced={lastFetched}>
      <div className="space-y-4">
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
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="min-w-[240px] flex-shrink-0 space-y-2">
                <div className="h-6 w-24 animate-pulse rounded bg-[#1E1E1E]" />
                <div className="space-y-2 rounded-xl border border-[#1E1E1E] bg-[#111111] p-2">
                  {[1, 2].map((j) => (
                    <div
                      key={j}
                      className="h-24 animate-pulse rounded-lg bg-[#1E1E1E]"
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

        {/* Pipeline Kanban */}
        {!loading && !error && (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((s) => {
              const stageClients = stageGroups.get(s.key) || [];
              return (
                <div
                  key={s.key}
                  className="min-w-[250px] max-w-[280px] flex-shrink-0"
                >
                  {/* Stage Header */}
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </h3>
                    <span
                      className="ml-auto rounded-md px-1.5 py-0.5 text-xs font-mono text-white"
                      style={{ backgroundColor: s.color + "40" }}
                    >
                      {stageClients.length}
                    </span>
                  </div>

                  {/* Column */}
                  <div className="space-y-2 rounded-xl border border-[#1E1E1E] bg-[#111111] p-2 min-h-[200px]">
                    {stageClients.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-xs text-muted-foreground/50">
                          No clients
                        </p>
                      </div>
                    ) : (
                      stageClients.map((client) => (
                        <ClientCard
                          key={client.id}
                          client={client}
                          onClick={() => openEdit(client)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Client Modal */}
      <ClientModal
        isOpen={showModal}
        onClose={closeModal}
        onSaved={fetchClients}
        client={selectedClient}
      />
    </PageWrapper>
  );
}
