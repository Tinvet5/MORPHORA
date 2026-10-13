(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  // V5.0.5 final-hardening backend configuration. This build is linked to
  // the MORPHORA Supabase project using a browser-safe *publishable* key.
  // Guest/local persistence remains available if cloud initialization fails.
  //
  // NEVER put a Supabase secret/service-role key in this file. This file ships
  // to every browser and is therefore public by design.
  root.MORPHORA_BACKEND_CONFIG = Object.freeze({
    version: "5.0.5",
    provider: "supabase",
    enabled: true,
    projectUrl: "https://fvrrkbbumznbhovaoxul.supabase.co",
    publishableKey: "sb_publishable_9-1An_VDLSOtm56aI7460w_aRgt82eU",
    schema: "public",
    sdkVersion: "2.117.2",
    sdkUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.min.js",
    sdkLoadTimeoutMs: 15000,
    auth: Object.freeze({
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      minPasswordLength: 8,
      redirectUrl: "https://morphora.cl/",
      googleEnabled: false
    })
  });
})();
