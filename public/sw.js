/**
 * MCQ Pro Service Worker — Offline Shell Cache
 *
 * Strategy:
 * - App Shell (HTML, CSS, JS): Cache First → update in background
 * - API calls: Network First → fall back to generic offline response
 * - Images: Cache First with 30-day expiry
 *
 * This provides an "offline shell" — the app loads instantly even without
 * network, but exam submission and live data require connectivity.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `mcqpro-shell-${CACHE_VERSION}`;
const IMAGE_CACHE = `mcqpro-images-${CACHE_VERSION}`;

const SHELL_URLS = [
  "/",
  "/student",
  "/auth/login",
  "/offline",
];

const OFFLINE_RESPONSE = new Response(
  JSON.stringify({ error: "offline", message: "You are offline. Please reconnect." }),
  { status: 503, headers: { "Content-Type": "application/json" } }
);

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// ─── Activate — clean old caches ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept cross-origin, WebSockets, or non-GET requests
  if (url.origin !== self.location.origin) return;
  if (request.method !== "GET") return;
  if (request.headers.get("upgrade") === "websocket") return;

  // API routes: Network First — never serve stale API data
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => OFFLINE_RESPONSE.clone())
    );
    return;
  }

  // Images: Cache First with background update
  if (
    request.destination === "image" ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg)$/)
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
          return cached ?? networkFetch;
        })
      )
    );
    return;
  }

  // Shell + navigation: Cache First → Network → Offline Shell
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request)
          .then((response) => {
            if (response.ok && url.pathname.startsWith("/student")) {
              caches.open(SHELL_CACHE).then((c) => c.put(request, response.clone()));
            }
            return response;
          })
          .catch(() =>
            caches.match("/student").then((shell) => shell ?? OFFLINE_RESPONSE.clone())
          )
    )
  );
});
