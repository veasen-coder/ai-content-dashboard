"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io as ioConnect, Socket } from "socket.io-client";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  WifiOff,
  Loader2,
  RefreshCw,
  Send,
  Search,
  Phone,
  MoreVertical,
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
  Settings,
  Users,
  MessageCircle,
  QrCode,
  Plug,
  Bot,
  Mic,
  Paperclip,
  Circle,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WaSession {
  id: string;
  name: string;
  status: "connected" | "connecting" | "disconnected" | "qr_ready";
  phone?: string;
  phone_number?: string;
  qrCode?: string;
}

interface WaChat {
  id: string;
  jid: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isGroup: boolean;
  avatarInitials: string;
}

interface WaMessage {
  id: string;
  fromMe: boolean;
  body: string;
  timestamp: number;
  status: "pending" | "sent" | "delivered" | "read" | "error";
  type: "text" | "image" | "document" | "audio" | "sticker" | "video" | "ptt";
  mediaUrl?: string;
  mediaMimetype?: string;
  caption?: string;
}

type Tab = "inbox" | "contacts" | "settings";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatTime(ts: number | string): string {
  // Handle numeric strings (Unix timestamps stored as strings from SQLite)
  let date: Date;
  if (typeof ts === "string" && /^\d+$/.test(ts)) {
    date = new Date(parseInt(ts, 10) * 1000);
  } else if (typeof ts === "string") {
    date = new Date(ts);
  } else {
    date = new Date(ts * 1000);
  }
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-MY", { weekday: "short" });
  }
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

function avatarColor(name: string): string {
  const colors = [
    "bg-violet-600",
    "bg-blue-600",
    "bg-emerald-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-cyan-600",
    "bg-indigo-600",
    "bg-teal-600",
  ];
  let hash = 0;
  for (const ch of name) hash += ch.charCodeAt(0);
  return colors[hash % colors.length];
}

// ─── Status indicator ────────────────────────────────────────────────────────

function StatusPill({ status }: { status: WaSession["status"] }) {
  const map = {
    connected: {
      label: "Connected",
      dot: "bg-[#25D366]",
      text: "text-[#25D366]",
    },
    connecting: {
      label: "Connecting…",
      dot: "bg-amber-400",
      text: "text-amber-400",
    },
    disconnected: {
      label: "Disconnected",
      dot: "bg-red-500",
      text: "text-red-400",
    },
    qr_ready: {
      label: "Scan QR",
      dot: "bg-primary",
      text: "text-primary",
    },
  };

  const s = map[status];
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", s.text)}>
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          s.dot,
          status === "connecting" && "animate-pulse"
        )}
      />
      {s.label}
    </span>
  );
}

// ─── Message status icon ─────────────────────────────────────────────────────

function MsgStatus({ status }: { status: WaMessage["status"] }) {
  if (status === "pending") return <Clock className="h-3 w-3 text-muted-foreground/50" />;
  if (status === "sent") return <Check className="h-3 w-3 text-muted-foreground/60" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-muted-foreground/60" />;
  if (status === "read") return <CheckCheck className="h-3 w-3 text-[#25D366]" />;
  if (status === "error") return <AlertCircle className="h-3 w-3 text-red-400" />;
  return null;
}

// ─── QR Connect Panel ────────────────────────────────────────────────────────

