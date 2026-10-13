"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const ROOT = path.resolve(__dirname, "..");
function run(context, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), context, { filename: rel }); }

(async () => {
  const raw = new Map();
  const stores = new Map();
  const listeners = new Map();
  const queued = [];
  let remote = { annotations: [], bookmarks: [] };
  const user = { id: "user-a" };

  const storage = {
    keys: { personalSyncMeta: "meta" },
    readJSON(key, { fallback = null } = {}) { return raw.has(key) ? JSON.parse(raw.get(key)) : fallback; },
    writeJSON(key, value) { raw.set(key, JSON.stringify(value)); return { ok: true }; },
    readStore(name, { fallback = null } = {}) { return stores.has(name) ? JSON.parse(JSON.stringify(stores.get(name))) : fallback; },
    writeStore(name, value) { stores.set(name, JSON.parse(JSON.stringify(value))); return { ok: true }; }
  };

  stores.set("annotations", { schemaVersion: 2, updatedAt: null, views: { ventral: [{ id: "n1", viewId: "ventral", title: "Local note", description: "A", position: { x: .2, y: .3 }, createdAt: "2026-10-05T10:00:00Z", updatedAt: "2026-10-05T10:00:00Z" }] } });
  stores.set("bookmarks", { schemaVersion: 2, updatedAt: null, items: {} });

  const context = vm.createContext({
    console, Date, Math, Promise, JSON,
    MorphoraStorage: storage,
    MorphoraAuth: { getUser: async () => ({ user, error: null }) },
    MorphoraSync: {
      async listDocuments(type) { return { data: remote[type] || [], error: null }; }
    },
    MorphoraCloudSync: {
      async listQueue() { return queued.map((x) => ({ ...x })); },
      async enqueueUpsert(documentType, documentKey, payload, options = {}) { queued.push({ operation: "upsert", documentType, documentKey, payload: JSON.parse(JSON.stringify(payload)), expectedRevision: options.expectedRevision ?? null, userId: user.id }); return { queued: true }; },
      async enqueueDelete(documentType, documentKey, options = {}) { queued.push({ operation: "delete", documentType, documentKey, expectedRevision: options.expectedRevision ?? null, userId: user.id }); return { queued: true }; },
      async flush() { return { ok: true, processed: 0 }; },
      async status() { return { online: true, pending: queued.length, conflicts: 0, failed: 0 }; }
    },
    MORPHORA_CONFIG: { userDataSchemaVersion: 2 },
    navigator: { onLine: true },
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; },
    addEventListener(type, cb) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(cb); },
    dispatchEvent(event) { for (const cb of listeners.get(event.type) || []) cb(event); return true; },
    setTimeout() { return 0; }, clearTimeout() {}
  });
  context.window = context; context.globalThis = context;

  run(context, "backend/bookmarks-service.js");
  run(context, "backend/personal-sync-service.js");

  const bookmark = { manifestPath: "data/collections/dog-skull.json", viewId: "ventral", structureId: "atlas", name: "Atlas", viewLabel: "Ventral", updatedAt: "2026-10-05T11:00:00Z" };
  const toggled = context.MorphoraBookmarks.toggle(bookmark);
  assert.strictEqual(toggled.bookmarked, true);
  assert.strictEqual(context.MorphoraBookmarks.list().length, 1);
  await Promise.resolve();
  await Promise.resolve();

  queued.length = 0;
  const capturedNotes = await context.MorphoraPersonalSync.captureAnnotations();
  assert.strictEqual(capturedNotes.queued, 1);
  const noteMutation = queued.find((item) => item.documentType === "annotations");
  assert.ok(noteMutation);
  assert.strictEqual(noteMutation.documentKey, "n1");
  assert.strictEqual(noteMutation.expectedRevision, 0);

  queued.length = 0;
  const capturedBookmarks = await context.MorphoraPersonalSync.captureBookmarks();
  assert.strictEqual(capturedBookmarks.queued, 1);
  assert.ok(queued.some((item) => item.documentType === "bookmarks"));

  // A newer remote note should replace the local copy when there is no pending mutation.
  queued.length = 0;
  remote.annotations = [{ document_key: "n1", revision: 3, deleted_at: null, client_updated_at: "2026-10-05T12:00:00Z", updated_at: "2026-10-05T12:00:01Z", payload: { id: "n1", viewId: "ventral", title: "Remote note", description: "B", position: { x: .2, y: .3 }, createdAt: "2026-10-05T10:00:00Z", updatedAt: "2026-10-05T12:00:00Z" } }];
  remote.bookmarks = [];
  await context.MorphoraPersonalSync.pull();
  const pulledNote = stores.get("annotations").views.ventral[0];
  assert.strictEqual(pulledNote.title, "Remote note");

  // Tombstones remove local bookmarks rather than allowing deleted data to reappear.
  const id = context.MorphoraBookmarks.list()[0].id;
  remote.bookmarks = [{ document_key: id, revision: 2, deleted_at: "2026-10-05T13:00:00Z", client_updated_at: "2026-10-05T13:00:00Z", updated_at: "2026-10-05T13:00:01Z", payload: {} }];
  await context.MorphoraPersonalSync.pull();
  assert.strictEqual(context.MorphoraBookmarks.list().length, 0);

  console.log("MORPHORA V5.0.5 notes/bookmarks sync runtime test");
  console.log("✓ Local bookmarks persist in the dedicated store");
  console.log("✓ Existing local notes and bookmarks queue revision-aware first syncs");
  console.log("✓ Newer cloud notes merge back into the local-first annotation store");
  console.log("✓ Cloud tombstones remove locally cached bookmarks instead of resurrecting them");
})().catch((error) => { console.error(error); process.exitCode = 1; });
