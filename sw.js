/* ============================================================
   Self-Loan Tracker — Service Worker
   Cache-first strategy for all app shell assets.
   Network-only for: Alpha Vantage API + Google Fonts.
   ============================================================ */

const CACHE_NAME = "slt-v3";

// App shell — everything needed to run offline
const APP_SHELL = [
  "/self-loan-tracker/",
  "/self-loan-tracker/index.html",
  "/self-loan-tracker/manifest.json",
  "/self-loan-tracker/icon-192.png",
  "/self-loan-tracker/icon-512.png",
  "/self-loan-tracker/bmc_qr.png",
  "/self-loan-tracker/inspiro-logo.png",

  // CDN dependencies (cached on first load)
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js",
];

// Domains that must ALWAYS go to the network (no caching)
const NETWORK_ONLY_HOSTS = [
  "www.alphavantage.co",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

// ── Install: pre-cache the app shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first, with network-only bypass ──────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always go to network for Alpha Vantage, Google Fonts, etc.
  if (NETWORK_ONLY_HOSTS.includes(url.hostname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Not in cache — fetch from network, then store a copy
      return fetch(event.request)
        .then((response) => {
          // Only cache valid, same-origin or CORS responses
          if (
            !response ||
            response.status !== 200 ||
            (response.type !== "basic" && response.type !== "cors")
          ) {
            return response;
          }

          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, toCache);
          });

          return response;
        })
        .catch(() => {
          // Offline fallback: return index.html for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/self-loan-tracker/index.html");
          }
        });
    })
  );
});
