import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// GET: traer la configuración de una entidad (cuenta publicitaria o agencia)
// Query params:
//   scope=ad_account&id=<uuid>   -> métricas de una cuenta publicitaria
//   scope=agency                  -> métricas de la vista agencia
// ============================================================
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") || "ad_account";
    const id = url.searchParams.get("id");

    if (scope === "agency") {
      // Métricas regulares (catalog)
      const { data: regular } = await supabaseAdmin
        .from("agency_metrics")
        .select("*")
        .order("display_order");

      // Métricas custom
      const { data: custom } = await supabaseAdmin
        .from("agency_custom_metrics")
        .select("*")
        .order("display_order");

      return NextResponse.json({
        metric_ids: (regular || []).map((m: any) => m.metric_id),
        custom_metrics: custom || [],
      });
    }

    // scope = ad_account
    if (!id) {
      return NextResponse.json({ error: "id required for ad_account scope" }, { status: 400 });
    }

    const { data: regular } = await supabaseAdmin
      .from("ad_account_metrics")
      .select("*")
      .eq("ad_account_id", id)
      .order("display_order");

    const { data: custom } = await supabaseAdmin
      .from("custom_metrics")
      .select("*")
      .eq("ad_account_id", id)
      .order("display_order");

    return NextResponse.json({
      metric_ids: (regular || []).map((m: any) => m.metric_id),
      custom_metrics: custom || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ============================================================
// POST: guardar la configuración completa
// Body:
//   { scope: "ad_account" | "agency",
//     id: <uuid> | null,
//     metric_ids: string[],
//     custom_metrics: [{ metric_id, label, formula, format, lower_better, category }] }
// ============================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scope, id, metric_ids, custom_metrics } = body;

    if (!scope || !Array.isArray(metric_ids) || !Array.isArray(custom_metrics)) {
      return NextResponse.json({ error: "scope, metric_ids[], custom_metrics[] required" }, { status: 400 });
    }

    if (scope === "agency") {
      // Reemplazar métricas regulares
      await supabaseAdmin.from("agency_metrics").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (metric_ids.length > 0) {
        const rows = metric_ids.map((metric_id: string, index: number) => ({
          metric_id,
          display_order: index,
          active: true,
        }));
        const { error } = await supabaseAdmin.from("agency_metrics").insert(rows);
        if (error) throw error;
      }

      // Reemplazar métricas custom
      await supabaseAdmin.from("agency_custom_metrics").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (custom_metrics.length > 0) {
        const customRows = custom_metrics.map((cm: any, index: number) => ({
          metric_id: cm.metric_id,
          label: cm.label,
          formula: cm.formula,
          format: cm.format || "number",
          lower_better: cm.lower_better || false,
          category: cm.category || "Custom",
          display_order: index,
        }));
        const { error } = await supabaseAdmin.from("agency_custom_metrics").insert(customRows);
        if (error) throw error;
      }

      return NextResponse.json({ ok: true });
    }

    // scope = ad_account
    if (!id) {
      return NextResponse.json({ error: "id required for ad_account scope" }, { status: 400 });
    }

    // Reemplazar métricas regulares
    await supabaseAdmin.from("ad_account_metrics").delete().eq("ad_account_id", id);

    if (metric_ids.length > 0) {
      const rows = metric_ids.map((metric_id: string, index: number) => ({
        ad_account_id: id,
        metric_id,
        display_order: index,
        active: true,
      }));
      const { error } = await supabaseAdmin.from("ad_account_metrics").insert(rows);
      if (error) throw error;
    }

    // Reemplazar métricas custom
    await supabaseAdmin.from("custom_metrics").delete().eq("ad_account_id", id);

    if (custom_metrics.length > 0) {
      const customRows = custom_metrics.map((cm: any, index: number) => ({
        ad_account_id: id,
        metric_id: cm.metric_id,
        label: cm.label,
        formula: cm.formula,
        format: cm.format || "number",
        lower_better: cm.lower_better || false,
        category: cm.category || "Custom",
        display_order: index,
      }));
      const { error } = await supabaseAdmin.from("custom_metrics").insert(customRows);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}