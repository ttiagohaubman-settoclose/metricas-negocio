import { NextResponse } from "next/server";
import { getActiveClients } from "@/app/lib/clients-server";
import { createClient } from "@supabase/supabase-js";

const META_BASE_URL = "https://graph.facebook.com/v23.0";

// ============================================================
// MAPEO: metric_id (de nuestro catálogo) -> campo de Meta API
// ============================================================
// Cada métrica nuestra se mapea a uno o más campos de la Meta Marketing API.
// `meta_field`: el nombre exacto del campo en la API de Meta
// `action_types`: si es una action, qué tipos sumar
// `transform`: cómo extraer el valor de la respuesta de Meta
type MetaFieldMap = {
  meta_fields: string[];        // campos que hay que pedir a Meta
  extract: (d: any) => number;  // función que extrae el valor del response
};

const METRIC_TO_META: Record<string, MetaFieldMap> = {
  // ============ COSTOS ============
  spend: {
    meta_fields: ["spend"],
    extract: (d) => Number(d.spend || 0),
  },
  cpc: {
    meta_fields: ["cpc"],
    extract: (d) => Number(d.cpc || 0),
  },
  cpm: {
    meta_fields: ["cpm"],
    extract: (d) => Number(d.cpm || 0),
  },
  cpp: {
    meta_fields: ["cpp"],
    extract: (d) => Number(d.cpp || 0),
  },
  costPerLinkClick: {
    meta_fields: ["cost_per_inline_link_click"],
    extract: (d) => Number(d.cost_per_inline_link_click || 0),
  },
  costPerLead: {
    meta_fields: ["cost_per_action_type"],
    extract: (d) => extractCostPerAction(d.cost_per_action_type, ["lead", "offsite_conversion.fb_pixel_lead"]),
  },
  costPerLandingPageView: {
    meta_fields: ["cost_per_action_type"],
    extract: (d) => extractCostPerAction(d.cost_per_action_type, ["landing_page_view"]),
  },
  costPerThruplay: {
    meta_fields: ["cost_per_thruplay"],
    extract: (d) => Number(d.cost_per_thruplay || 0),
  },
  costPerMessagingStart: {
    meta_fields: ["cost_per_action_type"],
    extract: (d) => extractCostPerAction(d.cost_per_action_type, ["onsite_conversion.messaging_conversation_started_7d"]),
  },

  // ============ ALCANCE ============
  impressions: {
    meta_fields: ["impressions"],
    extract: (d) => Number(d.impressions || 0),
  },
  reach: {
    meta_fields: ["reach"],
    extract: (d) => Number(d.reach || 0),
  },
  frequency: {
    meta_fields: ["frequency"],
    extract: (d) => Number(d.frequency || 0),
  },

  // ============ ENGAGEMENT ============
  clicks: {
    meta_fields: ["clicks"],
    extract: (d) => Number(d.clicks || 0),
  },
  linkClicks: {
    meta_fields: ["inline_link_clicks"],
    extract: (d) => Number(d.inline_link_clicks || 0),
  },
  ctr: {
    meta_fields: ["ctr"],
    extract: (d) => Number(d.ctr || 0),
  },
  linkCTR: {
    meta_fields: ["inline_link_click_ctr"],
    extract: (d) => Number(d.inline_link_click_ctr || 0),
  },
  uniqueClicks: {
    meta_fields: ["unique_clicks"],
    extract: (d) => Number(d.unique_clicks || 0),
  },
  uniqueLinkClicks: {
    meta_fields: ["unique_inline_link_clicks"],
    extract: (d) => Number(d.unique_inline_link_clicks || 0),
  },
  uniqueCTR: {
    meta_fields: ["unique_ctr"],
    extract: (d) => Number(d.unique_ctr || 0),
  },
  outboundClicks: {
    meta_fields: ["outbound_clicks"],
    extract: (d) => extractActions(d.outbound_clicks, ["outbound_click"]),
  },
  outboundClicksCTR: {
    meta_fields: ["outbound_clicks_ctr"],
    extract: (d) => extractActions(d.outbound_clicks_ctr, ["outbound_click"]),
  },
  postEngagement: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["post_engagement"]),
  },
  pageEngagement: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["page_engagement"]),
  },
  postReactions: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["post_reaction"]),
  },
  postComments: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["comment"]),
  },
  postShares: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["post"]),
  },
  postSaves: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["onsite_conversion.post_save"]),
  },

  // ============ CONVERSIONES ============
  leads: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["lead", "offsite_conversion.fb_pixel_lead"]),
  },
  landingPageViews: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["landing_page_view"]),
  },
  purchases: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["purchase", "offsite_conversion.fb_pixel_purchase"]),
  },
  addsToCart: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"]),
  },
  initiatedCheckouts: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout"]),
  },
  registrations: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["complete_registration", "offsite_conversion.fb_pixel_complete_registration"]),
  },
  messagingStarted: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["onsite_conversion.messaging_conversation_started_7d"]),
  },
  submitApplications: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["submit_application", "submit_application_total"]),
  },
  viewContent: {
    meta_fields: ["actions"],
    extract: (d) => extractActions(d.actions, ["view_content", "offsite_conversion.fb_pixel_view_content"]),
  },

  // ============ VIDEO ============
  videoPlays: {
    meta_fields: ["video_play_actions"],
    extract: (d) => extractActions(d.video_play_actions, ["video_view"]),
  },
  video25Watched: {
    meta_fields: ["video_p25_watched_actions"],
    extract: (d) => extractActions(d.video_p25_watched_actions, ["video_view"]),
  },
  video50Watched: {
    meta_fields: ["video_p50_watched_actions"],
    extract: (d) => extractActions(d.video_p50_watched_actions, ["video_view"]),
  },
  video75Watched: {
    meta_fields: ["video_p75_watched_actions"],
    extract: (d) => extractActions(d.video_p75_watched_actions, ["video_view"]),
  },
  video95Watched: {
    meta_fields: ["video_p95_watched_actions"],
    extract: (d) => extractActions(d.video_p95_watched_actions, ["video_view"]),
  },
  video100Watched: {
    meta_fields: ["video_p100_watched_actions"],
    extract: (d) => extractActions(d.video_p100_watched_actions, ["video_view"]),
  },
  thruplays: {
    meta_fields: ["video_thruplay_watched_actions"],
    extract: (d) => extractActions(d.video_thruplay_watched_actions, ["video_view"]),
  },
  videoAvgTimeWatched: {
    meta_fields: ["video_avg_time_watched_actions"],
    extract: (d) => extractActions(d.video_avg_time_watched_actions, ["video_view"]),
  },

  // ============ CALIDAD ============
  // Estos vienen como string ("ABOVE_AVERAGE", "AVERAGE", etc), los convertimos numéricamente
  // (no muy útil para tendencias pero los exponemos)
  qualityRanking: {
    meta_fields: ["quality_ranking"],
    extract: (d) => rankingToNumber(d.quality_ranking),
  },
  engagementRateRanking: {
    meta_fields: ["engagement_rate_ranking"],
    extract: (d) => rankingToNumber(d.engagement_rate_ranking),
  },
  conversionRateRanking: {
    meta_fields: ["conversion_rate_ranking"],
    extract: (d) => rankingToNumber(d.conversion_rate_ranking),
  },

  // ============ ROI ============
  purchaseRoas: {
    meta_fields: ["purchase_roas"],
    extract: (d) => extractActions(d.purchase_roas, ["omni_purchase", "offsite_conversion.fb_pixel_purchase"]),
  },
  websitePurchaseRoas: {
    meta_fields: ["website_purchase_roas"],
    extract: (d) => extractActions(d.website_purchase_roas, ["offsite_conversion.fb_pixel_purchase"]),
  },
};

