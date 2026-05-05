import { NextResponse } from "next/server";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

export async function GET() {
  const token = process.env.GHL_API_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    return NextResponse.json(
      { error: "GHL_API_TOKEN o GHL_LOCATION_ID no están configurados" },
      { status: 500 }
    );
  }

  try {
    const url = `${GHL_BASE_URL}/locations/${locationId}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_API_VERSION,
        Accept: "application/json",
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "GHL devolvió error", status: res.status, details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, location: data });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al consultar GHL API", details: String(error) },
      { status: 500 }
    );
  }
}