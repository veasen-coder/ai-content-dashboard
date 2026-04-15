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
  ChevronDown,
  Phone,
  Mail,
  Building2,
  User,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  CheckSquare,
  Square,
  ClipboardPaste,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PasteBridge } from "@/components/paste-bridge";
import type {
  ImageDump,
  AnalysisResult,
  AnalysisGroup,
  ExtractedContact,
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

async function fileToBase64(
  file: File
): Promise<{ base64: string; mime_type: string }> {
  // Compress if > 1MB — always outputs JPEG
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
    return {
      base64: btoa(
        new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), "")
      ),
      mime_type: "image/jpeg",
    };
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Detect actual mime from data URL: "data:image/jpeg;base64,..."
      const detectedMime = result.match(/^data:(image\/\w+);/)?.[1] || file.type;
      resolve({ base64: result.split(",")[1], mime_type: detectedMime });
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
  const [dumpImages, setDumpImages] = useState<
    { id: string; mime_type: string; base64_data: string; file_name: string | null }[]
  >([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pasteBridge, setPasteBridge] = useState<{
    visible: boolean;
    prompt: string;
  }>({ visible: false, prompt: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDump = dumps.find((d) => d.id === activeDumpId) || null;

  // ─── Fetch dumps (global only — client-scoped dumps live on client pages) ──
  const fetchDumps = useCallback(async () => {
    try {
      const res = await fetch("/api/supabase/image-dumps?client_id=none");
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

  // ─── Fetch images for active dump ─────────────────────────
  useEffect(() => {
    if (!activeDumpId) {
      setDumpImages([]);
      return;
    }
    let cancelled = false;
    setLoadingImages(true);
    fetch(`/api/supabase/image-dump-items?dump_id=${activeDumpId}&include_data=true`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setDumpImages(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingImages(false);
      });
    return () => { cancelled = true; };
  }, [activeDumpId]);

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
      const { base64, mime_type } = await fileToBase64(file);
      newImages.push({
        id: uid(),
        file,
        preview: URL.createObjectURL(file),
        base64,
        mime_type,
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
    let dumpId: string | null = null;

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
      dumpId = dump.id;

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

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json().catch(() => ({}));
        throw new Error(errData.error || "AI analysis failed");
      }

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
      const msg =
        err instanceof Error ? err.message : "Failed to analyze images";
      toast.error(msg);
      // Clean up failed dump so it doesn't linger as "pending"
      if (dumpId) {
        await fetch("/api/supabase/image-dumps", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: dumpId }),
        });
        fetchDumps();
      }
    } finally {
      setAnalyzing(false);
    }
  }

  // ─── Paste-bridge: generate prompt ────────────────────────
  async function handleGeneratePrompt() {
    if (!pendingImages.length) {
      toast.error("Upload images first");
      return;
    }
    try {
      const res = await fetch("/api/claude/build-image-analysis-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes || "",
          image_count: pendingImages.length,
        }),
      });
      if (!res.ok) throw new Error("Failed to build prompt");
      const data = await res.json();
      setPasteBridge({ visible: true, prompt: data.prompt });
      toast.success("Prompt ready — copy & paste into Claude");
    } catch {
      toast.error("Failed to build prompt");
    }
  }

  // ─── Paste-bridge: parse & save response ──────────────────
  async function handlePasteBridgeSubmit(raw: string) {
    if (!pendingImages.length) {
      toast.error("No images to attach");
      return;
    }
    setAnalyzing(true);
    let dumpId: string | null = null;

    try {
      // Strip markdown code fences if present
      let jsonStr = raw.trim();
      const fenceMatch = jsonStr.match(
        /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/
      );
      if (fenceMatch) jsonStr = fenceMatch[1].trim();

      // Also strip leading "Here's..." preambles by finding first `{`
      const firstBrace = jsonStr.indexOf("{");
      if (firstBrace > 0) jsonStr = jsonStr.slice(firstBrace);

      let analysis: AnalysisResult;
      try {
        analysis = JSON.parse(jsonStr);
      } catch {
        throw new Error(
          "Invalid JSON — make sure you pasted the full response"
        );
      }

      if (!analysis.groups || !Array.isArray(analysis.groups)) {
        throw new Error("Response missing 'groups' array");
      }

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
      dumpId = dump.id;

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

      // 3. Merge approval_status + image_item_ids into groups
      analysis.groups = analysis.groups.map((g) => ({
        ...g,
        id: g.id || uid(),
        approval_status: "pending" as const,
        image_item_ids:
          g.image_item_ids?.length
            ? g.image_item_ids
            : items.map((it: { id: string }) => it.id),
      }));

      // 4. Save analysis result
      await fetch("/api/supabase/image-dumps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dump.id,
          status: "reviewed",
          analysis_result: analysis,
        }),
      });

      toast.success("Analysis saved!");
      setPendingImages([]);
      setNotes("");
      setCreating(false);
      setPasteBridge({ visible: false, prompt: "" });
      await fetchDumps();
      setActiveDumpId(dump.id);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to parse response";
      toast.error(msg);
      if (dumpId) {
        await fetch("/api/supabase/image-dumps", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: dumpId }),
        });
        fetchDumps();
      }
    } finally {
      setAnalyzing(false);
    }
  }

  // ─── Approve / Reject group ───────────────────────────────
  async function handleGroupAction(
    groupId: string,
    action: "approved" | "rejected",
    edits?: {
      finalTasks: string[];
      label: string;
      category: string;
      sentiment: AnalysisGroup["sentiment"];
      lead_potential: AnalysisGroup["lead_potential"];
      contacts: ExtractedContact[];
      conversation_summary: string;
      lead_reasoning: string;
    }
  ) {
    if (!activeDump?.analysis_result) return;

    const result = { ...(activeDump.analysis_result as AnalysisResult) };
    const group = result.groups.find((g) => g.id === groupId);
    if (!group) return;

    group.approval_status = action;

    // Apply user edits for approval
    if (action === "approved" && edits) {
      group.action_items = edits.finalTasks;
      group.label = edits.label;
      group.category = edits.category;
      group.sentiment = edits.sentiment;
      group.lead_potential = edits.lead_potential;
      group.contacts = edits.contacts;
      group.conversation_summary = edits.conversation_summary;
      group.lead_reasoning = edits.lead_reasoning;
    }

    // If approved, create lead + tasks and store IDs for undo
    if (action === "approved") {
      try {
        const createdIds: { clientId?: string; taskIds: string[] } = { taskIds: [] };

        // Create client lead
        if (group.contacts.length > 0) {
          const contact = group.contacts[0];
          const clientRes = await fetch("/api/supabase/clients", {
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
          const clientData = await clientRes.json();
          if (clientRes.ok && clientData.id) {
            createdIds.clientId = clientData.id;
          }
          toast.success(`Lead created: ${contact.name}`);
        }

        // Create one main task with action items as subtasks
        if (group.action_items.length > 0) {
          const contactName = group.contacts[0]?.name || "Unknown";
          // Extract clean business brand from contact's business field
          // e.g. "Banyan Tree Spa KL - Assistant Director..." → "Banyan Tree Spa KL"
          const rawBusiness = group.contacts[0]?.business || "";
          const businessBrand =
            rawBusiness.split(" - ")[0].split(",")[0].trim() ||
            contactName;
          const taskName = `[LEADS] ${businessBrand} - ${group.label} ( Image Dump )`;
          const mainTaskRes = await fetch("/api/clickup/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: taskName,
              description: `Contact: ${contactName}\nCategory: ${group.category}\nLead Potential: ${group.lead_potential}\n\n${group.conversation_summary}\n\nAction Items:\n${group.action_items.map((a) => `• ${a}`).join("\n")}`,
              status: "to do",
              priority:
                group.lead_potential === "high"
                  ? 2
                  : group.lead_potential === "medium"
                    ? 3
                    : 4,
            }),
          });
          const mainTask = await mainTaskRes.json();
          if (mainTaskRes.ok && mainTask.id) {
            createdIds.taskIds.push(mainTask.id);

            // Create subtasks under the main task
            for (const item of group.action_items) {
              const subRes = await fetch("/api/clickup/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: item,
                  parent: mainTask.id,
                  status: "to do",
                }),
              });
              const subData = await subRes.json();
              if (subRes.ok && subData.id) {
                createdIds.taskIds.push(subData.id);
              }
            }
          }
          toast.success(
            `Task created with ${group.action_items.length} subtask(s) in ClickUp`
          );
        }

        // Store created IDs on the group for undo
        (group as AnalysisGroup & { created_ids?: typeof createdIds }).created_ids = createdIds;
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

  // ─── Undo approval ─────────────────────────────────────────
  async function handleUndoGroup(groupId: string) {
    if (!activeDump?.analysis_result) return;

    const result = { ...(activeDump.analysis_result as AnalysisResult) };
    const group = result.groups.find((g) => g.id === groupId) as
      | (AnalysisGroup & { created_ids?: { clientId?: string; taskIds: string[] } })
      | undefined;
    if (!group) return;

    try {
      // Delete created client
      if (group.created_ids?.clientId) {
        await fetch("/api/supabase/clients", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: group.created_ids.clientId }),
        });
      }

      // Delete created ClickUp tasks via API route
      if (group.created_ids?.taskIds?.length) {
        for (const taskId of group.created_ids.taskIds) {
          await fetch("/api/clickup/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task_id: taskId }),
          }).catch(() => {});
        }
      }

      // Reset group status
      group.approval_status = "pending";
      delete group.created_ids;

      // Recalculate dump status
      const allPending = result.groups.every((g) => g.approval_status === "pending");
      const newStatus = allPending ? "reviewed" : "partial";

      await fetch("/api/supabase/image-dumps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeDump.id,
          status: newStatus,
          analysis_result: result,
        }),
      });

      toast.success("Approval undone — lead and tasks removed");
      await fetchDumps();
    } catch {
      toast.error("Failed to undo");
    }
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
    <PageWrapper title="Image Summary Agent">
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

              {/* Analyze buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleAnalyze}
                  disabled={!pendingImages.length || analyzing}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  title="Uses Claude API token"
                >
                  {analyzing && !pasteBridge.visible ? (
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

                <button
                  onClick={handleGeneratePrompt}
                  disabled={!pendingImages.length || analyzing}
                  className="flex items-center gap-2 rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-[#111111] disabled:opacity-50"
                  title="Uses your Claude Max subscription (no API tokens)"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Generate Claude Prompt
                </button>
              </div>

              {/* Paste-bridge panel */}
              {pasteBridge.visible && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Paste Bridge Mode
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Copy prompt → open Claude → attach your {pendingImages.length} screenshot(s) → paste prompt → paste JSON response below
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setPasteBridge({ visible: false, prompt: "" })
                      }
                      className="flex items-center gap-1 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-red-500/30 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                  <PasteBridge
                    prompt={pasteBridge.prompt}
                    onSubmit={handlePasteBridgeSubmit}
                    submitting={analyzing}
                    promptHint="Copy this prompt → open claude.ai (or Claude Code) → attach your screenshots as images → paste the prompt → Claude returns JSON → paste the full JSON response below (or drop a .json/.txt file)."
                    pasteHint="Paste Claude's JSON response — must start with { and include a 'groups' array. Markdown code fences are stripped automatically."
                  />
                </div>
              )}
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

              {/* Uploaded images gallery */}
              {dumpImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Uploaded Images ({dumpImages.length})
                  </p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                    {dumpImages.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => setExpandedImage(img.id)}
                        className="relative overflow-hidden rounded-lg border border-[#1E1E1E] transition-all hover:border-primary/50"
                      >
                        <img
                          src={`data:${img.mime_type};base64,${img.base64_data}`}
                          alt={img.file_name || "Uploaded image"}
                          className="h-24 w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Full-screen image lightbox */}
              {expandedImage && (() => {
                const idx = dumpImages.findIndex((i) => i.id === expandedImage);
                const img = dumpImages[idx];
                if (!img) return null;
                return (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                    onClick={() => setExpandedImage(null)}
                  >
                    {/* Close button */}
                    <button
                      className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                      onClick={() => setExpandedImage(null)}
                    >
                      <X className="h-5 w-5" />
                    </button>

                    {/* Counter */}
                    <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                      {idx + 1} / {dumpImages.length}
                    </div>

                    {/* Previous */}
                    {idx > 0 && (
                      <button
                        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedImage(dumpImages[idx - 1].id);
                        }}
                      >
                        <ChevronRight className="h-5 w-5 rotate-180" />
                      </button>
                    )}

                    {/* Image */}
                    <img
                      src={`data:${img.mime_type};base64,${img.base64_data}`}
                      alt={img.file_name || "Uploaded image"}
                      className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Next */}
                    {idx < dumpImages.length - 1 && (
                      <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedImage(dumpImages[idx + 1].id);
                        }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                );
              })()}
              {loadingImages && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading images...
                </div>
              )}

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
              {(activeDump.analysis_result as AnalysisResult | null)?.groups?.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onUndo={() => handleUndoGroup(group.id)}
                  dumpStatus={activeDump.status}
                  onApprove={(edits) => handleGroupAction(group.id, "approved", edits)}
                  onReject={() => handleGroupAction(group.id, "rejected")}
                  onAnswer={async (answers) => {
                    if (!activeDump) return;
                    toast("Re-analyzing with your answers...");
                    try {
                      const imgs = dumpImages.map((img) => ({
                        id: img.id,
                        mime_type: img.mime_type,
                        base64_data: img.base64_data,
                      }));
                      const res = await fetch("/api/claude/analyze-images", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          images: imgs,
                          notes: `${activeDump.notes || ""}\n\nAdditional context from user:\n${answers}`,
                        }),
                      });
                      if (!res.ok) throw new Error("Re-analysis failed");
                      const analysis: AnalysisResult = await res.json();
                      if (analysis.groups) {
                        analysis.groups = analysis.groups.map((g) => ({
                          ...g,
                          id: g.id || uid(),
                          approval_status: "pending" as const,
                        }));
                      }
                      await fetch("/api/supabase/image-dumps", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: activeDump.id,
                          status: "reviewed",
                          analysis_result: analysis,
                        }),
                      });
                      toast.success("Re-analysis complete!");
                      await fetchDumps();
                    } catch {
                      toast.error("Re-analysis failed");
                    }
                  }}
                />
              ))}

              {(activeDump.analysis_result as AnalysisResult | null)?.raw_notes && (
                <div className="rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-4">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    AI Notes
                  </p>
                  <p className="text-sm">
                    {(activeDump.analysis_result as AnalysisResult).raw_notes}
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
  onAnswer,
  onUndo,
}: {
  group: AnalysisGroup;
  dumpStatus: string;
  onApprove: (edits: {
    finalTasks: string[];
    label: string;
    category: string;
    sentiment: AnalysisGroup["sentiment"];
    lead_potential: AnalysisGroup["lead_potential"];
    contacts: ExtractedContact[];
    conversation_summary: string;
    lead_reasoning: string;
  }) => void;
  onReject: () => void;
  onAnswer: (answers: string) => void;
  onUndo: () => void;
}) {
  const isDecided = group.approval_status !== "pending";
  const [answers, setAnswers] = useState("");

  // Editable group field state
  const [label, setLabel] = useState(group.label);
  const [category, setCategory] = useState(group.category);
  const [sentiment, setSentiment] = useState(group.sentiment);
  const [leadPotential, setLeadPotential] = useState(group.lead_potential);
  const [contacts, setContacts] = useState<ExtractedContact[]>(group.contacts);
  const [summary, setSummary] = useState(group.conversation_summary);
  const [leadReasoning, setLeadReasoning] = useState(group.lead_reasoning);

  // Editable task list state
  const [suggested, setSuggested] = useState<string[]>(group.action_items || []);
  const [selectedSuggested, setSelectedSuggested] = useState<Set<number>>(
    () => new Set((group.action_items || []).map((_, i) => i))
  );
  const [additional, setAdditional] = useState<string[]>(
    group.additional_suggestions || []
  );
  const [addedExtras, setAddedExtras] = useState<string[]>([]);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [showAdditional, setShowAdditional] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  function updateContact(i: number, field: keyof ExtractedContact, value: string) {
    setContacts((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c))
    );
  }

  function removeContact(i: number) {
    setContacts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addContact() {
    setContacts((prev) => [
      ...prev,
      { name: "", phone: "", email: "", business: "" },
    ]);
  }

  async function loadMoreSuggestions() {
    setLoadingMore(true);
    try {
      const existingTasks = [...suggested, ...addedExtras, ...additional];
      const res = await fetch("/api/claude/more-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_summary: summary,
          contacts,
          category,
          lead_potential: leadPotential,
          existing_tasks: existingTasks,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const newTasks: string[] = Array.isArray(data.tasks) ? data.tasks : [];
      if (newTasks.length === 0) {
        toast.error("No new suggestions returned");
        return;
      }
      setAdditional((prev) => [...prev, ...newTasks]);
      setShowAdditional(true);
      toast.success(`Added ${newTasks.length} more suggestions`);
    } catch {
      toast.error("Failed to get more suggestions");
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleSuggested(i: number) {
    setSelectedSuggested((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function removeSuggested(i: number) {
    setSuggested((prev) => prev.filter((_, idx) => idx !== i));
    // Rebuild selected indices (since array shifts)
    setSelectedSuggested((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      });
      return next;
    });
  }

  function addFromAdditional(i: number) {
    const task = additional[i];
    setAddedExtras((prev) => [...prev, task]);
    setAdditional((prev) => prev.filter((_, idx) => idx !== i));
  }

  function removeAdditional(i: number) {
    setAdditional((prev) => prev.filter((_, idx) => idx !== i));
  }

  function removeExtra(i: number) {
    setAddedExtras((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addCustomTask() {
    const trimmed = newTaskInput.trim();
    if (!trimmed) return;
    setAddedExtras((prev) => [...prev, trimmed]);
    setNewTaskInput("");
  }

  function getFinalTasks(): string[] {
    const chosenSuggested = suggested.filter((_, i) => selectedSuggested.has(i));
    return [...chosenSuggested, ...addedExtras];
  }

  const totalSelected = selectedSuggested.size + addedExtras.length;

  return (
    <div
      className={cn(
        "rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-5 space-y-4 transition-opacity",
        isDecided && "opacity-60"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-2">
            <MessageSquare className="mt-2 h-4 w-4 shrink-0 text-primary" />
            {isDecided ? (
              <h3 className="font-semibold">{label}</h3>
            ) : (
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Group title..."
                className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold outline-none transition-colors hover:border-[#1E1E1E] focus:border-primary focus:bg-[#111111]"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {isDecided ? (
              <>
                <span className="rounded-full bg-[#1E1E1E] px-2.5 py-0.5 text-xs capitalize text-muted-foreground">
                  {category.replace("_", " ")}
                </span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs capitalize", SENTIMENT_COLORS[sentiment])}>
                  {sentiment}
                </span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs", LEAD_COLORS[leadPotential])}>
                  Lead: {leadPotential}
                </span>
              </>
            ) : (
              <>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-full border border-[#1E1E1E] bg-[#1E1E1E] px-2.5 py-0.5 text-xs capitalize text-muted-foreground outline-none transition-colors hover:text-foreground focus:border-primary"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram_dm">Instagram DM</option>
                  <option value="facebook">Facebook</option>
                  <option value="email">Email</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={sentiment}
                  onChange={(e) => setSentiment(e.target.value as AnalysisGroup["sentiment"])}
                  className={cn("rounded-full border border-transparent px-2.5 py-0.5 text-xs capitalize outline-none transition-colors focus:border-primary", SENTIMENT_COLORS[sentiment])}
                >
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
                <select
                  value={leadPotential}
                  onChange={(e) => setLeadPotential(e.target.value as AnalysisGroup["lead_potential"])}
                  className={cn("rounded-full border border-transparent px-2.5 py-0.5 text-xs outline-none transition-colors focus:border-primary", LEAD_COLORS[leadPotential])}
                >
                  <option value="high">Lead: high</option>
                  <option value="medium">Lead: medium</option>
                  <option value="low">Lead: low</option>
                  <option value="none">Lead: none</option>
                </select>
              </>
            )}
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Contacts</p>
          {!isDecided && (
            <button
              onClick={addContact}
              className="flex items-center gap-1 rounded-md border border-[#1E1E1E] bg-[#111111] px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Add contact
            </button>
          )}
        </div>
        {contacts.length === 0 && isDecided && (
          <p className="text-sm text-muted-foreground/50">No contacts</p>
        )}
        {contacts.map((c, i) => (
          <div
            key={i}
            className="group/contact space-y-1.5 rounded-lg bg-[#111111] px-3 py-2.5"
          >
            {isDecided ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {c.name || <span className="text-muted-foreground/50">No name</span>}
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
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      type="text"
                      value={c.name || ""}
                      onChange={(e) => updateContact(i, "name", e.target.value)}
                      placeholder="Name"
                      className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm outline-none transition-colors hover:border-[#1E1E1E] focus:border-primary focus:bg-[#0A0A0A]"
                    />
                  </div>
                  <button
                    onClick={() => removeContact(i)}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover/contact:opacity-100"
                    title="Remove contact"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      type="tel"
                      value={c.phone || ""}
                      onChange={(e) => updateContact(i, "phone", e.target.value)}
                      placeholder="Phone"
                      className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-muted-foreground outline-none transition-colors hover:border-[#1E1E1E] focus:border-primary focus:bg-[#0A0A0A] focus:text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      type="email"
                      value={c.email || ""}
                      onChange={(e) => updateContact(i, "email", e.target.value)}
                      placeholder="Email"
                      className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-muted-foreground outline-none transition-colors hover:border-[#1E1E1E] focus:border-primary focus:bg-[#0A0A0A] focus:text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      type="text"
                      value={c.business || ""}
                      onChange={(e) => updateContact(i, "business", e.target.value)}
                      placeholder="Business / Role"
                      className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-muted-foreground outline-none transition-colors hover:border-[#1E1E1E] focus:border-primary focus:bg-[#0A0A0A] focus:text-foreground"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div>
        <p className="text-xs font-medium text-muted-foreground">Summary</p>
        {isDecided ? (
          <p className="mt-1 text-sm">{summary}</p>
        ) : (
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Conversation summary..."
            rows={3}
            className="mt-1 w-full resize-y rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none transition-colors hover:border-[#1E1E1E] focus:border-primary focus:bg-[#111111]"
          />
        )}
      </div>

      {/* Lead Reasoning */}
      <div>
        <p className="text-xs font-medium text-muted-foreground">
          Lead Reasoning
        </p>
        {isDecided ? (
          <p className="mt-1 text-sm text-muted-foreground">{leadReasoning}</p>
        ) : (
          <textarea
            value={leadReasoning}
            onChange={(e) => setLeadReasoning(e.target.value)}
            placeholder="Why is this (or isn't this) a good lead?"
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:border-[#1E1E1E] focus:border-primary focus:bg-[#111111] focus:text-foreground"
          />
        )}
      </div>

      {/* Tasks (editable before approval) */}
      {!isDecided ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Tasks to create ({totalSelected} selected)
            </p>
          </div>

          {/* Suggested tasks (pre-selected) */}
          {suggested.length > 0 && (
            <div className="space-y-1.5">
              {suggested.map((item, i) => {
                const checked = selectedSuggested.has(i);
                return (
                  <div
                    key={i}
                    className={cn(
                      "group/task flex items-start gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 transition-colors",
                      checked ? "border-primary/30 bg-primary/5" : ""
                    )}
                  >
                    <button
                      onClick={() => toggleSuggested(i)}
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {checked ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        checked ? "text-foreground" : "text-muted-foreground line-through"
                      )}
                    >
                      {item}
                    </span>
                    <button
                      onClick={() => removeSuggested(i)}
                      className="shrink-0 opacity-0 transition-opacity hover:text-red-400 group-hover/task:opacity-100"
                      title="Remove task"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* User-added extras */}
          {addedExtras.length > 0 && (
            <div className="space-y-1.5">
              {addedExtras.map((item, i) => (
                <div
                  key={`extra-${i}`}
                  className="group/task flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2"
                >
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="flex-1 text-sm text-foreground">{item}</span>
                  <button
                    onClick={() => removeExtra(i)}
                    className="shrink-0 opacity-0 transition-opacity hover:text-red-400 group-hover/task:opacity-100"
                    title="Remove task"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add custom task input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTask();
                }
              }}
              placeholder="Add your own task..."
              className="flex-1 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
            />
            <button
              onClick={addCustomTask}
              disabled={!newTaskInput.trim()}
              className="flex h-9 items-center gap-1 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 text-sm text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          {/* Get more AI suggestions */}
          <button
            onClick={loadMoreSuggestions}
            disabled={loadingMore}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
          >
            {loadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loadingMore ? "Generating..." : "Get 5 more AI suggestions"}
          </button>

          {/* Additional AI suggestions (collapsible) */}
          {additional.length > 0 && (
            <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A]">
              <button
                onClick={() => setShowAdditional(!showAdditional)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {showAdditional ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                <Sparkles className="h-3 w-3 text-primary/60" />
                Additional AI suggestions ({additional.length})
              </button>
              {showAdditional && (
                <div className="space-y-1 border-t border-[#1E1E1E] p-2">
                  {additional.map((item, i) => (
                    <div
                      key={`add-${i}`}
                      className="group/task flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-[#111111]"
                    >
                      <span className="flex-1 text-sm text-muted-foreground">
                        {item}
                      </span>
                      <button
                        onClick={() => addFromAdditional(i)}
                        className="flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary opacity-0 transition-opacity hover:bg-primary/20 group-hover/task:opacity-100"
                        title="Add to tasks"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                      <button
                        onClick={() => removeAdditional(i)}
                        className="shrink-0 opacity-0 transition-opacity hover:text-red-400 group-hover/task:opacity-100"
                        title="Dismiss"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Read-only view after decision */
        group.action_items.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Action Items
            </p>
            <ul className="mt-1 space-y-1">
              {group.action_items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      {/* Clarifying Questions */}
      {group.clarifying_questions && group.clarifying_questions.length > 0 && !isDecided && (
        <div className="space-y-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-xs font-medium text-yellow-400">
            AI needs clarification
          </p>
          <ul className="space-y-1">
            {group.clarifying_questions.map((q, i) => (
              <li key={i} className="text-sm text-yellow-200/80">
                • {q}
              </li>
            ))}
          </ul>
          <textarea
            value={answers}
            onChange={(e) => setAnswers(e.target.value)}
            placeholder="Type your answers here..."
            className="w-full rounded-lg border border-yellow-500/20 bg-[#0A0A0A] px-3 py-2 text-sm outline-none transition-colors focus:border-yellow-500/50 placeholder:text-muted-foreground"
            rows={3}
          />
          <button
            onClick={() => {
              if (answers.trim()) onAnswer(answers.trim());
            }}
            disabled={!answers.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Re-analyze with answers
          </button>
        </div>
      )}

      {/* Actions */}
      {!isDecided && (dumpStatus === "reviewed" || dumpStatus === "partial") && (
        <div className="flex items-center gap-3 border-t border-[#1E1E1E] pt-4">
          <button
            onClick={() => onApprove({
              finalTasks: getFinalTasks(),
              label,
              category,
              sentiment,
              lead_potential: leadPotential,
              contacts,
              conversation_summary: summary,
              lead_reasoning: leadReasoning,
            })}
            disabled={totalSelected === 0}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            Approve & Create Lead{totalSelected > 0 ? ` + ${totalSelected} task${totalSelected === 1 ? "" : "s"}` : ""}
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

      {/* Undo button for approved groups */}
      {group.approval_status === "approved" && (
        <div className="border-t border-[#1E1E1E] pt-4">
          <button
            onClick={onUndo}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Undo — Remove created lead & tasks
          </button>
        </div>
      )}
    </div>
  );
}
