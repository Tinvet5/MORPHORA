(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Backend = root.MorphoraBackend;
  const Auth = root.MorphoraAuth;

  async function context() {
    await Backend?.ready;
    const api = Backend?.getClient?.();
    if (!api) return { api: null, user: null, localOnly: true };
    const { user, error } = await Auth.getUser();
    if (error) throw error;
    return { api, user, localOnly: false };
  }

  async function getProfile() {
    const { api, user, localOnly } = await context();
    if (!api || !user) return { data: null, error: null, localOnly };
    const result = await api.from("profiles").select("user_id,display_name,avatar_url,created_at,updated_at").eq("user_id", user.id).maybeSingle();
    return { ...result, localOnly: false };
  }

  async function upsertProfile(values = {}) {
    const { api, user } = await context();
    if (!api || !user) throw new Error("A signed-in MORPHORA account is required.");
    const payload = { user_id: user.id };
    if (Object.prototype.hasOwnProperty.call(values, "display_name")) {
      payload.display_name = typeof values.display_name === "string" ? values.display_name.trim().slice(0, 120) || null : null;
    }
    if (Object.prototype.hasOwnProperty.call(values, "avatar_url")) {
      payload.avatar_url = typeof values.avatar_url === "string" ? values.avatar_url.trim().slice(0, 2048) || null : null;
    }
    return api.from("profiles").upsert(payload, { onConflict: "user_id" }).select().single();
  }

  async function getPreferences() {
    const { api, user, localOnly } = await context();
    if (!api || !user) return { data: null, error: null, localOnly };
    const result = await api.from("user_preferences").select("user_id,language,theme,created_at,updated_at").eq("user_id", user.id).maybeSingle();
    return { ...result, localOnly: false };
  }

  async function upsertPreferences(values = {}) {
    const { api, user } = await context();
    if (!api || !user) throw new Error("A signed-in MORPHORA account is required.");
    const payload = { user_id: user.id };
    if (["es", "en"].includes(values.language)) payload.language = values.language;
    if (["light", "dark", "system"].includes(values.theme)) payload.theme = values.theme;
    return api.from("user_preferences").upsert(payload, { onConflict: "user_id" }).select().single();
  }

  root.MorphoraProfiles = Object.freeze({ version: 2, getProfile, upsertProfile, getPreferences, upsertPreferences });
})();
