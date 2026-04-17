"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Image as ImageIcon,
  FileText,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WaSession {
  id: string;
  name: string;
  status: "connected" | "connecting" | "disconnected" | "qr_ready";
  phone?: string;
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
  type: "text" | "image" | "document" | "audio" | "sticker";
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
  const date = typeof ts === "string" ? new Date(ts) : new Date(ts * 1000);
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
  onRefresh,
}: {
  session: WaSession | null;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#1E1E1E] bg-[#111111]">
        <QrCode className="h-10 w-10 text-muted-foreground/40" />
      </div>

      {session?.qrCode ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-foreground">
            Scan this QR code with WhatsApp
          </p>
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Open WhatsApp on your phone → Linked Devices → Link a Device
          </p>
          {/* QR as image — backend returns base64 or SVG */}
          <div className="rounded-xl border border-[#1E1E1E] bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={session.qrCode}
              alt="WhatsApp QR Code"
              className="h-52 w-52"
            />
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
            WhatsApp not connected
          </p>
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Configure your backend URL in Settings, then connect to start the
            session.
          </p>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plug className="h-4 w-4" />
            Connect Session
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

// ─── Settings Panel ──────────────────────────────────────────────────────────

function SettingsPanel({
  backendUrl,
  onSave,
}: {
  backendUrl: string;
  onSave: (url: string) => void;
}) {
  const [url, setUrl] = useState(backendUrl);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave(url.trim().replace(/\/$/, ""));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Backend URL */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            Backend URL
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            The URL where your WhatsApp backend server is running (Railway,
            Render, or localhost).
          </p>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            API Base URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-app.up.railway.app"
            className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-primary"
          />
          <p className="mt-1.5 text-xs text-muted-foreground/60">
            Example: http://localhost:3001 or https://wa.yourapp.app
          </p>
          <button
            onClick={handleSave}
            className={cn(
              "mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              saved
                ? "bg-[#25D366] text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {saved ? "✓ Saved" : "Save URL"}
          </button>
        </div>

        {/* Deploy guide */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            Deployment Guide
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            The WhatsApp backend requires a persistent server (not serverless).
            Deploy to Railway or Render to get a stable URL.
          </p>
          <div className="space-y-2 text-xs text-muted-foreground">
            {[
              "1. Push your backend to GitHub",
              "2. Create a new project on Railway.app",
              '3. Set environment variables: PORT, DASHBOARD_PIN, JWT_SECRET',
              "4. Add a volume mounted at /app/data",
              "5. Copy the Railway URL and paste above",
            ].map((step) => (
              <p key={step} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-primary/60">→</span>
                {step}
              </p>
            ))}
          </div>
          <a
            href="https://railway.app"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Open Railway.app
          </a>
        </div>

        {/* Proxy note */}
        <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-5">
          <h3 className="mb-1 text-sm font-semibold text-amber-400">
            Anti-Ban: Proxy Settings
          </h3>
          <p className="text-xs text-muted-foreground">
            To reduce ban risk, configure a Malaysian residential proxy on the
            backend. Set the <span className="font-mono text-primary/80">PROXY_URL</span>{" "}
            environment variable on Railway:
          </p>
          <pre className="mt-3 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3 font-mono text-xs text-muted-foreground">
            PROXY_URL=socks5://user:pass@my.proxy.com:1080
          </pre>
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

  // Load backend URL from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("wa_backend_url") || "";
    setBackendUrl(stored);
  }, []);

  // Ping backend + fetch session
  const checkBackend = useCallback(async (url: string) => {
    if (!url) {
      setBackendOnline(false);
      return;
    }
    try {
      const res = await fetch(`${url}/api/sessions`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) throw new Error("not ok");
      const data = await res.json();
      setBackendOnline(true);

      // Use first session
      const sessions: WaSession[] = data;
      if (sessions.length > 0) {
        setSession(sessions[0]);
      }
    } catch {
      setBackendOnline(false);
      setSession(null);
    }
  }, []);

  useEffect(() => {
    checkBackend(backendUrl);
  }, [backendUrl, checkBackend]);

  // Fetch chat list when connected
  const fetchChats = useCallback(async () => {
    if (!backendUrl || !session || session.status !== "connected") return;
    setLoadingChats(true);
    try {
      const res = await fetch(
        `${backendUrl}/api/sessions/${session.id}/chats`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return;
      const data = await res.json();
      // Normalise to WaChat shape
      const mapped: WaChat[] = (data || []).map(
        (c: {
          id?: string;
          jid?: string;
          name?: string;
          last_message?: string;
          lastMessage?: string;
          last_message_time?: string;
          lastMessageTime?: string;
          unread_count?: number;
          unreadCount?: number;
          is_group?: boolean;
          isGroup?: boolean;
        }) => ({
          id: c.id || c.jid || "",
          jid: c.jid || c.id || "",
          name: c.name || c.jid?.split("@")[0] || "Unknown",
          lastMessage: c.last_message || c.lastMessage || "",
          lastMessageTime: c.last_message_time || c.lastMessageTime || "",
          unreadCount: c.unread_count ?? c.unreadCount ?? 0,
          isGroup: c.is_group ?? c.isGroup ?? false,
          avatarInitials: getInitials(c.name || "?"),
        })
      );
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
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return;
      const data = await res.json();
      const mapped: WaMessage[] = (data || []).map(
        (m: {
          id?: string;
          key?: { id?: string; fromMe?: boolean };
          fromMe?: boolean;
          body?: string;
          text?: string;
          message?: string;
          timestamp?: number;
          messageTimestamp?: number;
          status?: WaMessage["status"];
          type?: WaMessage["type"];
        }) => ({
          id: m.id || m.key?.id || String(Math.random()),
          fromMe: m.fromMe ?? m.key?.fromMe ?? false,
          body: m.body || m.text || m.message || "",
          timestamp: m.timestamp || m.messageTimestamp || 0,
          status: m.status || "delivered",
          type: m.type || "text",
        })
      );
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
      await fetch(`${backendUrl}/api/sessions/${session.id}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jid: selectedChat.jid, text }),
        signal: AbortSignal.timeout(10000),
      });
      // Update optimistic to sent
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...m, status: "sent" } : m))
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

  async function handleConnect() {
    if (!backendUrl || !session) return;
    try {
      await fetch(`${backendUrl}/api/sessions/${session.id}/connect`, {
        method: "POST",
      });
      checkBackend(backendUrl);
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
        <StatusPill status={session.status} />
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
          <SettingsPanel backendUrl={backendUrl} onSave={saveBackendUrl} />
        )}

        {/* ── Contacts tab ────────────────────────────────── */}
        {tab === "contacts" && (
          <div className="flex flex-1 overflow-hidden">
            {backendOnline === false ? (
              <BackendOffline url={backendUrl} onSettings={() => setTab("settings")} />
            ) : !isConnected ? (
              <ConnectPanel session={session} onRefresh={() => checkBackend(backendUrl)} />
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
                          {session?.name || session?.id || "Session"}
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
                      onRefresh={() => checkBackend(backendUrl)}
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
                                    "max-w-[72%] rounded-2xl px-3.5 py-2 text-sm",
                                    msg.fromMe
                                      ? "rounded-br-sm bg-primary/20 text-foreground"
                                      : "rounded-bl-sm bg-[#1E1E1E] text-foreground"
                                  )}
                                >
                                  {msg.type === "image" && (
                                    <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <ImageIcon className="h-3.5 w-3.5" />
                                      Photo
                                    </div>
                                  )}
                                  {msg.type === "document" && (
                                    <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <FileText className="h-3.5 w-3.5" />
                                      Document
                                    </div>
                                  )}
                                  {msg.type === "audio" && (
                                    <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Mic className="h-3.5 w-3.5" />
                                      Voice message
                                    </div>
                                  )}
                                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                                    {msg.body}
                                  </p>
                                  <div
                                    className={cn(
                                      "mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/60",
                                      msg.fromMe ? "justify-end" : "justify-start"
                                    )}
                                  >
                                    <span>
                                      {msg.timestamp
                                        ? formatTime(msg.timestamp)
                                        : ""}
                                    </span>
                                    {msg.fromMe && <MsgStatus status={msg.status} />}
                                  </div>
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
