"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Megaphone,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Eye,
  ShoppingCart,
  TrendingUp,
  ArrowLeft,
  CalendarDays,
} from "lucide-react";

// --------------- Types ---------------

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  impressions: number;
  cpm: number;
  cpc: number;
  ctr: number;
  clicks: number;
  atc: number;
  checkout: number;
  purchases: number;
  roas: number;
  spend: number;
}

interface AdSet {
  id: string;
  name: string;
  status: string;
  impressions: number;
  cpm: number;
  cpc: number;
  ctr: number;
  clicks: number;
  atc: number;
  checkout: number;
  purchases: number;
  roas: number;
  spend: number;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  impressions: number;
  cpm: number;
  cpc: number;
  ctr: number;
  clicks: number;
  atc: number;
  checkout: number;
  purchases: number;
  roas: number;
  spend: number;
}

type DrillLevel = "campaigns" | "adsets" | "ads";
type MetricsRow = Campaign | AdSet | Ad;

interface AccountState {
  level: DrillLevel;
  campaigns: Campaign[];
  adsets: AdSet[];
  ads: Ad[];
  loading: boolean;
  error: string | null;
  selectedCampaign: { id: string; name: string } | null;
  selectedAdset: { id: string; name: string } | null;
}

// --------------- Helpers ---------------

function formatMoney(val: number): string {
  return `RM ${val.toFixed(2)}`;
}

function formatNum(val: number): string {
  return val.toLocaleString();
}

function statusBadge(status: string) {
  const s = status?.toUpperCase();
  const color =
    s === "ACTIVE"
      ? "bg-emerald-500/20 text-emerald-400"
      : s === "PAUSED"
        ? "bg-yellow-500/20 text-yellow-400"
        : "bg-zinc-500/20 text-zinc-400";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {s || "—"}
    </span>
  );
}

function getDefaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split("T")[0];
}

function calcTotals(data: MetricsRow[]) {
  const totalSpend = data.reduce((s, r) => s + r.spend, 0);
  const totalPurchases = data.reduce((s, r) => s + r.purchases, 0);
  const totalImpressions = data.reduce((s, r) => s + r.impressions, 0);
  const avgCpm = data.length > 0 ? data.reduce((s, r) => s + r.cpm, 0) / data.length : 0;
  const overallRoas = totalSpend > 0
    ? data.reduce((s, r) => s + r.roas * r.spend, 0) / totalSpend
    : 0;
  return { totalSpend, totalPurchases, totalImpressions, avgCpm, overallRoas };
}

const INITIAL_STATE: AccountState = {
  level: "campaigns",
  campaigns: [],
  adsets: [],
  ads: [],
  loading: false,
  error: null,
  selectedCampaign: null,
  selectedAdset: null,
};

// --------------- Date Presets ---------------

interface DatePreset {
  label: string;
  getRange: () => { from: string; to: string };
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Mon start
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

const DATE_PRESETS: DatePreset[] = [
  {
    label: "Today",
    getRange: () => {
      const t = toISO(new Date());
      return { from: t, to: t };
    },
  },
  {
    label: "Yesterday",
    getRange: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const y = toISO(d);
      return { from: y, to: y };
    },
  },
  {
    label: "Last 7 days",
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 6);
      return { from: toISO(from), to: toISO(to) };
    },
  },
  {
    label: "Last 14 days",
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 13);
      return { from: toISO(from), to: toISO(to) };
    },
  },
  {
    label: "Last 28 days",
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 27);
      return { from: toISO(from), to: toISO(to) };
    },
  },
  {
    label: "Last 30 days",
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 29);
      return { from: toISO(from), to: toISO(to) };
    },
  },
  {
    label: "This week",
    getRange: () => {
      const now = new Date();
      return { from: toISO(startOfWeek(now)), to: toISO(now) };
    },
  },
  {
    label: "Last week",
    getRange: () => {
      const now = new Date();
      const thisWeekStart = startOfWeek(now);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      const lastWeekStart = startOfWeek(lastWeekEnd);
      return { from: toISO(lastWeekStart), to: toISO(lastWeekEnd) };
    },
  },
  {
    label: "This month",
    getRange: () => {
      const now = new Date();
      return {
        from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toISO(now),
      };
    },
  },
  {
    label: "Last month",
    getRange: () => {
      const now = new Date();
      const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthEnd = new Date(firstThisMonth);
      lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);
      const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
      return { from: toISO(lastMonthStart), to: toISO(lastMonthEnd) };
    },
  },
];