// Conjunto de métricas por defecto si la cuenta no tiene config
// Métricas base que siempre se piden a Meta API
// (se necesitan para calcular derivadas correctamente en Vista Agencia)
const ALWAYS_FETCH = [
  "spend", "clicks", "linkClicks", "impressions", "reach",
  "leads", "landingPageViews", "uniqueClicks", "outboundClicks",
  "messagingStarted", "thruplays",
];
const DEFAULT_METRICS = [
  "spend", "linkClicks", "costPerLinkClick", "linkCTR",
  "leads", "costPerLead", "landingPageViews", "costPerLandingPageView",
];

// ============================================================
// Helpers
// ============================================================
function pad(n: number) { return String(n).padStart(2, "0"); }
function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getDateRange(preset: string | null, since: string | null, until: string | null) {
  if (since && until) return { since, until };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start: Date;
  let end: Date = today;

  switch (preset) {
    case "today": start = today; break;
    case "last_7d": start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000); break;
    case "last_30d": start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000); break;
    case "this_month": start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    default: start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  }
  return { since: toDateString(start), until: toDateString(end) };
}

function getPreviousRange(since: string, until: string) {
  const startDate = new Date(since + "T00:00:00");
  const endDate = new Date(until + "T00:00:00");
  const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { since: toDateString(prevStart), until: toDateString(prevEnd) };
}

