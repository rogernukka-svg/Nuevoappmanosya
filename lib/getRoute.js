// 🗺️ /lib/getRoute.js
// Función utilitaria centralizada para obtener rutas desde OpenRouteService
// Compatible con tu endpoint interno /api/ors/route (GET y POST)

export async function getRoute({ start, end }) {
  try {
    // 🔹 Validaciones iniciales
    if (
      !start ||
      !end ||
      !Array.isArray(start) ||
      !Array.isArray(end) ||
      start.length !== 2 ||
      end.length !== 2
    ) {
      throw new Error("Coordenadas 'start' o 'end' inválidas. Deben ser [lng, lat].");
    }

    // 🔸 Construcción de la URL interna del backend
    const url = `/api/ors/route?start=${start.join(",")}&end=${end.join(",")}`;

    // 🔹 Llamada al endpoint interno (Next.js API Route)
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store", // evita respuestas antiguas
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Error al obtener ruta:", res.status, text);
      throw new Error(`Error al obtener ruta (${res.status})`);
    }

    const json = await res.json();
    const feature = json.features?.[0];

    if (!feature) {
      throw new Error("Respuesta de OpenRouteService vacía o inválida.");
    }

    // 🔸 Extraemos coordenadas y resumen
    const coords = feature.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];

    const summary = feature.properties?.summary || {};
    const distanceKm = summary.distance ? (summary.distance / 1000).toFixed(1) : null;
    const durationMin = summary.duration ? Math.round(summary.duration / 60) : null;

    return {
      coords,
      distanceKm,
      durationMin,
      raw: json, // útil para debug o futuras optimizaciones
    };
  } catch (error) {
    console.error("❌ Error en getRoute:", error);
    return {
      coords: [],
      distanceKm: null,
      durationMin: null,
      error: error.message || "Error desconocido al calcular la ruta.",
    };
  }
}
