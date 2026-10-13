"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const ROOT = path.resolve(__dirname, "..");
function run(context, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), context, { filename: rel }); }

(async () => {
  const data = new Map();
  const listeners = new Map();
  let userId = "u1";
  let online = true;
  let behavior = "success";
  const applied = [];
  let uuidCounter = 0;

  const storage = {
    keys: { syncQueue: "queue", syncState: "state", syncClientId: "client" },
    readJSON(key, { fallback = null } = {}) { return data.has(key) ? JSON.parse(data.get(key)) : fallback; },
    writeJSON(key, value) { data.set(key, JSON.stringify(value)); return { ok: true }; },
    readText(key) { return data.get(key) || null; },
    writeText(key, value) { data.set(key, String(value)); return { ok: true }; }
  };

  const context = vm.createContext({
    console,
    Date,
    Math,
    Promise,
    MorphoraStorage: storage,
    MorphoraAuth: { getUser: async () => ({ user: userId ? { id: userId } : null, error: null }) },
    MorphoraSync: {
      documentTypes: ["annotations", "drawings", "learning_progress", "quiz_history", "bookmarks"],
      async applyMutation(item) {
        applied.push(JSON.parse(JSON.stringify(item)));
        if (behavior === "conflict") return { data: null, error: null, conflict: true, remote: { revision: 9, last_mutation_id: "other" } };
        if (behavior === "error") throw new Error("network down");
        return { data: { revision: (item.expectedRevision || 0) + 1 }, error: null, conflict: false };
      }
    },
    navigator: {},
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, "0")}` },
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; },
    addEventListener(type, cb) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(cb); },
    dispatchEvent(event) { for (const cb of listeners.get(event.type) || []) cb(event); return true; },
    setTimeout() { return 0; },
    clearTimeout() {}
  });
  Object.defineProperty(context.navigator, "onLine", { get: () => online });
  context.window = context; context.globalThis = context;
  run(context, "backend/cloud-sync-engine.js");

  assert.strictEqual(context.MorphoraCloudSync.version, 1);
  const first = await context.MorphoraCloudSync.enqueueUpsert("annotations", "dog-skull:ventral", { a: 1 }, { expectedRevision: 4 });
  assert.strictEqual(first.queued, true);
  await context.MorphoraCloudSync.enqueueUpsert("annotations", "dog-skull:ventral", { a: 2 }, { expectedRevision: 999 });
  let queue = await context.MorphoraCloudSync.listQueue();
  assert.strictEqual(queue.length, 1, "unsent mutations for the same document should coalesce");
  assert.strictEqual(queue[0].expectedRevision, 4, "coalescing must preserve the original remote base revision");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(queue[0].payload)), { a: 2 });

  const flushed = await context.MorphoraCloudSync.flush({ force: true });
  assert.strictEqual(flushed.ok, true);
  assert.strictEqual(applied[0].expectedRevision, 4);
  assert.strictEqual((await context.MorphoraCloudSync.listQueue()).length, 0);

  behavior = "conflict";
  await context.MorphoraCloudSync.enqueueUpsert("bookmarks", "atlas", { saved: true }, { expectedRevision: 2 });
  await context.MorphoraCloudSync.flush({ force: true });
  let status = await context.MorphoraCloudSync.status();
  assert.strictEqual(status.conflicts, 1, "revision conflicts must remain visible instead of being overwritten");
  queue = await context.MorphoraCloudSync.listQueue();
  assert.strictEqual(queue[0].remote.revision, 9);

  behavior = "success";
  const resolved = await context.MorphoraCloudSync.resolveConflict(queue[0].id, { strategy: "keep-local" });
  assert.strictEqual(resolved.ok, true);
  queue = await context.MorphoraCloudSync.listQueue();
  assert.strictEqual(queue[0].expectedRevision, 9, "keeping the local version must advance to the latest remote revision");
  await context.MorphoraCloudSync.flush({ force: true });
  assert.strictEqual((await context.MorphoraCloudSync.listQueue()).length, 0);

  // Queues are scoped to the account that created them.
  online = false;
  await context.MorphoraCloudSync.enqueueUpsert("drawings", "view-1", { paths: [] }, { expectedRevision: 1 });
  userId = "u2";
  status = await context.MorphoraCloudSync.status();
  assert.strictEqual(status.totalForUser, 0);
  assert.strictEqual(status.totalOnDevice, 1);
  const offlineFlush = await context.MorphoraCloudSync.flush({ force: true });
  assert.strictEqual(offlineFlush.reason, "offline");

  console.log("MORPHORA V5.0.5 cloud sync foundation runtime test");
  console.log("✓ Unsent mutations coalesce while preserving the original revision precondition");
  console.log("✓ Successful mutations leave the durable queue");
  console.log("✓ Revision conflicts remain explicit and Keep-this-device advances to the latest remote revision");
  console.log("✓ Pending queue items are isolated by authenticated user ID");
  console.log("✓ Offline flushes preserve local queue state");
})().catch((error) => { console.error(error); process.exitCode = 1; });
