"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Send, Copy, CheckCheck, Trash2, Zap, ChevronDown, ChevronUp } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:       "#0a0a0a",
  s:        "#111111",
  s2:       "#171717",
  s3:       "#1f1f1f",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(255,255,255,0.13)",
  accent:   "#bbf088",
  aBg:      "rgba(187,240,136,0.08)",
  aBd:      "rgba(187,240,136,0.20)",
  text:     "#f5f0e6",
  t2:       "#9a9a9a",
  t3:       "#4a4a4a",
  red:      "#f87171",
  blue:     "#60a5fa",
  r:        "8px",
  r2:       "5px",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

interface TokenEntry {
  ts: number;
  input: number;
  output: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8A: SYSTEM PROMPT — injects current date dynamically
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  const today = new Date().toLocaleDateString("en-MY", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  return `You are the AI co-pilot for Flogen AI, a Malaysian B2B AI automation agency. Pre-revenue, active client acquisition. Top deal: The Great Haus Sdn Bhd (Real Estate, Negotiation, 3 days since last contact, RM399–899/mo). Cold outreach: 61 hair salon leads KL/Selangor. Target: 3 paying clients by June 2026. Pricing: RM399/599/899/mo. Platforms: Instagram + Xiaohongshu. Cadence: 2×/week. Today: ${today}. Give specific, grounded advice — not generic tips.

BRAND CONTEXT:
- Flogen AI builds WhatsApp AI Agents that handle customer enquiries, capture leads, and book appointments — 24/7, automatically.
- Tagline: We build the bots. You build the brand.
- Target: Malaysian SME owners (Klang Valley focus) — Hair Salons, Real Estate Agents, Clinics, F&B, Retail.
- Voice: Confident, direct, results-first. Light Malaysian English (occasional lah/lor). Reference KL/Selangor context.

You can help with:
1. Daily priorities and action plans based on the current pipeline
2. Writing cold WhatsApp DMs and outreach sequences
3. Instagram/XHS captions and Reel scripts for Flogen AI content
4. Consulting pitches for SME prospects
5. Content strategy, posting schedules, and cadence advice
6. Analysing content performance and competitor gaps

Always be practical, specific, and actionable.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8B: QUICK PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { emoji: "📋", label: "What should I do today?", prompt: "Based on my current pipeline and goals, what are the 3 most important things I should do today to get closer to my first paying client?" },
  { emoji: "✍", label: "Write a DM for a hair salon", prompt: "Write me a curiosity-first cold WhatsApp DM for a hair salon in KL. Keep it under 3 sentences, no hard sell, end with one specific question." },
  { emoji: "📊", label: "How is my content performing?", prompt: "Based on our content cadence of 2× per week on Instagram and XHS, what content types and topics are most likely performing well for Flogen AI right now, and what should I post next?" },
];

// Suggestions shown in empty state
const SUGGESTIONS = [
  "How do I follow up with The Great Haus after 3 days of silence?",
  "Generate a Reel script about WhatsApp AI for property agents",
  "What's the best pricing angle for a RM399/mo pitch?",
  "Draft a WhatsApp sequence to qualify a hair salon lead",
  "What content should I post this week for maximum reach?",
];

// ─────────────────────────────────────────────────────────────────────────────
// 8C: HISTORY PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────
const HISTORY_KEY = "flogen_assistant_history";

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem("flogen_session_id");
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("flogen_session_id", sid);
    }
    return sid;
  } catch {
    return `s_${Date.now()}`;
  }
}

function loadHistory(): { sessionId: string; messages: Message[] } | null {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveHistory(sessionId: string, messages: Message[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ sessionId, messages }));
  } catch { /* ignore */ }
}

function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getSettingsFromStorage(): { apiKey?: string; claudeModel?: string } {
  try {
    const raw = localStorage.getItem("flogen_workspace_settings");
    if (raw) {
      const ws = JSON.parse(raw);
      return { apiKey: ws.anthropicApiKey || undefined, claudeModel: ws.claudeModel || undefined };
    }
  } catch { /* ignore */ }
  return {};
}

async function callAgent(
  sys: string,
  msg: string
): Promise<{ content: string; error?: string; usage?: { input_tokens: number; output_tokens: number } }> {
  const { apiKey, claudeModel } = getSettingsFromStorage();
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt: sys,
      userMessage: msg,
      maxTokens: 2000,
      apiKey,
      model: claudeModel,
    }),
  });
  return res.json();
}

function trackTokens(usage: { input_tokens: number; output_tokens: number }) {
  const key = "flogen_token_log";
  try {
    const existing: TokenEntry[] = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({ ts: Date.now(), input: usage.input_tokens, output: usage.output_tokens });
    localStorage.setItem(key, JSON.stringify(existing));
  } catch { /* ignore */ }
}

function loadTokenLog(): TokenEntry[] {
  try {
    return JSON.parse(localStorage.getItem("flogen_token_log") || "[]");
  } catch {
    return [];
  }
}

function formatNum(n: number): string {
  return n.toLocaleString("en-US");
}

// ─────────────────────────────────────────────────────────────────────────────
// COPY BUTTON
// ─────────────────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }
  return (
    <button onClick={copy} style={{
      background: "none", border: "none", color: C.t3, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, padding: "3px 6px",
      borderRadius: 4, transition: "color 0.1s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.t2; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = done ? C.accent : C.t3; }}
    >
      {done ? <CheckCheck size={12} color={C.accent} /> : <Copy size={12} />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function DashboardAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenLog, setTokenLog] = useState<TokenEntry[]>([]);
  const [quickOpen, setQuickOpen] = useState(false); // 8B: collapsible quick prompts
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const _id = useRef(1);
  const sessionId = useRef<string>("");

  // 8C: Load history and tokens on mount
  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
    const saved = loadHistory();
    if (saved?.messages?.length) {
      setMessages(saved.messages);
      // Advance _id past highest existing id
      const maxId = Math.max(...saved.messages.map(m => m.id));
      _id.current = maxId + 1;
    }
    setTokenLog(loadTokenLog());
  }, []);

  // 8C: Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveHistory(sessionId.current, messages);
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { id: _id.current++, role: "user", content: msg, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setQuickOpen(false); // close quick prompts after use

    try {
      const result = await callAgent(buildSystemPrompt(), msg);
      if (result.usage) {
        trackTokens(result.usage);
        setTokenLog(loadTokenLog());
      }
      const assistantMsg: Message = {
        id: _id.current++,
        role: "assistant",
        content: result.content || (result as { error?: string }).error || "Sorry, something went wrong.",
        ts: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: unknown) {
      const assistantMsg: Message = {
        id: _id.current++,
        role: "assistant",
        content: `Error: ${(e as Error).message}`,
        ts: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  function clearAll() {
    setMessages([]);
    clearHistory(); // 8C: clear flogen_assistant_history
    try {
      localStorage.removeItem("flogen_token_log");
    } catch { /* ignore */ }
    setTokenLog([]);
  }

  // Token totals
  const totalInput = tokenLog.reduce((sum, e) => sum + e.input, 0);
  const totalOutput = tokenLog.reduce((sum, e) => sum + e.output, 0);
  const estimatedCost = (totalInput / 1_000_000 * 3 + totalOutput / 1_000_000 * 15).toFixed(4);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .da-root * { box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .da-root ::-webkit-scrollbar { width: 4px; }
        .da-root ::-webkit-scrollbar-track { background: transparent; }
        .da-root ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 99px; }
        .da-msg-in { animation: fadeIn 0.2s ease-out; }
        .da-suggestion:hover { background: rgba(187,240,136,0.1) !important; border-color: rgba(187,240,136,0.3) !important; color: #bbf088 !important; }
        .da-send:hover:not(:disabled) { background: #a8e070 !important; }
        .da-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .da-quick:hover { background: rgba(187,240,136,0.1) !important; border-color: rgba(187,240,136,0.25) !important; color: #f5f0e6 !important; }
      `}</style>

