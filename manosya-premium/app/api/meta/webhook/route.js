import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge || "", { status: 200 });
  }

  return NextResponse.json({ error: "Invalid verification" }, { status: 403 });
}

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));

  return NextResponse.json({
    ok: true,
    received: Boolean(payload),
    note: "Validar firma Meta y encolar eventos antes de activar en produccion.",
  });
}
