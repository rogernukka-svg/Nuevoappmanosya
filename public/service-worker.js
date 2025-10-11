/* =====================================================
   📱 ManosYA — Service Worker
   Funciona con Next.js / Netlify / Vercel.
   - Cachea rutas, assets y API requests básicos.
   - Actualiza automáticamente cuando hay nueva versión.
   ===================================================== */

const CACHE_NAME = "manosya-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/offline.html"
];

// Instalar y cachear assets iniciales
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Cache inicial creada");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activar nuevo service worker y limpiar viejos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  console.log("✅ Service Worker activo y limpio");
});

// Interceptar requests
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // ⚙️ Ignorar llamadas a Supabase o APIs externas (para evitar problemas)
  if (req.url.includes("supabase.co")) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match("/offline.html"));
    })
  );
});