function extractActions(actions: any[], types: string[]): number {
  if (!actions || !Array.isArray(actions)) return 0;
  return actions.filter((a) => types.includes(a.action_type)).reduce((s, a) => s + Number(a.value || 0), 0);
}

function extractCostPerAction(costs: any[], types: string[]): number {
  if (!costs || !Array.isArray(costs)) return 0;
  const found = costs.find((c) => types.includes(c.action_type));
  return found ? Number(found.value || 0) : 0;
}

function rankingToNumber(ranking: string | undefined): number {
  if (!ranking) return 0;
  const map: Record<string, number> = {
    "ABOVE_AVERAGE": 3,
    "AVERAGE": 2,
    "BELOW_AVERAGE_35": 1,
    "BELOW_AVERAGE_20": 0.5,
    "BELOW_AVERAGE_10": 0.25,
    "UNKNOWN": 0,
  };
  return map[ranking] ?? 0;
}

// ============================================================
// Evaluador de fórmulas custom (seguro)
// ============================================================
// Solo permite: identificadores (a-z, A-Z, 0-9, _), operadores + - * /, paréntesis, números
function evalFormula(formula: string, values: Record<string, number>): number {
  try {
    // Sanitizar: solo permitir caracteres seguros
    const safe = formula.replace(/\s+/g, "");
    if (!/^[a-zA-Z0-9_+\-*/().]+$/.test(safe)) {
      console.warn("Formula contains unsafe chars:", formula);
      return 0;
    }

    // Reemplazar identificadores con sus valores
    const expr = safe.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (match) => {
      const v = values[match];
      return v !== undefined ? String(v) : "0";
    });

    // Eval seguro: Function constructor sin acceso a closures
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${expr});`);
    const result = fn();
    if (typeof result !== "number" || !isFinite(result)) return 0;
    return result;
  } catch {
    return 0;
  }
}

// ============================================================
// Fetcher de Meta
// ============================================================
async function fetchInsights(
  token: string,
  accountId: string,
  since: string,
  until: string,
  perDay: boolean,
  fields: string[],
) {
  const url = new URL(`${META_BASE_URL}/${accountId}/insights`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("level", "account");
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  url.searchParams.set("fields", fields.join(","));
  if (perDay) url.searchParams.set("time_increment", "1");

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

// Calcula todas las métricas activas (curadas + custom) para un objeto de Meta data
function calculateAllMetrics(
  metaData: any,
  activeMetricDefs: string[],
  customMetrics: { metric_id: string; formula: string }[],
): Record<string, number> {
  const result: Record<string, number> = {};

  // Primero: métricas curadas
  activeMetricDefs.forEach((id) => {
    const def = METRIC_TO_META[id];
    if (def) {
      result[id] = def.extract(metaData);
    }
  });

  // Después: métricas custom (pueden usar las curadas que recién calculamos)
  customMetrics.forEach((cm) => {
    result[cm.metric_id] = evalFormula(cm.formula, result);
  });

  return result;
}

function emptyMetricsFor(ids: string[], customIds: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  ids.forEach((id) => { result[id] = 0; });
  customIds.forEach((id) => { result[id] = 0; });
  return result;
}

// ============================================================
// HANDLER
// ============================================================
export async function GET(request: Request) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "META_ACCESS_TOKEN no configurado" }, { status: 500 });
  }

  const params = new URL(request.url).searchParams;
  const preset = params.get("preset");
  const sinceParam = params.get("since");
  const untilParam = params.get("until");
  const overrideAdAccountId = params.get("adAccountId");

  const { since, until } = getDateRange(preset, sinceParam, untilParam);
  const prev = getPreviousRange(since, until);

  // Generar lista de fechas
  const dateList: string[] = [];
  const startD = new Date(since + "T00:00:00");
  const endD = new Date(until + "T00:00:00");
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    dateList.push(toDateString(new Date(d)));
  }

  // Traer clientes y configuración de métricas
  const clients = await getActiveClients();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Traer todas las métricas activas por ad_account
  const { data: allActiveMetrics } = await supabaseAdmin
    .from("ad_account_metrics")
    .select("ad_account_id, metric_id, display_order")
    .order("display_order");

  // Traer todas las métricas custom por ad_account
  const { data: allCustomMetrics } = await supabaseAdmin
    .from("custom_metrics")
    .select("*")
    .order("display_order");
    // Traer métricas de la Vista Agencia
  const { data: agencyMetricsData } = await supabaseAdmin
    .from("agency_metrics")
    .select("metric_id, display_order")
    .order("display_order");

  const { data: agencyCustomMetricsData } = await supabaseAdmin
    .from("agency_custom_metrics")
    .select("*")
    .order("display_order");

  const agencyActiveMetricDefs = (agencyMetricsData || []).map((m: any) => m.metric_id);
  const agencyCustomMetrics = agencyCustomMetricsData || [];

  // Agrupar por ad_account.id
  const activeMetricsByAccount: Record<string, string[]> = {};
  (allActiveMetrics || []).forEach((row: any) => {
    if (!activeMetricsByAccount[row.ad_account_id]) activeMetricsByAccount[row.ad_account_id] = [];
    activeMetricsByAccount[row.ad_account_id].push(row.metric_id);
  });

  const customMetricsByAccount: Record<string, any[]> = {};
  (allCustomMetrics || []).forEach((row: any) => {
    if (!customMetricsByAccount[row.ad_account_id]) customMetricsByAccount[row.ad_account_id] = [];
    customMetricsByAccount[row.ad_account_id].push(row);
  });

  const results = await Promise.all(
    clients.map(async (client) => {
      const account = overrideAdAccountId
        ? client.ad_accounts.find((a) => a.ad_account_id === overrideAdAccountId)
        : (client.ad_accounts.find((a) => a.is_default) || client.ad_accounts[0]);

      if (!account) {
        return {
          name: client.name, state: client.state, adAccountId: "", ok: false,
          activeMetrics: DEFAULT_METRICS, customMetrics: [],
          current: emptyMetricsFor(DEFAULT_METRICS, []),
          previous: emptyMetricsFor(DEFAULT_METRICS, []),
          series: dateList.map((date) => ({ date, ...emptyMetricsFor(DEFAULT_METRICS, []) })),
        };
      }

      // ============================================================
      // Determinar métricas activas para ESTA cuenta
      // ============================================================
      const activeMetricDefs = activeMetricsByAccount[account.id] || DEFAULT_METRICS;
      const customMetrics = customMetricsByAccount[account.id] || [];
      const customMetricDefs = customMetrics.map((c) => c.metric_id);

      // Para fórmulas custom, necesitamos también traer las métricas base que usan
      // Las traemos todas las métricas conocidas (METRIC_TO_META) para que las fórmulas siempre tengan datos
      const formulaMetrics = new Set<string>();
      customMetrics.forEach((cm) => {
        // Extraer identificadores de la fórmula
        const ids = (cm.formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []);
        ids.forEach((id: string) => {
          if (METRIC_TO_META[id]) formulaMetrics.add(id);
        });
      });

      // Lista total de métricas curadas a calcular
      const allCuratedToFetch = Array.from(new Set([...activeMetricDefs, ...formulaMetrics, ...ALWAYS_FETCH]))
        .filter((id) => METRIC_TO_META[id]);

      // Determinar qué fields de Meta API pedir
      const metaFields = new Set<string>();
      allCuratedToFetch.forEach((id) => {
        METRIC_TO_META[id].meta_fields.forEach((f) => metaFields.add(f));
      });

      // Si no hay nada que pedir, devolver vacío
      if (metaFields.size === 0) {
        return {
          name: client.name, state: client.state, adAccountId: account.ad_account_id, ok: true,
          activeMetrics: activeMetricDefs, customMetrics: customMetrics.map((c) => ({ id: c.metric_id, label: c.label, format: c.format, lower_better: c.lower_better })),
          current: emptyMetricsFor(activeMetricDefs, customMetricDefs),
          previous: emptyMetricsFor(activeMetricDefs, customMetricDefs),
          series: dateList.map((date) => ({ date, ...emptyMetricsFor(activeMetricDefs, customMetricDefs) })),
        };
      }

      try {
        const fieldsArray = Array.from(metaFields);
        const [seriesData, currentTotal, previousTotal] = await Promise.all([
          fetchInsights(token, account.ad_account_id, since, until, true, fieldsArray),
          fetchInsights(token, account.ad_account_id, since, until, false, fieldsArray),
          fetchInsights(token, account.ad_account_id, prev.since, prev.until, false, fieldsArray),
        ]);

        const seriesByDate: Record<string, any> = {};
        seriesData.forEach((d: any) => {
          seriesByDate[d.date_start] = calculateAllMetrics(d, allCuratedToFetch, customMetrics);
        });

        const series = dateList.map((date) => ({
          date,
          ...(seriesByDate[date] || emptyMetricsFor(allCuratedToFetch, customMetricDefs)),
        }));

        const current = currentTotal[0]
          ? calculateAllMetrics(currentTotal[0], allCuratedToFetch, customMetrics)
          : emptyMetricsFor(allCuratedToFetch, customMetricDefs);

        const previous = previousTotal[0]
          ? calculateAllMetrics(previousTotal[0], allCuratedToFetch, customMetrics)
          : emptyMetricsFor(allCuratedToFetch, customMetricDefs);

        return {
          name: client.name,
          state: client.state,
          adAccountId: account.ad_account_id,
          ok: true,
          activeMetrics: activeMetricDefs,
          customMetrics: customMetrics.map((c) => ({
            id: c.metric_id,
            label: c.label,
            format: c.format,
            lower_better: c.lower_better,
            formula: c.formula,
          })),
          current,
          previous,
          series,
        };
      } catch (e) {
        console.error("Meta fetch error:", e);
        return {
          name: client.name, state: client.state, adAccountId: account.ad_account_id, ok: false,
          activeMetrics: activeMetricDefs, customMetrics: [],
          current: emptyMetricsFor(activeMetricDefs, customMetricDefs),
          previous: emptyMetricsFor(activeMetricDefs, customMetricDefs),
          series: dateList.map((date) => ({ date, ...emptyMetricsFor(activeMetricDefs, customMetricDefs) })),
        };
      }
    })
  );

  return NextResponse.json({
    range: { since, until },
    previousRange: prev,
    clients: results,
    agency: {
      activeMetrics: agencyActiveMetricDefs,
      customMetrics: agencyCustomMetrics.map((c: any) => ({
        id: c.metric_id,
        label: c.label,
        format: c.format,
        lower_better: c.lower_better,
        formula: c.formula,
        category: c.category,
      })),
    },
  });
}