      <div className="da-root" style={{
        background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column",
        color: C.text,
      }}>
        {/* ── HEADER ── */}
        <div style={{
          background: C.s, borderBottom: `1px solid ${C.border}`,
          padding: "16px 24px", position: "sticky", top: 0, zIndex: 30,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, background: C.aBg, border: `1px solid ${C.aBd}`,
              borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={18} color={C.accent} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.01em" }}>
                Flogen AI Assistant
              </p>
              <p style={{ fontSize: 11.5, color: C.t2, margin: 0 }}>
                Your AI co-pilot for content, strategy &amp; operations
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {/* Token tracker */}
            <div style={{
              display: "flex", gap: 12, alignItems: "center",
              background: C.s2, border: `1px solid ${C.border}`,
              borderRadius: C.r, padding: "6px 14px", fontSize: 11.5,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Zap size={11} color={C.accent} />
                <span style={{ color: C.t2 }}>In:</span>
                <span style={{ color: C.text, fontWeight: 500 }}>{formatNum(totalInput)}</span>
              </div>
              <span style={{ color: C.t3 }}>·</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: C.t2 }}>Out:</span>
                <span style={{ color: C.text, fontWeight: 500 }}>{formatNum(totalOutput)}</span>
              </div>
              <span style={{ color: C.t3 }}>·</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: C.t2 }}>Cost:</span>
                <span style={{ color: C.accent, fontWeight: 600 }}>${estimatedCost}</span>
              </div>
            </div>

