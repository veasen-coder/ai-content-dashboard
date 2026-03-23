"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, X, Trash2, Loader2, RefreshCw, Copy, CheckCheck,
  Zap, TrendingUp, CalendarDays, Users, Target, Sparkles,
  MessageSquare, Send, ArrowRight, GripVertical, Check,
  ChevronLeft, ChevronRight, Instagram, BarChart3, Hash, Archive,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:       "#0a0a0a",
  s:        "#111111",   // surface
  s2:       "#171717",   // surface raised
  s3:       "#1f1f1f",   // surface hover
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(255,255,255,0.13)",
  accent:   "#bbf088",
  aBg:      "rgba(187,240,136,0.08)",
  aBd:      "rgba(187,240,136,0.20)",
  green:    "#0f5c37",
  cream:    "#f5f0e6",
  text:     "#f5f0e6",
  t2:       "#9a9a9a",
  t3:       "#4a4a4a",
  red:      "#f87171",
  orange:   "#fb923c",
  blue:     "#60a5fa",
  purple:   "#c4b5fd",
  yellow:   "#fbbf24",
  r:        "8px",
  r2:       "5px",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Tab         = "kanban" | "pipeline" | "calendar" | "agents" | "trends" | "scripts";
type KCol        = "today" | "week" | "backlog" | "done";
type KTag        = "Flogen AI" | "JCI" | "Personal";
type PStage      = "lead" | "contacted" | "demo" | "negotiation" | "closed";
type PostPlat    = "instagram" | "xiaohongshu";
type PostType    = "Reel" | "Carousel" | "Static" | "XHS Post";
type PostStatus  = "Draft" | "Scheduled" | "Posted";
type TrendCat    = "AI" | "WhatsApp" | "SME" | "Social";

