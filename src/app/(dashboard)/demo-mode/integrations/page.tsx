"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  MessageCircle,
  Calendar,
  MessagesSquare,
  Camera,
  Mail,
  CreditCard,
  ShoppingBag,
  Utensils,
  Store,
  Music,
  FileText,
  Check,
  Settings as SettingsIcon,
  Phone,
  Search,
  Loader2,
  X,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "Connected" | "Available" | "Coming Soon";
type Category =
  | "Messaging"
  | "Payments"
  | "E-commerce"
  | "Calendars"
  | "Accounting";

interface Integration {
  name: string;
  description: string;
  status: Status;
  category: Category;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    name: "WhatsApp Business",
    description: "Auto-reply, bookings & customer chat",
    status: "Connected",
    category: "Messaging",
    icon: MessageCircle,
    color: "text-[#25D366]",
    bg: "bg-[#25D366]/10",
  },
  {
    name: "Google Calendar",
    description: "Sync bookings & team availability",
    status: "Connected",
    category: "Calendars",
    icon: Calendar,
    color: "text-[#4285F4]",
    bg: "bg-[#4285F4]/10",
  },
  {
    name: "Facebook Messenger",
    description: "Capture leads from Facebook page",
    status: "Connected",
    category: "Messaging",
    icon: MessagesSquare,
    color: "text-[#1877F2]",
    bg: "bg-[#1877F2]/10",
  },
  {
    name: "Instagram",
    description: "DM auto-reply & story mentions",
    status: "Connected",
    category: "Messaging",
    icon: Camera,
    color: "text-[#E4405F]",
    bg: "bg-[#E4405F]/10",
  },
  {
    name: "Gmail",
    description: "Email automation & templates",
    status: "Connected",
    category: "Messaging",
    icon: Mail,
    color: "text-[#EA4335]",
    bg: "bg-[#EA4335]/10",
  },
  {
    name: "Stripe",
    description: "Accept card payments online",
    status: "Connected",
    category: "Payments",
    icon: CreditCard,
    color: "text-[#635BFF]",
    bg: "bg-[#635BFF]/10",
  },
  {
    name: "FoodPanda",
    description: "Sync orders & menu automatically",
    status: "Available",
    category: "E-commerce",
    icon: Utensils,
    color: "text-[#E91D63]",
    bg: "bg-[#E91D63]/10",
  },
  {
    name: "GrabFood",
    description: "Connect your Grab merchant account",
    status: "Available",
    category: "E-commerce",
    icon: Utensils,
    color: "text-[#00B14F]",
    bg: "bg-[#00B14F]/10",
  },
  {
    name: "Shopee",
    description: "Sync products & orders",
    status: "Available",
    category: "E-commerce",
    icon: ShoppingBag,
    color: "text-[#EE4D2D]",
    bg: "bg-[#EE4D2D]/10",
  },
  {
    name: "Lazada",
    description: "Multi-marketplace inventory sync",
    status: "Available",
    category: "E-commerce",
    icon: Store,
    color: "text-[#0F146E]",
    bg: "bg-[#0F146E]/20",
  },
  {
    name: "TikTok Shop",
    description: "Stream-to-sale conversion tracking",
    status: "Coming Soon",
    category: "E-commerce",
    icon: Music,
    color: "text-foreground",
    bg: "bg-foreground/10",
  },
  {
    name: "Xero",
    description: "Automated accounting & invoicing",
    status: "Available",
    category: "Accounting",
    icon: FileText,
    color: "text-[#13B5EA]",
    bg: "bg-[#13B5EA]/10",
  },
];

const CATEGORIES = [
  "All",
  "Messaging",
  "Payments",
  "E-commerce",
  "Calendars",
  "Accounting",
] as const;

const TOTAL = 24;

