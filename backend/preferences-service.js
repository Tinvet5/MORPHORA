(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Profiles = root.MorphoraProfiles;
  const Auth = root.MorphoraAuth;
  const Storage = root.MorphoraStorage;
  const I18n = root.MorphoraI18n;

  const THEMES = Object.freeze(["system", "light", "dark"]);
  const LANGUAGES = Object.freeze(["es", "en"]);
  let state = Object.freeze({ loaded: false, syncing: false, language: null, theme: null, updatedAt: null, error: null });
  let suppressLocalEvents = 0;
  let initialized = false;

  function emit(type = "morphora:preferencesstatus") {
    try {
      root.dispatchEvent?.(new root.CustomEvent(type, { detail: state }));
    } catch (_) {}
  }

  function setState(next, { event = "morphora:preferencesstatus" } = {}) {
    state = Object.freeze({ ...state, ...next });
    emit(event);
    return state;
  }

  function current() { return state; }

  function normalizeLanguage(value) {
    const language = String(value || "").trim().toLowerCase();
    return LANGUAGES.includes(language) ? language : null;
  }

  function normalizeTheme(value) {
    const theme = String(value || "").trim().toLowerCase();
    return THEMES.includes(theme) ? theme : null;
  }

  function localThemePreference() {
    return normalizeTheme(Storage?.readText?.(Storage?.keys?.theme || "morphora:theme")) || "system";
  }

  function localLanguagePreference() {
    return normalizeLanguage(I18n?.getLanguage?.()) || normalizeLanguage(Storage?.readText?.(Storage?.keys?.language || "morphora:language")) || "es";
  }

  async function applyLocal({ language, theme } = {}, { announce = false } = {}) {
    suppressLocalEvents += 1;
    try {
      const nextLanguage = normalizeLanguage(language);
      const nextTheme = normalizeTheme(theme);
      if (nextLanguage && I18n?.setLanguage) {
        await I18n.setLanguage(nextLanguage, { persist: true, announce });
      }
      if (nextTheme) {
        if (root.MorphoraNavigation?.setThemePreference) {
          root.MorphoraNavigation.setThemePreference(nextTheme, { persist: true, emit: false });
        } else {
          const effective = nextTheme === "system"
            ? (root.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark")
            : nextTheme;
          root.document?.body?.classList?.toggle("light-mode", effective === "light");
          if (nextTheme === "system") Storage?.remove?.(Storage?.keys?.theme || "morphora:theme");
          else Storage?.writeText?.(Storage?.keys?.theme || "morphora:theme", nextTheme);
        }
      }
    } finally {
      suppressLocalEvents = Math.max(0, suppressLocalEvents - 1);
    }
  }

  async function hasSignedInUser() {
    const { user, error } = await Auth?.getUser?.() || {};
    if (error) throw error;
    return Boolean(user);
  }

  async function load({ apply = true } = {}) {
    if (!await hasSignedInUser()) {
      return setState({ loaded: false, syncing: false, language: null, theme: null, updatedAt: null, error: null });
    }
    setState({ syncing: true, error: null });
    try {
      let { data, error } = await Profiles.getPreferences();
      if (error) throw error;
      if (!data) {
        const created = await Profiles.upsertPreferences({ language: localLanguagePreference(), theme: localThemePreference() });
        if (created?.error) throw created.error;
        data = created?.data || null;
      }
      // V5.0.3 migration bridge: accounts provisioned by V5.0.2 start with
      // theme=system. If that row has never been edited and this browser
      // already carries an explicit V4/V5 theme preference, preserve the
      // user's existing choice by seeding it into the account once.
      const localTheme = localThemePreference();
      const untouched = Boolean(data?.created_at && data?.updated_at && data.created_at === data.updated_at);
      if (untouched && data?.theme === "system" && localTheme !== "system") {
        const seeded = await Profiles.upsertPreferences({ language: normalizeLanguage(data?.language) || localLanguagePreference(), theme: localTheme });
        if (seeded?.error) throw seeded.error;
        data = seeded?.data || { ...data, theme: localTheme };
      }
      const language = normalizeLanguage(data?.language) || "es";
      const theme = normalizeTheme(data?.theme) || "system";
      if (apply) await applyLocal({ language, theme });
      return setState({ loaded: true, syncing: false, language, theme, updatedAt: data?.updated_at || null, error: null }, { event: "morphora:preferenceschange" });
    } catch (error) {
      return setState({ syncing: false, error: error?.message || String(error) });
    }
  }

  async function save(values = {}, { apply = true } = {}) {
    if (!await hasSignedInUser()) throw new Error("A signed-in MORPHORA account is required.");
    const requestedLanguage = normalizeLanguage(values.language);
    const requestedTheme = normalizeTheme(values.theme);
    if (!requestedLanguage && !requestedTheme) return { data: null, error: null };
    // Always write the complete preference pair. This keeps language and theme
    // independent even if the underlying upsert implementation changes how it
    // treats omitted columns in a future PostgREST/Supabase release.
    const payload = {
      language: requestedLanguage || state.language || localLanguagePreference(),
      theme: requestedTheme || state.theme || localThemePreference()
    };
    const language = payload.language;
    const theme = payload.theme;

    setState({ syncing: true, error: null });
    try {
      const result = await Profiles.upsertPreferences(payload);
      if (result?.error) throw result.error;
      const data = result?.data || {};
      const nextLanguage = normalizeLanguage(data.language) || language || state.language || localLanguagePreference();
      const nextTheme = normalizeTheme(data.theme) || theme || state.theme || localThemePreference();
      if (apply) await applyLocal({ language: nextLanguage, theme: nextTheme });
      setState({ loaded: true, syncing: false, language: nextLanguage, theme: nextTheme, updatedAt: data.updated_at || null, error: null }, { event: "morphora:preferenceschange" });
      return result;
    } catch (error) {
      setState({ syncing: false, error: error?.message || String(error) });
      throw error;
    }
  }

  async function syncLanguage(language) {
    const normalized = normalizeLanguage(language);
    if (!normalized || suppressLocalEvents || state.language === normalized) return;
    try { await save({ language: normalized }, { apply: false }); } catch (_) {}
  }

  async function syncTheme(theme) {
    const normalized = normalizeTheme(theme);
    if (!normalized || suppressLocalEvents || state.theme === normalized) return;
    try { await save({ theme: normalized }, { apply: false }); } catch (_) {}
  }

  function clearCloudState() {
    setState({ loaded: false, syncing: false, language: null, theme: null, updatedAt: null, error: null }, { event: "morphora:preferenceschange" });
  }

  function bind() {
    if (initialized) return;
    initialized = true;
    root.addEventListener?.("morphora:languagechange", (event) => syncLanguage(event?.detail?.language));
    root.addEventListener?.("morphora:themechange", (event) => syncTheme(event?.detail?.preference));
    root.addEventListener?.("morphora:authchange", (event) => {
      const authEvent = event?.detail?.event;
      const session = event?.detail?.session;
      if (!session?.user || authEvent === "SIGNED_OUT") clearCloudState();
    });
  }

  bind();

  root.MorphoraPreferences = Object.freeze({
    version: 1,
    themes: THEMES,
    languages: LANGUAGES,
    current,
    load,
    save,
    applyLocal,
    localThemePreference,
    localLanguagePreference,
    clearCloudState
  });
})();