interface KCard  { id: number; title: string; tag: KTag; }
interface Deal   { id: number; name: string; industry: string; stage: PStage; lastContact: string | null; value: string; nextAction: string; }
interface CalPost{ id: number; date: string; platform: PostPlat; type: PostType; topic: string; caption: string; status: PostStatus; }
interface Trend  { id: number; title: string; category: TrendCat; description: string; relevance: string; }
interface SavedScript {
  id: number;
  title: string;
  content: string;
  type: "Content Plan" | "Script" | "Pitch" | "Trend";
  savedAt: string;
  platform?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
let _uid = 500;
const uid = () => ++_uid;

function useLocal<T>(key: string, init: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [st, setSt] = useState<T>(() => {
    if (typeof window === "undefined") return init;
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setSt(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [st, set];
}

function daysAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff}d ago`;
}

function getWeekDates(offset = 0): Date[] {
  const today = new Date();
  const day   = today.getDay();
  const mon   = new Date(today);
  mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

async function callAgent(sys: string, msg: string, max = 1200): Promise<string> {
  const res  = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: sys, userMessage: msg, maxTokens: max }) });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.content as string;
}

function trackTokens(usage: { input_tokens: number; output_tokens: number }) {
  const key = "flogen_token_log";
  try {
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({ ts: Date.now(), input: usage.input_tokens, output: usage.output_tokens });
    localStorage.setItem(key, JSON.stringify(existing));
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────
const WEEK0 = getWeekDates(0);

const INIT_KANBAN: Record<KCol, KCard[]> = {
  today: [
    { id: 1, title: "Follow up The Great Haus — post-demo check-in", tag: "Flogen AI" },
    { id: 2, title: "Draft property agent pain-point IG Reel script",  tag: "Flogen AI" },
    { id: 3, title: "Update buyflogen.com hero section copy",          tag: "Flogen AI" },
  ],
  week: [
    { id: 4, title: "Cold outreach — 5 beauty/wellness salon leads",   tag: "Flogen AI" },
    { id: 5, title: "Post 2× Instagram content this week",             tag: "Flogen AI" },
    { id: 6, title: "JCI April marketing calendar — first draft",      tag: "JCI"       },
    { id: 7, title: "Devin curiosity-first WhatsApp outreach message", tag: "Flogen AI" },
    { id: 8, title: "Record Great Haus demo walkthrough video (60s)",  tag: "Flogen AI" },
  ],
  backlog: [
    { id: 9,  title: "Build F&B chatbot demo flow for next vertical",  tag: "Flogen AI" },
    { id: 10, title: "Map out Xiaohongshu strategy & posting cadence", tag: "Flogen AI" },
    { id: 11, title: "Write Flogen AI case study template (post win)",  tag: "Flogen AI" },
    { id: 12, title: "Research TikTok SME automation case studies",    tag: "Flogen AI" },
  ],
  done: [],
};

const INIT_DEALS: Deal[] = [
  { id: 1, name: "The Great Haus Sdn Bhd",       industry: "Real Estate",  stage: "negotiation", lastContact: "2026-03-20", value: "RM 399–899/mo", nextAction: "Follow up post-pilot — confirm package tier & sign-off"          },
  { id: 2, name: "Devin (Property Agent Leader)", industry: "Real Estate",  stage: "lead",        lastContact: null,         value: "TBD",           nextAction: "Curiosity-first WhatsApp outreach — no pitch yet, ask questions" },
  { id: 3, name: "Beauty & Wellness Cold List",   industry: "Hair & Beauty",stage: "lead",        lastContact: null,         value: "RM 399/mo × 61 leads", nextAction: "Start with top 5 Klang Valley hair salons — personalised DMs"   },
];

const INIT_POSTS: CalPost[] = [
  { id: 1, date: isoDate(WEEK0[0]), platform: "instagram",    type: "Reel",     topic: "Property agents losing leads after hours",  caption: "🏠 Every missed WhatsApp at 11pm is a lost listing. Here's how Flogen AI keeps you closing — even when you're asleep.", status: "Draft"     },
  { id: 2, date: isoDate(WEEK0[2]), platform: "instagram",    type: "Carousel", topic: "3 WhatsApp automations that save 4hrs/week", caption: "You don't need to reply to every 'hi' manually. Swipe to see the 3 flows we build for every SME client →",           status: "Scheduled" },
  { id: 3, date: isoDate(WEEK0[4]), platform: "xiaohongshu",  type: "XHS Post", topic: "AI助理帮你管WhatsApp客户",                  caption: "很多中小企业老板每天花2-3小时回复WhatsApp。用AI助理，这些时间可以用来做更重要的事 💚",                              status: "Draft"     },
  { id: 4, date: isoDate(WEEK0[5]), platform: "instagram",    type: "Static",   topic: "Brand story — why Flogen AI exists",        caption: "We started Flogen AI because Malaysian SME owners were drowning in WhatsApp messages. There's a better way. 🇲🇾",       status: "Draft"     },
];

const INIT_TRENDS: Trend[] = [
  { id: 1, title: "WhatsApp Business API Surging in Southeast Asia",      category: "WhatsApp", description: "SMEs across Malaysia, Singapore, and Indonesia are rapidly automating customer journeys via WhatsApp Business API — from lead capture to booking confirmations.", relevance: "Direct market validation for Flogen AI. Lead with this in pitches: 'Your competitors are automating already.'" },
  { id: 2, title: "AI Chatbots Replacing Clinic Receptionists in KL",     category: "AI",       description: "Aesthetic clinics and GP practices in Klang Valley are piloting WhatsApp AI bots for appointment booking, FAQ handling, and post-treatment follow-ups.",          relevance: "Ready-made vertical. Build a clinic demo flow and target the 61-SME beauty list with it."                    },
  { id: 3, title: "Xiaohongshu Growing Among Malaysian Chinese SMEs",     category: "Social",   description: "More Malaysian Chinese business owners are using XHS to showcase businesses to local and China-based audiences. Content is lifestyle-forward and highly visual.",  relevance: "Expand Flogen AI content to XHS — write in Simplified Chinese targeting salon and F&B owners."               },
  { id: 4, title: "After-Hours Response Time = 9× Higher Conversion",    category: "SME",      description: "Research shows responding within 5 minutes of an enquiry increases conversion by 9×. Most SMEs miss this window because owners are unavailable after 7pm.",        relevance: "Core pain-point stat for Flogen AI. Lead with this in cold outreach and IG content."                          },
  { id: 5, title: "Short-Form WhatsApp Video Demos Outperform PDFs",      category: "WhatsApp", description: "B2B agencies are seeing higher response rates from 60–90 second WhatsApp demo videos over PDF proposals. Personal, fast, and no attachment needed.",              relevance: "Record a 60-second Great Haus demo video. Higher reply chance than sending the full deck."                    },
  { id: 6, title: "Personalised AI Outreach — 3–5× Higher Open Rates",   category: "AI",       description: "Sales teams using AI to personalise each outreach at scale (industry, location, specific pain point) see dramatically higher open and reply rates.",               relevance: "Use the Consulting Assistant to draft personalised pitches for each beauty/wellness lead."                     },
];

const TAG_S: Record<KTag, { bg: string; color: string }> = {
  "Flogen AI": { bg: C.aBg,                        color: C.accent  },
  "JCI":       { bg: "rgba(96,165,250,.1)",         color: C.blue    },
  "Personal":  { bg: "rgba(251,146,60,.1)",         color: C.orange  },
};
const STAGE_ORDER: PStage[] = ["lead","contacted","demo","negotiation","closed"];
const STAGE_LABEL: Record<PStage, string> = { lead: "Lead", contacted: "Contacted", demo: "Demo Sent", negotiation: "Negotiation", closed: "Closed" };
const STAGE_COLOR: Record<PStage, string> = { lead: C.t2, contacted: C.blue, demo: C.purple, negotiation: C.yellow, closed: C.accent };
const INDUSTRY_COLOR: Record<string, string> = { "Real Estate": C.blue, "Hair & Beauty": C.purple, "F&B": C.orange, "Clinic": C.red, "Retail": C.yellow };
const STATUS_S: Record<PostStatus, { bg: string; color: string }> = {
  Draft:     { bg: "rgba(74,74,74,.3)",         color: C.t2     },
  Scheduled: { bg: "rgba(251,191,36,.1)",        color: C.yellow },
  Posted:    { bg: "rgba(187,240,136,.1)",       color: C.accent },
};
const TCAT_S: Record<TrendCat, { bg: string; color: string }> = {
  AI:        { bg: C.aBg,                        color: C.accent  },
  WhatsApp:  { bg: "rgba(96,165,250,.1)",        color: C.blue    },
  SME:       { bg: "rgba(251,146,60,.1)",        color: C.orange  },
  Social:    { bg: "rgba(196,181,253,.1)",       color: C.purple  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AGENT SYSTEM PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
const SYS_PLANNER = `You are the Content Planner for Flogen AI, a Malaysian B2B WhatsApp AI Agency founded by Veasen. Target audience: Malaysian SME owners in real estate, clinics, salons, F&B, and retail.

Generate EXACTLY 3 post ideas — 2 for Instagram (English) and 1 for Xiaohongshu (Simplified Chinese).

Brand voice: Confident, direct, results-first. Speak to business owners, not tech people. Light Malaysian English flavour (occasional 'lah', 'lor'). Reference KL/Selangor context.

Format:
## IG Post 1 — [Reel/Carousel/Static]
**Topic:** ...
**Hook (first line):** ...
**Caption:** ...
**Hashtags:** #flogenai #whatsappautomation ...

## IG Post 2 — [Reel/Carousel/Static]
**Topic:** ...
**Hook:** ...
**Caption:** ...
**Hashtags:** ...

## XHS Post
**Topic (English):** ...
**Caption (Chinese):** ...
**Caption guide (English):** ...`;

const SYS_SCRIPT = `You are the Script Writer for Flogen AI, a Malaysian B2B WhatsApp AI Agency. Write compelling content for Malaysian SME-focused social media.

CORE IDENTITY
- Description: Flogen AI builds WhatsApp AI Agents that handle enquiries, capture leads & book appointments — 24/7.
- Tagline: We build the bots. You build the brand.
- Problem: Malaysian SMEs are drowning in WhatsApp messages, losing leads daily.
- Target: Malaysian SME owners in Klang Valley — Real Estate, Clinics, Salons, F&B, Hotels.

VOICE & TONE
- Sounds like: Confident · Direct · Results-first
- Never sounds like: Corporate · Salesy · Generic
- Language: Malaysian English (lah/lor naturally), KL/Selangor context
- Never use: "revolutionary", "cutting-edge", "leverage", "synergy"

CONTENT PILLARS
1. Pain-point Education — problems Malaysian SMEs face
2. Case Study / Result — real client wins
3. Product Showcase — how Flogen AI works
4. Industry Spotlight — Clinic/Salon/F&B/Property rotation
5. Brand Story — behind the scenes, founder story

PACKAGES
- RM299/mo: FAQ bot, lead capture, auto-reply
- RM649/mo: Appointment booking, follow-up, CRM sync
- RM1499/mo: Full custom flows, multi-agent, analytics

For Reels: Hook (3 secs) → 3–5 scenes/points → CTA
For Carousels: Slide 1 (hook) → Slides 2–5 (value) → Final slide (CTA)
For Static posts: Punchy headline + 2–3 lines + CTA
For XHS Posts: Lifestyle tone in Simplified Chinese, relatable to Chinese-Malaysian SME owners

Always: strong hook, clear benefit, Malaysian context (KL/Selangor SMEs), direct CTA pointing to WhatsApp or DM.

---
[GENERATED SCRIPT BELOW]`;

const SYS_CONSULT = `You are the Consulting Assistant for Flogen AI, a Malaysian B2B WhatsApp AI Agency. When given a client's business name and problem, generate a structured WhatsApp AI Agent pitch.

Flogen AI packages:
- Starter: RM 399/mo — FAQ bot, basic lead capture, business hours auto-reply
- Growth: RM 599/mo — appointment booking, follow-up sequences, CRM sync
- Pro: RM 899/mo — full custom flows, multiple agents, analytics dashboard

Format your response exactly as:
## Client Snapshot
[2-line summary of their business type and WhatsApp usage pattern]

## Root Problem
[The specific pain point in 1–2 sentences]

## Recommended Solution
[Specific WhatsApp AI agent features for their use case]

## 3 Key Benefits
1. ...
2. ...
3. ...

## Suggested Package
[Starter/Growth/Pro + reason why]

## Opening Message
[Curiosity-first WhatsApp message — no pitch, just a question that gets them talking]`;

const SYS_TRENDS = `You are a market intelligence analyst for Flogen AI, a Malaysian B2B WhatsApp AI Agency. Generate 6 fresh trend cards relevant to AI automation, WhatsApp marketing, and Malaysian SME content as of early 2026.

Return ONLY valid JSON, no markdown fencing, no explanation. Use this exact structure:
[
  {
    "title": "...",
    "category": "AI|WhatsApp|SME|Social",
    "description": "2-3 sentences describing the trend",
    "relevance": "1 sentence on how Flogen AI can use this"
  }
]`;

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function Chip({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{label}</span>;
}
function Btn({ children, onClick, accent, small, full, disabled }: { children: React.ReactNode; onClick?: () => void; accent?: boolean; small?: boolean; full?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: accent ? C.accent : "transparent", border: `1px solid ${accent ? "transparent" : C.borderHi}`, color: accent ? "#0a0a0a" : C.t2, fontSize: small ? 11.5 : 13, fontWeight: accent ? 600 : 400, padding: small ? "4px 10px" : "7px 16px", borderRadius: C.r2, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all .12s", whiteSpace: "nowrap", width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined, opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  async function copy() { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }
  return <Btn small onClick={copy}>{done ? <CheckCheck size={12} /> : <Copy size={12} />}{done ? "Copied" : "Copy"}</Btn>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — KANBAN
// ─────────────────────────────────────────────────────────────────────────────
const KCOL_META: Record<KCol, { label: string; dot: string }> = {
  today:   { label: "Today",     dot: C.accent  },
  week:    { label: "This Week", dot: C.yellow  },
  backlog: { label: "Backlog",   dot: C.blue    },
  done:    { label: "Done",      dot: C.t3      },
};

function KanbanCard({ card, onDelete, onEdit, col }: { card: KCard; onDelete: () => void; onEdit: (t: string) => void; col: KCol }) {
  const [hov, setHov]     = useState(false);
  const [edit, setEdit]   = useState(false);
  const [draft, setDraft] = useState(card.title);
  const t = TAG_S[card.tag];

  function commit() { setEdit(false); if (draft.trim()) onEdit(draft.trim()); else setDraft(card.title); }

  return (
    <div
      draggable onDragStart={e => { e.dataTransfer.setData("cardId", String(card.id)); e.dataTransfer.setData("fromCol", col); e.dataTransfer.effectAllowed = "move"; }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.s3 : C.s2, border: `1px solid ${hov ? C.borderHi : C.border}`, borderRadius: C.r, padding: "10px 12px", cursor: "grab", transition: "all .12s", position: "relative" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ opacity: hov ? 0.3 : 0, transition: "opacity .12s", marginTop: 2, flexShrink: 0, cursor: "grab" }}><GripVertical size={13} color={C.t2} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {edit ? (
            <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
              onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(card.title); setEdit(false); } }}
              style={{ background: "transparent", border: "none", outline: `2px solid ${C.aBd}`, borderRadius: 4, color: C.text, fontSize: 13, width: "100%", padding: "1px 4px" }} />
          ) : (
            <p onClick={() => setEdit(true)} style={{ fontSize: 13, color: col === "done" ? C.t3 : C.text, textDecoration: col === "done" ? "line-through" : "none", margin: 0, lineHeight: 1.5, cursor: "text" }}>{card.title}</p>
          )}
          <div style={{ marginTop: 6 }}><Chip label={card.tag} bg={t.bg} color={t.color} /></div>
        </div>
        <button onClick={onDelete} style={{ opacity: hov ? 1 : 0, transition: "opacity .12s", background: "none", border: "none", color: C.t3, cursor: "pointer", padding: "2px 3px", display: "flex", flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = C.red)} onMouseLeave={e => (e.currentTarget.style.color = C.t3)}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function AddKCard({ onAdd }: { onAdd: (t: string, tag: KTag) => void }) {
  const [open, setOpen]   = useState(false);
  const [text, setText]   = useState("");
  const [tag, setTag]     = useState<KTag>("Flogen AI");
  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: "flex", alignItems: "center", gap: 5, color: C.t3, background: "transparent", border: `1px dashed ${C.border}`, fontSize: 12.5, padding: "7px 10px", cursor: "pointer", borderRadius: C.r, width: "100%", transition: "all .12s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.aBd; (e.currentTarget as HTMLElement).style.color = C.accent; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.t3; }}>
      <Plus size={13} /> Add card
    </button>
  );
  return (
    <form onSubmit={e => { e.preventDefault(); if (!text.trim()) return; onAdd(text.trim(), tag); setText(""); setOpen(false); }}
      style={{ background: C.s2, border: `1px solid ${C.aBd}`, borderRadius: C.r, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <input autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="Task title…" style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 13, padding: 0 }} />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <select value={tag} onChange={e => setTag(e.target.value as KTag)} style={{ background: C.s3, border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 12, padding: "4px 8px", borderRadius: C.r2, outline: "none", flex: 1 }}>
          {(["Flogen AI","JCI","Personal"] as KTag[]).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Btn accent small onClick={() => {}}>Add</Btn>
        <Btn small onClick={() => setOpen(false)}>Cancel</Btn>
      </div>
    </form>
  );
}

function KanbanSection() {
  const [board, setBoard] = useLocal<Record<KCol, KCard[]>>("flogen_kanban", INIT_KANBAN);
  const [dragOver, setDragOver] = useState<KCol | null>(null);

  function moveCard(id: number, from: KCol, to: KCol) {
    if (from === to) return;
    setBoard(prev => {
      const card = prev[from].find(c => c.id === id);
      if (!card) return prev;
      return { ...prev, [from]: prev[from].filter(c => c.id !== id), [to]: [...prev[to], card] };
    });
  }
  function delCard(col: KCol, id: number) { setBoard(prev => ({ ...prev, [col]: prev[col].filter(c => c.id !== id) })); }
  function editCard(col: KCol, id: number, title: string) { setBoard(prev => ({ ...prev, [col]: prev[col].map(c => c.id === id ? { ...c, title } : c) })); }
  function addCard(col: KCol, title: string, tag: KTag) { setBoard(prev => ({ ...prev, [col]: [...prev[col], { id: uid(), title, tag }] })); }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: C.border }}>
        {(["today","week","backlog","done"] as KCol[]).map(col => {
          const { label, dot } = KCOL_META[col];
          const isDragTarget = dragOver === col;
          return (
            <div key={col}
              onDragOver={e => { e.preventDefault(); setDragOver(col); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => { e.preventDefault(); const id = +e.dataTransfer.getData("cardId"); const from = e.dataTransfer.getData("fromCol") as KCol; moveCard(id, from, col); setDragOver(null); }}
              style={{ background: isDragTarget ? C.s3 : C.bg, minHeight: 480, display: "flex", flexDirection: "column", transition: "background .12s" }}
            >
              {/* Header */}
              <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}` }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</span>
                <span style={{ fontSize: 11, color: C.t3, marginLeft: 2 }}>{board[col].length}</span>
              </div>
              {/* Cards */}
              <div style={{ flex: 1, padding: "10px 10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                {board[col].map(card => (
                  <KanbanCard key={card.id} card={card} col={col}
                    onDelete={() => delCard(col, card.id)}
                    onEdit={t => editCard(col, card.id, t)} />
                ))}
              </div>
              <div style={{ padding: "8px 10px 12px" }}>
                <AddKCard onAdd={(t, tag) => addCard(col, t, tag)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
function DealCard({ deal, onAdvance, onDelete, onEdit }: { deal: Deal; onAdvance: () => void; onDelete: () => void; onEdit: (f: Partial<Deal>) => void }) {
  const [hov, setHov] = useState(false);
  const isClosed = deal.stage === "closed";
  const nextStage = STAGE_ORDER[STAGE_ORDER.indexOf(deal.stage) + 1];
  const indColor = INDUSTRY_COLOR[deal.industry] ?? C.t2;

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.s3 : C.s2, border: `1px solid ${isClosed ? C.aBd : C.border}`, borderRadius: C.r, padding: "12px 14px", transition: "all .12s", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, lineHeight: 1.35 }}>{deal.name}</p>
        <button onClick={onDelete} style={{ opacity: hov ? 1 : 0, transition: "opacity .12s", background: "none", border: "none", color: C.t3, cursor: "pointer", padding: "2px 3px", flexShrink: 0, display: "flex" }}
          onMouseEnter={e => (e.currentTarget.style.color = C.red)} onMouseLeave={e => (e.currentTarget.style.color = C.t3)}>
          <X size={13} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        <Chip label={deal.industry} bg={`${indColor}18`} color={indColor} />
        <Chip label={daysAgo(deal.lastContact)} bg={C.s3} color={C.t2} />
      </div>
      <p style={{ fontSize: 12.5, color: C.accent, fontWeight: 600, margin: "0 0 4px" }}>{deal.value}</p>
      <p style={{ fontSize: 11.5, color: C.t2, margin: "0 0 10px", lineHeight: 1.5 }}>{deal.nextAction}</p>
      {!isClosed && nextStage && (
        <button onClick={onAdvance}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 11, padding: "4px 8px", borderRadius: C.r2, cursor: "pointer", transition: "all .12s", width: "100%", justifyContent: "center" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.aBd; (e.currentTarget as HTMLElement).style.color = C.accent; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHi; (e.currentTarget as HTMLElement).style.color = C.t2; }}>
          Move to {STAGE_LABEL[nextStage]} <ArrowRight size={11} />
        </button>
      )}
      {isClosed && <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.accent, fontSize: 12 }}><Check size={13} /> Closed — paid client</div>}
    </div>
  );
}

