export const SERVICE_CATALOG = [
  { slug: "plomeria", name: "Plomeria", badge: "Urgente" },
  { slug: "electricidad", name: "Electricidad", badge: "Urgente" },
  { slug: "limpieza", name: "Limpieza", badge: "Por hora" },
  { slug: "construccion", name: "Construccion", badge: "Obra" },
  { slug: "albanileria", name: "Albanileria", badge: "Obra" },
  { slug: "pintura", name: "Pintura", badge: "Obra" },
  { slug: "jardineria", name: "Jardineria", badge: "Agenda" },
  { slug: "auxilio-vehicular", name: "Auxilio vehicular", badge: "Ahora" },
  { slug: "mecanica", name: "Mecanica", badge: "Urgente" },
  { slug: "fletes", name: "Fletes y mudanzas", badge: "Cotizar" },
  { slug: "refrigeracion", name: "Refrigeracion", badge: "Agenda" },
  { slug: "belleza", name: "Belleza", badge: "Turnos" },
  { slug: "servicio-general", name: "Servicio general", badge: "General" },
];

export function normalizeService(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getServiceLabel(value) {
  const slug = normalizeService(value);
  return SERVICE_CATALOG.find((item) => item.slug === slug)?.name || value || "Servicio";
}
