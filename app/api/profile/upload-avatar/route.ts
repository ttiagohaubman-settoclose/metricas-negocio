import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("client_id") as string;

    if (!file || !clientId) {
      return NextResponse.json({ error: "file and client_id required" }, { status: 400 });
    }

    // Verificar que el usuario tiene permiso para editar ESTE cliente
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    if (!isAdmin) {
      // Si no es admin, verificar que tenga asignación a este cliente
      const { data: assignment } = await supabaseAdmin
        .from("user_clients")
        .select("client_id")
        .eq("user_id", user.id)
        .eq("client_id", clientId)
        .single();

      if (!assignment) {
        return NextResponse.json({ error: "Not authorized for this client" }, { status: 403 });
      }
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 2MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${clientId}-${Date.now()}.${ext}`;
    const filePath = `clients/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("client-avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseAdmin.storage
      .from("client-avatars")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabaseAdmin
      .from("clients")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", clientId);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, avatar_url: urlData.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}