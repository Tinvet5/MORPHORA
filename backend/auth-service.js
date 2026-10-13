(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Backend = root.MorphoraBackend;
  const Config = root.MORPHORA_BACKEND_CONFIG || {};

  async function client() {
    await Backend?.ready;
    return Backend?.getClient?.() || null;
  }

  function redirectUrl() {
    // During local development, always return to the exact Live Server origin
    // and page that launched the auth flow. This supports both 127.0.0.1 and
    // localhost, custom Live Server ports, and projects opened from a subfolder.
    try {
      const location = root.location;
      const hostname = String(location?.hostname || "").toLowerCase();
      const isLocalDevelopment = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
      if (isLocalDevelopment && location?.origin) {
        const pathname = location.pathname || "/";
        return `${location.origin}${pathname}`;
      }
    } catch (_) {}

    const configured = String(Config.auth?.redirectUrl || "").trim();
    if (configured) return configured;

    try {
      const location = root.location;
      if (!location?.origin || !location?.pathname) return undefined;
      return `${location.origin}${location.pathname}`;
    } catch (_) {
      return undefined;
    }
  }

  function availability() {
    const status = Backend?.status?.() || { mode: "local-only", ready: true, configured: false };
    return Object.freeze({
      available: status.mode === "cloud-ready",
      configured: Boolean(status.configured),
      mode: status.mode,
      error: status.error || null,
      googleEnabled: Boolean(Config.auth?.googleEnabled)
    });
  }

  async function getSession() {
    const api = await client();
    if (!api) return { session: null, error: null, localOnly: true };
    const { data, error } = await api.auth.getSession();
    return { session: data?.session || null, error: error || null, localOnly: false };
  }

  async function getUser() {
    const api = await client();
    if (!api) return { user: null, error: null, localOnly: true };
    const { data, error } = await api.auth.getUser();
    return { user: data?.user || null, error: error || null, localOnly: false };
  }

  async function signUp({ email, password, displayName, language, options = {} } = {}) {
    const api = await client();
    if (!api) throw new Error("Cloud authentication is not configured.");
    const cleanName = typeof displayName === "string" ? displayName.trim().slice(0, 120) : "";
    const cleanLanguage = ["es", "en"].includes(language) ? language : undefined;
    const suppliedData = options.data && typeof options.data === "object" ? options.data : {};
    const emailRedirectTo = options.emailRedirectTo || redirectUrl();
    return api.auth.signUp({
      email,
      password,
      options: {
        ...options,
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
        data: {
          ...suppliedData,
          ...(cleanName ? { display_name: cleanName } : {}),
          ...(cleanLanguage ? { language: cleanLanguage } : {})
        }
      }
    });
  }

  async function signInWithPassword({ email, password } = {}) {
    const api = await client();
    if (!api) throw new Error("Cloud authentication is not configured.");
    return api.auth.signInWithPassword({ email, password });
  }

  async function signInWithOAuth(provider, options = {}) {
    const api = await client();
    if (!api) throw new Error("Cloud authentication is not configured.");
    const supplied = options && typeof options === "object" ? options : {};
    const redirectTo = supplied.redirectTo || redirectUrl();
    return api.auth.signInWithOAuth({
      provider,
      options: { ...supplied, ...(redirectTo ? { redirectTo } : {}) }
    });
  }

  async function signInWithGoogle() {
    if (!Config.auth?.googleEnabled) throw new Error("Google sign-in is not enabled for this MORPHORA deployment.");
    return signInWithOAuth("google");
  }

  async function requestPasswordReset(email) {
    const api = await client();
    if (!api) throw new Error("Cloud authentication is not configured.");
    const target = redirectUrl();
    return api.auth.resetPasswordForEmail(email, target ? { redirectTo: target } : undefined);
  }

  async function updatePassword(password) {
    const api = await client();
    if (!api) throw new Error("Cloud authentication is not configured.");
    return api.auth.updateUser({ password });
  }

  async function signOut(options) {
    const api = await client();
    if (!api) return { error: null, localOnly: true };
    return api.auth.signOut(options);
  }

  function onAuthStateChange(callback) {
    let subscription = null;
    let cancelled = false;
    Backend?.ready?.then(() => {
      if (cancelled) return;
      const api = Backend.getClient?.();
      if (!api) {
        callback?.("LOCAL_ONLY", null);
        return;
      }
      const result = api.auth.onAuthStateChange((event, session) => callback?.(event, session));
      subscription = result?.data?.subscription || null;
    });
    return () => {
      cancelled = true;
      subscription?.unsubscribe?.();
    };
  }

  root.MorphoraAuth = Object.freeze({
    version: 2,
    availability,
    redirectUrl,
    getSession,
    getUser,
    signUp,
    signInWithPassword,
    signInWithOAuth,
    signInWithGoogle,
    requestPasswordReset,
    updatePassword,
    signOut,
    onAuthStateChange
  });
})();
