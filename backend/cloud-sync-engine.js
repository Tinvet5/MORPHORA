(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Storage = root.MorphoraStorage;
  const Auth = root.MorphoraAuth;
  const Sync = root.MorphoraSync;
  const MAX_QUEUE = 500;
  const MAX_ATTEMPTS = 6;
  const MAX_BACKOFF_MS = 5 * 60 * 1000;
  const BASE_BACKOFF_MS = 2000;
  let flushing = false;
  let retryTimer = null;

  function nowIso() { return new Date().toISOString(); }
  function queueKey() { return Storage?.keys?.syncQueue || "morphora:sync-queue:v1"; }
  function stateKey() { return Storage?.keys?.syncState || "morphora:sync-state:v1"; }
  function clientKey() { return Storage?.keys?.syncClientId || "morphora:sync-client-id:v1"; }
  function readQueue() { return Storage?.readJSON?.(queueKey(), { fallback: [] }) || []; }
  function writeQueue(queue) { return Storage?.writeJSON?.(queueKey(), queue.slice(-MAX_QUEUE)); }
  function readState() { return Storage?.readJSON?.(stateKey(), { fallback: {} }) || {}; }
  function writeState(value) { return Storage?.writeJSON?.(stateKey(), value); }

  function uuid() {
    if (root.crypto?.randomUUID) return root.crypto.randomUUID();
    return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function getClientId() {
    let id = Storage?.readText?.(clientKey());
    if (!id) {
      id = uuid();
      Storage?.writeText?.(clientKey(), id);
    }
    return id;
  }

  function dispatchEvent(name, detail) {
    try {
      if (typeof root.dispatchEvent === "function" && typeof root.CustomEvent === "function") {
        root.dispatchEvent(new root.CustomEvent(name, { detail }));
      }
    } catch (_) {}
  }

  function dispatch(detail) { dispatchEvent("morphora:syncstatus", detail); }

  async function currentUser() {
    try {
      const { user, error } = await Auth?.getUser?.();
      if (error) throw error;
      return user || null;
    } catch (_) { return null; }
  }

  function online() { return root.navigator?.onLine !== false; }

  async function status() {
    const user = await currentUser();
    const queue = readQueue();
    const scoped = user ? queue.filter((item) => item.userId === user.id) : [];
    const state = readState();
    return Object.freeze({
      version: 1,
      online: online(),
      flushing,
      signedIn: Boolean(user),
      userId: user?.id || null,
      clientId: getClientId(),
      pending: scoped.filter((item) => item.state === "pending" || item.state === "retry").length,
      conflicts: scoped.filter((item) => item.state === "conflict").length,
      failed: scoped.filter((item) => item.state === "failed").length,
      totalForUser: scoped.length,
      totalOnDevice: queue.length,
      lastFlushAt: state.lastFlushAt || null,
      lastErrorAt: state.lastErrorAt || null
    });
  }

  async function emitStatus() { const value = await status(); dispatch(value); return value; }

  function scheduleRetry(queue) {
    if (retryTimer || typeof root.setTimeout !== "function") return;
    const due = queue
      .filter((item) => item.state === "retry" && Number.isFinite(item.nextAttemptAt))
      .map((item) => item.nextAttemptAt)
      .sort((a, b) => a - b)[0];
    if (!due) return;
    retryTimer = root.setTimeout(() => {
      retryTimer = null;
      flush().catch(() => {});
    }, Math.max(250, due - Date.now()));
  }

  function backoffMs(attempts) {
    return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, Math.max(0, attempts - 1)));
  }

  async function enqueue({ operation = "upsert", documentType, documentKey = "root", payload = {}, expectedRevision = null } = {}) {
    const user = await currentUser();
    if (!user) return { queued: false, reason: "signed-out" };
    if (!Sync?.documentTypes?.includes(documentType)) throw new Error(`Unsupported MORPHORA sync document type: ${documentType}`);
    if (!['upsert','delete'].includes(operation)) throw new Error(`Unsupported MORPHORA sync mutation operation: ${operation}`);

    const queue = readQueue();
    const clientId = getClientId();
    const mutation = {
      id: uuid(),
      userId: user.id,
      clientId,
      operation,
      documentType,
      documentKey: String(documentKey || "root"),
      payload: operation === "delete" ? {} : payload,
      expectedRevision: expectedRevision == null ? null : Number(expectedRevision),
      clientUpdatedAt: nowIso(),
      createdAt: nowIso(),
      attempts: 0,
      nextAttemptAt: 0,
      state: "pending",
      lastError: null,
      remote: null
    };

    // Coalesce mutations that have never left the device. Keep the oldest
    // revision precondition so multiple quick local edits still compare against
    // the same remote base.
    const existingIndex = queue.findIndex((item) =>
      item.userId === user.id && item.documentType === documentType && item.documentKey === mutation.documentKey && item.attempts === 0 && item.state === "pending"
    );
    if (existingIndex >= 0) {
      const previous = queue[existingIndex];
      mutation.expectedRevision = previous.expectedRevision;
      mutation.createdAt = previous.createdAt;
      queue[existingIndex] = mutation;
    } else {
      queue.push(mutation);
    }
    if (queue.length > MAX_QUEUE) throw new Error("MORPHORA sync queue limit reached. Resolve pending sync items before adding more.");
    const stored = writeQueue(queue);
    await emitStatus();
    if (online()) root.setTimeout?.(() => flush().catch(() => {}), 0);
    return { queued: true, mutation, storage: stored };
  }

  async function enqueueUpsert(documentType, documentKey, payload, options = {}) {
    return enqueue({ operation: "upsert", documentType, documentKey, payload, expectedRevision: options.expectedRevision ?? null });
  }

  async function enqueueDelete(documentType, documentKey, options = {}) {
    return enqueue({ operation: "delete", documentType, documentKey, expectedRevision: options.expectedRevision ?? null });
  }

  async function flush({ force = false, maxItems = 25 } = {}) {
    if (flushing) return { ok: false, reason: "already-flushing" };
    if (!online()) { await emitStatus(); return { ok: false, reason: "offline" }; }
    const user = await currentUser();
    if (!user) { await emitStatus(); return { ok: false, reason: "signed-out" }; }
    if (!Sync?.applyMutation) return { ok: false, reason: "sync-service-unavailable" };

    flushing = true;
    await emitStatus();
    let queue = readQueue();
    let processed = 0;
    let conflicts = 0;
    let failures = 0;
    try {
      for (const item of queue) {
        if (processed >= Math.max(1, Number(maxItems) || 25)) break;
        if (item.userId !== user.id) continue;
        if (["conflict", "failed"].includes(item.state)) continue;
        if (!force && item.nextAttemptAt && item.nextAttemptAt > Date.now()) continue;
        processed += 1;
        item.attempts = Number(item.attempts || 0) + 1;
        item.state = "sending";
        writeQueue(queue);
        try {
          const result = await Sync.applyMutation(item);
          if (result?.conflict) {
            item.state = "conflict";
            item.remote = result.remote || null;
            item.lastError = "revision-conflict";
            conflicts += 1;
            dispatchEvent("morphora:syncconflict", { mutation: { ...item }, remote: result.remote || null });
          } else if (result?.error) {
            throw result.error;
          } else {
            const appliedMutation = { ...item };
            queue = queue.filter((queued) => queued.id !== item.id);
            dispatchEvent("morphora:syncmutationapplied", { mutation: appliedMutation, remote: result?.data || null, alreadyApplied: Boolean(result?.alreadyApplied) });
          }
        } catch (error) {
          const current = queue.find((queued) => queued.id === item.id);
          if (!current) continue;
          current.lastError = error?.message || String(error);
          if (current.attempts >= MAX_ATTEMPTS) {
            current.state = "failed";
            failures += 1;
          } else {
            current.state = "retry";
            current.nextAttemptAt = Date.now() + backoffMs(current.attempts);
          }
          const state = readState();
          writeState({ ...state, lastErrorAt: nowIso() });
        }
        writeQueue(queue);
      }
      const state = readState();
      writeState({ ...state, lastFlushAt: nowIso() });
      scheduleRetry(queue);
      return { ok: true, processed, conflicts, failures, remaining: queue.filter((item) => item.userId === user.id).length };
    } finally {
      flushing = false;
      await emitStatus();
    }
  }

  async function retryMutation(id) {
    const user = await currentUser();
    if (!user) return false;
    const queue = readQueue();
    const item = queue.find((entry) => entry.id === id && entry.userId === user.id);
    if (!item) return false;
    item.state = "pending";
    item.attempts = 0;
    item.nextAttemptAt = 0;
    item.lastError = null;
    item.remote = null;
    writeQueue(queue);
    await emitStatus();
    return true;
  }

  async function discardMutation(id) {
    const user = await currentUser();
    if (!user) return false;
    const queue = readQueue();
    const next = queue.filter((entry) => !(entry.id === id && entry.userId === user.id));
    if (next.length === queue.length) return false;
    writeQueue(next);
    await emitStatus();
    return true;
  }


  async function resolveConflict(id, { strategy = "keep-local" } = {}) {
    const user = await currentUser();
    if (!user) return { ok: false, reason: "signed-out" };
    const queue = readQueue();
    const item = queue.find((entry) => entry.id === id && entry.userId === user.id && entry.state === "conflict");
    if (!item) return { ok: false, reason: "not-found" };
    if (strategy !== "keep-local") return { ok: false, reason: "unsupported-strategy" };

    const remoteRevision = Number(item.remote?.revision);
    item.expectedRevision = Number.isInteger(remoteRevision) && remoteRevision >= 0 ? remoteRevision : null;
    item.state = "pending";
    item.attempts = 0;
    item.nextAttemptAt = 0;
    item.lastError = null;
    writeQueue(queue);
    await emitStatus();
    if (online()) root.setTimeout?.(() => flush({ force: true }).catch(() => {}), 0);
    return { ok: true, mutation: { ...item } };
  }

  async function retryAllFailed() {
    const user = await currentUser();
    if (!user) return { ok: false, reason: "signed-out", count: 0 };
    const queue = readQueue();
    let count = 0;
    queue.forEach((item) => {
      if (item.userId !== user.id || item.state !== "failed") return;
      item.state = "pending";
      item.attempts = 0;
      item.nextAttemptAt = 0;
      item.lastError = null;
      count += 1;
    });
    if (count) writeQueue(queue);
    await emitStatus();
    if (count && online()) root.setTimeout?.(() => flush({ force: true }).catch(() => {}), 0);
    return { ok: true, count };
  }

  async function listQueue() {
    const user = await currentUser();
    if (!user) return [];
    return readQueue().filter((item) => item.userId === user.id).map((item) => ({ ...item }));
  }

  function bindRuntimeEvents() {
    root.addEventListener?.("online", () => flush().catch(() => {}));
    root.addEventListener?.("offline", () => emitStatus());
    root.addEventListener?.("morphora:authchange", () => { emitStatus(); if (online()) flush().catch(() => {}); });
  }

  bindRuntimeEvents();
  root.setTimeout?.(() => { if (online()) flush().catch(() => {}); }, 250);

  root.MorphoraCloudSync = Object.freeze({
    version: 1,
    maxQueue: MAX_QUEUE,
    maxAttempts: MAX_ATTEMPTS,
    getClientId,
    status,
    listQueue,
    enqueue,
    enqueueUpsert,
    enqueueDelete,
    flush,
    retryMutation,
    retryAllFailed,
    resolveConflict,
    discardMutation
  });
})();
