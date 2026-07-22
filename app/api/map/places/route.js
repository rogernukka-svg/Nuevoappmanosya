import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ASUNCION = { lat: -25.2867, lng: -57.3333 };

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const service = searchParams.get("service") || "";
  const query = searchParams.get("q") || "";
  const origin = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : ASUNCION;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let places = [];

  if (url && key) {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const [workers, suppliers] = await Promise.all([
      fetchWorkers(supabase, service),
      fetchSuppliers(supabase),
    ]);

    places = [
      ...workers.map((item) => normalizeWorker(item, origin)),
      ...suppliers.map((item) => normalizeSupplier(item, origin)),
    ].filter(Boolean);
  }

  if (!places.length) {
    places = demoPlaces(origin);
  }

  places = query ? places.filter((place) => searchableText(place).includes(normalizeText(query))) : places;
  places.sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json({
    center: origin,
    places,
  });
}

async function fetchWorkers(supabase, service) {
  try {
    let query = supabase
      .from("map_workers_view")
      .select("user_id,full_name,phone,avatar_url,headline,skills,city,lat,lng,rating,completed_jobs,response_minutes,is_available,media_url,media_type")
      .limit(80);

    if (service) query = query.contains("skills", [service]);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch {
    try {
      let fallback = supabase
        .from("map_workers_view")
        .select("user_id,full_name,avatar_url,headline,skills,city,lat,lng,rating,completed_jobs,response_minutes,is_available,media_url,media_type")
        .limit(80);
      if (service) fallback = fallback.contains("skills", [service]);
      const { data } = await fallback;
      return data || [];
    } catch {
      return [];
    }
  }
}

async function fetchSuppliers(supabase) {
  try {
    const { data, error } = await supabase
      .from("map_suppliers_view")
      .select("user_id,business_name,category,city,address,phone,lat,lng,logo_url,product_title,product_description,media_url,price,has_delivery")
      .limit(80);

    if (error) throw error;
    return data || [];
  } catch {
    try {
      const { data } = await supabase
        .from("map_suppliers_view")
        .select("user_id,business_name,category,city,address,lat,lng,logo_url,product_title,product_description,media_url,price")
        .limit(80);
      return data || [];
    } catch {
      return [];
    }
  }
}

function normalizeWorker(worker, origin) {
  const lat = Number(worker.lat);
  const lng = Number(worker.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: worker.user_id,
    type: "worker",
    name: worker.full_name || "Trabajador ManosYA",
    title: worker.headline || "Trabajador verificado",
    subtitle: worker.is_available ? "Disponible ahora" : responseLabel(worker.response_minutes),
    phone: worker.phone || "",
    city: worker.city || "",
    skills: Array.isArray(worker.skills) ? worker.skills : [],
    avatarUrl: worker.avatar_url || "",
    mediaUrl: worker.media_url || "",
    lat,
    lng,
    distanceKm: distanceKm(origin, { lat, lng }),
    rating: Number(worker.rating || 0),
    href: `/dm/${worker.user_id}`,
    profileHref: `/worker/${worker.user_id}`,
  };
}

function normalizeSupplier(supplier, origin) {
  const lat = Number(supplier.lat);
  const lng = Number(supplier.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: supplier.user_id,
    type: "supplier",
    name: supplier.business_name || "Proveedor ManosYA",
    title: supplier.product_title || supplier.category || "Insumos disponibles",
    subtitle: supplier.address || supplier.city || "Local digital",
    phone: supplier.phone || "",
    city: supplier.city || "",
    address: supplier.address || "",
    category: supplier.category || "",
    hasDelivery: Boolean(supplier.has_delivery),
    avatarUrl: supplier.logo_url || "",
    mediaUrl: supplier.media_url || "",
    lat,
    lng,
    distanceKm: distanceKm(origin, { lat, lng }),
    rating: 0,
    href: `/dm/${supplier.user_id}`,
    profileHref: `/supplier/profile?id=${supplier.user_id}`,
  };
}

function demoPlaces(origin) {
  return [
    {
      id: "demo-worker-map",
      type: "worker",
      name: "Carlos Medina",
      title: "Electricista",
      subtitle: "Disponible ahora",
      phone: "+595981000001",
      city: "Asuncion",
      skills: ["electricidad", "urgencias"],
      avatarUrl: "",
      mediaUrl: "",
      lat: origin.lat + 0.006,
      lng: origin.lng + 0.004,
      distanceKm: 1.1,
      rating: 4.9,
      href: "/dm/demo-worker-map",
      profileHref: "/client",
    },
    {
      id: "demo-supplier-map",
      type: "supplier",
      name: "Proveedor Centro",
      title: "Cables y herramientas",
      subtitle: "Local digital",
      phone: "+595981000002",
      city: "Asuncion",
      address: "Av. San Blas",
      category: "Insumos",
      hasDelivery: true,
      avatarUrl: "",
      mediaUrl: "",
      lat: origin.lat - 0.005,
      lng: origin.lng - 0.006,
      distanceKm: 1.4,
      rating: 0,
      href: "/dm/demo-supplier-map",
      profileHref: "/supplier/profile",
    },
  ];
}

function distanceKm(origin, target) {
  const radius = 6371;
  const dLat = toRad(target.lat - origin.lat);
  const dLng = toRad(target.lng - origin.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(origin.lat)) * Math.cos(toRad(target.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function toRad(value) {
  return value * Math.PI / 180;
}

function responseLabel(minutes) {
  const value = Number(minutes || 0);
  if (!value) return "Perfil verificado";
  if (value < 60) return `Responde en ${value} min`;
  return "Responde hoy";
}

function searchableText(place) {
  return normalizeText([
    place.name,
    place.title,
    place.subtitle,
    place.city,
    place.address,
    place.category,
    ...(Array.isArray(place.skills) ? place.skills : []),
  ].filter(Boolean).join(" "));
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
