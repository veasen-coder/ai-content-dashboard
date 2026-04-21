"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Pin,
  PinOff,
  Tag,
  BotOff,
  SendHorizonal,
  XCircle,
  UserCheck,
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
  phoneNumber?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isGroup: boolean;
  avatarInitials: string;
  chatStatus?: string;
  tags?: string[];
  aiDisabled?: boolean;
  lastFromMe?: boolean;
  isPinned?: boolean;
}

interface PendingAiReply {
  pendingId: string;
  sessionId: string;
  remoteJid: string;
  reply: string;
  sendAt: number;
  sendInMs: number;
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

interface ChatTemplate { id: string; name: string; text: string; }
interface DocTemplate { id: string; name: string; filename: string; mimetype: string; data: string; }
interface KnowledgeEntry { id: string; title: string; content: string; source: string; created_at: string; has_embedding: number; }
interface BotConfig { persona: string; business_name: string; language: string; tone: string; instructions: string; emoji_mode: string; }
interface ContactInfo {
  jid: string;
  name: string | null;
  phone: string;
  profilePicUrl: string | null;
  status: string | null;
  tags: string[];
  notes: string | null;
  isGroup: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Baileys stores raw content types — map to our simplified type
function normalizeType(raw: string | undefined): WaMessage["type"] {
  switch (raw) {
    case "conversation":
    case "extendedTextMessage":
    case "text": return "text";
    case "imageMessage":
    case "image": return "image";
    case "videoMessage":
    case "video": return "video";
    case "audioMessage":
    case "audio": return "audio";
    case "pttMessage":
    case "ptt": return "ptt";
    case "documentMessage":
    case "document": return "document";
    case "stickerMessage":
    case "sticker": return "sticker";
    default: return raw?.includes("image") ? "image" : raw?.includes("audio") ? "audio" : raw?.includes("video") ? "video" : raw?.includes("document") ? "document" : "text";
  }
}

// Human-readable preview for media types in chat list
function mediaPreview(type: string): string {
  const t = normalizeType(type);
  switch (t) {
    case "image": return "📷 Photo";
    case "video": return "🎥 Video";
    case "audio": return "🎙️ Voice message";
    case "ptt": return "🎙️ Voice message";
    case "document": return "📄 Document";
    case "sticker": return "🎭 Sticker";
    default: return "";
  }
}

// Force-download a cross-origin file with the original filename
// Map full MIME type to short file label
function mimeLabel(mime: string | undefined): string {
  if (!mime) return "FILE";
  const m = mime.toLowerCase();
  if (m.includes("pdf")) return "PDF";
  if (m.includes("presentationml") || m.includes("pptx") || m.includes("powerpoint")) return "PPTX";
  if (m.includes("wordprocessingml") || m.includes("docx") || m.includes("msword")) return "DOCX";
  if (m.includes("spreadsheetml") || m.includes("xlsx") || m.includes("excel")) return "XLSX";
  if (m.includes("zip") || m.includes("x-zip")) return "ZIP";
  if (m.includes("rar")) return "RAR";
  if (m.includes("csv")) return "CSV";
  if (m.includes("plain") || m.includes("text/")) return "TXT";
  if (m.includes("image/")) return "IMG";
  if (m.includes("video/")) return "VID";
  if (m.includes("audio/")) return "AUD";
  // fallback: grab the subtype after "/"
  const sub = mime.split("/")[1]?.split(";")[0]?.toUpperCase();
  return sub?.slice(0, 6) || "FILE";
}

// Extract filename from URL — returns empty string if it looks like a UUID hash
function filenameFromUrl(url: string | undefined): string {
  if (!url) return "";
  const name = decodeURIComponent(url.split("/").pop() || "");
  // Skip UUID-style hashes like "027da65b-2b5b-4b26-8ed4-519016b5a71e.pdf"
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(name)) return "";
  return name;
}

async function downloadFile(url: string, filename: string, token?: string) {
  try {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

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

// ─── Avatar (profile pic or coloured initials) ───────────────────────────────

function Avatar({ name, picUrl, size = 9 }: { name: string; picUrl?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const cls = `h-${size} w-${size}`;
  if (picUrl && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={picUrl} alt={name} onError={() => setErr(true)}
        className={`${cls} shrink-0 rounded-full object-cover`} />
    );
  }
  return (
    <div className={`${cls} shrink-0 flex items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(name)}`}>
      {getInitials(name)}
    </div>
  );
}

function DetailRow({ icon, label, value, mono }: { icon: string; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-base shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground/60 mb-0.5">{label}</p>
        <p className={cn("text-xs text-foreground break-all", mono && "font-mono")}>{value}</p>
      </div>
    </div>
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
  // Voice
  ai_voice_reply_mode: "text" | "match_input" | "always";
  ai_voice_name: string;
  ai_voice_speed: number;
  ai_voice_model: string;
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
  ai_voice_reply_mode: "text", ai_voice_name: "nova", ai_voice_speed: 1.0, ai_voice_model: "tts-1",
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
  onSave,
}: {
  backendUrl: string;
  sessionId?: string;
  onSave: (url: string) => void;
}) {
  const [url, setUrl] = useState(backendUrl);
  const [urlSaved, setUrlSaved] = useState(false);

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
  const [hasApiKey, setHasApiKey] = useState(false);
  const [changingApiKey, setChangingApiKey] = useState(false);

  // AI Chatbot Builder state
  const BOT_DEFAULTS: BotConfig = { persona: "", business_name: "", language: "same as user", tone: "professional", instructions: "", emoji_mode: "natural" };
  const [botConfig, setBotConfig] = useState<BotConfig>(BOT_DEFAULTS);
  const [botSaving, setBotSaving] = useState(false);
  const [botSaved, setBotSaved] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testMessages, setTestMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [testLoading, setTestLoading] = useState(false);

  // Knowledge Base state
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [addingEntry, setAddingEntry] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryContent, setNewEntryContent] = useState("");
  const [entryAdding, setEntryAdding] = useState(false);
  const kbFileRef = useRef<HTMLInputElement>(null);

  const authH = useCallback((): Record<string, string> => ({}), []);

  // Load proxy + AI settings + bot config + knowledge
  useEffect(() => {
    if (!backendUrl || !sessionId) return;
    fetch(`${backendUrl}/api/sessions/${sessionId}/proxy`)
      .then((r) => r.json())
      .then((d) => setProxy({ enabled: !!d.proxy_enabled, type: d.proxy_type ?? "socks5", host: d.proxy_host ?? "", port: d.proxy_port ?? "", username: d.proxy_username ?? "", password: "" }))
      .catch(() => {});
    fetch(`${backendUrl}/api/sessions/${sessionId}/ai`)
      .then((r) => r.json())
      .then((d) => { setAi((prev) => ({ ...prev, ...d, openai_api_key: "" })); setHasApiKey(!!d.has_openai_key); })
      .catch(() => {});
    fetch(`${backendUrl}/api/sessions/${sessionId}/ai/prompt`)
      .then((r) => r.json())
      .then((d) => setBotConfig({ persona: d.persona || "", business_name: d.business_name || "", language: d.language || "same as user", tone: d.tone || "professional", instructions: d.instructions || "", emoji_mode: d.emoji_mode || "natural" }))
      .catch(() => {});
    fetch(`${backendUrl}/api/sessions/${sessionId}/ai/knowledge`)
      .then((r) => r.json())
      .then((d) => setKnowledgeEntries(d.entries || []))
      .catch(() => {});
  }, [backendUrl, sessionId]);

  async function handleSaveUrl() {
    const cleaned = url.trim().replace(/\/$/, "");
    onSave(cleaned);
    setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 2000);
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
      if (ai.openai_api_key) { setHasApiKey(true); setChangingApiKey(false); setAi((p) => ({ ...p, openai_api_key: "" })); }
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 2500);
    } catch { /* silent */ } finally { setAiSaving(false); }
  }

  const setA = <K extends keyof AiConfig>(k: K, v: AiConfig[K]) => setAi((p) => ({ ...p, [k]: v }));
  const setB = <K extends keyof BotConfig>(k: K, v: BotConfig[K]) => setBotConfig((p) => ({ ...p, [k]: v }));

  async function saveBotConfig() {
    if (!backendUrl || !sessionId) return;
    setBotSaving(true);
    try {
      await fetch(`${backendUrl}/api/sessions/${sessionId}/ai/prompt`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authH() },
        body: JSON.stringify(botConfig),
      });
      setBotSaved(true);
      setTimeout(() => setBotSaved(false), 2500);
    } catch { /* silent */ } finally { setBotSaving(false); }
  }

  async function addKnowledgeEntry() {
    if (!backendUrl || !sessionId || !newEntryTitle.trim() || !newEntryContent.trim()) return;
    setEntryAdding(true);
    try {
      const res = await fetch(`${backendUrl}/api/sessions/${sessionId}/ai/knowledge`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authH() },
        body: JSON.stringify({ title: newEntryTitle.trim(), content: newEntryContent.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        setKnowledgeEntries((prev) => [{ id: d.id, title: newEntryTitle.trim(), content: newEntryContent.trim(), source: "manual", created_at: new Date().toISOString(), has_embedding: d.hasEmbedding ? 1 : 0 }, ...prev]);
        setNewEntryTitle(""); setNewEntryContent(""); setAddingEntry(false);
      }
    } catch { /* silent */ } finally { setEntryAdding(false); }
  }

  async function uploadKbFile(file: File) {
    if (!backendUrl || !sessionId) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name.replace(/\.[^.]+$/, ""));
    try {
      const res = await fetch(`${backendUrl}/api/sessions/${sessionId}/ai/knowledge/upload`, {
        method: "POST", headers: authH(), body: fd,
      });
      const d = await res.json();
      if (d.success) {
        setKnowledgeEntries((prev) => [{ id: d.id, title: file.name.replace(/\.[^.]+$/, ""), content: "", source: file.name, created_at: new Date().toISOString(), has_embedding: d.hasEmbedding ? 1 : 0 }, ...prev]);
      }
    } catch { /* silent */ }
  }

  async function deleteKbEntry(entryId: string) {
    if (!backendUrl || !sessionId) return;
    await fetch(`${backendUrl}/api/sessions/${sessionId}/ai/knowledge/${entryId}`, { method: "DELETE", headers: authH() });
    setKnowledgeEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  async function sendTestMessage() {
    if (!testInput.trim() || testLoading || !backendUrl || !sessionId) return;
    const userMsg = testInput.trim();
    setTestInput("");
    const newHistory = [...testMessages, { role: "user" as const, content: userMsg }];
    setTestMessages(newHistory);
    setTestLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/sessions/${sessionId}/ai/test`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authH() },
        body: JSON.stringify({ message: userMsg, history: testMessages }),
      });
      const d = await res.json();
      setTestMessages([...newHistory, { role: "assistant", content: d.reply || d.error || "No response" }]);
    } catch { setTestMessages([...newHistory, { role: "assistant", content: "Error — check your API key and connection." }]); }
    finally { setTestLoading(false); }
  }

  function previewBotPrompt(): string {
    const { persona, business_name, language, tone, instructions } = botConfig;
    const lines = [`You are ${persona || "a helpful WhatsApp assistant"}.`];
    if (business_name) lines.push(`You represent: ${business_name}`);
    if (tone) lines.push(`Tone: ${tone}`);
    if (language && language !== "same as user") lines.push(`Always respond in: ${language}`);
    else lines.push("Detect the user's language and always reply in the same language.");
    lines.push("You are replying via WhatsApp — keep messages concise and natural. Avoid markdown formatting.");
    if (instructions) lines.push(`\nAdditional instructions:\n${instructions}`);
    return lines.join("\n");
  }

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
            {hasApiKey && !changingApiKey ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="flex-1 font-mono text-xs text-emerald-300">API key connected</span>
                <button type="button" onClick={() => setChangingApiKey(true)} className="text-[10px] text-muted-foreground hover:text-foreground underline">Change</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={ai.openai_api_key}
                  onChange={(e) => setA("openai_api_key", e.target.value)}
                  placeholder={hasApiKey ? "Enter new API key to replace existing" : "sk-..."}
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 pr-9 font-mono text-xs outline-none transition-colors focus:border-primary"
                  autoFocus={changingApiKey}
                />
                <button type="button" onClick={() => setShowApiKey((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground">
                  {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
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

            {/* Voice reply settings — full customization */}
            <div className="rounded-xl border border-purple-800/40 bg-purple-950/20 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Mic className="h-3.5 w-3.5 text-purple-300" />
                <label className="text-[11px] font-medium uppercase tracking-wider text-purple-200">Voice Reply</label>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] text-muted-foreground">Mode</label>
                  <select value={ai.ai_voice_reply_mode} onChange={(e) => setA("ai_voice_reply_mode", e.target.value as "text" | "match_input" | "always")}
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-xs outline-none focus:border-primary">
                    <option value="text">Text only (default)</option>
                    <option value="match_input">Match input — voice → voice, text → text</option>
                    <option value="always">Always voice</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground">Voice</label>
                  <select value={ai.ai_voice_name} onChange={(e) => setA("ai_voice_name", e.target.value)}
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-xs outline-none focus:border-primary">
                    <option value="alloy">Alloy (neutral)</option>
                    <option value="echo">Echo (male)</option>
                    <option value="fable">Fable (British male)</option>
                    <option value="onyx">Onyx (deep male)</option>
                    <option value="nova">Nova (female, warm)</option>
                    <option value="shimmer">Shimmer (female, soft)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground">Quality</label>
                  <select value={ai.ai_voice_model} onChange={(e) => setA("ai_voice_model", e.target.value)}
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-xs outline-none focus:border-primary">
                    <option value="tts-1">Standard (faster, $0.015/1k)</option>
                    <option value="tts-1-hd">HD (higher quality, $0.030/1k)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Speed</span>
                    <span className="font-mono text-purple-300">{ai.ai_voice_speed.toFixed(2)}×</span>
                  </label>
                  <input type="range" min={0.25} max={4.0} step={0.05}
                    value={ai.ai_voice_speed}
                    onChange={(e) => setA("ai_voice_speed", parseFloat(e.target.value))}
                    className="w-full accent-purple-400" />
                  <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground/60">
                    <span>0.25× slow</span><span>1.0× normal</span><span>4.0× fast</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!backendUrl || !sessionId) return;
                    try {
                      const res = await fetch(`${backendUrl}/api/sessions/${sessionId}/ai/voice-preview`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", ...authH() },
                        body: JSON.stringify({
                          text: "Hi there! This is how your voice will sound on WhatsApp. I can help your customers right away.",
                          voice: ai.ai_voice_name,
                          speed: ai.ai_voice_speed,
                          model: ai.ai_voice_model,
                        }),
                      });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const audio = new Audio(url);
                      audio.play();
                    } catch { /* silent */ }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-700/40 px-3 py-1.5 text-xs font-medium text-purple-200 hover:bg-purple-700/60"
                >
                  <Mic className="h-3 w-3" /> Preview voice
                </button>
                <p className="text-[10px] text-purple-300/70">Customer voice notes are transcribed with Whisper automatically.</p>
              </div>
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

        {/* ── AI Chatbot Builder ──────────────────────────────── */}
        <SectionCard title="AI Chatbot Builder" icon="🧠" defaultOpen={false}>
          <p className="mb-4 text-[11px] text-muted-foreground">Define who your bot is, how it speaks, and what rules it follows. This generates the system prompt used by your AI.</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Persona / Name</label>
              <input value={botConfig.persona} onChange={(e) => setB("persona", e.target.value)}
                placeholder="e.g. Ava, a friendly sales assistant"
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Business Name</label>
              <input value={botConfig.business_name} onChange={(e) => setB("business_name", e.target.value)}
                placeholder="e.g. Flogen Tech"
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tone</label>
              <select value={botConfig.tone} onChange={(e) => setB("tone", e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary">
                {["professional","friendly","casual","formal","empathetic","playful","direct"].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Language</label>
              <select value={botConfig.language} onChange={(e) => setB("language", e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="same as user">Auto-detect (match user)</option>
                <option value="malaysia-trilingual">🇲🇾 Malaysia (EN / BM / 中文 only)</option>
                {["English","Bahasa Melayu","Mandarin","Arabic","Indonesian","Thai","Vietnamese","Spanish","French","Hindi","Japanese","Korean"].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Emoji Usage</label>
              <select value={botConfig.emoji_mode} onChange={(e) => setB("emoji_mode", e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="none">🚫 None — plain text only</option>
                <option value="minimal">🙂 Minimal — rarely</option>
                <option value="natural">😊 Natural — like a human</option>
                <option value="frequent">🎉 Frequent — lots</option>
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Custom Instructions</label>
            <textarea value={botConfig.instructions} onChange={(e) => setB("instructions", e.target.value)} rows={5}
              placeholder={"Be specific — this is the most powerful field.\n\nExamples:\n• Always greet users by name\n• Never discuss competitor products\n• If asked about pricing, share the packages below...\n• Collect their email before sending any links"}
              className="w-full resize-y rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
            <p className="mt-1 text-[10px] text-muted-foreground">The more detail you provide, the better your bot performs.</p>
          </div>

          {/* Prompt preview */}
          <div className="mt-3">
            <button onClick={() => setShowPromptPreview(p => !p)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <span>{showPromptPreview ? "▼" : "▶"}</span> Preview generated system prompt
            </button>
            {showPromptPreview && (
              <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-[#1E1E1E] bg-[#080808] p-3 text-[11px] text-muted-foreground whitespace-pre-wrap">
                {previewBotPrompt()}
              </pre>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {sessionId && (
              <button onClick={saveBotConfig} disabled={botSaving}
                className={cn("flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
                  botSaved ? "bg-[#25D366] text-white" : "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20")}>
                {botSaving ? "Saving…" : botSaved ? "✓ Saved" : "Save Chatbot Config"}
              </button>
            )}
            <button onClick={() => { setTestOpen(p => !p); if (!testOpen) setTestMessages([]); }}
              className="rounded-xl border border-[#1E1E1E] px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {testOpen ? "Close Test" : "🧪 Test Chat"}
            </button>
          </div>

          {/* Test chat panel */}
          {testOpen && (
            <div className="mt-3 overflow-hidden rounded-xl border border-[#1E1E1E] bg-[#080808]">
              <div className="border-b border-[#1E1E1E] px-4 py-2">
                <p className="text-[11px] font-medium text-muted-foreground">Live test — talks to your bot using current saved config + knowledge base</p>
              </div>
              <div className="flex h-60 flex-col gap-2 overflow-y-auto p-3">
                {testMessages.length === 0 && (
                  <p className="mt-auto text-center text-[11px] text-muted-foreground">Send a message to test your chatbot</p>
                )}
                {testMessages.map((m, i) => (
                  <div key={i} className={cn("max-w-[85%] rounded-xl px-3 py-2 text-xs",
                    m.role === "user" ? "ml-auto bg-primary text-white" : "bg-[#1E1E1E] text-foreground")}>
                    {m.content}
                  </div>
                ))}
                {testLoading && (
                  <div className="flex items-center gap-1.5 bg-[#1E1E1E] rounded-xl px-3 py-2 w-16">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                )}
              </div>
              <div className="flex gap-2 border-t border-[#1E1E1E] p-2">
                <input value={testInput} onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendTestMessage()}
                  placeholder="Type a test message…"
                  className="flex-1 rounded-lg border border-[#1E1E1E] bg-[#111] px-3 py-1.5 text-sm outline-none focus:border-primary" />
                <button onClick={sendTestMessage} disabled={testLoading || !testInput.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
                  Send
                </button>
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Knowledge Base ───────────────────────────────────── */}
        <SectionCard title="Knowledge Base" icon="📚" defaultOpen={false}>
          <p className="mb-3 text-[11px] text-muted-foreground">Add documents your bot can reference — FAQs, product info, pricing, policies. The AI will search these when answering questions.</p>

          {/* Entry list */}
          {knowledgeEntries.length > 0 && (
            <div className="mb-3 space-y-2">
              {knowledgeEntries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{entry.title}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {entry.source !== "manual" && <span className="text-[10px] text-muted-foreground">{entry.source}</span>}
                      <span className={cn("rounded-full px-1.5 py-px text-[9px] font-medium",
                        entry.has_embedding ? "bg-[#25D366]/10 text-[#25D366]" : "bg-amber-500/10 text-amber-400")}>
                        {entry.has_embedding ? "✓ Searchable" : "⚠ No embedding"}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => deleteKbEntry(entry.id)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add entry form */}
          {addingEntry ? (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Title</label>
                <input value={newEntryTitle} onChange={(e) => setNewEntryTitle(e.target.value)}
                  placeholder="e.g. Pricing Plans, FAQ, Return Policy"
                  className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Content</label>
                <textarea value={newEntryContent} onChange={(e) => setNewEntryContent(e.target.value)} rows={7}
                  placeholder="Paste your content here. The more detailed and structured, the better the AI can use it."
                  className="w-full resize-y rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setAddingEntry(false); setNewEntryTitle(""); setNewEntryContent(""); }}
                  className="rounded-lg border border-[#1E1E1E] px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                <button onClick={addKnowledgeEntry} disabled={entryAdding || !newEntryTitle.trim() || !newEntryContent.trim()}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                  {entryAdding ? "Saving & generating embedding…" : "Save Entry"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setAddingEntry(true)}
                className="flex-1 rounded-xl border border-dashed border-[#2A2A2A] py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                + Add Text Entry
              </button>
              <button onClick={() => kbFileRef.current?.click()}
                className="rounded-xl border border-dashed border-[#2A2A2A] px-4 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                Upload .txt
              </button>
              <input ref={kbFileRef} type="file" accept=".txt,.md" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadKbFile(f); e.target.value = ""; }} />
            </div>
          )}

          {knowledgeEntries.length === 0 && !addingEntry && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground/60">No entries yet — add your first document above</p>
          )}
        </SectionCard>

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
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {c.phoneNumber ? `+${c.phoneNumber}` : c.isGroup ? "Group" : c.jid.endsWith("@s.whatsapp.net") ? `+${c.jid.split("@")[0]}` : "WhatsApp Contact"}
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
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null); // null = checking
  const [session, setSession] = useState<WaSession | null>(null);
  const [chats, setChats] = useState<WaChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<WaChat | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingFile, setSendingFile] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateTab, setTemplateTab] = useState<"chat" | "doc">("chat");
  const [chatTemplates, setChatTemplates] = useState<ChatTemplate[]>([]);
  const [docTemplates, setDocTemplates] = useState<DocTemplate[]>([]);
  const [addingChatTpl, setAddingChatTpl] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplText, setNewTplText] = useState("");
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loadingContactInfo, setLoadingContactInfo] = useState(false);
  const [picCache, setPicCache] = useState<Record<string, string>>({});
  // Pinned JIDs are derived from chats[].isPinned which comes from the backend
  const [chatFilter, setChatFilter] = useState<string>("all");
  const [remarkChat, setRemarkChat] = useState<WaChat | null>(null);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [pendingAiReplies, setPendingAiReplies] = useState<PendingAiReply[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docTplInputRef = useRef<HTMLInputElement>(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qrPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedChatRef = useRef<WaChat | null>(null);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  const loadedPicsRef = useRef<Set<string>>(new Set());

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [sendingVoice, setSendingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  // Display toggle for transcripts — persisted on the backend (sessions.show_transcripts)
  const [showTranscripts, setShowTranscripts] = useState<boolean>(true);
  const toggleTranscripts = useCallback(async () => {
    if (!backendUrl || !session) return;
    const next = !showTranscripts;
    setShowTranscripts(next);
    try {
      await fetch(`${backendUrl}/api/sessions/${session.id}/ai`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ show_transcripts: next }),
      });
    } catch { /* silent */ }
  }, [backendUrl, session, showTranscripts]);

  // Load backend URL on mount — env var takes priority, then localStorage
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "";
    const stored = localStorage.getItem("wa_backend_url") || "";
    const url = envUrl || stored;
    setBackendUrl(url);
    if (url) checkBackend(url);
  }, []);

  // Load templates from backend when session connects
  useEffect(() => {
    if (!backendUrl || !session?.id) return;
    fetch(`${backendUrl}/api/sessions/${session.id}/templates/chat`)
      .then(r => r.json())
      .then(d => setChatTemplates(d.templates || []))
      .catch(() => {});
    fetch(`${backendUrl}/api/sessions/${session.id}/templates/doc`)
      .then(r => r.json())
      .then(d => setDocTemplates(d.templates || []))
      .catch(() => {});
  }, [backendUrl, session?.id]);

  // Auth headers helper — no auth required
  const authHeaders = useCallback((): HeadersInit => {
    return {};
  }, []);

  // Ping backend + fetch session list
  const checkBackend = useCallback(async (url: string) => {
    if (!url) { setBackendOnline(false); return; }
    try {
      const res = await fetch(`${url}/api/sessions`, {
        signal: AbortSignal.timeout(4000),
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
  }, []);

  // Fetch detailed session status (including QR data URL)
  const fetchSessionStatus = useCallback(async (sessionId: string) => {
    if (!backendUrl || !sessionId) return;
    try {
      const res = await fetch(`${backendUrl}/api/sessions/${sessionId}/status`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return;
      const data = await res.json();
      const s = data.session ?? data;
      setSession((prev) => prev ? {
        ...prev,
        status: s.status ?? prev.status,
        qrCode: data.qrDataUrl || data.qr || prev.qrCode,
      } : prev);
    } catch { /* silent */ }
  }, [backendUrl]);

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
          type: normalizeType(msg.messageType),
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
          lastMessage: msg.content || msg.caption || mediaPreview(msg.messageType || "") || "Media",
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
      setChats([]); // clears so useEffect sees change and re-fetches
    });

    // AI pending reply preview
    socket.on("ai:pending_reply", (data: PendingAiReply) => {
      setPendingAiReplies(prev => [...prev.filter(p => p.pendingId !== data.pendingId), data]);
    });
    socket.on("ai:pending_resolved", ({ pendingId }: { pendingId: string }) => {
      setPendingAiReplies(prev => prev.filter(p => p.pendingId !== pendingId));
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
        phone_number?: string;
        last_message?: string;
        last_message_time?: number | string;
        message_type?: string;
        is_group?: number | boolean;
        chat_status?: string;
        tags?: string;
        ai_disabled?: number | boolean;
        from_me?: number | boolean;
        is_pinned?: number | boolean;
      }> = data.chats || data || [];
      const mapped: WaChat[] = chatList.map((c) => {
        const rawName = c.name || c.phone_number || (c.jid ?? "").split("@")[0] || "Unknown";
        const lastMsg = c.last_message || (c.message_type ? mediaPreview(c.message_type) : "");
        let tags: string[] = [];
        try { tags = c.tags ? JSON.parse(c.tags) : []; } catch { tags = []; }
        return {
          id: c.jid || "",
          jid: c.jid || "",
          name: rawName,
          phoneNumber: c.phone_number || undefined,
          lastMessage: lastMsg,
          lastMessageTime: c.last_message_time ? String(c.last_message_time) : "",
          unreadCount: 0,
          isGroup: !!(c.is_group),
          avatarInitials: getInitials(rawName),
          chatStatus: c.chat_status || "open",
          tags,
          aiDisabled: !!(c.ai_disabled),
          lastFromMe: !!(c.from_me),
          isPinned: !!(c.is_pinned),
        };
      });
      setChats(mapped);
      // Keep selectedChat in sync when chats refresh (picks up newly populated phone numbers etc.)
      setSelectedChat(prev => {
        if (!prev) return prev;
        const updated = mapped.find(c => c.jid === prev.jid);
        return updated ?? prev;
      });
    } catch {
      /* silent */
    } finally {
      setLoadingChats(false);
    }
  }, [backendUrl, session]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Load showTranscripts preference from backend when session connects
  useEffect(() => {
    if (!backendUrl || !session?.id) return;
    fetch(`${backendUrl}/api/sessions/${session.id}/ai`)
      .then(r => r.json())
      .then(d => { if (typeof d.show_transcripts === "boolean") setShowTranscripts(d.show_transcripts); })
      .catch(() => {});
  }, [backendUrl, session?.id]);

  // Load profile pics for all non-group chats progressively in the background
  useEffect(() => {
    if (!backendUrl || !session || session.status !== "connected" || chats.length === 0) return;
    let stopped = false;
    const toLoad = chats.filter(c => !c.isGroup && !loadedPicsRef.current.has(c.jid));
    if (toLoad.length === 0) return;

    (async () => {
      for (const chat of toLoad) {
        if (stopped) break;
        loadedPicsRef.current.add(chat.jid);
        try {
          const res = await fetch(
            `${backendUrl}/api/sessions/${session.id}/contacts/${encodeURIComponent(chat.jid)}/info`,
            { signal: AbortSignal.timeout(5000), headers: authHeaders() }
          );
          if (!stopped && res.ok) {
            const d = await res.json();
            if (d.profilePicUrl) setPicCache(prev => ({ ...prev, [chat.jid]: d.profilePicUrl }));
          }
        } catch { /* no pic */ }
        await new Promise(r => setTimeout(r, 350));
      }
    })();

    return () => { stopped = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, backendUrl, session?.id, session?.status]);

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
        push_name?: string;
      }> = data.messages || data || [];
      const mapped: WaMessage[] = msgList.map((m) => {
        const rawType = m.message_type || m.type || "text";
        const msgType = normalizeType(rawType);
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

  // ── Voice recording ───────────────────────────────────────────────────────
  async function startRecording() {
    if (recording || !selectedChat) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordedBlob(blob);
        setRecordedBlobUrl(URL.createObjectURL(blob));
        recordStreamRef.current?.getTracks().forEach(t => t.stop());
        recordStreamRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingElapsed(0);
      recordTickRef.current = setInterval(() => setRecordingElapsed(e => e + 1), 1000);
    } catch {
      alert("Microphone access denied or unavailable.");
    }
  }

  function stopRecording() {
    if (!recording) return;
    mediaRecorderRef.current?.stop();
    if (recordTickRef.current) { clearInterval(recordTickRef.current); recordTickRef.current = null; }
    setRecording(false);
  }

  function cancelRecording() {
    if (recording) {
      try { mediaRecorderRef.current?.stop(); } catch { /* noop */ }
      if (recordTickRef.current) { clearInterval(recordTickRef.current); recordTickRef.current = null; }
      setRecording(false);
    }
    if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);
    setRecordedBlob(null);
    setRecordedBlobUrl(null);
    setRecordingElapsed(0);
  }

  async function sendVoiceRecording() {
    if (!recordedBlob || !selectedChat || !session || sendingVoice) return;
    setSendingVoice(true);
    try {
      const ext = recordedBlob.type.includes("ogg") ? "ogg" : "webm";
      const fd = new FormData();
      fd.append("file", recordedBlob, `voice.${ext}`);
      fd.append("jid", selectedChat.jid);
      await fetch(`${backendUrl}/api/sessions/${session.id}/messages/send-voice`, {
        method: "POST", headers: authHeaders(), body: fd,
      });
      // Clean up; the socket will push message:new for the sent voice
      if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);
      setRecordedBlob(null);
      setRecordedBlobUrl(null);
      setRecordingElapsed(0);
    } catch { /* silent */ } finally { setSendingVoice(false); }
  }

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

  // ── File / Media sending ───────────────────────────────────────────────────
  async function sendFile(file: File) {
    if (!selectedChat || !session) return;
    const fileType = file.type.startsWith("image/") ? "image"
      : file.type.startsWith("video/") ? "video"
      : file.type.startsWith("audio/") ? "audio"
      : "document";

    const optimistic: WaMessage = {
      id: `opt_${Date.now()}`,
      fromMe: true,
      body: file.name,
      timestamp: Math.floor(Date.now() / 1000),
      status: "pending",
      type: fileType as WaMessage["type"],
      mediaMimetype: file.type,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    setSendingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jid", selectedChat.jid);
      formData.append("type", fileType);
      const hdrs: Record<string, string> = {};
      const res = await fetch(`${backendUrl}/api/sessions/${session.id}/messages/send-media`, {
        method: "POST",
        headers: hdrs,
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id ? { ...m, id: data.messageId || m.id, status: "sent" } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...m, status: "error" } : m))
      );
    } finally {
      setSendingFile(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { setShowAttachMenu(false); sendFile(file); }
    e.target.value = "";
  }

  // ── Chat templates (server-persisted) ──────────────────────────────────────
  async function addChatTemplate() {
    if (!newTplName.trim() || !newTplText.trim() || !backendUrl || !session) return;
    try {
      const res = await fetch(`${backendUrl}/api/sessions/${session.id}/templates/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: newTplName.trim(), text: newTplText.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setChatTemplates([...chatTemplates, { id: d.id, name: newTplName.trim(), text: newTplText.trim() }]);
      }
    } catch { /* silent */ }
    setNewTplName(""); setNewTplText(""); setAddingChatTpl(false);
  }
  async function deleteChatTemplate(id: string) {
    if (!backendUrl || !session) return;
    try {
      await fetch(`${backendUrl}/api/sessions/${session.id}/templates/chat/${id}`, { method: "DELETE", headers: authHeaders() });
      setChatTemplates(chatTemplates.filter((t) => t.id !== id));
    } catch { /* silent */ }
  }
  function applyChatTemplate(tpl: ChatTemplate) { setMessageText(tpl.text); setShowTemplates(false); }

  // ── Doc templates (server-persisted) ───────────────────────────────────────
  function addDocTemplate(file: File) {
    if (!backendUrl || !session) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = ev.target?.result as string;
      const payload = {
        name: file.name.replace(/\.[^.]+$/, ""),
        filename: file.name,
        mimetype: file.type || "application/octet-stream",
        data,
      };
      try {
        const res = await fetch(`${backendUrl}/api/sessions/${session.id}/templates/doc`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const d = await res.json();
          setDocTemplates([...docTemplates, { id: d.id, ...payload }]);
        }
      } catch { /* silent */ }
    };
    reader.readAsDataURL(file);
  }
  async function deleteDocTemplate(id: string) {
    if (!backendUrl || !session) return;
    try {
      await fetch(`${backendUrl}/api/sessions/${session.id}/templates/doc/${id}`, { method: "DELETE", headers: authHeaders() });
      setDocTemplates(docTemplates.filter((t) => t.id !== id));
    } catch { /* silent */ }
  }
  async function sendDocTemplate(tpl: DocTemplate) {
    setShowTemplates(false);
    const b64 = tpl.data.includes(",") ? tpl.data.split(",")[1] : tpl.data;
    const byteString = atob(b64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: tpl.mimetype });
    const file = new File([blob], tpl.filename, { type: tpl.mimetype });
    await sendFile(file);
  }

  async function fetchContactInfo(jid: string) {
    if (!session || !backendUrl) return;
    setLoadingContactInfo(true);
    setContactInfo(null);
    setShowContactPanel(true);
    try {
      const res = await fetch(`${backendUrl}/api/sessions/${session.id}/contacts/${encodeURIComponent(jid)}/info`);
      if (res.ok) {
        const data: ContactInfo = await res.json();
        setContactInfo(data);
        if (data.profilePicUrl) {
          setPicCache((prev) => ({ ...prev, [jid]: data.profilePicUrl! }));
        }
      }
    } catch {}
    setLoadingContactInfo(false);
  }

  function saveBackendUrl(url: string) {
    setBackendUrl(url);
    localStorage.setItem("wa_backend_url", url);
    setBackendOnline(null);
    checkBackend(url);
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

  // Tick countdown for pending AI replies
  useEffect(() => {
    if (pendingAiReplies.length === 0) return;
    const t = setInterval(() => {
      setPendingAiReplies(prev => prev.filter(p => p.sendAt > Date.now() - 500));
    }, 500);
    return () => clearInterval(t);
  }, [pendingAiReplies.length]);

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

  const handlePendingAction = useCallback(async (pendingId: string, action: "cancel" | "send_now" | "manual") => {
    if (!backendUrl || !session) return;
    const pending = pendingAiReplies.find(p => p.pendingId === pendingId);
    setPendingAiReplies(prev => prev.filter(p => p.pendingId !== pendingId));
    try {
      await fetch(`${backendUrl}/api/sessions/${session.id}/ai/pending/${pendingId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action, remoteJid: pending?.remoteJid }),
      });
      // Reflect AI-disabled state locally so the "Needs Reply" alert appears immediately
      if (action === "manual" && pending?.remoteJid) {
        setChats(prev => prev.map(c => c.jid === pending.remoteJid ? { ...c, aiDisabled: true } : c));
      }
    } catch { /* silent */ }
  }, [backendUrl, session, pendingAiReplies]);

  const toggleAiForChat = useCallback(async (jid: string) => {
    if (!backendUrl || !session) return;
    try {
      const res = await fetch(`${backendUrl}/api/sessions/${session.id}/contacts/${encodeURIComponent(jid)}/ai-toggle`, {
        method: "PATCH", headers: { ...authHeaders() },
      });
      if (res.ok) {
        const d = await res.json();
        setChats(prev => prev.map(c => c.jid === jid ? { ...c, aiDisabled: d.ai_disabled } : c));
      }
    } catch { /* silent */ }
  }, [backendUrl, session]);

  const togglePin = useCallback(async (jid: string) => {
    if (!backendUrl || !session) return;
    try {
      const res = await fetch(`${backendUrl}/api/sessions/${session.id}/contacts/${encodeURIComponent(jid)}/pin-toggle`, {
        method: "PATCH", headers: { ...authHeaders() },
      });
      if (res.ok) {
        const d = await res.json();
        setChats(prev => prev.map(c => c.jid === jid ? { ...c, isPinned: !!d.is_pinned } : c));
      }
    } catch { /* silent */ }
  }, [backendUrl, session]);

  const REMARK_OPTIONS = ["🔥 Hot Lead", "❄️ Cold", "⏳ Follow Up", "✅ Closed", "💎 VIP", "🆕 New Customer"];

  const saveRemark = useCallback(async (chat: WaChat, tags: string[]) => {
    if (!backendUrl || !session) return;
    try {
      await fetch(`${backendUrl}/api/sessions/${session.id}/contacts/${encodeURIComponent(chat.jid)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ tags }),
      });
      setChats(prev => prev.map(c => c.jid === chat.jid ? { ...c, tags } : c));
    } catch { /* silent */ }
    setRemarkChat(null);
  }, [backendUrl, session]);

  const filteredChats = useMemo(() => {
    let list = chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    if (chatFilter === "pinned") list = list.filter(c => c.isPinned);
    else if (chatFilter === "groups") list = list.filter(c => c.isGroup);
    else if (chatFilter === "open") list = list.filter(c => !c.chatStatus || c.chatStatus === "open");
    else if (chatFilter === "pending") list = list.filter(c => c.chatStatus === "pending");
    else if (chatFilter === "resolved") list = list.filter(c => c.chatStatus === "resolved");
    else if (chatFilter === "tagged") list = list.filter(c => c.tags && c.tags.length > 0);
    // Pinned chats always sort to top
    return [...list].sort((a, b) => {
      const ap = a.isPinned ? 0 : 1;
      const bp = b.isPinned ? 0 : 1;
      return ap - bp;
    });
  }, [chats, search, chatFilter]);

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
    <PageWrapper title="WhatsApp" headerExtra={headerExtra} fixed>
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv" className="hidden" onChange={handleFileSelect} />
      <input ref={docTplInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv,image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) addDocTemplate(f); e.target.value = ""; }} />

      {/* Templates modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={() => setShowTemplates(false)}>
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#111] border border-[#2A2A2A] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E1E]">
              <h2 className="font-semibold text-sm">Templates</h2>
              <button onClick={() => setShowTemplates(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-[#1E1E1E]">
              {(["chat", "doc"] as const).map((t) => (
                <button key={t} onClick={() => setTemplateTab(t)}
                  className={cn("flex-1 py-2.5 text-xs font-medium transition-colors", templateTab === t ? "text-[#25D366] border-b-2 border-[#25D366]" : "text-muted-foreground hover:text-foreground")}>
                  {t === "chat" ? "💬 Chat Templates" : "📄 Document Templates"}
                </button>
              ))}
            </div>
            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
              {templateTab === "chat" ? (
                <>
                  {chatTemplates.length === 0 && !addingChatTpl && (
                    <p className="text-center text-xs text-muted-foreground py-6">No chat templates yet. Add one below.</p>
                  )}
                  {chatTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-start gap-3 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{tpl.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{tpl.text}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => applyChatTemplate(tpl)}
                          className="rounded-lg bg-[#25D366]/10 px-2.5 py-1 text-[10px] font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors">Use</button>
                        <button onClick={() => deleteChatTemplate(tpl.id)}
                          className="rounded-lg bg-red-500/10 px-2.5 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition-colors">Del</button>
                      </div>
                    </div>
                  ))}
                  {addingChatTpl ? (
                    <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3 space-y-2">
                      <input value={newTplName} onChange={(e) => setNewTplName(e.target.value)}
                        placeholder="Template name (e.g. Greeting)" className="w-full rounded-lg bg-[#111] border border-[#2A2A2A] px-3 py-1.5 text-xs outline-none focus:border-primary" />
                      <textarea value={newTplText} onChange={(e) => setNewTplText(e.target.value)}
                        placeholder="Template text..." rows={3}
                        className="w-full rounded-lg bg-[#111] border border-[#2A2A2A] px-3 py-1.5 text-xs outline-none focus:border-primary resize-none" />
                      <div className="flex gap-2">
                        <button onClick={addChatTemplate} className="flex-1 rounded-lg bg-[#25D366] py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity">Save</button>
                        <button onClick={() => { setAddingChatTpl(false); setNewTplName(""); setNewTplText(""); }}
                          className="flex-1 rounded-lg border border-[#2A2A2A] py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingChatTpl(true)}
                      className="w-full rounded-xl border border-dashed border-[#2A2A2A] py-3 text-xs text-muted-foreground hover:border-[#25D366] hover:text-[#25D366] transition-colors">
                      + Add chat template
                    </button>
                  )}
                </>
              ) : (
                <>
                  {docTemplates.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-6">No document templates yet. Upload one below.</p>
                  )}
                  {docTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center gap-3 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
                        <FileText className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{tpl.name}</p>
                        <p className="text-[10px] text-muted-foreground">{tpl.filename}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => sendDocTemplate(tpl)}
                          className="rounded-lg bg-[#25D366]/10 px-2.5 py-1 text-[10px] font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors">Send</button>
                        <button onClick={() => deleteDocTemplate(tpl.id)}
                          className="rounded-lg bg-red-500/10 px-2.5 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition-colors">Del</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => docTplInputRef.current?.click()}
                    className="w-full rounded-xl border border-dashed border-[#2A2A2A] py-3 text-xs text-muted-foreground hover:border-blue-400 hover:text-blue-400 transition-colors">
                    + Upload document template
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remark / tag selector modal */}
      {remarkChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setRemarkChat(null)}>
          <div className="w-80 rounded-2xl bg-[#111] border border-[#2A2A2A] p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Remark — {remarkChat.name}</p>
              <button onClick={() => setRemarkChat(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">Select one or more labels for this contact</p>
            <div className="flex flex-wrap gap-2">
              {REMARK_OPTIONS.map(opt => {
                const active = remarkChat.tags?.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      const current = remarkChat.tags || [];
                      const next = active ? current.filter(t => t !== opt) : [...current, opt];
                      setRemarkChat({ ...remarkChat, tags: next });
                    }}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                      active ? "bg-primary text-white" : "bg-[#1E1E1E] text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRemarkChat(null)} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              <button
                onClick={() => saveRemark(remarkChat, remarkChat.tags || [])}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white"
              >Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact info panel — slides in from right */}
      {showContactPanel && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowContactPanel(false)}>
          <div className="h-full w-full max-w-sm overflow-y-auto bg-[#111] border-l border-[#2A2A2A] shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E1E]">
              <h2 className="text-sm font-semibold">Contact Info</h2>
              <button onClick={() => setShowContactPanel(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingContactInfo ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
              </div>
            ) : contactInfo ? (
              <div className="p-5 space-y-5">
                {/* Profile picture + name */}
                <div className="flex flex-col items-center gap-3 py-4">
                  {contactInfo.profilePicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={contactInfo.profilePicUrl} alt={contactInfo.name || ""}
                      className="h-24 w-24 rounded-full object-cover ring-2 ring-[#25D366]/30" />
                  ) : (
                    <div className={cn("flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white",
                      avatarColor(contactInfo.name || contactInfo.phone))}>
                      {getInitials(contactInfo.name || contactInfo.phone)}
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-base font-semibold text-foreground">{contactInfo.name || "Unknown"}</p>
                    {contactInfo.isGroup && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#25D366]/10 px-2 py-0.5 text-[10px] text-[#25D366]">
                        <Users className="h-3 w-3" /> Group
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] divide-y divide-[#1E1E1E]">
                  <DetailRow icon="📱" label="Phone" value={`+${contactInfo.phone}`} />
                  <DetailRow icon="💬" label="WhatsApp ID" value={contactInfo.jid} mono />
                  {contactInfo.status && <DetailRow icon="ℹ️" label="About" value={contactInfo.status} />}
                  {!contactInfo.isGroup && (
                    <DetailRow icon="🌐" label="Type" value="WhatsApp User" />
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Notes</label>
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2.5 text-xs text-muted-foreground min-h-[60px]">
                    {contactInfo.notes || <span className="italic opacity-50">No notes</span>}
                  </div>
                </div>

                {/* Quick actions */}
                <button
                  onClick={() => { setShowContactPanel(false); setTab("inbox"); }}
                  className="w-full rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                  💬 Open Chat
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <AlertCircle className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-xs">Could not load contact info</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flex column fills remaining height — never expands the page */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

      {/* Tab bar */}
      <div className="flex shrink-0 items-center gap-1 border-b border-[#1E1E1E] px-6 pt-0 pb-0">
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
            onSave={saveBackendUrl}
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
                  <div className="border-b border-[#1E1E1E] p-2 pb-0">
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
                    {/* Filter pills */}
                    <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
                      {(["all","pinned","groups","open","pending","resolved","tagged"] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setChatFilter(f)}
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize transition-colors",
                            chatFilter === f
                              ? "bg-primary text-white"
                              : "bg-[#1E1E1E] text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {f === "all" ? "All" : f === "pinned" ? "📌 Pinned" : f === "groups" ? "Groups" : f === "open" ? "Open" : f === "pending" ? "Pending" : f === "resolved" ? "Resolved" : "Tagged"}
                        </button>
                      ))}
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
                      filteredChats.map((chat) => {
                        const isPinned = !!chat.isPinned;
                        const isHovered = hoveredChatId === chat.jid;
                        const needsTakeover = !!chat.aiDisabled && !chat.lastFromMe && !chat.isGroup;
                        return (
                          <div
                            key={chat.id}
                            className={cn(
                              "group relative flex items-center gap-3 border-b border-[#1E1E1E] px-4 py-3 transition-colors cursor-pointer",
                              needsTakeover && "bg-red-950/30 hover:bg-red-950/40",
                              !needsTakeover && (selectedChat?.id === chat.id ? "bg-primary/5" : "hover:bg-[#1E1E1E]/40")
                            )}
                            onMouseEnter={() => setHoveredChatId(chat.jid)}
                            onMouseLeave={() => setHoveredChatId(null)}
                            onClick={() => { setSelectedChat(chat); setMessages([]); }}
                          >
                            {/* Takeover alert stripe (red, pulsing) */}
                            {needsTakeover && <span className="absolute left-0 top-0 h-full w-1 bg-red-500 rounded-r animate-pulse" />}
                            {/* Pin indicator stripe */}
                            {!needsTakeover && isPinned && <span className="absolute left-0 top-0 h-full w-0.5 bg-primary/60 rounded-r" />}
                            <div className="relative shrink-0">
                              <Avatar name={chat.name} picUrl={picCache[chat.jid]} size={10} />
                              {chat.isGroup && (
                                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0A0A0A] text-[#6B7280]">
                                  <Users className="h-2 w-2" />
                                </span>
                              )}
                              {isPinned && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0A0A0A] text-primary">
                                  <Pin className="h-2 w-2" />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-1">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <p className="truncate text-xs font-semibold text-foreground">{chat.name}</p>
                                  {needsTakeover && (
                                    <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white animate-pulse">
                                      Needs Reply
                                    </span>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  {/* Action buttons shown on hover */}
                                  {isHovered && (
                                    <>
                                      {!chat.isGroup && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleAiForChat(chat.jid); }}
                                          className={cn(
                                            "flex h-5 w-5 items-center justify-center rounded",
                                            chat.aiDisabled
                                              ? "text-red-400 hover:text-red-300"
                                              : "text-emerald-400 hover:text-emerald-300"
                                          )}
                                          title={chat.aiDisabled ? "AI off — click to enable" : "AI on — click to disable"}
                                        >
                                          {chat.aiDisabled ? <BotOff className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setRemarkChat(chat); }}
                                        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                                        title="Add remark"
                                      >
                                        <Tag className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); togglePin(chat.jid); }}
                                        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                                        title={isPinned ? "Unpin" : "Pin chat"}
                                      >
                                        {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                                      </button>
                                    </>
                                  )}
                                  {!isHovered && (
                                    <div className="flex items-center gap-1">
                                      {chat.aiDisabled && !chat.isGroup && (
                                        <span title="AI disabled"><BotOff className="h-3 w-3 text-red-400/70" /></span>
                                      )}
                                      {chat.lastMessageTime && (
                                        <span className="text-[10px] text-muted-foreground">{formatTime(chat.lastMessageTime)}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {!chat.isGroup && (chat.phoneNumber || chat.jid.endsWith("@s.whatsapp.net")) && (
                                <p className="truncate font-mono text-[10px] text-white/40">+{chat.phoneNumber || chat.jid.split("@")[0]}</p>
                              )}
                              {/* Tags/remarks */}
                              {chat.tags && chat.tags.length > 0 && (
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                  {chat.tags.map(tag => (
                                    <span key={tag} className="rounded-full bg-primary/10 px-1.5 py-px text-[9px] text-primary/80">{tag}</span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-1">
                                <p className="truncate text-[11px] text-muted-foreground">{chat.lastMessage || "No messages"}</p>
                                {chat.unreadCount > 0 && (
                                  <span className="flex h-4 min-w-[1rem] shrink-0 items-center justify-center rounded-full bg-[#25D366] px-1 text-[10px] font-bold text-white">
                                    {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
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
                        <button className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                          onClick={() => fetchContactInfo(selectedChat.jid)}>
                          <Avatar name={selectedChat.name} picUrl={picCache[selectedChat.jid]} size={9} />
                          <div>
                            <p className="text-sm font-semibold text-foreground">{selectedChat.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {selectedChat.phoneNumber
                                ? `+${selectedChat.phoneNumber}`
                                : selectedChat.isGroup
                                  ? "Group"
                                  : selectedChat.jid.endsWith("@s.whatsapp.net")
                                    ? `+${selectedChat.jid.split("@")[0]}`
                                    : "WhatsApp Contact"}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={toggleTranscripts}
                            title={showTranscripts ? "Hide voice transcripts" : "Show voice transcripts"}
                            className={cn(
                              "flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] font-medium transition-colors",
                              showTranscripts
                                ? "bg-emerald-700/30 text-emerald-300 hover:bg-emerald-700/50"
                                : "text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
                            )}
                          >
                            <FileText className="h-3 w-3" /> Transcripts
                          </button>
                          <button onClick={fetchMessages}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground">
                            <RefreshCw className={cn("h-3.5 w-3.5", loadingMessages && "animate-spin")} />
                          </button>
                          <button onClick={() => fetchContactInfo(selectedChat.jid)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Messages — min-h-0 is essential for flex overflow scrolling */}
                      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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
                                  {(msg.type === "image" || msg.type === "video") ? (
                                    <div>
                                      {msg.mediaUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={`${backendUrl}${msg.mediaUrl}`}
                                          alt={msg.caption || "Image"}
                                          className="max-w-[280px] max-h-[300px] w-full object-cover rounded-2xl"
                                          onError={(e) => {
                                            const el = e.target as HTMLImageElement;
                                            el.style.display = "none";
                                            el.nextElementSibling?.classList.remove("hidden");
                                          }}
                                        />
                                      ) : null}
                                      {/* Fallback when no URL */}
                                      <div className={cn("flex items-center gap-2 px-1 py-0.5", msg.mediaUrl ? "hidden" : "")}>
                                        <span className="text-base">{msg.type === "video" ? "🎥" : "📷"}</span>
                                        <span className="text-xs text-muted-foreground">{msg.type === "video" ? "Video" : "Photo"}</span>
                                      </div>
                                      {msg.caption && <p className="px-3 pt-1.5 pb-0.5 text-xs">{msg.caption}</p>}
                                      <div className={cn("px-3 pb-1.5 pt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/60", msg.fromMe ? "justify-end" : "justify-start")}>
                                        <span>{formatTime(msg.timestamp)}</span>
                                        {msg.fromMe && <MsgStatus status={msg.status} />}
                                      </div>
                                    </div>
                                  ) : /* ── Sticker ── */
                                  msg.type === "sticker" ? (
                                    <div className="p-2">
                                      {msg.mediaUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={`${backendUrl}${msg.mediaUrl}`} alt="Sticker" className="h-24 w-24 object-contain" />
                                      ) : (
                                        <span className="text-3xl">🎭</span>
                                      )}
                                    </div>
                                  ) : /* ── Audio / Voice ── */
                                  (msg.type === "audio" || msg.type === "ptt") ? (
                                    (() => {
                                      // Extract transcript: strip "[Voice] " or "[Voice: ...]" prefix markers
                                      const raw = msg.body?.trim() || "";
                                      let transcript = raw
                                        .replace(/^\[Voice\]\s*/i, "")
                                        .replace(/\[Voice:\s*([^\]]+)\]/gi, "$1")
                                        .trim();
                                      if (transcript === "" && raw) transcript = raw;
                                      return (
                                        <div>
                                          <div className="flex items-center gap-2.5 min-w-[180px]">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/20">
                                              <Mic className="h-4 w-4 text-[#25D366]" />
                                            </div>
                                            {msg.mediaUrl ? (
                                              <audio controls src={`${backendUrl}${msg.mediaUrl}`} className="h-8 w-full max-w-[220px]" />
                                            ) : (
                                              <div className="flex-1">
                                                <div className="flex items-end gap-0.5 h-6">
                                                  {[3,5,8,6,10,7,4,9,6,5,8,4,7,5,9,6,4,8,5,7].map((h, i) => (
                                                    <div key={i} className="w-0.5 rounded-full bg-muted-foreground/40" style={{ height: `${h}px` }} />
                                                  ))}
                                                </div>
                                                <p className="mt-0.5 text-[10px] text-muted-foreground/60">Voice message</p>
                                              </div>
                                            )}
                                          </div>
                                          {/* Transcript (Whisper for received, source text for sent) */}
                                          {transcript && showTranscripts && (
                                            <div className="mt-1.5 rounded-md border border-muted-foreground/10 bg-black/20 px-2 py-1">
                                              <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wide mb-0.5">
                                                {msg.fromMe ? "Spoken text" : "Transcript"}
                                              </p>
                                              <p className="text-[11px] leading-snug text-foreground/80 whitespace-pre-wrap break-words">{transcript}</p>
                                            </div>
                                          )}
                                          <div className={cn("mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60", msg.fromMe ? "justify-end" : "justify-start")}>
                                            <span>{formatTime(msg.timestamp)}</span>
                                            {msg.fromMe && <MsgStatus status={msg.status} />}
                                          </div>
                                        </div>
                                      );
                                    })()
                                  ) : /* ── Document / PDF ── */
                                  msg.type === "document" ? (
                                    <div>
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
                                          <FileText className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-xs font-medium text-foreground">
                                            {msg.body || msg.caption || filenameFromUrl(msg.mediaUrl) || "Document"}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground/60">
                                            {mimeLabel(msg.mediaMimetype)}
                                          </p>
                                        </div>
                                        {msg.mediaUrl && (
                                          <button
                                            type="button"
                                            onClick={() => downloadFile(
                                              `${backendUrl}${msg.mediaUrl}`,
                                              msg.body || msg.caption || "document"
                                            )}
                                            className="shrink-0 rounded-lg border border-[#2A2A2A] p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                      <div className={cn("mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/60", msg.fromMe ? "justify-end" : "justify-start")}>
                                        <span>{formatTime(msg.timestamp)}</span>
                                        {msg.fromMe && <MsgStatus status={msg.status} />}
                                      </div>
                                    </div>
                                  ) : (
                                    /* ── Text / Emoji (default) ── */
                                    <>
                                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                                        {msg.body || <span className="text-muted-foreground/40 italic text-xs">{mediaPreview(msg.type) || "Message"}</span>}
                                      </p>
                                      <div className={cn("mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/60", msg.fromMe ? "justify-end" : "justify-start")}>
                                        <span>{formatTime(msg.timestamp)}</span>
                                        {msg.fromMe && <MsgStatus status={msg.status} />}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                            <div ref={messagesEndRef} />
                          </div>
                        )}
                      </div>

                      {/* AI Pending Reply Banner */}
                      {pendingAiReplies.filter(p => p.remoteJid === selectedChat?.jid).map(pr => {
                        const secsLeft = Math.max(0, Math.ceil((pr.sendAt - Date.now()) / 1000));
                        return (
                          <div key={pr.pendingId} className="border-t border-amber-800/40 bg-amber-950/30 px-4 py-2.5">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Bot className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                <span className="text-[11px] font-medium text-amber-300">AI will send in {secsLeft}s</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handlePendingAction(pr.pendingId, "send_now")}
                                  className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium bg-emerald-700/40 text-emerald-300 hover:bg-emerald-700/60"
                                  title="Send immediately"
                                >
                                  <SendHorizonal className="h-2.5 w-2.5" /> Send now
                                </button>
                                <button
                                  onClick={() => handlePendingAction(pr.pendingId, "manual")}
                                  className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium bg-blue-700/40 text-blue-300 hover:bg-blue-700/60"
                                  title="Handle manually — cancels AI reply"
                                >
                                  <UserCheck className="h-2.5 w-2.5" /> Handle
                                </button>
                                <button
                                  onClick={() => handlePendingAction(pr.pendingId, "cancel")}
                                  className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium bg-red-800/40 text-red-400 hover:bg-red-800/60"
                                  title="Cancel AI reply"
                                >
                                  <XCircle className="h-2.5 w-2.5" /> Cancel
                                </button>
                              </div>
                            </div>
                            <p className="text-[11px] text-amber-200/70 line-clamp-2 leading-relaxed">{pr.reply}</p>
                          </div>
                        );
                      })}

                      {/* Message input */}
                      <div className="border-t border-[#1E1E1E] bg-[#111111] p-3">
                        <div className="flex items-center gap-2">
                          {/* Attach file button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowAttachMenu((v) => !v)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground">
                              <Paperclip className="h-4 w-4" />
                            </button>
                            {showAttachMenu && (
                              <div className="absolute bottom-11 left-0 z-30 min-w-[170px] rounded-xl border border-[#2A2A2A] bg-[#111] shadow-xl overflow-hidden">
                                <button onClick={() => fileInputRef.current?.click()}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-[#1E1E1E] transition-colors text-left">
                                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" /> Attach file
                                </button>
                                <button onClick={() => { setShowAttachMenu(false); setTemplateTab("doc"); setShowTemplates(true); }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-[#1E1E1E] transition-colors text-left">
                                  <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Document template
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Templates button */}
                          <button
                            type="button"
                            title="Chat templates"
                            onClick={() => { setTemplateTab("chat"); setShowTemplates(true); }}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-[#25D366]">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </button>
                          {recording ? (
                            <div className="flex flex-1 items-center gap-3 rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-2">
                              <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                              </span>
                              <span className="flex-1 text-xs text-red-300 font-mono">Recording… {Math.floor(recordingElapsed / 60).toString().padStart(2, "0")}:{(recordingElapsed % 60).toString().padStart(2, "0")}</span>
                              <button onClick={cancelRecording} className="rounded-lg px-2.5 py-1 text-xs text-red-300 hover:bg-red-900/40" title="Cancel"><X className="h-3.5 w-3.5" /></button>
                              <button onClick={stopRecording} className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-500">Stop</button>
                            </div>
                          ) : recordedBlob ? (
                            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/5 px-3 py-1.5">
                              <audio src={recordedBlobUrl || undefined} controls className="h-8 flex-1" />
                              <button onClick={cancelRecording} disabled={sendingVoice} className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-[#1E1E1E]" title="Discard"><X className="h-3.5 w-3.5" /></button>
                              <button onClick={sendVoiceRecording} disabled={sendingVoice} className="flex items-center gap-1 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs text-white hover:opacity-90 disabled:opacity-50">
                                {sendingVoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3 w-3" /> Send</>}
                              </button>
                            </div>
                          ) : (
                            <>
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
                              {messageText.trim() ? (
                                <button
                                  onClick={handleSend}
                                  disabled={sending || sendingFile}
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                                >
                                  {sending || sendingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </button>
                              ) : (
                                <button
                                  onClick={startRecording}
                                  title="Record voice message"
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white transition-opacity hover:opacity-90"
                                >
                                  <Mic className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        {/* AI mode indicator — reflects per-contact toggle */}
                        <div className="mt-2 flex items-center justify-between gap-1.5 px-1">
                          <div className="flex items-center gap-1.5">
                            {selectedChat.aiDisabled ? (
                              <>
                                <Circle className="h-2 w-2 fill-red-500 text-red-500" />
                                <span className="text-[10px] text-red-400/80">
                                  AI disabled for this chat — you&apos;re handling it
                                </span>
                                <BotOff className="h-3 w-3 text-red-400/60" />
                              </>
                            ) : (
                              <>
                                <Circle className="h-2 w-2 fill-[#25D366] text-[#25D366]" />
                                <span className="text-[10px] text-muted-foreground/60">
                                  AI auto-reply is active for this chat
                                </span>
                                <Bot className="h-3 w-3 text-muted-foreground/40" />
                              </>
                            )}
                          </div>
                          {!selectedChat.isGroup && (
                            <button
                              onClick={() => toggleAiForChat(selectedChat.jid)}
                              className={cn(
                                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                                selectedChat.aiDisabled
                                  ? "bg-emerald-700/30 text-emerald-300 hover:bg-emerald-700/50"
                                  : "bg-red-800/30 text-red-300 hover:bg-red-800/50"
                              )}
                            >
                              {selectedChat.aiDisabled ? "Re-enable AI" : "Disable AI"}
                            </button>
                          )}
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
      </div>{/* end flex-col wrapper */}
    </PageWrapper>
  );
}
