"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Check, ChevronDown, ChevronUp, Copy, CheckCheck,
  Zap, Target, Calendar, Brain, Layers, Trash2, X,
  ArrowRight, MoreHorizontal, Edit3, GripVertical, Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS  — Notion-dark meets Flogen AI
// ─────────────────────────────────────────────────────────────────────────────
const N = {
  bg:           "#191919",
  surface:      "#202020",
  surfaceHi:    "#262626",
  surfaceHov:   "#2c2c2c",
  border:       "rgba(255,255,255,0.06)",
  borderHi:     "rgba(255,255,255,0.11)",
  text:         "#e6e6e6",
  text2:        "#9b9b9b",
  text3:        "#5a5a5a",
  accent:       "#bbf088",
  accentBg:     "rgba(187,240,136,0.09)",
  accentBorder: "rgba(187,240,136,0.22)",
  red:          "#f87171",
  redBg:        "rgba(248,113,113,0.1)",
  orange:       "#fb923c",
  yellow:       "#fbbf24",
  blue:         "#60a5fa",
  purple:       "#c4b5fd",
  slate:        "#94a3b8",
  radius:       "8px",
  radiusSm:     "5px",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Priority = "HIGH" | "MED" | "LOW";
type Col      = "today" | "week" | "backlog";
type Tab      = "sprint" | "projects" | "agents" | "focus";
type ProjStatus = "Active" | "In Progress" | "Planning" | "Done";

interface Task {
  id: number; text: string; project: string;
  priority: Priority; done: boolean; col: Col;
}
interface Project {
  id: number; name: string; status: ProjStatus;
  progress: number; description: string; notes: string;
}
interface Agent {
  id: number; name: string; description: string;
  model: "Sonnet" | "Haiku"; active: boolean; open: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLOR MAPS
// ─────────────────────────────────────────────────────────────────────────────
const TAG_STYLE: Record<string, { bg: string; color: string }> = {
  Shopify:   { bg: "rgba(187,240,136,.12)", color: "#8bc34a" },
  Marketing: { bg: "rgba(251,146,60,.12)",  color: "#fb923c" },
  Sales:     { bg: "rgba(96,165,250,.12)",  color: "#60a5fa" },
  JCI:       { bg: "rgba(251,191,36,.12)",  color: "#fbbf24" },
  Product:   { bg: "rgba(196,181,253,.12)", color: "#c4b5fd" },
  Research:  { bg: "rgba(148,163,184,.12)", color: "#94a3b8" },
};
const PRIORITY_STYLE: Record<Priority, { bg: string; color: string; dot: string }> = {
  HIGH: { bg: "rgba(248,113,113,.12)", color: "#f87171", dot: "#f87171" },
  MED:  { bg: "rgba(251,146,60,.12)",  color: "#fb923c", dot: "#fb923c" },
  LOW:  { bg: "rgba(148,163,184,.1)",  color: "#94a3b8", dot: "#94a3b8" },
};
const STATUS_STYLE: Record<ProjStatus, { bg: string; color: string }> = {
  "Active":      { bg: "rgba(187,240,136,.1)",  color: "#bbf088" },
  "In Progress": { bg: "rgba(251,191,36,.1)",   color: "#fbbf24" },
  "Planning":    { bg: "rgba(96,165,250,.1)",   color: "#60a5fa" },
  "Done":        { bg: "rgba(148,163,184,.1)",  color: "#94a3b8" },
};
const COL_META: Record<Col, { label: string; color: string; emptyText: string }> = {
  today:   { label: "Today",     color: N.accent,  emptyText: "Nothing due today" },
  week:    { label: "This Week", color: N.yellow,  emptyText: "Clear week ahead" },
  backlog: { label: "Backlog",   color: N.blue,    emptyText: "Backlog is empty" },
};

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────
let _uid = 50;
const uid = () => ++_uid;

const SEED_TASKS: Task[] = [
  { id: 1, text: "Finalize property agent landing page", project: "Shopify",   priority: "HIGH", done: false, col: "today"   },
  { id: 2, text: "Draft Instagram post",                 project: "Marketing", priority: "MED",  done: false, col: "today"   },
  { id: 3, text: "Send pitch to 3 SME prospects",        project: "Sales",     priority: "HIGH", done: false, col: "week"    },
  { id: 4, text: "Update JCI April calendar",            project: "JCI",       priority: "MED",  done: false, col: "week"    },
  { id: 5, text: "Build aesthetic clinic chatbot demo",  project: "Product",   priority: "MED",  done: false, col: "backlog" },
  { id: 6, text: "Explore Xiaohongshu strategy",         project: "Research",  priority: "LOW",  done: false, col: "backlog" },
];

const SEED_PROJECTS: Project[] = [
  { id: 1, name: "buyflogen.com Shopify",   status: "Active",      progress: 65, description: "Organic Brutalism storefront, industry landing pages",     notes: "Working on property agent + aesthetic clinic verticals.\nNext: hero copy and mobile layout." },
  { id: 2, name: "Great Haus Demo",         status: "In Progress", progress: 80, description: "WhatsApp AI agent pitch for real estate client",           notes: "Demo script ready. Need walkthrough video.\nClient meeting TBC — follow up Friday."          },
  { id: 3, name: "SME Prospecting",         status: "Active",      progress: 40, description: "Selangor & KL outreach pipeline",                          notes: "15 leads. 3 replied.\nFollow up: Puchong clinic, Shah Alam e-commerce, Damansara salon."   },
  { id: 4, name: "JCI Youth IICS 2026",     status: "Planning",    progress: 25, description: "Marketing calendar, events, sponsorship",                  notes: "Q2 calendar draft due Apr 15.\nConfirm sponsorship tiers with president."                   },
];

const AGENT_PROMPTS: Record<string, string> = {
  "sprint-prioritizer": `---
name: sprint-prioritizer
model: claude-sonnet-4-6
description: Plans weekly sprints and prioritizes backlog for Flogen AI
---

You are the Sprint Prioritizer agent for Flogen AI, a Malaysian B2B
WhatsApp AI Agency run by Veasen.

Your job:
1. Review the backlog and categorize tasks by impact vs effort
2. Recommend which 3-5 tasks go in TODAY vs THIS WEEK
3. Flag blockers, dependencies, and things to defer
4. Keep the founder focused on revenue-generating activities

Active projects: buyflogen.com, Great Haus Demo, SME Prospecting, JCI IICS 2026
Revenue goal: First 3 WhatsApp AI clients by end Q2 2026

Output:
## TODAY (must-do, highest impact)
## THIS WEEK (important, can be scheduled)
## DEFER (low urgency)
## BLOCKERS (decisions needed)`,

  "project-shipper": `---
name: project-shipper
model: claude-sonnet-4-6
description: Generates launch checklists and tracks deliverables
---

You are the Project Shipper agent for Flogen AI.

Known projects:
- buyflogen.com: Shopify, Organic Brutalism design, industry verticals
- Great Haus Demo: WhatsApp AI for real estate (listings, bookings, FAQ)
- SME Prospecting: Klang Valley outreach pipeline
- JCI Youth IICS 2026: Conference marketing and events

Launch checklist format:
## Technical — dev, QA, deployment
## Content — copy, assets, social posts
## Business — approval, contracts, payment
## Launch — go-live, announcement, follow-up`,

  "content-creator": `---
name: content-creator
model: claude-sonnet-4-6
description: Writes Instagram, Shopify, and pitch copy in Malaysian English
---

You are the Content Creator agent for Flogen AI.

Platforms: Instagram, Shopify landing pages, sales pitches, Xiaohongshu (Chinese)

Brand voice: Confident, modern, results-first. Speak to business owners.

Content pillars: Education · Social proof · Inspiration · Promotion

Malaysian English: occasional "lah/lor/kan", local contexts (Selangor/KL),
prices in MYR, natural code-switching (Malay/Chinese/English)

Always deliver: 2 caption variants (A/B) + 6-8 hashtags`,

  "sme-researcher": `---
name: sme-researcher
model: claude-haiku-4-5
description: Researches Malaysian SME prospects and competitor intel
---

You are the SME Researcher agent for Flogen AI.

Target: F&B, retail, clinics, property agents, e-commerce
Geography: Klang Valley, Penang, JB
Size: 1-50 employees, high WhatsApp volume

Output per prospect:
| Company | Instagram | WhatsApp Volume | Pain Point | AI Use Case | Priority |

Also report: competitor intelligence, pricing gaps, verticals to own`,
};

const SEED_AGENTS: Agent[] = [
  { id: 1, name: "sprint-prioritizer", description: "Plans weekly sprints and prioritizes backlog",             model: "Sonnet", active: true,  open: false },
  { id: 2, name: "project-shipper",    description: "Generates launch checklists and tracks deliverables",      model: "Sonnet", active: true,  open: false },
  { id: 3, name: "content-creator",    description: "Writes Instagram, Shopify, pitch copy in Malaysian English", model: "Sonnet", active: true,  open: false },
  { id: 4, name: "sme-researcher",     description: "Researches Malaysian SME prospects and competitor intel",  model: "Haiku",  active: false, open: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// TINY ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function Tag({ tag }: { tag: string }) {
  const s = TAG_STYLE[tag] ?? { bg: "rgba(148,163,184,.1)", color: N.slate };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
      {tag}
    </span>
  );
}

function PBadge({ p }: { p: Priority }) {
  const s = PRIORITY_STYLE[p];
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, display: "inline-block", flexShrink: 0 }} />
      {p}
    </span>
  );
}

