(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Config = root.MORPHORA_BACKEND_CONFIG || {};
  const Loader = root.MorphoraSupabaseLoader;
  let client = null;
  let initPromise = null;
  let current = Object.freeze({ mode: "local-only", ready: false, configured: false, error: null });

  function emit() {
    try {
      root.dispatchEvent?.(new root.CustomEvent("morphora:backend-status", { detail: current }));
    } catch (_) {}
  }

  function setStatus(next) {
    current = Object.freeze({ ...current, ...next });
    emit();
    return current;
  }

  function status() {
    return current;
  }

  function isConfigured() {
    return Boolean(Config.enabled && Config.projectUrl && Config.publishableKey);
  }

  function getClient() {
    return client;
  }

  async function initialize() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!Config.enabled) {
        return setStatus({ mode: "local-only", ready: true, configured: false, error: null });
      }
      const validation = Loader?.validatePublicConfig?.() || { ok: false, problems: ["Backend loader is unavailable."] };
      if (!validation.ok) {
        return setStatus({ mode: "configuration-error", ready: true, configured: false, error: validation.problems.join(" ") });
      }
      setStatus({ mode: "connecting", ready: false, configured: true, error: null });
      try {
        const sdk = await Loader.load();
        client = sdk.createClient(Config.projectUrl, Config.publishableKey, {
          db: { schema: Config.schema || "public" },
          auth: {
            persistSession: Config.auth?.persistSession !== false,
            autoRefreshToken: Config.auth?.autoRefreshToken !== false,
            detectSessionInUrl: Config.auth?.detectSessionInUrl !== false
          },
          global: {
            headers: {
              "x-client-info": `morphora/${root.MORPHORA_CONFIG?.version || "5.0.3"}`
            }
          }
        });
        return setStatus({ mode: "cloud-ready", ready: true, configured: true, error: null });
      } catch (error) {
        client = null;
        return setStatus({ mode: "local-fallback", ready: true, configured: true, error: error?.message || String(error) });
      }
    })();
    return initPromise;
  }

  root.MorphoraBackend = Object.freeze({
    version: 1,
    provider: Config.provider || "supabase",
    initialize,
    ready: initialize(),
    status,
    isConfigured,
    getClient
  });
})();
