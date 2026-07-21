import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchWorkerFeed } from "@/lib/feed/workers";

const fallbackByService = {
  electricidad: [
    {
      id: "demo-electricista-1",
      name: "Carlos Medina",
      trade: "Electricista",
      city: "Cerca tuyo",
      distance: "1.8 km",
      rating: "4.9",
      jobs: 128,
      available: "Disponible",
      image: "linear-gradient(135deg, #050505 0%, #1e302e 45%, #64C7BE 100%)",
    },
    {
      id: "demo-electricista-2",
      name: "Miguel Duarte",
      trade: "Instalaciones",
      city: "Asuncion",
      distance: "3.2 km",
      rating: "4.8",
      jobs: 74,
      available: "Responde rapido",
      image: "linear-gradient(135deg, #111 0%, #263533 52%, #6dd2c9 100%)",
    },
  ],
  plomeria: [
    {
      id: "demo-plomero-1",
      name: "Luis Gomez",
      trade: "Plomero",
      city: "Cerca tuyo",
      distance: "2.1 km",
      rating: "5.0",
      jobs: 91,
      available: "Disponible",
      image: "linear-gradient(135deg, #050505 0%, #193532 50%, #64C7BE 100%)",
    },
  ],
  limpieza: [
    {
      id: "demo-limpieza-1",
      name: "Laura Benitez",
      trade: "Limpieza",
      city: "Fernando de la Mora",
      distance: "3.1 km",
      rating: "4.8",
      jobs: 86,
      available: "Hoy",
      image: "linear-gradient(135deg, #0d0d0d 0%, #42B5AA 58%, #f7f8fa 100%)",
    },
  ],
};

function fallbackWorkers(service) {
  return fallbackByService[service] || [
    {
      id: "demo-worker",
      name: "Trabajador ManosYA",
      trade: "Verificado",
      city: "Cerca tuyo",
      distance: "",
      rating: "5.0",
      jobs: 1,
      available: "Disponible",
      image: "linear-gradient(135deg, #050505 0%, #223 42%, #64C7BE 100%)",
    },
  ];
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service") || "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      const supabase = createClient(url, key, {
        auth: {
          persistSession: false,
        },
      });
      const workers = await fetchWorkerFeed(supabase, { service, limit: 80 });
      return NextResponse.json({
        workers: workers.length ? workers : fallbackWorkers(service),
        source: workers.length ? "supabase" : "fallback-empty",
      });
    } catch (error) {
      return NextResponse.json(
        {
          workers: fallbackWorkers(service),
          source: "supabase-error",
          error: error?.message || "No se pudo cargar trabajadores.",
        }
      );
    }
  }

  return NextResponse.json({
    workers: fallbackWorkers(service),
    source: "manosya-premium",
    note: "Configura NEXT_PUBLIC_SUPABASE_URL y keys para leer public.worker_feed_view.",
  });
}
