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

function determineStatus(appointmentStatus: string, tags: string[]): string {
  const lowerTags = tags.map((t) => t.toLowerCase());
  if (lowerTags.includes("pagada")) return "pagada";
  if (lowerTags.includes("venta")) return "venta";
  if (appointmentStatus === "showed") return "showed";
  if (appointmentStatus === "cancelled") return "cancelled";
  if (appointmentStatus === "noshow") return "noshow";
  return "scheduled";
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
        const allEvents = [...english, ...spanish];

        const enrichedLeads = await Promise.all(
          allEvents.map(async (e: any) => {
            const contact = await fetchContact(token, e.contactId);
            const tags = contact?.tags || [];
            const status = determineStatus(e.appointmentStatus, tags);
            const name = contact ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email || "Sin nombre" : "Sin nombre";
            const email = contact?.email || "";
            const phone = contact?.phone || "";

            return {
              appointmentId: e.id,
              contactId: e.contactId,
              name,
              email,
              phone,
              startTime: e.startTime,
              appointmentStatus: e.appointmentStatus,
              tags,
              status,
            };
          })
        );

        return {
          name: client.name,
          state: client.state,
          ok: true,
          leads: enrichedLeads.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
        };
      })
    );

    return NextResponse.json({ clients: results });
  } catch (e) {
    return NextResponse.json({ error: "Error GHL", details: String(e) }, { status: 500 });
  }
}