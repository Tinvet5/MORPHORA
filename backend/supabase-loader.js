(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  let loadPromise = null;

  function configured() {
    const config = root.MORPHORA_BACKEND_CONFIG || {};
    return Boolean(config.enabled && config.projectUrl && config.publishableKey);
  }

  function validatePublicConfig() {
    const config = root.MORPHORA_BACKEND_CONFIG || {};
    if (!config.enabled) return { ok: true, mode: "local-only" };
    const problems = [];
    try {
      const url = new URL(config.projectUrl);
      if (url.protocol !== "https:") problems.push("Supabase project URL must use HTTPS.");
    } catch (_) {
      problems.push("Supabase project URL is invalid.");
    }
    if (!String(config.publishableKey || "").startsWith("sb_publishable_")) {
      problems.push("Use a Supabase publishable browser key (sb_publishable_…), never a secret key.");
    }
    if (/service[_-]?role|sb_secret_/i.test(String(config.publishableKey || ""))) {
      problems.push("Privileged Supabase credentials must never be exposed in browser configuration.");
    }
    return { ok: problems.length === 0, mode: problems.length ? "misconfigured" : "configured", problems };
  }

  async function load() {
    if (!configured()) return null;
    const validation = validatePublicConfig();
    if (!validation.ok) throw new Error(validation.problems.join(" "));
    if (root.supabase?.createClient) return root.supabase;
    if (loadPromise) return loadPromise;

    const config = root.MORPHORA_BACKEND_CONFIG;
    loadPromise = new Promise((resolve, reject) => {
      if (typeof document === "undefined") {
        reject(new Error("Supabase browser SDK can only be loaded in a browser context."));
        return;
      }
      const existing = document.querySelector('script[data-morphora-supabase-sdk="true"]');
      const script = existing || document.createElement("script");
      const timeout = window.setTimeout(() => reject(new Error("Timed out loading the Supabase browser SDK.")), Number(config.sdkLoadTimeoutMs || 15000));
      const finish = () => {
        window.clearTimeout(timeout);
        if (root.supabase?.createClient) resolve(root.supabase);
        else reject(new Error("Supabase SDK loaded without exposing createClient()."));
      };
      const fail = () => {
        window.clearTimeout(timeout);
        reject(new Error("Could not load the Supabase browser SDK. MORPHORA will continue in local-only mode."));
      };
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", fail, { once: true });
      if (!existing) {
        script.src = config.sdkUrl;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.referrerPolicy = "no-referrer";
        script.dataset.morphoraSupabaseSdk = "true";
        document.head.appendChild(script);
      }
    }).catch((error) => {
      loadPromise = null;
      throw error;
    });
    return loadPromise;
  }

  root.MorphoraSupabaseLoader = Object.freeze({ configured, validatePublicConfig, load });
})();
