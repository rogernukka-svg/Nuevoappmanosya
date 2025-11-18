/* =====================================================
   📱 ManosYA — Service Worker (PWA + PUSH Notifications)
   Funciona con Next.js / Vercel / Render / Netlify
   - Cachea rutas, assets y API requests básicos.
   - Recibe notificaciones push aunque la app esté cerrada.
   - Abre la pantalla /worker cuando se toca la notificación.
   ===================================================== */

const CACHE_NAME = "manosya-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/offline.html"
];

/* ===========================
   📦 INSTALACIÓN DEL SW
=========================== */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Cache inicial creada");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

/* ===========================
   🔄 ACTIVACIÓN Y LIMPIEZA
=========================== */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  console.log("✅ Service Worker activo y limpio");
  self.clientsClaim();
});

/* ===========================
   🌐 FETCH / OFFLINE
=========================== */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.url.includes("supabase.co")) return; // No cachear Supabase

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

/* ===========================
   🔔 PUSH NOTIFICATIONS
=========================== */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error("❌ Error en push:", e);
  }

  const title = data.title || "ManosYA";
  const options = {
    body: data.body || "Tienes una nueva notificación",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: { url: data.url || "/worker" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ===========================
   👆 CLICK EN NOTIFICACIÓN
=========================== */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/worker";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
