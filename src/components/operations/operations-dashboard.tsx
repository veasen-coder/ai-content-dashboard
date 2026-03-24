"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, X, Trash2, Loader2, RefreshCw, Copy, CheckCheck,
  Zap, TrendingUp, CalendarDays, Users, Target, Sparkles,
  MessageSquare, Send, ArrowRight, GripVertical, Check, Search,
  ChevronLeft, ChevronRight, Instagram, BarChart3, Hash, Archive, Bell, Keyboard,
} from "lucide-react";
import { useRouter as useNextRouter } from "next/navigation";

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
type KPriority   = "high" | "medium" | "low";
type PStage      = "lead" | "contacted" | "demo" | "negotiation" | "closed";
type LeadSource  = "IG DM" | "WhatsApp" | "Cold List" | "Referral" | "Other";
type PostPlat    = "instagram" | "xiaohongshu";
type PostType    = "Reel" | "Carousel" | "Static" | "XHS Post" | "Story";
type PostStatus  = "Draft" | "Scheduled" | "Posted";
type PostPillar  = "Pain Point" | "Proof/Social" | "Education" | "Brand" | "Promotion";
type PlatFilter  = "all" | "instagram" | "xiaohongshu" | "both";
type TrendCat    = "AI" | "WhatsApp" | "SME" | "Social";

interface KCard  { id: number; title: string; tag: KTag; }
interface Deal   { id: number; name: string; industry: string; stage: PStage; lastContact: string | null; value: string; nextAction: string; probability?: number; source?: LeadSource; }
type OutreachEntry = { id: number; date: string; note: string };
interface CalPost{ id: number; date: string; platform: PostPlat; type: PostType; topic: string; caption: string; status: PostStatus; pillar?: PostPillar; }
interface Trend  { id: number; title: string; category: TrendCat; description: string; relevance: string; }
type ScriptType = "Content Plan" | "Script" | "Pitch" | "Trend" | "Caption" | "Reel Script" | "DM Template" | "Other";
interface SavedScript {
  id: number;
  title: string;
  content: string;
  type: ScriptType;
  savedAt: string;
  platform?: string;
}

// 7D: Starter templates — seeded on first load (when localStorage is empty)
const SCRIPT_SEEDS: SavedScript[] = [
  {
    id: 1,
    title: "Hair Salon Cold DM",
    type: "DM Template",
    platform: "WhatsApp",
    savedAt: new Date("2026-03-20").toISOString(),
    content: `Hey [Name]! 👋

Quick question — how often do your stylists miss WhatsApp messages when they're mid-appointment?

Most salons we talk to lose 3–5 bookings a week just from slow replies after hours.

Curious — is that something you'd want to fix? 😊`,
  },
  {
    id: 2,
    title: "Property Agent Losing Leads After Hours",
    type: "Reel Script",
    platform: "Instagram",
    savedAt: new Date("2026-03-21").toISOString(),
    content: `[Hook — 0-3s]
"This property agent was losing leads every night at 9pm. Here's what changed."

[Problem — 3-10s]
Visual: phone screen filling with unread messages.
"Most Malaysian property agents reply to leads the next morning. By then? They've already booked a viewing with someone else."

[Solution — 10-20s]
"We built them a WhatsApp AI Agent that replies in under 30 seconds. 24/7. No extra staff needed."

[Result — 20-27s]
"First month: 3× more qualified viewings. Zero missed leads after 9pm."

[CTA — 27-30s]
"Want this for your agency? Link in bio."`,
  },
  {
    id: 3,
    title: "Chatbot vs AI Agent",
    type: "Caption",
    platform: "Instagram",
    savedAt: new Date("2026-03-22").toISOString(),
    content: `🤖 Chatbot vs AI Agent — what's the actual difference?

Most people think they're the same thing. They're not.

A chatbot follows a script.
An AI Agent thinks.

Here's what that means for your business 👇

Chatbot:
❌ "Press 1 for booking, press 2 for price"
❌ Breaks when customer goes off-script
❌ Frustrates people

AI Agent:
✅ Understands natural language
✅ Handles any question, books appointments, qualifies leads
✅ Feels like talking to a real person — at 3am

The difference? One saves you time.
The other saves you time AND converts leads.

Which one does your business need? Drop a comment 👇

#WhatsAppAI #AIAgent #MalaysianBusiness #FlogenAI #BusinessAutomation`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
let _uid = 500;
const uid = () => ++_uid;

function useLocal<T>(key: string, init: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [st, setSt] = useState<T>(init);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setSt(JSON.parse(raw) as T);
    } catch { /* ignore */ }
  }, [key]);
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setSt(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
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
  { id: 4, name: "Makan House PJ",               industry: "F&B",          stage: "closed",      lastContact: "2026-03-15", value: "RM 399/mo",            nextAction: "Monthly check-in — confirm bot performance & upsell Growth plan", probability: 100, source: "Referral"   },
  { id: 1, name: "The Great Haus Sdn Bhd",       industry: "Real Estate",  stage: "negotiation", lastContact: "2026-03-20", value: "RM 399–899/mo",       nextAction: "Follow up post-pilot — confirm package tier & sign-off",          probability: 75,  source: "IG DM"      },
  { id: 2, name: "Devin (Property Agent Leader)", industry: "Real Estate",  stage: "lead",        lastContact: null,         value: "TBD",                 nextAction: "Curiosity-first WhatsApp outreach — no pitch yet, ask questions", probability: 10,  source: "WhatsApp"   },
  { id: 3, name: "Beauty & Wellness Cold List",   industry: "Hair & Beauty",stage: "lead",        lastContact: null,         value: "RM 399/mo × 61 leads",nextAction: "Start with top 5 Klang Valley hair salons — personalised DMs",  probability: 10,  source: "Cold List"  },
];

