"use strict";

importScripts("./app-config.js");
const VERSION = self.MORPHORA_CONFIG?.version || "4.8.2";
const SHELL_CACHE = `morphora-shell-${VERSION}`;
const RUNTIME_CACHE = `morphora-runtime-${VERSION}`;
const DATA_CACHE = `morphora-data-${VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./studio.html",
  "./app-config.js",
  "./performance.js",
  "./accessibility.js",
  "./style.css",
  "./script.js",
  "./study.js",
  "./drawing.js",
  "./navigation.js",
  "./studio/studio.css",
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
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("morphora-") && ![SHELL_CACHE, RUNTIME_CACHE, DATA_CACHE].includes(key))
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

function isStaticAsset(request) {
  const pathname = new URL(request.url).pathname.toLowerCase();
  return /\.(?:css|js|svg|png|jpe?g|webp|dzi|xml)$/.test(pathname) || pathname.includes("_files/");
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => null);
    return cached;
  }

  return (await networkPromise) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOrigin(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (isJsonRequest(request)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});
