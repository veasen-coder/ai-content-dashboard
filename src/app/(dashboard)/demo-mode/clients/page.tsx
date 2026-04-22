"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useDemoModeStore } from "@/store/demo-mode-store";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";
type Status = "Active" | "VIP" | "New" | "Inactive";

interface Client {
  name: string;
  phone: string;
  email: string;
  lastVisit: string;
  totalSpent: number;
  visits: number;
  tier: Tier;
  status: Status;
}

const CLIENTS: Client[] = [
  { name: "Ahmad Rahman", phone: "+60 12-345-6789", email: "ahmad.r@gmail.com", lastVisit: "21 Apr 2026", totalSpent: 4850, visits: 18, tier: "Gold", status: "VIP" },
  { name: "Siti Nurhaliza", phone: "+60 19-876-5432", email: "siti.n@outlook.com", lastVisit: "19 Apr 2026", totalSpent: 2340, visits: 9, tier: "Silver", status: "Active" },
  { name: "Raj Kumar", phone: "+60 16-234-5678", email: "raj.kumar@gmail.com", lastVisit: "22 Apr 2026", totalSpent: 12400, visits: 42, tier: "Platinum", status: "VIP" },
  { name: "Mei Ling Tan", phone: "+60 17-345-9876", email: "meiling@yahoo.com", lastVisit: "15 Apr 2026", totalSpent: 680, visits: 4, tier: "Bronze", status: "Active" },
  { name: "Farah Aziz", phone: "+60 11-987-6543", email: "farah.a@gmail.com", lastVisit: "18 Apr 2026", totalSpent: 3250, visits: 11, tier: "Silver", status: "Active" },
  { name: "Hafiz Ibrahim", phone: "+60 13-456-7890", email: "hafiz.i@hotmail.com", lastVisit: "10 Apr 2026", totalSpent: 1890, visits: 7, tier: "Bronze", status: "Active" },
  { name: "Priya Sharma", phone: "+60 14-567-8901", email: "priya.s@gmail.com", lastVisit: "20 Apr 2026", totalSpent: 5670, visits: 21, tier: "Gold", status: "VIP" },
  { name: "Daniel Wong", phone: "+60 15-678-9012", email: "dwong@gmail.com", lastVisit: "05 Apr 2026", totalSpent: 890, visits: 3, tier: "Bronze", status: "New" },
  { name: "Zara Mohamed", phone: "+60 18-789-0123", email: "zara.m@outlook.com", lastVisit: "17 Apr 2026", totalSpent: 4100, visits: 15, tier: "Gold", status: "Active" },
  { name: "Kevin Lee", phone: "+60 12-890-1234", email: "kevin.lee@gmail.com", lastVisit: "22 Apr 2026", totalSpent: 8900, visits: 32, tier: "Platinum", status: "VIP" },
  { name: "Nur Aisyah", phone: "+60 19-901-2345", email: "aisyah@yahoo.com", lastVisit: "08 Apr 2026", totalSpent: 1450, visits: 6, tier: "Bronze", status: "Active" },
  { name: "Suresh Nair", phone: "+60 16-012-3456", email: "suresh.n@gmail.com", lastVisit: "15 Mar 2026", totalSpent: 2200, visits: 8, tier: "Silver", status: "Inactive" },
  { name: "Chloe Lim", phone: "+60 17-123-4567", email: "chloe.lim@gmail.com", lastVisit: "21 Apr 2026", totalSpent: 3780, visits: 13, tier: "Silver", status: "Active" },
  { name: "Faisal Omar", phone: "+60 11-234-5678", email: "faisal.o@outlook.com", lastVisit: "19 Apr 2026", totalSpent: 6120, visits: 22, tier: "Gold", status: "VIP" },
  { name: "Jessica Teo", phone: "+60 13-345-6789", email: "j.teo@gmail.com", lastVisit: "12 Apr 2026", totalSpent: 940, visits: 4, tier: "Bronze", status: "New" },
  { name: "Arjun Patel", phone: "+60 14-456-7890", email: "arjun.p@hotmail.com", lastVisit: "16 Apr 2026", totalSpent: 2980, visits: 10, tier: "Silver", status: "Active" },
  { name: "Aminah Yusoff", phone: "+60 15-567-8901", email: "aminah.y@gmail.com", lastVisit: "02 Apr 2026", totalSpent: 540, visits: 2, tier: "Bronze", status: "New" },
  { name: "Vincent Ho", phone: "+60 18-678-9012", email: "vincent.h@yahoo.com", lastVisit: "20 Apr 2026", totalSpent: 7340, visits: 26, tier: "Platinum", status: "VIP" },
];

