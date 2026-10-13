(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Storage = root.MorphoraStorage;
  const Backend = root.MorphoraBackend;
  const Sync = root.MorphoraSync;
  const STORE_TO_DOCUMENT = Object.freeze({
    annotations: "annotations",
    drawings: "drawings",
    learningProgress: "learning_progress"
  });

  function readStore(name, options) {
    if (!Storage?.readStore) throw new Error("MORPHORA local storage is unavailable.");
    return Storage.readStore(name, options);
  }

  async function writeStore(name, value, { sync = false, documentKey = "root" } = {}) {
    if (!Storage?.writeStore) throw new Error("MORPHORA local storage is unavailable.");
    const local = Storage.writeStore(name, value);
    if (!sync || !local?.ok) return { local, cloud: { skipped: true, reason: "local-only" } };
    const type = STORE_TO_DOCUMENT[name];
    if (!type || !Sync?.upsertDocument) return { local, cloud: { skipped: true, reason: "unsupported-store" } };
    try {
      const cloud = await Sync.upsertDocument(type, documentKey, value);
      return { local, cloud };
    } catch (error) {
      return { local, cloud: { skipped: true, reason: "sync-error", error: error?.message || String(error) } };
    }
  }

  function status() {
    const backend = Backend?.status?.() || { mode: "local-only", ready: true, configured: false };
    return Object.freeze({
      mode: backend.mode,
      localFirst: true,
      cloudConfigured: Boolean(backend.configured),
      cloudReady: backend.mode === "cloud-ready"
    });
  }

  root.MorphoraData = Object.freeze({ version: 1, readStore, writeStore, status, storeMapping: STORE_TO_DOCUMENT });
})();
