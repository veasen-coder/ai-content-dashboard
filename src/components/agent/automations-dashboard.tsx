"use client";

import { useState, useCallback, useEffect } from "react";
import {
  CalendarDays, Clock, Play, Pause, ChevronDown, ChevronUp,
  CheckCircle2, GitBranch, MessageSquare, TrendingUp, BarChart3,
  Settings2, Activity, Zap, RefreshCw, Sparkles,
} from "lucide-react";
import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0a", s: "#111111", s2: "#171717", s3: "#1f1f1f",
  border: "rgba(255,255,255,0.07)", borderHi: "rgba(255,255,255,0.13)",
  accent: "#bbf088", aBg: "rgba(187,240,136,0.08)", aBd: "rgba(187,240,136,0.20)",
  text: "#f5f0e6", t2: "#9a9a9a", t3: "#4a4a4a",
  red: "#f87171", orange: "#fb923c", blue: "#60a5fa", purple: "#a78bfa",
  teal: "#2dd4bf", pink: "#e879f9",
  r: "8px", r2: "5px",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type AgentId =
  | "weekly-planner"
  | "auto-scheduler"
  | "caption-ab"
  | "deal-followup"
  | "trend-post"
  | "monthly-wrap";

interface AgentRun {
  id: number;
  agentId: AgentId;
  ts: number;
  summary: string;
  success: boolean;
  itemsCreated: number;
}

interface AgentCfg {
  enabled: boolean;
  postsPerWeek?: number;
  morningTime?: string;
  eveningTime?: string;
  strategy?: "morning" | "evening" | "auto";
  windowHours?: number;
  autoArchive?: boolean;
  thresholds?: Record<string, number>;
  autoCreate?: boolean;
  includeCarousel?: boolean;
  emailReport?: boolean;
  reportEmail?: string;
}

type AgentConfigs = Record<AgentId, AgentCfg>;

type PostType = "reel" | "carousel" | "static" | "story";
type PostPillar = "Pain Point" | "Education" | "Brand" | "Proof/Social";
type PostStatus = "Draft" | "Approved" | "Scheduled" | "Posted";
type Platform = "Instagram" | "XHS" | "Both";

interface CalPost {
  id: number;
  date: string;
  type: PostType;
  pillar: PostPillar;
  caption: string;
  status: PostStatus;
  platform: Platform;
}

type Stage = "prospect" | "demo" | "proposal" | "negotiation" | "closed" | "lost";

interface Deal {
  id: number;
  name: string;
  company: string;
  stage: Stage;
  value: string;
  lastContact: string;
  notes: string;
}

type KCol = "today" | "this-week" | "backlog" | "done";

interface KCard {
  id: number;
  title: string;
  col: KCol;
  tags: string[];
}

interface ABTest {
  id: number;
  title: string;
  hookA: string;
  hookB: string;
  votesA: number;
  votesB: number;
  createdAt: string;
}

interface AgentDef {
  id: AgentId;
  name: string;
  tagline: string;
  icon: React.ElementType;
  color: string;
  schedule: string;
  trigger: string;
  defaultEnabled: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekDates(): Date[] {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function daysAgo(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// useLocal
// ─────────────────────────────────────────────────────────────────────────────
function useLocal<T>(key: string, init: T): [T, (fn: (prev: T) => T) => void] {
  const [val, setVal] = useState<T>(init);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setVal(JSON.parse(raw) as T);
    } catch { /* ignore */ }
  }, [key]);