const TIER_STYLE: Record<Tier, string> = {
  Bronze: "bg-amber-700/20 text-amber-600 border-amber-700/40",
  Silver: "bg-slate-400/20 text-slate-400 border-slate-400/40",
  Gold: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  Platinum: "bg-primary/20 text-primary border-primary/40",
};

const STATUS_STYLE: Record<Status, string> = {
  Active: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
  VIP: "bg-primary/15 text-primary border-primary/30",
  New: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Inactive: "bg-muted text-muted-foreground border-border",
};

const FILTERS = ["All", "VIP", "Inactive", "New This Month"] as const;

export default function DemoClientsPage() {
  const { demoClientName } = useDemoModeStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = CLIENTS.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "All") return true;
    if (filter === "VIP") return c.status === "VIP";
    if (filter === "Inactive") return c.status === "Inactive";
    if (filter === "New This Month") return c.status === "New";
    return true;
  });

  return (
    <PageWrapper title="Client List">
      <div className="space-y-4">
        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-gradient-to-r from-primary/10 via-card to-card p-4">
          <div>
            <div className="font-mono text-lg font-bold">847</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Total Clients
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="font-mono text-lg font-bold text-[#10B981]">
              234
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Active This Month
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="font-mono text-lg font-bold">RM 127</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Avg Spend
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="flex items-center gap-1 font-mono text-lg font-bold text-primary">
              <Crown className="h-4 w-4" /> 42
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              VIP Members
            </div>
          </div>
          <button className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        </div>

        {/* Filters + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-xs focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_0.8fr_0.8fr_24px] gap-4">
              <div>Name</div>
              <div>Phone</div>
              <div>Last Visit</div>
              <div className="text-right">Total Spent</div>
              <div>Loyalty</div>
              <div>Status</div>
              <div />
            </div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((c) => {
              const isExpanded = expanded === c.phone;
              return (
                <div key={c.phone}>
                  <button
                    onClick={() =>
                      setExpanded(isExpanded ? null : c.phone)
                    }
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_0.8fr_0.8fr_24px] items-center gap-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          {c.name.charAt(0)}
                        </div>
                        <span className="truncate text-sm font-medium">
                          {c.name}
                        </span>
                      </div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {c.phone}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.lastVisit}
                      </div>
                      <div className="text-right font-mono text-sm font-semibold">
                        RM {c.totalSpent.toLocaleString()}
                      </div>
                      <div>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            TIER_STYLE[c.tier]
                          )}
                        >
                          {c.tier}
                        </span>
                      </div>
                      <div>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            STATUS_STYLE[c.status]
                          )}
                        >
                          {c.status}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border/50 bg-muted/20 px-4 py-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Email
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate">{c.email}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Total Visits
                          </div>
                          <div className="mt-1 font-mono text-sm font-semibold">
                            {c.visits} visits
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Avg per visit
                          </div>
                          <div className="mt-1 font-mono text-sm font-semibold">
                            RM {Math.round(c.totalSpent / c.visits)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-muted">
                            <Phone className="h-3 w-3" />
                            Call
                          </button>
                          <button className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-muted">
                            <MessageCircle className="h-3 w-3" />
                            Chat
                          </button>
                          <button className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary/90">
                            View Profile
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] text-muted-foreground">
                        Client of{" "}
                        <span className="text-foreground">
                          {demoClientName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No clients match your filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
