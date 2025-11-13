export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

export async function GET() {
  // 🔥 Esta ruta se ejecuta SIEMPRE del lado del servidor, sin cache.
  return NextResponse.redirect("/role-selector");
}
