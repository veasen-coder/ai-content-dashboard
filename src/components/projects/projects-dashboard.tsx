"use client";

import { useState, useEffect } from "react";
import {
  Plus, Check, ChevronDown, ChevronUp, Copy, CheckCheck,
  Zap, Target, Calendar, Brain, Layers, ArrowRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// BRAND TOKENS — Organic Brutalism
// ─────────────────────────────────────────────────────────────────────────────
const B = {
  bg:           "#0d1a0d",
  surface:      "#1a2e1a",
  surfaceHi:    "#1f3620",
  accent:       "#a8ff3e",
  accentDark:   "#6bcc00",
  text:         "#f0ede6",
  textMuted:    "#6b8f6b",
  border:       "#2a3e2a",
  borderHi:     "#3a5a3a",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Priority = "HIGH" | "MED" | "LOW";
type Col      = "today" | "week" | "backlog";
type Tab      = "sprint" | "projects" | "agents" | "focus";

interface Task    { id: number; text: string; project: string; priority: Priority; done: boolean }
interface Project { id: number; name: string; status: "ACTIVE" | "IN PROGRESS" | "PLANNING"; progress: number; description: string; notes: string; expanded: boolean }
interface Agent   { id: number; name: string; description: string; model: "Sonnet" | "Haiku"; active: boolean; open: boolean }

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TAG_COLORS: Record<string, [string, string]> = {
  Shopify:    ["#a8ff3e", "#0a1a00"],
  Marketing:  ["#ff8c42", "#1a0800"],
  Sales:      ["#4ecdc4", "#001918"],
  JCI:        ["#ffe66d", "#1a1500"],
  Product:    ["#c77dff", "#120018"],
  Research:   ["#74b9ff", "#001220"],
};

const PRIORITY_COLOR: Record<Priority, { bg: string; fg: string }> = {
  HIGH: { bg: "#dc2626", fg: "#fff" },
  MED:  { bg: "#d97706", fg: "#000" },
  LOW:  { bg: "#1a2e1a", fg: "#6b8f6b" },
};

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  ACTIVE:        { color: "#a8ff3e", bg: "rgba(168,255,62,.10)", border: "rgba(168,255,62,.25)" },
  "IN PROGRESS": { color: "#ffe66d", bg: "rgba(255,230,109,.10)", border: "rgba(255,230,109,.25)" },
  PLANNING:      { color: "#74b9ff", bg: "rgba(116,185,255,.10)", border: "rgba(116,185,255,.25)" },
};

const COL_META: Record<Col, { label: string; accent: string }> = {
  today:   { label: "TODAY",     accent: "#a8ff3e" },
  week:    { label: "THIS WEEK", accent: "#ffe66d" },
  backlog: { label: "BACKLOG",   accent: "#74b9ff" },
};

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────
const SEED_TASKS: Record<Col, Task[]> = {
  today: [
    { id: 1, text: "Finalize property agent landing page", project: "Shopify",   priority: "HIGH", done: false },
    { id: 2, text: "Draft Instagram post",                 project: "Marketing", priority: "MED",  done: false },
  ],
  week: [
    { id: 3, text: "Send pitch to 3 SME prospects",  project: "Sales", priority: "HIGH", done: false },
    { id: 4, text: "Update JCI April calendar",      project: "JCI",   priority: "MED",  done: false },
  ],
  backlog: [
    { id: 5, text: "Build aesthetic clinic chatbot demo", project: "Product",  priority: "MED", done: false },
    { id: 6, text: "Explore Xiaohongshu strategy",        project: "Research", priority: "LOW", done: false },
  ],
};

const SEED_PROJECTS: Project[] = [
  { id: 1, name: "buyflogen.com Shopify",   status: "ACTIVE",      progress: 65, description: "Organic Brutalism storefront, industry landing pages",     notes: "Working on property agent + aesthetic clinic verticals.\nNext: hero copy and mobile layout.", expanded: false },
  { id: 2, name: "Great Haus Demo",         status: "IN PROGRESS", progress: 80, description: "WhatsApp AI agent pitch for real estate client",           notes: "Demo script ready. Need walkthrough video.\nClient meeting TBC — follow up Friday.",         expanded: false },
  { id: 3, name: "SME Prospecting",         status: "ACTIVE",      progress: 40, description: "Selangor & KL outreach pipeline",                          notes: "15 leads. 3 replied.\nFollow up: Puchong clinic, Shah Alam e-commerce, Damansara salon.",  expanded: false },
  { id: 4, name: "JCI Youth IICS 2026",     status: "PLANNING",    progress: 25, description: "Marketing calendar, events, sponsorship",                  notes: "Q2 calendar draft due Apr 15.\nConfirm sponsorship tiers with president.",                   expanded: false },
];

const AGENT_PROMPTS: Record<string, string> = {
  "sprint-prioritizer": `---
name: sprint-prioritizer
model: claude-sonnet-4-6
description: Plans weekly sprints and prioritizes backlog for Flogen AI
---

You are the Sprint Prioritizer agent for Flogen AI, a Malaysian B2B WhatsApp AI Agency run by Veasen.

Your job:
1. Review the backlog and categorize tasks by impact vs effort
2. Recommend which 3-5 tasks belong in TODAY vs THIS WEEK
3. Flag blockers, dependencies, and things to defer or delegate
4. Keep the founder focused on revenue-generating activities

Context:
- Solo founder (Veasen), based in Malaysia
- Active projects: buyflogen.com Shopify, Great Haus Demo, SME Prospecting, JCI Youth IICS 2026
- Revenue goal: First 3 WhatsApp AI clients by end of Q2 2026

Output format:
## TODAY (must-do, highest impact)
## THIS WEEK (important, can be scheduled)
## DEFER (low urgency, move to backlog)
## BLOCKERS (decisions or dependencies needed)`,

  "project-shipper": `---
name: project-shipper
model: claude-sonnet-4-6
description: Generates launch checklists and tracks deliverables for Flogen AI projects
---

You are the Project Shipper agent for Flogen AI.
Ensure projects get shipped on time with concrete deliverables and launch checklists.

Known projects:
- buyflogen.com: Shopify storefront, Organic Brutalism design, industry verticals
- Great Haus Demo: WhatsApp AI agent for real estate (listings, bookings, FAQ)
- SME Prospecting: Klang Valley outreach pipeline
- JCI Youth IICS 2026: Conference marketing and events

Launch checklist template:
## Technical
- [ ] Development complete & QA tested on mobile
- [ ] Production deployment verified

## Content
- [ ] Copy finalized and proofed
- [ ] Images/assets exported and compressed
- [ ] Social announcement posts written

## Business
- [ ] Client approval received
- [ ] Contract signed & payment confirmed

## Launch
- [ ] Go-live executed
- [ ] Announcement published
- [ ] 48h follow-up scheduled`,

  "content-creator": `---
name: content-creator
model: claude-sonnet-4-6
description: Writes Instagram, Shopify, and pitch copy in Malaysian English
---

You are the Content Creator agent for Flogen AI.
Write all content across platforms with the Flogen AI voice.

Platform scope:
1. Instagram captions — educational, case studies, inspiration, BTS
2. Shopify landing pages — conversion-focused, industry-specific
3. Sales pitches and cold outreach emails
4. Xiaohongshu posts — Simplified Chinese, lifestyle tone

Brand voice: Confident, modern, results-first. Speak to business owners, not tech people.

Content pillars:
- Education: How WhatsApp AI works, what automation means for SMEs
- Social proof: Real Malaysian case studies and measurable results
- Inspiration: Business transformation, time saved, revenue grown
- Promotion: Service offerings, limited availability, clear CTA

Malaysian English style:
- Occasional "lah", "lor", "kan" for warmth (sparingly)
- Reference: Selangor, KL, Malaysian SME culture, prices in MYR
- Code-switch naturally (Malay / Chinese / English)

Always deliver: 2 caption variants (A/B) + 6-8 hashtags.`,

  "sme-researcher": `---
name: sme-researcher
model: claude-haiku-4-5
description: Researches Malaysian SME prospects and competitor intel for Flogen AI
---

You are the SME Researcher agent for Flogen AI.
Identify and qualify Malaysian SME prospects for WhatsApp AI agent services.

Target criteria:
- Sectors: F&B, retail, clinics/salons, property agents, e-commerce, education centres
- Geography: Klang Valley (Selangor, KL, Putrajaya), Penang, Johor Bahru
- Size: 1-50 employees, high WhatsApp volume, customer-facing
- Pain points: Manual replies, after-hours enquiries, appointment chaos, FAQ overload

For each prospect, output a table:
| Field           | Value                        |
|-----------------|------------------------------|
| Company         | Name + industry              |
| Instagram       | Handle + active (Y/N)        |
| WhatsApp Volume | Low / Med / High             |
| Pain Point      | 1 sentence                   |
| AI Use Case     | Specific recommendation      |
| Outreach Angle  | Cold / Referral / Event      |
| Priority Score  | 1–10                         |

Also report competitor intelligence:
- Other Malaysian WhatsApp AI providers
- Their pricing, positioning, and client verticals
- Gaps Flogen AI can own`,
};

const SEED_AGENTS: Agent[] = [
  { id: 1, name: "sprint-prioritizer", description: "Plans weekly sprints and prioritizes backlog",                   model: "Sonnet", active: true,  open: false },
  { id: 2, name: "project-shipper",    description: "Generates launch checklists and tracks deliverables",           model: "Sonnet", active: true,  open: false },
  { id: 3, name: "content-creator",    description: "Writes Instagram, Shopify, and pitch copy in Malaysian English", model: "Sonnet", active: true,  open: false },
  { id: 4, name: "sme-researcher",     description: "Researches Malaysian SME prospects and competitor intel",        model: "Haiku",  active: false, open: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
let _uid = 100;
function uid() { return ++_uid; }

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const days  = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  return Math.ceil((days + start.getDay() + 1) / 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function Tag({ tag }: { tag: string }) {
  const [bg, fg] = TAG_COLORS[tag] ?? [B.border, B.textMuted];
  return (
    <span style={{ background: bg, color: fg, fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", padding: "2px 7px", borderRadius: 2 }}>
      {tag.toUpperCase()}
    </span>
  );
}

function PBadge({ p }: { p: Priority }) {
  const { bg, fg } = PRIORITY_COLOR[p];
  return (
    <span style={{ background: bg, color: fg, fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 6px", borderRadius: 0 }}>
      {p}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), 120); return () => clearTimeout(t); }, [value]);
  return (
    <div style={{ height: 3, background: B.border, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, width: `${w}%`, background: B.accent, transition: "width 1.3s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRINT BOARD
// ─────────────────────────────────────────────────────────────────────────────
function TaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const [flash, setFlash] = useState(false);
  function handleClick() {
    if (!task.done) { setFlash(true); setTimeout(() => setFlash(false), 500); }
    onToggle();
  }
  return (
    <div onClick={handleClick} style={{
      background: flash ? "rgba(168,255,62,.12)" : B.surface,
      border: `1px solid ${flash ? B.accent : B.border}`,
      padding: "10px 12px", cursor: "pointer",
      opacity: task.done ? 0.38 : 1,
      transition: "all .22s ease",
      position: "relative",
    }}>
      {flash && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <Check size={22} color={B.accent} strokeWidth={2.5} />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <div style={{ width: 15, height: 15, border: `2px solid ${task.done ? B.accent : B.borderHi}`, background: task.done ? B.accent : "transparent", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {task.done && <Check size={9} color="#0d1a0d" strokeWidth={3} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: B.text, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.45, textDecoration: task.done ? "line-through" : "none", margin: 0, textDecorationColor: B.textMuted }}>
            {task.text}
          </p>
          <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
            <Tag tag={task.project} />
            <PBadge p={task.priority} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AddTaskInline({ accent, onAdd }: { accent: string; onAdd: (t: string, p: string, pr: Priority) => void }) {
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState("");
  const [proj, setProj]       = useState("Shopify");
  const [prior, setPrior]     = useState<Priority>("MED");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim(), proj, prior);
    setText(""); setOpen(false);
  }

  const btnBase: React.CSSProperties = {
    fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.08em", padding: "6px 12px", cursor: "pointer", borderRadius: 0, border: "none",
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ ...btnBase, display: "flex", alignItems: "center", gap: 6, color: B.textMuted, background: "transparent", border: `1px dashed ${B.border}`, width: "100%", transition: "all .18s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accent; (e.currentTarget as HTMLElement).style.color = accent; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = B.border; (e.currentTarget as HTMLElement).style.color = B.textMuted; }}>
      <Plus size={11} /> ADD TASK
    </button>
  );

  const inputStyle: React.CSSProperties = { background: B.bg, border: `1px solid ${B.borderHi}`, color: B.text, fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: "7px 9px", outline: "none", borderRadius: 0, width: "100%", boxSizing: "border-box" };
  const selectStyle: React.CSSProperties = { background: B.bg, border: `1px solid ${B.borderHi}`, color: B.text, fontFamily: "'Space Mono',monospace", fontSize: 11, padding: "5px 6px", borderRadius: 0, flex: 1 };

  return (
    <form onSubmit={submit} style={{ border: `1px solid ${accent}`, background: B.surface, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <input autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="Task name…" style={inputStyle} />
      <div style={{ display: "flex", gap: 6 }}>
        <select value={proj} onChange={e => setProj(e.target.value)} style={selectStyle}>
          {Object.keys(TAG_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={prior} onChange={e => setPrior(e.target.value as Priority)} style={{ ...selectStyle, flex: "none" }}>
          <option value="HIGH">HIGH</option><option value="MED">MED</option><option value="LOW">LOW</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" style={{ ...btnBase, background: accent, color: "#0d1a0d", flex: 1 }}>ADD</button>
        <button type="button" onClick={() => setOpen(false)} style={{ ...btnBase, background: "transparent", color: B.textMuted, border: `1px solid ${B.border}` }}>CANCEL</button>
      </div>
    </form>
  );
}

function SprintBoard() {
  const [tasks, setTasks] = useState<Record<Col, Task[]>>(SEED_TASKS);

  function toggle(col: Col, id: number) {
    setTasks(p => ({ ...p, [col]: p[col].map(t => t.id === id ? { ...t, done: !t.done } : t) }));
  }
  function addTask(col: Col, text: string, project: string, priority: Priority) {
    setTasks(p => ({ ...p, [col]: [...p[col], { id: uid(), text, project, priority, done: false }] }));
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: B.border }}>
      {(["today", "week", "backlog"] as Col[]).map(col => {
        const { label, accent } = COL_META[col];
        const pending = tasks[col].filter(t => !t.done).length;
        return (
          <div key={col} style={{ background: B.bg }}>
            {/* Column header */}
            <div style={{ padding: "13px 16px", borderBottom: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: accent, letterSpacing: "0.12em" }}>{label}</span>
              <span style={{ background: accent, color: "#0d1a0d", fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700, minWidth: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{pending}</span>
            </div>
            {/* Tasks */}
            <div style={{ padding: "12px 12px 0", display: "flex", flexDirection: "column", gap: 7 }}>
              {tasks[col].map(t => <TaskCard key={t.id} task={t} onToggle={() => toggle(col, t.id)} />)}
            </div>
            {/* Add */}
            <div style={{ padding: 12 }}>
              <AddTaskInline accent={accent} onAdd={(text, project, priority) => addTask(col, text, project, priority)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT GRID
// ─────────────────────────────────────────────────────────────────────────────
function ProjectCard({ project, onToggle }: { project: Project; onToggle: () => void }) {
  const ss = STATUS_STYLE[project.status];
  return (
    <div style={{ background: B.surface, border: `1px solid ${project.expanded ? B.accent : B.border}`, transition: "border-color .2s", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <h3 style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: B.text, margin: 0, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
            {project.name}
          </h3>
          <span style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", padding: "3px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
            {project.status}
          </span>
        </div>
        <p style={{ color: B.textMuted, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "0 0 13px", lineHeight: 1.5 }}>
          {project.description}
        </p>
        <ProgressBar value={project.progress} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: B.textMuted }}>PROGRESS</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: B.accent, fontWeight: 700 }}>{project.progress}%</span>
        </div>
      </div>
      {/* Expand toggle */}
      <div onClick={onToggle} style={{ padding: "7px 16px", borderTop: `1px solid ${B.border}`, display: "flex", alignItems: "center", gap: 5, cursor: "pointer", color: project.expanded ? B.accent : B.textMuted, transition: "color .2s" }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: "0.09em" }}>
          {project.expanded ? "CLOSE NOTES" : "VIEW NOTES"}
        </span>
        {project.expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </div>
      {/* Notes panel */}
      {project.expanded && (
        <div style={{ padding: "13px 16px", borderTop: `1px solid ${B.accent}`, background: "rgba(168,255,62,.04)" }}>
          <p style={{ color: B.text, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.75, margin: 0, whiteSpace: "pre-line" }}>
            {project.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function ProjectGrid() {
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 1, background: B.border }}>
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} onToggle={() => setProjects(prev => prev.map(x => x.id === p.id ? { ...x, expanded: !x.expanded } : x))} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT MANAGER
// ─────────────────────────────────────────────────────────────────────────────
function AgentRow({ agent, onToggleActive, onToggleOpen }: { agent: Agent; onToggleActive: () => void; onToggleOpen: () => void }) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedMd, setCopiedMd]         = useState(false);
  const prompt = AGENT_PROMPTS[agent.name] ?? "";

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000);
  }
  async function copyMd() {
    await navigator.clipboard.writeText(prompt); // frontmatter already included
    setCopiedMd(true); setTimeout(() => setCopiedMd(false), 2000);
  }

  const btnSm: React.CSSProperties = { fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", padding: "5px 11px", cursor: "pointer", borderRadius: 0, display: "flex", alignItems: "center", gap: 5, transition: "all .18s" };

  return (
    <div style={{ border: `1px solid ${agent.open ? B.accent : B.border}`, background: B.surface, transition: "border-color .2s", overflow: "hidden" }}>
      {/* Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", flexWrap: "wrap" }}>
        {/* Toggle */}
        <button onClick={onToggleActive} style={{ width: 34, height: 19, background: agent.active ? B.accent : B.border, borderRadius: 10, border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
          <div style={{ width: 15, height: 15, borderRadius: "50%", background: agent.active ? "#0d1a0d" : B.textMuted, position: "absolute", top: 2, left: agent.active ? 17 : 2, transition: "left .2s" }} />
        </button>
        {/* Name + desc */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: agent.active ? B.text : B.textMuted, letterSpacing: "-0.01em" }}>{agent.name}</span>
            <span style={{ background: agent.model === "Sonnet" ? "rgba(168,255,62,.12)" : "rgba(116,185,255,.12)", color: agent.model === "Sonnet" ? B.accent : "#74b9ff", fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700, padding: "2px 7px", letterSpacing: "0.07em" }}>
              {agent.model.toUpperCase()}
            </span>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: agent.active ? "#4ade80" : B.textMuted, letterSpacing: "0.08em" }}>
              {agent.active ? "● ACTIVE" : "○ INACTIVE"}
            </span>
          </div>
          <p style={{ color: B.textMuted, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "4px 0 0" }}>{agent.description}</p>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={copyMd} style={{ ...btnSm, background: "transparent", border: `1px solid ${copiedMd ? B.accent : B.border}`, color: copiedMd ? B.accent : B.textMuted }}>
            {copiedMd ? <CheckCheck size={11} /> : <Copy size={11} />}
            {copiedMd ? "COPIED!" : "COPY .MD"}
          </button>
          <button onClick={onToggleOpen} style={{ ...btnSm, background: agent.open ? B.accent : "transparent", border: `1px solid ${agent.open ? B.accent : B.border}`, color: agent.open ? "#0d1a0d" : B.textMuted }}>
            {agent.open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            VIEW PROMPT
          </button>
        </div>
      </div>
      {/* Prompt block */}
      {agent.open && (
        <div style={{ borderTop: `1px solid ${B.accent}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "rgba(168,255,62,.05)" }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: B.accent, letterSpacing: "0.09em" }}>
              SYSTEM PROMPT · {agent.name}.md
            </span>
            <button onClick={copyPrompt} style={{ ...btnSm, background: copiedPrompt ? B.accent : "transparent", border: `1px solid ${copiedPrompt ? B.accent : B.border}`, color: copiedPrompt ? "#0d1a0d" : B.textMuted, padding: "4px 9px" }}>
              {copiedPrompt ? <CheckCheck size={11} /> : <Copy size={11} />}
              {copiedPrompt ? "COPIED" : "COPY"}
            </button>
          </div>
          <pre style={{ margin: 0, padding: "16px 20px", background: "#080f08", color: "#8aff6e", fontFamily: "'Space Mono',monospace", fontSize: 11, lineHeight: 1.75, overflowX: "auto", maxHeight: 340, overflowY: "auto", borderTop: `1px solid ${B.border}` }}>
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
}

function AgentManager() {
  const [agents, setAgents] = useState<Agent[]>(SEED_AGENTS);
  const activeCount = agents.filter(a => a.active).length;
  return (
    <div>
      <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: B.textMuted, margin: "0 0 14px", letterSpacing: "0.04em" }}>
        {activeCount}/{agents.length} agents active — click a row to copy the prompt into your Claude Code project
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: B.border }}>
        {agents.map(a => (
          <AgentRow key={a.id} agent={a}
            onToggleActive={() => setAgents(p => p.map(x => x.id === a.id ? { ...x, active: !x.active } : x))}
            onToggleOpen={()   => setAgents(p => p.map(x => x.id === a.id ? { ...x, open: !x.open } : x))} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY FOCUS WIDGET
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyFocus() {
  const now  = new Date();
  const week = getWeekNumber(now);
  const daysLeft = 7 - now.getDay() || 7;

  const focusItems = [
    { label: "PRIMARY OBJECTIVE",  value: "Close first paying WhatsApp AI client",  Icon: Target },
    { label: "SHIP THIS WEEK",     value: "Great Haus Demo walkthrough video",       Icon: Zap    },
    { label: "CONTENT GOAL",       value: "2× Instagram posts + 1× XHS post",       Icon: Layers },
    { label: "OUTREACH TARGET",    value: "Contact 3 new SME prospects",             Icon: ArrowRight },
  ];

  const stats = [
    { label: "TASKS COMPLETE", value: "0 / 6" },
    { label: "DAYS REMAINING", value: String(daysLeft) },
    { label: "ACTIVE PROJECTS", value: "4" },
    { label: "AGENTS ACTIVE",   value: "3 / 4" },
  ];

  return (
    <div>
      {/* Week heading */}
      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${B.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 32, fontWeight: 700, color: B.accent, letterSpacing: "-0.03em" }}>WEEK {week}</span>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: B.textMuted }}>
            of 2026 — {now.toLocaleDateString("en-MY", { weekday: "long", month: "long", day: "numeric" })}
          </span>
        </div>
      </div>
      {/* Focus grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 1, background: B.border, marginBottom: 1 }}>
        {focusItems.map(({ label, value, Icon }) => (
          <div key={label} style={{ background: B.surface, padding: "17px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
              <Icon size={13} color={B.accent} />
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: "0.12em", color: B.textMuted }}>{label}</span>
            </div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500, color: B.text, margin: 0, lineHeight: 1.4 }}>{value}</p>
          </div>
        ))}
      </div>
      {/* Stat strip */}
      <div style={{ background: B.surface, padding: "15px 20px", display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap" }}>
        {stats.map(({ label, value }) => (
          <div key={label}>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: B.textMuted, letterSpacing: "0.12em", margin: "0 0 4px" }}>{label}</p>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: B.accent, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER + TAB NAV
// ─────────────────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "sprint",   label: "SPRINT",   Icon: Target   },
  { id: "projects", label: "PROJECTS", Icon: Layers   },
  { id: "agents",   label: "AGENTS",   Icon: Brain    },
  { id: "focus",    label: "FOCUS",    Icon: Calendar },
];

function DashHeader({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const now  = new Date();
  const week = getWeekNumber(now);
  return (
    <div style={{ background: B.surface, borderBottom: `1px solid ${B.border}` }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 13px", flexWrap: "wrap", gap: 12 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 34, height: 34, background: B.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={18} color="#0d1a0d" />
          </div>
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 17, fontWeight: 700, color: B.accent, letterSpacing: "0.14em", lineHeight: 1 }}>
              FLOGEN AI
            </div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: B.textMuted, letterSpacing: "0.03em", marginTop: 3 }}>
              We build the bots. You build the brand.
            </div>
          </div>
        </div>
        {/* Right info */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: B.text, letterSpacing: "0.07em" }}>
              {now.toLocaleDateString("en-MY", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: B.textMuted, marginTop: 2 }}>
              WEEK {week} OF 2026
            </div>
          </div>
          {/* Pulse pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(168,255,62,.08)", border: "1px solid rgba(168,255,62,.22)", padding: "6px 12px" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: B.accent, boxShadow: `0 0 6px ${B.accent}`, display: "inline-block", animation: "fpulse 1.6s ease-in-out infinite" }} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: B.accent, letterSpacing: "0.07em", fontWeight: 700 }}>
              Claude Code: ACTIVE
            </span>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display: "flex", borderTop: `1px solid ${B.border}` }}>
        {TABS.map(({ id, label, Icon }) => {
          const on = active === id;
          return (
            <button key={id} onClick={() => onChange(id)} style={{ background: on ? B.bg : "transparent", border: "none", borderTop: `2px solid ${on ? B.accent : "transparent"}`, color: on ? B.accent : B.textMuted, fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", padding: "11px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all .18s", marginTop: -1 }}>
              <Icon size={12} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADING
// ─────────────────────────────────────────────────────────────────────────────
function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ padding: "20px 0 15px", borderBottom: `1px solid ${B.border}`, marginBottom: 20 }}>
      <h2 style={{ fontFamily: "'Space Mono',monospace", fontSize: 19, fontWeight: 700, color: B.text, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: B.textMuted, margin: "5px 0 0" }}>{sub}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function ProjectsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("sprint");

  return (
    <>
      {/* Font + animation injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes fpulse {
          0%,100% { opacity:1; box-shadow:0 0 6px #a8ff3e; }
          50%      { opacity:.55; box-shadow:0 0 14px #a8ff3e; }
        }

        /* Grain overlay */
        .fpm-root { position: relative; }
        .fpm-root::after {
          content:''; position:fixed; inset:0; pointer-events:none; z-index:9999;
          opacity:.018;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)'/%3E%3C/svg%3E");
          background-size: 300px 300px;
        }

        .fpm-root ::-webkit-scrollbar { width:4px; height:4px; }
        .fpm-root ::-webkit-scrollbar-track { background:#0d1a0d; }
        .fpm-root ::-webkit-scrollbar-thumb { background:#2a3e2a; border-radius:0; }
        .fpm-root ::-webkit-scrollbar-thumb:hover { background:#a8ff3e; }
      `}</style>

      <div className="fpm-root" style={{ background: B.bg, minHeight: "100vh", color: B.text }}>
        <DashHeader active={activeTab} onChange={setActiveTab} />

        <div style={{ padding: "0 20px 48px" }}>
          {activeTab === "sprint" && (
            <>
              <SectionHead title="SPRINT BOARD" sub="Click any task to mark complete · press + to add · drag to reorder coming soon" />
              <SprintBoard />
            </>
          )}
          {activeTab === "projects" && (
            <>
              <SectionHead title="ACTIVE PROJECTS" sub="Live project tracker — click a card to expand inline notes" />
              <ProjectGrid />
            </>
          )}
          {activeTab === "agents" && (
            <>
              <SectionHead title="SUBAGENT MANAGER" sub="Claude Code agents for Flogen AI — toggle active, view and copy system prompts" />
              <AgentManager />
            </>
          )}
          {activeTab === "focus" && (
            <>
              <SectionHead title="WEEKLY FOCUS" sub="Your north star for the week — what moves the needle toward first client" />
              <WeeklyFocus />
            </>
          )}
        </div>
      </div>
    </>
  );
}
