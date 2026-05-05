import { NextResponse } from "next/server";

const META_API_VERSION = "v23.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const CLIENTS = [
  { name: "Aaron y Yuliana", state: "South Carolina", adAccountId: "act_751411627703795" },
  { name: "Jorge Martinez", state: "Virginia", adAccountId: "act_1423143898800903" },
  { name: "Fernando Duque", state: "Maryland", adAccountId: "act_795631173072316" },
  { name: "Danelly Dacos", state: "North Carolina", adAccountId: "act_1569261187694774" },
];

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "META_ACCESS_TOKEN no está configurado" },
      { status: 500 }
    );
  }

  try {
    const results = await Promise.all(
      CLIENTS.map(async (client) => {
        const url = `${META_BASE_URL}/${client.adAccountId}?fields=name,account_status,currency,balance&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();

        return {
          ...client,
          metaData: data,
          ok: !data.error,
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