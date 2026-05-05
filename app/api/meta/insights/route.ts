import { NextResponse } from "next/server";

const META_API_VERSION = "v23.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const CLIENTS = [
  { name: "Aaron y Yuliana", state: "South Carolina", adAccountId: "act_751411627703795" },
  { name: "Jorge Martinez", state: "Virginia", adAccountId: "act_1423143898800903" },
  { name: "Fernando Duque", state: "Maryland", adAccountId: "act_795631173072316" },
  { name: "Danelly Dacos", state: "North Carolina", adAccountId: "act_1569261187694774" },
];

// Mapea presets del dashboard a date_preset de Meta
const DATE_PRESETS: Record<string, string> = {
  today: "today",
  last_7d: "last_7d",
  last_30d: "last_30d",
  this_month: "this_month",
};

function buildInsightsUrl(adAccountId: string, token: string, params: URLSearchParams) {
  const fields = [
    "spend",
    "inline_link_clicks",
    "cost_per_inline_link_click",
    "inline_link_click_ctr",
    "actions",
    "cost_per_action_type",
  ].join(",");

  const url = new URL(`${META_BASE_URL}/${adAccountId}/insights`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", token);
  url.searchParams.set("level", "account");

  const preset = params.get("preset");
  const since = params.get("since");
  const until = params.get("until");

  if (since && until) {
    url.searchParams.set("time_range", JSON.stringify({ since, until }));
  } else if (preset && DATE_PRESETS[preset]) {
    url.searchParams.set("date_preset", DATE_PRESETS[preset]);
  } else {
    url.searchParams.set("date_preset", "last_7d");
  }

  return url.toString();
}

function extractActionValue(actions: Array<{ action_type: string; value: string }> | undefined, types: string[]) {
  if (!actions) return 0;
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((sum, a) => sum + Number(a.value || 0), 0);
}

function extractCostPerAction(costs: Array<{ action_type: string; value: string }> | undefined, types: string[]) {
  if (!costs) return null;
  const match = costs.find((c) => types.includes(c.action_type));
  return match ? Number(match.value) : null;
}

export async function GET(request: Request) {
  const token = process.env.META_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "META_ACCESS_TOKEN no está configurado" },
      { status: 500 }
    );
  }

  const params = new URL(request.url).searchParams;

  try {
    const results = await Promise.all(
      CLIENTS.map(async (client) => {
        const url = buildInsightsUrl(client.adAccountId, token, params);
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
          return { ...client, ok: false, error: data.error };
        }

        const insights = data.data?.[0];

        if (!insights) {
          return {
            ...client,
            ok: true,
            metrics: {
              spend: 0,
              linkClicks: 0,
              costPerLinkClick: 0,
              linkCTR: 0,
              leads: 0,
              costPerLead: null,
              landingPageViews: 0,
              costPerLandingPageView: null,
            },
          };
        }

        const leads = extractActionValue(insights.actions, ["lead", "offsite_conversion.fb_pixel_lead"]);
        const landingPageViews = extractActionValue(insights.actions, ["landing_page_view"]);
        const costPerLead = extractCostPerAction(insights.cost_per_action_type, ["lead", "offsite_conversion.fb_pixel_lead"]);
        const costPerLandingPageView = extractCostPerAction(insights.cost_per_action_type, ["landing_page_view"]);

        return {
          ...client,
          ok: true,
          metrics: {
            spend: Number(insights.spend || 0),
            linkClicks: Number(insights.inline_link_clicks || 0),
            costPerLinkClick: Number(insights.cost_per_inline_link_click || 0),
            linkCTR: Number(insights.inline_link_click_ctr || 0),
            leads,
            costPerLead,
            landingPageViews,
            costPerLandingPageView,
          },
        };
      })
    );

    return NextResponse.json({ clients: results });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al consultar Meta API", details: String(error) },
      { status: 500 }
    );
  }
}