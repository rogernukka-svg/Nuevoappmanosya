export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  // Después del login, redirigimos al usuario
  return NextResponse.redirect("/role-selector");
}
