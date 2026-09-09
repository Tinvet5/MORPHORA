(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : self;
  const params = new URLSearchParams(root.location?.search || "");
  const debugValue = params.get("debug") || "";

  root.MORPHORA_CONFIG = Object.freeze({
    version: "4.8.2",
    schemaVersion: 1,
    defaultCollectionManifest: "data/collections/dog-skull.json",
    debugPerformance:
      debugValue === "performance" || params.has("debug-performance"),
    enableServiceWorker: true,
    serviceWorkerPath: "service-worker.js",
    prefetchAdjacentViews: true,
    prefetchOnSaveData: false
  });
})();
