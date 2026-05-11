import { NextResponse } from "next/server";
import { getActiveClients } from "@/app/lib/clients-server";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Traer rol del usuario
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    // Traer todos los clientes
    let allClients = await getActiveClients();

    // Si NO es admin, filtrar solo los asignados
    if (!isAdmin) {
      const { data: assignments } = await supabase
        .from("user_clients")
        .select("client_id")
        .eq("user_id", user.id);

      const allowedIds = new Set((assignments || []).map((a) => a.client_id));
      allClients = allClients.filter((c) => allowedIds.has(c.id));
    }

    const formatted = allClients.map((c) => ({
      id: c.id,
      name: c.name,
      state: c.state,
      stateCode: c.state_code,
      avatarUrl: c.avatar_url,
      ghlLocationId: c.ghl_location_id,
      ghlTag: c.ghl_tag,
      calendarEnglishId: c.calendar_english_id,
      calendarSpanishId: c.calendar_spanish_id,
      saleValue: Number(c.sale_value),
      feePerSale: Number(c.fee_per_sale),
      adAccounts: c.ad_accounts,
      adAccountId: c.ad_accounts.find((a) => a.is_default)?.ad_account_id || c.ad_accounts[0]?.ad_account_id || "",
    }));

    return NextResponse.json({
      clients: formatted,
      isAdmin,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}