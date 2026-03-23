"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Send, Copy, CheckCheck, Trash2, Zap } from "lucide-react";

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
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the Flogen AI Dashboard Assistant — an expert AI co-pilot embedded in the Flogen AI Content OS dashboard.

Flogen AI is a Malaysian B2B WhatsApp AI Agency that builds custom WhatsApp AI Agents for SMEs in Malaysia (Real Estate, Clinics, Hair Salons, F&B, Retail, E-Commerce, Education, Hotels).

BRAND BRIEF:
- One-sentence description: Flogen AI builds WhatsApp AI Agents that handle customer enquiries, capture leads, and book appointments — 24/7, automatically.
- Tagline: We build the bots. You build the brand.
- Problem: Malaysian SME owners are drowning in WhatsApp messages but don't have time to reply fast enough — losing leads and customers daily.
- Target: Malaysian SME owners (Klang Valley focus) across service industries.

VOICE: Confident, direct, results-first. Light Malaysian English (occasional lah/lor). Reference KL/Selangor context.

PACKAGES:
- RM299/mo: FAQ bot, lead capture, business hours auto-reply
- RM649/mo: Appointment booking, follow-up sequences, CRM sync
- RM1499/mo: Full custom flows, multiple agents, analytics

You can help with:
1. Generating Instagram/XHS captions and Reel scripts
2. Writing consulting pitches and client outreach messages
3. Content strategy and posting schedules
4. Analysing trends and market positioning
5. Drafting emails, proposals, and WhatsApp sequences
6. Answering questions about the dashboard data

Always be practical, specific, and actionable. Use Malaysian English naturally.`;

// ─────────────────────────────────────────────────────────────────────────────
// SUGGESTED PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What's my Instagram engagement rate this week?",
  "Generate a Reel script about clinic AI for this week",
  "Write a cold WhatsApp message for a hair salon lead",
  "Analyze what content is working best for @flogen.ai",
  "Draft a consulting pitch for a property agent",
];

// ─────────────────────────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function callAgent(
  sys: string,
  msg: string
): Promise<{ content: string; usage?: { input_tokens: number; output_tokens: number } }> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt: sys, userMessage: msg, maxTokens: 2000 }),
  });
  return res.json();
}

function trackTokens(usage: { input_tokens: number; output_tokens: number }) {
  const key = "flogen_token_log";
  try {
    const existing: TokenEntry[] = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({ ts: Date.now(), input: usage.input_tokens, output: usage.output_tokens });
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // ignore
  }
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  let _id = useRef(1);

  // Load messages and tokens from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("flogen_chat_messages");
      if (saved) setMessages(JSON.parse(saved));
    } catch { /* ignore */ }
    setTokenLog(loadTokenLog());
  }, []);

  // Persist messages
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem("flogen_chat_messages", JSON.stringify(messages)); } catch { /* ignore */ }
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

    try {
      const result = await callAgent(SYSTEM_PROMPT, msg);
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
    try {
      localStorage.removeItem("flogen_chat_messages");
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
                  Ask me anything about content, strategy, pitches, or Flogen AI.
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
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
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
          <p style={{ maxWidth: 760, margin: "8px auto 0", fontSize: 11, color: C.t3, textAlign: "center" }}>
            Uses claude-sonnet-4-5 · $3/1M input · $15/1M output
          </p>
        </div>
      </div>
    </>
  );
}
