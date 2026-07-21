import { NextResponse } from "next/server";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const apiKey = process.env.ORS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      route: null,
      received: body,
      note: "Falta ORS_API_KEY. Endpoint preparado para proxy server-side.",
    });
  }

  return NextResponse.json({
    route: null,
    received: body,
    note: "ORS_API_KEY detectada. Falta activar fetch real a OpenRouteService.",
  });
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    provider: "openrouteservice",
  });
}
