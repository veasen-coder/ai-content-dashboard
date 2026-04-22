"use client";

import { useState } from "react";
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

const INTEGRATIONS: Integration[] = [
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
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");

  const filtered =
    cat === "All"
      ? INTEGRATIONS
      : INTEGRATIONS.filter((i) => i.category === cat);

  const connected = INTEGRATIONS.filter((i) => i.status === "Connected").length;
  const active = 12;
  const pct = (active / TOTAL) * 100;

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
                5 Available
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

        {/* Category tabs */}
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

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((i) => (
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

              {/* Icon */}
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
                  <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted">
                    <SettingsIcon className="h-3.5 w-3.5" />
                    Configure
                  </button>
                )}
                {i.status === "Available" && (
                  <button className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-primary/20 hover:bg-primary/90">
                    Connect
                  </button>
                )}
                {i.status === "Coming Soon" && (
                  <button
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground"
                  >
                    Notify me
                  </button>
                )}
              </div>
            </div>
          ))}
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
          <button className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90">
            Request integration
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
