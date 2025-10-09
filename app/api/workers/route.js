export const dynamic = "force-dynamic"; // 🚀 Evita el error de build

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET → listar todos los trabajadores registrados
export async function GET() {
  // Crear cliente en tiempo real
  const supabase = getSupabase();

  // Si estamos en build o sin cliente, abortar seguro
  if (!supabase || typeof window === "undefined") {
    return NextResponse.json(
      { error: "Supabase no disponible en entorno de build." },
      { status: 200 }
    );
  }

  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
