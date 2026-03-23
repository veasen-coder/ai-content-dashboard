"use client";

import { useState, useEffect } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Key, Database, BarChart2, Instagram, CheckCircle2,
  XCircle, Eye, EyeOff, Copy, CheckCheck, ExternalLink,
  Cpu, Globe, Palette, LayoutDashboard, ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface DashboardPrefs {
  colNames:    { today: string; week: string; backlog: string };
  visibleTabs: { sprint: boolean; projects: boolean; agents: boolean; focus: boolean };
  accentColor: string;
  appTagline:  string;
}

const DEFAULT_PREFS: DashboardPrefs = {
  colNames:    { today: "Today", week: "This Week", backlog: "Backlog" },
  visibleTabs: { sprint: true, projects: true, agents: true, focus: true },
  accentColor: "#bbf088",
  appTagline:  "We build the bots. You build the brand.",
};

// ─────────────────────────────────────────────────────────────────────────────
// API KEY DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const API_GROUPS = [
  {
    group: "AI Engine",
    Icon: Cpu,
    keys: [
      { key: "ANTHROPIC_API_KEY",     label: "Anthropic API Key",     hint: "Powers AI caption generation, schedule suggestions, and competitor analysis", link: "https://console.anthropic.com/settings/keys" },
    ],
  },
  {
    group: "Database",
    Icon: Database,
    keys: [
      { key: "NEXT_PUBLIC_SUPABASE_URL",      label: "Supabase Project URL",   hint: "Your Supabase project URL — found in Project Settings → API",  link: "https://supabase.com/dashboard" },
      { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase Anon Key",      hint: "The anon/public key — safe to use client-side",                link: "https://supabase.com/dashboard" },
    ],
  },
  {
    group: "Analytics",
    Icon: BarChart2,
    keys: [
      { key: "METRICOOL_API_KEY",    label: "Metricool API Key",     hint: "Enables live analytics from your Metricool account",  link: "https://app.metricool.com" },
      { key: "METRICOOL_USER_TOKEN", label: "Metricool User Token",  hint: "Your personal token — found in Metricool Settings → API", link: "https://app.metricool.com" },
    ],
  },
  {
    group: "Social",
    Icon: Instagram,
    keys: [
      { key: "INSTAGRAM_ACCESS_TOKEN",          label: "Instagram Access Token",        hint: "Meta Business Suite → Tools → Manage API access", link: "https://business.facebook.com" },
      { key: "INSTAGRAM_BUSINESS_ACCOUNT_ID",   label: "Instagram Business Account ID", hint: "Found in Instagram Business Settings",             link: "https://business.facebook.com" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACCENT COLOR OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
const ACCENT_OPTIONS = [
  { color: "#bbf088", label: "Lime (default)" },
  { color: "#60a5fa", label: "Blue" },
  { color: "#f472b6", label: "Pink" },
  { color: "#fb923c", label: "Orange" },
  { color: "#a78bfa", label: "Purple" },
  { color: "#34d399", label: "Emerald" },
];

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS (dark settings panel)
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  bg:      "#131a13",
  surface: "#1c261c",
  hover:   "#232e23",
  border:  "rgba(255,255,255,0.07)",
  borderHi:"rgba(255,255,255,0.13)",
  text:    "#e6e6e6",
  text2:   "#8a9e8a",
  text3:   "#4a604a",
  accent:  "#bbf088",
  accentBg:"rgba(187,240,136,0.09)",
  red:     "#f87171",
  green:   "#4ade80",
  radius:  "8px",
};

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE API KEY ROW
// ─────────────────────────────────────────────────────────────────────────────
function ApiKeyRow({ keyName, label, hint, link, value, onChange }: {
  keyName: string; label: string; hint: string; link: string;
  value: string; onChange: (v: string) => void;
}) {
  const [show, setShow]   = useState(false);
  const [copied, setCop]  = useState(false);
  const configured        = value.trim().length > 6;

  async function copyKey() {
    await navigator.clipboard.writeText(value);
    setCop(true);
    setTimeout(() => setCop(false), 2000);
  }

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${S.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {configured
            ? <CheckCircle2 size={13} color={S.green} />
            : <XCircle     size={13} color={S.text3} />
          }
          <span style={{ fontSize: 13, fontWeight: 500, color: S.text }}>{label}</span>
        </div>
        <a href={link} target="_blank" rel="noopener noreferrer"
          style={{ color: S.text3, display: "flex", alignItems: "center", gap: 3, fontSize: 11, textDecoration: "none", transition: "color .15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = S.accent)}
          onMouseLeave={e => (e.currentTarget.style.color = S.text3)}>
          Get key <ExternalLink size={10} />
        </a>
      </div>
      <p style={{ fontSize: 11.5, color: S.text3, margin: "0 0 8px", lineHeight: 1.5 }}>{hint}</p>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={`${keyName}=...`}
            style={{ width: "100%", background: S.surface, border: `1px solid ${S.borderHi}`, color: S.text, fontSize: 12, padding: "7px 36px 7px 10px", borderRadius: S.radius, outline: "none", fontFamily: "'JetBrains Mono','Fira Code',monospace" }}
          />
          <button onClick={() => setShow(s => !s)}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: S.text3, cursor: "pointer", padding: 0, display: "flex" }}>
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        {configured && (
          <button onClick={copyKey}
            style={{ background: S.surface, border: `1px solid ${S.borderHi}`, color: copied ? S.accent : S.text2, borderRadius: S.radius, cursor: "pointer", padding: "7px 10px", display: "flex", alignItems: "center", gap: 4, fontSize: 12, transition: "all .15s" }}>
            {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV SIDEBAR within settings
// ─────────────────────────────────────────────────────────────────────────────
type Section = "api" | "dashboard" | "appearance";

const SECTIONS: { id: Section; label: string; Icon: React.ElementType }[] = [
  { id: "api",        label: "API Keys",         Icon: Key            },
  { id: "dashboard",  label: "Dashboard",        Icon: LayoutDashboard },
  { id: "appearance", label: "Appearance",       Icon: Palette        },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SETTINGS PANEL
// ─────────────────────────────────────────────────────────────────────────────
interface SettingsPanelProps {
  open:     boolean;
  onClose:  () => void;
  prefs:    DashboardPrefs;
  onPrefs:  (p: DashboardPrefs) => void;
}

export function SettingsPanel({ open, onClose, prefs, onPrefs }: SettingsPanelProps) {
  const [section, setSection]   = useState<Section>("api");
  const [apiKeys, setApiKeys]   = useState<Record<string, string>>({});
  const [saved,   setSaved]     = useState(false);
  const [envCopied, setEnvCop]  = useState(false);

  // Load saved keys from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("flogen_api_keys");
      if (stored) setApiKeys(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  function setKey(k: string, v: string) {
    setApiKeys(prev => ({ ...prev, [k]: v }));
  }

  function save() {
    localStorage.setItem("flogen_api_keys", JSON.stringify(apiKeys));
    localStorage.setItem("flogen_prefs", JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function copyEnvFile() {
    const allKeys = API_GROUPS.flatMap(g => g.keys);
    const lines = allKeys.map(({ key }) => `${key}=${apiKeys[key] ?? ""}`);
    await navigator.clipboard.writeText(lines.join("\n"));
    setEnvCop(true);
    setTimeout(() => setEnvCop(false), 2500);
  }

  const configuredCount = API_GROUPS.flatMap(g => g.keys).filter(({ key }) => (apiKeys[key] ?? "").trim().length > 6).length;
  const totalKeys       = API_GROUPS.flatMap(g => g.keys).length;

  const inp: React.CSSProperties = {
    background: S.surface, border: `1px solid ${S.borderHi}`, color: S.text,
    fontSize: 13, padding: "7px 10px", borderRadius: S.radius,
    outline: "none", width: "100%",
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="left"
        style={{ padding: 0, background: S.bg, border: "none", borderRight: `1px solid ${S.border}`, width: 520, maxWidth: "90vw", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif" }}
      >
        <SheetHeader style={{ padding: "20px 20px 0" }}>
          <SheetTitle style={{ color: S.text, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>
            Settings
          </SheetTitle>
          <p style={{ fontSize: 12.5, color: S.text3, margin: "4px 0 0" }}>
            {configuredCount}/{totalKeys} APIs configured
          </p>
        </SheetHeader>

        <div style={{ display: "flex", height: "calc(100% - 80px)", marginTop: 16 }}>
          {/* Left nav */}
          <div style={{ width: 160, borderRight: `1px solid ${S.border}`, padding: "8px 8px", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
            {SECTIONS.map(({ id, label, Icon }) => {
              const on = section === id;
              return (
                <button key={id} onClick={() => setSection(id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: on ? S.accentBg : "transparent", border: on ? `1px solid rgba(187,240,136,.15)` : "1px solid transparent", borderRadius: "6px", color: on ? S.accent : S.text2, fontSize: 13, cursor: "pointer", textAlign: "left", transition: "all .15s", width: "100%" }}>
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Right content */}
          <div style={{ flex: 1, overflow: "auto", padding: "16px 20px 20px" }}>

            {/* ── API KEYS ─────────────────────────────────────────────── */}
            {section === "api" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: S.text, margin: 0 }}>API Keys</h3>
                    <p style={{ fontSize: 12, color: S.text3, margin: "3px 0 0" }}>
                      Keys are saved to localStorage. For production, add to <code style={{ background: S.surface, padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>.env.local</code>
                    </p>
                  </div>
                  <button onClick={copyEnvFile}
                    style={{ background: S.surface, border: `1px solid ${S.borderHi}`, color: envCopied ? S.accent : S.text2, fontSize: 11.5, padding: "5px 10px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all .15s", whiteSpace: "nowrap" }}>
                    {envCopied ? <CheckCheck size={12} /> : <Copy size={12} />}
                    {envCopied ? "Copied!" : "Copy .env.local"}
                  </button>
                </div>

                {API_GROUPS.map(({ group, Icon, keys }) => (
                  <div key={group} style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                      <Icon size={12} color={S.text3} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: S.text3, letterSpacing: "0.06em", textTransform: "uppercase" }}>{group}</span>
                    </div>
                    {keys.map(k => (
                      <ApiKeyRow key={k.key}
                        keyName={k.key} label={k.label} hint={k.hint} link={k.link}
                        value={apiKeys[k.key] ?? ""} onChange={v => setKey(k.key, v)} />
                    ))}
                  </div>
                ))}

                {/* .env.local instructions */}
                <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: S.radius, padding: "14px 16px", marginTop: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: S.text2, margin: "0 0 8px" }}>
                    How to go live on Vercel
                  </p>
                  {["1. Copy your .env.local using the button above", "2. Go to vercel.com → your project → Settings → Environment Variables", "3. Paste each key individually", "4. Trigger a new deployment — keys take effect immediately"].map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: S.accent, fontWeight: 600, width: 14, flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ fontSize: 12, color: S.text3, lineHeight: 1.5 }}>{step.slice(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── DASHBOARD CUSTOMIZE ───────────────────────────────────── */}
            {section === "dashboard" && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: S.text, margin: "0 0 4px" }}>Dashboard</h3>
                <p style={{ fontSize: 12, color: S.text3, margin: "0 0 20px" }}>Rename columns, toggle tabs, and configure your sprint board</p>

                {/* Sprint column names */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: S.text3, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px" }}>Sprint Column Names</p>
                  {(["today", "week", "backlog"] as const).map(col => (
                    <div key={col} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: S.text2, width: 60, flexShrink: 0, textTransform: "capitalize" }}>{col}</span>
                      <input value={prefs.colNames[col]}
                        onChange={e => onPrefs({ ...prefs, colNames: { ...prefs.colNames, [col]: e.target.value } })}
                        style={inp} />
                    </div>
                  ))}
                </div>

                {/* Visible tabs */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: S.text3, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px" }}>Visible Tabs</p>
                  {(Object.entries(prefs.visibleTabs) as [keyof DashboardPrefs["visibleTabs"], boolean][]).map(([tab, on]) => (
                    <div key={tab} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${S.border}` }}>
                      <span style={{ fontSize: 13, color: S.text, textTransform: "capitalize" }}>{tab === "sprint" ? "Sprint Board" : tab === "focus" ? "Weekly Focus" : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                      <button onClick={() => onPrefs({ ...prefs, visibleTabs: { ...prefs.visibleTabs, [tab]: !on } })}
                        style={{ width: 38, height: 21, background: on ? S.accent : "rgba(255,255,255,.1)", borderRadius: 99, border: "none", cursor: "pointer", position: "relative", transition: "background .18s" }}>
                        <div style={{ width: 17, height: 17, borderRadius: "50%", background: on ? "#191919" : S.text3, position: "absolute", top: 2, left: on ? 19 : 2, transition: "left .18s" }} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Tagline */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: S.text3, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px" }}>Header Tagline</p>
                  <input value={prefs.appTagline}
                    onChange={e => onPrefs({ ...prefs, appTagline: e.target.value })}
                    placeholder="We build the bots. You build the brand."
                    style={inp} />
                </div>
              </div>
            )}

            {/* ── APPEARANCE ───────────────────────────────────────────── */}
            {section === "appearance" && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: S.text, margin: "0 0 4px" }}>Appearance</h3>
                <p style={{ fontSize: 12, color: S.text3, margin: "0 0 20px" }}>Dashboard accent color and visual preferences</p>

                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: S.text3, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 12px" }}>Accent Color</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {ACCENT_OPTIONS.map(({ color, label }) => {
                      const selected = prefs.accentColor === color;
                      return (
                        <button key={color} onClick={() => onPrefs({ ...prefs, accentColor: color })}
                          title={label}
                          style={{ width: 36, height: 36, borderRadius: "50%", background: color, border: selected ? `3px solid ${S.text}` : "3px solid transparent", cursor: "pointer", transition: "all .15s", boxShadow: selected ? `0 0 0 2px ${S.bg}, 0 0 0 4px ${color}` : "none" }}>
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: 12, color: S.text3, marginTop: 10 }}>
                    Current: <span style={{ color: prefs.accentColor, fontWeight: 600 }}>{prefs.accentColor}</span>
                    {" "}— <span style={{ color: S.text3 }}>{ACCENT_OPTIONS.find(o => o.color === prefs.accentColor)?.label}</span>
                  </p>
                </div>

                {/* Preview */}
                <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: S.radius, padding: "16px 18px" }}>
                  <p style={{ fontSize: 11, color: S.text3, margin: "0 0 12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Preview</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, background: prefs.accentColor, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 14 }}>⚡</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: S.text, margin: 0 }}>Flogen AI</p>
                      <p style={{ fontSize: 11, color: S.text3, margin: 0 }}>{prefs.appTagline || "We build the bots. You build the brand."}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, height: 4, background: "rgba(255,255,255,.07)", borderRadius: 99 }}>
                    <div style={{ width: "65%", height: "100%", background: prefs.accentColor, borderRadius: 99, opacity: 0.8 }} />
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                    {["Sprint", "Projects", "Agents"].map(t => (
                      <span key={t} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 5, background: t === "Sprint" ? `${prefs.accentColor}18` : "transparent", color: t === "Sprint" ? prefs.accentColor : S.text3, border: `1px solid ${t === "Sprint" ? prefs.accentColor + "30" : "transparent"}` }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer save button */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 20px", background: S.bg, borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose}
            style={{ background: "transparent", border: `1px solid ${S.border}`, color: S.text2, fontSize: 13, padding: "7px 16px", borderRadius: "6px", cursor: "pointer" }}>
            Close
          </button>
          <button onClick={save}
            style={{ background: saved ? "#4ade80" : S.accent, border: "none", color: "#131a13", fontSize: 13, fontWeight: 600, padding: "7px 20px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all .15s" }}>
            {saved ? <CheckCheck size={14} /> : null}
            {saved ? "Saved!" : "Save changes"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
