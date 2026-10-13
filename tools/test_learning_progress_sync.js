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
  const user = { id: "user-learning" };
  let remote = { annotations: [], bookmarks: [], drawings: [], learning_progress: [], quiz_history: [] };

  const storage = {
    keys: { personalSyncMeta: "meta" },
    readJSON(key, { fallback = null } = {}) { return raw.has(key) ? JSON.parse(raw.get(key)) : fallback; },
    writeJSON(key, value) { raw.set(key, JSON.stringify(value)); return { ok: true }; },
    readStore(name, { fallback = null } = {}) { return stores.has(name) ? JSON.parse(JSON.stringify(stores.get(name))) : fallback; },
    writeStore(name, value) { stores.set(name, JSON.parse(JSON.stringify(value))); return { ok: true }; }
  };

  stores.set("annotations", { schemaVersion: 2, updatedAt: null, views: {} });
  stores.set("drawings", { schemaVersion: 2, updatedAt: null, preferences: { visible: true }, views: {} });
  stores.set("bookmarks", { schemaVersion: 2, updatedAt: null, items: {} });
  stores.set("learningProgress", {
    schemaVersion: 2,
    updatedAt: "2026-10-05T12:00:00Z",
    structures: {
      "ventral::zyg": { key: "ventral::zyg", viewId: "ventral", labelId: "zyg", name: "Zygomatic arch", attempts: 2, correct: 2, incorrect: 0, mastery: 100, streak: 2, history: [{ correct: true, at: "2026-10-05T11:00:00Z" }, { correct: true, at: "2026-10-05T12:00:00Z" }], reviewFlag: false, lastReviewedAt: "2026-10-05T12:00:00Z" }
    },
    customQuestions: {},
    sessions: [{ id: "quiz-a", viewId: "ventral", viewTitle: "Ventral", type: "identify", completedAt: "2026-10-05T12:05:00Z", answered: 5, correct: 4, accuracy: 80, duration: 120000 }]
  });

  const context = vm.createContext({
    console, Date, Math, Promise, JSON,
    MorphoraStorage: storage,
    MorphoraAuth: { getUser: async () => ({ user, error: null }) },
    MorphoraSync: { async listDocuments(type) { return { data: remote[type] || [], error: null }; } },
    MorphoraCloudSync: {
      async listQueue() { return queued.map((x) => ({ ...x })); },
      async enqueueUpsert(documentType, documentKey, payload, options = {}) { queued.push({ operation: "upsert", documentType, documentKey, payload: JSON.parse(JSON.stringify(payload)), expectedRevision: options.expectedRevision ?? null, userId: user.id }); return { queued: true }; },
      async enqueueDelete(documentType, documentKey, options = {}) { queued.push({ operation: "delete", documentType, documentKey, expectedRevision: options.expectedRevision ?? null, userId: user.id }); return { queued: true }; },
      async flush() { return { ok: true, processed: 0 }; },
      async status() { return { online: true, pending: queued.length, conflicts: 0, failed: 0 }; }
    },
    MorphoraBookmarks: { load: () => stores.get("bookmarks"), replaceStore(value) { stores.set("bookmarks", value); }, normalizeBookmark: (x) => x },
    MORPHORA_CONFIG: { userDataSchemaVersion: 2 },
    navigator: { onLine: true },
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; },
    addEventListener(type, cb) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(cb); },
    dispatchEvent(event) { for (const cb of listeners.get(event.type) || []) cb(event); return true; },
    setTimeout() { return 0; }, clearTimeout() {}
  });
  context.window = context; context.globalThis = context;

  run(context, "backend/personal-sync-service.js");

  const captured = await context.MorphoraPersonalSync.captureLearningProgress();
  assert.strictEqual(captured.queued, 2);
  assert.ok(queued.some((item) => item.documentType === "learning_progress" && item.documentKey === "root"));
  assert.ok(queued.some((item) => item.documentType === "quiz_history" && item.documentKey === "quiz-a"));

  queued.length = 0;
  remote.learning_progress = [{
    document_key: "root", revision: 3, deleted_at: null,
    client_updated_at: "2026-10-05T13:00:00Z", updated_at: "2026-10-05T13:00:01Z",
    payload: {
      schemaVersion: 2, updatedAt: "2026-10-05T13:00:00Z",
      structures: {
        "ventral::zyg": { key: "ventral::zyg", viewId: "ventral", labelId: "zyg", name: "Zygomatic arch", attempts: 4, correct: 3, incorrect: 1, mastery: 75, streak: 1, history: [{ correct: false, at: "2026-10-05T13:00:00Z" }], reviewFlag: true, lastReviewedAt: "2026-10-05T13:00:00Z" }
      }, customQuestions: {}
    }
  }];
  remote.quiz_history = [{
    document_key: "quiz-b", revision: 1, deleted_at: null,
    client_updated_at: "2026-10-05T13:05:00Z", updated_at: "2026-10-05T13:05:01Z",
    payload: { id: "quiz-b", viewId: "ventral", viewTitle: "Ventral", type: "identify", completedAt: "2026-10-05T13:05:00Z", answered: 5, correct: 5, accuracy: 100, duration: 90000 }
  }];

  await context.MorphoraPersonalSync.pull();
  const merged = stores.get("learningProgress");
  assert.strictEqual(merged.structures["ventral::zyg"].attempts, 4);
  assert.strictEqual(merged.structures["ventral::zyg"].correct, 3);
  assert.strictEqual(merged.structures["ventral::zyg"].mastery, 100);
  assert.deepStrictEqual(new Set(merged.sessions.map((x) => x.id)), new Set(["quiz-a", "quiz-b"]));

  // A newer cloud reset must clear locally cached Study state and completed sessions.
  queued.length = 0;
  remote.learning_progress = [{ document_key: "root", revision: 4, deleted_at: "2026-10-05T14:00:00Z", client_updated_at: "2026-10-05T14:00:00Z", updated_at: "2026-10-05T14:00:01Z", payload: {} }];
  remote.quiz_history = [
    { document_key: "quiz-a", revision: 2, deleted_at: "2026-10-05T14:00:00Z", client_updated_at: "2026-10-05T14:00:00Z", updated_at: "2026-10-05T14:00:01Z", payload: {} },
    { document_key: "quiz-b", revision: 2, deleted_at: "2026-10-05T14:00:00Z", client_updated_at: "2026-10-05T14:00:00Z", updated_at: "2026-10-05T14:00:01Z", payload: {} }
  ];
  await context.MorphoraPersonalSync.pull();
  const cleared = stores.get("learningProgress");
  assert.strictEqual(Object.keys(cleared.structures).length, 0);
  assert.strictEqual(cleared.sessions.length, 0);
  queued.length = 0;
  const afterClearCapture = await context.MorphoraPersonalSync.captureLearningProgress(cleared);
  assert.strictEqual(afterClearCapture.queued, 0);

  // Explicit local reset still emits tombstones for known cloud records.
  stores.set("learningProgress", { ...merged, updatedAt: "2026-10-05T15:00:00Z" });
  remote.learning_progress = [{ document_key: "root", revision: 5, deleted_at: null, client_updated_at: "2026-10-05T15:00:00Z", updated_at: "2026-10-05T15:00:01Z", payload: { schemaVersion: 2, updatedAt: "2026-10-05T15:00:00Z", structures: merged.structures, customQuestions: {} } }];
  remote.quiz_history = [{ document_key: "quiz-a", revision: 3, deleted_at: null, client_updated_at: "2026-10-05T15:00:00Z", updated_at: "2026-10-05T15:00:01Z", payload: merged.sessions.find((x) => x.id === "quiz-a") }];
  await context.MorphoraPersonalSync.pull();
  queued.length = 0;
  const resetStore = { schemaVersion: 2, updatedAt: null, structures: {}, customQuestions: {}, sessions: [] };
  await context.MorphoraPersonalSync.captureLearningProgress(resetStore, { reset: true });
  assert.ok(queued.some((item) => item.operation === "delete" && item.documentType === "learning_progress" && item.documentKey === "root"));
  assert.ok(queued.some((item) => item.operation === "delete" && item.documentType === "quiz_history"));

  console.log("MORPHORA V5.0.5 learning progress sync runtime test");
  console.log("✓ Study progress queues as a revision-aware learning_progress document");
  console.log("✓ Completed quiz sessions queue as independent additive quiz_history documents");
  console.log("✓ Cross-device merge preserves advanced mastery and combines quiz sessions");
  console.log("✓ Learning-progress reset creates cloud tombstones rather than resurrecting old data");
})().catch((error) => { console.error(error); process.exitCode = 1; });
