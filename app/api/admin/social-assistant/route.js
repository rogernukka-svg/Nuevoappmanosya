import { NextResponse } from "next/server";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const prompt = String(body?.prompt || body?.message || "").trim();

  return NextResponse.json({
    answer: prompt
      ? "Recibido. En produccion este endpoint debe validar admin, limitar datos sensibles y responder con contexto operativo."
      : "Asistente admin listo para conectar con la politica de seguridad y datos reales.",
    received: Boolean(prompt),
  });
}
