"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const ROOT = path.resolve(__dirname, "..");
function run(context, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), context, { filename: rel }); }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }

(async () => {
  const raw = new Map();
  const stores = new Map();
  const listeners = new Map();
  const documentListeners = new Map();
  const snapshots = [];
  let sessionUser = { id: "user-a" };

  stores.set("annotations", { schemaVersion: 2, updatedAt: "a1", views: { ventral: [{ id: "note-a", viewId: "ventral", text: "A private note", updatedAt: "a1" }] } });
  stores.set("drawings", { schemaVersion: 2, updatedAt: "a1", preferences: { visible: true }, views: { ventral: [{ id: "stroke-a", points: [{ x: 0.1, y: 0.2 }], updatedAt: "a1" }] } });
  stores.set("learningProgress", { schemaVersion: 2, updatedAt: "a1", structures: { a: { attempts: 2 } }, customQuestions: {}, sessions: [{ id: "quiz-a" }] });
  stores.set("bookmarks", { schemaVersion: 2, updatedAt: "a1", items: { a: { id: "a", viewId: "ventral", structureId: "zyg" } } });
  raw.set("quiz", JSON.stringify({ id: "active-a" }));

  const storage = {
    keys: {
      annotations: "annotations", drawings: "drawings", learningProgress: "progress", bookmarks: "bookmarks",
      activeQuizSession: "quiz", localVaultPrefix: "vault:", localVaultPrincipal: "principal", hardeningMigration: "migration"
    },
    readText(key) { return raw.has(key) ? String(raw.get(key)) : null; },
    writeText(key, value) { raw.set(key, String(value)); return { ok: true }; },
    readJSON(key, { fallback = null } = {}) { return raw.has(key) ? JSON.parse(raw.get(key)) : fallback; },
    writeJSON(key, value) { raw.set(key, JSON.stringify(value)); return { ok: true }; },
    remove(key) { raw.delete(key); return true; },
    readStore(name, { fallback = null } = {}) { return stores.has(name) ? clone(stores.get(name)) : clone(fallback); },
    writeStore(name, value) { stores.set(name, clone(value)); return { ok: true }; },
    createRecoverySnapshot(options = {}) { snapshots.push({ ...options, stores: Object.fromEntries(Array.from(stores.entries()).map(([k,v]) => [k, clone(v)])) }); return { ok: true, key: `snapshot-${snapshots.length}` }; },
    async requestPersistence() { return true; }
  };

  const context = vm.createContext({
    console, Date, Math, Promise, JSON,
    MorphoraStorage: storage,
    MorphoraModels: { USER_DATA_SCHEMA_VERSION: 2 },
    MORPHORA_CONFIG: { userDataSchemaVersion: 2 },
    MorphoraAuth: { getSession: async () => ({ session: sessionUser ? { user: sessionUser } : null }) },
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; },
    addEventListener(type, cb) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(cb); },
    dispatchEvent(event) { for (const cb of listeners.get(event.type) || []) cb(event); return true; },
    document: {
      addEventListener(type, cb) { if (!documentListeners.has(type)) documentListeners.set(type, []); documentListeners.get(type).push(cb); },
      dispatchEvent(event) { for (const cb of documentListeners.get(event.type) || []) cb(event); return true; }
    },
    setTimeout(fn) { fn(); return 1; }, clearTimeout() {}
  });
  context.window = context; context.globalThis = context;

  run(context, "backend/local-vault.js");
  await context.MorphoraLocalVault.ready;

  assert.strictEqual(storage.readText("principal"), "user:user-a");
  assert.ok(storage.readJSON("vault:user:user-a", { fallback: null }), "first V5.0.5 run must preserve the current signed-in workspace");
  assert.ok(snapshots.length >= 1, "first migration must create a recovery point");

  // Sign out: User A data must be vaulted and the guest workspace must be empty.
  sessionUser = null;
  context.dispatchEvent(new context.CustomEvent("morphora:authchange", { detail: { event: "SIGNED_OUT", session: null } }));
  assert.strictEqual(storage.readText("principal"), "guest");
  assert.deepStrictEqual(Object.keys(stores.get("annotations").views), []);
  assert.deepStrictEqual(Object.keys(stores.get("bookmarks").items), []);
  assert.strictEqual(storage.readJSON("quiz", { fallback: null }), null, "active quiz sessions must not leak into guest mode");

  // Guest work is intentionally adoptable when signing into a first-time account.
  stores.set("bookmarks", { schemaVersion: 2, updatedAt: "g1", items: { guest: { id: "guest", viewId: "lateral", structureId: "mandible" } } });
  stores.set("learningProgress", { schemaVersion: 2, updatedAt: "g1", structures: { guest: { attempts: 1 } }, customQuestions: {}, sessions: [] });
  sessionUser = { id: "user-b" };
  context.dispatchEvent(new context.CustomEvent("morphora:authchange", { detail: { event: "SIGNED_IN", session: { user: sessionUser } } }));
  assert.strictEqual(storage.readText("principal"), "user:user-b");
  assert.ok(stores.get("bookmarks").items.guest, "guest -> first-time account should adopt local guest study data");

  // User B changes must never appear when switching back to User A.
  stores.get("annotations").views.lateral = [{ id: "note-b", viewId: "lateral", text: "B private note", updatedAt: "b1" }];
  storage.writeJSON("quiz", { id: "active-b" });
  sessionUser = { id: "user-a" };
  context.dispatchEvent(new context.CustomEvent("morphora:authchange", { detail: { event: "SIGNED_IN", session: { user: sessionUser } } }));
  assert.strictEqual(storage.readText("principal"), "user:user-a");
  const aNotes = stores.get("annotations").views.ventral || [];
  assert.ok(aNotes.some((note) => note.id === "note-a"));
  assert.ok(!(stores.get("annotations").views.lateral || []).some((note) => note.id === "note-b"), "User B local data must not leak into User A workspace");
  assert.strictEqual(storage.readJSON("quiz", { fallback: null }).id, "active-a", "account-scoped active quiz must restore with its owner");

  // Switching back restores B rather than adopting A.
  sessionUser = { id: "user-b" };
  context.dispatchEvent(new context.CustomEvent("morphora:authchange", { detail: { event: "SIGNED_IN", session: { user: sessionUser } } }));
  assert.ok((stores.get("annotations").views.lateral || []).some((note) => note.id === "note-b"));
  assert.strictEqual(storage.readJSON("quiz", { fallback: null }).id, "active-b");

  console.log("MORPHORA V5.0.5 final hardening runtime test");
  console.log("✓ Existing V5 local data is preserved during first-run vault migration");
  console.log("✓ Sign-out restores an isolated guest workspace");
  console.log("✓ Guest study work can be adopted by a first-time signed-in account");
  console.log("✓ User A and User B notes, bookmarks, progress and active quiz sessions remain isolated");
  console.log("✓ Account switches create recovery points before replacing local stores");
})().catch((error) => { console.error(error); process.exitCode = 1; });
