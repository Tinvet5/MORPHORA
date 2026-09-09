(() => {
  "use strict";

  const config = window.MORPHORA_CONFIG || {};
  const enabled = Boolean(config.debugPerformance);
  const marks = new Map();
  const prefetched = new Set();

  function now() {
    return window.performance && typeof window.performance.now === "function"
      ? window.performance.now()
      : Date.now();
  }

  function log(label, detail = null) {
    if (!enabled) return;
    if (detail === null) {
      console.info(`[MORPHORA performance] ${label}`);
    } else {
      console.info(`[MORPHORA performance] ${label}`, detail);
    }
  }

  function mark(name, detail = null) {
    const timestamp = now();
    marks.set(name, timestamp);
    if (window.performance && typeof window.performance.mark === "function") {
      try {
        window.performance.mark(`morphora:${name}`);
      } catch (error) {
        // Native marks are optional; the internal timer remains available.
      }
    }
    log(`${name} @ ${timestamp.toFixed(1)} ms`, detail);
    return timestamp;
  }

  function measure(name, startName, endName = null, detail = null) {
    const start = marks.get(startName);
    const end = endName ? marks.get(endName) : now();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    const duration = Math.max(0, end - start);
    log(`${name}: ${duration.toFixed(1)} ms`, detail);
    return duration;
  }

  function begin(name, detail = null) {
    const startName = `${name}:start`;
    mark(startName, detail);
    return (endDetail = null) => {
      const endName = `${name}:end`;
      mark(endName, endDetail);
      return measure(name, startName, endName, endDetail);
    };
  }

  function shouldPrefetch() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return true;
    if (connection.saveData && !config.prefetchOnSaveData) return false;
    return !["slow-2g", "2g"].includes(connection.effectiveType);
  }

  function versionedPath(path) {
    const version = config.version || "4.8.2";
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}v=${encodeURIComponent(version)}`;
  }

  async function prefetchJson(path) {
    if (!path || prefetched.has(`json:${path}`) || !shouldPrefetch()) return false;
    prefetched.add(`json:${path}`);
    try {
      const response = await fetch(versionedPath(path), {
        headers: { Accept: "application/json" },
        cache: "force-cache",
        priority: "low"
      });
      log(`Prefetched JSON ${path}`, { ok: response.ok, status: response.status });
      return response.ok;
    } catch (error) {
      log(`JSON prefetch skipped for ${path}`, error.message);
      return false;
    }
  }

  function prefetchAsset(path, { as = "image" } = {}) {
    if (!path || prefetched.has(`asset:${path}`) || !shouldPrefetch()) return false;
    prefetched.add(`asset:${path}`);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = as;
    link.href = path;
    link.dataset.morphoraPrefetch = "true";
    document.head.appendChild(link);
    log(`Queued asset prefetch ${path}`);
    return true;
  }

  function announceConnectionState() {
    let element = document.getElementById("offlineStatus");
    if (!element) {
      element = document.createElement("div");
      element.id = "offlineStatus";
      element.className = "offline-status";
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", "polite");
      document.body.appendChild(element);
    }

    const offline = !navigator.onLine;
    document.documentElement.classList.toggle("is-offline", offline);
    element.hidden = !offline;
    element.textContent = offline
      ? "You are offline. Previously opened MORPHORA content may remain available."
      : "Connection restored.";

    if (window.MorphoraA11y && typeof window.MorphoraA11y.announce === "function") {
      window.MorphoraA11y.announce(element.textContent);
    }

    if (!offline) {
      window.setTimeout(() => {
        if (navigator.onLine && element) element.hidden = true;
      }, 2500);
    }
  }

  async function registerServiceWorker() {
    if (!config.enableServiceWorker || !("serviceWorker" in navigator)) return;
    if (!window.isSecureContext && location.hostname !== "localhost") return;

    try {
      const registration = await navigator.serviceWorker.register(
        `${config.serviceWorkerPath || "service-worker.js"}?v=${encodeURIComponent(config.version || "4.8.2")}`
      );
      log("Service worker registered", { scope: registration.scope });
    } catch (error) {
      console.warn("MORPHORA service worker registration failed.", error);
    }
  }

  window.addEventListener("online", announceConnectionState);
  window.addEventListener("offline", announceConnectionState);
  window.addEventListener("load", () => {
    mark("window-load");
    announceConnectionState();
    registerServiceWorker();
  });

  mark("performance-module-ready");

  window.MorphoraPerformance = Object.freeze({
    enabled,
    mark,
    measure,
    begin,
    prefetchJson,
    prefetchAsset,
    shouldPrefetch,
    versionedPath
  });
})();
