"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
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
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
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

const INITIAL_CLIENTS: Client[] = [
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
const TIER_CYCLE: Tier[] = ["Bronze", "Silver", "Gold", "Platinum"];

type SortKey = "name" | "lastVisit" | "totalSpent";
type SortDir = "asc" | "desc";

// "21 Apr 2026" -> Date
function parseDate(s: string): Date {
  const [d, m, y] = s.split(" ");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return new Date(parseInt(y), months.indexOf(m), parseInt(d));
}

function daysSince(s: string): number {
  const now = new Date("2026-04-22");
  return Math.floor((now.getTime() - parseDate(s).getTime()) / (1000 * 60 * 60 * 24));
}

export default function DemoClientsPage() {
  const { demoClientName } = useDemoModeStore();
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    tier: "Bronze" as Tier,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    let list = clients.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(search) ||
        c.email.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (filter === "All") return true;
      if (filter === "VIP") return c.tier === "Gold" || c.tier === "Platinum";
      if (filter === "Inactive") return daysSince(c.lastVisit) > 60 || c.status === "Inactive";
      if (filter === "New This Month") {
        const d = parseDate(c.lastVisit);
        return d.getMonth() === 3 && d.getFullYear() === 2026 && c.status === "New";
      }
      return true;
    });

    if (sortKey) {
      list = [...list].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "name") cmp = a.name.localeCompare(b.name);
        else if (sortKey === "totalSpent") cmp = a.totalSpent - b.totalSpent;
        else if (sortKey === "lastVisit")
          cmp = parseDate(a.lastVisit).getTime() - parseDate(b.lastVisit).getTime();
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return list;
  }, [clients, search, filter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function cycleTier(c: Client, e: React.MouseEvent) {
    e.stopPropagation();
    const idx = TIER_CYCLE.indexOf(c.tier);
    const next = TIER_CYCLE[(idx + 1) % TIER_CYCLE.length];
    setClients((prev) =>
      prev.map((x) => (x.phone === c.phone ? { ...x, tier: next } : x))
    );
    toast.success(`Upgraded ${c.name} to ${next}`);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    const newClient: Client = {
      name: form.name,
      phone: form.phone,
      email: form.email || "—",
      lastVisit: "22 Apr 2026",
      totalSpent: 0,
      visits: 0,
      tier: form.tier,
      status: "New",
    };
    setClients((prev) => [newClient, ...prev]);
    setAddOpen(false);
    setForm({ name: "", phone: "", email: "", tier: "Bronze" });
    toast.success(`Client ${newClient.name} added`);
  }

  function handleExport() {
    if (exporting) return;
    setExporting(true);
    toast(`Exporting ${filtered.length} clients to CSV...`, { icon: "⬇️" });
    setTimeout(() => {
      setExporting(false);
      toast.success("Export complete");
    }, 1100);
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

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
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Client
            </button>
          </div>
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
              placeholder="Search by name, phone, email..."
              className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-xs focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_0.8fr_0.8fr_24px] gap-4">
              <button
                onClick={() => toggleSort("name")}
                className="flex items-center gap-1 hover:text-foreground"
              >
                Name <SortIcon k="name" />
              </button>
              <div>Phone</div>
              <button
                onClick={() => toggleSort("lastVisit")}
                className="flex items-center gap-1 hover:text-foreground"
              >
                Last Visit <SortIcon k="lastVisit" />
              </button>
              <button
                onClick={() => toggleSort("totalSpent")}
                className="flex items-center justify-end gap-1 hover:text-foreground"
              >
                Total Spent <SortIcon k="totalSpent" />
              </button>
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
                          onClick={(e) => cycleTier(c, e)}
                          role="button"
                          className={cn(
                            "cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-medium transition-transform hover:scale-105",
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
                            RM {c.visits > 0 ? Math.round(c.totalSpent / c.visits) : 0}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toast(`Calling ${c.name}...`, { icon: "📞" })}
                            className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-muted"
                          >
                            <Phone className="h-3 w-3" />
                            Call
                          </button>
                          <button
                            onClick={() => toast(`Chat opened with ${c.name}`, { icon: "💬" })}
                            className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-muted"
                          >
                            <MessageCircle className="h-3 w-3" />
                            Chat
                          </button>
                          <button
                            onClick={() => toast.success(`Viewing profile of ${c.name}`)}
                            className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
                          >
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

      {/* Add Client modal */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setAddOpen(false)}
        >
          <form
            onSubmit={handleAdd}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Add Client</h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ahmad Rahman"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Phone *
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+60 12-345-6789"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@email.com"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Initial tier
                </label>
                <select
                  value={form.tier}
                  onChange={(e) => setForm({ ...form, tier: e.target.value as Tier })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {TIER_CYCLE.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
              >
                Add Client
              </button>
            </div>
          </form>
        </div>
      )}
    </PageWrapper>
  );
}
