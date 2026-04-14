"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  ImagePlus,
  Upload,
  Trash2,
  Sparkles,
  Check,
  X,
  Loader2,
  ChevronRight,
  Phone,
  Mail,
  Building2,
  User,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  ImageDump,
  AnalysisResult,
  AnalysisGroup,
} from "@/types";

// ─── Pending image before upload ─────────────────────────────
interface PendingImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
  mime_type: string;
}

// ─── Helpers ─────────────────────────────────────────────────
function uid() {
  return crypto.randomUUID();
}

async function fileToBase64(file: File): Promise<string> {
  // Compress if > 1MB
  if (file.size > 1_000_000 && file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8)
    );
    const buf = await blob.arrayBuffer();
    return btoa(
      new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), "")
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: { label: "Pending", color: "text-yellow-400", icon: Clock },
  analyzing: { label: "Analyzing", color: "text-blue-400", icon: Loader2 },
  reviewed: { label: "Reviewed", color: "text-purple-400", icon: AlertCircle },
  approved: { label: "Approved", color: "text-emerald-400", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-400", icon: XCircle },
  partial: { label: "Partial", color: "text-orange-400", icon: AlertCircle },
};

const SENTIMENT_COLORS = {
  positive: "bg-emerald-500/20 text-emerald-400",
  neutral: "bg-gray-500/20 text-gray-400",
  negative: "bg-red-500/20 text-red-400",
};

const LEAD_COLORS = {
  high: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-gray-500/20 text-gray-400",
  none: "bg-red-500/20 text-red-400",
};

