"use client";

import { useEffect, useState, useCallback } from "react";

export type DatePreset = "today" | "last_7d" | "last_30d" | "this_month" | "custom";

export type Client = {
  id: string;
  name: string;
  state: string;
  stateCode: string;
  avatarUrl: string | null;
  ghlLocationId: string;
  ghlTag: string;
  calendarEnglishId: string;
  calendarSpanishId: string;
  saleValue: number;
  feePerSale: number;
  adAccounts: { id: string; ad_account_id: string; label: string; is_default: boolean }[];
  adAccountId: string;
};

export type MetaMetrics = {
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  linkClicks: number;
  costPerLinkClick: number;
  linkCTR: number;
  leads: number;
  costPerLead: number;
  landingPageViews: number;
  costPerLandingPageView: number;
};

export type MetaSeriesPoint = MetaMetrics & { date: string };

export type ClientMetaResult = {
  name: string;
  state: string;
  adAccountId: string;
  ok: boolean;
  current: MetaMetrics;
  previous: MetaMetrics;
  series: MetaSeriesPoint[];
};

export type GHLCounts = {
  scheduled: number;
  showed: number;
  venta: number;
  pagada: number;
  noshow: number;
  cancelled: number;
  total: number;
};

export type Lead = {
  appointmentId: string;
  contactId: string;
  name: string;
  startTime: string;
  appointmentStatus: string;
  tags: string[];
  status: string;
};

export type GHLSeriesPoint = {
  date: string;
  appointments: number;
  venta: number;
  pagada: number;
  showed: number;
};

export type ClientGHLResult = {
  name: string;
  state: string;
  ok: boolean;
  current: GHLCounts;
  previous: GHLCounts;
  series: GHLSeriesPoint[];
  leads: Lead[];
};

export type MarketData = {
  totals: {
    leads: { english: number; spanish: number; unknown: number };
    appointments: { english: number; spanish: number };
    sales: { english: number; spanish: number };
  };
  clients: any[];
};

export type DashboardData = {
  clients: Client[];
  isAdmin: boolean;
  agency: { activeMetrics: string[]; customMetrics: any[] };
  meta: ClientMetaResult[];
  ghl: ClientGHLResult[];
  market: MarketData | null;
  loading: boolean;
  error: string | null;
  range: { since: string; until: string } | null;
  lastUpdated: number | null;
};

function buildQueryString(preset: DatePreset, since?: string, until?: string) {
  const params = new URLSearchParams();
  if (preset === "custom" && since && until) {
    params.set("since", since);
    params.set("until", until);
  } else {
    params.set("preset", preset);
  }
  return params.toString();
}

export function useDashboardData(preset: DatePreset, since?: string, until?: string, adAccountId?: string) {
  const [data, setData] = useState<DashboardData>({
    clients: [],
    isAdmin: false,
    agency: { activeMetrics: [], customMetrics: [] },
    meta: [],
    ghl: [],
    market: null,
    loading: true,
    error: null,
    range: null,
    lastUpdated: null,
  });

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
     const qs = buildQueryString(preset, since, until);
      const metaQs = adAccountId ? `${qs}&adAccountId=${encodeURIComponent(adAccountId)}` : qs;

      const [clientsRes, metaRes, ghlRes, marketRes] = await Promise.all([
        fetch(`/api/clients`),
        fetch(`/api/meta/timeseries?${metaQs}`),
        fetch(`/api/ghl/timeseries?${qs}`),
        fetch(`/api/ghl/market?${qs}`),
      ]);

      const clientsData = await clientsRes.json();
      const metaData = await metaRes.json();
      const ghlData = await ghlRes.json();
      const marketData = await marketRes.json();

      setData({
        clients: clientsData.clients || [],
        isAdmin: clientsData.isAdmin || false,
        agency: metaData.agency || { activeMetrics: [], customMetrics: [] },
        meta: metaData.clients || [],
        ghl: ghlData.clients || [],
        market: marketData || null,
        loading: false,
        error: null,
        range: metaData.range || null,
        lastUpdated: Date.now(),
      });
    } catch (e) {
      setData({
        clients: [],
        isAdmin: false,
        agency: { activeMetrics: [], customMetrics: [] },
        meta: [],
        ghl: [],
        market: null,
        loading: false,
        error: String(e),
        range: null,
        lastUpdated: null,
      });
    }
  }, [preset, since, until, adAccountId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { ...data, refetch: fetchAll };
}