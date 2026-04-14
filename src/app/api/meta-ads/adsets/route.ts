import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

interface ActionItem {
  action_type: string;
  value: string;
}

interface ActionValueItem {
  action_type: string;
  value: string;
}

function extractAction(actions: ActionItem[] | undefined, type: string): number {
  if (!actions) return 0;
  const item = actions.find((a) => a.action_type === type);
  return item ? parseInt(item.value) || 0 : 0;
}

function extractActionValue(values: ActionValueItem[] | undefined, type: string): number {
  if (!values) return 0;
  const item = values.find((a) => a.action_type === type);
  return item ? parseFloat(item.value) || 0 : 0;
}

function getAccountConfig(account: string | null) {
  if (account === "bv") {
    return {
      token: process.env.META_BV_USER_ACCESS_TOKEN,
      adAccountId: process.env.META_BV_AD_ACCOUNT_ID,
    };
  }
  return {
    token: process.env.META_USER_ACCESS_TOKEN,
    adAccountId: process.env.META_AD_ACCOUNT_ID,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const { token, adAccountId } = getAccountConfig(searchParams.get("account"));

  if (!token || !adAccountId) {
    return NextResponse.json({ error: "Meta Ads not configured" }, { status: 503 });
  }

  try {
    const campaignId = searchParams.get("campaign_id");
    const dateFrom = searchParams.get("date_from") || getDefaultDateFrom();
    const dateTo = searchParams.get("date_to") || getDefaultDateTo();

    if (!campaignId) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    // Fetch ad sets for the campaign
    const adsetsRes = await fetch(
      `${GRAPH_BASE}/${campaignId}/adsets?fields=id,name,status,daily_budget&limit=50&access_token=${token}`
    );

    if (!adsetsRes.ok) {
      const err = await adsetsRes.json();
      return NextResponse.json({ error: err.error?.message || "Failed to fetch ad sets" }, { status: adsetsRes.status });
    }

    const adsetsData = await adsetsRes.json();

    // Fetch insights at ad set level
    const insightsRes = await fetch(
      `${GRAPH_BASE}/${adAccountId}/insights?level=adset&filtering=[{"field":"campaign.id","operator":"EQUAL","value":"${campaignId}"}]&fields=adset_id,adset_name,impressions,cpm,cpc,ctr,clicks,actions,action_values,spend&time_range={"since":"${dateFrom}","until":"${dateTo}"}&limit=100&access_token=${token}`
    );

    const insightsData = insightsRes.ok ? await insightsRes.json() : { data: [] };
    const insightsMap = new Map<string, Record<string, unknown>>();
    for (const insight of insightsData.data || []) {
      insightsMap.set(insight.adset_id, insight);
    }

    const adsets = (adsetsData.data || []).map((adset: Record<string, unknown>) => {
      const insight = insightsMap.get(adset.id as string) || {};
      const actions = insight.actions as ActionItem[] | undefined;
      const actionValues = insight.action_values as ActionValueItem[] | undefined;
      const spend = parseFloat((insight.spend as string) || "0");

      const purchases = extractAction(actions, "purchase") || extractAction(actions, "offsite_conversion.fb_pixel_purchase");
      const purchaseValue = extractActionValue(actionValues, "purchase") || extractActionValue(actionValues, "offsite_conversion.fb_pixel_purchase");
      const atc = extractAction(actions, "add_to_cart") || extractAction(actions, "offsite_conversion.fb_pixel_add_to_cart");
      const checkout = extractAction(actions, "initiate_checkout") || extractAction(actions, "offsite_conversion.fb_pixel_initiate_checkout");

      return {
        id: adset.id,
        name: adset.name,
        status: adset.status,
        impressions: parseInt((insight.impressions as string) || "0"),
        cpm: parseFloat((insight.cpm as string) || "0"),
        cpc: parseFloat((insight.cpc as string) || "0"),
        ctr: parseFloat((insight.ctr as string) || "0"),
        clicks: parseInt((insight.clicks as string) || "0"),
        atc,
        checkout,
        purchases,
        roas: spend > 0 ? purchaseValue / spend : 0,
        spend,
      };
    });

    return NextResponse.json({ adsets });
  } catch {
    return NextResponse.json({ error: "Failed to fetch ad set data" }, { status: 500 });
  }
}

function getDefaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split("T")[0];
}