            {/* Clear button */}
            <button onClick={clearAll} style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "transparent", border: `1px solid ${C.borderHi}`,
              color: C.t2, fontSize: 12, padding: "5px 12px", borderRadius: C.r2, cursor: "pointer",
              transition: "all 0.1s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,0.4)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHi; (e.currentTarget as HTMLElement).style.color = C.t2; }}
            >
              <Trash2 size={12} /> Clear history
            </button>
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 0" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Empty state — suggestions */}
            {messages.length === 0 && !loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40 }}>
                <div style={{
                  width: 52, height: 52, background: C.aBg, border: `1px solid ${C.aBd}`,
                  borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
                }}>
                  <Sparkles size={24} color={C.accent} />
                </div>
                <p style={{ fontSize: 17, fontWeight: 600, color: C.text, margin: "0 0 6px" }}>
                  How can I help today?
                </p>
                <p style={{ fontSize: 13, color: C.t2, margin: "0 0 32px", textAlign: "center" }}>
                  Ask me anything about content, strategy, pitches, or your pipeline.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 560 }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} className="da-suggestion" onClick={() => send(s)} style={{
                      background: C.s2, border: `1px solid ${C.border}`,
                      color: C.t2, fontSize: 13, padding: "11px 16px", borderRadius: C.r,
                      cursor: "pointer", textAlign: "left", transition: "all 0.12s",
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <div key={msg.id} className="da-msg-in" style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}>
                {msg.role === "user" ? (
                  <div style={{
                    maxWidth: "72%",
                    background: C.aBg,
                    border: `1px solid ${C.aBd}`,
                    borderRadius: "12px 12px 4px 12px",
                    padding: "10px 14px",
                    fontSize: 13.5,
                    color: C.text,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                ) : (
                  <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{
                      background: C.s2,
                      border: `1px solid ${C.border}`,
                      borderRadius: "12px 12px 12px 4px",
                      overflow: "hidden",
                    }}>
                      <pre style={{
                        margin: 0, padding: "12px 16px",
                        color: C.text, fontSize: 13.5, lineHeight: 1.7,
                        fontFamily: "inherit", whiteSpace: "pre-wrap",
                      }}>
                        {msg.content}
                      </pre>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <CopyBtn text={msg.content} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading bubble */}
            {loading && (
              <div className="da-msg-in" style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  background: C.s2, border: `1px solid ${C.border}`,
                  borderRadius: "12px 12px 12px 4px",
                  padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 8,
                  color: C.t2, fontSize: 13,
                }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: "50%", background: C.accent,
                        animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                        display: "inline-block",
                      }} />
                    ))}
                  </div>
                  Thinking…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── INPUT BAR ── */}
        <div style={{
          background: C.s, borderTop: `1px solid ${C.border}`,
          padding: "16px 24px", position: "sticky", bottom: 0,
        }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>

            {/* 8B: Quick prompts — collapsible */}
            <div style={{ marginBottom: 10 }}>
              <button
                onClick={() => setQuickOpen(o => !o)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "transparent", border: "none",
                  color: C.t2, fontSize: 11.5, cursor: "pointer", padding: "2px 0",
                  transition: "color .12s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.accent; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.t2; }}
              >
                {quickOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                Quick prompts
              </button>

              {quickOpen && (
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {QUICK_PROMPTS.map(qp => (
                    <button
                      key={qp.label}
                      className="da-quick"
                      onClick={() => send(qp.prompt)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: C.s2, border: `1px solid ${C.border}`,
                        color: C.t2, fontSize: 12, padding: "6px 12px",
                        borderRadius: C.r, cursor: "pointer",
                        transition: "all .12s", whiteSpace: "nowrap",
                      }}
                    >
                      <span>{qp.emoji}</span>
                      <span>{qp.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input row */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
                rows={1}
                style={{
                  flex: 1,
                  background: C.s2, border: `1px solid ${C.borderHi}`,
                  color: C.text, fontSize: 14, padding: "11px 14px",
                  borderRadius: C.r, outline: "none", resize: "none",
                  fontFamily: "inherit", lineHeight: 1.5,
                  maxHeight: 160, overflowY: "auto",
                  transition: "border-color 0.1s",
                }}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = C.aBd; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = C.borderHi; }}
                onInput={e => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 160) + "px";
                }}
              />
              <button
                className="da-send"
                onClick={() => send()}
                disabled={loading || !input.trim()}
                style={{
                  background: C.accent, border: "none",
                  color: "#0a0a0a", padding: "11px 16px", borderRadius: C.r,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  fontSize: 13.5, fontWeight: 600, transition: "background 0.1s", flexShrink: 0,
                }}
              >
                <Send size={15} />
                Send
              </button>
            </div>

            <p style={{ margin: "8px 0 0", fontSize: 11, color: C.t3, textAlign: "center" }}>
              Uses model from Settings · API key from Settings → AI Behaviour
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
