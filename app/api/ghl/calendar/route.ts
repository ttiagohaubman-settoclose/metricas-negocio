import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";
import { getClientsForUser } from "@/app/lib/clients-server";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";

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
  if (!contactId) return null;
  try {
    const res = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.contact || null;
  } catch {
    return null;
  }
}

function getCustomFieldValue(contact: any, fieldName: string): string {
  if (!contact?.customFields) return "";
  // Buscar por nombre exacto en los custom fields
  for (const field of contact.customFields) {
    if (field.fieldKey === fieldName || field.name === fieldName) {
      return field.value || "";
    }
  }
  return "";
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const url = new URL(request.url);
    const sinceParam = url.searchParams.get("since"); // YYYY-MM-DD
    const untilParam = url.searchParams.get("until"); // YYYY-MM-DD

    if (!sinceParam || !untilParam) {
      return NextResponse.json({ error: "since and until required" }, { status: 400 });
    }

    const startMs = new Date(sinceParam + "T00:00:00").getTime();
    const endMs = new Date(untilParam + "T23:59:59").getTime();

    const token = process.env.GHL_API_TOKEN!;
    const clients = await getClientsForUser(user.id);

    const results = await Promise.all(
      clients.map(async (client) => {
        try {
          const [english, spanish] = await Promise.all([
            fetchEvents(token, client.ghl_location_id, client.calendar_english_id, startMs, endMs),
            fetchEvents(token, client.ghl_location_id, client.calendar_spanish_id, startMs, endMs),
          ]);
          const allEvents = [...english, ...spanish];

          // Para cada event traer info del contacto
          const eventsWithDetails = await Promise.all(
            allEvents.map(async (e: any) => {
              const contact = await fetchContact(token, e.contactId);
              const name = contact
                ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email || "Sin nombre"
                : "Sin nombre";

              const ownerOrRenter = getCustomFieldValue(contact, "owner_or_renter");
              const waterType = getCustomFieldValue(contact, "water_type");

              return {
                appointmentId: e.id,
                contactId: e.contactId,
                clientName: client.name,
                name,
                startTime: e.startTime,
                endTime: e.endTime,
                address: e.address || "",
                appointmentStatus: e.appointmentStatus,
                ownerOrRenter,
                waterType,
                language: english.includes(e) ? "english" : "spanish",
              };
            })
          );

          return { client: client.name, events: eventsWithDetails };
        } catch (err) {
          console.error(`Error fetching calendar for ${client.name}:`, err);
          return { client: client.name, events: [] };
        }
      })
    );

    // Aplastar todos los eventos en una sola lista
    const allEvents = results.flatMap((r) => r.events);

    return NextResponse.json({ events: allEvents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
