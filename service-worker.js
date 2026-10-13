"use strict";

// V5.0.5 final hardening — cache-coherent runtime with route-aware offline recovery

importScripts("./release-meta.js", "./app-config.js");
const VERSION = self.MORPHORA_CONFIG?.version || "5.0.5";
const ASSET_VERSION = self.MORPHORA_CONFIG?.assetVersion || self.MORPHORA_RELEASE?.assetVersion || `${VERSION}-dev`;
const CACHE_TOKEN = String(ASSET_VERSION).replace(/[^a-zA-Z0-9._-]/g, "-");
const SHELL_CACHE = `morphora-shell-${CACHE_TOKEN}`;
const RUNTIME_CACHE = `morphora-runtime-${CACHE_TOKEN}`;
const DATA_CACHE = `morphora-data-${CACHE_TOKEN}`;
const TILE_CACHE = `morphora-tiles-${CACHE_TOKEN}`;
const RUNTIME_LIMIT = self.MORPHORA_CONFIG?.serviceWorkerRuntimeCacheMaxEntries || 220;
const DATA_LIMIT = self.MORPHORA_CONFIG?.serviceWorkerDataCacheMaxEntries || 100;
const TILE_LIMIT = self.MORPHORA_CONFIG?.serviceWorkerTileCacheMaxEntries || 700;

const APP_SHELL = [
  "./",
  "./index.html",
  "./studio.html",
  "./dev-tools.html",
  "./performance-lab.html",
  "./histology.html",
  "./histology-poc.html",
  "./histology/histology-menu.css",
  "./histology/histology-menu.js",
  "./histology/histology-poc.css",
  "./histology/histology-poc.js",
  "./histology/histology-source-provider.js",
  "./assets/histology/histology-hero-clean.webp",
  "./assets/histology/morphora-histology-icon.png",
  "./histology/catalog.json",
  "./histology/slides/48515-2.json",
  "./histology/slides/hueso-1.json",
  "./histology/slides/hueso-2.json",
  "./histology/slides/hueso-3.json",
  "./histology/slides/hueso-4.json",
  "./histology/slides/hueso-5.json",
  "./dev-tools.css",
  "./dev-tools.js",
  "./performance-lab.css",
  "./performance-lab.js",
  "./release-meta.js",
  "./app-config.js",
  "./models.js",
  "./storage.js",
  "./backend-config.js",
  "./backend/supabase-loader.js",
  "./backend/backend-client.js",
  "./backend/auth-service.js",
  "./backend/local-vault.js",
  "./backend/profile-service.js",
  "./backend/sync-service.js",
  "./backend/cloud-sync-engine.js",
  "./backend/bookmarks-service.js",
  "./backend/personal-sync-service.js",
  "./backend/histology-sync-service.js",
  "./backend/data-service.js",
  "./backend/preferences-service.js",
  "./backend/bookmarks-ui.js",
  "./backend/sync-center-ui.js",
  "./backend/account-ui.js",
  "./i18n/language-manager.js",
  "./i18n/es.json",
  "./i18n/en.json",
  "./validation/rules.js",
  "./performance.js",
  "./accessibility.js",
  "./style.css",
  "./design-system.css",
  "./script.js",
  "./study.js",
  "./drawing.js",
  "./navigation.js",
  "./studio/studio.css",
  "./studio/storage.js",
  "./studio/studio.js",
  "./assets/branding/morphora-icon-primary.svg",
  "./assets/branding/morphora-icon-white.svg",
  "./assets/branding/morphora-logo-primary.svg",
  "./assets/branding/morphora-logo-white.svg",
  "./data/catalog.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const current = [SHELL_CACHE, RUNTIME_CACHE, DATA_CACHE, TILE_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("morphora-") && !current.includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isJsonRequest(request) {
  const url = new URL(request.url);
  return url.pathname.endsWith(".json") || request.headers.get("Accept")?.includes("application/json");
}

function isDeepZoomTile(request) {
  const pathname = new URL(request.url).pathname.toLowerCase();
  return pathname.includes("_files/") && /\.(?:jpe?g|png|webp)$/.test(pathname);
}

function isCoreCodeAsset(request) {
  const pathname = new URL(request.url).pathname.toLowerCase();
  return /\.(?:js|css)$/.test(pathname);
}

function isStaticAsset(request) {
  const pathname = new URL(request.url).pathname.toLowerCase();
  return /\.(?:svg|png|jpe?g|webp|dzi|xml)$/.test(pathname);
}

async function trimCache(cacheName, maxEntries) {
  if (!Number.isFinite(maxEntries) || maxEntries <= 0) return;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.slice(0, keys.length - maxEntries);
  await Promise.all(excess.map((request) => cache.delete(request)));
}

async function putBounded(cacheName, request, response, maxEntries) {
  if (!response?.ok) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    // Run trimming after the response has been returned to the caller; this is
    // deliberately simple FIFO retention because every release gets its own
    // versioned cache namespace.
    trimCache(cacheName, maxEntries).catch(() => {});
  } catch (_) {
    // Storage quota pressure should never make the network request fail.
  }
}

async function networkFirst(request, cacheName, maxEntries) {
  try {
    const response = await fetch(request);
    putBounded(cacheName, request, response, maxEntries);
    return response;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}


async function networkFirstExact(request, cacheName, maxEntries) {
  try {
    const response = await fetch(request);
    putBounded(cacheName, request, response, maxEntries);
    return response;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  const networkPromise = fetch(request)
    .then((response) => {
      putBounded(cacheName, request, response, maxEntries);
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => null);
    return cached;
  }

  return (await networkPromise) || Response.error();
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  putBounded(cacheName, request, response, maxEntries);
  return response;
}

async function offlineNavigationFallback(request) {
  const cache = await caches.open(SHELL_CACHE);
  const url = new URL(request.url);
  const file = url.pathname.split("/").filter(Boolean).at(-1) || "index.html";
  const allowed = new Set(["index.html", "studio.html", "dev-tools.html", "performance-lab.html", "histology.html", "histology-poc.html"]);
  const target = allowed.has(file) ? file : "index.html";
  const scopedUrl = new URL(`./${target}`, self.registration.scope).href;
  return (await cache.match(scopedUrl, { ignoreSearch: true })) || (await cache.match("./index.html", { ignoreSearch: true })) || Response.error();
}

self.addEventListener("message", (event) => {
  const type = event?.data?.type;
  if (type === "MORPHORA_SKIP_WAITING") self.skipWaiting();
  if (type === "MORPHORA_CLEAR_RUNTIME_CACHES") {
    event.waitUntil(Promise.all([RUNTIME_CACHE, DATA_CACHE, TILE_CACHE].map((name) => caches.delete(name))));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOrigin(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, SHELL_CACHE, 40).catch(() => offlineNavigationFallback(request))
    );
    return;
  }

  if (isDeepZoomTile(request)) {
    // DZI tile URLs are immutable inside a release. Cache-first prevents a
    // redundant network request every time the user revisits a zoomed region.
    event.respondWith(cacheFirst(request, TILE_CACHE, TILE_LIMIT));
    return;
  }

  if (isJsonRequest(request)) {
    event.respondWith(networkFirst(request, DATA_CACHE, DATA_LIMIT));
    return;
  }

  if (isCoreCodeAsset(request)) {
    // Code must stay release-coherent. Query-string versions are intentional
    // and must not be ignored when falling back to cache.
    event.respondWith(networkFirstExact(request, RUNTIME_CACHE, RUNTIME_LIMIT));
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, RUNTIME_LIMIT));
  }
});
