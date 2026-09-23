const CACHE_NAME = "daih-pwa-v1";

const PRECACHE_ASSETS = [
  "/offline",
  "/manifest.json",
  "/icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/images/icon.png",
  "/images/icon-192.png",
  "/images/icon-512.png",
  "/images/logo.png",
];

// Install: Pre-cache critical offline shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[SW] Pre-cache failed:", err)),
  );
});

// Activate: Purge obsolete caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: Network-first for navigation, cache-first/stale-while-revalidate for assets
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== "GET") return;
  if (!request.url.startsWith("http://") && !request.url.startsWith("https://"))
    return;

  const url = new URL(request.url);

  // Strictly bypass API and identity authentication endpoints
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/identity/") ||
    url.hostname.includes("accounts.google.com") ||
    url.hostname.includes("paystack.co")
  ) {
    return;
  }

  // Navigation requests: Network-First with Offline Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlinePage = await caches.match("/offline");
          return offlinePage || Response.error();
        }),
    );
    return;
  }

  // Static Assets (_next/static, images, styles, fonts): Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }),
    );
  }
});
