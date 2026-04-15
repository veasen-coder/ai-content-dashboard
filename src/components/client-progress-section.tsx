"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  X,
  Sparkles,
  ClipboardPaste,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { PasteBridge } from "@/components/paste-bridge";
import type { ImageDump, ProgressUpdate } from "@/types";

// ─── Types ───────────────────────────────────────────────────
interface ClientCtx {
  id: string;
  name: string;
  business?: string | null;
  stage?: string | null;
  ai_summary?: string | null;
  notes?: string | null;
  close_probability?: number | null;
}

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
      const detectedMime =
        result.match(/^data:(image\/\w+);/)?.[1] || file.type;
      resolve({ base64: result.split(",")[1], mime_type: detectedMime });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const SENTIMENT_STYLES: Record<
  NonNullable<ProgressUpdate["sentiment"]>,
  { label: string; bg: string; icon: React.ElementType }
> = {
  positive: {
    label: "Positive",
    bg: "bg-[#10B981]/15 text-[#10B981]",
    icon: TrendingUp,
  },
  neutral: {
    label: "Neutral",
    bg: "bg-[#6B7280]/15 text-muted-foreground",
    icon: Minus,
  },
  negative: {
    label: "Negative",
    bg: "bg-[#EF4444]/15 text-[#EF4444]",
    icon: TrendingDown,
  },
};

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export function ClientProgressSection({ client }: { client: ClientCtx }) {
  const [dumps, setDumps] = useState<ImageDump[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [pasteBridge, setPasteBridge] = useState<{
    visible: boolean;
    prompt: string;
  }>({ visible: false, prompt: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch dumps for this client ───────────────────────────
  const fetchDumps = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/supabase/image-dumps?client_id=${client.id}`
      );
      if (res.ok) setDumps(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    fetchDumps();
  }, [fetchDumps]);

  // ─── File handlers ─────────────────────────────────────────
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
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData.items)) {
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

  // ─── Core save flow (shared by both instant + paste-bridge) ──
  async function createDumpAndSave(analysis: ProgressUpdate) {
    // 1. Create dump row
    const dumpRes = await fetch("/api/supabase/image-dumps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Progress — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
        notes: notes || null,
        client_id: client.id,
      }),
    });
    const dump = await dumpRes.json();
    if (!dumpRes.ok) throw new Error(dump.error || "Failed to create dump");

    try {
      // 2. Upload images
      await fetch("/api/supabase/image-dump-items", {
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

      // 3. Save analysis
      await fetch("/api/supabase/image-dumps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dump.id,
          status: "reviewed",
          analysis_result: analysis,
        }),
      });

      return dump.id;
    } catch (err) {
      // Rollback on failure
      await fetch("/api/supabase/image-dumps", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dump.id }),
      }).catch(() => {});
      throw err;
    }
  }

  // ─── Instant analyze ───────────────────────────────────────
  async function handleAnalyze() {
    if (!pendingImages.length) {
      toast.error("Upload at least one image");
      return;
    }
    setAnalyzing(true);
    try {
      const analyzeRes = await fetch(
        "/api/claude/analyze-client-progress",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client: {
              name: client.name,
              business: client.business,
              stage: client.stage,
              ai_summary: client.ai_summary,
              notes: client.notes,
              close_probability: client.close_probability,
            },
            images: pendingImages.map((img) => ({
              mime_type: img.mime_type,
              base64_data: img.base64,
            })),
            notes: notes || "",
          }),
        }
      );

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json().catch(() => ({}));
        throw new Error(err.error || "AI analysis failed");
      }
      const analysis: ProgressUpdate = await analyzeRes.json();
      await createDumpAndSave(analysis);

      toast.success("Progress update saved!");
      resetForm();
      await fetchDumps();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to analyze";
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  }

  // ─── Paste-bridge flow ─────────────────────────────────────
  async function handleGeneratePrompt() {
    if (!pendingImages.length) {
      toast.error("Upload at least one image first");
      return;
    }
    try {
      const res = await fetch(
        "/api/claude/build-client-progress-prompt",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client: {
              name: client.name,
              business: client.business,
              stage: client.stage,
              ai_summary: client.ai_summary,
              notes: client.notes,
              close_probability: client.close_probability,
            },
            notes: notes || "",
            image_count: pendingImages.length,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPasteBridge({ visible: true, prompt: data.prompt });
      toast.success("Prompt ready — copy & paste into Claude");
    } catch {
      toast.error("Failed to build prompt");
    }
  }

  async function handlePasteBridgeSubmit(raw: string) {
    if (!pendingImages.length) {
      toast.error("No images to attach");
      return;
    }
    setAnalyzing(true);
    try {
      let jsonStr = raw.trim();
      const fenceMatch = jsonStr.match(
        /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/
      );
      if (fenceMatch) jsonStr = fenceMatch[1].trim();
      const firstBrace = jsonStr.indexOf("{");
      if (firstBrace > 0) jsonStr = jsonStr.slice(firstBrace);

      let analysis: ProgressUpdate;
      try {
        analysis = JSON.parse(jsonStr);
      } catch {
        throw new Error("Invalid JSON — make sure you pasted the full response");
      }

      if (!analysis.summary) {
        throw new Error("Response missing 'summary' field");
      }
      if (!analysis.kind) analysis.kind = "progress_update";

      await createDumpAndSave(analysis);
      toast.success("Progress update saved!");
      resetForm();
      await fetchDumps();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to parse response";
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  }

  function resetForm() {
    pendingImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setPendingImages([]);
    setNotes("");
    setPasteBridge({ visible: false, prompt: "" });
    setExpanded(false);
  }

  async function handleDeleteDump(id: string) {
    if (!confirm("Delete this progress update?")) return;
    await fetch("/api/supabase/image-dumps", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("Deleted");
    fetchDumps();
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ImagePlus className="h-3 w-3 text-primary" />
          Progress Updates
          {!loading && dumps.length > 0 && (
            <span className="rounded-md bg-[#1E1E1E] px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              {dumps.length}
            </span>
          )}
        </p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
        >
          {expanded ? (
            <>
              <X className="h-3 w-3" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" />
              Add update
            </>
          )}
        </button>
      </div>

      {/* Upload zone (expanded) */}
      {expanded && (
        <div className="mb-3 space-y-2" onPaste={handlePaste}>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#2A2A2A] bg-[#0A0A0A] px-4 py-6 transition-colors hover:border-primary/50"
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Drop screenshots, click to browse, or paste
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

          {pendingImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {pendingImages.map((img) => (
                <div key={img.id} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.preview}
                    alt={img.file.name}
                    className="h-16 w-full rounded-md border border-[#1E1E1E] object-cover"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional context about these screenshots..."
            rows={2}
            className="w-full resize-none rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-xs outline-none transition-colors focus:border-primary"
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAnalyze}
              disabled={!pendingImages.length || analyzing}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              title="Uses Claude API token"
            >
              {analyzing && !pasteBridge.visible ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Analyze ({pendingImages.length})
                </>
              )}
            </button>
            <button
              onClick={handleGeneratePrompt}
              disabled={!pendingImages.length || analyzing}
              className="flex items-center gap-1.5 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-[#111111] disabled:opacity-50"
              title="Uses your Claude Max (no API tokens)"
            >
              <ClipboardPaste className="h-3 w-3" />
              Claude Prompt
            </button>
          </div>

          {/* Paste-bridge panel */}
          {pasteBridge.visible && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <PasteBridge
                prompt={pasteBridge.prompt}
                onSubmit={handlePasteBridgeSubmit}
                submitting={analyzing}
                promptHint={`Copy this prompt → open claude.ai → attach your ${pendingImages.length} screenshot(s) → paste prompt → paste the JSON response back here.`}
                pasteHint="Paste Claude's JSON response (must include 'summary' field)."
              />
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading updates...
        </div>
      ) : dumps.length === 0 && !expanded ? (
        <p className="rounded-lg border border-dashed border-[#1E1E1E] bg-[#0A0A0A] px-3 py-4 text-center text-xs italic text-muted-foreground/60">
          No progress updates yet — drop new screenshots to log an update.
        </p>
      ) : (
        <div className="space-y-2">
          {dumps.map((dump) => (
            <ProgressCard
              key={dump.id}
              dump={dump}
              onDelete={() => handleDeleteDump(dump.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// PROGRESS CARD
// ═════════════════════════════════════════════════════════════
function ProgressCard({
  dump,
  onDelete,
}: {
  dump: ImageDump;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  // Progress updates have `kind: "progress_update"`; anything else we render raw
  const update =
    dump.analysis_result &&
    typeof dump.analysis_result === "object" &&
    "summary" in dump.analysis_result
      ? (dump.analysis_result as ProgressUpdate)
      : null;

  const sentiment = update?.sentiment
    ? SENTIMENT_STYLES[update.sentiment]
    : null;
  const SentimentIcon = sentiment?.icon;

  const date = new Date(dump.created_at);
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-start gap-1.5">
            {open ? (
              <ChevronDown className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">
                {update?.summary || dump.title || "Progress update"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>
                  {dateStr} · {timeStr}
                </span>
                {sentiment && SentimentIcon && (
                  <span
                    className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium ${sentiment.bg}`}
                  >
                    <SentimentIcon className="h-2.5 w-2.5" />
                    {sentiment.label}
                  </span>
                )}
                {update?.stage_suggestion && (
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                    Stage → {update.stage_suggestion}
                  </span>
                )}
                {update?.close_probability_suggestion != null && (
                  <span className="rounded bg-[#3B82F6]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#3B82F6]">
                    Prob → {update.close_probability_suggestion}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
        <button
          onClick={onDelete}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Delete update"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {open && update && (
        <div className="mt-3 space-y-3 border-t border-[#1E1E1E] pt-3 pl-4">
          {update.key_points && update.key_points.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Key points
              </p>
              <ul className="space-y-1">
                {update.key_points.map((point, i) => (
                  <li
                    key={i}
                    className="text-xs text-foreground/80 leading-relaxed before:mr-1.5 before:text-primary before:content-['•']"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {update.next_actions && update.next_actions.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Next actions
              </p>
              <ul className="space-y-1">
                {update.next_actions.map((a, i) => (
                  <li
                    key={i}
                    className="text-xs text-foreground/80 leading-relaxed before:mr-1.5 before:text-[#10B981] before:content-['→']"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {update.raw_extract && (
            <details className="group">
              <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
                Raw extract
              </summary>
              <pre className="mt-1 whitespace-pre-wrap rounded bg-[#111111] p-2 font-mono text-[10px] text-muted-foreground">
                {update.raw_extract}
              </pre>
            </details>
          )}
          {dump.notes && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Your notes
              </p>
              <p className="text-xs text-muted-foreground italic">
                {dump.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
