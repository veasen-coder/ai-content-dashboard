"use client";

import { useState, useEffect, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Megaphone,
  RefreshCw,
  ChevronRight,
  DollarSign,
  Eye,
  ShoppingCart,
  TrendingUp,
  ArrowLeft,
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
            <div className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none"
              />
              <span className="text-muted-foreground">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none"
              />
            </div>
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