export default function DemoIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [search, setSearch] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [configureOf, setConfigureOf] = useState<Integration | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [settings, setSettings] = useState({
    syncFrequency: "Every 15 min",
    autoReply: true,
    notifications: true,
    twoFactor: false,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfigureOf(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    return integrations.filter((i) => {
      if (cat !== "All" && i.category !== cat) return false;
      if (
        search &&
        !i.name.toLowerCase().includes(search.toLowerCase()) &&
        !i.description.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [integrations, cat, search]);

  const connected = integrations.filter((i) => i.status === "Connected").length;
  const available = integrations.filter((i) => i.status === "Available").length;
  const active = connected + 6; // baseline "active" ties to connected count
  const pct = (active / TOTAL) * 100;

  function handleConnect(i: Integration) {
    setConnecting(i.name);
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((x) => (x.name === i.name ? { ...x, status: "Connected" as Status } : x))
      );
      setConnecting(null);
      toast.success(`${i.name} connected successfully`);
    }, 1500);
  }

  function handleDisconnect(i: Integration) {
    setIntegrations((prev) =>
      prev.map((x) => (x.name === i.name ? { ...x, status: "Available" as Status } : x))
    );
    setConfigureOf(null);
    toast.error(`${i.name} disconnected`);
  }

  return (
    <PageWrapper title="Integrations">
      <div className="space-y-5">
        {/* Progress header */}
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Integration Status
              </h3>
              <div className="mt-1 font-mono text-3xl font-bold">
                {active} <span className="text-muted-foreground">of</span>{" "}
                {TOTAL}
              </div>
              <p className="text-xs text-muted-foreground">
                integrations active — your entire business, connected.
              </p>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <div className="flex items-center gap-1.5 rounded-full bg-[#10B981]/15 px-3 py-1.5">
                <Check className="h-3 w-3 text-[#10B981]" />
                <span className="text-xs font-medium text-[#10B981]">
                  {connected} Connected
                </span>
              </div>
              <div className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary">
                {available} Available
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Category tabs + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                  cat === c
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations..."
              className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-xs focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((i) => {
            const isConnecting = connecting === i.name;
            return (
              <div
                key={i.name}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Status ribbon */}
                {i.status === "Connected" && (
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    Connected
                  </div>
                )}
                {i.status === "Coming Soon" && (
                  <div className="absolute right-3 top-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Coming Soon
                  </div>
                )}

                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    i.bg
                  )}
                >
                  <i.icon className={cn("h-6 w-6", i.color)} />
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-semibold">{i.name}</h4>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {i.description}
                  </p>
                </div>

                <div className="mt-4">
                  {i.status === "Connected" && (
                    <button
                      onClick={() => setConfigureOf(i)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                    >
                      <SettingsIcon className="h-3.5 w-3.5" />
                      Configure
                    </button>
                  )}
                  {i.status === "Available" && (
                    <button
                      onClick={() => handleConnect(i)}
                      disabled={isConnecting}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-primary/20 hover:bg-primary/90 disabled:opacity-70"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        "Connect"
                      )}
                    </button>
                  )}
                  {i.status === "Coming Soon" && (
                    <button
                      onClick={() =>
                        toast.success(`We'll notify you when ${i.name} launches`)
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Notify me
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full p-10 text-center text-sm text-muted-foreground">
              No integrations match &quot;{search}&quot;.
            </div>
          )}
        </div>

        {/* Request card */}
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card p-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">
                Don&apos;t see an integration you need?
              </div>
              <div className="text-xs text-muted-foreground">
                We can build custom integrations for your specific tools.
              </div>
            </div>
          </div>
          <button
            onClick={() =>
              toast.success("Request received — our team will reach out within 24hrs")
            }
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
          >
            Request integration
          </button>
        </div>
      </div>

      {/* Configure modal */}
      {configureOf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setConfigureOf(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    configureOf.bg
                  )}
                >
                  <configureOf.icon className={cn("h-5 w-5", configureOf.color)} />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{configureOf.name}</h3>
                  <div className="flex items-center gap-1 text-[11px] text-[#10B981]">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    Connected · last sync 2 min ago
                  </div>
                </div>
              </div>
              <button
                onClick={() => setConfigureOf(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* API key */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  API Key
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
                    {showKey
                      ? "demo_key_XXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      : "demo_key_••••••••••••••••••••••••••••"}
                  </div>
                  <button
                    onClick={() => setShowKey((s) => !s)}
                    className="rounded-lg border border-border bg-background p-2 hover:bg-muted"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => toast.success("API key copied to clipboard")}
                    className="rounded-lg border border-border bg-background p-2 hover:bg-muted"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Webhook URL
                </label>
                <input
                  readOnly
                  value={`https://flogen.ai/webhook/${configureOf.name.toLowerCase().replace(/\s/g, "-")}`}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                />
              </div>

              {/* Sync frequency */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Sync frequency
                </label>
                <select
                  value={settings.syncFrequency}
                  onChange={(e) =>
                    setSettings({ ...settings, syncFrequency: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option>Real-time</option>
                  <option>Every 5 min</option>
                  <option>Every 15 min</option>
                  <option>Every hour</option>
                  <option>Daily</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-2 rounded-lg border border-border bg-background/50 p-3">
                {[
                  { key: "autoReply" as const, label: "Auto-reply to messages", desc: "Let AI handle incoming messages 24/7" },
                  { key: "notifications" as const, label: "Desktop notifications", desc: "Get notified of new activity" },
                  { key: "twoFactor" as const, label: "Two-factor auth on API", desc: "Require 2FA for API access" },
                ].map((t) => (
                  <div key={t.key} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium">{t.label}</div>
                      <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                    </div>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, [t.key]: !settings[t.key] })
                      }
                      className={cn(
                        "relative h-5 w-9 rounded-full transition-colors",
                        settings[t.key] ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                          settings[t.key] ? "translate-x-4" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => handleDisconnect(configureOf)}
                className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/20"
              >
                Disconnect
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfigureOf(null)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfigureOf(null);
                    toast.success(`${configureOf.name} settings saved`);
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
