(() => {
  "use strict";

  const config = window.MORPHORA_CONFIG || {};
  const Storage = window.MorphoraStorage;
  const enabled = Boolean(config.debugPerformance);
  const STORAGE_KEY = Storage?.keys.performanceHistory || "morphora:performance:v1";
  const marks = new Map();
  const prefetched = new Set();
  const activeViews = new Map();
  const resourceRecords = [];
  const longTasks = [];
  const vitals = {
    firstContentfulPaintMs: null,
    largestContentfulPaintMs: null,
    cumulativeLayoutShift: 0,
    domContentLoadedMs: null,
    loadEventMs: null
  };

  const session = {
    id: createId(),
    startedAt: new Date().toISOString(),
    page: location.pathname || "/",
    version: config.version || "4.9.8",
    assetVersion: config.assetVersion || config.version || "4.9.8-dev",
    profile: null,
    connection: getConnectionSnapshot(),
    hardware: getHardwareSnapshot(),
    views: [],
    vitals,
    longTasks,
    resources: {
      requests: 0,
      transferBytes: 0,
      encodedBytes: 0,
      decodedBytes: 0,
      tileRequests: 0,
      imageRequests: 0,
      jsonRequests: 0
    }
  };

  if (window.performance?.setResourceTimingBufferSize) {
    try {
      window.performance.setResourceTimingBufferSize(config.resourceTimingBufferSize || 1600);
    } catch (_) {
      // Optional optimization only.
    }
  }

  function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `perf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function now() {
    return window.performance && typeof window.performance.now === "function"
      ? window.performance.now()
      : Date.now();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, digits = 1) {
    if (!Number.isFinite(value)) return null;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
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
      } catch (_) {
        // Native marks are optional; internal timing remains available.
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

  function getConnectionSnapshot() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) {
      return {
        supported: false,
        effectiveType: null,
        downlinkMbps: null,
        rttMs: null,
        saveData: false
      };
    }
    return {
      supported: true,
      effectiveType: connection.effectiveType || null,
      downlinkMbps: Number.isFinite(connection.downlink) ? connection.downlink : null,
      rttMs: Number.isFinite(connection.rtt) ? connection.rtt : null,
      saveData: Boolean(connection.saveData)
    };
  }

  function getHardwareSnapshot() {
    return {
      deviceMemoryGb: Number.isFinite(navigator.deviceMemory) ? navigator.deviceMemory : null,
      hardwareConcurrency: Number.isFinite(navigator.hardwareConcurrency)
        ? navigator.hardwareConcurrency
        : null,
      coarsePointer: Boolean(window.matchMedia?.("(pointer: coarse)").matches),
      reducedMotion: Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
    };
  }

  function detectProfile() {
    const connection = getConnectionSnapshot();
    const hardware = getHardwareSnapshot();
    const memory = hardware.deviceMemoryGb;
    const cores = hardware.hardwareConcurrency;
    const slowConnection = ["slow-2g", "2g"].includes(connection.effectiveType);
    const modestConnection = connection.effectiveType === "3g";

    if (
      connection.saveData ||
      slowConnection ||
      (Number.isFinite(memory) && memory <= 2) ||
      (Number.isFinite(cores) && cores <= 2)
    ) {
      return {
        id: "constrained",
        label: "Constrained",
        reason: connection.saveData
          ? "Data Saver is enabled"
          : slowConnection
            ? `Network reports ${connection.effectiveType}`
            : Number.isFinite(memory) && memory <= 2
              ? `${memory} GB device-memory hint`
              : `${cores || 2} logical processor hint`
      };
    }

    if (
      (Number.isFinite(memory) && memory >= 8) &&
      (Number.isFinite(cores) && cores >= 8) &&
      !modestConnection &&
      !hardware.coarsePointer
    ) {
      return {
        id: "highCapacity",
        label: "High capacity",
        reason: "Higher-memory desktop-class device"
      };
    }

    return {
      id: "balanced",
      label: "Balanced",
      reason: hardware.coarsePointer
        ? "Touch device / tablet profile"
        : modestConnection
          ? "Moderate network profile"
          : "Default balanced profile"
    };
  }

  const profile = detectProfile();
  session.profile = profile;

  function getViewerOptions() {
    const profiles = config.viewerProfiles || {};
    const chosen = profiles[profile.id] || profiles.balanced || {};
    const hardware = getHardwareSnapshot();
    const basePixelRatio = Number.isFinite(chosen.minPixelRatio) ? chosen.minPixelRatio : 0.75;
    return {
      // OpenSeadragon recommends immediate rendering on mobile-class devices;
      // preserve the explicit profile value and also enable it for coarse touch.
      immediateRender: Boolean(chosen.immediateRender || hardware.coarsePointer),
      imageLoaderLimit: Number.isFinite(chosen.imageLoaderLimit) ? chosen.imageLoaderLimit : 6,
      maxImageCacheCount: Number.isFinite(chosen.maxImageCacheCount) ? chosen.maxImageCacheCount : 140,
      minPixelRatio: hardware.coarsePointer ? Math.max(basePixelRatio, 1.0) : basePixelRatio,
      tileRetryMax: 1,
      tileRetryDelay: 800
    };
  }

  function getTileCacheTrimThreshold() {
    const profiles = config.viewerProfiles || {};
    const chosen = profiles[profile.id] || profiles.balanced || {};
    return Number.isFinite(chosen.trimTileCacheAbove) ? chosen.trimTileCacheAbove : 170;
  }

  function shouldPrefetch() {
    if (document.visibilityState && document.visibilityState !== "visible") return false;
    if (profile.id === "constrained") return false;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return true;
    if (connection.saveData && !config.prefetchOnSaveData) return false;
    return !["slow-2g", "2g"].includes(connection.effectiveType);
  }

  function versionedPath(path) {
    const version = config.assetVersion || config.version || "4.9.8-dev";
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

  function startView(viewId, detail = {}) {
    if (!viewId) return null;
    const started = now();
    const item = {
      id: createId(),
      viewId,
      startedAtMs: started,
      startedAt: new Date().toISOString(),
      source: detail.source || null,
      imageType: detail.imageType || null,
      fromDataCache: Boolean(detail.fromDataCache),
      stages: { requested: 0 },
      durations: {},
      completed: false,
      cancelled: false,
      resourceStartIndex: resourceRecords.length
    };
    activeViews.set(viewId, item);
    mark(`view:${viewId}:perf-requested`, detail);
    return item;
  }

  function recordViewStage(viewId, stage, detail = {}) {
    const item = activeViews.get(viewId);
    if (!item || item.cancelled) return null;
    const elapsed = Math.max(0, now() - item.startedAtMs);
    item.stages[stage] = round(elapsed);
    if (detail.imageType) item.imageType = detail.imageType;
    if (Object.prototype.hasOwnProperty.call(detail, "fromDataCache")) {
      item.fromDataCache = Boolean(detail.fromDataCache);
    }
    if (Number.isFinite(detail.labels)) item.labels = detail.labels;
    log(`View ${viewId} stage ${stage}: ${elapsed.toFixed(1)} ms`, detail);
    return elapsed;
  }

  function summarizeViewResources(item) {
    const relevant = resourceRecords.slice(item.resourceStartIndex);
    const sameView = relevant.filter((entry) => {
      if (!item.source) return true;
      const viewToken = item.viewId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      return entry.name.toLowerCase().includes(viewToken) || entry.name.includes(item.source);
    });
    const entries = sameView.length ? sameView : relevant;
    return {
      requests: entries.length,
      transferBytes: entries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      durationMs: round(entries.reduce((sum, entry) => sum + (entry.duration || 0), 0))
    };
  }

  function completeView(viewId, detail = {}) {
    const item = activeViews.get(viewId);
    if (!item || item.completed || item.cancelled) return item || null;
    const elapsed = Math.max(0, now() - item.startedAtMs);
    item.completed = true;
    item.completedAtMs = now();
    item.totalMs = round(elapsed);
    item.completedAt = new Date().toISOString();
    item.mode = detail.mode || item.mode || null;
    item.resources = summarizeViewResources(item);
    item.durations = {
      dataMs: item.stages.dataReady ?? null,
      viewerOpenMs: item.stages.viewerOpen ?? null,
      firstTileMs: item.stages.firstTile ?? null,
      totalMs: item.totalMs
    };
    activeViews.delete(viewId);
    session.views.push(item);
    const maxViews = config.storedPerformanceViews || 50;
    if (session.views.length > maxViews) session.views.splice(0, session.views.length - maxViews);
    persistSession();
    document.dispatchEvent(new CustomEvent("morphora:performance-view-complete", { detail: item }));
    log(`View ${viewId} complete`, item);
    return item;
  }

  function cancelView(viewId, reason = "cancelled") {
    const item = activeViews.get(viewId);
    if (!item || item.completed) return;
    item.cancelled = true;
    item.cancelReason = reason;
    item.cancelledAtMs = now();
    activeViews.delete(viewId);
    log(`View ${viewId} cancelled`, reason);
  }

  function observePerformance() {
    if (!("PerformanceObserver" in window)) return;

    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            vitals.firstContentfulPaintMs = round(entry.startTime);
          }
        }
      });
      paintObserver.observe({ type: "paint", buffered: true });
    } catch (_) {}

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) vitals.largestContentfulPaintMs = round(last.startTime);
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch (_) {}

    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            vitals.cumulativeLayoutShift = round(
              (vitals.cumulativeLayoutShift || 0) + entry.value,
              4
            );
          }
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch (_) {}

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push({
            startTimeMs: round(entry.startTime),
            durationMs: round(entry.duration)
          });
        }
        if (longTasks.length > 100) longTasks.splice(0, longTasks.length - 100);
      });
      longTaskObserver.observe({ type: "longtask", buffered: true });
    } catch (_) {}

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) recordResource(entry);
      });
      resourceObserver.observe({ type: "resource", buffered: true });
    } catch (_) {
      window.setTimeout(captureExistingResources, 0);
    }
  }

  function resourceKind(name, initiatorType) {
    const path = String(name || "").toLowerCase();
    if (path.includes("_files/") && /\.(jpe?g|png|webp)(?:\?|$)/.test(path)) return "tile";
    if (path.endsWith(".json") || path.includes(".json?")) return "json";
    if (initiatorType === "img" || /\.(jpe?g|png|webp|svg)(?:\?|$)/.test(path)) return "image";
    return initiatorType || "other";
  }

  function recordResource(entry) {
    if (!entry?.name) return;
    const record = {
      name: entry.name,
      initiatorType: entry.initiatorType || "other",
      kind: resourceKind(entry.name, entry.initiatorType),
      startTime: round(entry.startTime),
      duration: round(entry.duration),
      transferSize: Number.isFinite(entry.transferSize) ? entry.transferSize : 0,
      encodedBodySize: Number.isFinite(entry.encodedBodySize) ? entry.encodedBodySize : 0,
      decodedBodySize: Number.isFinite(entry.decodedBodySize) ? entry.decodedBodySize : 0
    };
    resourceRecords.push(record);
    if (resourceRecords.length > 2000) resourceRecords.splice(0, resourceRecords.length - 2000);
    session.resources.requests += 1;
    session.resources.transferBytes += record.transferSize;
    session.resources.encodedBytes += record.encodedBodySize;
    session.resources.decodedBytes += record.decodedBodySize;
    if (record.kind === "tile") session.resources.tileRequests += 1;
    if (record.kind === "image") session.resources.imageRequests += 1;
    if (record.kind === "json") session.resources.jsonRequests += 1;
  }

  function captureExistingResources() {
    const entries = performance.getEntriesByType?.("resource") || [];
    const known = new Set(resourceRecords.map((entry) => `${entry.name}|${entry.startTime}`));
    for (const entry of entries) {
      const key = `${entry.name}|${round(entry.startTime)}`;
      if (!known.has(key)) recordResource(entry);
    }
  }

  function captureNavigationTiming() {
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    if (!nav) return;
    vitals.domContentLoadedMs = round(nav.domContentLoadedEventEnd);
    vitals.loadEventMs = round(nav.loadEventEnd || nav.duration);
  }

  function getMemorySnapshot() {
    const memory = performance.memory;
    if (!memory) return null;
    return {
      usedJsHeapBytes: memory.usedJSHeapSize || null,
      totalJsHeapBytes: memory.totalJSHeapSize || null,
      jsHeapLimitBytes: memory.jsHeapSizeLimit || null
    };
  }

  async function getStorageSnapshot() {
    if (!navigator.storage?.estimate) return null;
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usageBytes: estimate.usage || 0,
        quotaBytes: estimate.quota || 0,
        usageRatio: estimate.quota ? round(estimate.usage / estimate.quota, 4) : null
      };
    } catch (_) {
      return null;
    }
  }

  async function getCacheSnapshot() {
    if (!("caches" in window)) return null;
    try {
      const names = await caches.keys();
      const relevant = names.filter((name) => name.startsWith("morphora-"));
      const values = [];
      for (const name of relevant) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        values.push({ name, entries: keys.length });
      }
      return values;
    } catch (_) {
      return null;
    }
  }

  function loadHistory() {
    const parsed = Storage?.readJSON
      ? Storage.readJSON(STORAGE_KEY, { fallback: [] })
      : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  function persistSession() {
    try {
      captureNavigationTiming();
      const history = loadHistory().filter((entry) => entry?.id !== session.id);
      const summary = {
        ...session,
        connection: getConnectionSnapshot(),
        hardware: getHardwareSnapshot(),
        memory: getMemorySnapshot(),
        endedAt: new Date().toISOString()
      };
      history.push(summary);
      const maxSessions = config.storedPerformanceSessions || 12;
      if (history.length > maxSessions) history.splice(0, history.length - maxSessions);
      const result = Storage?.writeJSON ? Storage.writeJSON(STORAGE_KEY, history) : { ok: false };
      if (!result?.ok) log("Performance history could not be stored", result?.quota ? "storage quota reached" : "storage unavailable");
    } catch (error) {
      log("Performance history could not be stored", error.message);
    }
  }

  function clearHistory() {
    return Boolean(Storage?.remove?.(STORAGE_KEY));
  }

  async function getSnapshot() {
    captureExistingResources();
    captureNavigationTiming();
    return {
      generatedAt: new Date().toISOString(),
      current: {
        ...session,
        connection: getConnectionSnapshot(),
        hardware: getHardwareSnapshot(),
        memory: getMemorySnapshot(),
        storage: await getStorageSnapshot(),
        caches: await getCacheSnapshot()
      },
      history: loadHistory(),
      targets: config.performanceTargets || {},
      viewerOptions: getViewerOptions()
    };
  }

  async function exportReport() {
    const snapshot = await getSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `morphora-performance-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return snapshot;
  }

  let lastConnectionOnline = navigator.onLine;

  function connectionMessage(online) {
    const i18n = window.MorphoraI18n;
    const key = online ? "status.connectionRestored" : "status.offline";
    const fallback = online
      ? "Connection restored."
      : "You are offline. Previously opened MORPHORA content may remain available.";
    const translated = i18n?.t?.(key);
    return translated && translated !== key ? translated : fallback;
  }

  function announceConnectionState({ initial = false, languageRefresh = false } = {}) {
    let element = document.getElementById("offlineStatus");
    if (!element) {
      element = document.createElement("div");
      element.id = "offlineStatus";
      element.className = "offline-status";
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", "polite");
      document.body.appendChild(element);
    }

    const online = navigator.onLine;
    const changed = online !== lastConnectionOnline;
    document.documentElement.classList.toggle("is-offline", !online);
    element.textContent = connectionMessage(online);

    if (!online) {
      element.hidden = false;
    } else if (initial || languageRefresh || !changed) {
      element.hidden = true;
    } else {
      element.hidden = false;
      window.setTimeout(() => {
        if (navigator.onLine && element) element.hidden = true;
      }, 2500);
    }

    const shouldAnnounce = !languageRefresh && ((!online && initial) || (!initial && changed));
    if (shouldAnnounce && window.MorphoraA11y && typeof window.MorphoraA11y.announce === "function") {
      window.MorphoraA11y.announce(element.textContent);
    }

    lastConnectionOnline = online;
  }

  async function registerServiceWorker() {
    if (!config.enableServiceWorker || !("serviceWorker" in navigator)) return;
    if (!window.isSecureContext && location.hostname !== "localhost") return;

    try {
      const registration = await navigator.serviceWorker.register(
        `${config.serviceWorkerPath || "service-worker.js"}?v=${encodeURIComponent(config.assetVersion || config.version || "4.9.8-dev")}`
      );
      log("Service worker registered", { scope: registration.scope });
    } catch (error) {
      console.warn("MORPHORA service worker registration failed.", error);
    }
  }

  function maybeClearResourceTimings() {
    const entries = performance.getEntriesByType?.("resource") || [];
    if (entries.length > (config.resourceTimingBufferSize || 1600) * 0.9) {
      captureExistingResources();
      performance.clearResourceTimings?.();
      log("Resource timing buffer rotated after snapshot.");
    }
  }

  observePerformance();
  mark("performance-module-ready", { profile });

  window.addEventListener("online", announceConnectionState);
  window.addEventListener("offline", announceConnectionState);
  window.addEventListener("morphora:languagechange", () => announceConnectionState({ languageRefresh: true }));
  window.addEventListener("load", () => {
    mark("window-load");
    captureNavigationTiming();
    captureExistingResources();
    announceConnectionState({ initial: true });
    registerServiceWorker();
    persistSession();
  });
  window.addEventListener("pagehide", persistSession);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      maybeClearResourceTimings();
      persistSession();
    }
  });

  window.MorphoraPerformance = Object.freeze({
    enabled,
    profile: Object.freeze(profile),
    mark,
    measure,
    begin,
    prefetchJson,
    prefetchAsset,
    shouldPrefetch,
    versionedPath,
    startView,
    recordViewStage,
    completeView,
    cancelView,
    getViewerOptions,
    getTileCacheTrimThreshold,
    getConnectionSnapshot,
    getHardwareSnapshot,
    getMemorySnapshot,
    getStorageSnapshot,
    getCacheSnapshot,
    getSnapshot,
    exportReport,
    loadHistory,
    clearHistory
  });
})();
