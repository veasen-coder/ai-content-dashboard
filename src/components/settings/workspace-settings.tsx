"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2, Sparkles, Link2, Bell, ShieldCheck,
  Check, CheckCheck, ChevronRight,
  Download, Trash2, RefreshCw, Eye, EyeOff,
  Copy, ExternalLink, AlertTriangle, Instagram,
  Cpu, Globe, Zap, Clock, Mail, Phone, Hash,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:      "#0a0a0a",
  s:       "#111111",
  s2:      "#171717",
  s3:      "#1f1f1f",
  border:  "rgba(255,255,255,0.07)",
  borderHi:"rgba(255,255,255,0.13)",
  accent:  "#bbf088",
  aBg:     "rgba(187,240,136,0.08)",
  aBd:     "rgba(187,240,136,0.20)",
  text:    "#f5f0e6",
  t2:      "#9a9a9a",
  t3:      "#4a4a4a",
  red:     "#f87171",
  yellow:  "#fbbf24",
  blue:    "#60a5fa",
  green:   "#4ade80",
  r:       "8px",
  r2:      "5px",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Section = "profile" | "ai" | "integrations" | "notifications" | "data";
type Lang    = "EN" | "BM" | "ZH";
type Voice   = "direct" | "warm" | "corporate";
type Model   = "claude-haiku-4-5" | "claude-sonnet-4-5" | "claude-opus-4-5";

interface WSettings {
  // Section 1 — Workspace Profile
  businessName:      string;
  tagline:           string;
  logoDataUrl:       string;
  industry:          string;
  whatsappNumber:    string;
  instagramHandle:   string;
  xhsHandle:         string;
  primaryLanguage:   Lang;
  // Section 2 — AI Behaviour
  brandVoice:        Voice;
  defaultCta:        string;
  postingRules:      string;
  claudeModel:       Model;
  anthropicApiKey:   string;
  // Section 3 — Integrations
  igAccessToken:     string;
  igLastSynced:      string;
  whatsappApiKey:    string;
  metaBusinessToken: string;
  bufferApiKey:      string;
  zapierWebhookUrl:  string;
  // Section 4 — Notifications
  morningTime:       string;
  followUpDays:      number;
  weeklyReportEmail: boolean;
  emailAddress:      string;
}

const DEFAULT: WSettings = {
  businessName:      "Flogen AI",
  tagline:           "We build the bots. You build the brand.",
  logoDataUrl:       "",
  industry:          "General (Multi-vertical)",
  whatsappNumber:    "",
  instagramHandle:   "@flogenai",
  xhsHandle:         "",
  primaryLanguage:   "EN",
  brandVoice:        "direct",
  defaultCta:        "DM us or visit buyflogen.com",
  postingRules:      "Min 2 days between posts · Rotate industries every 3 posts · Every post ends with CTA to flogen.com or DM",
  claudeModel:       "claude-sonnet-4-5",
  anthropicApiKey:   "",
  igAccessToken:     "",
  igLastSynced:      "",
  whatsappApiKey:    "",
  metaBusinessToken: "",
  bufferApiKey:      "",
  zapierWebhookUrl:  "",
  morningTime:       "09:00",
  followUpDays:      3,
  weeklyReportEmail: false,
  emailAddress:      "",
};

const LS_KEY = "flogen_workspace_settings";

// ─────────────────────────────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS: { id: Section; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "profile",       label: "Workspace Profile",  icon: Building2,  desc: "Business info & handles"     },
  { id: "ai",            label: "AI Behaviour",        icon: Sparkles,   desc: "Voice, CTA & model"          },
  { id: "integrations",  label: "Integrations",        icon: Link2,      desc: "APIs & connected services"   },
  { id: "notifications", label: "Notifications",       icon: Bell,       desc: "Reminders & email alerts"    },
  { id: "data",          label: "Data & Privacy",      icon: ShieldCheck, desc: "Export, reset & delete"    },
];

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE ATOMS
// ─────────────────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  background: C.s2, border: `1px solid ${C.borderHi}`, color: C.text,
  fontSize: 13, padding: "8px 12px", borderRadius: C.r2, outline: "none",
  width: "100%", fontFamily: "inherit", boxSizing: "border-box",
};
const sel: React.CSSProperties = { ...inp };

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 11.5, color: C.t2, display: "block", marginBottom: 5, fontWeight: 500 }}>
      {children}
    </label>
  );
}

