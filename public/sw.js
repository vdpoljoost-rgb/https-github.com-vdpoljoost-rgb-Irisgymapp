/* Simple offline-first service worker for Joost HIT App */
const VERSION = "v3";
const STATIC_CACHE = `hit-static-${VERSION}`;
const HTML_CACHE = `hit-html-${VERSION}`;
const STATIC_ASSETS = [
  "/", "/index.html",
  "/manifest.webmanifest",
  "/unnamed-192.png", "/unnamed-512.png",
  "/splash.png"
];

// Install: warm up caches
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      await staticCache.addAll(STATIC_ASSETS);
    })()
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, HTML_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Strategy helpers
async function networkFirstHTML(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(HTML_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cache = await caches.open(HTML_CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    // fallback naar shell
    const shell = await caches.match("/index.html");
    return shell || new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await fetchPromise) || new Response(null, { status: 504 });
}

// Fetch routing
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Alleen GET cachen
  if (request.method !== "GET") return;

  // HTML documents -> network-first (houd app vers)
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstHTML(request));
    return;
  }

  // App shell & assets -> stale-while-revalidate
  if (
    url.pathname.startsWith("/src/") || // Vite bundels
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.startsWith("/.well-known/")
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: probeer network, anders cache
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      return cached || new Response(null, { status: 504 });
    })
  );
});
