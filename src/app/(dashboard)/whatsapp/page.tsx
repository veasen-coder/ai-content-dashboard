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

function SettingsPanel({
  backendUrl,
  sessionId,
  onSave,
  onAuth,
}: {
  backendUrl: string;
  sessionId?: string;
  onSave: (url: string) => void;
  onAuth: (token: string) => void;
}) {
  const [url, setUrl] = useState(backendUrl);
  const [urlSaved, setUrlSaved] = useState(false);
  const [pin, setPin] = useState("");
  const [authStatus, setAuthStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  // Proxy state
  const [proxy, setProxy] = useState<ProxyConfig>({
    enabled: false,
    type: "socks5",
    host: "",
    port: "",
    username: "",
    password: "",
  });
  const [proxySaved, setProxySaved] = useState(false);
  const [proxySaving, setProxySaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNoProxyModal, setShowNoProxyModal] = useState(false);
  const [pendingConnect, setPendingConnect] = useState(false);

  // Load proxy settings from backend when session available
  useEffect(() => {
    if (!backendUrl || !sessionId) return;
    fetch(`${backendUrl}/api/sessions/${sessionId}/proxy`)
      .then((r) => r.json())
      .then((d) => {
        setProxy({
          enabled: d.proxy_enabled ?? false,
          type: d.proxy_type ?? "socks5",
          host: d.proxy_host ?? "",
          port: d.proxy_port ?? "",
          username: d.proxy_username ?? "",
          password: "",
        });
      })
      .catch(() => {});
  }, [backendUrl, sessionId]);

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxy_enabled: config.enabled,
          proxy_type: config.type,
          proxy_host: config.host,
          proxy_port: config.port,
          proxy_username: config.username,
          proxy_password: config.password || undefined,
        }),
      });
      setProxySaved(true);
      setTimeout(() => setProxySaved(false), 2000);
    } catch {
      /* silent */
    } finally {
      setProxySaving(false);
    }
  }

  function handleProxyToggle(enabled: boolean) {
    // Turning OFF proxy — show confirmation
    if (!enabled && proxy.enabled) {
      setShowNoProxyModal(true);
      setPendingConnect(false);
      return;
    }
    setProxy((p) => ({ ...p, enabled }));
  }

  function handleSaveProxy() {
    // Saving with proxy disabled — show warning
    if (!proxy.enabled) {
      setShowNoProxyModal(true);
      setPendingConnect(true);
      return;
    }
    saveProxy(proxy);
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* No-proxy confirmation modal */}
      {showNoProxyModal && (
        <NoProxyConfirmModal
          onCancel={() => {
            setShowNoProxyModal(false);
            setPendingConnect(false);
          }}
          onConfirm={() => {
            setShowNoProxyModal(false);
            if (pendingConnect) {
              saveProxy({ ...proxy, enabled: false });
            } else {
              setProxy((p) => ({ ...p, enabled: false }));
            }
            setPendingConnect(false);
          }}
        />
      )}

      <div className="mx-auto max-w-xl space-y-6">
        {/* Backend URL */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <h3 className="mb-1 text-sm font-semibold text-foreground">Backend URL</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            The URL where your WhatsApp backend server is running (Railway, Render, or localhost).
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
            onClick={handleSaveUrl}
            className={cn(
              "mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              urlSaved ? "bg-[#25D366] text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {urlSaved ? "✓ Saved" : "Save URL"}
          </button>
        </div>

        {/* PIN Authentication */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <h3 className="mb-1 text-sm font-semibold text-foreground">Authentication</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Enter your dashboard PIN to authenticate with the backend and get a session token.
          </p>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dashboard PIN
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              placeholder="Enter PIN…"
              maxLength={8}
              className="w-32 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-primary tracking-widest"
            />
            <button
              onClick={handleAuth}
              disabled={authStatus === "loading" || !pin || !url}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                authStatus === "ok" ? "bg-[#25D366] text-white" :
                authStatus === "error" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {authStatus === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {authStatus === "ok" ? "✓ Authenticated" :
               authStatus === "error" ? "Wrong PIN" :
               authStatus === "loading" ? "Verifying…" : "Authenticate"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground/60">
            Default PIN is 1234 unless you changed DASHBOARD_PIN on Railway
          </p>
        </div>

        {/* Proxy settings */}
        <div className={cn(
          "rounded-xl border p-5 transition-colors",
          proxy.enabled
            ? "border-[#25D366]/20 bg-[#25D366]/5"
            : "border-amber-500/20 bg-amber-500/5"
        )}>
          {/* Header row */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {proxy.enabled ? (
                <ShieldCheck className="h-5 w-5 text-[#25D366]" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-amber-400" />
              )}
              <div>
                <h3 className={cn("text-sm font-semibold", proxy.enabled ? "text-[#25D366]" : "text-amber-400")}>
                  Residential Proxy {proxy.enabled ? "— Enabled" : "— Disabled"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {proxy.enabled
                    ? "Your connection routes through a residential IP — lower ban risk"
                    : "No proxy — server IP exposed to WhatsApp — higher ban risk"}
                </p>
              </div>
            </div>
            {/* Toggle */}
            <button
              onClick={() => handleProxyToggle(!proxy.enabled)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                proxy.enabled ? "bg-[#25D366]" : "bg-[#1E1E1E]"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  proxy.enabled ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {proxy.enabled && (
            <div className="space-y-3">
              {/* Protocol */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Protocol
                </label>
                <div className="flex gap-2">
                  {(["socks5", "http"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setProxy((p) => ({ ...p, type: t }))}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-xs font-semibold transition-colors",
                        proxy.type === t
                          ? "border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]"
                          : "border-[#1E1E1E] bg-[#0A0A0A] text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground/60">
                  SOCKS5 recommended for residential proxies
                </p>
              </div>

              {/* Host + Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Host
                  </label>
                  <input
                    type="text"
                    value={proxy.host}
                    onChange={(e) => setProxy((p) => ({ ...p, host: e.target.value }))}
                    placeholder="proxy.provider.com"
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-xs outline-none transition-colors focus:border-[#25D366]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Port
                  </label>
                  <input
                    type="text"
                    value={proxy.port}
                    onChange={(e) => setProxy((p) => ({ ...p, port: e.target.value }))}
                    placeholder="1080"
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-xs outline-none transition-colors focus:border-[#25D366]"
                  />
                </div>
              </div>

              {/* Username + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Username
                  </label>
                  <input
                    type="text"
                    value={proxy.username}
                    onChange={(e) => setProxy((p) => ({ ...p, username: e.target.value }))}
                    placeholder="optional"
                    className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 font-mono text-xs outline-none transition-colors focus:border-[#25D366]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={proxy.password}
                      onChange={(e) => setProxy((p) => ({ ...p, password: e.target.value }))}
                      placeholder="optional"
                      className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 pr-8 font-mono text-xs outline-none transition-colors focus:border-[#25D366]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {proxy.host && proxy.port && (
                <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2">
                  <p className="text-[10px] text-muted-foreground/60 mb-0.5">Preview</p>
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {proxy.type}://{proxy.username ? `${proxy.username}:***@` : ""}{proxy.host}:{proxy.port}
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSaveProxy}
            disabled={proxySaving}
            className={cn(
              "mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
              proxySaved
                ? "bg-[#25D366] text-white"
                : proxy.enabled
                ? "bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 border border-[#25D366]/20"
                : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
            )}
          >
            {proxySaving ? "Saving…" : proxySaved ? "✓ Proxy Saved" : proxy.enabled ? "Save Proxy Settings" : "Save (No Proxy)"}
          </button>
        </div>

        {/* Deploy guide */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
          <h3 className="mb-1 text-sm font-semibold text-foreground">Deployment Guide</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            The WhatsApp backend requires a persistent server. Deploy to Railway or Render.
          </p>
          <div className="space-y-2 text-xs text-muted-foreground">
            {[
              "1. Push your backend to GitHub",
              "2. Create a new project on Railway.app",
              "3. Set environment variables: PORT, DASHBOARD_PIN, JWT_SECRET",
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
      const list: WaSession[] = Array.isArray(data) ? data : (data.sessions ?? []);
      if (list.length > 0) setSession(list[0]);
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

  // Fetch chat list when connected
  const fetchChats = useCallback(async () => {
    if (!backendUrl || !session || session.status !== "connected") return;
    setLoadingChats(true);
    try {
      const res = await fetch(
        `${backendUrl}/api/sessions/${session.id}/chats`,
        { signal: AbortSignal.timeout(8000), headers: authHeaders() }
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
        { signal: AbortSignal.timeout(8000), headers: authHeaders() }
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
        headers: { "Content-Type": "application/json", ...authHeaders() },
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
          <SettingsPanel
            backendUrl={backendUrl}
            sessionId={session?.id}
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
