"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useDemoModeStore } from "@/store/demo-mode-store";
import { getPreset } from "@/lib/demo-industry-presets";
import {
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Mic,
  Smile,
  CheckCheck,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ═════════════════════════════════════════════════════════════
// DEMO WHATSAPP — animated conversation replay
// ═════════════════════════════════════════════════════════════

interface RenderedMessage {
  from: "customer" | "ai";
  text: string;
  index: number;
}

export default function DemoWhatsAppPage() {
  const { selectedIndustry, demoClientName } = useDemoModeStore();
  const preset = useMemo(() => getPreset(selectedIndustry), [selectedIndustry]);
  const conversations = preset.whatsapp_conversations;

  const [activeIdx, setActiveIdx] = useState(0);
  const [rendered, setRendered] = useState<RenderedMessage[]>([]);
  const [typing, setTyping] = useState<"customer" | "ai" | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [tick, setTick] = useState(0); // forces replay when toggled
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = conversations[activeIdx];

  // ─── Animate messages on active conversation ───────────────
  useEffect(() => {
    if (!active || !isPlaying) return;

    setRendered([]);
    setTyping(null);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const TYPING_LEAD_MS = 900;

    active.messages.forEach((msg, i) => {
      // Show typing indicator ~900ms before each message (except the very first)
      if (i > 0) {
        const prevDelay = active.messages[i - 1].delay_ms;
        const typeStart = Math.max(
          prevDelay + 200,
          msg.delay_ms - TYPING_LEAD_MS
        );
        timers.push(
          setTimeout(() => setTyping(msg.from), typeStart)
        );
      }

      // Reveal the message
      timers.push(
        setTimeout(() => {
          setTyping(null);
          setRendered((prev) => [
            ...prev,
            { from: msg.from, text: msg.text, index: i },
          ]);
        }, msg.delay_ms)
      );
    });

    // After last message, wait 4s and auto-advance to next conversation
    const lastDelay = active.messages[active.messages.length - 1]?.delay_ms || 0;
    timers.push(
      setTimeout(() => {
        setActiveIdx((idx) => (idx + 1) % conversations.length);
      }, lastDelay + 4000)
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isPlaying, tick, conversations.length]);

  // Auto-scroll to bottom as messages come in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [rendered, typing]);

  function replay() {
    setTick((t) => t + 1);
    setIsPlaying(true);
  }

  function selectConv(idx: number) {
    setActiveIdx(idx);
    setTick((t) => t + 1);
    setIsPlaying(true);
  }

  const progress = active
    ? Math.min(
        100,
        Math.round((rendered.length / active.messages.length) * 100)
      )
    : 0;

  return (
    <PageWrapper title="WhatsApp Chatbot Demo">
      <div className="space-y-4">
        {/* Demo context strip */}
        <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-card p-5">
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#25D366]" />
              Live · Recorded Conversation
            </div>
            <h2 className="mt-2 text-lg font-bold tracking-tight md:text-xl">
              Watch AI close a real {preset.label.toLowerCase()} enquiry —
              automatically, in &lt;30 seconds.
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {preset.emoji} This is an actual conversation our AI handled for a{" "}
              {preset.label.toLowerCase()} client — no humans involved. Watch it
              replay below.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* ── Chat List ──────────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-[#0A0A0A] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Chats</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {conversations.length} recent AI conversations
                  </p>
                </div>
                <div className="rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[10px] font-medium text-[#25D366]">
                  AI on
                </div>
              </div>
            </div>
            <div className="divide-y divide-border">
              {conversations.map((conv, i) => {
                const isActive = i === activeIdx;
                const lastMsg =
                  conv.messages[conv.messages.length - 1]?.text || "";
                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConv(i)}
                    className={cn(
                      "flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/30",
                      isActive && "bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        conv.avatar_tone
                      )}
                    >
                      {conv.customer.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-medium">
                          {conv.customer}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          just now
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {lastMsg.slice(0, 60)}
                        {lastMsg.length > 60 ? "…" : ""}
                      </p>
                    </div>
                    {isActive && (
                      <div className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Replay controls */}
            <div className="border-t border-border bg-[#0A0A0A] p-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90"
                  title={isPlaying ? "Pause" : "Resume"}
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5 translate-x-[1px]" />
                  )}
                </button>
                <button
                  onClick={replay}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
                  title="Replay"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <div className="flex-1">
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-center text-[9px] uppercase tracking-wider text-muted-foreground">
                    {rendered.length} / {active?.messages.length || 0} msgs
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Active Chat ─────────────────────────────────── */}
          <div className="flex h-[620px] flex-col overflow-hidden rounded-xl border border-border bg-card lg:col-span-2">
            {/* Chat header — WhatsApp style */}
            <div className="flex items-center justify-between bg-[#075E54] px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                    active?.avatar_tone || "bg-white/20 text-white"
                  )}
                >
                  {active?.customer.charAt(0) || "?"}
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {active?.customer || "—"}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-white/80">
                    <Sparkles className="h-2.5 w-2.5" />
                    AI replying automatically
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <Video className="h-4 w-4" />
                <Phone className="h-4 w-4" />
                <MoreVertical className="h-4 w-4" />
              </div>
            </div>

            {/* Chat body */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-2 overflow-y-auto bg-[#0E1519] p-4"
              style={{
                backgroundImage:
                  "radial-gradient(circle at top, rgba(124,58,237,0.05), transparent 70%)",
              }}
            >
              {rendered.map((m) => (
                <Bubble key={m.index} from={m.from} text={m.text} />
              ))}
              {typing && <TypingBubble from={typing} />}
            </div>

            {/* Chat input (cosmetic) */}
            <div className="flex items-center gap-2 border-t border-border bg-[#0A0A0A] px-3 py-2.5">
              <Smile className="h-5 w-5 shrink-0 text-muted-foreground" />
              <Paperclip className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1 rounded-full bg-[#1E1E1E] px-4 py-2 text-xs text-muted-foreground">
                AI is handling this conversation automatically.
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]">
                <Mic className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* AI Brain — what the bot "knows" */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">AI knows</h3>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-foreground/80">
              <li>• Your menu / services / pricing</li>
              <li>• Your staff calendars &amp; availability</li>
              <li>• Every customer&apos;s past history</li>
              <li>• Your brand voice &amp; tone</li>
              <li>• Business hours &amp; holiday rules</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <CheckCheck className="h-4 w-4 text-[#10B981]" />
              <h3 className="text-sm font-semibold">AI can act</h3>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-foreground/80">
              {preset.scenarios.slice(0, 5).map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <h3 className="text-sm font-semibold">You stay in control</h3>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-foreground/80">
              <li>• Review every reply before sending (optional)</li>
              <li>• Takeover anytime from your phone</li>
              <li>• Set topics AI can&apos;t touch (e.g. refunds)</li>
              <li>• Weekly digest of what AI did</li>
              <li>• Full transcript audit trail</li>
            </ul>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4">
          <div>
            <p className="text-sm font-semibold">
              Ready to set this up for {demoClientName}?
            </p>
            <p className="text-xs text-muted-foreground">
              We deploy in 7–14 days. You approve every reply during the first
              week.
            </p>
          </div>
          <Link
            href="/demo-mode/integrations"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-primary/20 hover:bg-primary/90"
          >
            See integrations
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}

// ─── Chat bubble ─────────────────────────────────────────────
function Bubble({
  from,
  text,
}: {
  from: "customer" | "ai";
  text: string;
}) {
  const isAI = from === "ai";
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-1 flex duration-300",
        isAI ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[78%] rounded-xl px-3 py-2 text-sm leading-relaxed shadow-sm",
          isAI
            ? "rounded-br-sm bg-[#005C4B] text-white"
            : "rounded-bl-sm bg-[#1F2C33] text-white"
        )}
      >
        <p className="whitespace-pre-wrap">{text}</p>
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px]",
            isAI ? "justify-end text-white/60" : "text-white/50"
          )}
        >
          <span>
            {new Date().toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isAI && <CheckCheck className="h-3 w-3 text-[#53BDEB]" />}
        </div>
      </div>
    </div>
  );
}

// ─── Typing indicator ────────────────────────────────────────
function TypingBubble({ from }: { from: "customer" | "ai" }) {
  const isAI = from === "ai";
  return (
    <div
      className={cn(
        "animate-in fade-in flex duration-200",
        isAI ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "rounded-xl px-3 py-2.5 shadow-sm",
          isAI
            ? "rounded-br-sm bg-[#005C4B]"
            : "rounded-bl-sm bg-[#1F2C33]"
        )}
      >
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" />
        </div>
      </div>
    </div>
  );
}
