"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
const code = fs.readFileSync(path.join(ROOT, "backend/histology-sync-service.js"), "utf8");

(async () => {
  const data = new Map();
  const listeners = new Map();
  let user = { id: "u1" };
  let principal = "user:u1";
  let remoteRows = [];
  const queue = [];

  const storage = {
    keys: { localVaultPrincipal: "vault-principal" },
    readText(key, { fallback = null } = {}) { return data.has(key) ? data.get(key) : fallback; },
    writeText(key, value) { data.set(key, String(value)); return { ok: true }; },
    readJSON(key, { fallback = null } = {}) { return data.has(key) ? JSON.parse(data.get(key)) : fallback; },
    writeJSON(key, value) { data.set(key, JSON.stringify(value)); return { ok: true }; },
    listKeys({ prefix = "" } = {}) { return [...data.keys()].filter((key) => key.startsWith(prefix)).sort(); }
  };
  storage.writeText("vault-principal", principal);

  const context = vm.createContext({
    console, Date, Math, Promise, JSON,
    navigator: { onLine: true },
    MorphoraStorage: storage,
    MorphoraAuth: { getUser: async () => ({ user, error: null }) },
    MorphoraLocalVault: { getStatus: () => ({ principal }), ready: Promise.resolve({ principal }) },
    MorphoraSync: {
      async listDocuments(type) { assert.strictEqual(type, "annotations"); return { data: remoteRows, error: null }; }
    },
    MorphoraCloudSync: {
      async enqueueUpsert(documentType, documentKey, payload, options = {}) {
        const item = { id: `q${queue.length + 1}`, userId: user.id, state: "pending", documentType, documentKey, payload: JSON.parse(JSON.stringify(payload)), expectedRevision: options.expectedRevision ?? null };
        const existing = queue.findIndex((q) => q.documentKey === documentKey && q.state === "pending");
        if (existing >= 0) queue[existing] = item; else queue.push(item);
        return { queued: true, mutation: item };
      },
      async listQueue() { return queue.map((item) => ({ ...item })); },
      async flush() { return { ok: true, processed: 0 }; },
      async discardMutation(id) { const i = queue.findIndex((q) => q.id === id); if (i >= 0) queue.splice(i, 1); return i >= 0; }
    },
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; },
    addEventListener(type, cb) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(cb); },
    dispatchEvent(event) { for (const cb of listeners.get(event.type) || []) cb(event); return true; },
    setTimeout() { return 0; },
    clearTimeout() {}
  });
  context.window = context; context.globalThis = context;
  vm.runInContext(code, context, { filename: "backend/histology-sync-service.js" });
  const service = context.MorphoraHistologySync;
  assert(service && service.version === 1);
  assert(service.isHistologyDocumentKey("histology:hueso-2:workspace"));
  assert(!service.isHistologyDocumentKey("dog-skull:ventral"));

  // Guest -> first account adoption preserves Histology work.
  const guestKey = "morphora:histology-workspace:v1:guest:hueso-2";
  storage.writeJSON(guestKey, { schemaVersion: 3, slideId: "hueso-2", updatedAt: "2026-10-07T10:00:00.000Z", note: { text: "guest note", updatedAt: "2026-10-07T10:00:00.000Z" }, personalAnnotations: [], drawings: [], studyProgress: {}, quizHistory: [], bookmarked: false, studiedStructureIds: [] });
  const adopted = service.adoptGuestWorkspaces(user);
  assert.strictEqual(adopted.adopted, 1);
  const adoptedWorkspace = storage.readJSON("morphora:histology-workspace:v1:user:u1:hueso-2");
  assert.strictEqual(adoptedWorkspace.note.text, "guest note");
  assert.strictEqual(adoptedWorkspace.schemaVersion, 4);

  // Local workspace capture uses a namespaced revision-aware cloud document.
  queue.length = 0;
  await service.captureSlide("hueso-2", adoptedWorkspace);
  assert.strictEqual(queue.length, 1);
  assert.strictEqual(queue[0].documentType, "annotations");
  assert.strictEqual(queue[0].documentKey, "histology:hueso-2:workspace");
  assert.strictEqual(queue[0].payload.note.text, "guest note");

  // Remote newer workspace is restored locally when no local mutation is pending.
  queue.length = 0;
  remoteRows = [{
    document_key: "histology:hueso-2:workspace",
    revision: 4,
    client_updated_at: "2026-10-07T12:00:00.000Z",
    updated_at: "2026-10-07T12:00:00.000Z",
    deleted_at: null,
    payload: { schemaVersion: 4, slideId: "hueso-2", updatedAt: "2026-10-07T12:00:00.000Z", note: { text: "cloud note", updatedAt: "2026-10-07T12:00:00.000Z" }, bookmarked: true, drawings: [], studiedStructureIds: [], personalAnnotations: [], studyProgress: {}, quizHistory: [] }
  }];
  await service.pull({ user });
  const pulled = storage.readJSON("morphora:histology-workspace:v1:user:u1:hueso-2");
  assert.strictEqual(pulled.note.text, "cloud note");
  assert.strictEqual(pulled.bookmarked, true);

  // Cloud-conflict acceptance applies the remote Histology workspace, never Anatomy annotations.
  queue.push({ id: "conflict-1", userId: "u1", state: "conflict", documentType: "annotations", documentKey: "histology:hueso-2:workspace", remote: {
    revision: 7, deleted_at: null, client_updated_at: "2026-10-07T13:00:00.000Z",
    payload: { schemaVersion: 4, slideId: "hueso-2", updatedAt: "2026-10-07T13:00:00.000Z", note: { text: "conflict cloud", updatedAt: "2026-10-07T13:00:00.000Z" }, bookmarked: false, drawings: [], studiedStructureIds: [], personalAnnotations: [], studyProgress: {}, quizHistory: [] }
  }});
  const accepted = await service.acceptCloudConflict("conflict-1");
  assert.strictEqual(accepted.ok, true);
  assert.strictEqual(storage.readJSON("morphora:histology-workspace:v1:user:u1:hueso-2").note.text, "conflict cloud");
  assert(!queue.some((item) => item.id === "conflict-1"));

  console.log("MORPHORA Histology v0.7 cloud sync runtime test");
  console.log("✓ Guest Histology work adopts safely into the first signed-in account");
  console.log("✓ Whole-slide student workspace sync uses a revision-aware namespaced cloud document");
  console.log("✓ Newer remote Histology workspace restores locally without touching Anatomy stores");
  console.log("✓ Cloud conflict acceptance applies the correct Histology workspace");
})().catch((error) => { console.error(error); process.exitCode = 1; });