function ConnectPanel({
  session,
  onConnect,
  onRefresh,
}: {
  session: WaSession | null;
  onConnect: () => void;
  onRefresh: () => void;
}) {
  const [connecting, setConnecting] = useState(false);

  // Auto-clear spinner the moment a QR code or connected status arrives
  useEffect(() => {
    if (session?.qrCode || session?.status === "connected" || session?.status === "qr_ready") {
      setConnecting(false);
    }
  }, [session?.qrCode, session?.status]);

  async function handleConnect() {
    setConnecting(true);
    await onConnect();
    // Parent now drives polling via startQrPolling().
    // Fallback: stop spinner after 15 s if nothing arrives
    setTimeout(() => setConnecting(false), 15000);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#1E1E1E] bg-[#111111]">
        {connecting
          ? <Loader2 className="h-10 w-10 animate-spin text-[#25D366]/60" />
          : <QrCode className="h-10 w-10 text-muted-foreground/40" />
        }
      </div>

      {session?.qrCode ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-foreground">
            Scan this QR code with WhatsApp
          </p>
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Open WhatsApp on your phone → Linked Devices → Link a Device
          </p>
          <div className="rounded-xl border border-[#1E1E1E] bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={session.qrCode} alt="WhatsApp QR Code" className="h-52 w-52" />
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh QR
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-semibold text-foreground">
            {connecting ? "Starting connection…" : "WhatsApp not connected"}
          </p>
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            {connecting
              ? "Generating QR code — this takes a few seconds"
              : "Click Connect to generate a QR code, then scan it with your phone"}
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {connecting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Plug className="h-4 w-4" />
            }
            {connecting ? "Connecting…" : "Connect Session"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Empty chat state ─────────────────────────────────────────────────────────

function EmptyChat() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1E1E1E] bg-[#111111]">
        <MessageCircle className="h-8 w-8 text-muted-foreground/30" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Select a chat</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose a conversation from the list to view messages
        </p>
      </div>
    </div>
  );
}

// ─── Offline / error state ───────────────────────────────────────────────────

function BackendOffline({ url, onSettings }: { url: string; onSettings: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5">
        <WifiOff className="h-8 w-8 text-red-400/60" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Backend Unreachable</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Could not connect to{" "}
          <span className="font-mono text-primary/80">{url || "—"}</span>. Make
          sure your WhatsApp backend is running.
        </p>
      </div>
      <button
        onClick={onSettings}
        className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
      >
        <Settings className="h-4 w-4" />
        Open Settings
      </button>
    </div>
  );
}

// ─── No-Proxy Confirmation Modal ─────────────────────────────────────────────

function NoProxyConfirmModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/20 bg-[#111111] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#1E1E1E] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
              <ShieldAlert className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No Proxy Detected</p>
              <p className="text-xs text-muted-foreground">Higher ban risk</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are about to connect WhatsApp <span className="font-semibold text-foreground">without a residential proxy</span>. Your server&apos;s IP address will be exposed to WhatsApp directly.
          </p>

          <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Risks without proxy</p>
            {[
              "WhatsApp may detect server/datacenter IP",
              "Higher chance of session ban on new numbers",
              "Account may require re-verification",
            ].map((r) => (
              <p key={r} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 shrink-0 text-red-400">✕</span>
                {r}
              </p>
            ))}
          </div>

          <div className="rounded-xl border border-[#25D366]/10 bg-[#25D366]/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-[#25D366] uppercase tracking-wider">Safer with residential proxy</p>
            {[
              "Looks like a real phone on a home network",
              "Malaysian IP matches your target market",
              "Significantly lower ban rate",
            ].map((r) => (
              <p key={r} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 shrink-0 text-[#25D366]">✓</span>
                {r}
              </p>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-[#1E1E1E] px-5 py-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[#1E1E1E] py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
          >
            Go Back &amp; Add Proxy
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            Proceed Without Proxy
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ──────────────────────────────────────────────────────────

interface ProxyConfig {
  enabled: boolean;
  type: "http" | "socks5";
  host: string;
  port: string;
  username: string;
  password: string;
}

interface AiConfig {
  ai_reply_enabled: boolean;
  openai_api_key: string;
  ai_system_prompt: string;
  ai_model: string;
  ai_temperature: number;
  ai_max_tokens: number;
  ai_top_p: number;
  ai_frequency_penalty: number;
  ai_presence_penalty: number;
  ai_context_window: number;
  ai_fallback_message: string;
  // Timing
  ai_reply_delay_mode: "fixed" | "random" | "human_typing";
  ai_reply_delay_min_ms: number;
  ai_reply_delay_max_ms: number;
  ai_typing_speed_wpm: number;
  ai_read_delay_ms: number;
  // Human sim
  ai_send_typing_indicator: boolean;
  ai_mark_read_before_reply: boolean;
  ai_simulate_online: boolean;
  ai_split_long_messages: boolean;
  ai_split_delay_ms: number;
  ai_add_filler_phrases: boolean;
  ai_avoid_duplicate_replies: boolean;
  // Rate limits
  ai_max_replies_per_hour: number;
  ai_max_replies_per_day: number;
  ai_cooldown_same_contact_ms: number;
  ai_ignore_broadcast: boolean;
  ai_ignore_forwarded: boolean;
  ai_reply_to_groups: boolean;
  // Working hours
  ai_working_hours_enabled: boolean;
  ai_working_hours_start: string;
  ai_working_hours_end: string;
  ai_working_hours_timezone: string;
  ai_working_days: string;
  // Contact filter
  ai_contact_filter_mode: "all" | "whitelist" | "blacklist";
  ai_contact_filter_list: string;
  // Triggers
  ai_trigger_keywords: string;
  ai_stop_keywords: string;
  ai_handoff_enabled: boolean;
  ai_handoff_webhook: string;
  ai_handoff_trigger_count: number;
}

const AI_DEFAULTS: AiConfig = {
  ai_reply_enabled: false, openai_api_key: "", ai_system_prompt: "", ai_model: "gpt-4o-mini",
  ai_temperature: 0.7, ai_max_tokens: 500, ai_top_p: 1.0, ai_frequency_penalty: 0.0,
  ai_presence_penalty: 0.0, ai_context_window: 10, ai_fallback_message: "",
  ai_reply_delay_mode: "random", ai_reply_delay_min_ms: 3000, ai_reply_delay_max_ms: 12000,
  ai_typing_speed_wpm: 45, ai_read_delay_ms: 1500, ai_send_typing_indicator: true,
  ai_mark_read_before_reply: true, ai_simulate_online: true, ai_split_long_messages: true,
  ai_split_delay_ms: 2000, ai_add_filler_phrases: false, ai_avoid_duplicate_replies: true,
  ai_max_replies_per_hour: 0, ai_max_replies_per_day: 0, ai_cooldown_same_contact_ms: 5000,
  ai_ignore_broadcast: true, ai_ignore_forwarded: false, ai_reply_to_groups: false,
  ai_working_hours_enabled: false, ai_working_hours_start: "09:00", ai_working_hours_end: "18:00",
  ai_working_hours_timezone: "Asia/Kuala_Lumpur", ai_working_days: "1,2,3,4,5",
  ai_contact_filter_mode: "all", ai_contact_filter_list: "[]",
  ai_trigger_keywords: "[]", ai_stop_keywords: "[]", ai_handoff_enabled: false,
  ai_handoff_webhook: "", ai_handoff_trigger_count: 3,
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 outline-none focus:outline-none",
        value ? "bg-[#25D366]" : "bg-[#333]"
      )}
    >
      <span className={cn(
        "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
        value ? "translate-x-5" : "translate-x-0"
      )} />
    </button>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({ title, icon, children, defaultOpen = false }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-[#1A1A1A] transition-colors outline-none focus:outline-none"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
          <span>{icon}</span>{title}
        </span>
        <svg
          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open ? "rotate-180" : "")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-[#1E1E1E] px-5 py-4 space-y-3">{children}</div>}
    </div>
  );
}

function SettingsPanel({
  backendUrl,
  sessionId,
  jwtToken,
  onSave,
  onAuth,
}: {
  backendUrl: string;
  sessionId?: string;
  jwtToken: string;
  onSave: (url: string) => void;
  onAuth: (token: string) => void;
}) {
  const [url, setUrl] = useState(backendUrl);
  const [urlSaved, setUrlSaved] = useState(false);
  const [pin, setPin] = useState("");
  const [authStatus, setAuthStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  // Proxy state
  const [proxy, setProxy] = useState<ProxyConfig>({ enabled: false, type: "socks5", host: "", port: "", username: "", password: "" });
  const [proxySaved, setProxySaved] = useState(false);
  const [proxySaving, setProxySaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNoProxyModal, setShowNoProxyModal] = useState(false);
  const [pendingConnect, setPendingConnect] = useState(false);

  // AI settings state
  const [ai, setAi] = useState<AiConfig>(AI_DEFAULTS);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const authH = useCallback((): Record<string, string> =>
    jwtToken ? { "Authorization": `Bearer ${jwtToken}` } : {}
  , [jwtToken]);

  // Load proxy + AI settings
  useEffect(() => {
    if (!backendUrl || !sessionId) return;
    const h: Record<string, string> = jwtToken ? { "Authorization": `Bearer ${jwtToken}` } : {};
    fetch(`${backendUrl}/api/sessions/${sessionId}/proxy`, { headers: h })
      .then((r) => r.json())
      .then((d) => setProxy({ enabled: !!d.proxy_enabled, type: d.proxy_type ?? "socks5", host: d.proxy_host ?? "", port: d.proxy_port ?? "", username: d.proxy_username ?? "", password: "" }))
      .catch(() => {});
    fetch(`${backendUrl}/api/sessions/${sessionId}/ai`, { headers: h })
      .then((r) => r.json())
      .then((d) => setAi((prev) => ({ ...prev, ...d, openai_api_key: "" })))
      .catch(() => {});
  }, [backendUrl, sessionId, jwtToken]);

  async function handleSaveUrl() {
    const cleaned = url.trim().replace(/\/$/, "");
    onSave(cleaned);
    setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 2000);
  }

  async function handleAuth() {
    if (!pin || !url) return;
    setAuthStatus("loading");
    try {
      const res = await fetch(`${url.trim().replace(/\/$/, "")}/api/auth/pin`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error("Wrong PIN");
      const data = await res.json();
      localStorage.setItem("wa_jwt_token", data.token);
      onAuth(data.token);
      setAuthStatus("ok");
      setTimeout(() => setAuthStatus("idle"), 3000);
    } catch {
      setAuthStatus("error");
      setTimeout(() => setAuthStatus("idle"), 3000);
    }
  }

  async function saveProxy(config: ProxyConfig) {
    if (!backendUrl || !sessionId) return;
    setProxySaving(true);
    try {
      await fetch(`${backendUrl}/api/sessions/${sessionId}/proxy`, {
        method: "PUT", headers: { "Content-Type": "application/json", ...authH() },
        body: JSON.stringify({ proxy_enabled: config.enabled, proxy_type: config.type, proxy_host: config.host, proxy_port: config.port, proxy_username: config.username, proxy_password: config.password || undefined }),
      });
      setProxySaved(true);
      setTimeout(() => setProxySaved(false), 2000);
    } catch { /* silent */ } finally { setProxySaving(false); }
  }

  async function saveAi() {
    if (!backendUrl || !sessionId) return;
    setAiSaving(true);
    try {
      const payload: Record<string, unknown> = { ...ai };
      if (!payload.openai_api_key) delete payload.openai_api_key;
      await fetch(`${backendUrl}/api/sessions/${sessionId}/ai`, {
        method: "PUT", headers: { "Content-Type": "application/json", ...authH() },
        body: JSON.stringify(payload),
      });
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 2500);
    } catch { /* silent */ } finally { setAiSaving(false); }
  }

  const setA = <K extends keyof AiConfig>(k: K, v: AiConfig[K]) => setAi((p) => ({ ...p, [k]: v }));

  function handleProxyToggle(enabled: boolean) {
    if (!enabled && proxy.enabled) { setShowNoProxyModal(true); setPendingConnect(false); return; }
    setProxy((p) => ({ ...p, enabled }));
  }
  function handleSaveProxy() {
    if (!proxy.enabled) { setShowNoProxyModal(true); setPendingConnect(true); return; }
    saveProxy(proxy);
  }

  const TIMEZONES = ["UTC", "Asia/Kuala_Lumpur", "Asia/Singapore", "Asia/Jakarta", "Asia/Bangkok", "Asia/Manila", "Asia/Tokyo", "Asia/Shanghai", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris"];
  const DAYS = [{ v: "1", l: "Mon" }, { v: "2", l: "Tue" }, { v: "3", l: "Wed" }, { v: "4", l: "Thu" }, { v: "5", l: "Fri" }, { v: "6", l: "Sat" }, { v: "7", l: "Sun" }];
  const activeDays = new Set(ai.ai_working_days.split(",").map((d) => d.trim()));

  function toggleDay(v: string) {
    const s = new Set(activeDays);
    if (s.has(v)) { s.delete(v); } else { s.add(v); }
    setA("ai_working_days", Array.from(s).sort().join(","));
  }

  function parseKeywords(raw: string): string[] {
    try { return JSON.parse(raw); } catch { return []; }
  }

  function serializeKeywords(arr: string[]): string {
    return JSON.stringify(arr);
  }

  return (
    <div className="flex-1 overflow-auto p-5">
      {showNoProxyModal && (
        <NoProxyConfirmModal
          onCancel={() => { setShowNoProxyModal(false); setPendingConnect(false); }}
          onConfirm={() => {
            setShowNoProxyModal(false);
            if (pendingConnect) saveProxy({ ...proxy, enabled: false });
            else setProxy((p) => ({ ...p, enabled: false }));
            setPendingConnect(false);
          }}
        />
      )}

      <div className="mx-auto max-w-2xl space-y-4">

        {/* ── AI Auto-Reply ───────────────────────────────────── */}
        <SectionCard title="AI Auto-Reply" icon="🤖" defaultOpen={true}>
          <SettingRow label="Enable AI Auto-Reply" hint="AI will automatically respond to incoming messages">
            <Toggle value={ai.ai_reply_enabled} onChange={(v) => setA("ai_reply_enabled", v)} />
          </SettingRow>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">OpenAI API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={ai.openai_api_key}
                onChange={(e) => setA("openai_api_key", e.target.value)}
                placeholder="sk-... (leave blank to keep existing)"
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 pr-9 font-mono text-xs outline-none transition-colors focus:border-primary"
              />
              <button type="button" onClick={() => setShowApiKey((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground">
                {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Model</label>
            <select
              value={ai.ai_model}
              onChange={(e) => setA("ai_model", e.target.value)}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              {["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">System Prompt</label>
            <textarea
              value={ai.ai_system_prompt}
              onChange={(e) => setA("ai_system_prompt", e.target.value)}
              placeholder="You are a helpful assistant for [your business]. Answer questions about [topic]..."
              rows={4}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Temperature ({ai.ai_temperature})</label>
              <input type="range" min={0} max={2} step={0.1} value={ai.ai_temperature} onChange={(e) => setA("ai_temperature", parseFloat(e.target.value))} className="w-full accent-[#25D366]" />
              <div className="flex justify-between text-[10px] text-muted-foreground/50"><span>Precise</span><span>Creative</span></div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Max Tokens ({ai.ai_max_tokens})</label>
              <input type="range" min={50} max={2000} step={50} value={ai.ai_max_tokens} onChange={(e) => setA("ai_max_tokens", parseInt(e.target.value))} className="w-full accent-[#25D366]" />
              <div className="flex justify-between text-[10px] text-muted-foreground/50"><span>Short</span><span>Long</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Context Window</label>
              <input type="number" min={1} max={50} value={ai.ai_context_window} onChange={(e) => setA("ai_context_window", parseInt(e.target.value))}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
              <p className="mt-0.5 text-[10px] text-muted-foreground/50">Past messages sent as context</p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Fallback Message</label>
              <input type="text" value={ai.ai_fallback_message} onChange={(e) => setA("ai_fallback_message", e.target.value)} placeholder="Sorry, I couldn't understand that."
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>
        </SectionCard>

        {/* ── Reply Timing (Anti-Ban) ─────────────────────────── */}
        <SectionCard title="Reply Timing — Anti-Ban" icon="⏱️" defaultOpen={true}>
          <p className="text-[11px] text-amber-400/80">Critical: human-like delays prevent WhatsApp from detecting automation</p>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Delay Mode</label>
            <div className="flex gap-2">
              {(["fixed", "random", "human_typing"] as const).map((mode) => (
                <button key={mode} onClick={() => setA("ai_reply_delay_mode", mode)}
                  className={cn("flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors",
                    ai.ai_reply_delay_mode === mode ? "border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]" : "border-[#1E1E1E] text-muted-foreground hover:text-foreground")}>
                  {mode === "human_typing" ? "Human Speed" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {ai.ai_reply_delay_mode === "fixed" && (
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Fixed Delay (ms)</label>
              <input type="number" min={500} step={500} value={ai.ai_reply_delay_min_ms} onChange={(e) => setA("ai_reply_delay_min_ms", parseInt(e.target.value))}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          )}

          {ai.ai_reply_delay_mode === "random" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Min Delay (ms)</label>
                <input type="number" min={500} step={500} value={ai.ai_reply_delay_min_ms} onChange={(e) => setA("ai_reply_delay_min_ms", parseInt(e.target.value))}
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Max Delay (ms)</label>
                <input type="number" min={500} step={500} value={ai.ai_reply_delay_max_ms} onChange={(e) => setA("ai_reply_delay_max_ms", parseInt(e.target.value))}
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div className="col-span-2 flex gap-2">
                {[["Fast (1–5s)", 1000, 5000], ["Normal (3–12s)", 3000, 12000], ["Slow (10–30s)", 10000, 30000]].map(([label, min, max]) => (
                  <button key={label as string} onClick={() => { setA("ai_reply_delay_min_ms", min as number); setA("ai_reply_delay_max_ms", max as number); }}
                    className="rounded-md border border-[#1E1E1E] px-2.5 py-1 text-[10px] text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground transition-colors">
                    {label as string}
                  </button>
                ))}
              </div>
            </div>
          )}

          {ai.ai_reply_delay_mode === "human_typing" && (
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Typing Speed — {ai.ai_typing_speed_wpm} WPM</label>
              <input type="range" min={20} max={120} step={5} value={ai.ai_typing_speed_wpm} onChange={(e) => setA("ai_typing_speed_wpm", parseInt(e.target.value))} className="w-full accent-[#25D366]" />
              <div className="flex justify-between text-[10px] text-muted-foreground/50"><span>20 wpm (slow)</span><span>120 wpm (fast)</span></div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Read Receipt Delay — {ai.ai_read_delay_ms}ms</label>
            <input type="range" min={0} max={5000} step={500} value={ai.ai_read_delay_ms} onChange={(e) => setA("ai_read_delay_ms", parseInt(e.target.value))} className="w-full accent-[#25D366]" />
            <p className="text-[10px] text-muted-foreground/50">Delay before marking message as read</p>
          </div>
        </SectionCard>

        {/* ── Anti-Ban Protection ────────────────────────────── */}
        <SectionCard title="Anti-Ban Protection" icon="🛡️">
          <div className="space-y-3">
            <SettingRow label="Show typing indicator" hint="Send 'composing...' presence before reply">
              <Toggle value={ai.ai_send_typing_indicator} onChange={(v) => setA("ai_send_typing_indicator", v)} />
            </SettingRow>
            <SettingRow label="Mark as read before replying" hint="Simulates natural read → reply flow">
              <Toggle value={ai.ai_mark_read_before_reply} onChange={(v) => setA("ai_mark_read_before_reply", v)} />
            </SettingRow>
            <SettingRow label="Simulate online presence" hint="Set 'available' status while composing">
              <Toggle value={ai.ai_simulate_online} onChange={(v) => setA("ai_simulate_online", v)} />
            </SettingRow>
            <SettingRow label="Split long messages" hint="Break replies >200 chars into multiple messages">
              <Toggle value={ai.ai_split_long_messages} onChange={(v) => setA("ai_split_long_messages", v)} />
            </SettingRow>
            <SettingRow label="Natural filler phrases" hint="Occasionally prepend 'Sure!', 'Got it!' etc.">
              <Toggle value={ai.ai_add_filler_phrases} onChange={(v) => setA("ai_add_filler_phrases", v)} />
            </SettingRow>
            <SettingRow label="Avoid duplicate replies" hint="Never send exact same message twice in a row">
              <Toggle value={ai.ai_avoid_duplicate_replies} onChange={(v) => setA("ai_avoid_duplicate_replies", v)} />
            </SettingRow>
            <SettingRow label="Ignore broadcast messages" hint="Never reply to broadcast/list messages">
              <Toggle value={ai.ai_ignore_broadcast} onChange={(v) => setA("ai_ignore_broadcast", v)} />
            </SettingRow>
            <SettingRow label="Ignore forwarded messages" hint="Skip messages that were forwarded">
              <Toggle value={ai.ai_ignore_forwarded} onChange={(v) => setA("ai_ignore_forwarded", v)} />
            </SettingRow>
            <SettingRow label="Reply to group chats" hint="Allow AI to reply in group conversations">
              <Toggle value={ai.ai_reply_to_groups} onChange={(v) => setA("ai_reply_to_groups", v)} />
            </SettingRow>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Max Replies / Hour</label>
              <input type="number" min={0} value={ai.ai_max_replies_per_hour} onChange={(e) => setA("ai_max_replies_per_hour", parseInt(e.target.value))}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
              <p className="mt-0.5 text-[10px] text-muted-foreground/50">0 = unlimited</p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Max Replies / Day</label>
              <input type="number" min={0} value={ai.ai_max_replies_per_day} onChange={(e) => setA("ai_max_replies_per_day", parseInt(e.target.value))}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
              <p className="mt-0.5 text-[10px] text-muted-foreground/50">0 = unlimited</p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Reply Cooldown (same contact, ms)</label>
              <input type="number" min={0} step={1000} value={ai.ai_cooldown_same_contact_ms} onChange={(e) => setA("ai_cooldown_same_contact_ms", parseInt(e.target.value))}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            {ai.ai_split_long_messages && (
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Split Message Delay (ms)</label>
                <input type="number" min={500} step={500} value={ai.ai_split_delay_ms} onChange={(e) => setA("ai_split_delay_ms", parseInt(e.target.value))}
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Working Hours ───────────────────────────────────── */}
        <SectionCard title="Working Hours" icon="🕐">
          <SettingRow label="Restrict to working hours" hint="AI only replies within the configured time window">
            <Toggle value={ai.ai_working_hours_enabled} onChange={(v) => setA("ai_working_hours_enabled", v)} />
          </SettingRow>

          {ai.ai_working_hours_enabled && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Start Time</label>
                  <input type="time" value={ai.ai_working_hours_start} onChange={(e) => setA("ai_working_hours_start", e.target.value)}
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">End Time</label>
                  <input type="time" value={ai.ai_working_hours_end} onChange={(e) => setA("ai_working_hours_end", e.target.value)}
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Timezone</label>
                <select value={ai.ai_working_hours_timezone} onChange={(e) => setA("ai_working_hours_timezone", e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active Days</label>
                <div className="flex gap-1.5">
                  {DAYS.map(({ v, l }) => (
                    <button key={v} onClick={() => toggleDay(v)}
                      className={cn("flex-1 rounded-lg border py-1.5 text-[11px] font-semibold transition-colors",
                        activeDays.has(v) ? "border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]" : "border-[#1E1E1E] text-muted-foreground hover:text-foreground")}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Contact Filter ──────────────────────────────────── */}
        <SectionCard title="Contact Filtering" icon="👥">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Filter Mode</label>
            <div className="flex gap-2">
              {(["all", "whitelist", "blacklist"] as const).map((mode) => (
                <button key={mode} onClick={() => setA("ai_contact_filter_mode", mode)}
                  className={cn("flex-1 rounded-lg border py-2 text-xs font-semibold capitalize transition-colors",
                    ai.ai_contact_filter_mode === mode ? "border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]" : "border-[#1E1E1E] text-muted-foreground hover:text-foreground")}>
                  {mode}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground/50">
              {ai.ai_contact_filter_mode === "all" ? "Reply to everyone" : ai.ai_contact_filter_mode === "whitelist" ? "Only reply to listed numbers" : "Never reply to listed numbers"}
            </p>
          </div>

          {ai.ai_contact_filter_mode !== "all" && (
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {ai.ai_contact_filter_mode === "whitelist" ? "Whitelist" : "Blacklist"} Numbers (one per line, include country code)
              </label>
              <textarea
                value={parseKeywords(ai.ai_contact_filter_list).join("\n")}
                onChange={(e) => setA("ai_contact_filter_list", serializeKeywords(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)))}
                placeholder={"60123456789\n60198765432"}
                rows={3}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-xs outline-none focus:border-primary resize-none"
              />
            </div>
          )}
        </SectionCard>

        {/* ── Triggers & Handoff ──────────────────────────────── */}
        <SectionCard title="Triggers & Human Handoff" icon="🔀">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Trigger Keywords (one per line)</label>
            <textarea
              value={parseKeywords(ai.ai_trigger_keywords).join("\n")}
              onChange={(e) => setA("ai_trigger_keywords", serializeKeywords(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)))}
              placeholder={"hello\nhi\nhelp"}
              rows={2}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-xs outline-none focus:border-primary resize-none"
            />
            <p className="mt-0.5 text-[10px] text-muted-foreground/50">AI only fires if message contains one of these (leave blank for always)</p>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Stop Keywords — Handoff Triggers (one per line)</label>
            <textarea
              value={parseKeywords(ai.ai_stop_keywords).join("\n")}
              onChange={(e) => setA("ai_stop_keywords", serializeKeywords(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)))}
              placeholder={"human\nagent\nspeak to someone"}
              rows={2}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-xs outline-none focus:border-primary resize-none"
            />
            <p className="mt-0.5 text-[10px] text-muted-foreground/50">AI pauses and notifies you when these are detected</p>
          </div>

          <SettingRow label="Human Handoff Notification" hint="POST to webhook URL when a stop keyword is detected">
            <Toggle value={ai.ai_handoff_enabled} onChange={(v) => setA("ai_handoff_enabled", v)} />
          </SettingRow>

          {ai.ai_handoff_enabled && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Webhook URL</label>
                <input type="url" value={ai.ai_handoff_webhook} onChange={(e) => setA("ai_handoff_webhook", e.target.value)} placeholder="https://hooks.slack.com/..."
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-xs outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Trigger After</label>
                <input type="number" min={1} value={ai.ai_handoff_trigger_count} onChange={(e) => setA("ai_handoff_trigger_count", parseInt(e.target.value))}
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
                <p className="mt-0.5 text-[10px] text-muted-foreground/50">unanswered msgs</p>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Save AI Settings */}
        {sessionId && (
          <button onClick={saveAi} disabled={aiSaving}
            className={cn("w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50",
              aiSaved ? "bg-[#25D366] text-white" : "bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 border border-[#25D366]/20")}>
            {aiSaving ? "Saving…" : aiSaved ? "✓ AI Settings Saved" : "Save AI Settings"}
          </button>
        )}

        {/* ── Backend & Auth ──────────────────────────────────── */}
        <SectionCard title="Backend & Authentication" icon="🔗">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">API Base URL</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.up.railway.app"
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-primary" />
            <button onClick={handleSaveUrl}
              className={cn("mt-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors", urlSaved ? "bg-[#25D366] text-white" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
              {urlSaved ? "✓ Saved" : "Save URL"}
            </button>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Dashboard PIN</label>
            <div className="flex gap-2">
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAuth()} placeholder="Enter PIN…" maxLength={8}
                className="w-32 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-primary tracking-widest" />
              <button onClick={handleAuth} disabled={authStatus === "loading" || !pin || !url}
                className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                  authStatus === "ok" ? "bg-[#25D366] text-white" : authStatus === "error" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
                {authStatus === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {authStatus === "ok" ? "✓ Authenticated" : authStatus === "error" ? "Wrong PIN" : authStatus === "loading" ? "Verifying…" : "Authenticate"}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground/50">Default PIN is 1234 unless you changed DASHBOARD_PIN on Railway</p>
          </div>
        </SectionCard>

        {/* ── Proxy ───────────────────────────────────────────── */}
        <div className={cn("rounded-xl border p-5 transition-colors", proxy.enabled ? "border-[#25D366]/20 bg-[#25D366]/5" : "border-amber-500/20 bg-amber-500/5")}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {proxy.enabled ? <ShieldCheck className="h-5 w-5 text-[#25D366]" /> : <ShieldAlert className="h-5 w-5 text-amber-400" />}
              <div>
                <h3 className={cn("text-sm font-semibold", proxy.enabled ? "text-[#25D366]" : "text-amber-400")}>
                  Residential Proxy {proxy.enabled ? "— Enabled" : "— Disabled"}
                </h3>
                <p className="text-xs text-muted-foreground">{proxy.enabled ? "Routes through residential IP — lower ban risk" : "No proxy — server IP exposed — higher ban risk"}</p>
              </div>
            </div>
            <button onClick={() => handleProxyToggle(!proxy.enabled)}
              className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", proxy.enabled ? "bg-[#25D366]" : "bg-[#1E1E1E]")}>
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", proxy.enabled ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </div>

          {proxy.enabled && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["socks5", "http"] as const).map((t) => (
                  <button key={t} onClick={() => setProxy((p) => ({ ...p, type: t }))}
                    className={cn("rounded-lg border px-4 py-2 text-xs font-semibold transition-colors",
                      proxy.type === t ? "border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]" : "border-[#1E1E1E] bg-[#0A0A0A] text-muted-foreground")}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Host</label>
                  <input type="text" value={proxy.host} onChange={(e) => setProxy((p) => ({ ...p, host: e.target.value }))} placeholder="proxy.provider.com"
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-xs outline-none focus:border-[#25D366]" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Port</label>
                  <input type="text" value={proxy.port} onChange={(e) => setProxy((p) => ({ ...p, port: e.target.value }))} placeholder="1080"
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-xs outline-none focus:border-[#25D366]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Username</label>
                  <input type="text" value={proxy.username} onChange={(e) => setProxy((p) => ({ ...p, username: e.target.value }))} placeholder="optional"
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-xs outline-none focus:border-[#25D366]" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={proxy.password} onChange={(e) => setProxy((p) => ({ ...p, password: e.target.value }))} placeholder="optional"
                      className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 pr-8 font-mono text-xs outline-none focus:border-[#25D366]" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground">
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>
              {proxy.host && proxy.port && (
                <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2">
                  <p className="text-[10px] text-muted-foreground/60 mb-0.5">Preview</p>
                  <p className="font-mono text-xs text-muted-foreground break-all">{proxy.type}://{proxy.username ? `${proxy.username}:***@` : ""}{proxy.host}:{proxy.port}</p>
                </div>
              )}
            </div>
          )}

          <button onClick={handleSaveProxy} disabled={proxySaving}
            className={cn("mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
              proxySaved ? "bg-[#25D366] text-white" : proxy.enabled ? "bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 border border-[#25D366]/20" : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20")}>
            {proxySaving ? "Saving…" : proxySaved ? "✓ Proxy Saved" : proxy.enabled ? "Save Proxy Settings" : "Save (No Proxy)"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Contacts Panel ───────────────────────────────────────────────────────────

function ContactsPanel({ contacts }: { contacts: WaChat[] }) {
  const [search, setSearch] = useState("");
  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search */}
      <div className="border-b border-[#1E1E1E] p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs">No contacts found</p>
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.jid}
              className="flex items-center gap-3 border-b border-[#1E1E1E] px-4 py-3 hover:bg-[#1E1E1E]/40 transition-colors"
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                  avatarColor(c.name)
                )}
              >
                {c.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {c.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.jid.split("@")[0]}
                </p>
              </div>
              {c.isGroup && (
                <span className="rounded-md border border-[#1E1E1E] px-2 py-0.5 text-[10px] text-muted-foreground">
                  Group
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WhatsAppCrmPage() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [backendUrl, setBackendUrl] = useState<string>("");
  const [jwtToken, setJwtToken] = useState<string>("");
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null); // null = checking
  const [session, setSession] = useState<WaSession | null>(null);
  const [chats, setChats] = useState<WaChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<WaChat | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qrPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedChatRef = useRef<WaChat | null>(null);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  // Load backend URL + JWT from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("wa_backend_url") || "";
    const token = localStorage.getItem("wa_jwt_token") || "";
    setBackendUrl(stored);
    setJwtToken(token);
  }, []);

  // Auth headers helper
  const authHeaders = useCallback((): HeadersInit => {
    return jwtToken ? { "Authorization": `Bearer ${jwtToken}` } : {};
  }, [jwtToken]);

  // Ping backend + fetch session list
  const checkBackend = useCallback(async (url: string, token?: string) => {
    if (!url) { setBackendOnline(false); return; }
    const tok = token ?? jwtToken;
    try {
      const res = await fetch(`${url}/api/sessions`, {
        signal: AbortSignal.timeout(4000),
        headers: tok ? { "Authorization": `Bearer ${tok}` } : {},
      });
      if (!res.ok) throw new Error("not ok");
      const data = await res.json();
      setBackendOnline(true);
      const rawList = Array.isArray(data) ? data : (data.sessions ?? []);
      const list: WaSession[] = rawList.map((s: WaSession & { phone_number?: string }) => ({
        ...s,
        phone: s.phone_number || s.phone || "",
        phone_number: s.phone_number || s.phone || "",
      }));
      if (list.length > 0) setSession((prev) => prev ? { ...prev, ...list[0] } : list[0]);
    } catch {
      setBackendOnline(false);
      setSession(null);
    }
  }, [jwtToken]);

  // Fetch detailed session status (including QR data URL)
  const fetchSessionStatus = useCallback(async (sessionId: string) => {
    if (!backendUrl || !sessionId) return;
    try {
      const res = await fetch(`${backendUrl}/api/sessions/${sessionId}/status`, {
        signal: AbortSignal.timeout(6000),
        headers: jwtToken ? { "Authorization": `Bearer ${jwtToken}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      // data = { session, qrDataUrl, qr, warmupSecondsRemaining }
      const s = data.session ?? data;
      setSession((prev) => prev ? {
        ...prev,
        status: s.status ?? prev.status,
        qrCode: data.qrDataUrl || data.qr || prev.qrCode,
      } : prev);
    } catch { /* silent */ }
  }, [backendUrl, jwtToken]);

  useEffect(() => {
    checkBackend(backendUrl);
  }, [backendUrl, checkBackend]);

  // ── Socket.io real-time connection ────────────────────────────────────────
  useEffect(() => {
    if (!backendUrl) return;

    // Disconnect previous socket if URL changed
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = ioConnect(backendUrl, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    // New message arrived
    socket.on("message:new", (payload: {
      sessionId: string;
      message: {
        id?: string;
        remoteJid?: string;
        fromMe?: boolean;
        content?: string;
        messageType?: string;
        timestamp?: number;
        pushName?: string;
        mediaUrl?: string;
        mediaMimetype?: string;
        caption?: string;
      };
    }) => {
      const msg = payload.message;
      const jid = msg.remoteJid || "";

      // Update the messages panel if this chat is open
      setMessages((prev) => {
        // Dedup by ID
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        // Secondary dedup: if it's our own message sent <3s ago with same text, skip (optimistic already shown)
        if (msg.fromMe && msg.content) {
          const cutoff = (msg.timestamp || 0) - 3;
          const duplicate = prev.some(
            (m) => m.fromMe && m.body === msg.content && m.timestamp >= cutoff
          );
          if (duplicate) return prev;
        }
        const newMsg: WaMessage = {
          id: msg.id || String(Date.now()),
          fromMe: !!msg.fromMe,
          body: msg.content || msg.caption || "",
          timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
          status: msg.fromMe ? "sent" : "delivered",
          type: (msg.messageType || "text") as WaMessage["type"],
          mediaUrl: msg.mediaUrl || undefined,
          mediaMimetype: msg.mediaMimetype || undefined,
          caption: msg.caption || undefined,
        };
        // Only append if this chat is currently open
        if (selectedChatRef.current?.jid === jid) {
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          return [...prev, newMsg];
        }
        return prev;
      });

      // Update chat list preview + bump to top
      setChats((prev) => {
        const existing = prev.find((c) => c.jid === jid);
        const name = existing?.name || msg.pushName || jid.split("@")[0];
        const updated: WaChat = {
          id: jid,
          jid,
          name,
          lastMessage: msg.content || `[${msg.messageType || "media"}]`,
          lastMessageTime: String(msg.timestamp || Math.floor(Date.now() / 1000)),
          unreadCount: (existing?.unreadCount ?? 0) + (msg.fromMe ? 0 : 1),
          isGroup: jid.endsWith("@g.us"),
          avatarInitials: getInitials(name),
        };
        const filtered = prev.filter((c) => c.jid !== jid);
        return [updated, ...filtered];
      });
    });

    // Message status update (sent → delivered → read ticks)
    socket.on("message:update", (payload: { sessionId: string; updates: Array<{ key: { id?: string }; update: { status?: number } }> }) => {
      const STATUS_MAP: Record<number, WaMessage["status"]> = { 1: "sent", 2: "delivered", 3: "delivered", 4: "read" };
      setMessages((prev) =>
        prev.map((m) => {
          const hit = payload.updates?.find((u) => u.key?.id === m.id);
          if (!hit?.update?.status) return m;
          return { ...m, status: STATUS_MAP[hit.update.status] ?? m.status };
        })
      );
    });

    // Session status changed (connected / disconnected / qr_ready)
    socket.on("session:status", (payload: { sessionId: string; status: WaSession["status"]; user?: { id?: string; name?: string } }) => {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: payload.status,
          phone: payload.user?.id?.split(":")[0] || prev.phone,
          name: payload.user?.name || prev.name,
        };
      });
      if (payload.status === "connected") {
        setBackendOnline(true);
      }
    });

    // QR code updated
    socket.on("session:qr", (payload: { sessionId: string; qrDataUrl?: string; qr?: string }) => {
      setSession((prev) => prev ? { ...prev, status: "qr_ready", qrCode: payload.qrDataUrl || payload.qr } : prev);
    });

    // Backend says chats changed — re-fetch
    socket.on("chats:refresh", () => {
      // trigger fetchChats by resetting session status momentarily isn't great
      // Instead just set a flag — fetchChats will be called by useEffect
      setChats([]); // clears so useEffect sees change and re-fetches
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [backendUrl]);

  // Fetch chat list when connected
  const fetchChats = useCallback(async () => {
    if (!backendUrl || !session || session.status !== "connected") return;
    setLoadingChats(true);
    try {
      // Backend mounts messages router at /api/sessions/:id/messages, so chats is /messages/chats
      const res = await fetch(
        `${backendUrl}/api/sessions/${session.id}/messages/chats`,
        { signal: AbortSignal.timeout(8000), headers: authHeaders() }
      );
      if (!res.ok) return;
      const data = await res.json();
      // Backend returns { chats: [...] } with snake_case fields
      const chatList: Array<{
        jid?: string;
        name?: string;
        last_message?: string;
        last_message_time?: number | string;
        message_type?: string;
        is_group?: number | boolean;
      }> = data.chats || data || [];
      const mapped: WaChat[] = chatList.map((c) => {
        const rawName = c.name || (c.jid ?? "").split("@")[0] || "Unknown";
        const lastMsg = c.last_message || (c.message_type && c.message_type !== "text" ? `[${c.message_type}]` : "");
        return {
          id: c.jid || "",
          jid: c.jid || "",
          name: rawName,
          lastMessage: lastMsg,
          lastMessageTime: c.last_message_time ? String(c.last_message_time) : "",
          unreadCount: 0,
          isGroup: !!(c.is_group),
          avatarInitials: getInitials(rawName),
        };
      });
      setChats(mapped);
    } catch {
      /* silent */
    } finally {
      setLoadingChats(false);
    }
  }, [backendUrl, session]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Fetch messages when chat selected
  const fetchMessages = useCallback(async () => {
    if (!backendUrl || !session || !selectedChat) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `${backendUrl}/api/sessions/${session.id}/messages/${encodeURIComponent(selectedChat.jid)}`,
        { signal: AbortSignal.timeout(8000), headers: authHeaders() }
      );
      if (!res.ok) return;
      const data = await res.json();
      // Backend returns { messages: [...] } with snake_case fields (from_me, content, message_type)
      const msgList: Array<{
        id?: string; message_id?: string;
        from_me?: number | boolean; fromMe?: boolean;
        content?: string; body?: string; text?: string;
        timestamp?: number;
        message_type?: string; type?: string;
        status?: WaMessage["status"];
        media_url?: string; mediaUrl?: string;
        media_mimetype?: string; mediaMimetype?: string;
        caption?: string;
      }> = data.messages || data || [];
      const mapped: WaMessage[] = msgList.map((m) => {
        const msgType = (m.message_type || m.type || "text") as WaMessage["type"];
        const body = m.content || m.body || m.text || m.caption || "";
        return {
          id: m.id || m.message_id || String(Math.random()),
          fromMe: !!(m.from_me ?? m.fromMe),
          body,
          timestamp: m.timestamp || 0,
          status: m.status || (m.from_me ? "sent" : "delivered"),
          type: msgType,
          mediaUrl: m.media_url || m.mediaUrl || undefined,
          mediaMimetype: m.media_mimetype || m.mediaMimetype || undefined,
          caption: m.caption || undefined,
        };
      });
      setMessages(mapped);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      /* silent */
    } finally {
      setLoadingMessages(false);
    }
  }, [backendUrl, session, selectedChat]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Send message
  async function handleSend() {
    if (!messageText.trim() || !selectedChat || !session || sending) return;
    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    // Optimistic message
    const optimistic: WaMessage = {
      id: `opt_${Date.now()}`,
      fromMe: true,
      body: text,
      timestamp: Math.floor(Date.now() / 1000),
      status: "pending",
      type: "text",
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const res = await fetch(`${backendUrl}/api/sessions/${session.id}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ jid: selectedChat.jid, text }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json().catch(() => ({}));
      const realId: string | undefined = data.messageId;
      // Replace optimistic ID with real message ID so Socket.io dedup catches it
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id
            ? { ...m, id: realId || m.id, status: "sent" }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...m, status: "error" } : m))
      );
    } finally {
      setSending(false);
    }
  }

  function saveBackendUrl(url: string) {
    setBackendUrl(url);
    localStorage.setItem("wa_backend_url", url);
    setBackendOnline(null);
    checkBackend(url);
  }

  function saveJwtToken(token: string) {
    setJwtToken(token);
    localStorage.setItem("wa_jwt_token", token);
    // Re-check backend with new token
    checkBackend(backendUrl, token);
  }

  // Start polling /api/sessions/:id/status every 3 s until QR appears or session connects
  function startQrPolling(sessionId: string) {
    if (qrPollingRef.current) clearInterval(qrPollingRef.current);
    qrPollingRef.current = setInterval(() => {
      fetchSessionStatus(sessionId);
    }, 3000);
    // Hard stop after 90 s
    setTimeout(() => {
      if (qrPollingRef.current) {
        clearInterval(qrPollingRef.current);
        qrPollingRef.current = null;
      }
    }, 90000);
  }

  // Stop polling once connected
  useEffect(() => {
    if (session?.status === "connected" && qrPollingRef.current) {
      clearInterval(qrPollingRef.current);
      qrPollingRef.current = null;
    }
  }, [session?.status]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (qrPollingRef.current) clearInterval(qrPollingRef.current);
  }, []);

  async function handleConnect() {
    if (!backendUrl) return;

    let sid = session?.id;

    // If no session exists yet, create one first
    if (!sid) {
      try {
        const res = await fetch(`${backendUrl}/api/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ name: "My WhatsApp" }),
        });
        if (res.ok) {
          const d = await res.json();
          const created: WaSession = d.session ?? d;
          setSession(created);
          sid = created.id;
        }
      } catch { return; }
    }

    if (!sid) return;

    try {
      const connectRes = await fetch(`${backendUrl}/api/sessions/${sid}/connect`, {
        method: "POST",
        headers: authHeaders(),
      });
      // Optimistically mark as connecting so UI shows spinner
      setSession((prev) => prev ? { ...prev, status: "connecting" } : prev);

      // The connect response itself may include the QR immediately
      if (connectRes.ok) {
        const connectData = await connectRes.json().catch(() => ({}));
        if (connectData.qrDataUrl || connectData.qr) {
          setSession((prev) => prev ? {
            ...prev,
            status: "qr_ready",
            qrCode: connectData.qrDataUrl || connectData.qr,
          } : prev);
        }
      }

      // Kick off QR polling regardless (QR refreshes every ~20 s)
      startQrPolling(sid);
    } catch {
      /* silent */
    }
  }

  const isConnected = session?.status === "connected";
  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Header extra: status + refresh ─────────────────────────────────────────
  const headerExtra = (
    <div className="flex items-center gap-3">
      {backendOnline === null && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking…
        </span>
      )}
      {backendOnline === true && session && (
        <div className="flex items-center gap-2">
          <StatusPill status={session.status} />
          {(session.phone_number || session.phone) && (
            <span className="rounded-md border border-[#1E1E1E] bg-[#111111] px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              +{(session.phone_number || session.phone || "").replace(/\D/g, "")}
            </span>
          )}
        </div>
      )}
      {backendOnline === false && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          Offline
        </span>
      )}
      <button
        onClick={() => checkBackend(backendUrl)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
        title="Refresh connection"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <PageWrapper title="WhatsApp CRM" headerExtra={headerExtra}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[#1E1E1E] px-6 pt-0 pb-0 -mt-2">
        {(
          [
            { key: "inbox", label: "Inbox", icon: MessageCircle },
            { key: "contacts", label: "Contacts", icon: Users },
            { key: "settings", label: "Settings", icon: Settings },
          ] as { key: Tab; label: string; icon: React.ElementType }[]
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Settings tab ─────────────────────────────────── */}
        {tab === "settings" && (
          <SettingsPanel
            backendUrl={backendUrl}
            sessionId={session?.id}
            jwtToken={jwtToken}
            onSave={saveBackendUrl}
            onAuth={saveJwtToken}
          />
        )}

        {/* ── Contacts tab ────────────────────────────────── */}
        {tab === "contacts" && (
          <div className="flex flex-1 overflow-hidden">
            {backendOnline === false ? (
              <BackendOffline url={backendUrl} onSettings={() => setTab("settings")} />
            ) : !isConnected ? (
              <ConnectPanel
                session={session}
                onConnect={handleConnect}
                onRefresh={() => { if (session?.id) fetchSessionStatus(session.id); }}
              />
            ) : (
              <ContactsPanel contacts={chats} />
            )}
          </div>
        )}

        {/* ── Inbox tab ───────────────────────────────────── */}
        {tab === "inbox" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Backend offline */}
            {backendOnline === false && (
              <BackendOffline url={backendUrl} onSettings={() => setTab("settings")} />
            )}

            {/* Checking / no url */}
            {backendOnline === null && (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
              </div>
            )}

            {/* Backend online */}
            {backendOnline === true && (
              <>
                {/* ── Left: Chat list ─────────────────────── */}
                <aside className="flex w-72 shrink-0 flex-col border-r border-[#1E1E1E] bg-[#0A0A0A]">
                  {/* Session / status header */}
                  <div className="flex items-center justify-between border-b border-[#1E1E1E] px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/10">
                        <Phone className="h-3.5 w-3.5 text-[#25D366]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {session?.phone_number || session?.phone
                            ? `+${(session.phone_number || session.phone || "").replace(/\D/g, "")}`
                            : session?.name || session?.id || "Session"}
                        </p>
                        {session && <StatusPill status={session.status} />}
                      </div>
                    </div>
                    {!isConnected && session && (
                      <button
                        onClick={handleConnect}
                        className="shrink-0 rounded-md bg-[#25D366]/10 px-2 py-1 text-[10px] font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/20"
                      >
                        Connect
                      </button>
                    )}
                  </div>

                  {/* Search */}
                  <div className="border-b border-[#1E1E1E] p-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search chats…"
                        className="w-full rounded-lg border border-[#1E1E1E] bg-[#111111] py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Chat list */}
                  <div className="flex-1 overflow-auto">
                    {!isConnected ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        {session?.status === "qr_ready" ? (
                          <>
                            <QrCode className="mb-3 h-8 w-8 text-primary/40" />
                            <p className="text-xs font-medium text-foreground">
                              Scan QR to connect
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Open the chat area to view the QR code
                            </p>
                          </>
                        ) : (
                          <>
                            <WifiOff className="mb-3 h-8 w-8 text-muted-foreground/30" />
                            <p className="text-xs font-medium text-foreground">
                              Not connected
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Click Connect to start
                            </p>
                          </>
                        )}
                      </div>
                    ) : loadingChats ? (
                      <div className="space-y-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="flex items-center gap-3 border-b border-[#1E1E1E] px-4 py-3">
                            <div className="h-10 w-10 animate-pulse rounded-full bg-[#1E1E1E]" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 w-24 animate-pulse rounded bg-[#1E1E1E]" />
                              <div className="h-2.5 w-36 animate-pulse rounded bg-[#1E1E1E]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredChats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MessageCircle className="mb-3 h-8 w-8 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">No chats yet</p>
                      </div>
                    ) : (
                      filteredChats.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => {
                            setSelectedChat(chat);
                            setMessages([]);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 border-b border-[#1E1E1E] px-4 py-3 text-left transition-colors",
                            selectedChat?.id === chat.id
                              ? "bg-primary/5"
                              : "hover:bg-[#1E1E1E]/40"
                          )}
                        >
                          <div
                            className={cn(
                              "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                              avatarColor(chat.name)
                            )}
                          >
                            {chat.avatarInitials}
                            {chat.isGroup && (
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0A0A0A] text-[#6B7280]">
                                <Users className="h-2 w-2" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-1">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {chat.name}
                              </p>
                              {chat.lastMessageTime && (
                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                  {formatTime(chat.lastMessageTime)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <p className="truncate text-[11px] text-muted-foreground">
                                {chat.lastMessage || "No messages"}
                              </p>
                              {chat.unreadCount > 0 && (
                                <span className="flex h-4 min-w-[1rem] shrink-0 items-center justify-center rounded-full bg-[#25D366] px-1 text-[10px] font-bold text-white">
                                  {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Footer: refresh + count */}
                  {isConnected && (
                    <div className="flex items-center justify-between border-t border-[#1E1E1E] px-4 py-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {chats.length} chats
                      </span>
                      <button
                        onClick={fetchChats}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
                      >
                        <RefreshCw className={cn("h-3 w-3", loadingChats && "animate-spin")} />
                      </button>
                    </div>
                  )}
                </aside>

                {/* ── Right: Chat window ──────────────────────── */}
                <div className="flex min-w-0 flex-1 flex-col bg-[#0A0A0A]">
                  {!isConnected ? (
                    <ConnectPanel
                      session={session}
                      onConnect={handleConnect}
                      onRefresh={() => { if (session?.id) fetchSessionStatus(session.id); }}
                    />
                  ) : !selectedChat ? (
                    <EmptyChat />
                  ) : (
                    <>
                      {/* Chat header */}
                      <div className="flex items-center justify-between border-b border-[#1E1E1E] bg-[#111111] px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                              avatarColor(selectedChat.name)
                            )}
                          >
                            {selectedChat.avatarInitials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {selectedChat.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {selectedChat.jid.split("@")[0]}
                              {selectedChat.isGroup && " · Group"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={fetchMessages}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground"
                          >
                            <RefreshCw
                              className={cn(
                                "h-3.5 w-3.5",
                                loadingMessages && "animate-spin"
                              )}
                            />
                          </button>
                          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-auto px-5 py-4">
                        {loadingMessages ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <MessageCircle className="mb-2 h-8 w-8 text-muted-foreground/20" />
                            <p className="text-xs">No messages yet</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={cn(
                                  "flex",
                                  msg.fromMe ? "justify-end" : "justify-start"
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-[72%] rounded-2xl text-sm overflow-hidden",
                                    msg.fromMe
                                      ? "rounded-br-sm bg-primary/20 text-foreground"
                                      : "rounded-bl-sm bg-[#1E1E1E] text-foreground",
                                    // No padding for pure image/sticker bubbles
                                    (msg.type === "image" || msg.type === "video" || msg.type === "sticker") && msg.mediaUrl
                                      ? "p-0"
                                      : "px-3.5 py-2"
                                  )}
                                >
                                  {/* ── Image / Video ── */}
                                  {(msg.type === "image" || msg.type === "video") && msg.mediaUrl ? (
                                    <div>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={`${backendUrl}${msg.mediaUrl}`}
                                        alt={msg.caption || "Image"}
                                        className="max-w-[280px] max-h-[300px] w-full object-cover rounded-2xl"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                      />
                                      {msg.caption && (
                                        <p className="px-3 pt-1.5 pb-0.5 text-xs text-foreground/80">{msg.caption}</p>
                                      )}
                                      <div className={cn("px-3 pb-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/60", msg.fromMe ? "justify-end" : "justify-start")}>
                                        <span>{formatTime(msg.timestamp)}</span>
                                        {msg.fromMe && <MsgStatus status={msg.status} />}
                                      </div>
                                    </div>
                                  ) : /* ── Sticker ── */
                                  msg.type === "sticker" && msg.mediaUrl ? (
                                    <div className="p-1">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={`${backendUrl}${msg.mediaUrl}`}
                                        alt="Sticker"
                                        className="h-24 w-24 object-contain"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                      />
                                    </div>
                                  ) : /* ── Audio / Voice ── */
                                  (msg.type === "audio" || msg.type === "ptt") ? (
                                    <div className="flex items-center gap-2.5 min-w-[160px]">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/20">
                                        <Mic className="h-4 w-4 text-[#25D366]" />
                                      </div>
                                      {msg.mediaUrl ? (
                                        <audio
                                          controls
                                          src={`${backendUrl}${msg.mediaUrl}`}
                                          className="h-8 max-w-[200px]"
                                        />
                                      ) : (
                                        <div className="flex-1">
                                          <div className="flex gap-0.5">
                                            {Array.from({ length: 20 }).map((_, i) => (
                                              <div key={i} className="w-0.5 rounded-full bg-muted-foreground/40" style={{ height: `${4 + Math.random() * 12}px` }} />
                                            ))}
                                          </div>
                                          <p className="mt-0.5 text-[10px] text-muted-foreground/60">Voice message</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : /* ── Document / PDF ── */
                                  msg.type === "document" ? (
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
                                        <FileText className="h-5 w-5 text-blue-400" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-foreground">
                                          {msg.body || msg.caption || "Document"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60">
                                          {msg.mediaMimetype?.split("/")[1]?.toUpperCase() || "FILE"}
                                        </p>
                                      </div>
                                      {msg.mediaUrl && (
                                        <a
                                          href={`${backendUrl}${msg.mediaUrl}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="shrink-0 rounded-lg border border-[#2A2A2A] p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                          </svg>
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    /* ── Text / Emoji (default) ── */
                                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                                      {msg.body || <span className="text-muted-foreground/40 italic text-xs">Media message</span>}
                                    </p>
                                  )}

                                  {/* Timestamp + tick for non-media or text-only */}
                                  {msg.type === "text" && (
                                    <div className={cn("mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/60", msg.fromMe ? "justify-end" : "justify-start")}>
                                      <span>{formatTime(msg.timestamp)}</span>
                                      {msg.fromMe && <MsgStatus status={msg.status} />}
                                    </div>
                                  )}
                                  {/* Timestamp for doc/audio */}
                                  {(msg.type === "document" || msg.type === "audio" || msg.type === "ptt") && (
                                    <div className={cn("mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60", msg.fromMe ? "justify-end" : "justify-start")}>
                                      <span>{formatTime(msg.timestamp)}</span>
                                      {msg.fromMe && <MsgStatus status={msg.status} />}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            <div ref={messagesEndRef} />
                          </div>
                        )}
                      </div>

                      {/* Message input */}
                      <div className="border-t border-[#1E1E1E] bg-[#111111] p-3">
                        <div className="flex items-center gap-2">
                          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground">
                            <Paperclip className="h-4 w-4" />
                          </button>
                          <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                              }
                            }}
                            placeholder={`Message ${selectedChat.name}…`}
                            className="flex-1 rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2 text-sm outline-none transition-colors focus:border-primary"
                          />
                          <button
                            onClick={handleSend}
                            disabled={!messageText.trim() || sending}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                          >
                            {sending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {/* AI mode indicator */}
                        <div className="mt-2 flex items-center gap-1.5 px-1">
                          <Circle className="h-2 w-2 fill-[#25D366] text-[#25D366]" />
                          <span className="text-[10px] text-muted-foreground/60">
                            AI auto-reply is active for this session
                          </span>
                          <Bot className="h-3 w-3 text-muted-foreground/40" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