  const set = useCallback(
    (fn: (prev: T) => T) => {
      setVal(prev => {
        const next = fn(prev);
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    },
    [key],
  );
  return [val, set];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_CONFIGS: AgentConfigs = {
  "weekly-planner":  { enabled: true,  postsPerWeek: 5 },
  "auto-scheduler":  { enabled: true,  morningTime: "08:00", eveningTime: "19:00", strategy: "auto" },
  "caption-ab":      { enabled: true,  windowHours: 48, autoArchive: true },
  "deal-followup":   { enabled: true,  thresholds: { prospect: 7, demo: 3, proposal: 3, negotiation: 2 } },
  "trend-post":      { enabled: true,  autoCreate: true },
  "monthly-wrap":    { enabled: false, includeCarousel: true, emailReport: false, reportEmail: "" },
};

const AGENTS: AgentDef[] = [
  {
    id: "weekly-planner",
    name: "Weekly Content Planner",
    tagline: "Every Monday 9 AM — takes trending topic + last week's best post type and auto-generates a 5-post plan as Drafts in the Content Calendar.",
    icon: CalendarDays,
    color: C.accent,
    schedule: "Every Monday at 9:00 AM",
    trigger: "Scheduled · cron",
    defaultEnabled: true,
  },
  {
    id: "auto-scheduler",
    name: "Auto-Scheduler",
    tagline: "When a post flips from Draft → Approved, picks the optimal slot based on Malaysian SME engagement patterns and marks it Scheduled.",
    icon: Clock,
    color: C.blue,
    schedule: "On post → Approved",
    trigger: "Event-driven",
    defaultEnabled: true,
  },
  {
    id: "caption-ab",
    name: "Caption Variation A/B",
    tagline: "Generates 2 caption variants per post. After 48 h it auto-picks the winner by likes + saves and archives the loser to Scripts Library.",
    icon: GitBranch,
    color: C.purple,
    schedule: "Every 48 h check",
    trigger: "Periodic",
    defaultEnabled: true,
  },
  {
    id: "deal-followup",
    name: "Deal Follow-Up Agent",
    tagline: "Monitors Pipeline. If a contact hasn't been touched past its stage threshold, drafts a WhatsApp follow-up and drops a task into Kanban → Today.",
    icon: MessageSquare,
    color: C.orange,
    schedule: "Daily at 8:00 AM",
    trigger: "Scheduled · daily",
    defaultEnabled: true,
  },
  {
    id: "trend-post",
    name: "Trend-to-Post Agent",
    tagline: "Watches the Trends tab. When a new trend is flagged \"For Flogen AI\", auto-creates a Draft Reel in the Content Calendar with a suggested caption.",
    icon: TrendingUp,
    color: C.teal,
    schedule: "On trend flagged",
    trigger: "Event-driven",
    defaultEnabled: true,
  },
  {
    id: "monthly-wrap",
    name: "Monthly Wrap Agent",
    tagline: "Last day of the month — pulls analytics + pipeline wins + posts published and generates a performance card plus a shareable Instagram carousel draft.",
    icon: BarChart3,
    color: C.pink,
    schedule: "Last day of month",
    trigger: "Scheduled · monthly",
    defaultEnabled: false,
  },
];

const MOCK_TRENDS = [
  { id: 1, topic: "AI chatbot for Malaysian SMEs", score: 94 },
  { id: 2, topic: "WhatsApp Business API 2025 updates", score: 87 },
  { id: 3, topic: "Restaurant automation Klang Valley", score: 76 },
];

// ─────────────────────────────────────────────────────────────────────────────
// RUN FUNCTIONS — localStorage side-effects
// ─────────────────────────────────────────────────────────────────────────────
function runWeeklyPlanner(cfg: AgentCfg): { summary: string; itemsCreated: number } {
  const types: PostType[]   = ["reel", "carousel", "static", "story", "reel"];
  const pillars: PostPillar[] = ["Pain Point", "Education", "Brand", "Proof/Social", "Pain Point"];
  const captions = [
    "Berapa banyak lead yang hang terlepas semalam? Bot AI kami handle 24/7 — no off day, no missed enquiry. 👇",
    "3 sebab kenapa SME Malaysia PERLU AI WhatsApp agent sekarang (thread 🧵)",
    "Flogen AI — We build the bots. You build the brand. 🤖✨ DM us to see a live demo.",
    "Client win 🎉 Makan House PJ now handles 200+ weekly enquiries automatically. Real numbers incoming 📊",
    "Your competitor is already automating their customer service. Are you? 🔥",
  ];
  const n = Math.min(cfg.postsPerWeek ?? 5, 7);
  try {
    const existing: CalPost[] = JSON.parse(localStorage.getItem("flogen_calendar") || "[]") ?? [];
    const weekDates = getWeekDates();
    const newPosts: CalPost[] = weekDates.slice(0, n).map((d, i) => ({
      id: Date.now() + i,
      date: isoDate(d),
      type: types[i % types.length],
      pillar: pillars[i % pillars.length],
      caption: captions[i % captions.length],
      status: "Draft" as PostStatus,
      platform: "Instagram" as Platform,
    }));
    localStorage.setItem("flogen_calendar", JSON.stringify([...existing, ...newPosts]));
    return {
      summary: `Generated ${n} draft posts (Mon–Fri). Open Content Calendar to review & approve.`,
      itemsCreated: n,
    };
  } catch {
    return { summary: "Error writing to Content Calendar.", itemsCreated: 0 };
  }
}

function runAutoScheduler(cfg: AgentCfg): { summary: string; itemsCreated: number } {
  try {
    const posts: CalPost[] = JSON.parse(localStorage.getItem("flogen_calendar") || "[]") ?? [];
    const approved = posts.filter(p => p.status === "Approved");
    if (!approved.length) {
      return { summary: "No Approved posts found. Approve drafts in the Content Calendar first.", itemsCreated: 0 };
    }
    const slotLabel =
      cfg.strategy === "morning" ? "8:00 AM"
      : cfg.strategy === "evening" ? "7:00 PM"
      : "8:00 AM / 7:00 PM (peak slots)";
    const updated = posts.map(p => p.status === "Approved" ? { ...p, status: "Scheduled" as PostStatus } : p);
    localStorage.setItem("flogen_calendar", JSON.stringify(updated));
    return {
      summary: `Scheduled ${approved.length} post${approved.length > 1 ? "s" : ""} → ${slotLabel} based on Malaysian SME engagement data.`,
      itemsCreated: approved.length,
    };
  } catch {
    return { summary: "Error accessing Content Calendar.", itemsCreated: 0 };
  }
}

function runCaptionAB(cfg: AgentCfg): { summary: string; itemsCreated: number } {
  try {
    const tests: ABTest[] = JSON.parse(localStorage.getItem("flogen_ab_tests") || "[]") ?? [];
    const windowMs = (cfg.windowHours ?? 48) * 60 * 60 * 1000;
    const eligible = tests.filter(t =>
      (Date.now() - new Date(t.createdAt).getTime()) >= windowMs || t.votesA > 0 || t.votesB > 0,
    );
    if (!eligible.length) {
      return { summary: `No A/B tests ready. Tests need ${cfg.windowHours ?? 48}h of data to evaluate.`, itemsCreated: 0 };
    }
    if (cfg.autoArchive) {
      const scripts = JSON.parse(localStorage.getItem("flogen_scripts") || "[]");
      const newScripts = eligible.map((t, i) => {
        const winnerHook = t.votesA >= t.votesB ? t.hookA : t.hookB;
        return { id: Date.now() + i, title: `[A/B Winner] ${t.title}`, content: winnerHook, archivedAt: new Date().toISOString() };
      });
      localStorage.setItem("flogen_scripts", JSON.stringify([...scripts, ...newScripts]));
    }
    return {
      summary: `Evaluated ${eligible.length} test${eligible.length > 1 ? "s" : ""}. Winners archived to Scripts Library.`,
      itemsCreated: eligible.length,
    };
  } catch {
    return { summary: "Error reading A/B tests.", itemsCreated: 0 };
  }
}

function runDealFollowup(cfg: AgentCfg): { summary: string; itemsCreated: number } {
  try {
    const deals: Deal[] = JSON.parse(localStorage.getItem("flogen_pipeline") || "null") ?? [];
    const thresholds = cfg.thresholds ?? { prospect: 7, demo: 3, proposal: 3, negotiation: 2 };
    const stale = deals.filter(d => {
      if (d.stage === "closed" || d.stage === "lost") return false;
      const limit = thresholds[d.stage] ?? 5;
      return d.lastContact && daysAgo(d.lastContact) >= limit;
    });
    if (!stale.length) {
      if (!deals.length) {
        return { summary: "No pipeline data found. Visit the Operations → Pipeline tab to load deals.", itemsCreated: 0 };
      }
      return { summary: "All deals are within their follow-up thresholds. No action needed.", itemsCreated: 0 };
    }
    const kanban: Record<KCol, KCard[]> = JSON.parse(localStorage.getItem("flogen_kanban") || "null") ??
      { today: [], "this-week": [], backlog: [], done: [] };
    const newCards: KCard[] = stale.map((d, i) => ({
      id: Date.now() + i,
      title: `Follow up: ${d.name} (${d.company}) — ${daysAgo(d.lastContact)}d no contact`,
      col: "today" as KCol,
      tags: ["follow-up", "pipeline"],
    }));
    kanban.today = [...(kanban.today ?? []), ...newCards];
    localStorage.setItem("flogen_kanban", JSON.stringify(kanban));
    return {
      summary: `${stale.length} stale deal${stale.length > 1 ? "s" : ""} detected. Follow-up tasks added to Kanban → Today.`,
      itemsCreated: stale.length,
    };
  } catch {
    return { summary: "Error reading pipeline data.", itemsCreated: 0 };
  }
}

function runTrendPost(): { summary: string; itemsCreated: number } {
  try {
    const trend = MOCK_TRENDS[0];
    const existing: CalPost[] = JSON.parse(localStorage.getItem("flogen_calendar") || "[]") ?? [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newPost: CalPost = {
      id: Date.now(),
      date: isoDate(tomorrow),
      type: "reel",
      pillar: "Pain Point",
      caption: `Trending: ${trend.topic} 🔥\n\nHere's how Malaysian SMEs are using AI automation to stay ahead of this. Drop a 🤖 if you want to know more!`,
      status: "Draft",
      platform: "Instagram",
    };
    localStorage.setItem("flogen_calendar", JSON.stringify([...existing, newPost]));
    return {
      summary: `Draft Reel created for: "${trend.topic}" (trend score ${trend.score}). Review in Content Calendar.`,
      itemsCreated: 1,
    };
  } catch {
    return { summary: "Error creating trend post.", itemsCreated: 0 };
  }
}

function runMonthlyWrap(): { summary: string; itemsCreated: number } {
  try {
    const posts: CalPost[]  = JSON.parse(localStorage.getItem("flogen_calendar") || "[]") ?? [];
    const deals: Deal[]     = JSON.parse(localStorage.getItem("flogen_pipeline") || "null") ?? [];
    const published  = posts.filter(p => p.status === "Posted").length;
    const drafts     = posts.filter(p => p.status === "Draft").length;
    const closed     = deals.filter(d => d.stage === "closed");
    const mrr = closed.reduce((s, d) => {
      const m = d.value.match(/[\d,]+/);
      return s + (m ? parseInt(m[0].replace(/,/g, "")) : 0);
    }, 0);
    const month = new Date().toLocaleDateString("en-MY", { month: "long", year: "numeric" });
    const wrap = {
      month, generatedAt: new Date().toISOString(),
      postsPublished: published, draftsPending: drafts,
      dealsWon: closed.length, mrrRM: mrr,
      carousel: `📊 ${month} in Numbers\n\n✅ ${published} posts published\n🤝 ${closed.length} deals closed\n💰 RM ${mrr}/mo MRR\n\nGrowth is momentum. 🚀 Follow @flogenai for more.`,
    };
    localStorage.setItem("flogen_monthly_wrap", JSON.stringify(wrap));
    return {
      summary: `${month} wrap: ${published} posts published · ${closed.length} deals won · RM ${mrr}/mo MRR. Carousel caption ready.`,
      itemsCreated: 1,
    };
  } catch {
    return { summary: "Error generating monthly wrap.", itemsCreated: 0 };
  }
}

function dispatchRun(agentId: AgentId, cfg: AgentCfg): { summary: string; itemsCreated: number } {
  switch (agentId) {
    case "weekly-planner": return runWeeklyPlanner(cfg);
    case "auto-scheduler": return runAutoScheduler(cfg);
    case "caption-ab":     return runCaptionAB(cfg);
    case "deal-followup":  return runDealFollowup(cfg);
    case "trend-post":     return runTrendPost();
    case "monthly-wrap":   return runMonthlyWrap();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG PANEL
// ─────────────────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: "#1f1f1f", border: "1px solid rgba(255,255,255,0.13)",
  color: "#f5f0e6", borderRadius: 5, padding: "5px 10px",
  fontSize: 12.5, outline: "none", width: "100%", fontFamily: "inherit",
};

function ConfigPanel({ id, cfg, onChange }: { id: AgentId; cfg: AgentCfg; onChange: (k: string, v: unknown) => void }) {
  const row: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
  const lbl: React.CSSProperties = { fontSize: 11.5, color: C.t2 };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };

  if (id === "weekly-planner") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={row}>
        <span style={lbl}>Posts per week (1–7)</span>
        <input type="number" min={1} max={7} value={cfg.postsPerWeek ?? 5}
          onChange={e => onChange("postsPerWeek", parseInt(e.target.value))} style={inputStyle} />
      </div>
    </div>
  );

  if (id === "auto-scheduler") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={grid2}>
        <div style={row}>
          <span style={lbl}>Morning slot</span>
          <input type="time" value={cfg.morningTime ?? "08:00"}
            onChange={e => onChange("morningTime", e.target.value)} style={inputStyle} />
        </div>
        <div style={row}>
          <span style={lbl}>Evening slot</span>
          <input type="time" value={cfg.eveningTime ?? "19:00"}
            onChange={e => onChange("eveningTime", e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={row}>
        <span style={lbl}>Strategy</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["morning", "evening", "auto"] as const).map(s => (
            <button key={s} onClick={() => onChange("strategy", s)} style={{
              padding: "4px 10px", borderRadius: C.r2, fontSize: 12, cursor: "pointer",
              background: cfg.strategy === s ? C.aBg : "#1f1f1f",
              border: `1px solid ${cfg.strategy === s ? C.aBd : "rgba(255,255,255,0.1)"}`,
              color: cfg.strategy === s ? C.accent : C.t2,
            }}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );

  if (id === "caption-ab") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={row}>
        <span style={lbl}>Evaluation window (hours)</span>
        <input type="number" min={1} max={168} value={cfg.windowHours ?? 48}
          onChange={e => onChange("windowHours", parseInt(e.target.value))} style={inputStyle} />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={cfg.autoArchive ?? true}
          onChange={e => onChange("autoArchive", e.target.checked)} />
        <span style={{ fontSize: 12.5, color: C.t2 }}>Auto-archive losing variant to Scripts Library</span>
      </label>
    </div>
  );

  if (id === "deal-followup") {
    const thresholds = cfg.thresholds ?? { prospect: 7, demo: 3, proposal: 3, negotiation: 2 };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={lbl}>Days before follow-up task is created</span>
        <div style={grid2}>
          {(["prospect", "demo", "proposal", "negotiation"] as Stage[]).map(stage => (
            <div key={stage} style={row}>
              <span style={{ ...lbl, textTransform: "capitalize" }}>{stage}</span>
              <input type="number" min={1} max={30} value={thresholds[stage] ?? 5}
                onChange={e => onChange("thresholds", { ...thresholds, [stage]: parseInt(e.target.value) })}
                style={inputStyle} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (id === "trend-post") return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <input type="checkbox" checked={cfg.autoCreate ?? true}
        onChange={e => onChange("autoCreate", e.target.checked)} />
      <span style={{ fontSize: 12.5, color: C.t2 }}>Auto-create Draft when trend score &gt; 80</span>
    </label>
  );

  if (id === "monthly-wrap") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={cfg.includeCarousel ?? true}
          onChange={e => onChange("includeCarousel", e.target.checked)} />
        <span style={{ fontSize: 12.5, color: C.t2 }}>Generate Instagram carousel caption</span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={cfg.emailReport ?? false}
          onChange={e => onChange("emailReport", e.target.checked)} />
        <span style={{ fontSize: 12.5, color: C.t2 }}>Email report on completion</span>
      </label>
      {cfg.emailReport && (
        <input type="email" placeholder="your@email.com" value={cfg.reportEmail ?? ""}
          onChange={e => onChange("reportEmail", e.target.value)} style={inputStyle} />
      )}
    </div>
  );

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT CARD
// ─────────────────────────────────────────────────────────────────────────────
interface AgentCardProps {
  def: AgentDef;
  cfg: AgentCfg;
  runs: AgentRun[];
  running: boolean;
  onToggle: () => void;
  onRunNow: () => void;
  onConfigChange: (k: string, v: unknown) => void;
}

function AgentCard({ def, cfg, runs, running, onToggle, onRunNow, onConfigChange }: AgentCardProps) {
  const [showLog, setShowLog]     = useState(false);
  const [showCfg, setShowCfg]     = useState(false);
  const [justRan, setJustRan]     = useState(false);

  const Icon = def.icon;
  const lastRun = runs[0];
  const enabled = cfg.enabled;

  function handleRun() {
    onRunNow();
    setJustRan(true);
    setTimeout(() => setJustRan(false), 3000);
  }

  const statusColor  = running ? C.orange : enabled ? C.accent : C.t3;
  const statusLabel  = running ? "Running…" : enabled ? "Active" : "Paused";
  const statusBg     = running ? "rgba(251,146,60,.12)" : enabled ? C.aBg : "rgba(74,74,74,.15)";
  const statusBorder = running ? "rgba(251,146,60,.3)" : enabled ? C.aBd : "rgba(74,74,74,.35)";

  return (
    <div style={{
      background: C.s2, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: 18, display: "flex", flexDirection: "column", gap: 14,
      transition: "border-color 0.15s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHi; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `${def.color}15`, border: `1px solid ${def.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={18} color={def.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{def.name}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
              background: statusBg, border: `1px solid ${statusBorder}`, color: statusColor,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {running && (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", background: C.orange,
                  animation: "pulse-dot 1.2s ease-in-out infinite", display: "inline-block",
                }} />
              )}
              {statusLabel}
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: C.t2, margin: 0, lineHeight: 1.55 }}>{def.tagline}</p>
        </div>
      </div>

      {/* ── Schedule strip ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
        padding: "7px 10px", borderRadius: C.r2,
        background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
      }}>
        <Clock size={12} color={C.t2} />
        <span style={{ fontSize: 11.5, color: C.t2 }}>{def.schedule}</span>
        <span style={{ fontSize: 11, color: C.t3 }}>·</span>
        <span style={{
          fontSize: 11, color: def.color, background: `${def.color}12`,
          border: `1px solid ${def.color}25`, borderRadius: 4, padding: "1px 6px",
        }}>{def.trigger}</span>
      </div>

      {/* ── Last run ── */}
      {lastRun ? (
        <div style={{
          padding: "9px 12px", borderRadius: C.r2,
          background: lastRun.success ? "rgba(187,240,136,0.05)" : "rgba(248,113,113,0.06)",
          border: `1px solid ${lastRun.success ? "rgba(187,240,136,0.15)" : "rgba(248,113,113,0.2)"}`,
          display: "flex", gap: 8, alignItems: "flex-start",
        }}>
          <CheckCircle2 size={13} color={lastRun.success ? C.accent : C.red} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, color: C.text, margin: "0 0 2px", lineHeight: 1.5 }}>{lastRun.summary}</p>
            <span style={{ fontSize: 11, color: C.t3 }}>{timeAgo(lastRun.ts)}</span>
          </div>
          {lastRun.itemsCreated > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: C.accent,
              background: C.aBg, border: `1px solid ${C.aBd}`,
              borderRadius: 4, padding: "2px 7px", flexShrink: 0,
            }}>+{lastRun.itemsCreated}</span>
          )}
        </div>
      ) : (
        <div style={{
          padding: "9px 12px", borderRadius: C.r2,
          background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`,
          fontSize: 12.5, color: C.t3,
        }}>
          No runs yet — click Run Now to trigger manually.
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 14px", borderRadius: C.r2, fontSize: 12.5, fontWeight: 600,
            cursor: running ? "not-allowed" : "pointer",
            background: running ? "rgba(187,240,136,0.05)" : C.aBg,
            border: `1px solid ${running ? C.aBd : C.aBd}`,
            color: running ? C.t2 : C.accent, transition: "all 0.12s",
            opacity: running ? 0.6 : 1, flex: 1, justifyContent: "center",
          }}
          onMouseEnter={e => { if (!running) (e.currentTarget as HTMLElement).style.background = "rgba(187,240,136,0.14)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = running ? "rgba(187,240,136,0.05)" : C.aBg; }}
        >
          {running ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={13} />}
          {running ? "Running…" : justRan ? "Done ✓" : "Run Now"}
        </button>

        <button
          onClick={onToggle}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 14px", borderRadius: C.r2, fontSize: 12.5,
            cursor: "pointer",
            background: "transparent",
            border: `1px solid ${C.borderHi}`,
            color: C.t2, transition: "all 0.12s",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.color = enabled ? C.red : C.accent;
            el.style.borderColor = enabled ? "rgba(248,113,113,0.4)" : C.aBd;
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.color = C.t2;
            el.style.borderColor = C.borderHi;
          }}
        >
          {enabled ? <Pause size={13} /> : <Play size={13} />}
          {enabled ? "Pause" : "Resume"}
        </button>

        <button
          onClick={() => setShowCfg(o => !o)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: C.r2,
            background: showCfg ? "rgba(255,255,255,0.07)" : "transparent",
            border: `1px solid ${C.borderHi}`, cursor: "pointer", color: C.t2,
            transition: "all 0.12s", flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.t2; }}
          title="Configure"
        >
          <Settings2 size={14} />
        </button>
      </div>

      {/* ── Config panel ── */}
      {showCfg && (
        <div style={{
          padding: 12, borderRadius: C.r2,
          background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`,
        }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: C.t2, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Configuration
          </p>
          <ConfigPanel id={def.id} cfg={cfg} onChange={onConfigChange} />
        </div>
      )}

      {/* ── Activity log toggle ── */}
      {runs.length > 0 && (
        <div>
          <button
            onClick={() => setShowLog(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer",
              color: C.t3, fontSize: 11.5, padding: 0, transition: "color 0.12s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.t2; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.t3; }}
          >
            <Activity size={11} />
            {showLog ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {runs.length} run{runs.length > 1 ? "s" : ""} logged
          </button>

          {showLog && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {runs.slice(0, 5).map(r => (
                <div key={r.id} style={{
                  display: "flex", gap: 8, alignItems: "flex-start",
                  padding: "7px 10px", borderRadius: C.r2,
                  background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`,
                }}>
                  <CheckCircle2 size={11} color={C.accent} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: C.text, margin: "0 0 1px", lineHeight: 1.4 }}>{r.summary}</p>
                    <span style={{ fontSize: 11, color: C.t3 }}>{timeAgo(r.ts)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export function AutomationsDashboard() {
  const [configs, setConfigs] = useLocal<AgentConfigs>("flogen_agent_config", DEFAULT_CONFIGS);
  const [runs, setRuns]       = useLocal<AgentRun[]>("flogen_agent_runs", []);
  const [runningAgent, setRunningAgent] = useState<AgentId | null>(null);

  function handleRunNow(agentId: AgentId) {
    if (runningAgent) return;
    setRunningAgent(agentId);
    const cfg = configs[agentId] ?? DEFAULT_CONFIGS[agentId];
    setTimeout(() => {
      const result = dispatchRun(agentId, cfg);
      const run: AgentRun = {
        id: Date.now(), agentId, ts: Date.now(),
        summary: result.summary, success: true, itemsCreated: result.itemsCreated,
      };
      setRuns(prev => [run, ...prev].slice(0, 100));
      setRunningAgent(null);
    }, 1400 + Math.random() * 800);
  }

  function handleToggle(agentId: AgentId) {
    setConfigs(prev => ({
      ...prev,
      [agentId]: { ...prev[agentId], enabled: !(prev[agentId]?.enabled ?? true) },
    }));
  }

  function handleConfigChange(agentId: AgentId, key: string, val: unknown) {
    setConfigs(prev => ({
      ...prev,
      [agentId]: { ...prev[agentId], [key]: val },
    }));
  }

  const activeCount  = AGENTS.filter(a => configs[a.id]?.enabled ?? a.defaultEnabled).length;
  const totalRuns    = runs.length;
  const itemsCreated = runs.reduce((s, r) => s + r.itemsCreated, 0);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:.3; } }
      `}</style>

      <div style={{ background: C.bg, minHeight: "100%", color: C.text, padding: 24 }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: C.aBg, border: `1px solid ${C.aBd}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={17} color={C.accent} />
            </div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: C.text, letterSpacing: "-0.01em" }}>
                Automations
              </h1>
              <p style={{ fontSize: 12, color: C.t2, margin: 0 }}>
                Intelligent agents that run your content & pipeline on autopilot
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { label: "Agents active", value: `${activeCount} / ${AGENTS.length}`, color: C.accent },
              { label: "Total runs",    value: totalRuns,  color: C.blue },
              { label: "Items created", value: itemsCreated, color: C.purple },
            ].map(stat => (
              <div key={stat.label} style={{
                padding: "7px 14px", borderRadius: C.r2,
                background: C.s2, border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: stat.color }}>{stat.value}</span>
                <span style={{ fontSize: 12, color: C.t2 }}>{stat.label}</span>
              </div>
            ))}
            <div style={{
              marginLeft: "auto", padding: "7px 12px", borderRadius: C.r2,
              background: C.aBg, border: `1px solid ${C.aBd}`,
              display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.t2,
            }}>
              <Sparkles size={12} color={C.accent} />
              <span>Agents write directly to your Calendar, Kanban & Scripts</span>
            </div>
          </div>
        </div>

        {/* ── Agent grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
          gap: 14,
        }}>
          {AGENTS.map(def => {
            const cfg = { ...DEFAULT_CONFIGS[def.id], ...(configs[def.id] ?? {}) };
            const agentRuns = runs.filter(r => r.agentId === def.id);
            return (
              <AgentCard
                key={def.id}
                def={def}
                cfg={cfg}
                runs={agentRuns}
                running={runningAgent === def.id}
                onToggle={() => handleToggle(def.id)}
                onRunNow={() => handleRunNow(def.id)}
                onConfigChange={(k, v) => handleConfigChange(def.id, k, v)}
              />
            );
          })}
        </div>

        <p style={{ fontSize: 11, color: C.t3, textAlign: "center", marginTop: 32 }}>
          Agents write to: flogen_calendar · flogen_kanban · flogen_scripts · flogen_monthly_wrap
        </p>
      </div>
    </>
  );
}
