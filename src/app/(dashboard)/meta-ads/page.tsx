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

// --------------- Component ---------------

export default function MetaAdsPage() {
  const [level, setLevel] = useState<DrillLevel>("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adsets, setAdsets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Breadcrumb state
  const [selectedCampaign, setSelectedCampaign] = useState<{ id: string; name: string } | null>(null);
  const [selectedAdset, setSelectedAdset] = useState<{ id: string; name: string } | null>(null);

  // Date range
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState(getDefaultDateTo());

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta-ads/campaigns?date_from=${dateFrom}&date_to=${dateTo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch campaigns");
      setCampaigns(data.campaigns || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const fetchAdsets = useCallback(async (campaignId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta-ads/adsets?campaign_id=${campaignId}&date_from=${dateFrom}&date_to=${dateTo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch ad sets");
      setAdsets(data.adsets || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const fetchAds = useCallback(async (adsetId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta-ads/ads?adset_id=${adsetId}&date_from=${dateFrom}&date_to=${dateTo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch ads");
      setAds(data.ads || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Drill handlers
  function drillIntoCampaign(campaign: Campaign) {
    setSelectedCampaign({ id: campaign.id, name: campaign.name });
    setLevel("adsets");
    fetchAdsets(campaign.id);
  }

  function drillIntoAdset(adset: AdSet) {
    setSelectedAdset({ id: adset.id, name: adset.name });
    setLevel("ads");
    fetchAds(adset.id);
  }

  function goBack() {
    if (level === "ads") {
      setLevel("adsets");
      setSelectedAdset(null);
    } else if (level === "adsets") {
      setLevel("campaigns");
      setSelectedCampaign(null);
    }
  }

  // Summary calculations
  const currentData = level === "campaigns" ? campaigns : level === "adsets" ? adsets : ads;
  const totalSpend = currentData.reduce((s, r) => s + r.spend, 0);
  const totalPurchases = currentData.reduce((s, r) => s + r.purchases, 0);
  const totalImpressions = currentData.reduce((s, r) => s + r.impressions, 0);
  const avgCpm = currentData.length > 0 ? currentData.reduce((s, r) => s + r.cpm, 0) / currentData.length : 0;
  const overallRoas = totalSpend > 0
    ? currentData.reduce((s, r) => s + r.roas * r.spend, 0) / totalSpend
    : 0;

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
              <p className="text-sm text-muted-foreground">Campaign performance tracking</p>
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
              onClick={() => {
                if (level === "campaigns") fetchCampaigns();
                else if (level === "adsets" && selectedCampaign) fetchAdsets(selectedCampaign.id);
                else if (level === "ads" && selectedAdset) fetchAds(selectedAdset.id);
              }}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        {level !== "campaigns" && (
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => { setLevel("campaigns"); setSelectedCampaign(null); setSelectedAdset(null); }} className="text-violet-400 hover:text-violet-300 transition-colors">
              Campaigns
            </button>
            {selectedCampaign && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <button
                  onClick={() => { if (level === "ads") goBack(); }}
                  className={level === "ads" ? "text-violet-400 hover:text-violet-300 transition-colors" : "text-foreground"}
                >
                  {selectedCampaign.name}
                </button>
              </>
            )}
            {selectedAdset && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{selectedAdset.name}</span>
              </>
            )}
          </div>
        )}

        {/* Back button */}
        {level !== "campaigns" && (
          <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total Spend
            </div>
            <p className="mt-1 text-2xl font-bold font-mono">{formatMoney(totalSpend)}</p>
          </div>
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              ROAS
            </div>
            <p className="mt-1 text-2xl font-bold font-mono">{overallRoas.toFixed(2)}x</p>
          </div>
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="h-4 w-4" />
              Purchases
            </div>
            <p className="mt-1 text-2xl font-bold font-mono">{formatNum(totalPurchases)}</p>
          </div>
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Impressions
            </div>
            <p className="mt-1 text-2xl font-bold font-mono">{formatNum(totalImpressions)}</p>
          </div>
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Avg CPM
            </div>
            <p className="mt-1 text-2xl font-bold font-mono">{formatMoney(avgCpm)}</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] overflow-hidden">
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
                {loading ? (
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
                    const clickable = level !== "ads";
                    return (
                      <tr
                        key={row.id}
                        onClick={() => {
                          if (level === "campaigns") drillIntoCampaign(row as Campaign);
                          else if (level === "adsets") drillIntoAdset(row as AdSet);
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
    </PageWrapper>
  );
}
