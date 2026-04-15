"use client";

import { useState, useRef } from "react";
import {
  Copy,
  Check,
  ClipboardPaste,
  Loader2,
  ExternalLink,
  Upload,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface PasteBridgeProps {
  /** The prompt to copy to clipboard and paste into Claude Code */
  prompt: string;
  /** Called when user submits a pasted response — receives raw string */
  onSubmit: (pastedText: string) => Promise<void> | void;
  /** Optional help text below the prompt textarea */
  promptHint?: string;
  /** Optional help text below the paste-back textarea */
  pasteHint?: string;
  /** Busy state while parsing */
  submitting?: boolean;
}

export function PasteBridge({
  prompt,
  onSubmit,
  promptHint = "Copy this prompt → paste into Claude Code (or claude.ai) → Claude will return a formatted response → paste the full response below OR drop a file with the response.",
  pasteHint = "Paste Claude's response OR drop a .txt/.json/.md file with the response.",
  submitting = false,
}: PasteBridgeProps) {
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Prompt copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setPasted(text);
      setFileName(null);
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard access denied — paste manually");
    }
  }

  async function readFile(file: File) {
    // Accept anything that looks text-y: .txt, .json, .md, .html, or missing ext
    const allowed = [
      "text/",
      "application/json",
      "application/x-json",
      "",
    ];
    const isText =
      allowed.some((t) => file.type.startsWith(t)) ||
      /\.(txt|json|md|html?)$/i.test(file.name);
    if (!isText) {
      toast.error("Only text files (.txt, .json, .md, .html) allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }
    try {
      const text = await file.text();
      setPasted(text);
      setFileName(file.name);
      toast.success(`Loaded ${file.name}`);
    } catch {
      toast.error("Failed to read file");
    }
  }

  function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = ""; // reset so same file can be picked again
  }

  function clearFile() {
    setPasted("");
    setFileName(null);
  }

  async function handleSubmit() {
    if (!pasted.trim()) {
      toast.error("Nothing to submit");
      return;
    }
    await onSubmit(pasted);
  }

  return (
    <div className="space-y-3">
      {/* Step 1 — The prompt */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Step 1 — Copy this prompt
          </p>
          <div className="flex items-center gap-1">
            <a
              href="https://claude.ai/new"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              Open claude.ai
            </a>
            <button
              onClick={copyPrompt}
              className="flex items-center gap-1 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-[#10B981]" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
        <textarea
          readOnly
          value={prompt}
          rows={8}
          className="w-full resize-y rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-[11px] text-muted-foreground outline-none"
        />
        <p className="text-[10px] text-muted-foreground/60">{promptHint}</p>
      </div>

      {/* Step 2 — Paste back */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Step 2 — Paste response OR drop file
          </p>
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.json,.md,.html,text/*,application/json"
              onChange={handleFilePick}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <Upload className="h-3 w-3" />
              Choose file
            </button>
            <button
              onClick={pasteFromClipboard}
              className="flex items-center gap-1 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <ClipboardPaste className="h-3 w-3" />
              Paste
            </button>
          </div>
        </div>

        {fileName && (
          <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-foreground">
              <FileText className="h-3 w-3 text-primary" />
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">
                · {pasted.length.toLocaleString()} chars
              </span>
            </div>
            <button
              onClick={clearFile}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              title="Clear file"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(false);
          }}
          onDrop={handleFileDrop}
          className={`relative rounded-lg border transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-[#1E1E1E] bg-[#0A0A0A]"
          }`}
        >
          <textarea
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              if (fileName) setFileName(null);
            }}
            rows={6}
            placeholder="Paste Claude's full response here, or drop a .txt/.json/.md file anywhere in this box..."
            className="w-full resize-y rounded-lg border-0 bg-transparent px-3 py-2 font-mono text-[11px] text-foreground outline-none"
          />
          {dragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 text-[11px] font-medium text-primary">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Drop file to load
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/60">{pasteHint}</p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !pasted.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Parsing & saving...
          </>
        ) : (
          <>Parse & save</>
        )}
      </button>
    </div>
  );
}

// Helper: parse a delimited Claude response (shared by all paste-bridge consumers)
export function parseDelimitedBlocks(
  raw: string,
  blocks: Record<string, { start: string; end: string }>
): Record<string, string> | null {
  const result: Record<string, string> = {};

  for (const [key, { start, end }] of Object.entries(blocks)) {
    const sIdx = raw.indexOf(start);
    const eIdx = raw.indexOf(end);
    if (sIdx < 0 || eIdx < 0 || eIdx <= sIdx) return null;
    result[key] = raw.slice(sIdx + start.length, eIdx).trim();
  }

  return result;
}
