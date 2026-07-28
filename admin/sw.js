// ==========================================================
// SERVICE WORKER - DASHBOARD ADMIN (PWA)
// ==========================================================
const CACHE_NAME = "warungmakan-admin-v1";
const PRECACHE_URLS = [
  "/admin/index.html",
  "/admin/dashboard.html",
  "/admin/assets/css/admin.css",
  "/admin/assets/js/admin-api.js",
  "/admin/assets/js/admin-layout.js",
  "/assets/images/icon-192.png",
  "/assets/images/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request ke Worker API — data admin harus selalu real-time
  if (url.pathname.startsWith("/api/")) return;
  if (url.hostname.endsWith("workers.dev")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && event.request.method === "GET") {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
