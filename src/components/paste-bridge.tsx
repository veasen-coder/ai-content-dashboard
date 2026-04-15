"use client";

import { useState } from "react";
import { Copy, Check, ClipboardPaste, Loader2, ExternalLink } from "lucide-react";
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
  promptHint = "Copy this prompt → paste into Claude Code (or claude.ai) → Claude will return a formatted response → paste the full response below.",
  pasteHint = "Paste Claude's entire response here, including the --- delimiters.",
  submitting = false,
}: PasteBridgeProps) {
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");

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
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard access denied — paste manually");
    }
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
            Step 2 — Paste Claude&apos;s response
          </p>
          <button
            onClick={pasteFromClipboard}
            className="flex items-center gap-1 rounded-md border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <ClipboardPaste className="h-3 w-3" />
            Paste from clipboard
          </button>
        </div>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={6}
          placeholder="Paste Claude's full response here..."
          className="w-full resize-y rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-[11px] text-foreground outline-none focus:border-primary"
        />
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
