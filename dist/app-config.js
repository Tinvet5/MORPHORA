(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : self;
  const params = new URLSearchParams(root.location?.search || "");
  const debugValue = params.get("debug") || "";

  root.MORPHORA_CONFIG = Object.freeze({
    version: "4.9.8",
    assetVersion: root.MORPHORA_RELEASE?.assetVersion || "4.9.8-dev",
    schemaVersion: 2,
    userDataSchemaVersion: 2,
    defaultCollectionManifest: "data/collections/dog-skull.json",
    debugPerformance:
      debugValue === "performance" || params.has("debug-performance"),
    enableServiceWorker: true,
    serviceWorkerPath: "service-worker.js",
    prefetchAdjacentViews: true,
    prefetchOnSaveData: false,
    validationRulesVersion: "1.0.0",
    diagnosticsPath: "dev-tools.html",
    performanceLabPath: "performance-lab.html",
    validationReportPath: "reports/validation-report.json",
    storageLayerVersion: 1,
    storageRecoverySnapshots: 3,
    storageWarningRatio: 0.85,
    studyEngineVersion: "4.9.6",
    i18nVersion: 1,
    supportedLocales: Object.freeze(["es", "en"]),
    sourceLocale: "es",
    fallbackLocale: "en",
    brandFooterVersion: 1,
    publicLinks: Object.freeze({
      email: "mailto:ADMIN@MORPHORA.cl",
      youtube: "https://www.youtube.com/channel/UC7rGvkF_5lHKdIq9uqSneuw",
      instagram: "https://www.instagram.com/morphora.atlas/?hl=en",
      tiktok: "https://www.tiktok.com/@morphora_atlas?is_from_webapp=1&sender_device=pc"
    }),
    questionBankSchemaVersion: 1,
    masteryWeakThreshold: 60,
    masteryStrongThreshold: 80,

    // V4.9 performance targets are observational budgets rather than hard
    // guarantees. Device hardware, browser state and network quality vary.
    performanceTargets: Object.freeze({
      shellInteractiveMs: 1000,
      previewVisibleMs: 1500,
      firstTileMs: 2000,
      cachedViewSwitchMs: 1000,
      longTaskMs: 50,
      cls: 0.1,
      lcpMs: 2500
    }),

    // Browser-memory and network safeguards. These caps are intentionally
    // conservative so the same build remains stable on tablets and phones.
    maxViewDataCacheEntries: 24,
    maxCollectionManifestCacheEntries: 10,
    resourceTimingBufferSize: 1600,
    storedPerformanceSessions: 12,
    storedPerformanceViews: 50,
    serviceWorkerRuntimeCacheMaxEntries: 220,
    serviceWorkerDataCacheMaxEntries: 100,
    serviceWorkerTileCacheMaxEntries: 700,

    // OpenSeadragon profiles are selected at runtime by performance.js.
    viewerProfiles: Object.freeze({
      constrained: Object.freeze({
        immediateRender: true,
        imageLoaderLimit: 4,
        maxImageCacheCount: 80,
        minPixelRatio: 1.25,
        trimTileCacheAbove: 95
      }),
      balanced: Object.freeze({
        immediateRender: false,
        imageLoaderLimit: 6,
        maxImageCacheCount: 140,
        minPixelRatio: 0.75,
        trimTileCacheAbove: 170
      }),
      highCapacity: Object.freeze({
        immediateRender: false,
        imageLoaderLimit: 8,
        maxImageCacheCount: 200,
        minPixelRatio: 0.5,
        trimTileCacheAbove: 240
      })
    })
  });
})();