// --------------- Calendar Grid ---------------

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarMonth({
  year,
  month,
  onPrev,
  onNext,
  selectedFrom,
  selectedTo,
  onSelectDate,
}: {
  year: number;
  month: number;
  onPrev?: () => void;
  onNext?: () => void;
  selectedFrom: string;
  selectedTo: string;
  onSelectDate: (d: string) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toISO(new Date());
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return (
    <div className="w-[280px]">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        {onPrev ? (
          <button onClick={onPrev} className="p-1 rounded hover:bg-[#1E1E1E] text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : <div className="w-6" />}
        <span className="text-sm font-semibold">
          {MONTH_NAMES[month]} {year}
        </span>
        {onNext ? (
          <button onClick={onNext} className="p-1 rounded hover:bg-[#1E1E1E] text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : <div className="w-6" />}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      {weeks.map((w, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {w.map((day, di) => {
            if (day === null) return <div key={di} className="h-8" />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedFrom || dateStr === selectedTo;
            const isInRange =
              selectedFrom && selectedTo && dateStr >= selectedFrom && dateStr <= selectedTo;

            return (
              <button
                key={di}
                onClick={() => onSelectDate(dateStr)}
                className={`h-8 w-full text-xs font-medium rounded transition-colors ${
                  isSelected
                    ? "bg-violet-600 text-white"
                    : isInRange
                    ? "bg-violet-600/20 text-violet-300"
                    : isToday
                    ? "bg-[#1E1E1E] text-foreground font-bold"
                    : "text-foreground hover:bg-[#1E1E1E]"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// --------------- Date Range Picker ---------------

function DateRangePicker({
  dateFrom,
  dateTo,
  onApply,
}: {
  dateFrom: string;
  dateTo: string;
  onApply: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState(dateFrom);
  const [tempTo, setTempTo] = useState(dateTo);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Dual calendar months
  const now = new Date();
  const [leftYear, setLeftYear] = useState(now.getFullYear());
  const [leftMonth, setLeftMonth] = useState(now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1);

  // Right calendar is always leftMonth + 1
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;

  // Outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Sync when props change
  useEffect(() => {
    setTempFrom(dateFrom);
    setTempTo(dateTo);
  }, [dateFrom, dateTo]);

  function handlePreset(preset: DatePreset) {
    const { from, to } = preset.getRange();
    setTempFrom(from);
    setTempTo(to);
    setActivePreset(preset.label);
    setSelectingEnd(false);
  }

  function handleDateSelect(dateStr: string) {
    setActivePreset(null);
    if (!selectingEnd) {
      setTempFrom(dateStr);
      setTempTo(dateStr);
      setSelectingEnd(true);
    } else {
      if (dateStr < tempFrom) {
        setTempFrom(dateStr);
        setTempTo(tempFrom);
      } else {
        setTempTo(dateStr);
      }
      setSelectingEnd(false);
    }
  }

  function handleUpdate() {
    onApply(tempFrom, tempTo);
    setOpen(false);
  }

  function handleCancel() {
    setTempFrom(dateFrom);
    setTempTo(dateTo);
    setOpen(false);
  }

  // Display label
  const formatDisplay = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const displayLabel = `${formatDisplay(dateFrom)} – ${formatDisplay(dateTo)}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-foreground hover:bg-[#1A1A1A] transition-colors"
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span>{displayLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl shadow-black/50">
          <div className="flex">
            {/* Presets sidebar */}
            <div className="w-44 border-r border-[#1E1E1E] p-3 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                Presets
              </p>
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset)}
                  className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    activePreset === preset.label
                      ? "bg-violet-600/20 text-violet-300 font-medium"
                      : "text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendars + footer */}
            <div className="p-4">
              <div className="flex gap-6">
                <CalendarMonth
                  year={leftYear}
                  month={leftMonth}
                  onPrev={() => {
                    if (leftMonth === 0) { setLeftYear(leftYear - 1); setLeftMonth(11); }
                    else setLeftMonth(leftMonth - 1);
                  }}
                  selectedFrom={tempFrom}
                  selectedTo={tempTo}
                  onSelectDate={handleDateSelect}
                />
                <CalendarMonth
                  year={rightYear}
                  month={rightMonth}
                  onNext={() => {
                    if (leftMonth === 11) { setLeftYear(leftYear + 1); setLeftMonth(0); }
                    else setLeftMonth(leftMonth + 1);
                  }}
                  selectedFrom={tempFrom}
                  selectedTo={tempTo}
                  onSelectDate={handleDateSelect}
                />
              </div>

              {/* Selected range display */}
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="rounded-md bg-[#0A0A0A] border border-[#1E1E1E] px-3 py-1.5 font-mono text-foreground">
                  {formatDisplay(tempFrom)}
                </span>
                <span>→</span>
                <span className="rounded-md bg-[#0A0A0A] border border-[#1E1E1E] px-3 py-1.5 font-mono text-foreground">
                  {formatDisplay(tempTo)}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-between border-t border-[#1E1E1E] pt-4">
                <p className="text-[10px] text-muted-foreground">
                  Dates are in Malaysia Time (GMT+8)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="rounded-lg border border-[#1E1E1E] px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------- Component ---------------

export default function MetaAdsPage() {
  const [flogen, setFlogen] = useState<AccountState>({ ...INITIAL_STATE });
  const [bv, setBv] = useState<AccountState>({ ...INITIAL_STATE });

  // Date range (shared)
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState(getDefaultDateTo());

  // Fetch campaigns for an account
  const fetchCampaigns = useCallback(async (account: "flogen" | "bv", setter: React.Dispatch<React.SetStateAction<AccountState>>) => {
    setter((s) => ({ ...s, loading: true, error: null }));
    try {
      const acctParam = account === "bv" ? "&account=bv" : "";
      const res = await fetch(`/api/meta-ads/campaigns?date_from=${dateFrom}&date_to=${dateTo}${acctParam}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch campaigns");
      setter((s) => ({ ...s, campaigns: data.campaigns || [], loading: false }));
    } catch (e) {
      setter((s) => ({ ...s, error: (e as Error).message, loading: false }));
    }
  }, [dateFrom, dateTo]);

  const fetchAdsets = useCallback(async (account: "flogen" | "bv", campaignId: string, setter: React.Dispatch<React.SetStateAction<AccountState>>) => {
    setter((s) => ({ ...s, loading: true, error: null }));
    try {
      const acctParam = account === "bv" ? "&account=bv" : "";
      const res = await fetch(`/api/meta-ads/adsets?campaign_id=${campaignId}&date_from=${dateFrom}&date_to=${dateTo}${acctParam}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch ad sets");
      setter((s) => ({ ...s, adsets: data.adsets || [], loading: false }));
    } catch (e) {
      setter((s) => ({ ...s, error: (e as Error).message, loading: false }));
    }
  }, [dateFrom, dateTo]);

  const fetchAds = useCallback(async (account: "flogen" | "bv", adsetId: string, setter: React.Dispatch<React.SetStateAction<AccountState>>) => {
    setter((s) => ({ ...s, loading: true, error: null }));
    try {
      const acctParam = account === "bv" ? "&account=bv" : "";
      const res = await fetch(`/api/meta-ads/ads?adset_id=${adsetId}&date_from=${dateFrom}&date_to=${dateTo}${acctParam}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch ads");
      setter((s) => ({ ...s, ads: data.ads || [], loading: false }));
    } catch (e) {
      setter((s) => ({ ...s, error: (e as Error).message, loading: false }));
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    // Reset to campaigns level whenever dates change, then refetch
    setFlogen((s) => ({ ...INITIAL_STATE, loading: s.loading }));
    setBv((s) => ({ ...INITIAL_STATE, loading: s.loading }));
    fetchCampaigns("flogen", setFlogen);
    fetchCampaigns("bv", setBv);
  }, [fetchCampaigns]);

  function refreshAll() {
    setFlogen({ ...INITIAL_STATE });
    setBv({ ...INITIAL_STATE });
    fetchCampaigns("flogen", setFlogen);
    fetchCampaigns("bv", setBv);
  }

  // Combined totals
  const flogenData = flogen.level === "campaigns" ? flogen.campaigns : flogen.level === "adsets" ? flogen.adsets : flogen.ads;
  const bvData = bv.level === "campaigns" ? bv.campaigns : bv.level === "adsets" ? bv.adsets : bv.ads;
  const combinedSpend = flogen.campaigns.reduce((s, r) => s + r.spend, 0) + bv.campaigns.reduce((s, r) => s + r.spend, 0);
  const combinedPurchases = flogen.campaigns.reduce((s, r) => s + r.purchases, 0) + bv.campaigns.reduce((s, r) => s + r.purchases, 0);
  const combinedImpressions = flogen.campaigns.reduce((s, r) => s + r.impressions, 0) + bv.campaigns.reduce((s, r) => s + r.impressions, 0);

  return (
    <PageWrapper title="Meta Ads">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
              <Megaphone className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Meta Ads</h1>
              <p className="text-sm text-muted-foreground">Multi-account campaign tracking</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onApply={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
            />
            <button
              onClick={refreshAll}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${flogen.loading || bv.loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Combined Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total Ad Spend (All Accounts)
            </div>
            <p className="mt-2 text-3xl font-bold font-mono">{formatMoney(combinedSpend)}</p>
          </div>
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="h-4 w-4" />
              Total Purchases
            </div>
            <p className="mt-2 text-3xl font-bold font-mono">{formatNum(combinedPurchases)}</p>
          </div>
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Total Impressions
            </div>
            <p className="mt-2 text-3xl font-bold font-mono">{formatNum(combinedImpressions)}</p>
          </div>
        </div>

        {/* Flogen AI Section */}
        <AccountSection
          title="Flogen AI"
          accent="violet"
          account="flogen"
          state={flogen}
          setState={setFlogen}
          currentData={flogenData}
          fetchAdsets={(cid) => fetchAdsets("flogen", cid, setFlogen)}
          fetchAds={(aid) => fetchAds("flogen", aid, setFlogen)}
          fetchCampaigns={() => fetchCampaigns("flogen", setFlogen)}
        />

        {/* Bundle Vaults Section */}
        <AccountSection
          title="Bundle Vaults"
          accent="amber"
          account="bv"
          state={bv}
          setState={setBv}
          currentData={bvData}
          fetchAdsets={(cid) => fetchAdsets("bv", cid, setBv)}
          fetchAds={(aid) => fetchAds("bv", aid, setBv)}
          fetchCampaigns={() => fetchCampaigns("bv", setBv)}
        />
      </div>
    </PageWrapper>
  );
}

// --------------- Account Section ---------------

function AccountSection({
  title,
  accent,
  state,
  setState,
  currentData,
  fetchAdsets,
  fetchAds,
  fetchCampaigns,
}: {
  title: string;
  accent: "violet" | "amber";
  account: string;
  state: AccountState;
  setState: React.Dispatch<React.SetStateAction<AccountState>>;
  currentData: MetricsRow[];
  fetchAdsets: (campaignId: string) => void;
  fetchAds: (adsetId: string) => void;
  fetchCampaigns: () => void;
}) {
  const accentColors = accent === "violet"
    ? { bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/30" }
    : { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" };

  const totals = calcTotals(currentData);

  function drillIntoCampaign(campaign: Campaign) {
    setState((s) => ({
      ...s,
      level: "adsets",
      selectedCampaign: { id: campaign.id, name: campaign.name },
    }));
    fetchAdsets(campaign.id);
  }

  function drillIntoAdset(adset: AdSet) {
    setState((s) => ({
      ...s,
      level: "ads",
      selectedAdset: { id: adset.id, name: adset.name },
    }));
    fetchAds(adset.id);
  }

  function goBack() {
    if (state.level === "ads") {
      setState((s) => ({ ...s, level: "adsets", selectedAdset: null }));
    } else if (state.level === "adsets") {
      setState((s) => ({ ...s, level: "campaigns", selectedCampaign: null }));
    }
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentColors.bg}`}>
            <Megaphone className={`h-4 w-4 ${accentColors.text}`} />
          </div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {state.level !== "campaigns" && (
          <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      {state.level !== "campaigns" && (
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => { setState((s) => ({ ...s, level: "campaigns", selectedCampaign: null, selectedAdset: null })); fetchCampaigns(); }} className={`${accentColors.text} hover:opacity-80 transition-opacity`}>
            Campaigns
          </button>
          {state.selectedCampaign && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={() => { if (state.level === "ads") goBack(); }}
                className={state.level === "ads" ? `${accentColors.text} hover:opacity-80 transition-opacity` : "text-foreground"}
              >
                {state.selectedCampaign.name}
              </button>
            </>
          )}
          {state.selectedAdset && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{state.selectedAdset.name}</span>
            </>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            Spend
          </div>
          <p className="mt-1 text-xl font-bold font-mono">{formatMoney(totals.totalSpend)}</p>
        </div>
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            ROAS
          </div>
          <p className="mt-1 text-xl font-bold font-mono">{totals.overallRoas.toFixed(2)}x</p>
        </div>
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShoppingCart className="h-3.5 w-3.5" />
            Purchases
          </div>
          <p className="mt-1 text-xl font-bold font-mono">{formatNum(totals.totalPurchases)}</p>
        </div>
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            Impressions
          </div>
          <p className="mt-1 text-xl font-bold font-mono">{formatNum(totals.totalImpressions)}</p>
        </div>
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            Avg CPM
          </div>
          <p className="mt-1 text-xl font-bold font-mono">{formatMoney(totals.avgCpm)}</p>
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {/* Table */}
      <div className={`rounded-xl border ${accentColors.border} bg-[#111111] overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E1E1E] text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Impressions</th>
                <th className="px-4 py-3 font-medium text-right">CPM</th>
                <th className="px-4 py-3 font-medium text-right">CPC</th>
                <th className="px-4 py-3 font-medium text-right">CTR</th>
                <th className="px-4 py-3 font-medium text-right">Clicks</th>
                <th className="px-4 py-3 font-medium text-right">ATC</th>
                <th className="px-4 py-3 font-medium text-right">Checkout</th>
                <th className="px-4 py-3 font-medium text-right">Purchases</th>
                <th className="px-4 py-3 font-medium text-right">ROAS</th>
                <th className="px-4 py-3 font-medium text-right">Spend</th>
              </tr>
            </thead>
            <tbody>
              {state.loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                    No data found for this date range
                  </td>
                </tr>
              ) : (
                currentData.map((row) => {
                  const clickable = state.level !== "ads";
                  return (
                    <tr
                      key={row.id}
                      onClick={() => {
                        if (state.level === "campaigns") drillIntoCampaign(row as Campaign);
                        else if (state.level === "adsets") drillIntoAdset(row as AdSet);
                      }}
                      className={`border-b border-[#1E1E1E] transition-colors ${
                        clickable ? "cursor-pointer hover:bg-[#1A1A1A]" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium max-w-[240px] truncate">
                        <div className="flex items-center gap-2">
                          {row.name}
                          {clickable && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">{statusBadge(row.status)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(row.impressions)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(row.cpm)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(row.cpc)}</td>
                      <td className="px-4 py-3 text-right font-mono">{row.ctr.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(row.clicks)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(row.atc)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(row.checkout)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(row.purchases)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={row.roas >= 1 ? "text-emerald-400" : row.roas > 0 ? "text-yellow-400" : ""}>
                          {row.roas.toFixed(2)}x
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(row.spend)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