function PipelineSection() {
  const [deals, setDeals] = useLocal<Deal[]>("flogen_pipeline", INIT_DEALS);
  const closedCount = deals.filter(d => d.stage === "closed").length;

  function advance(id: number) {
    setDeals(prev => prev.map(d => {
      if (d.id !== id) return d;
      const idx = STAGE_ORDER.indexOf(d.stage);
      return idx < STAGE_ORDER.length - 1 ? { ...d, stage: STAGE_ORDER[idx + 1], lastContact: isoDate(new Date()) } : d;
    }));
  }
  function addDeal(name: string) {
    setDeals(prev => [...prev, { id: uid(), name, industry: "Real Estate", stage: "lead", lastContact: null, value: "TBD", nextAction: "Initial outreach" }]);
  }

  return (
    <div>
      {/* Target banner */}
      <div style={{ background: C.s, border: `1px solid ${closedCount >= 3 ? C.aBd : C.border}`, borderRadius: C.r, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Target size={15} color={C.accent} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>Target: 3 paying clients by June 2026</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ width: 28, height: 28, borderRadius: "50%", background: closedCount >= n ? C.accent : C.s2, border: `2px solid ${closedCount >= n ? C.accent : C.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {closedCount >= n && <Check size={13} color="#0a0a0a" strokeWidth={3} />}
            </div>
          ))}
        </div>
        <span style={{ fontSize: 12, color: C.t2 }}>{closedCount}/3 clients closed</span>
      </div>
      {/* Stage columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 1, background: C.border }}>
        {STAGE_ORDER.map(stage => {
          const stageDeal = deals.filter(d => d.stage === stage);
          return (
            <div key={stage} style={{ background: C.bg, minHeight: 400, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "12px 12px 8px", borderBottom: `2px solid ${STAGE_COLOR[stage]}22`, display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: STAGE_COLOR[stage] }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: STAGE_COLOR[stage], letterSpacing: "0.02em" }}>{STAGE_LABEL[stage]}</span>
                <span style={{ fontSize: 11, color: C.t3 }}>{stageDeal.length}</span>
              </div>
              <div style={{ flex: 1, padding: "10px 10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                {stageDeal.map(d => (
                  <DealCard key={d.id} deal={d}
                    onAdvance={() => advance(d.id)}
                    onDelete={() => setDeals(prev => prev.filter(x => x.id !== d.id))}
                    onEdit={f => setDeals(prev => prev.map(x => x.id === d.id ? { ...x, ...f } : x))} />
                ))}
                {stage === "lead" && (
                  <button onClick={() => { const n = prompt("New lead name:"); if (n?.trim()) addDeal(n.trim()); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, color: C.t3, background: "transparent", border: `1px dashed ${C.border}`, fontSize: 12, padding: "7px 10px", cursor: "pointer", borderRadius: C.r, marginTop: 4, transition: "all .12s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.aBd; (e.currentTarget as HTMLElement).style.color = C.accent; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.t3; }}>
                    <Plus size={12} /> Add lead
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — CONTENT CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
const COMPETITORS = [
  { handle: "@mampu.ai",        desc: "Malaysian AI automation agency" },
  { handle: "@chatshero",       desc: "WhatsApp chatbot solutions"     },
  { handle: "@boostcommerce.my",desc: "E-commerce automation & growth" },
  { handle: "@wati.io",         desc: "WhatsApp business API platform" },
];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function PostCard({ post, onDelete }: { post: CalPost; onDelete: () => void }) {
  const [hov, setHov]       = useState(false);
  const [expand, setExpand] = useState(false);
  const ps = STATUS_S[post.status];
  const isIG = post.platform === "instagram";

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.s3 : C.s2, border: `1px solid ${C.border}`, borderRadius: C.r2, padding: "7px 8px", transition: "all .12s", cursor: "pointer" }}
      onClick={() => setExpand(e => !e)}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        {isIG ? <Instagram size={11} color={C.orange} /> : <Hash size={11} color={C.red} />}
        <span style={{ fontSize: 10.5, fontWeight: 500, color: isIG ? C.orange : C.red }}>{post.type}</span>
        <span style={{ marginLeft: "auto" }}><Chip label={post.status} bg={ps.bg} color={ps.color} /></span>
        {hov && <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", padding: 0, display: "flex" }}><X size={11} /></button>}
      </div>
      <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.4 }}>{post.topic}</p>
      {expand && <p style={{ fontSize: 11, color: C.t2, margin: "6px 0 0", lineHeight: 1.6, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>{post.caption}</p>}
    </div>
  );
}

function CalendarSection({ onPlannerPrefill }: { onPlannerPrefill: (v: string) => void }) {
  const [posts, setPosts]     = useLocal<CalPost[]>("flogen_calendar", INIT_POSTS);
  const [weekOff, setWeekOff] = useState(0);
  const [addDay, setAddDay]   = useState<string | null>(null);
  const [form, setForm]       = useState({ platform: "instagram" as PostPlat, type: "Reel" as PostType, topic: "", status: "Draft" as PostStatus });
  const week = getWeekDates(weekOff);

  function addPost() {
    if (!addDay || !form.topic.trim()) return;
    setPosts(prev => [...prev, { id: uid(), date: addDay, ...form, caption: "" }]);
    setAddDay(null); setForm({ platform: "instagram", type: "Reel", topic: "", status: "Draft" });
  }

  const sel: React.CSSProperties = { background: C.s3, border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 12, padding: "5px 8px", borderRadius: C.r2, outline: "none" };

  return (
    <div>
      {/* Week nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Btn small onClick={() => setWeekOff(w => w - 1)}><ChevronLeft size={13} /></Btn>
        <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
          {week[0].toLocaleDateString("en-MY",{month:"short",day:"numeric"})} – {week[6].toLocaleDateString("en-MY",{month:"short",day:"numeric",year:"numeric"})}
        </span>
        <Btn small onClick={() => setWeekOff(w => w + 1)}><ChevronRight size={13} /></Btn>
        <Btn small onClick={() => setWeekOff(0)}>Today</Btn>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: C.border, marginBottom: 16 }}>
        {week.map((date, i) => {
          const iso       = isoDate(date);
          const isToday   = iso === isoDate(new Date());
          const dayPosts  = posts.filter(p => p.date === iso);
          return (
            <div key={iso} style={{ background: C.bg, minHeight: 180, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 8px 6px", borderBottom: `1px solid ${isToday ? C.aBd : C.border}`, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 10.5, color: C.t2 }}>{DAY_LABELS[i]}</span>
                <span style={{ fontSize: 12.5, fontWeight: isToday ? 700 : 400, color: isToday ? C.accent : C.text }}>{date.getDate()}</span>
              </div>
              <div style={{ flex: 1, padding: "6px 6px 0", display: "flex", flexDirection: "column", gap: 4 }}>
                {dayPosts.map(p => <PostCard key={p.id} post={p} onDelete={() => setPosts(prev => prev.filter(x => x.id !== p.id))} />)}
              </div>
              <button onClick={() => setAddDay(addDay === iso ? null : iso)}
                style={{ margin: "4px 6px 6px", display: "flex", alignItems: "center", gap: 3, color: addDay === iso ? C.accent : C.t3, background: "transparent", border: `1px dashed ${addDay === iso ? C.aBd : C.border}`, fontSize: 11, padding: "4px 6px", cursor: "pointer", borderRadius: C.r2, transition: "all .12s" }}>
                <Plus size={11} /> Add
              </button>
              {addDay === iso && (
                <div style={{ padding: "8px 8px 10px", background: C.s2, borderTop: `1px solid ${C.aBd}`, display: "flex", flexDirection: "column", gap: 6 }}>
                  <input value={form.topic} onChange={e => setForm(f => ({...f, topic: e.target.value}))} placeholder="Topic…" style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 12 }} />
                  <select value={form.platform} onChange={e => setForm(f => ({...f, platform: e.target.value as PostPlat}))} style={sel}>
                    <option value="instagram">Instagram</option><option value="xiaohongshu">Xiaohongshu</option>
                  </select>
                  <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value as PostType}))} style={sel}>
                    {["Reel","Carousel","Static","XHS Post"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Btn accent small full onClick={addPost}>Add post</Btn>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Competitor feeds */}
      <div style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "14px 18px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.t3, letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 12px" }}>Competitor Accounts to Watch</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
          {COMPETITORS.map(c => (
            <div key={c.handle} style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r2, padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Users size={13} color={C.t3} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: C.text, margin: 0 }}>{c.handle}</p>
                <p style={{ fontSize: 11.5, color: C.t2, margin: "2px 0 0" }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — AI AGENTS
// ─────────────────────────────────────────────────────────────────────────────
function AgentCard({ title, description, icon: Icon, children }: { title: string; description: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, background: C.aBg, border: `1px solid ${C.aBd}`, borderRadius: C.r2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={15} color={C.accent} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 12, color: C.t2, margin: "2px 0 0" }}>{description}</p>
        </div>
      </div>
      <div style={{ flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function OutputPanel({
  text, loading, error, onAccept, scriptType, scriptTitle
}: {
  text: string; loading: boolean; error: string;
  onAccept?: (content: string) => void;
  scriptType?: "Content Plan" | "Script" | "Pitch" | "Trend";
  scriptTitle?: string;
}) {
  const [accepted, setAccepted] = useState(false);
  const [rejected, setRejected] = useState(false);
  void scriptTitle; // used by parent for save title

  if (loading) return (
    <div style={{ background: C.s2, borderRadius: C.r, padding: "20px", display: "flex", alignItems: "center", gap: 10, color: C.t2, fontSize: 13 }}>
      <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Generating…
    </div>
  );
  if (error) return <div style={{ background: "rgba(248,113,113,.08)", border: `1px solid rgba(248,113,113,.2)`, borderRadius: C.r, padding: "12px 14px", color: C.red, fontSize: 12.5 }}>{error}</div>;
  if (!text) return null;

  return (
    <div style={{ background: C.s2, border: `1px solid ${accepted ? C.aBd : rejected ? "rgba(248,113,113,.3)" : C.border}`, borderRadius: C.r, overflow: "hidden" }}>
      {/* Top bar: accept/reject + copy */}
      <div style={{ padding: "6px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {!accepted && !rejected && (
            <>
              <button onClick={() => { setAccepted(true); onAccept?.(text); }}
                style={{ display: "flex", alignItems: "center", gap: 4, background: C.aBg, border: `1px solid ${C.aBd}`, color: C.accent, fontSize: 11.5, padding: "3px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 500 }}>
                ✓ Accept
              </button>
              <button onClick={() => setRejected(true)}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", color: C.red, fontSize: 11.5, padding: "3px 10px", borderRadius: 4, cursor: "pointer" }}>
                ✕ Reject
              </button>
            </>
          )}
          {accepted && <span style={{ fontSize: 11.5, color: C.accent, fontWeight: 500 }}>✓ Saved to Scripts Library</span>}
          {rejected && <span style={{ fontSize: 11.5, color: C.red }}>✕ Rejected</span>}
        </div>
        <CopyBtn text={text} />
      </div>
      <pre style={{ margin: 0, padding: "14px 16px", color: C.cream, fontSize: 12.5, lineHeight: 1.8, fontFamily: "inherit", whiteSpace: "pre-wrap", maxHeight: 380, overflowY: "auto" }}>{text}</pre>
    </div>
  );
}

function ContentPlannerAgent({ prefill, onSave }: { prefill: string; onSave: (content: string, type: "Content Plan" | "Script" | "Pitch") => void }) {
  const [industry, setIndustry] = useState(prefill || "Real Estate");
  const [focus, setFocus]       = useState("");
  const [out, setOut]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const inp: React.CSSProperties = { background: C.s2, border: `1px solid ${C.borderHi}`, color: C.cream, fontSize: 13, padding: "8px 12px", borderRadius: C.r2, outline: "none", width: "100%" };

  useEffect(() => { if (prefill) setIndustry(prefill); }, [prefill]);

  async function run() {
    setLoading(true); setErr(""); setOut("");
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: SYS_PLANNER, userMessage: `Industry/vertical: ${industry}\nWeek focus / theme: ${focus || "general WhatsApp AI automation"}`, maxTokens: 1200 }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.usage) trackTokens(data.usage);
      setOut(data.content as string);
    }
    catch (e: unknown) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <AgentCard title="Content Planner" description="Industry or theme → 3 post ideas for IG + XHS" icon={Sparkles}>
      <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Industry (e.g. Real Estate, Clinic, F&B)" style={inp} />
      <input value={focus} onChange={e => setFocus(e.target.value)} placeholder="Week focus or trend (optional)" style={inp} />
      <Btn accent full onClick={run} disabled={loading || !industry.trim()}><Send size={13} /> Generate 3 posts</Btn>
      <OutputPanel text={out} loading={loading} error={err}
        onAccept={(c) => onSave(c, "Content Plan")}
        scriptType="Content Plan"
        scriptTitle={`Content Plan — ${industry}`}
      />
    </AgentCard>
  );
}

function ScriptWriterAgent({ onSave }: { onSave: (content: string, type: "Content Plan" | "Script" | "Pitch") => void }) {
  const [topic, setTopic]     = useState("");
  const [platform, setPlat]   = useState<PostPlat>("instagram");
  const [type, setType]       = useState<PostType>("Reel");
  const [out, setOut]         = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const inp: React.CSSProperties = { background: C.s2, border: `1px solid ${C.borderHi}`, color: C.cream, fontSize: 13, padding: "8px 12px", borderRadius: C.r2, outline: "none", width: "100%" };
  const sel: React.CSSProperties = { ...inp };

  async function run() {
    setLoading(true); setErr(""); setOut("");
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: SYS_SCRIPT, userMessage: `Topic: ${topic}\nPlatform: ${platform}\nContent type: ${type}`, maxTokens: 1200 }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.usage) trackTokens(data.usage);
      setOut(data.content as string);
    }
    catch (e: unknown) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <AgentCard title="Script Writer" description="Topic + format → full caption or Reel script" icon={MessageSquare}>
      <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Post topic (e.g. Why property agents lose leads after 9pm)" style={inp} />
      <div style={{ display: "flex", gap: 8 }}>
        <select value={platform} onChange={e => setPlat(e.target.value as PostPlat)} style={{ ...sel, flex: 1 }}>
          <option value="instagram">Instagram</option><option value="xiaohongshu">Xiaohongshu</option>
        </select>
        <select value={type} onChange={e => setType(e.target.value as PostType)} style={{ ...sel, flex: 1 }}>
          {["Reel","Carousel","Static","XHS Post"].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <Btn accent full onClick={run} disabled={loading || !topic.trim()}><Send size={13} /> Write script</Btn>
      <OutputPanel text={out} loading={loading} error={err}
        onAccept={(c) => onSave(c, "Script")}
        scriptType="Script"
        scriptTitle={`${type} — ${topic}`}
      />
    </AgentCard>
  );
}

function ConsultingAgent({ onSave }: { onSave: (content: string, type: "Content Plan" | "Script" | "Pitch") => void }) {
  const [client, setClient]   = useState("");
  const [problem, setProblem] = useState("");
  const [out, setOut]         = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const inp: React.CSSProperties = { background: C.s2, border: `1px solid ${C.borderHi}`, color: C.cream, fontSize: 13, padding: "8px 12px", borderRadius: C.r2, outline: "none", width: "100%" };

  async function run() {
    setLoading(true); setErr(""); setOut("");
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: SYS_CONSULT, userMessage: `Client name: ${client}\nBusiness problem: ${problem}`, maxTokens: 1200 }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.usage) trackTokens(data.usage);
      setOut(data.content as string);
    }
    catch (e: unknown) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <AgentCard title="Consulting Assistant" description="Client + problem → structured pitch + opening message" icon={BarChart3}>
      <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client name (e.g. The Great Haus Sdn Bhd)" style={inp} />
      <textarea value={problem} onChange={e => setProblem(e.target.value)} placeholder="Describe their business problem (e.g. They receive 50+ WhatsApp enquiries daily but miss 40% after 8pm…)" rows={3} style={{ ...inp, resize: "vertical" as const, fontFamily: "inherit" }} />
      <Btn accent full onClick={run} disabled={loading || !client.trim() || !problem.trim()}><Send size={13} /> Generate pitch</Btn>
      <OutputPanel text={out} loading={loading} error={err}
        onAccept={(c) => onSave(c, "Pitch")}
        scriptType="Pitch"
        scriptTitle={`Pitch — ${client}`}
      />
    </AgentCard>
  );
}

function AgentsSection({ plannerPrefill, onSave }: { plannerPrefill: string; onSave: (content: string, type: SavedScript["type"], platform?: string) => void }) {
  return (
    <div>
      <div style={{ background: C.s, border: `1px solid ${C.aBd}`, borderRadius: C.r, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <Zap size={13} color={C.accent} />
        <span style={{ fontSize: 12.5, color: C.t2 }}>Calls <strong style={{ color: C.text }}>claude-sonnet-4-5</strong> via your Anthropic API key — add it in Settings if you haven't already</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: 12 }}>
        <ContentPlannerAgent prefill={plannerPrefill} onSave={(c, t) => onSave(c, t)} />
        <ScriptWriterAgent onSave={(c, t) => onSave(c, t)} />
        <ConsultingAgent onSave={(c, t) => onSave(c, t)} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — TREND TRACKER
// ─────────────────────────────────────────────────────────────────────────────
function TrendCard({ trend, onUse }: { trend: Trend; onUse: () => void }) {
  const ts = TCAT_S[trend.category];
  return (
    <div style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Chip label={trend.category} bg={ts.bg} color={ts.color} />
        <TrendingUp size={13} color={C.t3} />
      </div>
      <p style={{ fontSize: 13.5, fontWeight: 600, color: C.text, margin: 0, lineHeight: 1.4 }}>{trend.title}</p>
      <p style={{ fontSize: 12.5, color: C.t2, margin: 0, lineHeight: 1.65 }}>{trend.description}</p>
      <div style={{ background: C.aBg, border: `1px solid ${C.aBd}`, borderRadius: C.r2, padding: "8px 10px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.accent, margin: "0 0 3px" }}>For Flogen AI</p>
        <p style={{ fontSize: 12, color: C.cream, margin: 0, lineHeight: 1.5 }}>{trend.relevance}</p>
      </div>
      <button onClick={onUse}
        style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 12, padding: "6px 12px", borderRadius: C.r2, cursor: "pointer", transition: "all .12s", marginTop: "auto" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.aBd; (e.currentTarget as HTMLElement).style.color = C.accent; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHi; (e.currentTarget as HTMLElement).style.color = C.t2; }}>
        Use in Content Planner <ArrowRight size={12} />
      </button>
    </div>
  );
}

function TrendsSection({ onUseTrend }: { onUseTrend: (title: string) => void }) {
  const [trends, setTrends]   = useState<Trend[]>(INIT_TRENDS);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  async function refresh() {
    setLoading(true); setErr("");
    try {
      const raw = await callAgent(SYS_TRENDS, "Generate 6 fresh trend cards for Flogen AI as of early 2026.", 1400);
      const jsonStr = raw.replace(/```json\n?|\n?```/g, "").trim();
      const parsed: { title: string; category: TrendCat; description: string; relevance: string }[] = JSON.parse(jsonStr);
      setTrends(parsed.map((t, i) => ({ ...t, id: uid() + i })));
    } catch (e: unknown) {
      setErr("Refresh failed — check your Anthropic API key in Settings. Using cached trends.");
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <p style={{ fontSize: 12.5, color: C.t2, margin: 0 }}>What's trending in AI automation, WhatsApp marketing, and Malaysian SME content</p>
        <Btn onClick={refresh} disabled={loading}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Refreshing…" : "Refresh Trends"}
        </Btn>
      </div>
      {err && <div style={{ background: "rgba(248,113,113,.08)", border: `1px solid rgba(248,113,113,.2)`, borderRadius: C.r, padding: "10px 14px", color: C.red, fontSize: 12.5, marginBottom: 16 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
        {trends.map(t => <TrendCard key={t.id} trend={t} onUse={() => onUseTrend(t.title)} />)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — SCRIPTS LIBRARY
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  "Content Plan": C.blue,
  "Script":       C.accent,
  "Pitch":        C.orange,
  "Trend":        C.purple,
};

function ScriptsLibrary({ scripts, onDelete }: { scripts: SavedScript[]; onDelete: (id: number) => void }) {
  if (scripts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: C.t3 }}>
        <Archive size={32} style={{ margin: "0 auto 12px", display: "block" }} color={C.t3} />
        <p style={{ margin: "0 0 8px", color: C.t2, fontSize: 14 }}>No saved scripts yet.</p>
        <p style={{ fontSize: 12.5, color: C.t3 }}>Accept generated content in the Agents tab to save it here.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 12.5, color: C.t2, margin: 0 }}>{scripts.length} saved {scripts.length === 1 ? "script" : "scripts"} — accepted from AI agents</p>
      {scripts.map(s => (
        <div key={s.id} style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, background: `${TYPE_COLOR[s.type] || C.t2}18`, color: TYPE_COLOR[s.type] || C.t2, padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>{s.type}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.title}</span>
              {s.platform && <span style={{ fontSize: 11, color: C.t3 }}>· {s.platform}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: C.t3 }}>{new Date(s.savedAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</span>
              <button onClick={() => onDelete(s.id)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", padding: "2px", display: "flex" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.red; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.t3; }}>
                <X size={13} />
              </button>
            </div>
          </div>
          <pre style={{ margin: 0, padding: "14px 16px", color: C.cream, fontSize: 12, lineHeight: 1.8, fontFamily: "inherit", whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>{s.content}</pre>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "kanban",   label: "Kanban",          Icon: Target       },
  { id: "pipeline", label: "Pipeline",        Icon: BarChart3     },
  { id: "calendar", label: "Calendar",        Icon: CalendarDays  },
  { id: "agents",   label: "Agents",          Icon: Sparkles      },
  { id: "trends",   label: "Trends",          Icon: TrendingUp    },
  { id: "scripts",  label: "Scripts Library", Icon: Archive       },
];

export function OperationsDashboard() {
  const [tab, setTab]               = useState<Tab>("kanban");
  const [plannerPrefill, setPrefill] = useState("");
  const [saved, setSaved] = useLocal<SavedScript[]>("flogen_saved_scripts", []);

  function useTrend(title: string) { setPrefill(title); setTab("agents"); }

  function handleSave(content: string, type: SavedScript["type"], platform?: string) {
    const title = content.split("\n")[0].replace(/^#+\s*/, "").slice(0, 60) || type;
    setSaved(prev => [{ id: uid(), title, content, type, platform, savedAt: new Date().toISOString() }, ...prev]);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        .fop-root * { box-sizing: border-box; font-family: 'Inter',-apple-system,BlinkMacSystemFont,sans-serif; }
        .fop-root ::-webkit-scrollbar { width: 4px; height: 4px; }
        .fop-root ::-webkit-scrollbar-track { background: transparent; }
        .fop-root ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 99px; }
        .fop-root ::-webkit-scrollbar-thumb:hover { background: rgba(187,240,136,.3); }
        .fop-root select option { background: #1f1f1f; }
      `}</style>

      <div className="fop-root" style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
        {/* Top bar */}
        <div style={{ background: C.s, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: C.accent, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={15} color="#0a0a0a" strokeWidth={2.5} />
            </div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>Flogen AI</span>
              <span style={{ fontSize: 12, color: C.t2, marginLeft: 8 }}>Operating Dashboard</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: C.t2 }}>{new Date().toLocaleDateString("en-MY",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.aBg, border: `1px solid ${C.aBd}`, padding: "4px 10px", borderRadius: 99 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, display: "inline-block", animation: "pulse 1.8s ease-in-out infinite" }} />
              <span style={{ fontSize: 11, color: C.accent, fontWeight: 500 }}>Claude Code: Active</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: C.s, borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", gap: 2 }}>
          {TABS.map(({ id, label, Icon }) => {
            const on = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)}
                style={{ background: "transparent", border: "none", borderBottom: `2px solid ${on ? C.accent : "transparent"}`, color: on ? C.text : C.t2, fontSize: 13, fontWeight: on ? 600 : 400, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all .15s", marginBottom: -1 }}>
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ padding: "28px 28px 60px", maxWidth: 1400, margin: "0 auto" }}>
          {tab === "kanban"   && <KanbanSection />}
          {tab === "pipeline" && <PipelineSection />}
          {tab === "calendar" && <CalendarSection onPlannerPrefill={setPrefill} />}
          {tab === "agents"   && <AgentsSection plannerPrefill={plannerPrefill} onSave={handleSave} />}
          {tab === "trends"   && <TrendsSection onUseTrend={useTrend} />}
          {tab === "scripts"  && <ScriptsLibrary scripts={saved} onDelete={(id) => setSaved(prev => prev.filter(s => s.id !== id))} />}
        </div>
      </div>
    </>
  );
}
