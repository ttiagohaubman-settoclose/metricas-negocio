import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.GHL_API_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    return NextResponse.json({ error: "Tokens no configurados" }, { status: 500 });
  }

  const calendarId = "Kei59Zx6HpJCZdpSpYDN";
const startDate = Date.now() - 90 * 24 * 60 * 60 * 1000;
const endDate = Date.now() + 90 * 24 * 60 * 60 * 1000;
  const url = new URL("https://services.leadconnectorhq.com/calendars/events");
  url.searchParams.set("locationId", locationId);
  url.searchParams.set("calendarId", calendarId);
  url.searchParams.set("startTime", String(startDate));
  url.searchParams.set("endTime", String(endDate));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-04-15",
      Accept: "application/json",
    },
  });

  const data = await res.json();

  return NextResponse.json({
    status: res.status,
    response: data,
  });
}