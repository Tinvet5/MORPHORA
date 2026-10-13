"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");

function storageStub() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key(index) { return Array.from(map.keys())[index] ?? null; },
    getItem(key) { return map.has(String(key)) ? map.get(String(key)) : null; },
    setItem(key, value) { map.set(String(key), String(value)); },
    removeItem(key) { map.delete(String(key)); },
    clear() { map.clear(); }
  };
}

function runFile(context, rel) {
  const source = fs.readFileSync(path.join(ROOT, rel), "utf8");
  vm.runInContext(source, context, { filename: rel });
}

(async () => {
  const localStorage = storageStub();
  const sessionStorage = storageStub();
  const context = vm.createContext({
    console,
    URL,
    URLSearchParams,
    Blob,
    setTimeout,
    clearTimeout,
    location: { search: "" },
    navigator: {},
    localStorage,
    sessionStorage,
    dispatchEvent() {},
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; }
  });
  context.window = context;
  context.self = context;
  context.globalThis = context;

  [
    "release-meta.js",
    "app-config.js",
    "backend-config.js",
    "models.js",
    "storage.js",
    "backend/supabase-loader.js",
    "backend/backend-client.js",
    "backend/auth-service.js",
    "backend/profile-service.js",
    "backend/sync-service.js",
    "backend/data-service.js"
  ].forEach((rel) => runFile(context, rel));

  assert.strictEqual(context.MORPHORA_BACKEND_CONFIG.enabled, true, "connected build must enable the backend");
  assert.strictEqual(context.MORPHORA_BACKEND_CONFIG.projectUrl, "https://fvrrkbbumznbhovaoxul.supabase.co", "connected build must target the MORPHORA Supabase project");
  assert.ok(context.MORPHORA_BACKEND_CONFIG.publishableKey.startsWith("sb_publishable_"), "connected build must use a browser-safe publishable key");

  const validation = context.MorphoraSupabaseLoader.validatePublicConfig();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(validation)), { ok: true, mode: "configured", problems: [] });

  const status = await context.MorphoraBackend.ready;
  assert.strictEqual(status.mode, "local-fallback", "node test environment has no browser document, so cloud bootstrap must fail safely");
  assert.strictEqual(status.ready, true);
  assert.strictEqual(status.configured, true);
  assert.strictEqual(context.MorphoraBackend.getClient(), null);
  assert.strictEqual(context.supabase, undefined, "failed SDK bootstrap must not fabricate a cloud client");

  const session = await context.MorphoraAuth.getSession();
  assert.strictEqual(session.localOnly, true);
  assert.strictEqual(session.session, null);

  const sample = { schemaVersion: 2, views: { example: [{ id: "note-1", text: "local" }] } };
  const write = await context.MorphoraData.writeStore("annotations", sample, { sync: true });
  assert.strictEqual(write.local.ok, true, "local persistence must remain authoritative");
  assert.strictEqual(write.cloud.skipped, true, "guest/local mode must not attempt cloud sync");
  const restored = JSON.parse(JSON.stringify(context.MorphoraData.readStore("annotations")));
  assert.strictEqual(restored.schemaVersion, 2);
  assert.strictEqual(restored.views.example[0].id, "note-1");
  assert.strictEqual(restored.views.example[0].text, "local");

  const dataStatus = context.MorphoraData.status();
  assert.strictEqual(dataStatus.localFirst, true);
  assert.strictEqual(dataStatus.cloudReady, false);

  console.log("MORPHORA V5.0.5 backend runtime test");
  console.log("✓ Connected public configuration validates without privileged credentials");
  console.log("✓ Cloud bootstrap fails safely when a browser runtime is unavailable");
  console.log("✓ Guest auth resolves safely through local fallback");
  console.log("✓ Local-first data writes remain authoritative during fallback");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