// ═════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════
export default function ImageDumpPage() {
  const [dumps, setDumps] = useState<ImageDump[]>([]);
  const [activeDumpId, setActiveDumpId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDump = dumps.find((d) => d.id === activeDumpId) || null;

  // ─── Fetch dumps ──────────────────────────────────────────
  const fetchDumps = useCallback(async () => {
    try {
      const res = await fetch("/api/supabase/image-dumps");
      if (res.ok) {
        const data = await res.json();
        setDumps(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDumps();
  }, [fetchDumps]);

  // ─── Create new dump ──────────────────────────────────────
  async function handleNewDump() {
    setActiveDumpId(null);
    setPendingImages([]);
    setNotes("");
    setCreating(true);
  }

  // ─── File handling ────────────────────────────────────────
  async function processFiles(files: FileList | File[]) {
    const newImages: PendingImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await fileToBase64(file);
      newImages.push({
        id: uid(),
        file,
        preview: URL.createObjectURL(file),
        base64,
        mime_type: file.type === "image/jpeg" ? "image/jpeg" : "image/png",
      });
    }
    setPendingImages((prev) => [...prev, ...newImages]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) processFiles(files);
  }

  function removeImage(id: string) {
    setPendingImages((prev) => {
      const img = prev.find((p) => p.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((p) => p.id !== id);
    });
  }

  // ─── Analyze ──────────────────────────────────────────────
  async function handleAnalyze() {
    if (!pendingImages.length) return;
    setAnalyzing(true);

    try {
      // 1. Create dump
      const dumpRes = await fetch("/api/supabase/image-dumps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Image Dump — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
          notes: notes || null,
        }),
      });
      const dump = await dumpRes.json();
      if (!dumpRes.ok) throw new Error(dump.error);

      // 2. Upload images
      const itemsRes = await fetch("/api/supabase/image-dump-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dump_id: dump.id,
          items: pendingImages.map((img) => ({
            file_name: img.file.name,
            mime_type: img.mime_type,
            base64_data: img.base64,
          })),
        }),
      });
      const items = await itemsRes.json();
      if (!itemsRes.ok) throw new Error(items.error);

      // 3. Update status to analyzing
      await fetch("/api/supabase/image-dumps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dump.id, status: "analyzing" }),
      });

      // 4. Send to Claude Vision
      const analyzeRes = await fetch("/api/claude/analyze-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: pendingImages.map((img, i) => ({
            id: items[i]?.id || img.id,
            mime_type: img.mime_type,
            base64_data: img.base64,
          })),
          notes: notes || "",
        }),
      });
      const analysis: AnalysisResult = await analyzeRes.json();

      // Add pending approval status to each group
      if (analysis.groups) {
        analysis.groups = analysis.groups.map((g) => ({
          ...g,
          id: g.id || uid(),
          approval_status: "pending" as const,
          image_item_ids:
            g.image_item_ids?.length
              ? g.image_item_ids
              : items.map((it: { id: string }) => it.id),
        }));
      }

      // 5. Save analysis result
      await fetch("/api/supabase/image-dumps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dump.id,
          status: "reviewed",
          analysis_result: analysis,
        }),
      });

      toast.success("Analysis complete!");
      setPendingImages([]);
      setNotes("");
      setCreating(false);
      await fetchDumps();
      setActiveDumpId(dump.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to analyze images"
      );
    } finally {
      setAnalyzing(false);
    }
  }

  // ─── Approve / Reject group ───────────────────────────────
  async function handleGroupAction(
    groupId: string,
    action: "approved" | "rejected"
  ) {
    if (!activeDump?.analysis_result) return;

    const result = { ...activeDump.analysis_result };
    const group = result.groups.find((g) => g.id === groupId);
    if (!group) return;

    group.approval_status = action;

    // If approved, create lead + tasks
    if (action === "approved") {
      try {
        // Create client lead
        if (group.contacts.length > 0) {
          const contact = group.contacts[0];
          await fetch("/api/supabase/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: contact.name,
              business: contact.business || null,
              email: contact.email || null,
              phone: contact.phone || null,
              stage: "lead",
              source:
                group.category === "whatsapp"
                  ? "WhatsApp"
                  : group.category === "instagram_dm"
                    ? "IG DM"
                    : "Other",
              notes: `[Auto-created from Image Dump]\n${group.conversation_summary}`,
            }),
          });
          toast.success(`Lead created: ${contact.name}`);
        }

        // Create tasks for action items
        for (const item of group.action_items) {
          await fetch("/api/clickup/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item,
              description: `From Image Dump: ${group.label}\nContact: ${group.contacts[0]?.name || "Unknown"}\n${group.conversation_summary}`,
              status: "to do",
              priority:
                group.lead_potential === "high"
                  ? 2
                  : group.lead_potential === "medium"
                    ? 3
                    : 4,
            }),
          });
        }
        if (group.action_items.length) {
          toast.success(
            `${group.action_items.length} task(s) created in ClickUp`
          );
        }
      } catch {
        toast.error("Failed to create lead/tasks");
      }
    } else {
      toast("Group rejected");
    }

    // Determine overall status
    const allApproved = result.groups.every(
      (g) => g.approval_status === "approved"
    );
    const allRejected = result.groups.every(
      (g) => g.approval_status === "rejected"
    );
    const allDecided = result.groups.every(
      (g) => g.approval_status !== "pending"
    );
    const newStatus = allApproved
      ? "approved"
      : allRejected
        ? "rejected"
        : allDecided
          ? "partial"
          : "reviewed";

    await fetch("/api/supabase/image-dumps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: activeDump.id,
        status: newStatus,
        analysis_result: result,
      }),
    });

    await fetchDumps();
  }

  // ─── Delete dump ──────────────────────────────────────────
  async function handleDeleteDump(id: string) {
    await fetch("/api/supabase/image-dumps", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (activeDumpId === id) {
      setActiveDumpId(null);
      setCreating(false);
    }
    toast.success("Dump deleted");
    fetchDumps();
  }

  // ═════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════
  return (
    <PageWrapper title="Image Dump">
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        {/* ── Left: Dump List ─────────────────────────── */}
        <div className="w-72 shrink-0 space-y-3">
          <button
            onClick={handleNewDump}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ImagePlus className="h-4 w-4" />
            New Dump
          </button>

          <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 14rem)" }}>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && dumps.length === 0 && !creating && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No dumps yet. Create one!
              </p>
            )}
            {dumps.map((dump) => {
              const cfg = STATUS_CONFIG[dump.status] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.icon;
              return (
                <button
                  key={dump.id}
                  onClick={() => {
                    setActiveDumpId(dump.id);
                    setCreating(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-[#1E1E1E] px-3 py-3 text-left text-sm transition-colors hover:bg-[#1A1A1A]",
                    activeDumpId === dump.id
                      ? "border-primary/50 bg-primary/5"
                      : "bg-[#111111]"
                  )}
                >
                  <StatusIcon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      cfg.color,
                      dump.status === "analyzing" && "animate-spin"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {dump.title || "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(dump.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                      {" · "}
                      <span className={cfg.color}>{cfg.label}</span>
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: Detail Panel ─────────────────────── */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
          {!activeDump && !creating && (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <ImagePlus className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">
                Select a dump or create a new one
              </p>
            </div>
          )}

          {/* ── Upload Mode ──────────────────────────── */}
          {creating && (
            <div className="space-y-6" onPaste={handlePaste}>
              <h2 className="text-lg font-semibold">New Image Dump</h2>

              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#2A2A2A] bg-[#0A0A0A] p-12 transition-colors hover:border-primary/50"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop images, click to browse, or{" "}
                  <span className="text-primary">paste from clipboard</span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && processFiles(e.target.files)
                  }
                />
              </div>

              {/* Thumbnails */}
              {pendingImages.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {pendingImages.length} image(s) selected
                  </p>
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                    {pendingImages.map((img) => (
                      <div key={img.id} className="group relative">
                        <img
                          src={img.preview}
                          alt={img.file.name}
                          className="h-24 w-full rounded-lg border border-[#1E1E1E] object-cover"
                        />
                        <button
                          onClick={() => removeImage(img.id)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context or notes about these screenshots (optional)..."
                className="w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3 text-sm outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
                rows={3}
              />

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={!pendingImages.length || analyzing}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing {pendingImages.length} image(s)...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze with AI
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Review Mode ──────────────────────────── */}
          {activeDump && !creating && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {activeDump.title || "Untitled Dump"}
                  </h2>
                  {activeDump.notes && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activeDump.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteDump(activeDump.id)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>

              {activeDump.status === "analyzing" && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    AI is analyzing your images...
                  </p>
                </div>
              )}

              {activeDump.status === "pending" && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Clock className="mb-3 h-8 w-8 opacity-30" />
                  <p className="text-sm">
                    This dump is pending analysis.
                  </p>
                </div>
              )}

              {/* Analysis groups */}
              {activeDump.analysis_result?.groups?.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  dumpStatus={activeDump.status}
                  onApprove={() => handleGroupAction(group.id, "approved")}
                  onReject={() => handleGroupAction(group.id, "rejected")}
                />
              ))}

              {activeDump.analysis_result?.raw_notes && (
                <div className="rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-4">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    AI Notes
                  </p>
                  <p className="text-sm">
                    {activeDump.analysis_result.raw_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

// ═════════════════════════════════════════════════════════════
// GROUP CARD COMPONENT
// ═════════════════════════════════════════════════════════════
function GroupCard({
  group,
  dumpStatus,
  onApprove,
  onReject,
}: {
  group: AnalysisGroup;
  dumpStatus: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isDecided = group.approval_status !== "pending";

  return (
    <div
      className={cn(
        "rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-5 space-y-4 transition-opacity",
        isDecided && "opacity-60"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">{group.label}</h3>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#1E1E1E] px-2.5 py-0.5 text-xs capitalize text-muted-foreground">
              {group.category.replace("_", " ")}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs capitalize",
                SENTIMENT_COLORS[group.sentiment]
              )}
            >
              {group.sentiment}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs",
                LEAD_COLORS[group.lead_potential]
              )}
            >
              Lead: {group.lead_potential}
            </span>
            {group.approval_status === "approved" && (
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-400">
                Approved
              </span>
            )}
            {group.approval_status === "rejected" && (
              <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs text-red-400">
                Rejected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contacts */}
      {group.contacts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Contacts</p>
          {group.contacts.map((c, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-[#111111] px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {c.name}
              </span>
              {c.phone && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {c.phone}
                </span>
              )}
              {c.email && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {c.email}
                </span>
              )}
              {c.business && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {c.business}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div>
        <p className="text-xs font-medium text-muted-foreground">Summary</p>
        <p className="mt-1 text-sm">{group.conversation_summary}</p>
      </div>

      {/* Lead Reasoning */}
      <div>
        <p className="text-xs font-medium text-muted-foreground">
          Lead Reasoning
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {group.lead_reasoning}
        </p>
      </div>

      {/* Action Items */}
      {group.action_items.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Action Items
          </p>
          <ul className="mt-1 space-y-1">
            {group.action_items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clarifying Questions */}
      {group.clarifying_questions && group.clarifying_questions.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
          <p className="text-xs font-medium text-yellow-400">
            AI needs clarification
          </p>
          <ul className="mt-1 space-y-1">
            {group.clarifying_questions.map((q, i) => (
              <li key={i} className="text-sm text-yellow-200/80">
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {!isDecided && (dumpStatus === "reviewed" || dumpStatus === "partial") && (
        <div className="flex items-center gap-3 border-t border-[#1E1E1E] pt-4">
          <button
            onClick={onApprove}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Check className="h-4 w-4" />
            Approve & Create Lead
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1.5 rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
