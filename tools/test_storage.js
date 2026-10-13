"use strict";

const assert = require("assert");
const path = require("path");

class MockStorage {
  constructor() {
    this.map = new Map();
    this.quotaKeys = new Set();
  }
  get length() { return this.map.size; }
  key(index) { return Array.from(this.map.keys())[index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) {
    if (this.quotaKeys.has(key)) {
      const error = new Error("Quota exceeded");
      error.name = "QuotaExceededError";
      throw error;
    }
    this.map.set(String(key), String(value));
  }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
}

global.localStorage = new MockStorage();
global.sessionStorage = new MockStorage();
Object.defineProperty(global, "navigator", { configurable: true, value: {
  storage: {
    async estimate() { return { usage: 512, quota: 4096 }; },
    async persisted() { return true; },
    async persist() { return true; }
  }
} });
global.MORPHORA_CONFIG = { userDataSchemaVersion: 2 };
global.MorphoraModels = {
  USER_DATA_SCHEMA_VERSION: 2,
  migrateUserStore(kind, raw) {
    if (kind === "annotations") return { schemaVersion: 2, updatedAt: raw.updatedAt || null, views: raw.views || raw.annotations || {} };
    if (kind === "drawings") return { schemaVersion: 2, updatedAt: raw.updatedAt || null, preferences: raw.preferences || { visible: true }, views: raw.views || raw.drawings || {} };
    if (kind === "progress") {
      const source = raw.progress || raw;
      return { schemaVersion: 2, updatedAt: source.updatedAt || null, structures: source.structures || {}, sessions: source.sessions || [] };
    }
    return raw;
  }
};

require(path.join(__dirname, "..", "storage.js"));
const Storage = global.MorphoraStorage;
assert(Storage, "MorphoraStorage should be exposed globally");

// Legacy migration persists the new key but preserves the old copy.
localStorage.setItem(Storage.keys.annotationsLegacy, JSON.stringify({ annotations: { "dog-skull-lateral": [{ id: "n1" }] } }));
const annotations = Storage.readStore("annotations", { fallback: null });
assert.equal(annotations.schemaVersion, 2);
assert.equal(annotations.views["dog-skull-lateral"].length, 1);
assert(localStorage.getItem(Storage.keys.annotationsLegacy), "Legacy copy must remain available");
assert(localStorage.getItem(Storage.keys.annotations), "Migrated V2 copy should be persisted");

// Corrupt current data is quarantined, then a valid legacy store can recover it.
localStorage.setItem(Storage.keys.drawings, "{not-json");
localStorage.setItem(Storage.keys.drawingsLegacy, JSON.stringify({ drawings: { "dog-skull-lateral": [] } }));
const drawings = Storage.readStore("drawings", { fallback: null });
assert.equal(drawings.schemaVersion, 2);
assert(drawings.views["dog-skull-lateral"]);
const recovery = Storage.listKeys({ prefix: Storage.keys.recoveryPrefix });
assert(recovery.length >= 1, "Corrupt data should create a bounded recovery snapshot");

// Quota failure falls back to in-memory storage for the active session.
localStorage.quotaKeys.add("morphora:test:quota");
const quotaWrite = Storage.writeJSON("morphora:test:quota", { value: 42 });
assert.equal(quotaWrite.ok, false);
assert.equal(quotaWrite.fallback, true);
assert.equal(Storage.readJSON("morphora:test:quota").value, 42);

// Preferences and unified backup remain readable in the existing feature formats.
Storage.writeText(Storage.keys.theme, "light");
Storage.writeStore("learningProgress", { schemaVersion: 2, structures: { "v::l": { attempts: 1 } }, sessions: [] });
const bundle = Storage.createBackup();
assert.equal(bundle.kind, "personal-data-bundle");
assert.equal(bundle.preferences.theme, "light");
assert(bundle.stores.annotations);
assert(bundle.stores.drawings);
assert(bundle.stores.learningProgress);
assert(Storage.extractBackupStore(bundle, "annotations"));
assert(Storage.extractBackupStore(bundle, "drawings"));
assert(Storage.extractBackupStore(bundle, "learningProgress"));

(async () => {
  const health = await Storage.health();
  assert.equal(health.localAvailable, true);
  assert.equal(health.sessionAvailable, true);
  assert.equal(health.usage, 512);
  assert.equal(health.quota, 4096);
  assert.equal(health.persisted, true);
  assert.equal(await Storage.requestPersistence(), true);
  console.log("MORPHORA storage abstraction tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
