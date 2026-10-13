"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const ROOT = path.resolve(__dirname, "..");
function run(context, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), context, { filename: rel }); }

(async () => {
  const listeners = new Map();
  const writes = [];
  const applied = [];
  const languageCalls = [];
  const storage = new Map([["morphora:theme", "light"], ["morphora:language", "es"]]);
  const profileCalls = [];

  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; },
    MorphoraAuth: { getUser: async () => ({ user: { id: "u1" }, error: null }) },
    MorphoraProfiles: {
      getPreferences: async () => ({ data: { user_id: "u1", language: "en", theme: "dark", updated_at: "2026-10-05T00:00:00Z" }, error: null }),
      upsertPreferences: async (value) => {
        writes.push(value);
        return { data: { user_id: "u1", language: value.language || "en", theme: value.theme || "dark", updated_at: "2026-10-05T01:00:00Z" }, error: null };
      }
    },
    MorphoraStorage: {
      keys: { theme: "morphora:theme", language: "morphora:language" },
      readText: (key) => storage.get(key) || null,
      writeText: (key, value) => storage.set(key, value),
      remove: (key) => storage.delete(key)
    },
    MorphoraI18n: {
      getLanguage: () => storage.get("morphora:language") || "es",
      setLanguage: async (language) => { languageCalls.push(language); storage.set("morphora:language", language); return true; }
    },
    MorphoraNavigation: {
      getThemePreference: () => storage.get("morphora:theme") || "system",
      setThemePreference: (theme, options) => { applied.push([theme, options]); if (theme === "system") storage.delete("morphora:theme"); else storage.set("morphora:theme", theme); }
    },
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(callback); },
    dispatchEvent(event) { for (const cb of listeners.get(event.type) || []) cb(event); return true; }
  });
  context.window = context; context.globalThis = context;
  run(context, "backend/preferences-service.js");
  assert.strictEqual(context.MorphoraPreferences.version, 1);

  const loaded = await context.MorphoraPreferences.load({ apply: true });
  assert.strictEqual(loaded.loaded, true);
  assert.strictEqual(loaded.language, "en");
  assert.strictEqual(loaded.theme, "dark");
  assert.deepStrictEqual(languageCalls, ["en"]);
  assert.strictEqual(applied[0][0], "dark");
  assert.strictEqual(applied[0][1].emit, false);

  await context.MorphoraPreferences.save({ language: "es", theme: "light" }, { apply: true });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(writes[0])), { language: "es", theme: "light" });
  assert.strictEqual(context.MorphoraPreferences.current().language, "es");
  assert.strictEqual(context.MorphoraPreferences.current().theme, "light");
  assert.strictEqual(storage.get("morphora:language"), "es");
  assert.strictEqual(storage.get("morphora:theme"), "light");

  // Profile updates must preserve fields that were not edited (notably a future OAuth avatar).
  const api = {
    from(table) {
      assert.strictEqual(table, "profiles");
      return {
        upsert(payload) {
          profileCalls.push(payload);
          return { select() { return { single: async () => ({ data: payload, error: null }) }; } };
        }
      };
    }
  };
  const profileContext = vm.createContext({
    console,
    MorphoraBackend: { ready: Promise.resolve(), getClient: () => api },
    MorphoraAuth: { getUser: async () => ({ user: { id: "u1" }, error: null }) }
  });
  profileContext.window = profileContext; profileContext.globalThis = profileContext;
  run(profileContext, "backend/profile-service.js");
  await profileContext.MorphoraProfiles.upsertProfile({ display_name: "Tin" });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(profileCalls[0])), { user_id: "u1", display_name: "Tin" });
  assert.ok(!Object.prototype.hasOwnProperty.call(profileCalls[0], "avatar_url"), "display-name-only updates must not clear avatar_url");

  console.log("MORPHORA V5.0.5 profile/preferences runtime test");
  console.log("✓ Cloud preferences hydrate language and theme into the local interface");
  console.log("✓ Preference saves update the account and local interface together");
  console.log("✓ Display-name updates preserve unrelated profile fields such as OAuth avatars");
})().catch((error) => { console.error(error); process.exitCode = 1; });
