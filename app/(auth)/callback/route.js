import { NextResponse } from "next/server";

export async function GET(request) {
  // Después del login, Supabase redirige aquí
  // y luego enviamos al usuario a seleccionar su rol
  return NextResponse.redirect("/role-selector");
}
