import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("client_id") as string;

    if (!file || !clientId) {
      return NextResponse.json({ error: "file and client_id required" }, { status: 400 });
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 2MB)" }, { status: 400 });
    }

    // Nombre único
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${clientId}-${Date.now()}.${ext}`;
    const filePath = `clients/${fileName}`;

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Subir a Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("client-avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from("client-avatars")
      .getPublicUrl(filePath);

    // Actualizar el cliente con la nueva URL
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