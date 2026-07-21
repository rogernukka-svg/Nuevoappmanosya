import { NextResponse } from "next/server";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    route: null,
    received: body,
    note: "Compat route for /api/ors/route. Conectar al mismo servicio ORS central.",
  });
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    provider: "openrouteservice",
    compat: true,
  });
}
