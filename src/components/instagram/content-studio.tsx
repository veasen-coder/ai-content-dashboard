"use client";

import { useEffect, useState } from "react";
import {
  Instagram, Heart, MessageCircle, ExternalLink, Plus, X,
  Sparkles, Copy, CheckCheck, Loader2, Send, RefreshCw,
  ImageIcon, Film, Grid3x3, Zap, Users, BookOpen, Tag,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface IGProfile {
  id: string;
  name: string;
  username: string;
  biography: string;
  followers_count: number;
  media_count: number;
  profile_picture_url: string;
  website: string;
}
interface IGPost {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}
type DraftStatus = "Draft" | "Scheduled";
type DraftPlatform = "Instagram" | "Xiaohongshu";
interface Draft {
  id: string;
  platform: DraftPlatform;
  caption: string;
  hashtags: string;
  contentType: string;
  status: DraftStatus;
  scheduledDate: string;
  notes: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0a", s: "#111", s2: "#171717", s3: "#1f1f1f",
  border: "rgba(255,255,255,0.07)", borderHi: "rgba(255,255,255,0.13)",
  accent: "#bbf088", aBg: "rgba(187,240,136,0.08)", aBd: "rgba(187,240,136,0.2)",
  text: "#f5f0e6", t2: "#9a9a9a", t3: "#4a4a4a",
  red: "#f87171", orange: "#fb923c", blue: "#60a5fa",
  r: "8px", r2: "5px",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT PILLARS — Flogen AI specific
// ─────────────────────────────────────────────────────────────────────────────
const PILLARS = [
  { label: "Pain-point Education", color: C.red,    desc: "Problems Malaysian SMEs face daily"        },
  { label: "Case Study / Result",  color: C.accent, desc: "Real client wins and transformation stories" },
  { label: "Product Showcase",     color: C.blue,   desc: "How Flogen AI works, features, demos"       },
  { label: "Industry Spotlight",   color: C.orange, desc: "Clinic, salon, F&B, property — rotation"    },
  { label: "Brand Story",          color: "#c4b5fd", desc: "Behind the scenes, founder story, mission" },
];

const INDUSTRIES = ["Real Estate", "Hair & Beauty", "Clinic", "F&B", "Retail", "E-Commerce", "Education", "Hotel"];
const CONTENT_TYPES = ["Reel", "Carousel", "Static", "Story", "XHS Post"];

const SYS_CAPTION = `You are the Caption Writer for Flogen AI (@flogen.ai), a Malaysian B2B WhatsApp AI Agency.
Write a high-converting Instagram caption for Malaysian SME owners.

Brand voice: Confident, direct, results-first. Light Malaysian English (occasional 'lah'/'lor'). Reference Klang Valley / KL / Malaysian SME context.
Always: strong hook, specific benefit, clear CTA to DM or visit flogenai.com.
End with 8–10 relevant hashtags on a new line.
Return 2 variants (A and B), clearly labelled.`;

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function Btn({ children, onClick, accent, small, full, disabled, secondary }: {
  children: React.ReactNode; onClick?: () => void; accent?: boolean; small?: boolean;
  full?: boolean; disabled?: boolean; secondary?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: accent ? C.accent : secondary ? "transparent" : "transparent", border: `1px solid ${accent ? "transparent" : C.borderHi}`, color: accent ? "#0a0a0a" : C.t2, fontSize: small ? 11.5 : 13, fontWeight: accent ? 600 : 400, padding: small ? "5px 12px" : "8px 18px", borderRadius: C.r2, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all .12s", whiteSpace: "nowrap", width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined, opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

function StatPill({ icon: Icon, value, label }: { icon: React.ElementType; value: string | number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "10px 16px" }}>
      <Icon size={14} color={C.accent} />
      <div>
        <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.01em" }}>{value}</p>
        <p style={{ fontSize: 11, color: C.t2, margin: 0 }}>{label}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL POST CARD
// ─────────────────────────────────────────────────────────────────────────────
function PostCard({ post }: { post: IGPost }) {
  const [hov, setHov]       = useState(false);
  const [expand, setExpand] = useState(false);
  const imgSrc = post.thumbnail_url || post.media_url;
  const date = new Date(post.timestamp).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
  const engRate = post.like_count > 0 ? ((post.like_count + post.comments_count)).toString() : "0";

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.s, border: `1px solid ${hov ? C.borderHi : C.border}`, borderRadius: C.r, overflow: "hidden", transition: "all .15s" }}>
      {/* Image */}
      <div style={{ position: "relative", paddingBottom: "100%", background: C.s2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt={post.caption?.slice(0, 60) ?? "IG post"}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "opacity .2s", opacity: hov ? 0.85 : 1 }} />
        {/* Type badge */}
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <span style={{ background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, padding: "2px 7px", borderRadius: 3, display: "flex", alignItems: "center", gap: 4 }}>
            {post.media_type === "VIDEO" ? <Film size={9} /> : post.media_type === "CAROUSEL_ALBUM" ? <Grid3x3 size={9} /> : <ImageIcon size={9} />}
            {post.media_type === "CAROUSEL_ALBUM" ? "Carousel" : post.media_type === "VIDEO" ? "Reel" : "Photo"}
          </span>
        </div>
        {/* Hover overlay */}
        {hov && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#fff", fontSize: 14, fontWeight: 600 }}><Heart size={16} fill="white" />{post.like_count}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#fff", fontSize: 14, fontWeight: 600 }}><MessageCircle size={16} fill="white" />{post.comments_count}</div>
          </div>
        )}
      </div>
      {/* Meta */}
      <div style={{ padding: "10px 12px" }}>
        <p style={{ fontSize: 11, color: C.t3, margin: "0 0 5px" }}>{date}</p>
        {post.caption && (
          <p onClick={() => setExpand(e => !e)} style={{ fontSize: 12, color: C.t2, margin: 0, lineHeight: 1.55, cursor: "pointer", overflow: expand ? "visible" : "hidden", display: expand ? "block" : "-webkit-box", WebkitLineClamp: expand ? undefined : 2, WebkitBoxOrient: "vertical" as const }}>
            {post.caption}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ fontSize: 11, color: C.t2, display: "flex", alignItems: "center", gap: 3 }}><Heart size={11} color={C.red} />{post.like_count}</span>
            <span style={{ fontSize: 11, color: C.t2, display: "flex", alignItems: "center", gap: 3 }}><MessageCircle size={11} color={C.blue} />{post.comments_count}</span>
          </div>
          <a href={post.permalink} target="_blank" rel="noopener noreferrer"
            style={{ color: C.t3, display: "flex", alignItems: "center", gap: 3, fontSize: 11, textDecoration: "none", transition: "color .12s" }}
            onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
            onMouseLeave={e => (e.currentTarget.style.color = C.t3)}>
            View <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAFT CARD
// ─────────────────────────────────────────────────────────────────────────────
function DraftCard({ draft, onDelete }: { draft: Draft; onDelete: () => void }) {
  const [hov, setHov]       = useState(false);
  const [expand, setExpand] = useState(false);
  const statusColor = draft.status === "Scheduled" ? C.accent : C.t2;

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.s, border: `1px solid ${draft.status === "Scheduled" ? C.aBd : C.border}`, borderRadius: C.r, padding: "14px 16px", transition: "all .15s" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, background: draft.platform === "Instagram" ? "rgba(251,146,60,.1)" : "rgba(248,113,113,.1)", color: draft.platform === "Instagram" ? C.orange : C.red, padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>{draft.platform}</span>
          <span style={{ fontSize: 11, background: C.s2, color: C.t2, padding: "2px 8px", borderRadius: 4 }}>{draft.contentType}</span>
          <span style={{ fontSize: 11, color: statusColor, background: `${statusColor}18`, padding: "2px 8px", borderRadius: 4 }}>{draft.status}</span>
        </div>
        <button onClick={onDelete} style={{ opacity: hov ? 1 : 0, transition: "opacity .12s", background: "none", border: "none", color: C.t3, cursor: "pointer", padding: 0, display: "flex" }}><X size={14} /></button>
      </div>
      <p style={{ fontSize: 13, color: C.text, margin: "0 0 6px", lineHeight: 1.5, overflow: expand ? "visible" : "hidden", display: expand ? "block" : "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, cursor: "pointer" }} onClick={() => setExpand(e => !e)}>
        {draft.caption || <span style={{ color: C.t3, fontStyle: "italic" }}>No caption yet</span>}
      </p>
      {draft.hashtags && <p style={{ fontSize: 11, color: C.blue, margin: "0 0 8px" }}>{draft.hashtags.slice(0, 80)}{draft.hashtags.length > 80 ? "…" : ""}</p>}
      {draft.scheduledDate && <p style={{ fontSize: 11, color: C.t2 }}>🗓 {new Date(draft.scheduledDate).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE POST PANEL — AI caption generator
// ─────────────────────────────────────────────────────────────────────────────
function CreatePanel({ onSaveDraft }: { onSaveDraft: (d: Draft) => void }) {
  const [topic, setTopic]       = useState("");
  const [industry, setInd]      = useState("Real Estate");
  const [pillar, setPillar]     = useState(PILLARS[0].label);
  const [platform, setPlat]     = useState<DraftPlatform>("Instagram");
  const [cType, setCType]       = useState("Reel");
  const [output, setOutput]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const [copied, setCopied]     = useState(false);
  const [schedDate, SchedDate]  = useState("");
  const [schedStatus, setSchedStatus] = useState<DraftStatus>("Draft");

  const inp: React.CSSProperties = { background: C.s2, border: `1px solid ${C.borderHi}`, color: C.text, fontSize: 13, padding: "9px 12px", borderRadius: C.r2, outline: "none", width: "100%", fontFamily: "inherit" };
  const sel: React.CSSProperties = { ...inp };

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setErr(""); setOutput("");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYS_CAPTION,
          userMessage: `Content type: ${cType}\nPlatform: ${platform}\nIndustry focus: ${industry}\nContent pillar: ${pillar}\nTopic / angle: ${topic}`,
          maxTokens: 1000,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data.content);
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  async function copyOutput() { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  function saveDraft() {
    if (!output.trim()) return;
    const lines      = output.split("\n");
    const hashLine   = lines.find(l => l.includes("#")) ?? "";
    const captionLines = lines.filter(l => !l.startsWith("#") && l.trim()).join("\n");
    onSaveDraft({
      id: Date.now().toString(),
      platform, contentType: cType, status: schedStatus,
      caption: captionLines, hashtags: hashLine,
      scheduledDate: schedDate,
      notes: `Generated for: ${topic}`,
      createdAt: new Date().toISOString(),
    });
    setOutput(""); setTopic("");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Left: inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, color: C.t2, display: "block", marginBottom: 5, fontWeight: 500 }}>Platform</label>
          <div style={{ display: "flex", gap: 6 }}>
            {(["Instagram","Xiaohongshu"] as DraftPlatform[]).map(p => (
              <button key={p} onClick={() => setPlat(p)}
                style={{ flex: 1, padding: "7px", borderRadius: C.r2, border: `1px solid ${platform === p ? C.aBd : C.border}`, background: platform === p ? C.aBg : "transparent", color: platform === p ? C.accent : C.t2, fontSize: 12.5, cursor: "pointer", transition: "all .12s" }}>
                {p === "Instagram" ? "📸 Instagram" : "🍠 Xiaohongshu"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: C.t2, display: "block", marginBottom: 5, fontWeight: 500 }}>Content Type</label>
          <select value={cType} onChange={e => setCType(e.target.value)} style={sel}>
            {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: C.t2, display: "block", marginBottom: 5, fontWeight: 500 }}>Industry Focus</label>
          <select value={industry} onChange={e => setInd(e.target.value)} style={sel}>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: C.t2, display: "block", marginBottom: 5, fontWeight: 500 }}>Content Pillar</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {PILLARS.map(p => (
              <button key={p.label} onClick={() => setPillar(p.label)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: C.r2, border: `1px solid ${pillar === p.label ? p.color + "40" : C.border}`, background: pillar === p.label ? p.color + "12" : "transparent", cursor: "pointer", textAlign: "left", transition: "all .12s" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 12, color: pillar === p.label ? p.color : C.t2, fontWeight: pillar === p.label ? 500 : 400 }}>{p.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: C.t2, display: "block", marginBottom: 5, fontWeight: 500 }}>Topic / Angle</label>
          <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Property agents miss leads after 9pm — WhatsApp AI fixes this" rows={3}
            style={{ ...inp, resize: "vertical" as const }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: C.t2, display: "block", marginBottom: 5, fontWeight: 500 }}>Schedule Date (optional)</label>
            <input type="datetime-local" value={schedDate} onChange={e => { SchedDate(e.target.value); if (e.target.value) setSchedStatus("Scheduled"); else setSchedStatus("Draft"); }} style={inp} />
          </div>
        </div>
        <Btn accent full onClick={generate} disabled={loading || !topic.trim()}>
          {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
          {loading ? "Generating…" : "Generate Caption with AI"}
        </Btn>
      </div>

      {/* Right: output */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 12, color: C.t2, margin: 0, fontWeight: 500 }}>AI Caption Output</p>
          {output && (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={copyOutput}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${C.borderHi}`, color: C.t2, fontSize: 11.5, padding: "4px 10px", borderRadius: C.r2, cursor: "pointer", transition: "all .12s" }}>
                {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={saveDraft}
                style={{ display: "flex", alignItems: "center", gap: 4, background: C.aBg, border: `1px solid ${C.aBd}`, color: C.accent, fontSize: 11.5, padding: "4px 10px", borderRadius: C.r2, cursor: "pointer", transition: "all .12s" }}>
                <Plus size={12} /> Save as Draft
              </button>
            </div>
          )}
        </div>

        {err && <div style={{ background: "rgba(248,113,113,.08)", border: `1px solid rgba(248,113,113,.2)`, borderRadius: C.r, padding: "12px 14px", color: C.red, fontSize: 12.5 }}>{err}</div>}

        {loading && (
          <div style={{ background: C.s2, borderRadius: C.r, padding: "40px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: C.t2, flex: 1 }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Writing your caption…
          </div>
        )}

        {!loading && !output && !err && (
          <div style={{ background: C.s2, borderRadius: C.r, padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: C.t3, flex: 1, border: `1px dashed ${C.border}` }}>
            <Sparkles size={24} />
            <p style={{ fontSize: 13, margin: 0, textAlign: "center" }}>Fill in the form and click Generate — AI will write 2 caption variants (A/B) tailored to @flogen.ai</p>
          </div>
        )}

        {output && !loading && (
          <pre style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "16px", color: C.text, fontSize: 12.5, lineHeight: 1.8, fontFamily: "inherit", whiteSpace: "pre-wrap", flex: 1, overflowY: "auto", maxHeight: 500, margin: 0 }}>{output}</pre>
        )}

        {/* Pillar guide */}
        <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: C.r, padding: "12px 14px" }}>
          <p style={{ fontSize: 11, color: C.t3, margin: "0 0 6px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>@flogen.ai Posting Rule</p>
          <p style={{ fontSize: 12, color: C.t2, margin: 0, lineHeight: 1.6 }}>Min 2 days between posts · Rotate industries every 3 posts · Every post ends with CTA to flogenai.com or DM</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const DRAFT_KEY = "flogen_ig_drafts";
function loadDrafts(): Draft[] {
  if (typeof window === "undefined") return [];
  try { const s = localStorage.getItem(DRAFT_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}
function saveDrafts(d: Draft[]) { if (typeof window !== "undefined") localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }

export function ContentStudio() {
  const [profile, setProfile] = useState<IGProfile | null>(null);
  const [posts, setPosts]     = useState<IGPost[]>([]);
  const [drafts, setDrafts]   = useState<Draft[]>([]);
  const [tab, setTab]         = useState<"published" | "drafts" | "create">("published");
  const [loading, setLoading] = useState(true);
  const [apiErr, setApiErr]   = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");

  useEffect(() => { setDrafts(loadDrafts()); }, []);

  async function fetchData() {
    setRefreshing(true);
    try {
      const [profRes, postsRes] = await Promise.all([
        fetch("/api/instagram/profile"),
        fetch("/api/instagram/posts"),
      ]);
      const profData  = await profRes.json();
      const postsData = await postsRes.json();
      if (profData.error)  setApiErr(profData.error);
      else setProfile(profData);
      if (!postsData.error && postsData.data) setPosts(postsData.data);
    } catch { setApiErr("Failed to connect to Instagram API"); }
    setLoading(false); setRefreshing(false);
    setLastRefreshed(new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }));
  }

  useEffect(() => { fetchData(); }, []);

  function addDraft(d: Draft) {
    const updated = [d, ...drafts];
    setDrafts(updated); saveDrafts(updated);
    setTab("drafts");
  }
  function deleteDraft(id: string) {
    const updated = drafts.filter(d => d.id !== id);
    setDrafts(updated); saveDrafts(updated);
  }

  const totalEng      = posts.reduce((s, p) => s + p.like_count + p.comments_count, 0);
  const avgEng        = posts.length ? (totalEng / posts.length).toFixed(1) : "0";
  const engRate       = profile && profile.followers_count > 0
    ? ((totalEng / (posts.length * profile.followers_count)) * 100).toFixed(1) + "%"
    : "—";
  const scheduledCount = drafts.filter(d => d.status === "Scheduled").length;

  const TABS = [
    { id: "published" as const, label: `Published (${posts.length})`, icon: Grid3x3 },
    { id: "drafts"    as const, label: `Drafts & Scheduled (${drafts.length})`, icon: BookOpen },
    { id: "create"    as const, label: "✦ Create Post", icon: Sparkles },
  ];

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif" }}>

        {/* ── Profile header ─────────────────────────────────────────────── */}
        <div style={{ background: C.s, borderBottom: `1px solid ${C.border}`, padding: "20px 28px" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.t2 }}><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading @flogen.ai…</div>
          ) : apiErr ? (
            <div style={{ background: "rgba(248,113,113,.08)", border: `1px solid rgba(248,113,113,.2)`, borderRadius: C.r, padding: "10px 14px", color: C.red, fontSize: 12.5 }}>{apiErr} — Add INSTAGRAM_ACCESS_TOKEN in Vercel Settings</div>
          ) : profile ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
              {/* Avatar */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profile.profile_picture_url} alt={profile.username}
                  style={{ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${C.accent}`, objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.s}` }}>
                  <Instagram size={11} color="#0a0a0a" />
                </div>
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>{profile.name}</h2>
                  <a href={`https://instagram.com/${profile.username}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13, color: C.t2, textDecoration: "none", display: "flex", alignItems: "center", gap: 3, transition: "color .12s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.t2)}>
                    @{profile.username} <ExternalLink size={11} />
                  </a>
                  <span style={{ fontSize: 11, background: C.aBg, color: C.accent, border: `1px solid ${C.aBd}`, padding: "2px 8px", borderRadius: 99 }}>● LIVE</span>
                </div>
                <p style={{ fontSize: 12.5, color: C.t2, margin: "6px 0 0", lineHeight: 1.6, maxWidth: 500 }}>{profile.biography}</p>
              </div>
              {/* Stats */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <StatPill icon={Users} value={profile.followers_count.toLocaleString()} label="Followers" />
                <StatPill icon={Grid3x3} value={profile.media_count} label="Posts" />
                <StatPill icon={Heart} value={avgEng} label="Avg Engagement" />
                <StatPill icon={Tag} value={engRate} label="Eng. Rate" />
              </div>
              <button onClick={fetchData} disabled={refreshing}
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.t2, padding: "6px 10px", borderRadius: C.r2, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, transition: "all .12s", alignSelf: "flex-start" }}>
                <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} /> Refresh
              </button>
            </div>
          ) : null}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div style={{ background: C.s, borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", gap: 2 }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)}
                style={{ background: "transparent", border: "none", borderBottom: `2px solid ${on ? C.accent : "transparent"}`, color: on ? C.text : C.t2, fontSize: 13, fontWeight: on ? 600 : 400, padding: "10px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all .15s", marginBottom: -1 }}>
                <Icon size={13} />
                {label}
              </button>
            );
          })}
          {scheduledCount > 0 && (
            <span style={{ alignSelf: "center", marginLeft: 6, fontSize: 11, background: C.aBg, color: C.accent, border: `1px solid ${C.aBd}`, padding: "2px 8px", borderRadius: 99 }}>
              {scheduledCount} scheduled
            </span>
          )}
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div style={{ padding: "24px 28px 60px", maxWidth: 1400, margin: "0 auto" }}>

          {/* PUBLISHED — real posts grid */}
          {tab === "published" && (
            <div>
              {loading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{ background: C.s, borderRadius: C.r, paddingBottom: "100%", animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: C.t3 }}>
                  <Instagram size={32} style={{ margin: "0 auto 12px" }} />
                  <p>No posts found. Check your Instagram token in Settings.</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 12.5, color: C.t2, margin: "0 0 16px" }}>
                    {posts.length} published posts from @{profile?.username ?? "flogen.ai"} · Showing real Instagram data
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
                    {posts.map(p => <PostCard key={p.id} post={p} />)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* DRAFTS */}
          {tab === "drafts" && (
            <div>
              {drafts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: C.t3 }}>
                  <BookOpen size={32} style={{ margin: "0 auto 12px" }} />
                  <p style={{ margin: "0 0 16px" }}>No drafts yet.</p>
                  <Btn accent onClick={() => setTab("create")}><Sparkles size={13} /> Create your first post</Btn>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 10 }}>
                  {drafts.map(d => <DraftCard key={d.id} draft={d} onDelete={() => deleteDraft(d.id)} />)}
                </div>
              )}
            </div>
          )}

          {/* CREATE */}
          {tab === "create" && <CreatePanel onSaveDraft={addDraft} />}

          {/* 9E: Last refreshed */}
          {lastRefreshed && (
            <p style={{ fontSize: 11, color: C.t3, textAlign: "right", marginTop: 24 }}>Last refreshed: {lastRefreshed}</p>
          )}
        </div>
      </div>
    </>
  );
}
