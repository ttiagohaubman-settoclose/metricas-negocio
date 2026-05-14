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
      sinceStr: since,
      untilStr: until,
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
  return {
    sinceMs: start.getTime(),
    untilMs: end.getTime(),
    sinceStr: toDateString(start),
    untilStr: toDateString(today),
  };
}

function getPreviousRange(sinceStr: string, untilStr: string) {
  const startDate = new Date(sinceStr + "T00:00:00");
  const endDate = new Date(untilStr + "T00:00:00");
  const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return {
    sinceMs: prevStart.getTime(),
    untilMs: new Date(prevEnd.setHours(23, 59, 59, 999)).getTime(),
  };
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

function determineStatus(appointmentStatus: string, tags: string[]): string {
  const lowerTags = tags.map((t) => t.toLowerCase());
  if (lowerTags.includes("pagada")) return "pagada";
  if (lowerTags.includes("venta")) return "venta";
  if (appointmentStatus === "showed") return "showed";
  if (appointmentStatus === "cancelled") return "cancelled";
  if (appointmentStatus === "noshow") return "noshow";
  return "scheduled";
}

function emptyCounts() {
  return { scheduled: 0, showed: 0, venta: 0, pagada: 0, noshow: 0, cancelled: 0, total: 0 };
}

async function getCountsForRange(token: string, locationId: string, calendars: { english: string; spanish: string }, startMs: number, endMs: number) {
  const [english, spanish] = await Promise.all([
    fetchEvents(token, locationId, calendars.english, startMs, endMs),
    fetchEvents(token, locationId, calendars.spanish, startMs, endMs),
  ]);
  const allEvents = [...english, ...spanish];

  const counts = emptyCounts();
  const leads: any[] = [];
  const seriesByDate: Record<string, any> = {};

  await Promise.all(
    allEvents.map(async (e: any) => {
      const contact = await fetchContact(token, e.contactId);
      const tags = contact?.tags || [];
      const status = determineStatus(e.appointmentStatus, tags);
      counts[status as keyof typeof counts]++;
      counts.total++;

      const date = e.startTime ? toDateString(new Date(e.startTime)) : "";
      if (date) {
        if (!seriesByDate[date]) {
          seriesByDate[date] = { date, appointments: 0, venta: 0, pagada: 0, showed: 0 };
        }
        seriesByDate[date].appointments++;
        if (status === "venta") seriesByDate[date].venta++;
        if (status === "pagada") seriesByDate[date].pagada++;
        if (status === "showed") seriesByDate[date].showed++;
      }

      const name = contact ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email || "Sin nombre" : "Sin nombre";
      leads.push({
        appointmentId: e.id,
        contactId: e.contactId,
        name,
        startTime: e.startTime,
        appointmentStatus: e.appointmentStatus,
        tags,
        status,
      });
    })
  );

  return { counts, leads, seriesByDate };
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

  const range = getDateRange(preset, sinceParam, untilParam);
  const prevRange = getPreviousRange(range.sinceStr, range.untilStr);

  // Generar lista de fechas
  const dateList: string[] = [];
  const startD = new Date(range.sinceStr + "T00:00:00");
  const endD = new Date(range.untilStr + "T00:00:00");
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    dateList.push(toDateString(new Date(d)));
  }

  const clients = await getActiveClients();

  const results = await Promise.all(
    clients.map(async (client) => {
      try {
        const [current, previous] = await Promise.all([
          getCountsForRange(token, client.ghl_location_id, {
            english: client.calendar_english_id,
            spanish: client.calendar_spanish_id,
          }, range.sinceMs, range.untilMs),
          getCountsForRange(token, client.ghl_location_id, {
            english: client.calendar_english_id,
            spanish: client.calendar_spanish_id,
          }, prevRange.sinceMs, prevRange.untilMs),
        ]);

        const series = dateList.map((date) => current.seriesByDate[date] || { date, appointments: 0, venta: 0, pagada: 0, showed: 0 });

        return {
          name: client.name,
          state: client.state,
          ok: true,
          current: current.counts,
          previous: previous.counts,
          series,
          leads: current.leads,
        };
      } catch (e) {
        return {
          name: client.name,
          state: client.state,
          ok: false,
          current: emptyCounts(),
          previous: emptyCounts(),
          series: dateList.map((date) => ({ date, appointments: 0, venta: 0, pagada: 0, showed: 0 })),
          leads: [],
        };
      }
    })
  );

  return NextResponse.json({
    range: { since: range.sinceStr, until: range.untilStr },
    clients: results,
  });
}
