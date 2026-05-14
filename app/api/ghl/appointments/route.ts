import { NextResponse } from "next/server";
import { getActiveClients } from "@/app/lib/clients-server";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";

function getDateRange(preset: string | null, since: string | null, until: string | null) {
  if (since && until) {
    return {
      sinceMs: new Date(since + "T00:00:00").getTime(),
      untilMs: new Date(until + "T23:59:59").getTime(),
    };
  }
// Usar zona horaria de los clientes (US Eastern)
  const tzString = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const now = new Date(tzString);
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

export async function GET(request: Request) {
  const token = process.env.GHL_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GHL_API_TOKEN no configurado" }, { status: 500 });
  }

  const params = new URL(request.url).searchParams;
  const preset = params.get("preset");
  const sinceParam = params.get("since");
  const untilParam = params.get("until");
  const clientId = params.get("clientId");

  const { sinceMs, untilMs } = getDateRange(preset, sinceParam, untilParam);

  try {
    const clients = await getActiveClients();
    const filteredClients = clientId ? clients.filter((c) => c.id === clientId) : clients;

    const results = await Promise.all(
      filteredClients.map(async (client) => {
        const [english, spanish] = await Promise.all([
          fetchEvents(token, client.ghl_location_id, client.calendar_english_id, sinceMs, untilMs),
          fetchEvents(token, client.ghl_location_id, client.calendar_spanish_id, sinceMs, untilMs),
        ]);
        const allEvents = [
          ...english.map((e: any) => ({ ...e, market: "english" })),
          ...spanish.map((e: any) => ({ ...e, market: "spanish" })),
        ];

        return {
          name: client.name,
          state: client.state,
          ok: true,
          appointments: allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
          total: allEvents.length,
        };
      })
    );

    return NextResponse.json({ clients: results });
  } catch (e) {
    return NextResponse.json({ error: "Error GHL", details: String(e) }, { status: 500 });
  }
}
