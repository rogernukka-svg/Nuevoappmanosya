self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text?.() || "" };
  }

  const title = payload.title || "ManosYA";
  const options = {
    body: payload.body || payload.message || "Tenes una nueva notificacion.",
    icon: payload.icon || "/icon-192x192.png",
    badge: payload.badge || "/icon-192x192.png",
    tag: payload.tag || "manosya-notification",
    renotify: true,
    requireInteraction: Boolean(payload.requireInteraction),
    vibrate: payload.vibrate || [180, 80, 180],
    data: {
      url: payload.url || "/worker",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification?.data?.url || "/worker", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return null;
    })
  );
});
