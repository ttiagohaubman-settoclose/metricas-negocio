import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cliente con SERVICE ROLE KEY (puede crear/eliminar usuarios)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// LISTAR usuarios
export async function GET() {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    // Traer perfiles
    const { data: profiles } = await supabaseAdmin.from("user_profiles").select("*");
    const { data: assignments } = await supabaseAdmin.from("user_clients").select("*");

    const enriched = users.map((u) => {
      const profile = profiles?.find((p) => p.id === u.id);
      const userAssignments = assignments?.filter((a) => a.user_id === u.id) || [];
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        full_name: profile?.full_name || null,
        role: profile?.role || "client",
        client_ids: userAssignments.map((a) => a.client_id),
      };
    });

    return NextResponse.json({ users: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// CREAR usuario
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, role, client_ids } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // 1. Crear usuario en auth
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) throw createError;
    const userId = userData.user.id;

    // 2. Crear perfil
    await supabaseAdmin.from("user_profiles").insert({
      id: userId,
      full_name: full_name || null,
      role: role || "client",
    });

    // 3. Asignar clientes
    if (client_ids && client_ids.length > 0) {
      await supabaseAdmin.from("user_clients").insert(
        client_ids.map((cid: string) => ({ user_id: userId, client_id: cid, role: "viewer" }))
      );
    }

    return NextResponse.json({ ok: true, user_id: userId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ACTUALIZAR usuario
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { user_id, full_name, role, client_ids, password } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    // 1. Cambiar contraseña si se envió
    if (password) {
      await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
    }

    // 2. Actualizar perfil
    await supabaseAdmin.from("user_profiles").upsert({
      id: user_id,
      full_name: full_name || null,
      role: role || "client",
    });

    // 3. Reemplazar asignaciones
    await supabaseAdmin.from("user_clients").delete().eq("user_id", user_id);
    if (client_ids && client_ids.length > 0) {
      await supabaseAdmin.from("user_clients").insert(
        client_ids.map((cid: string) => ({ user_id, client_id: cid, role: "viewer" }))
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ELIMINAR usuario
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}