function StatusBadge({ s }: { s: ProjStatus }) {
  const st = STATUS_STYLE[s];
  return (
    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 4, whiteSpace: "nowrap" }}>
      {s}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), 150); return () => clearTimeout(t); }, [value]);
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, width: `${w}%`, background: N.accent, borderRadius: 99, transition: "width 1.1s cubic-bezier(.4,0,.2,1)", opacity: 0.85 }} />
    </div>
  );
}

// Inline editable text
function InlineEdit({ value, onSave, style }: { value: string; onSave: (v: string) => void; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  function commit() { setEditing(false); if (draft.trim()) onSave(draft.trim()); else setDraft(value); }
  if (editing) return (
    <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      style={{ background: "transparent", border: "none", outline: `2px solid ${N.accentBorder}`, borderRadius: 4, color: N.text, width: "100%", padding: "1px 4px", ...style }} />
  );
  return <span onClick={() => setEditing(true)} style={{ cursor: "text", ...style }}>{value}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRINT BOARD
// ─────────────────────────────────────────────────────────────────────────────
function TaskRow({
  task, onToggle, onDelete, onEdit, onMove,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (field: Partial<Task>) => void;
  onMove: (col: Col) => void;
}) {
  const [hovered, setHovered]   = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const otherCols = (["today", "week", "backlog"] as Col[]).filter(c => c !== task.col);

  return (
    <div
      className="nm-task-row"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 10px", borderRadius: N.radius, background: hovered ? N.surfaceHov : "transparent", transition: "background .12s", position: "relative", cursor: "default" }}
    >
      {/* Drag handle */}
      <span style={{ opacity: hovered ? 0.3 : 0, transition: "opacity .15s", marginTop: 3, flexShrink: 0, cursor: "grab" }}>
        <GripVertical size={13} color={N.text2} />
      </span>

      {/* Checkbox */}
      <button onClick={onToggle} style={{ width: 17, height: 17, borderRadius: "50%", border: `1.5px solid ${task.done ? N.accent : N.borderHi}`, background: task.done ? N.accent : "transparent", flexShrink: 0, marginTop: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
        {task.done && <Check size={10} color="#191919" strokeWidth={3} />}
      </button>

      {/* Text + tags */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <InlineEdit
          value={task.text}
          onSave={v => onEdit({ text: v })}
          style={{ fontSize: 13.5, color: task.done ? N.text3 : N.text, textDecoration: task.done ? "line-through" : "none", lineHeight: 1.45, display: "block" }}
        />
        <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
          <Tag tag={task.project} />
          <PBadge p={task.priority} />
        </div>
      </div>

      {/* Hover actions */}
      <div style={{ display: "flex", gap: 2, opacity: hovered ? 1 : 0, transition: "opacity .15s", flexShrink: 0, position: "relative" }}>
        <button onClick={() => setMenuOpen(m => !m)}
          style={{ background: "transparent", border: "none", color: N.text2, cursor: "pointer", padding: "2px 4px", borderRadius: 4, display: "flex", alignItems: "center" }}>
          <MoreHorizontal size={14} />
        </button>
        <button onClick={onDelete}
          style={{ background: "transparent", border: "none", color: N.text3, cursor: "pointer", padding: "2px 4px", borderRadius: 4, display: "flex", alignItems: "center", transition: "color .12s" }}
          onMouseEnter={e => (e.currentTarget.style.color = N.red)}
          onMouseLeave={e => (e.currentTarget.style.color = N.text3)}>
          <Trash2 size={13} />
        </button>

        {/* Move menu */}
        {menuOpen && (
          <div ref={menuRef} style={{ position: "absolute", top: "100%", right: 0, background: N.surfaceHi, border: `1px solid ${N.borderHi}`, borderRadius: N.radius, padding: "4px", zIndex: 50, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            <p style={{ fontSize: 11, color: N.text3, padding: "4px 8px 6px", margin: 0 }}>Move to…</p>
            {otherCols.map(c => (
              <button key={c} onClick={() => { onMove(c); setMenuOpen(false); }}
                style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", color: N.text2, fontSize: 13, padding: "6px 10px", borderRadius: 5, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = N.surfaceHov)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                {COL_META[c].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddTaskRow({ accent, onAdd }: { accent: string; onAdd: (text: string, project: string, priority: Priority) => void }) {
  const [open, setOpen]   = useState(false);
  const [text, setText]   = useState("");
  const [proj, setProj]   = useState("Shopify");
  const [prior, setPrior] = useState<Priority>("MED");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim(), proj, prior);
    setText(""); setOpen(false);
  }

  const sel: React.CSSProperties = { background: N.surfaceHi, border: `1px solid ${N.borderHi}`, color: N.text, fontSize: 12, padding: "5px 8px", borderRadius: N.radiusSm, outline: "none", cursor: "pointer" };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: "flex", alignItems: "center", gap: 6, color: N.text3, background: "transparent", border: "none", fontSize: 13, padding: "7px 10px", cursor: "pointer", borderRadius: N.radius, width: "100%", transition: "background .12s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = N.surfaceHov; (e.currentTarget as HTMLElement).style.color = N.text2; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = N.text3; }}>
      <Plus size={14} /> Add a task
    </button>
  );

  return (
    <form onSubmit={submit} style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8, background: N.surfaceHi, borderRadius: N.radius, border: `1px solid ${N.accentBorder}` }}>
      <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} placeholder="Task name…"
        style={{ background: "transparent", border: "none", outline: "none", color: N.text, fontSize: 13.5, padding: "2px 0" }} />
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <select value={proj} onChange={e => setProj(e.target.value)} style={sel}>
          {Object.keys(TAG_STYLE).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={prior} onChange={e => setPrior(e.target.value as Priority)} style={sel}>
          <option value="HIGH">High</option><option value="MED">Medium</option><option value="LOW">Low</option>
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          <button type="button" onClick={() => setOpen(false)}
            style={{ background: "transparent", border: `1px solid ${N.border}`, color: N.text2, fontSize: 12, padding: "5px 12px", borderRadius: N.radiusSm, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit"
            style={{ background: N.accent, border: "none", color: "#191919", fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: N.radiusSm, cursor: "pointer" }}>
            Add
          </button>
        </div>
      </div>
    </form>
  );
}

function SprintBoard() {
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);

  const toggle = useCallback((id: number) => setTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t)), []);
  const del    = useCallback((id: number) => setTasks(p => p.filter(t => t.id !== id)), []);
  const edit   = useCallback((id: number, f: Partial<Task>) => setTasks(p => p.map(t => t.id === id ? { ...t, ...f } : t)), []);
  const move   = useCallback((id: number, col: Col) => setTasks(p => p.map(t => t.id === id ? { ...t, col } : t)), []);
  const add    = useCallback((col: Col, text: string, project: string, priority: Priority) =>
    setTasks(p => [...p, { id: uid(), text, project, priority, done: false, col }]), []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: N.border }}>
      {(["today", "week", "backlog"] as Col[]).map(col => {
        const { label, color } = COL_META[col];
        const colTasks = tasks.filter(t => t.col === col);
        const pending  = colTasks.filter(t => !t.done).length;
        return (
          <div key={col} style={{ background: N.bg, minHeight: 320, display: "flex", flexDirection: "column" }}>
            {/* Column header */}
            <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: N.text, letterSpacing: "0.01em" }}>{label}</span>
              <span style={{ fontSize: 11, color: N.text3, marginLeft: 2 }}>{pending}</span>
            </div>
            {/* Tasks */}
            <div style={{ flex: 1, padding: "0 4px", display: "flex", flexDirection: "column", gap: 1 }}>
              {colTasks.length === 0 && (
                <p style={{ fontSize: 12, color: N.text3, padding: "8px 14px", fontStyle: "italic" }}>
                  {COL_META[col].emptyText}
                </p>
              )}
              {colTasks.map(t => (
                <TaskRow key={t.id} task={t}
                  onToggle={() => toggle(t.id)}
                  onDelete={() => del(t.id)}
                  onEdit={f => edit(t.id, f)}
                  onMove={c => move(t.id, c)} />
              ))}
            </div>
            {/* Add */}
            <div style={{ padding: "6px 10px 12px" }}>
              <AddTaskRow accent={color} onAdd={(text, project, priority) => add(col, text, project, priority)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS VIEW — full CRUD
// ─────────────────────────────────────────────────────────────────────────────
function ProgressInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="range" min={0} max={100} value={value} onChange={e => onChange(+e.target.value)}
        style={{ flex: 1, accentColor: N.accent, cursor: "pointer" }} />
      <span style={{ fontSize: 12, color: N.accent, fontWeight: 600, minWidth: 34, textAlign: "right" }}>{value}%</span>
    </div>
  );
}

function ProjectRow({ project, onUpdate, onDelete }: {
  project: Project;
  onUpdate: (p: Partial<Project>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered]   = useState(false);
  const [editing, setEditing]   = useState(false);

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? N.surfaceHov : N.surface, borderRadius: N.radius, border: `1px solid ${expanded ? N.accentBorder : N.border}`, transition: "all .15s", overflow: "hidden" }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <InlineEdit
              value={project.name}
              onSave={v => onUpdate({ name: v })}
              style={{ fontSize: 14, fontWeight: 600, color: N.text }}
            />
            <StatusBadge s={project.status} />
          </div>
          <p style={{ fontSize: 12.5, color: N.text2, margin: "4px 0 0", lineHeight: 1.5 }}>
            {project.description}
          </p>
        </div>
        {/* Progress + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <div style={{ width: 90 }}>
            <ProgressBar value={project.progress} />
            <p style={{ fontSize: 11, color: N.text3, margin: "3px 0 0", textAlign: "right" }}>{project.progress}%</p>
          </div>
          <button onClick={() => setEditing(e => !e)}
            style={{ background: "transparent", border: "none", color: hovered ? N.text2 : "transparent", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center", transition: "color .12s" }}>
            <Edit3 size={14} />
          </button>
          <button onClick={onDelete}
            style={{ background: "transparent", border: "none", color: hovered ? N.text3 : "transparent", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center", transition: "all .12s" }}
            onMouseEnter={e => (e.currentTarget.style.color = N.red)}
            onMouseLeave={e => (e.currentTarget.style.color = hovered ? N.text3 : "transparent")}>
            <Trash2 size={14} />
          </button>
          <span style={{ color: N.text3, transition: "transform .15s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", display: "flex" }}>
            <ChevronDown size={15} />
          </span>
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
        <div onClick={e => e.stopPropagation()}
          style={{ padding: "12px 16px", borderTop: `1px solid ${N.border}`, background: N.surfaceHi, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: N.text3, display: "block", marginBottom: 4 }}>Description</label>
            <InlineEdit value={project.description} onSave={v => onUpdate({ description: v })}
              style={{ fontSize: 13, color: N.text2, display: "block", background: "rgba(255,255,255,0.04)", padding: "5px 8px", borderRadius: 5 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: N.text3, display: "block", marginBottom: 4 }}>Progress</label>
            <ProgressInput value={project.progress} onChange={v => onUpdate({ progress: v })} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: N.text3, display: "block", marginBottom: 4 }}>Status</label>
            <select value={project.status} onChange={e => onUpdate({ status: e.target.value as ProjStatus })}
              style={{ background: N.surfaceHi, border: `1px solid ${N.borderHi}`, color: N.text, fontSize: 12, padding: "5px 8px", borderRadius: N.radiusSm, outline: "none" }}>
              {(["Active", "In Progress", "Planning", "Done"] as ProjStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Notes expand */}
      {expanded && (
        <div style={{ padding: "12px 16px 14px", borderTop: `1px solid ${N.border}`, background: N.accentBg }}>
          <p style={{ fontSize: 11, color: N.text3, margin: "0 0 6px", fontWeight: 500 }}>NOTES</p>
          <p style={{ fontSize: 13, color: N.text2, margin: 0, lineHeight: 1.75, whiteSpace: "pre-line" }}>{project.notes}</p>
        </div>
      )}
    </div>
  );
}

function AddProjectRow({ onAdd }: { onAdd: (name: string, desc: string) => void }) {
  const [open, setOpen]    = useState(false);
  const [name, setName]    = useState("");
  const [desc, setDesc]    = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), desc.trim() || "No description yet.");
    setName(""); setDesc(""); setOpen(false);
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: "flex", alignItems: "center", gap: 7, color: N.text3, background: "transparent", border: `1px dashed ${N.border}`, fontSize: 13, padding: "10px 14px", cursor: "pointer", borderRadius: N.radius, width: "100%", transition: "all .12s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = N.accentBorder; (e.currentTarget as HTMLElement).style.color = N.accent; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = N.border; (e.currentTarget as HTMLElement).style.color = N.text3; }}>
      <Plus size={14} /> New project
    </button>
  );

  return (
    <form onSubmit={submit} style={{ background: N.surfaceHi, border: `1px solid ${N.accentBorder}`, borderRadius: N.radius, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <input ref={inputRef} value={name} onChange={e => setName(e.target.value)} placeholder="Project name…"
        style={{ background: "transparent", border: "none", outline: "none", color: N.text, fontSize: 14, fontWeight: 600, padding: 0 }} />
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description…"
        style={{ background: "transparent", border: "none", outline: "none", color: N.text2, fontSize: 13, padding: 0 }} />
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setOpen(false)}
          style={{ background: "transparent", border: `1px solid ${N.border}`, color: N.text2, fontSize: 12, padding: "5px 14px", borderRadius: N.radiusSm, cursor: "pointer" }}>
          Cancel
        </button>
        <button type="submit"
          style={{ background: N.accent, border: "none", color: "#191919", fontSize: 12, fontWeight: 600, padding: "5px 16px", borderRadius: N.radiusSm, cursor: "pointer" }}>
          Create
        </button>
      </div>
    </form>
  );
}

function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);

  function addProject(name: string, description: string) {
    setProjects(p => [...p, { id: uid(), name, status: "Planning", progress: 0, description, notes: "" }]);
  }
  function updateProject(id: number, updates: Partial<Project>) {
    setProjects(p => p.map(x => x.id === id ? { ...x, ...updates } : x));
  }
  function deleteProject(id: number) {
    setProjects(p => p.filter(x => x.id !== id));
  }

  const active = projects.filter(p => p.status !== "Done").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 12.5, color: N.text3, margin: 0 }}>
          {active} active · {projects.length} total — click a project to expand notes
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {projects.map(p => (
          <ProjectRow key={p.id} project={p}
            onUpdate={u => updateProject(p.id, u)}
            onDelete={() => deleteProject(p.id)} />
        ))}
        <AddProjectRow onAdd={addProject} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT MANAGER
// ─────────────────────────────────────────────────────────────────────────────
function AgentRow({ agent, onToggleActive, onToggleOpen }: {
  agent: Agent; onToggleActive: () => void; onToggleOpen: () => void;
}) {
  const [copiedPrompt, setCopied] = useState(false);
  const [copiedMd, setCopiedMd]   = useState(false);
  const [hovered, setHovered]     = useState(false);
  const prompt = AGENT_PROMPTS[agent.name] ?? "";

  async function copyPrompt() { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  async function copyMd()     { await navigator.clipboard.writeText(prompt); setCopiedMd(true); setTimeout(() => setCopiedMd(false), 2000); }

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? N.surfaceHov : N.surface, borderRadius: N.radius, border: `1px solid ${agent.open ? N.accentBorder : N.border}`, transition: "all .15s", overflow: "hidden" }}>
      {/* Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", flexWrap: "wrap" }}>
        {/* Toggle */}
        <button onClick={onToggleActive} style={{ width: 36, height: 20, background: agent.active ? N.accent : "rgba(255,255,255,0.1)", borderRadius: 99, border: "none", cursor: "pointer", position: "relative", transition: "background .18s", flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: agent.active ? "#191919" : N.text3, position: "absolute", top: 2, left: agent.active ? 18 : 2, transition: "left .18s" }} />
        </button>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: agent.active ? N.text : N.text3 }}>{agent.name}</span>
            <span style={{ background: agent.model === "Sonnet" ? N.accentBg : "rgba(96,165,250,.1)", color: agent.model === "Sonnet" ? N.accent : N.blue, fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>
              {agent.model}
            </span>
            <span style={{ fontSize: 11, color: agent.active ? "#4ade80" : N.text3 }}>
              {agent.active ? "● Active" : "○ Inactive"}
            </span>
          </div>
          <p style={{ color: N.text3, fontSize: 12.5, margin: "3px 0 0" }}>{agent.description}</p>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 6 }}>
          <Btn small secondary onClick={copyMd}>
            {copiedMd ? <CheckCheck size={12} /> : <Copy size={12} />}
            {copiedMd ? "Copied!" : "Copy .md"}
          </Btn>
          <Btn small secondary={!agent.open} onClick={onToggleOpen}>
            {agent.open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Prompt
          </Btn>
        </div>
      </div>
      {/* Prompt */}
      {agent.open && (
        <div style={{ borderTop: `1px solid ${N.accentBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: N.accentBg }}>
            <span style={{ fontSize: 11, color: N.accent, fontWeight: 500 }}>{agent.name}.md</span>
            <Btn small secondary={!copiedPrompt} onClick={copyPrompt}>
              {copiedPrompt ? <CheckCheck size={11} /> : <Copy size={11} />}
              {copiedPrompt ? "Copied" : "Copy"}
            </Btn>
          </div>
          <pre style={{ margin: 0, padding: "16px 20px", background: "#0f1a0f", color: "#8aff6e", fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 12, lineHeight: 1.75, overflowX: "auto", maxHeight: 320, overflowY: "auto", borderTop: `1px solid ${N.border}` }}>
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
}

function AgentManager() {
  const [agents, setAgents] = useState<Agent[]>(SEED_AGENTS);
  return (
    <div>
      <p style={{ fontSize: 12.5, color: N.text3, margin: "0 0 14px" }}>
        {agents.filter(a => a.active).length}/{agents.length} active — toggle to enable, click Prompt to view + copy
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
// BTN — reusable button atom
// ─────────────────────────────────────────────────────────────────────────────
function Btn({ onClick, children, small, secondary }: {
  onClick?: () => void; children: React.ReactNode; small?: boolean; secondary?: boolean;
}) {
  return (
    <button onClick={onClick}
      style={{ background: secondary ? "transparent" : N.accent, border: `1px solid ${secondary ? N.border : "transparent"}`, color: secondary ? N.text2 : "#191919", fontSize: small ? 11.5 : 13, fontWeight: secondary ? 400 : 600, padding: small ? "4px 10px" : "7px 16px", borderRadius: N.radiusSm, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all .12s", whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY FOCUS
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyFocus() {
  const now  = new Date();
  const week = getWeekNumber(now);
  const items = [
    { label: "Primary Objective",  value: "Close first paying WhatsApp AI client",  Icon: Target      },
    { label: "Ship This Week",     value: "Great Haus Demo walkthrough video",       Icon: Zap         },
    { label: "Content Goal",       value: "2× Instagram posts + 1× XHS post",       Icon: Sparkles    },
    { label: "Outreach Target",    value: "Contact 3 new SME prospects",             Icon: ArrowRight  },
  ];
  const stats = [
    { label: "Week",           value: `${week}` },
    { label: "Days left",      value: `${7 - now.getDay() || 7}` },
    { label: "Active projects", value: "4" },
    { label: "Agents active",  value: "3 / 4" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${N.border}` }}>
        <p style={{ fontSize: 12, color: N.text3, margin: "0 0 4px", fontWeight: 500 }}>
          {now.toLocaleDateString("en-MY", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: N.accent, margin: 0, letterSpacing: "-0.02em" }}>
          Week {week} Focus
        </h2>
      </div>
      {/* Focus cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 8, marginBottom: 8 }}>
        {items.map(({ label, value, Icon }) => (
          <div key={label} style={{ background: N.surface, border: `1px solid ${N.border}`, borderRadius: N.radius, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <Icon size={13} color={N.accent} />
              <span style={{ fontSize: 11, color: N.text3, fontWeight: 500, letterSpacing: "0.02em" }}>{label}</span>
            </div>
            <p style={{ fontSize: 13.5, color: N.text, margin: 0, fontWeight: 500, lineHeight: 1.4 }}>{value}</p>
          </div>
        ))}
      </div>
      {/* Stats strip */}
      <div style={{ background: N.surface, border: `1px solid ${N.border}`, borderRadius: N.radius, padding: "14px 20px", display: "flex", gap: 32, flexWrap: "wrap" }}>
        {stats.map(({ label, value }) => (
          <div key={label}>
            <p style={{ fontSize: 11, color: N.text3, margin: "0 0 3px", fontWeight: 500 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: N.accent, margin: 0, letterSpacing: "-0.02em" }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER + TABS
// ─────────────────────────────────────────────────────────────────────────────
function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const days  = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  return Math.ceil((days + start.getDay() + 1) / 7);
}

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "sprint",   label: "Sprint Board", Icon: Target  },
  { id: "projects", label: "Projects",     Icon: Layers  },
  { id: "agents",   label: "Agents",       Icon: Brain   },
  { id: "focus",    label: "Focus",        Icon: Calendar },
];

function Header({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const now  = new Date();
  const week = getWeekNumber(now);
  return (
    <div style={{ background: N.surface, borderBottom: `1px solid ${N.border}`, position: "sticky", top: 0, zIndex: 40 }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 24px", flexWrap: "wrap", gap: 10 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: N.accent, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={16} color="#191919" strokeWidth={2.5} />
          </div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: N.text, letterSpacing: "-0.01em" }}>Flogen AI</span>
            <span style={{ fontSize: 12, color: N.text3, marginLeft: 8 }}>Project Manager</span>
          </div>
        </div>
        {/* Right info */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: N.text3 }}>
            {now.toLocaleDateString("en-MY", { weekday: "short", month: "short", day: "numeric" })} · Week {week}
          </span>
          {/* Pulse pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: N.accentBg, border: `1px solid ${N.accentBorder}`, padding: "4px 10px", borderRadius: 99 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: N.accent, boxShadow: `0 0 5px ${N.accent}`, display: "inline-block", animation: "fpulse 1.8s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, color: N.accent, fontWeight: 500 }}>Claude Code: Active</span>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 20px", gap: 2 }}>
        {TABS.map(({ id, label, Icon }) => {
          const on = active === id;
          return (
            <button key={id} onClick={() => onChange(id)}
              style={{ background: "transparent", border: "none", borderBottom: `2px solid ${on ? N.accent : "transparent"}`, color: on ? N.text : N.text3, fontSize: 13, fontWeight: on ? 600 : 400, padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all .15s", marginBottom: -1, borderRadius: "4px 4px 0 0" }}>
              <Icon size={13} />
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
    <div style={{ paddingBottom: 16, borderBottom: `1px solid ${N.border}`, marginBottom: 18 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: N.text, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
      <p style={{ fontSize: 12.5, color: N.text3, margin: "4px 0 0" }}>{sub}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function ProjectsDashboard() {
  const [tab, setTab] = useState<Tab>("sprint");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fpulse {
          0%,100% { opacity:1; box-shadow:0 0 5px #bbf088; }
          50%      { opacity:.5; box-shadow:0 0 11px #bbf088; }
        }
        .fpm-root { font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif !important; }
        .fpm-root * { box-sizing: border-box; }
        .fpm-root ::-webkit-scrollbar { width:5px; height:5px; }
        .fpm-root ::-webkit-scrollbar-track { background:transparent; }
        .fpm-root ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.12); border-radius:99px; }
        .fpm-root ::-webkit-scrollbar-thumb:hover { background:rgba(187,240,136,.35); }
        .fpm-root input[type=range] { height:4px; border-radius:99px; }
        .fpm-root select:focus { outline: 2px solid rgba(187,240,136,.3); }
      `}</style>

      <div className="fpm-root" style={{ background: N.bg, minHeight: "100vh", color: N.text }}>
        <Header active={tab} onChange={setTab} />
        <div style={{ padding: "28px 28px 56px", maxWidth: 1280, margin: "0 auto" }}>
          {tab === "sprint" && (
            <>
              <SectionHead title="Sprint Board" sub="Click any task to complete · hover to move or delete · click text to edit inline" />
              <SprintBoard />
            </>
          )}
          {tab === "projects" && (
            <>
              <SectionHead title="Active Projects" sub="Hover a row to edit or delete · click to expand notes · drag the progress slider" />
              <ProjectsView />
            </>
          )}
          {tab === "agents" && (
            <>
              <SectionHead title="Subagent Manager" sub="Toggle active state · expand system prompt · copy full .md file to clipboard" />
              <AgentManager />
            </>
          )}
          {tab === "focus" && (
            <>
              <SectionHead title="Weekly Focus" sub="North star goals for the week — what moves Flogen AI toward first client" />
              <WeeklyFocus />
            </>
          )}
        </div>
      </div>
    </>
  );
}
