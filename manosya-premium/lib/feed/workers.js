import { SERVICE_CATALOG, normalizeService } from "@/lib/services/catalog";

export const WORKER_FEED_SELECT = `
  user_id,
  full_name,
  avatar_url,
  is_verified,
  headline,
  bio,
  skills,
  city,
  lat,
  lng,
  rating,
  completed_jobs,
  response_minutes,
  is_available,
  cover_url,
  post_id,
  caption,
  media_url,
  media_type
`;

export async function fetchWorkerFeed(supabase, { service = "", limit = 40 } = {}) {
  if (!supabase) return [];

  let query = supabase
    .from("worker_feed_view")
    .select(WORKER_FEED_SELECT)
    .limit(limit);

  const serviceSlug = normalizeService(service);
  if (serviceSlug) {
    query = query.contains("skills", [serviceSlug]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeWorkerCard);
}

export function normalizeWorkerCard(worker) {
  const skills = Array.isArray(worker?.skills) ? worker.skills : [];
  const primarySkill = skills[0] || "servicio-general";
  const service = SERVICE_CATALOG.find((item) => item.slug === normalizeService(primarySkill));

  return {
    id: worker.user_id,
    name: worker.full_name || "Trabajador ManosYA",
    trade: worker.headline || service?.name || "Servicio general",
    city: worker.city || "Cerca tuyo",
    distance: "",
    rating: Number(worker.rating || 0).toFixed(1),
    jobs: Number(worker.completed_jobs || 0),
    available: worker.is_available ? "Disponible ahora" : responseLabel(worker.response_minutes),
    image: worker.media_url || worker.cover_url || "",
    avatarUrl: worker.avatar_url || "",
    verified: Boolean(worker.is_verified),
    mediaType: worker.media_type || "image",
    postId: worker.post_id || null,
    caption: worker.caption || worker.bio || "",
  };
}

function responseLabel(minutes) {
  const value = Number(minutes || 0);
  if (!value) return "Perfil verificado";
  if (value < 60) return `Responde en ${value} min`;
  return "Responde hoy";
}
