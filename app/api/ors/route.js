import { NextResponse } from "next/server";

const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions/driving-car";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const key = process.env.NEXT_PUBLIC_ORS_API_KEY;

    if (!start || !end) {
      return NextResponse.json(
        { error: "Faltan parametros obligatorios: 'start' y/o 'end'." },
        { status: 400 }
      );
    }

    if (!key) {
      return NextResponse.json(
        { error: "Falta la variable NEXT_PUBLIC_ORS_API_KEY en el entorno" },
        { status: 500 }
      );
    }

    const url = `${ORS_BASE_URL}?api_key=${key}&start=${start}&end=${end}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Error ORS (GET):", res.status, text);
      return NextResponse.json(
        { error: "Error en OpenRouteService (GET)", details: text },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (!data?.features?.length) {
      return NextResponse.json(
        { error: "Respuesta invalida o sin datos de ruta" },
        { status: 422 }
      );
    }

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error interno en /api/ors (GET):", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const key = process.env.NEXT_PUBLIC_ORS_API_KEY;

    if (!body?.coordinates || !Array.isArray(body.coordinates)) {
      return NextResponse.json(
        { error: "Debe incluir un array valido de 'coordinates'." },
        { status: 400 }
      );
    }

    if (!key) {
      return NextResponse.json(
        { error: "Falta la variable NEXT_PUBLIC_ORS_API_KEY en el entorno" },
        { status: 500 }
      );
    }

    const res = await fetch(ORS_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: body.coordinates,
        instructions: false,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Error ORS (POST):", res.status, text);
      return NextResponse.json(
        { error: "Error en OpenRouteService (POST)", details: text },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (!data?.features?.length) {
      return NextResponse.json(
        { error: "Respuesta invalida o sin coordenadas" },
        { status: 422 }
      );
    }

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error interno en /api/ors (POST):", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
