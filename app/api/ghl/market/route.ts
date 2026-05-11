import { NextResponse } from "next/server";
import { getActiveClients } from "@/app/lib/clients-server";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";

function pad(n: number) { return String(n).padStart(2, "0"); }
function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getDateRange(preset: string | null, since: string | null, until: string | null) {
  if (since && until) {
    return {
      sinceMs: new Date(since + "T00:00:00").getTime(),
      untilMs: new Date(until + "T23:59:59").getTime(),
    };
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start: Date;
  const end = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  switch (preset) {
    case "today": start = today; break;
    case "last_7d": start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000); break;
    case "last_30d": start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000); break;
    case "this_month": start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    default: start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  }
  return { sinceMs: start.getTime(), untilMs: end.getTime() };
}

async function fetchEvents(token: string, locationId: string, calendarId: string, startMs: number, endMs: number) {
  const url = new URL(`${GHL_BASE_URL}/calendars/events`);
  url.searchParams.set("locationId", locationId);
  url.searchParams.set("calendarId", calendarId);
  url.searchParams.set("startTime", String(startMs));
  url.searchParams.set("endTime", String(endMs));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-04-15",
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.events || [];
}

async function fetchContact(token: string, contactId: string) {
  const url = `${GHL_BASE_URL}/contacts/${contactId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.contact || null;
}

async function searchContactsByTag(token: string, locationId: string, tag: string, sinceMs: number, untilMs: number) {
  const url = `${GHL_BASE_URL}/contacts/search`;
  const body = {
    locationId,
    pageLimit: 100,
    filters: [
      { field: "tags", operator: "contains", value: tag },
      { field: "dateAdded", operator: "between", value: { gte: new Date(sinceMs).toISOString(), lte: new Date(untilMs).toISOString() } },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.contacts || [];
}

function getMarketFromTags(tags: string[]): "english" | "spanish" | "unknown" {
  const set = new Set(tags.map((t) => t.toLowerCase()));
  if (set.has("español") || set.has("espanol")) return "spanish";
  if (set.has("english")) return "english";
  return "unknown";
}

function isVenta(tags: string[]) {
  return tags.map((t) => t.toLowerCase()).some((t) => t === "venta" || t === "pagada");
}

export async function GET(request: Request) {
  const token = process.env.GHL_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GHL_API_TOKEN no configurado" }, { status: 500 });
  }

  const params = new URL(request.url).searchParams;
  const preset = params.get("preset");
  const sinceParam = params.get("since");
  const untilParam = params.get("until");

  const { sinceMs, untilMs } = getDateRange(preset, sinceParam, untilParam);

  try {
    const clients = await getActiveClients();

    const results = await Promise.all(
      clients.map(async (client) => {
        // 1. LEADS por idioma
        const contacts = await searchContactsByTag(token, client.ghl_location_id, client.ghl_tag, sinceMs, untilMs);
        let leadsEnglish = 0, leadsSpanish = 0, leadsUnknown = 0;
        contacts.forEach((c: any) => {
          const market = getMarketFromTags(c.tags || []);
          if (market === "english") leadsEnglish++;
          else if (market === "spanish") leadsSpanish++;
          else leadsUnknown++;
        });

        // 2. APPOINTMENTS por calendario (idioma)
        const [englishEvents, spanishEvents] = await Promise.all([
          fetchEvents(token, client.ghl_location_id, client.calendar_english_id, sinceMs, untilMs),
          fetchEvents(token, client.ghl_location_id, client.calendar_spanish_id, sinceMs, untilMs),
        ]);

        // 3. SALES: appointments con tag venta/pagada
        const allEvents = [
          ...englishEvents.map((e: any) => ({ ...e, _market: "english" })),
          ...spanishEvents.map((e: any) => ({ ...e, _market: "spanish" })),
        ];

        let salesEnglish = 0, salesSpanish = 0;
        await Promise.all(
          allEvents.map(async (e: any) => {
            const contact = await fetchContact(token, e.contactId);
            const tags = contact?.tags || [];
            if (isVenta(tags)) {
              if (e._market === "english") salesEnglish++;
              else salesSpanish++;
            }
          })
        );

        return {
          name: client.name,
          state: client.state,
          ok: true,
          leads: { english: leadsEnglish, spanish: leadsSpanish, unknown: leadsUnknown },
          appointments: { english: englishEvents.length, spanish: spanishEvents.length },
          sales: { english: salesEnglish, spanish: salesSpanish },
        };
      })
    );

    const totals = {
      leads: { english: 0, spanish: 0, unknown: 0 },
      appointments: { english: 0, spanish: 0 },
      sales: { english: 0, spanish: 0 },
    };
    results.forEach((r) => {
      totals.leads.english += r.leads.english;
      totals.leads.spanish += r.leads.spanish;
      totals.leads.unknown += r.leads.unknown;
      totals.appointments.english += r.appointments.english;
      totals.appointments.spanish += r.appointments.spanish;
      totals.sales.english += r.sales.english;
      totals.sales.spanish += r.sales.spanish;
    });

    return NextResponse.json({ totals, clients: results });
  } catch (e) {
    return NextResponse.json({ error: "Error GHL", details: String(e) }, { status: 500 });
  }
}