function SectionHeading({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 24, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 12.5, color: C.t2, margin: "4px 0 0" }}>{desc}</p>
    </div>
  );
}

function Group({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      {label && (
        <p style={{ fontSize: 10.5, fontWeight: 700, color: C.t3, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>
          {label}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      style={{ width: 40, height: 22, background: on ? C.accent : "rgba(255,255,255,.1)", borderRadius: 99, border: "none", cursor: "pointer", position: "relative", transition: "background .18s", flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: on ? "#0a0a0a" : C.t3, position: "absolute", top: 2, left: on ? 20 : 2, transition: "left .18s" }} />
    </button>
  );
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const configured = value.trim().length > 6;

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <div style={{ flex: 1, position: "relative" }}>
        <input type={show ? "text" : "password"} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? "Paste key…"}
          style={{ ...inp, paddingRight: 36, fontFamily: configured ? "'JetBrains Mono','Fira Code',monospace" : "inherit" }} />
        <button onClick={() => setShow(s => !s)} title={show ? "Hide" : "Show"}
          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.t3, cursor: "pointer", padding: 0, display: "flex" }}>
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
      {configured && (
        <button onClick={copy} title="Copy"
          style={{ background: C.s2, border: `1px solid ${C.borderHi}`, color: copied ? C.accent : C.t2, borderRadius: C.r2, cursor: "pointer", padding: "8px 10px", display: "flex", alignItems: "center", transition: "all .15s" }}>
          {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
        </button>
      )}
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: ok ? C.green : C.t3, display: "inline-block", flexShrink: 0 }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function WorkspaceSettings() {
  const [section, setSection] = useState<Section>("profile");
  const [s, setS] = useState<WSettings>(DEFAULT);
  const [saved, setSaved] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setS(prev => ({ ...prev, ...JSON.parse(stored) }));
    } catch { /* ignore */ }
  }, []);

  const upd = useCallback(<K extends keyof WSettings>(key: K, val: WSettings[K]) => {
    setS(prev => ({ ...prev, [key]: val }));
  }, []);

  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) upd("logoDataUrl", ev.target.result as string); };
    reader.readAsDataURL(file);
  }

  function exportJson() {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("flogen_")) {
        try { data[k] = JSON.parse(localStorage.getItem(k)!); }
        catch { data[k] = localStorage.getItem(k); }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `flogen-data-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportCsv() {
    const rows: string[] = ["Key,Value"];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("flogen_")) {
        const v = localStorage.getItem(k) ?? "";
        rows.push(`"${k}","${v.replace(/"/g, '""').slice(0, 200)}"`);
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `flogen-data-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function clearAll() {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("flogen_")) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    setS(DEFAULT);
    setClearConfirm(false);
  }

  const active = SECTIONS.find(sec => sec.id === section)!;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .ws-root * { box-sizing: border-box; font-family: 'Inter',-apple-system,BlinkMacSystemFont,sans-serif; }
        .ws-root ::-webkit-scrollbar { width: 4px; }
        .ws-root ::-webkit-scrollbar-track { background: transparent; }
        .ws-root ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 99px; }
        .ws-root select option { background: #1f1f1f; }
        .ws-root input[type="date"], .ws-root input[type="time"] { color-scheme: dark; }
        @media (max-width: 640px) {
          .ws-nav { display: none !important; }
          .ws-nav-mobile { display: flex !important; }
        }
      `}</style>

      <div className="ws-root" style={{ background: C.bg, minHeight: "100vh", color: C.text }}>

        {/* ── Page header ── */}
        <div style={{ padding: "28px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", margin: 0 }}>Settings</h1>
              <p style={{ fontSize: 13, color: C.t2, margin: "4px 0 0" }}>Workspace configuration · AI behaviour · Integrations</p>
            </div>
            <button onClick={save}
              style={{ background: saved ? C.green : C.accent, border: "none", color: "#0a0a0a", fontSize: 13, fontWeight: 700, padding: "9px 20px", borderRadius: C.r, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all .2s" }}>
              {saved ? <CheckCheck size={14} /> : <Check size={14} />}
              {saved ? "Saved!" : "Save changes"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 28, minHeight: "calc(100vh - 100px)" }}>

          {/* ── Left nav ── */}
          <div className="ws-nav" style={{ width: 220, borderRight: `1px solid ${C.border}`, padding: "0 10px", flexShrink: 0 }}>
            {SECTIONS.map(sec => {
              const on = section === sec.id;
              const Icon = sec.icon;
              return (
                <button key={sec.id} onClick={() => setSection(sec.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", width: "100%", background: on ? C.aBg : "transparent", border: `1px solid ${on ? C.aBd : "transparent"}`, borderRadius: C.r2, color: on ? C.accent : C.t2, cursor: "pointer", textAlign: "left", marginBottom: 3, transition: "all .12s" }}
                  onMouseEnter={e => { if (!on) { (e.currentTarget as HTMLElement).style.background = C.s2; (e.currentTarget as HTMLElement).style.color = C.text; } }}
                  onMouseLeave={e => { if (!on) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.t2; } }}>
                  <Icon size={14} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: on ? 600 : 400, margin: 0, color: "inherit" }}>{sec.label}</p>
                    <p style={{ fontSize: 10.5, color: C.t3, margin: 0 }}>{sec.desc}</p>
                  </div>
                  {on && <ChevronRight size={12} style={{ marginLeft: "auto", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          {/* ── Mobile section picker (shown on small screens) ── */}
          <div className="ws-nav-mobile" style={{ display: "none", overflowX: "auto", padding: "0 16px 14px", gap: 6, borderBottom: `1px solid ${C.border}`, position: "absolute", top: 80, left: 0, right: 0, background: C.bg, zIndex: 10 }}>
            {SECTIONS.map(sec => {
              const on = section === sec.id;
              return (
                <button key={sec.id} onClick={() => setSection(sec.id)}
                  style={{ fontSize: 11.5, fontWeight: on ? 600 : 400, padding: "5px 12px", borderRadius: 99, border: `1px solid ${on ? C.aBd : C.border}`, background: on ? C.aBg : "transparent", color: on ? C.accent : C.t2, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {sec.label}
                </button>
              );
            })}
          </div>

          {/* ── Content ── */}
          <div style={{ flex: 1, padding: "0 32px 60px", maxWidth: 680, overflowY: "auto" }}>

            {/* ════════════════════════════════════════════════════════
                SECTION 1 — WORKSPACE PROFILE
            ════════════════════════════════════════════════════════ */}
            {section === "profile" && (
              <div>
                <SectionHeading title="Workspace Profile" desc="Core business info used to pre-fill defaults across all agents and generated content." />

                {/* Logo + Name */}
                <Group label="Brand Identity">
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 72, height: 72, borderRadius: C.r, background: s.logoDataUrl ? "transparent" : C.s2, border: `2px dashed ${C.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", cursor: "pointer" }}
                      onClick={() => logoRef.current?.click()}>
                      {s.logoDataUrl
                        ? <img src={s.logoDataUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ textAlign: "center" }}><Zap size={22} color={C.t3} /><p style={{ fontSize: 10, color: C.t3, margin: "4px 0 0" }}>Upload</p></div>
                      }
                    </div>
                    <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div>
                        <Label>Business Name</Label>
                        <input value={s.businessName} onChange={e => upd("businessName", e.target.value)} placeholder="Flogen AI" style={inp} />
                      </div>
                      <div>
                        <Label>Tagline</Label>
                        <input value={s.tagline} onChange={e => upd("tagline", e.target.value)} placeholder="We build the bots. You build the brand." style={inp} />
                      </div>
                    </div>
                  </div>
                </Group>

                {/* Industry + Language */}
                <Group label="Business Context">
                  <div>
                    <Label>Primary Industry</Label>
                    <select value={s.industry} onChange={e => upd("industry", e.target.value)} style={sel}>
                      {["General (Multi-vertical)","Real Estate","F&B / Restaurant","Aesthetic Clinic","Hair & Beauty Salon","Retail","Hotel / Hospitality","E-commerce","Education","Professional Services"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <p style={{ fontSize: 11, color: C.t3, margin: "5px 0 0" }}>Pre-fills industry context across all AI agents</p>
                  </div>
                  <div>
                    <Label>Primary Language</Label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["EN","BM","ZH"] as Lang[]).map(lang => {
                        const labels: Record<Lang, string> = { EN: "English", BM: "Bahasa Malaysia", ZH: "简体中文" };
                        const on = s.primaryLanguage === lang;
                        return (
                          <button key={lang} onClick={() => upd("primaryLanguage", lang)}
                            style={{ flex: 1, padding: "8px 0", borderRadius: C.r2, border: `1px solid ${on ? C.aBd : C.borderHi}`, background: on ? C.aBg : "transparent", color: on ? C.accent : C.t2, fontSize: 12.5, fontWeight: on ? 600 : 400, cursor: "pointer", transition: "all .12s" }}>
                            {lang}
                            <br />
                            <span style={{ fontSize: 10, fontWeight: 400, color: C.t3 }}>{labels[lang]}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 11, color: C.t3, margin: "5px 0 0" }}>Drives caption tone in AI-generated content</p>
                  </div>
                </Group>

                {/* Social Handles */}
                <Group label="Social & Contact">
                  <div>
                    <Label><Phone size={11} style={{ display: "inline", marginRight: 4 }} />Business WhatsApp Number</Label>
                    <input value={s.whatsappNumber} onChange={e => upd("whatsappNumber", e.target.value)} placeholder="+60 12-345 6789" style={inp} />
                  </div>
                  <div>
                    <Label><Instagram size={11} style={{ display: "inline", marginRight: 4 }} />Instagram Handle</Label>
                    <input value={s.instagramHandle} onChange={e => upd("instagramHandle", e.target.value)} placeholder="@yourhandle" style={inp} />
                  </div>
                  <div>
                    <Label><Hash size={11} style={{ display: "inline", marginRight: 4 }} />Xiaohongshu Handle</Label>
                    <input value={s.xhsHandle} onChange={e => upd("xhsHandle", e.target.value)} placeholder="小红书账号" style={inp} />
                  </div>
                </Group>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
                SECTION 2 — AI BEHAVIOUR
            ════════════════════════════════════════════════════════ */}
            {section === "ai" && (
              <div>
                <SectionHeading title="AI Behaviour" desc="Control how AI agents write, what they say, and which Claude model to use." />

                {/* Brand Voice */}
                <Group label="Brand Voice">
                  <div>
                    <Label>Voice Selector</Label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {([
                        { id: "direct",    label: "Direct & Punchy",          desc: "Short sentences · Results-first · No fluff · Malaysian English flair" },
                        { id: "warm",      label: "Warm & Conversational",     desc: "Friendly tone · Approachable · Light humour · Feels like a real person" },
                        { id: "corporate", label: "Corporate & Professional",  desc: "Formal language · Polished · Suitable for B2B enterprise outreach" },
                      ] as { id: Voice; label: string; desc: string }[]).map(v => {
                        const on = s.brandVoice === v.id;
                        return (
                          <button key={v.id} onClick={() => upd("brandVoice", v.id)}
                            style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: on ? C.aBg : C.s2, border: `1px solid ${on ? C.aBd : C.border}`, borderRadius: C.r, cursor: "pointer", textAlign: "left", transition: "all .12s" }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${on ? C.accent : C.borderHi}`, background: on ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                              {on && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0a0a0a" }} />}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: on ? 600 : 500, color: on ? C.accent : C.text, margin: 0 }}>{v.label}</p>
                              <p style={{ fontSize: 11.5, color: C.t2, margin: "2px 0 0" }}>{v.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Group>

                {/* Content Defaults */}
                <Group label="Content Defaults">
                  <div>
                    <Label>Default CTA Text</Label>
                    <input value={s.defaultCta} onChange={e => upd("defaultCta", e.target.value)}
                      placeholder="DM us or visit buyflogen.com" style={inp} />
                    <p style={{ fontSize: 11, color: C.t3, margin: "5px 0 0" }}>Appended to generated captions and outreach messages</p>
                  </div>
                  <div>
                    <Label>Posting Rules</Label>
                    <textarea value={s.postingRules} onChange={e => upd("postingRules", e.target.value)}
                      rows={4} placeholder="e.g. Min 2 days between posts · Rotate industries every 3 posts…"
                      style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                    <p style={{ fontSize: 11, color: C.t3, margin: "5px 0 0" }}>Injected into Content Planner and Script Writer system prompts</p>
                  </div>
                </Group>

                {/* Claude Model */}
                <Group label="Claude Model">
                  <div>
                    <Label><Cpu size={11} style={{ display: "inline", marginRight: 4 }} />Model Selector</Label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {([
                        { id: "claude-haiku-4-5",   label: "Claude Haiku",   badge: "Fastest · Lowest cost",    desc: "Best for high-volume tasks: DM templates, captions, quick suggestions"      },
                        { id: "claude-sonnet-4-5",  label: "Claude Sonnet",  badge: "Recommended · Balanced",   desc: "Best all-rounder for scripts, pitches, content plans, and analysis"         },
                        { id: "claude-opus-4-5",    label: "Claude Opus",    badge: "Highest quality · Slower", desc: "Deep reasoning for complex strategies, competitive analysis, and long-form"   },
                      ] as { id: Model; label: string; badge: string; desc: string }[]).map(m => {
                        const on = s.claudeModel === m.id;
                        return (
                          <button key={m.id} onClick={() => upd("claudeModel", m.id)}
                            style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px", background: on ? C.aBg : C.s2, border: `1px solid ${on ? C.aBd : C.border}`, borderRadius: C.r, cursor: "pointer", textAlign: "left", transition: "all .12s" }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${on ? C.accent : C.borderHi}`, background: on ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                              {on && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0a0a0a" }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <span style={{ fontSize: 13, fontWeight: on ? 600 : 500, color: on ? C.accent : C.text }}>{m.label}</span>
                                <span style={{ fontSize: 10, background: on ? "rgba(187,240,136,.15)" : C.s3, color: on ? C.accent : C.t3, padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>{m.badge}</span>
                              </div>
                              <p style={{ fontSize: 11.5, color: C.t2, margin: "2px 0 0" }}>{m.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <Label>Anthropic API Key</Label>
                      <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: C.t3, display: "flex", alignItems: "center", gap: 3, textDecoration: "none" }}
                        onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
                        onMouseLeave={e => (e.currentTarget.style.color = C.t3)}>
                        Get key <ExternalLink size={10} />
                      </a>
                    </div>
                    <SecretInput value={s.anthropicApiKey} onChange={v => upd("anthropicApiKey", v)} placeholder="sk-ant-api03-…" />
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <StatusDot ok={s.anthropicApiKey.trim().length > 6} />
                      <span style={{ fontSize: 11, color: s.anthropicApiKey.trim().length > 6 ? C.green : C.t3 }}>
                        {s.anthropicApiKey.trim().length > 6 ? "Key configured — Claude Code: Active" : "No key — AI agents will be unavailable"}
                      </span>
                    </div>
                  </div>
                </Group>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
                SECTION 3 — INTEGRATIONS
            ════════════════════════════════════════════════════════ */}
            {section === "integrations" && (
              <div>
                <SectionHeading title="Integrations" desc="Connect third-party services for live data, posting, scheduling, and automation." />

                {/* Instagram */}
                <Group label="Social · Instagram">
                  <div style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Instagram size={15} color="#e1306c" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Instagram Business</span>
                      </div>
                      <span style={{ fontSize: 10.5, background: s.igAccessToken ? "rgba(74,222,128,.12)" : C.s2, color: s.igAccessToken ? C.green : C.t3, padding: "2px 8px", borderRadius: 4, border: `1px solid ${s.igAccessToken ? "rgba(74,222,128,.25)" : C.border}`, fontWeight: 600 }}>
                        {s.igAccessToken ? "● Connected" : "Not connected"}
                      </span>
                    </div>
                    {s.igLastSynced && <p style={{ fontSize: 11, color: C.t3, margin: "0 0 10px" }}>Last synced: {s.igLastSynced}</p>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div>
                        <Label>Access Token</Label>
                        <SecretInput value={s.igAccessToken} onChange={v => upd("igAccessToken", v)} placeholder="EAABwzLixnjYBO…" />
                      </div>
                      {s.igAccessToken && (
                        <button onClick={() => { upd("igLastSynced", new Date().toLocaleString("en-MY")); }}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 12, padding: "6px 12px", borderRadius: C.r2, cursor: "pointer", width: "fit-content" }}>
                          <RefreshCw size={12} /> Reconnect / Refresh token
                        </button>
                      )}
                      <p style={{ fontSize: 11, color: C.t3, margin: 0 }}>
                        Get token via <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "none" }}>Meta Business Suite → Tools → Manage API access</a>
                      </p>
                    </div>
                  </div>
                </Group>

                {/* WhatsApp */}
                <Group label="Messaging · WhatsApp Business API">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <Label>API Key / Bearer Token</Label>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <StatusDot ok={!!s.whatsappApiKey} />
                        <span style={{ fontSize: 11, color: C.t3 }}>{s.whatsappApiKey ? "Configured" : "Not set"}</span>
                      </div>
                    </div>
                    <SecretInput value={s.whatsappApiKey} onChange={v => upd("whatsappApiKey", v)} placeholder="Bearer eyJhbGci…" />
                    <p style={{ fontSize: 11, color: C.t3, margin: "5px 0 0" }}>Used to send automated WhatsApp messages via the Business API</p>
                  </div>
                </Group>

                {/* Meta Business Suite */}
                <Group label="Publishing · Meta Business Suite">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <Label>Meta Business API Token</Label>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <StatusDot ok={!!s.metaBusinessToken} />
                        <span style={{ fontSize: 11, color: C.t3 }}>{s.metaBusinessToken ? "Configured" : "Not set"}</span>
                      </div>
                    </div>
                    <SecretInput value={s.metaBusinessToken} onChange={v => upd("metaBusinessToken", v)} placeholder="Meta token…" />
                    <p style={{ fontSize: 11, color: C.t3, margin: "5px 0 0" }}>Enables actual post publishing via Facebook Graph API</p>
                  </div>
                </Group>

                {/* Scheduling */}
                <Group label="Scheduling · Buffer / Later">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <Label>Buffer / Later API Key</Label>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <StatusDot ok={!!s.bufferApiKey} />
                        <span style={{ fontSize: 11, color: C.t3 }}>{s.bufferApiKey ? "Configured" : "Not set"}</span>
                      </div>
                    </div>
                    <SecretInput value={s.bufferApiKey} onChange={v => upd("bufferApiKey", v)} placeholder="1/AQD8…" />
                    <p style={{ fontSize: 11, color: C.t3, margin: "5px 0 0" }}>Auto-schedule posts from the Content Calendar to go live on Instagram/XHS</p>
                  </div>
                </Group>

                {/* Zapier / Make */}
                <Group label="Automation · Zapier / Make">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <Label><Zap size={11} style={{ display: "inline", marginRight: 4 }} />Webhook URL</Label>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <StatusDot ok={!!s.zapierWebhookUrl} />
                        <span style={{ fontSize: 11, color: C.t3 }}>{s.zapierWebhookUrl ? "Configured" : "Not set"}</span>
                      </div>
                    </div>
                    <input value={s.zapierWebhookUrl} onChange={e => upd("zapierWebhookUrl", e.target.value)}
                      placeholder="https://hooks.zapier.com/hooks/catch/…" style={inp} />
                    <p style={{ fontSize: 11, color: C.t3, margin: "5px 0 0" }}>Fired when a deal moves stages in Pipeline — trigger Zapier/Make automations (e.g. add to CRM, send Slack alert)</p>
                  </div>
                </Group>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
                SECTION 4 — NOTIFICATIONS
            ════════════════════════════════════════════════════════ */}
            {section === "notifications" && (
              <div>
                <SectionHeading title="Notifications" desc="Control when and how you receive briefings, reminders, and reports." />

                <Group label="Morning Briefing">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <p style={{ fontSize: 13, color: C.text, fontWeight: 500, margin: 0 }}>Daily briefing time</p>
                        <p style={{ fontSize: 11.5, color: C.t2, margin: "2px 0 0" }}>The Kanban daily briefing currently fires on page load — set a preferred time for future push/email</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Clock size={14} color={C.t2} />
                      <input type="time" value={s.morningTime} onChange={e => upd("morningTime", e.target.value)}
                        style={{ ...inp, width: "auto", padding: "7px 12px" }} />
                      <span style={{ fontSize: 12, color: C.t2 }}>local time (MYT)</span>
                    </div>
                  </div>
                </Group>

                <Group label="Pipeline Reminders">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ fontSize: 13, color: C.text, fontWeight: 500, margin: 0 }}>Stalled deal alert</p>
                        <p style={{ fontSize: 11.5, color: C.t2, margin: "2px 0 0" }}>Alert when a Negotiation lead hasn't been contacted in</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                      <input type="number" min={1} max={30} value={s.followUpDays} onChange={e => upd("followUpDays", Math.max(1, +e.target.value))}
                        style={{ ...inp, width: 70, textAlign: "center", padding: "7px 10px" }} />
                      <span style={{ fontSize: 12.5, color: C.t2 }}>days without contact</span>
                    </div>
                    <p style={{ fontSize: 11, color: C.t3, margin: "8px 0 0" }}>Currently: Pipeline tab shows a red badge if any deal has been stalled {s.followUpDays}+ days</p>
                  </div>
                </Group>

                <Group label="Weekly Report">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r }}>
                    <div>
                      <p style={{ fontSize: 13, color: C.text, fontWeight: 500, margin: 0 }}>Weekly analytics report email</p>
                      <p style={{ fontSize: 11.5, color: C.t2, margin: "2px 0 0" }}>Sends a summary of posts, engagement, and pipeline every Monday morning</p>
                    </div>
                    <Toggle on={s.weeklyReportEmail} onChange={v => upd("weeklyReportEmail", v)} />
                  </div>
                  {s.weeklyReportEmail && (
                    <div>
                      <Label><Mail size={11} style={{ display: "inline", marginRight: 4 }} />Report delivery email</Label>
                      <input type="email" value={s.emailAddress} onChange={e => upd("emailAddress", e.target.value)}
                        placeholder="you@example.com" style={inp} />
                    </div>
                  )}
                </Group>

                <div style={{ background: "rgba(251,191,36,.07)", border: "1px solid rgba(251,191,36,.2)", borderRadius: C.r, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <AlertTriangle size={13} color="#fbbf24" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24" }}>Push & email notifications</span>
                  </div>
                  <p style={{ fontSize: 11.5, color: C.t2, margin: 0, lineHeight: 1.6 }}>
                    Push notifications and email delivery require a backend service (e.g. Resend, SendGrid). Currently, all alerts are shown in-dashboard only. Connect an email provider in Integrations to enable email delivery.
                  </p>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
                SECTION 5 — DATA & PRIVACY
            ════════════════════════════════════════════════════════ */}
            {section === "data" && (
              <div>
                <SectionHeading title="Data & Privacy" desc="Export your data, reset the dashboard, or delete your workspace." />

                <Group label="Export Data">
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={exportJson}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: C.s2, border: `1px solid ${C.borderHi}`, color: C.text, fontSize: 13, padding: "9px 18px", borderRadius: C.r, cursor: "pointer", transition: "all .12s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.aBd; (e.currentTarget as HTMLElement).style.color = C.accent; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHi; (e.currentTarget as HTMLElement).style.color = C.text; }}>
                      <Download size={14} /> Export as JSON
                    </button>
                    <button onClick={exportCsv}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: C.s2, border: `1px solid ${C.borderHi}`, color: C.text, fontSize: 13, padding: "9px 18px", borderRadius: C.r, cursor: "pointer", transition: "all .12s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.aBd; (e.currentTarget as HTMLElement).style.color = C.accent; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHi; (e.currentTarget as HTMLElement).style.color = C.text; }}>
                      <Download size={14} /> Export as CSV
                    </button>
                  </div>
                  <p style={{ fontSize: 11.5, color: C.t2, margin: "4px 0 0" }}>
                    Exports all <code style={{ background: C.s2, padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>flogen_*</code> localStorage keys — includes Kanban cards, Pipeline deals, Calendar posts, Scripts, Settings, and Outreach logs.
                  </p>
                </Group>

                <Group label="Reset Dashboard">
                  {!clearConfirm ? (
                    <div style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <p style={{ fontSize: 13, color: C.text, fontWeight: 500, margin: 0 }}>Clear localStorage & reset dashboard</p>
                        <p style={{ fontSize: 11.5, color: C.t2, margin: "2px 0 0" }}>Removes all Kanban cards, Pipeline data, posts, scripts, and settings. This cannot be undone.</p>
                      </div>
                      <button onClick={() => setClearConfirm(true)}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.25)", color: C.red, fontSize: 12.5, padding: "7px 14px", borderRadius: C.r2, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                        <Trash2 size={13} /> Reset
                      </button>
                    </div>
                  ) : (
                    <div style={{ background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.3)", borderRadius: C.r, padding: "16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <AlertTriangle size={14} color={C.red} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>Are you sure? This cannot be undone.</span>
                      </div>
                      <p style={{ fontSize: 12, color: C.t2, margin: "0 0 14px" }}>All local data will be erased and the dashboard will reset to its default state. Export your data first if you need a backup.</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={clearAll}
                          style={{ background: C.red, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 18px", borderRadius: C.r2, cursor: "pointer" }}>
                          Yes, reset everything
                        </button>
                        <button onClick={() => setClearConfirm(false)}
                          style={{ background: C.s2, border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 13, padding: "8px 18px", borderRadius: C.r2, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </Group>

                <Group label="Account">
                  <div style={{ background: C.s, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "14px 16px" }}>
                    <p style={{ fontSize: 13, color: C.text, fontWeight: 500, margin: "0 0 4px" }}>Delete account</p>
                    <p style={{ fontSize: 11.5, color: C.t2, margin: "0 0 12px" }}>Permanently delete your Flogen AI workspace and all associated data. This action is irreversible.</p>
                    <button
                      style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid rgba(248,113,113,.3)", color: C.red, fontSize: 12.5, padding: "7px 14px", borderRadius: C.r2, cursor: "pointer", opacity: 0.7 }}
                      title="Account deletion requires contacting support — coming soon">
                      <Trash2 size={13} /> Delete account — coming soon
                    </button>
                  </div>
                </Group>

                {/* Data stored indicator */}
                <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Stored localStorage keys</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {(() => {
                      const keys: string[] = [];
                      for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k?.startsWith("flogen_")) keys.push(k);
                      }
                      return keys.length > 0
                        ? keys.map(k => <span key={k} style={{ fontSize: 10, background: C.s3, color: C.t2, padding: "2px 7px", borderRadius: 4, fontFamily: "monospace" }}>{k}</span>)
                        : <span style={{ fontSize: 11.5, color: C.t3 }}>No Flogen data in localStorage</span>;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
