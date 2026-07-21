import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    return NextResponse.json({ error: "Inicia sesion para guardar tu ubicacion." }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const role = payload.role;
  const lat = Number(payload.lat);
  const lng = Number(payload.lng);

  if (!["worker", "supplier"].includes(role)) {
    return NextResponse.json({ error: "Rol no valido." }, { status: 400 });
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Ubicacion no valida." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== role && profile?.role !== "admin") {
    return NextResponse.json({ error: "Esta cuenta no corresponde a ese panel." }, { status: 403 });
  }

  const table = role === "worker" ? "worker_profiles" : "supplier_profiles";
  const update = {
    user_id: user.id,
    lat,
    lng,
    updated_at: new Date().toISOString(),
  };

  if (role === "worker") {
    update.is_available = true;
  } else {
    update.is_active = true;
  }

  const { error } = await supabase.from(table).upsert(update, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (role === "worker") {
    await supabase.from("worker_locations").upsert({
      worker_id: user.id,
      lat,
      lng,
      updated_at: new Date().toISOString(),
    }, { onConflict: "worker_id" });
  }

  return NextResponse.json({ ok: true });
}
