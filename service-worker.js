const CACHE_PREFIX = "agrocanary-static-";
// Increment this version whenever a precached file changes.
const CACHE_NAME = `${CACHE_PREFIX}v9`;
const APP_SHELL = [
  "/",
  "/index.html",
  "/productores.html",
  "/para-productores.html",
  "/perfil-productor.html",
  "/privacidad.html",
  "/condiciones.html",
  "/styles.css",
  "/script.js",
  "/productores-data.js",
  "/productores.js",
  "/pwa.js",
  "/manifest.webmanifest",
  "/assets/favicon.svg",
  "/assets/logo.svg",
  "/assets/hero-canarias.jpg",
  "/assets/icons/apple-touch-icon.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheSuccessfulResponse(request, response) {
  const canCache =
    response.status === 200 &&
    response.type === "basic" &&
    !request.headers.has("range");

  if (canCache) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    } catch {
      // A valid network response must not fail because Cache Storage is unavailable.
    }
  }
  return response;
}

async function networkFirst(request, fallbackUrl = null) {
  try {
    const response = await fetch(request);
    return cacheSuccessfulResponse(request, response);
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallbackUrl) return caches.match(fallbackUrl);
    throw new Error("Recurso no disponible sin conexion.");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/index.html"));
    return;
  }

  if (/\.(?:css|js)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || networkFirst(request)),
  );
});