const INIT_POSTS: CalPost[] = [
  { id: 1, date: isoDate(WEEK0[0]), platform: "instagram",    type: "Reel",     topic: "Property agents losing leads after hours",  caption: "🏠 Every missed WhatsApp at 11pm is a lost listing. Here's how Flogen AI keeps you closing — even when you're asleep.", status: "Draft",     pillar: "Pain Point"   },
  { id: 2, date: isoDate(WEEK0[2]), platform: "instagram",    type: "Carousel", topic: "3 WhatsApp automations that save 4hrs/week", caption: "You don't need to reply to every 'hi' manually. Swipe to see the 3 flows we build for every SME client →",           status: "Scheduled", pillar: "Education"    },
  { id: 3, date: isoDate(WEEK0[4]), platform: "xiaohongshu",  type: "XHS Post", topic: "AI助理帮你管WhatsApp客户",                  caption: "很多中小企业老板每天花2-3小时回复WhatsApp。用AI助理，这些时间可以用来做更重要的事 💚",                              status: "Draft",     pillar: "Education"    },
  { id: 4, date: isoDate(WEEK0[5]), platform: "instagram",    type: "Static",   topic: "Brand story — why Flogen AI exists",        caption: "We started Flogen AI because Malaysian SME owners were drowning in WhatsApp messages. There's a better way. 🇲🇾",       status: "Draft",     pillar: "Brand"        },
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
const LEAD_SOURCES: LeadSource[] = ["IG DM", "WhatsApp", "Cold List", "Referral", "Other"];
const SOURCE_COLOR: Record<LeadSource, string> = { "IG DM": C.orange, "WhatsApp": "#25d366", "Cold List": C.blue, "Referral": C.accent, "Other": C.t2 };
const STAGE_ORDER: PStage[] = ["lead","contacted","demo","negotiation","closed"];
const STAGE_LABEL: Record<PStage, string> = { lead: "Lead", contacted: "Contacted", demo: "Demo Sent", negotiation: "Negotiation", closed: "Closed" };
const STAGE_COLOR: Record<PStage, string> = { lead: C.t2, contacted: C.blue, demo: C.purple, negotiation: C.yellow, closed: C.accent };
const STAGE_PROB:  Record<PStage, number>  = { lead: 10, contacted: 25, demo: 50, negotiation: 75, closed: 100 };
const INDUSTRY_COLOR: Record<string, string> = { "Real Estate": C.blue, "Hair & Beauty": C.purple, "F&B": C.orange, "Clinic": C.red, "Retail": C.yellow };
const STATUS_S: Record<PostStatus, { bg: string; color: string }> = {
  Draft:     { bg: "rgba(74,74,74,.3)",         color: C.t2     },
  Scheduled: { bg: "rgba(251,191,36,.1)",        color: C.yellow },
  Posted:    { bg: "rgba(187,240,136,.1)",       color: C.accent },
};
const PILLAR_META: Record<PostPillar, { color: string }> = {
  "Pain Point":   { color: C.red    },
  "Proof/Social": { color: C.accent },
  "Education":    { color: C.blue   },
  "Brand":        { color: C.purple },
  "Promotion":    { color: C.orange },
};
const PILLARS: PostPillar[] = ["Pain Point", "Proof/Social", "Education", "Brand", "Promotion"];

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

const SYS_OUTREACH = `You are writing a cold WhatsApp outreach message for Flogen AI, a Malaysian B2B AI automation agency selling WhatsApp AI Agents to SMEs. Write a 2–3 sentence curiosity-first opening DM. Do not pitch. Ask one specific question about missed WhatsApp messages or slow reply times. Tone: conversational, local Malaysian English, no jargon.`;

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
const PRIORITY_DEFAULTS: Record<number, KPriority> = { 1: "high", 5: "high", 7: "high" };
const PIPELINE_LINKS: Record<number, { dealId: number; label: string }> = {
  1: { dealId: 1, label: "The Great Haus" },
};
const PRIORITY_META: Record<KPriority, { label: string; color: string; emoji: string }> = {
  high:   { label: "High",   color: C.red,     emoji: "🔴" },
  medium: { label: "Medium", color: C.yellow,  emoji: "🟡" },
  low:    { label: "Low",    color: "#4ade80",  emoji: "🟢" },
};

function dueDateColor(iso: string | undefined): string | null {
  if (!iso) return null;
  const days = Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return C.red;
  if (days <= 2) return C.yellow;
  return C.t2;
}

// ── Task Detail Slide-Over ──
function TaskSlideOver({ card, col, priority, dueDate, notes, pipelineLink, onClose, onEdit, onSetPriority, onSetDueDate, onSetNotes, onGoToPipeline }: {
  card: KCard; col: KCol; priority: KPriority; dueDate?: string; notes: string;
  pipelineLink?: { dealId: number; label: string };
  onClose: () => void; onEdit: (f: Partial<KCard>) => void;
  onSetPriority: (p: KPriority) => void; onSetDueDate: (d: string | null) => void;
  onSetNotes: (n: string) => void; onGoToPipeline?: (dealId: number) => void;
}) {
  const t = TAG_S[card.tag];
  const pm = PRIORITY_META[priority];
  const ddColor = dueDate ? dueDateColor(dueDate) : null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)", zIndex: 40 }} />
      <div className="fop-slide-over" style={{ position: "fixed", top: 0, right: 0, width: 400, height: "100vh", background: C.s, borderLeft: `1px solid ${C.borderHi}`, zIndex: 50, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <input value={card.title} onChange={e => onEdit({ title: e.target.value })}
              style={{ fontSize: 15, fontWeight: 700, color: C.text, background: "transparent", border: "none", outline: "none", width: "100%", textDecoration: col === "done" ? "line-through" : "none", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <Chip label={card.tag} bg={t.bg} color={t.color} />
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: `${pm.color}18`, color: pm.color }}>{pm.emoji} {pm.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.t2, cursor: "pointer", padding: 4, display: "flex", borderRadius: C.r2, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.t2)}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          <div>
            <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Label</label>
            <select value={card.tag} onChange={e => onEdit({ tag: e.target.value as KTag })}
              style={{ background: C.s2, border: `1px solid ${C.border}`, color: C.text, fontSize: 12.5, padding: "6px 10px", borderRadius: C.r2, outline: "none", width: "100%" }}>
              {(["Flogen AI","JCI","Personal"] as KTag[]).map(tg => <option key={tg} value={tg}>{tg}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Priority</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["high","medium","low"] as KPriority[]).map(p => {
                const m = PRIORITY_META[p]; const active = priority === p;
                return (
                  <button key={p} onClick={() => onSetPriority(p)}
                    style={{ flex: 1, background: active ? `${m.color}18` : C.s2, border: `1px solid ${active ? m.color : C.border}`, color: active ? m.color : C.t2, fontSize: 11.5, padding: "5px 0", borderRadius: C.r2, cursor: "pointer", fontFamily: "inherit" }}>
                    {m.emoji} {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Due Date</label>
            <input type="date" value={dueDate ?? ""} onChange={e => onSetDueDate(e.target.value || null)}
              style={{ background: C.s2, border: `1px solid ${C.border}`, color: ddColor ?? C.text, fontSize: 12.5, padding: "6px 10px", borderRadius: C.r2, outline: "none", width: "100%", colorScheme: "dark", boxSizing: "border-box" }} />
          </div>
          {pipelineLink && (
            <div>
              <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Linked Deal</label>
              <button onClick={() => { onGoToPipeline?.(pipelineLink.dealId); onClose(); }}
                style={{ display: "flex", alignItems: "center", gap: 6, background: C.aBg, border: `1px solid ${C.aBd}`, color: C.accent, fontSize: 12.5, padding: "6px 12px", borderRadius: C.r2, cursor: "pointer", fontFamily: "inherit" }}>
                <ArrowRight size={12} /> {pipelineLink.label}
              </button>
            </div>
          )}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>
              Notes <span style={{ fontSize: 10, color: C.t3, textTransform: "none", letterSpacing: 0 }}>(auto-saved)</span>
            </label>
            <textarea value={notes} onChange={e => onSetNotes(e.target.value)} placeholder="Add task notes…"
              style={{ flex: 1, minHeight: 120, fontSize: 12.5, color: C.text, background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r2, padding: "8px 10px", resize: "vertical", lineHeight: 1.55, fontFamily: "inherit", boxSizing: "border-box", width: "100%" }} />
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={onClose}
            style={{ width: "100%", background: C.s2, border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 13, padding: "8px 0", borderRadius: C.r, cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.s3; (e.currentTarget as HTMLElement).style.color = C.text; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.s2; (e.currentTarget as HTMLElement).style.color = C.t2; }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function KanbanCard({ card, onDelete, onEdit, col, priority, dueDate, onSetPriority, onSetDueDate, pipelineLink, onOpenDetail }: {
  card: KCard; onDelete: () => void; onEdit: (f: Partial<KCard>) => void; col: KCol;
  priority: KPriority; dueDate?: string;
  onSetPriority: (p: KPriority) => void; onSetDueDate: (d: string | null) => void;
  pipelineLink?: { dealId: number; label: string }; onOpenDetail: () => void;
}) {
  const [hov, setHov] = useState(false);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(card.title);
  const [showDatePick, setShowDatePick] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = TAG_S[card.tag];
  const pm = PRIORITY_META[priority];
  const ddColor = dueDate ? dueDateColor(dueDate) : null;

  function commit() { setEdit(false); if (draft.trim()) onEdit({ title: draft.trim() }); else setDraft(card.title); }
  function handleClick() {
    if (edit) return;
    if (clickTimer.current) return;
    clickTimer.current = setTimeout(() => { clickTimer.current = null; onOpenDetail(); }, 200);
  }
  function handleDblClick() {
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
    setEdit(true);
  }

  return (
    <div
      draggable onDragStart={e => { e.dataTransfer.setData("cardId", String(card.id)); e.dataTransfer.setData("fromCol", col); e.dataTransfer.effectAllowed = "move"; }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={handleClick} onDoubleClick={handleDblClick}
      title={edit ? undefined : "Double-click to edit"}
      className="fop-kcard"
      style={{ background: hov ? C.s3 : C.s2, borderTop: `1px solid ${hov ? C.borderHi : C.border}`, borderRight: `1px solid ${hov ? C.borderHi : C.border}`, borderBottom: `1px solid ${hov ? C.borderHi : C.border}`, borderLeft: priority === "high" ? `3px solid ${C.red}` : `1px solid ${hov ? C.borderHi : C.border}`, borderRadius: C.r, padding: "10px 12px", cursor: "pointer", transition: "all .12s", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {edit ? (
            <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
              onClick={e => e.stopPropagation()}
              onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(card.title); setEdit(false); } }}
              style={{ background: "transparent", border: "none", outline: `2px solid ${C.aBd}`, borderRadius: 4, color: C.text, fontSize: 13, width: "100%", padding: "1px 4px" }} />
          ) : (
            <p className="fop-kcard-title" style={{ fontSize: 13, color: col === "done" ? C.t3 : C.text, textDecoration: col === "done" ? "line-through" : "none", margin: 0, lineHeight: 1.5 }}>{card.title}</p>
          )}
          {/* Meta: tag + priority */}
          <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            <Chip label={card.tag} bg={t.bg} color={t.color} />
            <select value={priority} onClick={e => e.stopPropagation()}
              onChange={e => { e.stopPropagation(); onSetPriority(e.target.value as KPriority); }}
              style={{ background: `${pm.color}12`, border: `1px solid ${pm.color}30`, color: pm.color, fontSize: 10.5, padding: "1px 5px", borderRadius: 4, outline: "none", cursor: "pointer" }}>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Med</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
          {/* Due date */}
          <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={e => { e.stopPropagation(); setShowDatePick(v => !v); }}
              style={{ background: "none", border: "none", color: ddColor ?? C.t3, cursor: "pointer", padding: "1px 2px", display: "flex", alignItems: "center", gap: 3 }}>
              <CalendarDays size={11} />
              <span style={{ fontSize: 11, color: ddColor ?? C.t3 }}>{dueDate ?? "Due"}</span>
            </button>
          </div>
          {showDatePick && (
            <div onClick={e => e.stopPropagation()} style={{ marginTop: 4 }}>
              <input type="date" defaultValue={dueDate ?? ""}
                onChange={e => { onSetDueDate(e.target.value || null); setShowDatePick(false); }}
                style={{ fontSize: 11.5, background: C.s3, border: `1px solid ${C.borderHi}`, borderRadius: C.r2, color: C.text, padding: "3px 6px", width: "100%", colorScheme: "dark", boxSizing: "border-box" }} />
            </div>
          )}
          {/* Pipeline link */}
          {pipelineLink && (
            <div onClick={e => e.stopPropagation()} style={{ marginTop: 5 }}>
              <span style={{ fontSize: 10.5, color: C.accent, background: C.aBg, border: `1px solid ${C.aBd}`, padding: "1px 7px", borderRadius: 4 }}>→ {pipelineLink.label}</span>
            </div>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ opacity: hov ? 1 : 0, transition: "opacity .12s", background: "none", border: "none", color: C.t3, cursor: "pointer", padding: "2px 3px", display: "flex", flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = C.red)} onMouseLeave={e => (e.currentTarget.style.color = C.t3)}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function AddKCard({ onAdd }: { onAdd: (t: string, tag: KTag) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [tag, setTag]   = useState<KTag>("Flogen AI");
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
          {(["Flogen AI","JCI","Personal"] as KTag[]).map(tg => <option key={tg} value={tg}>{tg}</option>)}
        </select>
        <Btn accent small onClick={() => {}}>Add</Btn>
        <Btn small onClick={() => setOpen(false)}>Cancel</Btn>
      </div>
    </form>
  );
}

// ── Week In Review ────────────────────────────────────────────────────────────
function WeekInReview({ board }: { board: Record<KCol, KCard[]> }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const isFriday = today.getDay() === 5;
  const weekIsos = new Set(getWeekDates(0).map(isoDate));

  const stats = (() => {
    try {
      const deals: Deal[]    = JSON.parse(localStorage.getItem("flogen_pipeline") || "null") ?? INIT_DEALS;
      const posts: CalPost[] = JSON.parse(localStorage.getItem("flogen_calendar") || "null") ?? INIT_POSTS;
      const leadsContacted   = deals.filter(d => d.lastContact && weekIsos.has(d.lastContact)).length;
      const postsPublished   = posts.filter(p => weekIsos.has(p.date) && p.status === "Posted").length;
      const dealsInNegotiation = deals.filter(d => d.stage === "negotiation").length;
      const tasksDone        = board.done.length;
      return { leadsContacted, postsPublished, dealsInNegotiation, tasksDone };
    } catch {
      return { leadsContacted: 0, postsPublished: 0, dealsInNegotiation: 0, tasksDone: 0 };
    }
  })();

  const weekLabel = (() => {
    const dates = getWeekDates(0);
    return `${dates[0].toLocaleDateString("en-MY",{month:"short",day:"numeric"})} – ${dates[6].toLocaleDateString("en-MY",{month:"short",day:"numeric",year:"numeric"})}`;
  })();

  return (
    <div style={{ background: isFriday ? "rgba(187,240,136,.05)" : C.s, border: `1px solid ${isFriday ? C.aBd : C.border}`, borderRadius: C.r, marginTop: 14, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer", color: C.text }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart3 size={13} color={isFriday ? C.accent : C.t2} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: isFriday ? C.accent : C.text }}>Week in Review</span>
          <span style={{ fontSize: 11, color: C.t3 }}>{weekLabel}</span>
          {isFriday && <span style={{ fontSize: 10, background: C.aBg, border: `1px solid ${C.aBd}`, color: C.accent, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>Friday wrap-up</span>}
        </div>
        {open ? <ChevronLeft size={13} color={C.t3} style={{ transform: "rotate(-90deg)" }} /> : <ChevronRight size={13} color={C.t3} style={{ transform: "rotate(90deg)" }} />}
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginTop: 12 }}>
            {[
              { label: "Posts published",       value: stats.postsPublished,     color: C.accent, goal: 2 },
              { label: "Leads contacted",        value: stats.leadsContacted,     color: C.blue,   goal: 3 },
              { label: "Deals in negotiation",   value: stats.dealsInNegotiation, color: C.yellow, goal: null },
              { label: "Tasks completed",        value: stats.tasksDone,          color: C.purple, goal: null },
            ].map(s => (
              <div key={s.label} style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r2, padding: "10px 12px" }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0, lineHeight: 1 }}>
                  {s.value}{s.goal ? <span style={{ fontSize: 13, color: C.t3, fontWeight: 400 }}>/{s.goal}</span> : ""}
                </p>
                <p style={{ fontSize: 10.5, color: C.t3, margin: "4px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: C.t3, margin: "10px 0 0", fontStyle: "italic" }}>
            Auto-generated · Data from Pipeline & Calendar tabs
          </p>
        </div>
      )}
    </div>
  );
}

function KanbanSection({ onGoToPipeline }: { onGoToPipeline: (dealId: number) => void }) {
  const [board, setBoard]         = useLocal<Record<KCol, KCard[]>>("flogen_kanban", INIT_KANBAN);
  const [priorities, setPriorities] = useLocal<Record<number, KPriority>>("flogen_kanban_priorities", PRIORITY_DEFAULTS);
  const [duedates, setDuedates]   = useLocal<Record<number, string>>("flogen_kanban_duedates", {});
  const [kanbanNotes, setKanbanNotes] = useLocal<Record<number, string>>("flogen_kanban_notes", {});
  const [dragOver, setDragOver]   = useState<KCol | null>(null);
  const [selected, setSelected]   = useState<{ card: KCard; col: KCol } | null>(null);
  // 9A: Daily briefing
  const [briefingOpen, setBriefingOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    try { return localStorage.getItem("flogen_kanban_briefing_dismissed") !== new Date().toISOString().slice(0, 10); }
    catch { return true; }
  });
  const [briefingData] = useState(() => {
    try {
      const deals: Deal[] = JSON.parse(localStorage.getItem("flogen_pipeline") || "null") ?? INIT_DEALS;
      const posts: CalPost[] = JSON.parse(localStorage.getItem("flogen_calendar") || "null") ?? INIT_POSTS;
      let stalledDeal: Deal | null = null;
      let maxDays = 0;
      for (const d of deals) {
        if (d.lastContact) {
          const days = Math.floor((Date.now() - new Date(d.lastContact).getTime()) / 86_400_000);
          if (days > maxDays) { maxDays = days; stalledDeal = d; }
        }
      }
      const weekDates = new Set(getWeekDates(0).map(isoDate));
      const scheduledThisWeek = posts.filter(p => weekDates.has(p.date)).length;
      return { stalledDeal, stalledDays: maxDays, scheduledThisWeek };
    } catch { return { stalledDeal: null as Deal | null, stalledDays: 0, scheduledThisWeek: 0 }; }
  });
  const greet = (() => { const h = new Date().getHours(); return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"; })();
  // 9D: Shortcuts overlay
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useEffect(() => {
    function kbHandler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setShortcutsOpen(true); }
      if (e.key === "Escape") setShortcutsOpen(false);
    }
    window.addEventListener("keydown", kbHandler);
    return () => window.removeEventListener("keydown", kbHandler);
  }, []);

  function moveCard(id: number, from: KCol, to: KCol) {
    if (from === to) return;
    setBoard(prev => {
      const card = prev[from].find(c => c.id === id);
      if (!card) return prev;
      return { ...prev, [from]: prev[from].filter(c => c.id !== id), [to]: [...prev[to], card] };
    });
  }
  function delCard(col: KCol, id: number) { setBoard(prev => ({ ...prev, [col]: prev[col].filter(c => c.id !== id) })); }
  function editCard(col: KCol, id: number, f: Partial<KCard>) { setBoard(prev => ({ ...prev, [col]: prev[col].map(c => c.id === id ? { ...c, ...f } : c) })); }
  function addCard(col: KCol, title: string, tag: KTag) { setBoard(prev => ({ ...prev, [col]: [...prev[col], { id: uid(), title, tag }] })); }

  // Keep slide-over in sync when card title is edited from the board
  const syncedSelected = selected
    ? { card: board[selected.col].find(c => c.id === selected.card.id) ?? selected.card, col: selected.col }
    : null;

  const MAX_TODAY = 5;

  return (
    <div>
      {/* 9A: Daily Briefing */}
      {briefingOpen && (
        <div style={{ background: C.s, border: `1px solid ${C.aBd}`, borderRadius: C.r, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Bell size={14} style={{ color: C.accent, marginTop: 2, flexShrink: 0 }} />
          <p style={{ flex: 1, fontSize: 12.5, color: C.text, margin: 0, lineHeight: 1.65 }}>
            <span style={{ color: C.accent, fontWeight: 600 }}>Good {greet}.</span>{" "}
            Today is {new Date().toLocaleDateString("en-MY", { weekday: "long", month: "long", day: "numeric" })}.{" "}
            You have <strong style={{ color: C.accent }}>{board.today.length}</strong> task{board.today.length !== 1 ? "s" : ""} in Today.{" "}
            {briefingData.stalledDeal && <>
              <strong>{briefingData.stalledDeal.name.length > 22 ? briefingData.stalledDeal.name.slice(0, 22) + "…" : briefingData.stalledDeal.name}</strong>{" "}
              has been in {STAGE_LABEL[briefingData.stalledDeal.stage]} for{" "}
              <strong style={{ color: C.yellow }}>{briefingData.stalledDays}d</strong> — follow up today.{" "}
            </>}
            You have{" "}
            <strong style={{ color: briefingData.scheduledThisWeek < 2 ? C.red : C.accent }}>{briefingData.scheduledThisWeek}</strong>{" "}
            post{briefingData.scheduledThisWeek !== 1 ? "s" : ""} scheduled this week.
          </p>
          <button
            onClick={() => { setBriefingOpen(false); try { localStorage.setItem("flogen_kanban_briefing_dismissed", new Date().toISOString().slice(0, 10)); } catch {} }}
            title="Dismiss for today"
            style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", padding: "2px 3px", display: "flex", flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = C.t2)}
            onMouseLeave={e => (e.currentTarget.style.color = C.t3)}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* 2D: Weekly Focus Counter */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap", padding: "8px 12px", background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.t2 }}>
            <span style={{ color: C.accent, fontWeight: 700 }}>{board.today.length}</span>
            <span style={{ color: C.t3 }}> Today</span>
          </span>
          <span style={{ color: C.t3, fontSize: 11 }}>·</span>
          <span style={{ fontSize: 12, color: C.t2 }}>
            <span style={{ color: C.yellow, fontWeight: 700 }}>{board.week.length}</span>
            <span style={{ color: C.t3 }}> This Week</span>
          </span>
          <span style={{ color: C.t3, fontSize: 11 }}>·</span>
          <span style={{ fontSize: 12, color: C.t2 }}>
            <span style={{ color: C.blue, fontWeight: 700 }}>{board.backlog.length}</span>
            <span style={{ color: C.t3 }}> Backlog</span>
          </span>
          {board.done.length > 0 && <>
            <span style={{ color: C.t3, fontSize: 11 }}>·</span>
            <span style={{ fontSize: 12, color: C.t3 }}>{board.done.length} Done</span>
          </>}
        </div>
        {/* 9D: Shortcuts button */}
        <button onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (?)"
          style={{ background: "none", border: `1px solid ${C.border}`, color: C.t3, cursor: "pointer", padding: "3px 8px", borderRadius: C.r2, display: "flex", alignItems: "center", gap: 4, fontSize: 11, transition: "all .12s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHi; (e.currentTarget as HTMLElement).style.color = C.t2; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.t3; }}>
          <Keyboard size={11} /> ?
        </button>
      </div>

      <div className="fop-hscroll">
      <div className="fop-kanban-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: C.border, minWidth: 600 }}>
        {(["today","week","backlog","done"] as KCol[]).map(col => {
          const { label, dot } = KCOL_META[col];
          const isDragTarget = dragOver === col;
          return (
            <div key={col}
              onDragOver={e => { e.preventDefault(); setDragOver(col); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => { e.preventDefault(); const id = +e.dataTransfer.getData("cardId"); const from = e.dataTransfer.getData("fromCol") as KCol; moveCard(id, from, col); setDragOver(null); }}
              style={{ background: isDragTarget ? C.s3 : C.bg, minHeight: 480, display: "flex", flexDirection: "column", transition: "background .12s" }}>
              {/* Column header */}
              <div style={{ padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 5, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</span>
                  <span style={{ fontSize: 11, color: C.t3, marginLeft: 2 }}>{board[col].length}</span>
                </div>
                {/* 2D: Progress bar under Today */}
                {col === "today" && (
                  <div style={{ height: 3, background: C.s3, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (board.today.length / MAX_TODAY) * 100)}%`, background: board.today.length >= MAX_TODAY ? C.red : C.accent, borderRadius: 2, transition: "width .3s" }} />
                  </div>
                )}
              </div>
              {/* Cards */}
              <div style={{ flex: 1, padding: "10px 10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                {board[col].map(card => (
                  <KanbanCard key={card.id} card={card} col={col}
                    priority={priorities[card.id] ?? "medium"}
                    dueDate={duedates[card.id]}
                    pipelineLink={PIPELINE_LINKS[card.id]}
                    onDelete={() => delCard(col, card.id)}
                    onEdit={f => editCard(col, card.id, f)}
                    onSetPriority={p => setPriorities(prev => ({ ...prev, [card.id]: p }))}
                    onSetDueDate={d => setDuedates(prev => { if (!d) { const n = { ...prev }; delete n[card.id]; return n; } return { ...prev, [card.id]: d }; })}
                    onOpenDetail={() => setSelected({ card, col })} />
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

      {/* 9D: Keyboard shortcuts overlay */}
      {shortcutsOpen && (
        <>
          <div onClick={() => setShortcutsOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)", zIndex: 50 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: C.s, border: `1px solid ${C.borderHi}`, borderRadius: C.r, width: 360, padding: "20px 24px", zIndex: 60 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Keyboard size={14} style={{ color: C.accent }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Keyboard Shortcuts</span>
              </div>
              <button onClick={() => setShortcutsOpen(false)} style={{ background: "none", border: "none", color: C.t2, cursor: "pointer", display: "flex" }}><X size={15} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {([
                { key: "N",           desc: "Add new card in focused column" },
                { key: "Esc",         desc: "Close modal or slide-over"      },
                { key: "Enter",       desc: "Save card edit"                  },
                { key: "⌘K / Ctrl+K", desc: "Jump to AI Assistant"           },
                { key: "?",           desc: "Open this shortcuts overlay"     },
              ] as { key: string; desc: string }[]).map(({ key, desc }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, color: C.t2 }}>{desc}</span>
                  <kbd style={{ background: C.s2, border: `1px solid ${C.borderHi}`, borderRadius: 4, padding: "2px 8px", fontSize: 11.5, color: C.text, fontFamily: "inherit", whiteSpace: "nowrap" }}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 2E: Task slide-over */}
      {syncedSelected && (
        <TaskSlideOver
          card={syncedSelected.card}
          col={syncedSelected.col}
          priority={priorities[syncedSelected.card.id] ?? "medium"}
          dueDate={duedates[syncedSelected.card.id]}
          notes={kanbanNotes[syncedSelected.card.id] ?? ""}
          pipelineLink={PIPELINE_LINKS[syncedSelected.card.id]}
          onClose={() => setSelected(null)}
          onEdit={f => editCard(syncedSelected.col, syncedSelected.card.id, f)}
          onSetPriority={p => setPriorities(prev => ({ ...prev, [syncedSelected.card.id]: p }))}
          onSetDueDate={d => setDuedates(prev => { if (!d) { const n = { ...prev }; delete n[syncedSelected.card.id]; return n; } return { ...prev, [syncedSelected.card.id]: d }; })}
          onSetNotes={n => setKanbanNotes(prev => ({ ...prev, [syncedSelected.card.id]: n }))}
          onGoToPipeline={onGoToPipeline} />
      )}

      {/* Week in Review */}
      <WeekInReview board={board} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

// ── Revenue Tracker widget ──────────────────────────────────────────────────
function RevenueTracker({ deals }: { deals: Deal[] }) {
  const MRR_GOAL = 1800;
  const closedDeals = deals.filter(d => d.stage === "closed");
  const currentMRR  = closedDeals.reduce((sum, d) => sum + parseRM(d.value), 0);
  const pct         = Math.min(100, Math.round((currentMRR / MRR_GOAL) * 100));
  const remaining   = Math.max(0, MRR_GOAL - currentMRR);

  return (
    <div style={{ background: C.s, border: `1px solid ${currentMRR > 0 ? C.aBd : C.border}`, borderRadius: C.r, padding: "14px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={14} color={C.accent} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Monthly Recurring Revenue</span>
        </div>
        <span style={{ fontSize: 11, color: C.t2 }}>Goal: RM {MRR_GOAL.toLocaleString()}/mo by June 2026</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ lineHeight: 1 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: C.accent }}>RM {currentMRR.toLocaleString()}</span>
          <span style={{ fontSize: 12, color: C.t2 }}>/mo</span>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          {closedDeals.map(d => (
            <span key={d.id} style={{ fontSize: 10.5, background: C.aBg, border: `1px solid ${C.aBd}`, color: C.accent, padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>
              {d.name.split(" ").slice(0, 2).join(" ")} · {d.value}
            </span>
          ))}
          {closedDeals.length === 0 && <span style={{ fontSize: 11.5, color: C.t3 }}>No paying clients yet — close your first deal!</span>}
        </div>
        {remaining > 0 && currentMRR > 0 && (
          <span style={{ fontSize: 11, color: C.t2, marginLeft: "auto" }}>RM {remaining.toLocaleString()} to goal</span>
        )}
      </div>
      {/* Progress bar */}
      <div style={{ height: 6, background: C.s3, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? C.accent : "linear-gradient(90deg, #bbf088, #60efff)", borderRadius: 3, transition: "width .5s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 10.5, color: pct >= 100 ? C.accent : C.t3 }}>{pct}% of goal{pct >= 100 ? " 🎉" : ""}</span>
        <span style={{ fontSize: 10.5, color: C.t3 }}>RM {MRR_GOAL.toLocaleString()}/mo</span>
      </div>
    </div>
  );
}

// ── Client Onboarding Checklist modal ───────────────────────────────────────
const ONBOARDING_STEPS = [
  { label: "Setup WhatsApp number", desc: "Register & verify Business API number" },
  { label: "Build flows",           desc: "Map out conversation flows & responses" },
  { label: "Test bot",              desc: "End-to-end QA with real WhatsApp messages" },
  { label: "Go live",               desc: "Switch bot to production & brief client" },
];

function OnboardingModal({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const [checks, setChecks] = useLocal<Record<string, boolean[]>>("flogen_onboarding_checks", {});
  const key   = String(deal.id);
  const steps = checks[key] ?? new Array(ONBOARDING_STEPS.length).fill(false);
  const done  = steps.filter(Boolean).length;

  function toggle(i: number) {
    const next = [...steps];
    next[i] = !next[i];
    setChecks(prev => ({ ...prev, [key]: next }));
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)", zIndex: 60 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: C.s, border: `1px solid ${C.aBd}`, borderRadius: C.r, width: 420, maxWidth: "90vw", padding: 24, zIndex: 70 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
              <Check size={14} color={C.accent} />
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Client Onboarding</span>
            </div>
            <p style={{ fontSize: 12, color: C.t2, margin: 0 }}>{deal.name} · {done}/{ONBOARDING_STEPS.length} steps complete</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.t2, cursor: "pointer", display: "flex", padding: 2 }}><X size={15} /></button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: C.s3, borderRadius: 2, overflow: "hidden", margin: "12px 0 16px" }}>
          <div style={{ height: "100%", width: `${(done / ONBOARDING_STEPS.length) * 100}%`, background: C.accent, borderRadius: 2, transition: "width .3s" }} />
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ONBOARDING_STEPS.map((step, i) => {
            const checked = steps[i] ?? false;
            return (
              <button key={i} onClick={() => toggle(i)}
                style={{ display: "flex", alignItems: "center", gap: 10, background: checked ? "rgba(187,240,136,.06)" : C.s2, border: `1px solid ${checked ? C.aBd : C.border}`, borderRadius: C.r2, padding: "11px 14px", cursor: "pointer", textAlign: "left", width: "100%", transition: "all .12s" }}>
                <div style={{ width: 19, height: 19, borderRadius: 5, border: `2px solid ${checked ? C.accent : C.borderHi}`, background: checked ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
                  {checked && <Check size={11} color="#0a0a0a" strokeWidth={3} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: checked ? C.t2 : C.text, textDecoration: checked ? "line-through" : "none", margin: 0, fontWeight: 500 }}>{step.label}</p>
                  <p style={{ fontSize: 11, color: C.t3, margin: 0 }}>{step.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* All done banner */}
        {done === ONBOARDING_STEPS.length && (
          <div style={{ marginTop: 14, background: C.aBg, border: `1px solid ${C.aBd}`, borderRadius: C.r2, padding: "10px 14px" }}>
            <p style={{ fontSize: 12.5, color: C.accent, fontWeight: 600, margin: 0 }}>🎉 Client fully onboarded! Document this as a case study.</p>
          </div>
        )}
      </div>
    </>
  );
}

function staleStatus(iso: string | null): { label: string; color: string; bg: string } {
  if (!iso) return { label: "No contact", color: C.t3, bg: C.s3 };
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 3) return { label: "Active",     color: "#4ade80",              bg: "rgba(74,222,128,.12)"  };
  if (d <= 6) return { label: "Cooling",    color: C.yellow,               bg: "rgba(251,191,36,.12)"  };
  return             { label: "Stalled ⚠", color: C.red,                  bg: "rgba(248,113,113,.12)" };
}

function parseRM(value: string): number {
  const m = value.match(/(\d[\d,]*)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
}

function convRate(from: number, to: number): { label: string; isZero: boolean } {
  if (from === 0) return { label: "—", isZero: false };
  const pct = Math.round((to / from) * 100);
  return { label: `${pct}%`, isZero: pct === 0 };
}

// Deal Detail Slide-Over
function DealSlideOver({ deal, onClose, onEdit }: { deal: Deal; onClose: () => void; onEdit: (f: Partial<Deal>) => void }) {
  const [notes, setNotes] = useLocal<Record<number, string>>("flogen_pipeline_notes", {});
  const [outreach, setOutreach] = useLocal<Record<number, OutreachEntry[]>>("flogen_outreach_log", {});
  const [newEntry, setNewEntry] = useState("");
  const noteVal  = notes[deal.id] ?? "";
  const dealLog  = outreach[deal.id] ?? [];
  const stale    = staleStatus(deal.lastContact);
  const indColor = INDUSTRY_COLOR[deal.industry] ?? C.t2;

  function addOutreachEntry() {
    if (!newEntry.trim()) return;
    const entry: OutreachEntry = { id: Date.now(), date: isoDate(new Date()), note: newEntry.trim() };
    setOutreach(prev => ({ ...prev, [deal.id]: [entry, ...(prev[deal.id] ?? [])] }));
    setNewEntry("");
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)", zIndex: 40 }} />
      {/* Panel */}
      <div className="fop-slide-over" style={{ position: "fixed", top: 0, right: 0, width: 400, height: "100vh", background: C.s, borderLeft: `1px solid ${C.borderHi}`, zIndex: 50, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>{deal.name}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Chip label={deal.industry} bg={`${indColor}18`} color={indColor} />
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: stale.bg, color: stale.color }}>{stale.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.t2, cursor: "pointer", padding: 4, display: "flex", borderRadius: C.r2, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.t2)}>
            <X size={16} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          {/* Stage */}
          <div>
            <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Current Stage</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: STAGE_COLOR[deal.stage], flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: STAGE_COLOR[deal.stage], fontWeight: 600 }}>{STAGE_LABEL[deal.stage]}</span>
            </div>
          </div>

          {/* Deal value */}
          <div>
            <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Deal Value</label>
            <input value={deal.value} onChange={e => onEdit({ value: e.target.value })}
              style={{ width: "100%", fontSize: 13, fontWeight: 600, color: C.accent, background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r2, padding: "6px 10px", boxSizing: "border-box" }} />
          </div>

          {/* Last activity */}
          <div>
            <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Last Activity</label>
            <p style={{ fontSize: 13, color: C.t2, margin: 0 }}>{deal.lastContact ? `${deal.lastContact} · ${daysAgo(deal.lastContact)}` : "No contact yet"}</p>
          </div>

          {/* Next action */}
          <div>
            <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Next Action</label>
            <input value={deal.nextAction} onChange={e => onEdit({ nextAction: e.target.value })}
              style={{ width: "100%", fontSize: 12.5, color: C.text, background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r2, padding: "6px 10px", boxSizing: "border-box" }} />
          </div>

          {/* Lead source */}
          <div>
            <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Lead Source</label>
            <select value={deal.source ?? ""} onChange={e => onEdit({ source: (e.target.value as LeadSource) || undefined })}
              style={{ background: C.s2, border: `1px solid ${C.border}`, color: deal.source ? (SOURCE_COLOR[deal.source] ?? C.text) : C.t3, fontSize: 12.5, padding: "6px 10px", borderRadius: C.r2, outline: "none", width: "100%" }}>
              <option value="">Unknown source</option>
              {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Outreach log */}
          <div>
            <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Outreach Log</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input value={newEntry} onChange={e => setNewEntry(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addOutreachEntry(); }}
                placeholder="What did you say or send?"
                style={{ flex: 1, fontSize: 12, color: C.text, background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r2, padding: "5px 9px", outline: "none", fontFamily: "inherit" }} />
              <button onClick={addOutreachEntry}
                style={{ fontSize: 11.5, color: C.accent, background: C.aBg, border: `1px solid ${C.aBd}`, borderRadius: C.r2, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                + Log
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 160, overflowY: "auto" }}>
              {dealLog.length === 0 && (
                <p style={{ fontSize: 11.5, color: C.t3, margin: 0, fontStyle: "italic" }}>No outreach logged yet.</p>
              )}
              {dealLog.map((entry, i) => (
                <div key={entry.id} style={{ display: "flex", gap: 8, padding: "7px 0", borderBottom: i < dealLog.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ fontSize: 10.5, color: C.t3, flexShrink: 0, whiteSpace: "nowrap", marginTop: 1 }}>{entry.date}</span>
                  <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{entry.note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>
              Notes <span style={{ fontSize: 10, color: C.t3, textTransform: "none", letterSpacing: 0 }}>(auto-saved)</span>
            </label>
            <textarea value={noteVal}
              onChange={e => setNotes(prev => ({ ...prev, [deal.id]: e.target.value }))}
              placeholder="Add notes about this deal..."
              style={{ flex: 1, minHeight: 140, fontSize: 12.5, color: C.text, background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r2, padding: "8px 10px", resize: "vertical", lineHeight: 1.55, fontFamily: "inherit", boxSizing: "border-box", width: "100%" }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={onClose}
            style={{ width: "100%", background: C.s2, border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 13, padding: "8px 0", borderRadius: C.r, cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.s3; (e.currentTarget as HTMLElement).style.color = C.text; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.s2; (e.currentTarget as HTMLElement).style.color = C.t2; }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function DealCard({ deal, onAdvance, onDelete, onEdit, onOpen, reminder, onSetReminder, highlighted, onOpenOnboarding }: {
  deal: Deal; onAdvance: () => void; onDelete: () => void;
  onEdit: (f: Partial<Deal>) => void; onOpen: () => void;
  reminder?: string; onSetReminder: (date: string | null) => void;
  highlighted?: boolean; onOpenOnboarding?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const [showDatePick, setShowDatePick] = useState(false);
  const isClosed = deal.stage === "closed";
  const nextStage = STAGE_ORDER[STAGE_ORDER.indexOf(deal.stage) + 1];
  const indColor = INDUSTRY_COLOR[deal.industry] ?? C.t2;
  const stale = staleStatus(deal.lastContact);
  const prob = deal.probability ?? STAGE_PROB[deal.stage];

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.s3 : C.s2, border: `1px solid ${highlighted ? C.accent : isClosed ? C.aBd : C.border}`, boxShadow: highlighted ? `0 0 0 3px ${C.aBg}` : undefined, borderRadius: C.r, padding: "12px 14px", transition: "all .2s", position: "relative", cursor: "pointer" }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, lineHeight: 1.35 }}>{deal.name}</p>
        <div style={{ display: "flex", gap: 3, alignItems: "center", flexShrink: 0 }}>
          {deal.stage === "negotiation" && (
            <button
              onClick={e => { e.stopPropagation(); setShowDatePick(v => !v); }}
              title={reminder ? `Reminder: ${reminder}` : "Set follow-up reminder"}
              style={{ background: "none", border: "none", color: reminder ? C.yellow : C.t3, cursor: "pointer", padding: "2px 3px", display: "flex" }}
              onMouseEnter={e => (e.currentTarget.style.color = C.yellow)}
              onMouseLeave={e => (e.currentTarget.style.color = reminder ? C.yellow : C.t3)}>
              <Bell size={13} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ opacity: hov ? 1 : 0, transition: "opacity .12s", background: "none", border: "none", color: C.t3, cursor: "pointer", padding: "2px 3px", display: "flex" }}
            onMouseEnter={e => (e.currentTarget.style.color = C.red)}
            onMouseLeave={e => (e.currentTarget.style.color = C.t3)}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Reminder date picker */}
      {showDatePick && (
        <div onClick={e => e.stopPropagation()} style={{ marginBottom: 8 }}>
          <input type="date"
            defaultValue={reminder ?? ""}
            min={isoDate(new Date())}
            onChange={e => { onSetReminder(e.target.value || null); setShowDatePick(false); }}
            style={{ fontSize: 12, background: C.s3, border: `1px solid ${C.borderHi}`, borderRadius: C.r2, color: C.text, padding: "4px 8px", width: "100%", colorScheme: "dark", boxSizing: "border-box" }} />
        </div>
      )}

      {/* Industry + source + date chips */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 5 }}>
        <Chip label={deal.industry} bg={`${indColor}18`} color={indColor} />
        {deal.source && <Chip label={`via ${deal.source}`} bg={`${SOURCE_COLOR[deal.source]}18`} color={SOURCE_COLOR[deal.source]} />}
        <Chip label={daysAgo(deal.lastContact)} bg={C.s3} color={C.t2} />
      </div>

      {/* Staleness badge */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: stale.bg, color: stale.color }}>{stale.label}</span>
      </div>

      {/* Value */}
      <p style={{ fontSize: 12.5, color: C.accent, fontWeight: 600, margin: "0 0 6px" }}>{deal.value}</p>

      {/* Probability input */}
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: C.t2, cursor: "default" }}>Close prob:</label>
        <input type="number" min={0} max={100} value={prob}
          onChange={e => onEdit({ probability: Math.min(100, Math.max(0, +e.target.value)) })}
          style={{ width: 48, fontSize: 11, background: C.s3, border: `1px solid ${C.border}`, borderRadius: C.r2, color: C.text, padding: "2px 5px", textAlign: "center" }} />
        <span style={{ fontSize: 11, color: C.t2 }}>%</span>
      </div>

      <p style={{ fontSize: 11.5, color: C.t2, margin: "0 0 10px", lineHeight: 1.5 }}>{deal.nextAction}</p>
      {!isClosed && nextStage && (
        <button onClick={e => { e.stopPropagation(); onAdvance(); }}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 11, padding: "4px 8px", borderRadius: C.r2, cursor: "pointer", transition: "all .12s", width: "100%", justifyContent: "center" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.aBd; (e.currentTarget as HTMLElement).style.color = C.accent; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHi; (e.currentTarget as HTMLElement).style.color = C.t2; }}>
          Move to {STAGE_LABEL[nextStage]} <ArrowRight size={11} />
        </button>
      )}
      {isClosed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.accent, fontSize: 12 }}><Check size={13} /> Closed — paid client</div>
          <button onClick={e => { e.stopPropagation(); onOpenOnboarding?.(); }}
            style={{ display: "flex", alignItems: "center", gap: 4, background: C.aBg, border: `1px solid ${C.aBd}`, color: C.accent, fontSize: 11, padding: "5px 10px", borderRadius: C.r2, cursor: "pointer", width: "100%", justifyContent: "center", transition: "all .12s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(187,240,136,.15)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.aBg; }}>
            <Check size={10} /> Onboarding Checklist →
          </button>
        </div>
      )}
    </div>
  );
}

function PipelineSection({ highlightDealId }: { highlightDealId?: number | null }) {
  const [deals, setDeals] = useLocal<Deal[]>("flogen_pipeline", INIT_DEALS);
  const [reminders, setReminders] = useLocal<Record<number, string>>("flogen_pipeline_reminders", {});
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [onboardingDeal, setOnboardingDeal] = useState<Deal | null>(null);
  const closedCount = deals.filter(d => d.stage === "closed").length;
  const today = isoDate(new Date());

  // Overdue reminders (not dismissed)
  const overdueDeals = deals.filter(d =>
    reminders[d.id] && reminders[d.id] <= today && !dismissed.includes(d.id)
  );

  // Weighted pipeline value (non-closed deals with parseable values)
  const weightedTotal = deals
    .filter(d => d.stage !== "closed")
    .reduce((sum, d) => {
      const num = parseRM(d.value);
      const prob = (d.probability ?? STAGE_PROB[d.stage]) / 100;
      return sum + num * prob;
    }, 0);

  // Funnel counts
  const stageCounts: Record<PStage, number> = {} as Record<PStage, number>;
  STAGE_ORDER.forEach(s => { stageCounts[s] = deals.filter(d => d.stage === s).length; });

  function advance(id: number) {
    setDeals(prev => prev.map(d => {
      if (d.id !== id) return d;
      const idx = STAGE_ORDER.indexOf(d.stage);
      if (idx >= STAGE_ORDER.length - 1) return d;
      const newStage = STAGE_ORDER[idx + 1];
      return { ...d, stage: newStage, lastContact: isoDate(new Date()), probability: STAGE_PROB[newStage] };
    }));
  }
  function addDeal(name: string) {
    setDeals(prev => [...prev, { id: uid(), name, industry: "Real Estate", stage: "lead", lastContact: null, value: "TBD", nextAction: "Initial outreach", probability: 10 }]);
  }

  return (
    <div>
      {/* Revenue Tracker */}
      <RevenueTracker deals={deals} />

      {/* Overdue reminder banners */}
      {overdueDeals.map(d => (
        <div key={d.id} style={{ background: "rgba(248,113,113,.1)", border: `1px solid rgba(248,113,113,.3)`, borderRadius: C.r, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: C.red, flex: 1 }}>⚠ <strong>{d.name}</strong> follow-up is overdue</span>
          <button onClick={() => setDismissed(prev => [...prev, d.id])}
            style={{ fontSize: 11.5, color: C.t2, background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r2, padding: "3px 10px", cursor: "pointer" }}>
            Dismiss
          </button>
          <button onClick={() => { setReminders(prev => { const n = { ...prev }; delete n[d.id]; return n; }); setDismissed(prev => [...prev, d.id]); }}
            style={{ fontSize: 11.5, color: C.accent, background: C.aBg, border: `1px solid ${C.aBd}`, borderRadius: C.r2, padding: "3px 10px", cursor: "pointer" }}>
            Mark Done
          </button>
        </div>
      ))}

      {/* Target + weighted value banner */}
      <div className="fop-pipe-banner" style={{ background: C.s, border: `1px solid ${closedCount >= 3 ? C.aBd : C.border}`, borderRadius: C.r, padding: "12px 18px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <span style={{ fontSize: 12, color: C.t2 }}>{closedCount}/3 clients closed</span>
          {weightedTotal > 0 && (
            <span style={{ fontSize: 11.5, color: C.accent }}>Weighted pipeline: RM {weightedTotal.toLocaleString()}/mo</span>
          )}
        </div>
      </div>

      {/* Funnel conversion bar */}
      <div style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
        {STAGE_ORDER.map((stage, i) => {
          const count = stageCounts[stage];
          const prev = i > 0 ? stageCounts[STAGE_ORDER[i - 1]] : null;
          const conv = prev !== null ? convRate(prev, count) : null;
          return (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
              {conv && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 6px" }}>
                  <span style={{ fontSize: 10, color: conv.isZero ? C.yellow : C.t2, fontWeight: conv.isZero ? 700 : 400, background: conv.isZero ? "rgba(251,191,36,.12)" : "transparent", padding: "1px 5px", borderRadius: 3 }}>{conv.label}</span>
                  <ArrowRight size={11} color={conv.isZero ? C.yellow : C.t3} />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: count > 0 ? STAGE_COLOR[stage] : C.t3, lineHeight: 1 }}>{count}</span>
                <span style={{ fontSize: 10, color: C.t2, whiteSpace: "nowrap" }}>{STAGE_LABEL[stage]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage columns */}
      <div className="fop-hscroll">
      <div className="fop-pipeline-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 1, background: C.border, minWidth: 700 }}>
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
                    onEdit={f => setDeals(prev => prev.map(x => x.id === d.id ? { ...x, ...f } : x))}
                    onOpen={() => setSelectedDeal(d)}
                    reminder={reminders[d.id]}
                    highlighted={highlightDealId === d.id}
                    onOpenOnboarding={d.stage === "closed" ? () => setOnboardingDeal(d) : undefined}
                    onSetReminder={date => setReminders(prev => {
                      if (!date) { const n = { ...prev }; delete n[d.id]; return n; }
                      return { ...prev, [d.id]: date };
                    })} />
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

      {/* Deal slide-over */}
      {selectedDeal && (
        <DealSlideOver
          deal={deals.find(d => d.id === selectedDeal.id) ?? selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onEdit={f => setDeals(prev => prev.map(x => x.id === selectedDeal.id ? { ...x, ...f } : x))} />
      )}

      {/* Onboarding checklist modal */}
      {onboardingDeal && (
        <OnboardingModal
          deal={deals.find(d => d.id === onboardingDeal.id) ?? onboardingDeal}
          onClose={() => setOnboardingDeal(null)} />
      )}
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

function PostCard({ post, onDelete, onCopyCaption }: { post: CalPost; onDelete: () => void; onCopyCaption?: () => void }) {
  const [hov, setHov]           = useState(false);
  const [expand, setExpand]     = useState(false);
  const [capCopied, setCapCopied] = useState(false);
  const ps   = STATUS_S[post.status];
  const isIG = post.platform === "instagram";
  // 3B: subtle platform tint
  const platBg = isIG ? "rgba(99,102,241,.06)" : "rgba(244,63,94,.05)";

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData("postId", String(post.id)); e.dataTransfer.effectAllowed = "move"; }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.s3 : platBg, border: `1px solid ${C.border}`, borderRadius: C.r2, padding: "7px 8px", transition: "all .12s", cursor: "grab" }}
      onClick={() => setExpand(e => !e)}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        {isIG ? <Instagram size={11} color={C.orange} /> : <Hash size={11} color={C.red} />}
        <span style={{ fontSize: 10.5, fontWeight: 500, color: isIG ? C.orange : C.red }}>{post.type}</span>
        {post.type === "Story" && (
          <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(249,115,22,.15)", color: C.orange, padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(249,115,22,.3)" }}>24h</span>
        )}
        <span style={{ marginLeft: "auto" }}><Chip label={post.status} bg={ps.bg} color={ps.color} /></span>
        {hov && <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", padding: 0, display: "flex" }}><X size={11} /></button>}
      </div>
      <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.4 }}>{post.topic}</p>
      {/* 3C: Pillar chip */}
      {post.pillar && (
        <div style={{ marginTop: 4 }}>
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: `${PILLAR_META[post.pillar].color}18`, color: PILLAR_META[post.pillar].color, fontWeight: 500 }}>{post.pillar}</span>
        </div>
      )}
      {expand && <p style={{ fontSize: 11, color: C.t2, margin: "6px 0 0", lineHeight: 1.6, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>{post.caption}</p>}
      {/* 3E: Copy Caption button — Scheduled cards only */}
      {post.status === "Scheduled" && onCopyCaption && (
        <button
          onClick={e => { e.stopPropagation(); setCapCopied(true); setTimeout(() => setCapCopied(false), 2000); onCopyCaption(); }}
          style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${C.border}`, color: C.t2, fontSize: 10.5, padding: "2px 7px", borderRadius: C.r2, cursor: "pointer", transition: "all .12s", width: "100%", justifyContent: "center" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.aBd; (e.currentTarget as HTMLElement).style.color = C.accent; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.t2; }}>
          {capCopied ? <><CheckCheck size={10} /> Copied</> : <><Instagram size={10} /> Copy Caption</>}
        </button>
      )}
    </div>
  );
}

function CalendarSection({ onPlannerPrefill, prefillPost }: {
  onPlannerPrefill: (v: string) => void;
  prefillPost?: { topic: string; platform: PostPlat; type: PostType } | null;
}) {
  void onPlannerPrefill;
  const [posts, setPosts]           = useLocal<CalPost[]>("flogen_calendar", INIT_POSTS);
  const [weekOff, setWeekOff]       = useState(0);
  const [addDay, setAddDay]         = useState<string | null>(null);
  const [form, setForm]             = useState({ platform: "instagram" as PostPlat, type: "Reel" as PostType, topic: "", status: "Draft" as PostStatus, pillar: "Education" as PostPillar });
  const [platFilter, setPlatFilter] = useState<PlatFilter>("all");
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [copyToast, setCopyToast]   = useState<string | null>(null);
  const week = getWeekDates(weekOff);

  // 4B: Handle prefill from Content Planner — find next empty slot and open add form
  useEffect(() => {
    if (!prefillPost) return;
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = isoDate(d);
      if (posts.filter(p => p.date === iso).length === 0) {
        setWeekOff(Math.floor(i / 7));
        setAddDay(iso);
        setForm(f => ({ ...f, topic: prefillPost.topic, platform: prefillPost.platform, type: prefillPost.type }));
        return;
      }
    }
    // Fallback: tomorrow
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setAddDay(isoDate(tomorrow));
    setForm(f => ({ ...f, topic: prefillPost.topic, platform: prefillPost.platform, type: prefillPost.type }));
  }, [prefillPost]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3A: Cadence health — always counts against current real week (week 0)
  const currentWeekIsos = getWeekDates(0).map(d => isoDate(d));
  const thisWeekCount   = posts.filter(p => currentWeekIsos.includes(p.date)).length;
  const TARGET_POSTS    = 2;
  const onTrack         = thisWeekCount >= TARGET_POSTS;

  // 3B: filter visible posts
  function visibleDayPosts(dayPosts: CalPost[]): CalPost[] {
    if (platFilter === "all" || platFilter === "both") return dayPosts;
    return dayPosts.filter(p => p.platform === platFilter);
  }

  // 3C: pillar balance counts
  const pillarCounts = PILLARS.reduce((acc, p) => ({ ...acc, [p]: posts.filter(x => x.pillar === p).length }), {} as Record<PostPillar, number>);
  const maxPillarCount = Math.max(1, ...Object.values(pillarCounts));

  function addPost() {
    if (!addDay || !form.topic.trim()) return;
    setPosts(prev => [...prev, { id: uid(), date: addDay, ...form, caption: "" }]);
    setAddDay(null); setForm({ platform: "instagram", type: "Reel", topic: "", status: "Draft", pillar: "Education" });
  }

  // 3E: copy caption toast
  function handleCopyCaption(caption: string) {
    navigator.clipboard.writeText(caption).catch(() => {});
    setCopyToast("Caption copied — paste into Instagram");
    setTimeout(() => setCopyToast(null), 2500);
  }

  // 3D: reschedule on drop
  function reschedule(postId: number, newDate: string) {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, date: newDate } : p));
  }

  const sel: React.CSSProperties = { background: C.s3, border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 12, padding: "5px 8px", borderRadius: C.r2, outline: "none" };

  return (
    <div>
      {/* 3A: Cadence Health banner */}
      <div style={{ background: onTrack ? "rgba(187,240,136,.07)" : "rgba(251,191,36,.07)", border: `1px solid ${onTrack ? C.aBd : "rgba(251,191,36,.3)"}`, borderRadius: C.r, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{onTrack ? "✅" : "⚠"}</span>
        {onTrack
          ? <span style={{ fontSize: 12.5, color: C.accent, fontWeight: 500 }}>On track — {thisWeekCount}/{TARGET_POSTS} posts this week</span>
          : <span style={{ fontSize: 12.5, color: C.yellow, fontWeight: 500 }}>Behind — post today to stay on cadence ({thisWeekCount}/{TARGET_POSTS} this week)</span>
        }
      </div>

      {/* 3B: Platform filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {(["all","instagram","xiaohongshu","both"] as PlatFilter[]).map(f => {
          const active = platFilter === f;
          const label  = f === "all" ? "All" : f === "instagram" ? "Instagram" : f === "xiaohongshu" ? "Xiaohongshu" : "Both";
          return (
            <button key={f} onClick={() => setPlatFilter(f)}
              style={{ fontSize: 12, fontWeight: active ? 600 : 400, padding: "4px 12px", borderRadius: 99, cursor: "pointer", border: `1px solid ${active ? C.borderHi : C.border}`, background: active ? C.s2 : "transparent", color: active ? C.text : C.t2, transition: "all .12s" }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Week nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Btn small onClick={() => setWeekOff(w => w - 1)}><ChevronLeft size={13} /></Btn>
        <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
          {week[0].toLocaleDateString("en-MY",{month:"short",day:"numeric"})} – {week[6].toLocaleDateString("en-MY",{month:"short",day:"numeric",year:"numeric"})}
        </span>
        <Btn small onClick={() => setWeekOff(w => w + 1)}><ChevronRight size={13} /></Btn>
        <Btn small onClick={() => setWeekOff(0)}>Today</Btn>
      </div>

      {/* Grid — 3D: day cells are drop zones */}
      <div className="fop-hscroll">
      <div className="fop-calendar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: C.border, marginBottom: 16, minWidth: 560 }}>
        {week.map((date, i) => {
          const iso      = isoDate(date);
          const isToday  = iso === isoDate(new Date());
          const dayPosts = visibleDayPosts(posts.filter(p => p.date === iso));
          const isDrop   = dragOverDay === iso;
          return (
            <div key={iso}
              onDragOver={e => { e.preventDefault(); setDragOverDay(iso); }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={e => { e.preventDefault(); const pid = e.dataTransfer.getData("postId"); if (pid) reschedule(+pid, iso); setDragOverDay(null); }}
              style={{ background: isDrop ? C.s3 : C.bg, minHeight: 180, display: "flex", flexDirection: "column", transition: "background .12s", outline: isDrop ? `2px solid ${C.aBd}` : "none", outlineOffset: -2 }}>
              <div style={{ padding: "8px 8px 6px", borderBottom: `1px solid ${isToday ? C.aBd : C.border}`, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 10.5, color: C.t2 }}>{DAY_LABELS[i]}</span>
                <span style={{ fontSize: 12.5, fontWeight: isToday ? 700 : 400, color: isToday ? C.accent : C.text }}>{date.getDate()}</span>
              </div>
              <div style={{ flex: 1, padding: "6px 6px 0", display: "flex", flexDirection: "column", gap: 4 }}>
                {dayPosts.map(p => (
                  <PostCard key={p.id} post={p}
                    onDelete={() => setPosts(prev => prev.filter(x => x.id !== p.id))}
                    onCopyCaption={p.status === "Scheduled" ? () => handleCopyCaption(p.caption) : undefined}
                  />
                ))}
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
                    {["Reel","Carousel","Static","Story","XHS Post"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as PostStatus}))} style={sel}>
                    {["Draft","Scheduled","Posted"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={form.pillar} onChange={e => setForm(f => ({...f, pillar: e.target.value as PostPillar}))} style={sel}>
                    {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <Btn accent small full onClick={addPost}>Add post</Btn>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>

      {/* Competitor feeds */}
      <div style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "14px 18px", marginBottom: 16 }}>
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

      {/* 3C: Pillar Balance chart */}
      <div style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "14px 18px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.t3, letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 12px" }}>Content Pillar Balance</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PILLARS.map(p => {
            const count = pillarCounts[p];
            const pct   = posts.length > 0 ? Math.round((count / posts.length) * 100) : 0;
            const color = PILLAR_META[p].color;
            return (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11.5, color: C.t2, width: 108, flexShrink: 0 }}>{p}</span>
                <div style={{ flex: 1, height: 7, background: C.s3, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(count / maxPillarCount) * 100}%`, background: color, borderRadius: 4, transition: "width .3s" }} />
                </div>
                <span style={{ fontSize: 11, color: C.t3, width: 52, textAlign: "right", flexShrink: 0 }}>{count} · {pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Pillar Goal Tracker — weekly targets */}
      {(() => {
        const WEEKLY_TARGETS: Partial<Record<PostPillar, number>> = { "Pain Point": 2, "Proof/Social": 1, "Education": 1, "Brand": 1 };
        const weekIsos = new Set(getWeekDates(0).map(isoDate));
        const weekCounts = PILLARS.reduce((acc, p) => ({
          ...acc, [p]: posts.filter(x => x.pillar === p && weekIsos.has(x.date)).length,
        }), {} as Record<PostPillar, number>);
        const trackedPillars = PILLARS.filter(p => WEEKLY_TARGETS[p] !== undefined);
        return (
          <div style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.t3, letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 }}>Weekly Pillar Goals</p>
              <span style={{ fontSize: 10.5, color: C.t3 }}>Current week</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {trackedPillars.map(p => {
                const target = WEEKLY_TARGETS[p]!;
                const count  = weekCounts[p];
                const hit    = count >= target;
                const pct    = Math.min(100, Math.round((count / target) * 100));
                const color  = PILLAR_META[p].color;
                return (
                  <div key={p}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11.5, color: hit ? color : C.t2, flex: 1 }}>{p}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: hit ? color : C.t3 }}>{count}/{target}</span>
                      {hit && <span style={{ fontSize: 10, background: `${color}18`, color, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>✓ Done</span>}
                    </div>
                    <div style={{ height: 5, background: C.s3, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: hit ? color : `${color}99`, borderRadius: 3, transition: "width .3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 3E: Copy caption toast */}
      {copyToast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.s2, border: `1px solid ${C.aBd}`, borderRadius: C.r, padding: "10px 20px", color: C.accent, fontSize: 13, fontWeight: 500, zIndex: 100, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(0,0,0,.4)", whiteSpace: "nowrap" }}>
          <CheckCheck size={14} /> {copyToast}
        </div>
      )}
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
                💾 Save to Library
              </button>
              <button onClick={() => setRejected(true)}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", color: C.red, fontSize: 11.5, padding: "3px 10px", borderRadius: 4, cursor: "pointer" }}>
                ✕ Discard
              </button>
            </>
          )}
          {accepted && <span style={{ fontSize: 11.5, color: C.accent, fontWeight: 500 }}>💾 Saved to Scripts Library</span>}
          {rejected && <span style={{ fontSize: 11.5, color: C.red }}>✕ Discarded</span>}
        </div>
        <CopyBtn text={text} />
      </div>
      <pre style={{ margin: 0, padding: "14px 16px", color: C.cream, fontSize: 12.5, lineHeight: 1.8, fontFamily: "inherit", whiteSpace: "pre-wrap", maxHeight: 380, overflowY: "auto" }}>{text}</pre>
    </div>
  );
}

function parsePostIdeas(text: string): Array<{ label: string; topic: string; platform: PostPlat; type: PostType }> {
  const result: Array<{ label: string; topic: string; platform: PostPlat; type: PostType }> = [];
  const igRe = /## (IG Post \d+\s*[—–-]\s*(\w+))([\s\S]*?)(?=\n## |$)/g;
  let m: RegExpExecArray | null;
  while ((m = igRe.exec(text)) !== null) {
    const rawType = m[2];
    const body = m[3];
    const topicMatch = body.match(/\*\*(?:Topic|Hook)[^:]*:\*\*\s*(.+)/);
    if (!topicMatch) continue;
    const type: PostType = (["Reel","Carousel","Static"].includes(rawType) ? rawType : "Reel") as PostType;
    result.push({ label: `IG Post ${result.length + 1} (${type})`, topic: topicMatch[1].trim(), platform: "instagram", type });
  }
  const xhsRe = /## XHS Post([\s\S]*?)(?=\n## |$)/;
  const xm = xhsRe.exec(text);
  if (xm) {
    const topicMatch = xm[1].match(/\*\*Topic[^:]*\(English\)[^:]*:\*\*\s*(.+)/) ?? xm[1].match(/\*\*Topic[^:]*:\*\*\s*(.+)/);
    if (topicMatch) result.push({ label: "XHS Post", topic: topicMatch[1].trim(), platform: "xiaohongshu", type: "XHS Post" });
  }
  return result;
}

function ContentPlannerAgent({ prefill, onSave, onGoToCalendar, onUsage }: {
  prefill: string;
  onSave: (content: string, type: "Content Plan" | "Script" | "Pitch") => void;
  onGoToCalendar?: (post: { topic: string; platform: PostPlat; type: PostType }) => void;
  onUsage?: (u: { input_tokens: number; output_tokens: number }) => void;
}) {
  const [industry, setIndustry] = useState(prefill || "Real Estate");
  const [focus, setFocus]       = useState("");
  const [out, setOut]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const inp: React.CSSProperties = { background: C.s2, border: `1px solid ${C.borderHi}`, color: C.cream, fontSize: 13, padding: "8px 12px", borderRadius: C.r2, outline: "none", width: "100%" };

  useEffect(() => { if (prefill) setIndustry(prefill); }, [prefill]);

  const ideas = out ? parsePostIdeas(out) : [];

  async function run() {
    setLoading(true); setErr(""); setOut("");
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: SYS_PLANNER, userMessage: `Industry/vertical: ${industry}\nWeek focus / theme: ${focus || "general WhatsApp AI automation"}`, maxTokens: 1200 }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.usage) onUsage?.(data.usage);
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
      {/* 4B: Add to Calendar buttons per idea */}
      {ideas.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <p style={{ fontSize: 10.5, color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 5px" }}>📅 Add to Calendar</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {ideas.map((idea, i) => (
              <button key={i} onClick={() => onGoToCalendar?.({ topic: idea.topic, platform: idea.platform, type: idea.type })}
                style={{ display: "flex", alignItems: "center", gap: 6, background: C.s2, border: `1px solid ${C.border}`, color: C.t2, fontSize: 11.5, padding: "5px 10px", borderRadius: C.r2, cursor: "pointer", textAlign: "left", transition: "all .12s", width: "100%" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.aBd; (e.currentTarget as HTMLElement).style.color = C.accent; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.t2; }}>
                <CalendarDays size={11} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{idea.label}:</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{idea.topic}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AgentCard>
  );
}

function ScriptWriterAgent({ prefill, onSave, onUsage }: { prefill?: string; onSave: (content: string, type: "Content Plan" | "Script" | "Pitch") => void; onUsage?: (u: { input_tokens: number; output_tokens: number }) => void }) {
  const [topic, setTopic]     = useState(prefill ?? "");
  const [platform, setPlat]   = useState<PostPlat>("instagram");

  // 5B: sync prefill if parent provides it after mount (from Competitor Gap panel)
  useEffect(() => {
    if (prefill) setTopic(prefill);
  }, [prefill]);
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
      if (data.usage) onUsage?.(data.usage);
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

function ConsultingAgent({ onSave, onUsage }: { onSave: (content: string, type: "Content Plan" | "Script" | "Pitch") => void; onUsage?: (u: { input_tokens: number; output_tokens: number }) => void }) {
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
      if (data.usage) onUsage?.(data.usage);
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

const BIZ_TYPES = ["Hair Salon","Restaurant","Clinic","Property Agent","Retail","Other"] as const;
type BizType = typeof BIZ_TYPES[number];

function OutreachAgent({ onSave, onUsage }: {
  onSave: (content: string, type: "Content Plan" | "Script" | "Pitch") => void;
  onUsage?: (u: { input_tokens: number; output_tokens: number }) => void;
}) {
  const [lead, setLead]       = useState("");
  const [biz, setBiz]         = useState<BizType>("Hair Salon");
  const [detail, setDetail]   = useState("");
  const [out, setOut]         = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const inp: React.CSSProperties = { background: C.s2, border: `1px solid ${C.borderHi}`, color: C.cream, fontSize: 13, padding: "8px 12px", borderRadius: C.r2, outline: "none", width: "100%" };

  async function run() {
    setLoading(true); setErr(""); setOut("");
    try {
      const msg = `Lead: ${lead}\nType: ${biz}\nDetail: ${detail || "none"}`;
      const res  = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: SYS_OUTREACH, userMessage: msg, maxTokens: 400 }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.usage) onUsage?.(data.usage);
      setOut(data.content as string);
    }
    catch (e: unknown) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <AgentCard title="Outreach Personaliser" description="Lead details → curiosity-first WhatsApp DM" icon={Send}>
      <input value={lead} onChange={e => setLead(e.target.value)} placeholder="Lead name (e.g. Kak Aisha, Bloomy Salon KL)" style={inp} />
      <select value={biz} onChange={e => setBiz(e.target.value as BizType)} style={{ ...inp }}>
        {BIZ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <input value={detail} onChange={e => setDetail(e.target.value)} placeholder="Optional detail (e.g. 3 branches, busy on weekends)" style={inp} />
      <Btn accent full onClick={run} disabled={loading || !lead.trim()}><Send size={13} /> Generate DM</Btn>
      <OutputPanel text={out} loading={loading} error={err}
        onAccept={(c) => onSave(c, "Pitch")}
        scriptType="Pitch"
        scriptTitle={`Outreach — ${lead}`}
      />
    </AgentCard>
  );
}

function AgentsSection({ plannerPrefill, scriptPrefill, onSave, onGoToCalendar }: {
  plannerPrefill: string;
  scriptPrefill?: string;
  onSave: (content: string, type: SavedScript["type"], platform?: string) => void;
  onGoToCalendar?: (post: { topic: string; platform: PostPlat; type: PostType }) => void;
}) {
  const [sessIn, setSessIn]   = useState(0);
  const [sessOut, setSessOut] = useState(0);

  function addUsage(u: { input_tokens: number; output_tokens: number }) {
    trackTokens(u);
    setSessIn(p  => p + u.input_tokens);
    setSessOut(p => p + u.output_tokens);
  }

  const sessCost = (sessIn * 3 + sessOut * 15) / 1_000_000;

  return (
    <div>
      {/* Header bar — 4D: token counter */}
      <div style={{ background: C.s, border: `1px solid ${C.aBd}`, borderRadius: C.r, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Zap size={13} color={C.accent} />
        <span style={{ fontSize: 12.5, color: C.t2 }}>Calls <strong style={{ color: C.text }}>claude-sonnet-4-5</strong> via your Anthropic API key</span>
        {(sessIn > 0 || sessOut > 0) && (
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.t2, whiteSpace: "nowrap" }}>
            In: <strong style={{ color: C.text }}>{sessIn.toLocaleString()}</strong>
            {" · "}Out: <strong style={{ color: C.text }}>{sessOut.toLocaleString()}</strong>
            {" · "}Cost: <strong style={{ color: C.accent }}>${sessCost.toFixed(4)}</strong>
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: 12 }}>
        <ContentPlannerAgent prefill={plannerPrefill} onSave={(c, t) => onSave(c, t)} onGoToCalendar={onGoToCalendar} onUsage={addUsage} />
        <ScriptWriterAgent prefill={scriptPrefill} onSave={(c, t) => onSave(c, t)} onUsage={addUsage} />
        <ConsultingAgent onSave={(c, t) => onSave(c, t)} onUsage={addUsage} />
        <OutreachAgent onSave={(c, t) => onSave(c, t)} onUsage={addUsage} />
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
  "Caption":      "#06b6d4",
  "Reel Script":  C.accent,
  "DM Template":  "#10b981",
  "Other":        C.t2,
};

const SCRIPT_TYPES: ScriptType[] = ["Caption", "Reel Script", "DM Template", "Pitch", "Content Plan", "Script", "Trend", "Other"];
const SCRIPT_PLATFORMS = ["Instagram", "XHS", "WhatsApp", "Both"] as const;
const BLANK_FORM = { title: "", type: "Caption" as ScriptType, platform: "Instagram", content: "", date: "" };
type ABTest = { id: number; title: string; hookA: string; hookB: string; votesA: number; votesB: number; createdAt: string };
const BLANK_AB: Omit<ABTest, "id" | "votesA" | "votesB" | "createdAt"> = { title: "", hookA: "", hookB: "" };

function ScriptsLibrary({
  scripts, onAdd, onUpdate, onDelete,
}: {
  scripts: SavedScript[];
  onAdd: (s: Omit<SavedScript, "id">) => void;
  onUpdate: (s: SavedScript) => void;
  onDelete: (id: number) => void;
}) {
  const [query,      setQuery]      = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [platFilter, setPlatFilter] = useState<string>("all");
  const [sort,       setSort]       = useState<"newest" | "oldest" | "az">("newest");
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(BLANK_FORM);
  const [editId,     setEditId]     = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedScript | null>(null);
  const [copyToast,  setCopyToast]  = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // A/B Hook Tester
  const [abTests, setAbTests]       = useLocal<ABTest[]>("flogen_ab_tests", []);
  const [showABModal, setShowABModal] = useState(false);
  const [abForm, setAbForm]         = useState(BLANK_AB);
  const [abOpen, setAbOpen]         = useState(true);

  // Filter + sort
  const filtered = (() => {
    let list = scripts.filter(s => {
      const q = query.toLowerCase();
      const matchQ = !q || s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q);
      const matchT = typeFilter === "all" || s.type === typeFilter;
      const matchP = platFilter === "all" || (s.platform || "").toLowerCase() === platFilter.toLowerCase();
      return matchQ && matchT && matchP;
    });
    if (sort === "newest") list = [...list].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    else if (sort === "oldest") list = [...list].sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
    else list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  })();

  function openNew() {
    setForm({ ...BLANK_FORM, date: new Date().toISOString().slice(0, 10) });
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(s: SavedScript) {
    setForm({ title: s.title, type: s.type, platform: s.platform || "Instagram", content: s.content, date: s.savedAt.slice(0, 10) });
    setEditId(s.id);
    setShowModal(true);
  }

  function saveModal() {
    if (!form.title.trim() || !form.content.trim()) return;
    const savedAt = form.date ? new Date(form.date).toISOString() : new Date().toISOString();
    if (editId !== null) {
      onUpdate({ id: editId, title: form.title, type: form.type, platform: form.platform, content: form.content, savedAt });
    } else {
      onAdd({ title: form.title, type: form.type, platform: form.platform, content: form.content, savedAt });
    }
    setShowModal(false);
  }

  function copyScript(s: SavedScript) {
    navigator.clipboard.writeText(s.content).catch(() => {});
    setCopyToast(`"${s.title}" copied to clipboard`);
    setTimeout(() => setCopyToast(null), 2500);
  }

  const inp: React.CSSProperties = { background: C.s2, border: `1px solid ${C.borderHi}`, color: C.cream, fontSize: 13, padding: "8px 12px", borderRadius: C.r2, outline: "none", width: "100%", fontFamily: "inherit" };

  return (
    <div style={{ position: "relative" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 2px" }}>Scripts Library</p>
          <p style={{ fontSize: 12, color: C.t2, margin: 0 }}>{scripts.length} {scripts.length === 1 ? "script" : "scripts"} saved</p>
        </div>
        <Btn accent onClick={openNew}><Plus size={13} /> New Script</Btn>
      </div>

      {/* ── Search + Sort ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={13} color={C.t3} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title or content…"
            style={{ ...inp, paddingLeft: 30, fontSize: 12 }} />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
          style={{ ...inp, width: "auto", fontSize: 12, padding: "8px 10px" }}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="az">A–Z</option>
        </select>
      </div>

      {/* ── Filter pills: Type ── */}
      <div style={{ display: "flex", gap: 5, marginBottom: 6, flexWrap: "wrap" }}>
        {["all", ...SCRIPT_TYPES].map(t => {
          const active = typeFilter === t;
          const col = t === "all" ? C.t2 : (TYPE_COLOR[t] || C.t2);
          return (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              fontSize: 11, fontWeight: active ? 600 : 400, padding: "3px 10px", borderRadius: 99, cursor: "pointer",
              border: `1px solid ${active ? col : C.border}`,
              background: active ? `${col}18` : "transparent",
              color: active ? col : C.t3, transition: "all .12s",
            }}>{t === "all" ? "All Types" : t}</button>
          );
        })}
      </div>

      {/* ── Filter pills: Platform ── */}
      <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", ...SCRIPT_PLATFORMS].map(p => {
          const active = platFilter === p;
          return (
            <button key={p} onClick={() => setPlatFilter(p)} style={{
              fontSize: 11, fontWeight: active ? 600 : 400, padding: "3px 10px", borderRadius: 99, cursor: "pointer",
              border: `1px solid ${active ? C.borderHi : C.border}`,
              background: active ? C.s2 : "transparent",
              color: active ? C.text : C.t3, transition: "all .12s",
            }}>{p === "all" ? "All Platforms" : p}</button>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.t3 }}>
          <Archive size={28} style={{ margin: "0 auto 10px", display: "block" }} color={C.t3} />
          <p style={{ margin: "0 0 6px", color: C.t2, fontSize: 13.5 }}>
            {scripts.length === 0 ? "No scripts yet" : "No results match your filters"}
          </p>
          <p style={{ fontSize: 12, color: C.t3 }}>
            {scripts.length === 0 ? "Click \"+ New Script\" to create your first, or save content from the Agents tab." : "Try adjusting your search or filters."}
          </p>
        </div>
      )}

      {/* ── Script cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(s => {
          const col = TYPE_COLOR[s.type] || C.t2;
          const expanded = expandedId === s.id;
          return (
            <div key={s.id} style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, overflow: "hidden" }}>
              {/* Card header */}
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 10.5, background: `${col}18`, color: col, padding: "2px 7px", borderRadius: 4, fontWeight: 600, flexShrink: 0 }}>{s.type}</span>
                  {s.platform && <span style={{ fontSize: 10.5, background: C.s2, color: C.t2, padding: "2px 7px", borderRadius: 4, flexShrink: 0 }}>{s.platform}</span>}
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: C.t3, marginRight: 4 }}>
                    {new Date(s.savedAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {/* Copy */}
                  <button onClick={() => copyScript(s)} title="Copy content"
                    style={{ display: "flex", alignItems: "center", gap: 4, background: C.s2, border: `1px solid ${C.border}`, color: C.t2, fontSize: 11, padding: "4px 8px", borderRadius: C.r2, cursor: "pointer", transition: "all .12s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.accent; (e.currentTarget as HTMLElement).style.borderColor = C.aBd; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.t2; (e.currentTarget as HTMLElement).style.borderColor = C.border; }}>
                    <Copy size={11} /> Copy
                  </button>
                  {/* Edit */}
                  <button onClick={() => openEdit(s)} title="Edit script"
                    style={{ display: "flex", alignItems: "center", gap: 4, background: C.s2, border: `1px solid ${C.border}`, color: C.t2, fontSize: 11, padding: "4px 8px", borderRadius: C.r2, cursor: "pointer", transition: "all .12s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.yellow; (e.currentTarget as HTMLElement).style.borderColor = "rgba(251,191,36,.4)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.t2; (e.currentTarget as HTMLElement).style.borderColor = C.border; }}>
                    <Bell size={11} /> Edit
                  </button>
                  {/* Delete */}
                  <button onClick={() => setDeleteTarget(s)} title="Delete script"
                    style={{ display: "flex", alignItems: "center", gap: 4, background: C.s2, border: `1px solid ${C.border}`, color: C.t2, fontSize: 11, padding: "4px 8px", borderRadius: C.r2, cursor: "pointer", transition: "all .12s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.red; (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,.4)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.t2; (e.currentTarget as HTMLElement).style.borderColor = C.border; }}>
                    <Trash2 size={11} /> Delete
                  </button>
                  {/* Expand toggle */}
                  <button onClick={() => setExpandedId(expanded ? null : s.id)}
                    style={{ display: "flex", background: "none", border: "none", color: C.t3, cursor: "pointer", padding: 2, transition: "transform .15s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              {/* Content preview / expanded */}
              <pre style={{ margin: 0, padding: expanded ? "14px 16px" : "10px 16px", color: C.cream, fontSize: 12, lineHeight: 1.8, fontFamily: "inherit", whiteSpace: "pre-wrap", maxHeight: expanded ? 500 : 80, overflowY: expanded ? "auto" : "hidden", position: "relative", transition: "max-height .2s" }}>
                {s.content}
                {!expanded && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 36, background: `linear-gradient(transparent, ${C.s})`, pointerEvents: "none" }} />}
              </pre>
            </div>
          );
        })}
      </div>

      {/* ── A/B Hook Tester ── */}
      <div style={{ marginTop: 24, border: `1px solid ${C.border}`, borderRadius: C.r, overflow: "hidden" }}>
        <button onClick={() => setAbOpen(o => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: C.s, border: "none", cursor: "pointer", color: C.text }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Zap size={12} color={C.accent} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>A/B Hook Tester</span>
            {abTests.length > 0 && <span style={{ fontSize: 10.5, color: C.t3 }}>{abTests.length} test{abTests.length !== 1 ? "s" : ""}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={e => { e.stopPropagation(); setAbForm(BLANK_AB); setShowABModal(true); }}
              style={{ fontSize: 11, color: C.accent, background: C.aBg, border: `1px solid ${C.aBd}`, borderRadius: C.r2, padding: "3px 10px", cursor: "pointer" }}>
              + New Test
            </button>
            {abOpen ? <ChevronLeft size={13} color={C.t3} style={{ transform: "rotate(-90deg)" }} /> : <ChevronRight size={13} color={C.t3} style={{ transform: "rotate(90deg)" }} />}
          </div>
        </button>
        {abOpen && (
          <div style={{ padding: "0 14px 14px", background: C.bg, borderTop: `1px solid ${C.border}` }}>
            {abTests.length === 0 && (
              <p style={{ fontSize: 12, color: C.t3, margin: "14px 0", textAlign: "center" }}>No A/B tests yet. Write 2 hook variants and track which resonates more.</p>
            )}
            {abTests.map(test => {
              const total = test.votesA + test.votesB;
              const pctA  = total > 0 ? Math.round((test.votesA / total) * 100) : 50;
              const pctB  = 100 - pctA;
              const winnerA = total > 0 && test.votesA > test.votesB;
              const winnerB = total > 0 && test.votesB > test.votesA;
              return (
                <div key={test.id} style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "12px 14px", marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{test.title || "Untitled test"}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 10.5, color: C.t3 }}>{new Date(test.createdAt).toLocaleDateString("en-MY",{day:"numeric",month:"short"})}</span>
                      <button onClick={() => setAbTests(prev => prev.filter(t => t.id !== test.id))}
                        style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", display: "flex" }}><X size={12} /></button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Hook A", text: test.hookA, votes: test.votesA, pct: pctA, winner: winnerA, onVote: () => setAbTests(prev => prev.map(t => t.id === test.id ? { ...t, votesA: t.votesA + 1 } : t)) },
                      { label: "Hook B", text: test.hookB, votes: test.votesB, pct: pctB, winner: winnerB, onVote: () => setAbTests(prev => prev.map(t => t.id === test.id ? { ...t, votesB: t.votesB + 1 } : t)) },
                    ].map(side => (
                      <div key={side.label} style={{ background: side.winner ? "rgba(187,240,136,.06)" : C.s2, border: `1px solid ${side.winner ? C.aBd : C.border}`, borderRadius: C.r2, padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: side.winner ? C.accent : C.t2, background: side.winner ? C.aBg : C.s3, padding: "1px 6px", borderRadius: 3 }}>
                            {side.label}{side.winner ? " 🏆" : ""}
                          </span>
                          <span style={{ fontSize: 11, color: C.t2, marginLeft: "auto" }}>{side.pct}%</span>
                        </div>
                        <p style={{ fontSize: 12, color: C.cream, margin: "0 0 8px", lineHeight: 1.5 }}>{side.text}</p>
                        <div style={{ height: 4, background: C.s3, borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
                          <div style={{ height: "100%", width: `${side.pct}%`, background: side.winner ? C.accent : C.blue, borderRadius: 2, transition: "width .3s" }} />
                        </div>
                        <button onClick={side.onVote}
                          style={{ display: "flex", alignItems: "center", gap: 4, width: "100%", justifyContent: "center", background: "transparent", border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 11.5, padding: "4px 8px", borderRadius: C.r2, cursor: "pointer" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.aBd; (e.currentTarget as HTMLElement).style.color = C.accent; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHi; (e.currentTarget as HTMLElement).style.color = C.t2; }}>
                          👍 {side.votes} save{side.votes !== 1 ? "s" : ""}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── A/B Modal ── */}
      {showABModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowABModal(false); }}>
          <div style={{ background: C.bg, border: `1px solid ${C.borderHi}`, borderRadius: C.r, width: "100%", maxWidth: 500, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>New A/B Hook Test</span>
              <button onClick={() => setShowABModal(false)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", display: "flex" }}><X size={15} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11.5, color: C.t2, display: "block", marginBottom: 4 }}>Test Name</label>
                <input value={abForm.title} onChange={e => setAbForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Property Reel Hook Test"
                  style={{ ...inp }} />
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: C.t2, display: "block", marginBottom: 4 }}>Hook A</label>
                <textarea value={abForm.hookA} onChange={e => setAbForm(f => ({ ...f, hookA: e.target.value }))} placeholder="First hook variant…" rows={3}
                  style={{ ...inp, resize: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: C.t2, display: "block", marginBottom: 4 }}>Hook B</label>
                <textarea value={abForm.hookB} onChange={e => setAbForm(f => ({ ...f, hookB: e.target.value }))} placeholder="Second hook variant…" rows={3}
                  style={{ ...inp, resize: "none" }} />
              </div>
              <Btn accent full onClick={() => {
                if (!abForm.hookA.trim() || !abForm.hookB.trim()) return;
                setAbTests(prev => [{ id: uid(), title: abForm.title, hookA: abForm.hookA, hookB: abForm.hookB, votesA: 0, votesB: 0, createdAt: new Date().toISOString() }, ...prev]);
                setShowABModal(false);
              }}>Create Test</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── New/Edit Modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: C.bg, border: `1px solid ${C.borderHi}`, borderRadius: C.r, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>{editId ? "Edit Script" : "New Script"}</p>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", padding: 2, display: "flex" }}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11.5, color: C.t2, display: "block", marginBottom: 4 }}>Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Hair Salon Cold DM" style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11.5, color: C.t2, display: "block", marginBottom: 4 }}>Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ScriptType }))} style={{ ...inp }}>
                    {SCRIPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11.5, color: C.t2, display: "block", marginBottom: 4 }}>Platform</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} style={{ ...inp }}>
                    {SCRIPT_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: C.t2, display: "block", marginBottom: 4 }}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...inp, colorScheme: "dark" }} />
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: C.t2, display: "block", marginBottom: 4 }}>Content *</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Paste or type your script, caption, or DM template…" rows={10}
                  style={{ ...inp, resize: "vertical" as const, lineHeight: 1.7 }} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <Btn onClick={() => setShowModal(false)}>Cancel</Btn>
                <Btn accent onClick={saveModal} disabled={!form.title.trim() || !form.content.trim()}>
                  {editId ? "Save Changes" : "Add Script"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div style={{ background: C.bg, border: `1px solid rgba(248,113,113,.3)`, borderRadius: C.r, width: "100%", maxWidth: 380, padding: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Delete script?</p>
            <p style={{ fontSize: 13, color: C.t2, margin: "0 0 20px", lineHeight: 1.5 }}>
              "<strong style={{ color: C.text }}>{deleteTarget.title}</strong>" will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setDeleteTarget(null)}>Cancel</Btn>
              <button
                onClick={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(248,113,113,.15)", border: "1px solid rgba(248,113,113,.3)", color: C.red, fontSize: 12.5, fontWeight: 600, padding: "7px 16px", borderRadius: C.r2, cursor: "pointer", transition: "all .15s" }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Copy toast ── */}
      {copyToast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.s2, border: `1px solid ${C.aBd}`, borderRadius: C.r, padding: "10px 20px", color: C.accent, fontSize: 13, fontWeight: 500, zIndex: 300, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(0,0,0,.5)", whiteSpace: "nowrap" }}>
          <CheckCheck size={14} /> {copyToast}
        </div>
      )}
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
  const router                        = useNextRouter();
  const [tab, setTab]                 = useState<Tab>("kanban");
  const [plannerPrefill, setPrefill]  = useState("");
  const [saved, setSaved]             = useLocal<SavedScript[]>("flogen_saved_scripts", SCRIPT_SEEDS);
  const [highlightDealId, setHighlightDealId] = useState<number | null>(null);
  const [calendarPrefill, setCalendarPrefill] = useState<{ topic: string; platform: PostPlat; type: PostType } | null>(null);
  const [scriptPrefill, setScriptPrefill] = useState("");
  // 9B: Nav badge alerts
  const [pipelineAlert, setPipelineAlert] = useState(false);
  const [calendarAlert, setCalendarAlert] = useState(false);
  useEffect(() => {
    try {
      const deals: Deal[] = JSON.parse(localStorage.getItem("flogen_pipeline") || "null") ?? INIT_DEALS;
      setPipelineAlert(deals.some(d => d.lastContact && Math.floor((Date.now() - new Date(d.lastContact).getTime()) / 86_400_000) >= 7));
      const posts: CalPost[] = JSON.parse(localStorage.getItem("flogen_calendar") || "null") ?? INIT_POSTS;
      const wk = new Set(getWeekDates(0).map(isoDate));
      setCalendarAlert(posts.filter(p => wk.has(p.date)).length < 2);
    } catch {}
  }, []);
  // 9D: Cmd+K → AI Assistant
  useEffect(() => {
    function ckHandler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); router.push("/agent"); }
    }
    window.addEventListener("keydown", ckHandler);
    return () => window.removeEventListener("keydown", ckHandler);
  }, [router]);

  // 5B: Read script prefill written by Competitors → Content Gap "Create this post →"
  useEffect(() => {
    try {
      const v = localStorage.getItem("flogen_script_prefill");
      if (v) {
        localStorage.removeItem("flogen_script_prefill");
        setScriptPrefill(v);
        setTab("agents");
      }
    } catch {}
  }, []);

  function useTrend(title: string) { setPrefill(title); setTab("agents"); }

  function goToPipeline(dealId: number) {
    setTab("pipeline");
    setHighlightDealId(dealId);
    setTimeout(() => setHighlightDealId(null), 3000);
  }

  function goToCalendar(post: { topic: string; platform: PostPlat; type: PostType }) {
    setCalendarPrefill(post);
    setTab("calendar");
    setTimeout(() => setCalendarPrefill(null), 800);
  }

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
        .fop-topbar { padding: 14px 28px; }
        .fop-tabs { padding: 0 24px; }
        .fop-tab-btn { flex-shrink: 0; }
        .fop-content { padding: 28px 28px 60px; }
        @media (max-width: 640px) {
          /* Hide the duplicate branding header — Next.js layout header is sufficient */
          .fop-topbar { display: none !important; }
          /* Tabs stick right below the Next.js layout header (56px) */
          .fop-tabs { position: sticky !important; top: 56px !important; z-index: 30 !important; padding: 0 0 0 12px !important; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .fop-tabs::-webkit-scrollbar { display: none; }
          .fop-content { padding: 12px 12px 60px !important; }
          /* Scrollable fixed-column grids */
          .fop-hscroll { overflow-x: auto; overflow-y: visible; -webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory; }
          .fop-hscroll::-webkit-scrollbar { height: 3px; }
          .fop-kanban-grid > *, .fop-pipeline-grid > *, .fop-calendar-grid > * { scroll-snap-align: start; }
          /* Compact Kanban cards */
          .fop-kcard { padding: 8px 10px !important; }
          .fop-kcard-title { font-size: 12px !important; line-height: 1.4 !important; }
          /* Wider columns on mobile — show ~1.3 cols at once so content isn't cramped */
          .fop-kanban-grid { grid-template-columns: repeat(4, 72vw) !important; min-width: unset !important; }
          .fop-pipeline-grid { grid-template-columns: repeat(5, 72vw) !important; min-width: unset !important; }
          .fop-calendar-grid { grid-template-columns: repeat(7, 44vw) !important; min-width: unset !important; }
          /* Full-width slide-over */
          .fop-slide-over { width: 100% !important; }
          /* Compact pipeline banner */
          .fop-pipe-banner { padding: 10px 12px !important; }
        }
      `}</style>

      <div className="fop-root" style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
        {/* Top bar */}
        <div className="fop-topbar" style={{ background: C.s, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: C.accent, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={15} color="#0a0a0a" strokeWidth={2.5} />
            </div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>Flogen AI</span>
              <span style={{ fontSize: 12, color: C.t2, marginLeft: 8 }}>Operating Dashboard</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="fop-topbar-date" style={{ fontSize: 12, color: C.t2 }}>{new Date().toLocaleDateString("en-MY",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.aBg, border: `1px solid ${C.aBd}`, padding: "4px 10px", borderRadius: 99 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, display: "inline-block", animation: "pulse 1.8s ease-in-out infinite" }} />
              <span style={{ fontSize: 11, color: C.accent, fontWeight: 500 }}>Claude Code: Active</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="fop-tabs" style={{ background: C.s, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 2 }}>
          {TABS.map(({ id, label, Icon }) => {
            const on = tab === id;
            const showRed   = id === "pipeline" && pipelineAlert;
            const showAmber = id === "calendar" && calendarAlert;
            return (
              <button key={id} onClick={() => setTab(id)} className="fop-tab-btn"
                style={{ background: "transparent", border: "none", borderBottom: `2px solid ${on ? C.accent : "transparent"}`, color: on ? C.text : C.t2, fontSize: 13, fontWeight: on ? 600 : 400, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all .15s", marginBottom: -1, whiteSpace: "nowrap", position: "relative" }}>
                <Icon size={13} />
                {label}
                {showRed   && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />}
                {showAmber && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="fop-content" style={{ maxWidth: 1400, margin: "0 auto" }}>
          {tab === "kanban"   && <KanbanSection onGoToPipeline={goToPipeline} />}
          {tab === "pipeline" && <PipelineSection highlightDealId={highlightDealId} />}
          {tab === "calendar" && <CalendarSection onPlannerPrefill={setPrefill} prefillPost={calendarPrefill} />}
          {tab === "agents"   && <AgentsSection plannerPrefill={plannerPrefill} scriptPrefill={scriptPrefill} onSave={handleSave} onGoToCalendar={goToCalendar} />}
          {tab === "trends"   && <TrendsSection onUseTrend={useTrend} />}
          {tab === "scripts"  && <ScriptsLibrary
            scripts={saved}
            onAdd={(s) => setSaved(prev => [{ ...s, id: uid() }, ...prev])}
            onUpdate={(s) => setSaved(prev => prev.map(x => x.id === s.id ? s : x))}
            onDelete={(id) => setSaved(prev => prev.filter(s => s.id !== id))}
          />}
        </div>
      </div>
    </>
  );
}
