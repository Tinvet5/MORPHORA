(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Storage = root.MorphoraStorage;
  const Auth = root.MorphoraAuth;
  const Sync = root.MorphoraSync;
  const Cloud = root.MorphoraCloudSync;
  const Vault = root.MorphoraLocalVault;

  const VERSION = 1;
  const WORKSPACE_PREFIX = "morphora:histology-workspace:v1:";
  const META_KEY = "morphora:histology-sync-meta:v1";
  const DOC_PREFIX = "histology:";
  const DOC_SUFFIX = ":workspace";
  let syncing = false;
  let initialized = false;
  let lastError = null;
  let captureTimer = null;

  function nowIso() { return new Date().toISOString(); }
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function sanitizePrincipal(value) {
    return String(value || "guest").replace(/[^a-zA-Z0-9._:@-]+/g, "_").slice(0, 180) || "guest";
  }
  function principalForUser(user) { return user?.id ? `user:${user.id}` : "guest"; }
  function currentPrincipal() {
    try { return sanitizePrincipal(Vault?.getStatus?.().principal || Storage?.readText?.(Storage?.keys?.localVaultPrincipal, { fallback: "guest" }) || "guest"); }
    catch (_) { return "guest"; }
  }
  function workspacePrefix(principal = currentPrincipal()) { return `${WORKSPACE_PREFIX}${sanitizePrincipal(principal)}:`; }
  function workspaceKey(slideId, principal = currentPrincipal()) { return `${workspacePrefix(principal)}${String(slideId || "")}`; }
  function documentKey(slideId) { return `${DOC_PREFIX}${String(slideId || "")}${DOC_SUFFIX}`; }
  function isHistologyDocumentKey(key) { return String(key || "").startsWith(DOC_PREFIX) && String(key || "").endsWith(DOC_SUFFIX); }
  function slideIdFromDocumentKey(key) {
    const value = String(key || "");
    if (!isHistologyDocumentKey(value)) return null;
    return value.slice(DOC_PREFIX.length, -DOC_SUFFIX.length) || null;
  }
  function slideIdFromWorkspaceKey(key, principal = currentPrincipal()) {
    const prefix = workspacePrefix(principal);
    const value = String(key || "");
    return value.startsWith(prefix) ? value.slice(prefix.length) || null : null;
  }

  function emptyWorkspace(slideId) {
    return {
      schemaVersion: 4,
      slideId: String(slideId || ""),
      updatedAt: null,
      note: { text: "", updatedAt: null },
      bookmarked: false,
      drawings: [],
      studiedStructureIds: [],
      personalAnnotations: [],
      studyProgress: {},
      quizHistory: []
    };
  }

  function normalizeWorkspace(value, slideId) {
    const base = emptyWorkspace(slideId);
    const input = value && typeof value === "object" ? value : {};
    return {
      ...base,
      ...clone(input),
      schemaVersion: Math.max(4, Number(input.schemaVersion) || 0),
      slideId: String(input.slideId || slideId || ""),
      note: { ...base.note, ...(input.note && typeof input.note === "object" ? clone(input.note) : {}) },
      drawings: Array.isArray(input.drawings) ? clone(input.drawings) : [],
      studiedStructureIds: Array.isArray(input.studiedStructureIds) ? [...input.studiedStructureIds] : [],
      personalAnnotations: Array.isArray(input.personalAnnotations) ? clone(input.personalAnnotations) : [],
      studyProgress: input.studyProgress && typeof input.studyProgress === "object" ? clone(input.studyProgress) : {},
      quizHistory: Array.isArray(input.quizHistory) ? clone(input.quizHistory) : []
    };
  }

  function meaningfulWorkspace(workspace) {
    if (!workspace) return false;
    return Boolean(
      String(workspace.note?.text || "").trim() || workspace.bookmarked ||
      (workspace.drawings?.length || 0) || (workspace.personalAnnotations?.length || 0) ||
      Object.keys(workspace.studyProgress || {}).length || (workspace.quizHistory?.length || 0) ||
      (workspace.studiedStructureIds?.length || 0)
    );
  }

  function readWorkspace(slideId, principal = currentPrincipal()) {
    const value = Storage?.readJSON?.(workspaceKey(slideId, principal), { fallback: null });
    return value ? normalizeWorkspace(value, slideId) : null;
  }

  function writeWorkspace(slideId, workspace, { principal = currentPrincipal(), source = "cloud" } = {}) {
    const normalized = normalizeWorkspace(workspace, slideId);
    Storage?.writeJSON?.(workspaceKey(slideId, principal), normalized);
    try {
      root.dispatchEvent?.(new root.CustomEvent("morphora:histologyworkspaceremotechange", {
        detail: { slideId: String(slideId), workspace: clone(normalized), source }
      }));
    } catch (_) {}
    return normalized;
  }

  function listLocalWorkspaces(principal = currentPrincipal()) {
    const prefix = workspacePrefix(principal);
    const result = new Map();
    for (const key of Storage?.listKeys?.({ prefix }) || []) {
      const slideId = slideIdFromWorkspaceKey(key, principal);
      if (!slideId) continue;
      const value = Storage?.readJSON?.(key, { fallback: null });
      if (value && typeof value === "object") result.set(slideId, normalizeWorkspace(value, slideId));
    }
    return result;
  }

  function readMeta() {
    const value = Storage?.readJSON?.(META_KEY, { fallback: { version: VERSION, users: {} } });
    return value && typeof value === "object" ? value : { version: VERSION, users: {} };
  }
  function writeMeta(value) { Storage?.writeJSON?.(META_KEY, value); }
  function userMeta(meta, userId) {
    if (!meta.users || typeof meta.users !== "object") meta.users = {};
    if (!meta.users[userId]) meta.users[userId] = { slides: {}, lastPullAt: null, lastSyncAt: null };
    if (!meta.users[userId].slides || typeof meta.users[userId].slides !== "object") meta.users[userId].slides = {};
    return meta.users[userId];
  }
  function slideMeta(meta, userId, slideId) {
    const scoped = userMeta(meta, userId);
    if (!scoped.slides[slideId]) scoped.slides[slideId] = { revision: 0, fingerprint: null, remoteUpdatedAt: null, localUpdatedAt: null };
    return scoped.slides[slideId];
  }

  function fingerprint(value) {
    try { return JSON.stringify(value); } catch (_) { return String(value); }
  }
  function rowTime(row) { return row?.client_updated_at || row?.updated_at || row?.deleted_at || null; }
  function workspaceTime(workspace) { return workspace?.updatedAt || workspace?.note?.updatedAt || null; }

  async function currentUser() {
    try {
      const result = await Auth?.getUser?.();
      if (result?.error) throw result.error;
      return result?.user || null;
    } catch (_) { return null; }
  }

  async function histologyQueue() {
    const queue = await Cloud?.listQueue?.() || [];
    return queue.filter((item) => item.documentType === "annotations" && isHistologyDocumentKey(item.documentKey));
  }

  async function status() {
    const user = await currentUser();
    const queue = user ? await histologyQueue() : [];
    const meta = readMeta();
    const scoped = user ? userMeta(meta, user.id) : null;
    const online = root.navigator?.onLine !== false;
    const pending = queue.filter((item) => ["pending", "retry", "sending"].includes(item.state)).length;
    const conflicts = queue.filter((item) => item.state === "conflict").length;
    const failed = queue.filter((item) => item.state === "failed").length;
    const state = !user ? "local" : !online ? "offline" : conflicts || failed ? "attention" : syncing || pending ? "syncing" : "synced";
    return Object.freeze({
      version: VERSION,
      state,
      signedIn: Boolean(user),
      userId: user?.id || null,
      online,
      syncing,
      pending,
      conflicts,
      failed,
      lastSyncAt: scoped?.lastSyncAt || null,
      lastError
    });
  }

  async function emitStatus(reason = "status") {
    const value = await status();
    try { root.dispatchEvent?.(new root.CustomEvent("morphora:histologysyncstate", { detail: { ...value, reason } })); } catch (_) {}
    return value;
  }

  function adoptGuestWorkspaces(user) {
    if (!user?.id) return { adopted: 0 };
    const guest = listLocalWorkspaces("guest");
    if (!guest.size) return { adopted: 0 };
    const principal = principalForUser(user);
    let adopted = 0;
    for (const [slideId, workspace] of guest.entries()) {
      const targetKey = workspaceKey(slideId, principal);
      if (Storage?.readJSON?.(targetKey, { fallback: null })) continue;
      Storage?.writeJSON?.(targetKey, normalizeWorkspace(workspace, slideId));
      adopted += 1;
    }
    if (adopted) {
      try { root.dispatchEvent?.(new root.CustomEvent("morphora:histologyguestadopted", { detail: { count: adopted, userId: user.id } })); } catch (_) {}
    }
    return { adopted };
  }

  async function pullRemoteRows() {
    const response = await Sync?.listDocuments?.("annotations", { includeDeleted: true });
    if (response?.error) throw response.error;
    return (Array.isArray(response?.data) ? response.data : []).filter((row) => isHistologyDocumentKey(row.document_key));
  }

  async function enqueueWorkspace(slideId, workspace, meta, user, expectedRevision = null) {
    if (!user || !Cloud?.enqueueUpsert) return { queued: false, reason: "signed-out" };
    const normalized = normalizeWorkspace(workspace, slideId);
    const entry = slideMeta(meta, user.id, slideId);
    const expected = expectedRevision == null ? (Number.isInteger(entry.revision) ? entry.revision : 0) : expectedRevision;
    const result = await Cloud.enqueueUpsert("annotations", documentKey(slideId), normalized, { expectedRevision: expected });
    if (result?.queued) {
      entry.fingerprint = fingerprint(normalized);
      entry.localUpdatedAt = workspaceTime(normalized) || nowIso();
    }
    return result;
  }

  async function pull({ user = null, meta = null } = {}) {
    const activeUser = user || await currentUser();
    if (!activeUser || !Sync?.listDocuments) return { skipped: true, reason: "signed-out" };
    const state = meta || readMeta();
    const rows = await pullRemoteRows();
    const pending = new Map((await histologyQueue()).map((item) => [item.documentKey, item]));
    const local = listLocalWorkspaces(principalForUser(activeUser));
    const seen = new Set();
    let applied = 0;
    let queued = 0;

    for (const row of rows) {
      const slideId = slideIdFromDocumentKey(row.document_key);
      if (!slideId) continue;
      seen.add(slideId);
      const entry = slideMeta(state, activeUser.id, slideId);
      entry.revision = Number(row.revision || 0);
      entry.remoteUpdatedAt = rowTime(row);
      if (pending.has(row.document_key)) continue;

      const localWorkspace = local.get(slideId) || null;
      if (row.deleted_at) {
        const localTime = workspaceTime(localWorkspace);
        if (meaningfulWorkspace(localWorkspace) && localTime && rowTime(row) && String(localTime) > String(rowTime(row))) {
          const result = await enqueueWorkspace(slideId, localWorkspace, state, activeUser, Number(row.revision || 0));
          if (result?.queued) queued += 1;
        } else if (localWorkspace) {
          const empty = emptyWorkspace(slideId);
          empty.updatedAt = rowTime(row) || nowIso();
          writeWorkspace(slideId, empty, { principal: principalForUser(activeUser), source: "cloud" });
          entry.fingerprint = fingerprint(empty);
          entry.localUpdatedAt = empty.updatedAt;
          applied += 1;
        }
        continue;
      }

      const remoteWorkspace = normalizeWorkspace(row.payload, slideId);
      const localUpdated = workspaceTime(localWorkspace);
      const remoteUpdated = workspaceTime(remoteWorkspace) || rowTime(row);
      if (meaningfulWorkspace(localWorkspace) && localUpdated && remoteUpdated && String(localUpdated) > String(remoteUpdated)) {
        const result = await enqueueWorkspace(slideId, localWorkspace, state, activeUser, Number(row.revision || 0));
        if (result?.queued) queued += 1;
      } else if (!localWorkspace || fingerprint(localWorkspace) !== fingerprint(remoteWorkspace)) {
        writeWorkspace(slideId, remoteWorkspace, { principal: principalForUser(activeUser), source: "cloud" });
        entry.fingerprint = fingerprint(remoteWorkspace);
        entry.localUpdatedAt = workspaceTime(remoteWorkspace) || remoteUpdated || nowIso();
        applied += 1;
      } else {
        entry.fingerprint = fingerprint(localWorkspace);
        entry.localUpdatedAt = workspaceTime(localWorkspace);
      }
    }

    for (const [slideId, workspace] of local.entries()) {
      if (seen.has(slideId) || !meaningfulWorkspace(workspace)) continue;
      const result = await enqueueWorkspace(slideId, workspace, state, activeUser, 0);
      if (result?.queued) queued += 1;
    }

    userMeta(state, activeUser.id).lastPullAt = nowIso();
    writeMeta(state);
    return { skipped: false, rows: rows.length, applied, queued };
  }

  async function captureSlide(slideId, workspace = null) {
    const user = await currentUser();
    if (!user || !Cloud?.enqueueUpsert) return { queued: false, reason: "signed-out" };
    const principal = principalForUser(user);
    const localWorkspace = normalizeWorkspace(workspace || readWorkspace(slideId, principal) || emptyWorkspace(slideId), slideId);
    const meta = readMeta();
    const entry = slideMeta(meta, user.id, slideId);
    const currentFingerprint = fingerprint(localWorkspace);
    const queued = await histologyQueue();
    const existing = queued.find((item) => item.documentKey === documentKey(slideId));
    if (currentFingerprint === entry.fingerprint && !existing) return { queued: false, reason: "unchanged" };
    const result = await enqueueWorkspace(slideId, localWorkspace, meta, user);
    writeMeta(meta);
    await emitStatus("captured");
    return result;
  }

  async function captureAll() {
    const user = await currentUser();
    if (!user) return { queued: 0, skipped: true };
    const workspaces = listLocalWorkspaces(principalForUser(user));
    let queued = 0;
    for (const [slideId, workspace] of workspaces.entries()) {
      const result = await captureSlide(slideId, workspace);
      if (result?.queued) queued += 1;
    }
    return { queued, skipped: false };
  }

  async function synchronize({ flush = true } = {}) {
    if (syncing) return { ok: false, reason: "already-syncing" };
    const user = await currentUser();
    if (!user) { await emitStatus("signed-out"); return { ok: false, reason: "signed-out" }; }
    syncing = true;
    lastError = null;
    await emitStatus("sync-start");
    try {
      adoptGuestWorkspaces(user);
      await Promise.resolve(Vault?.ready).catch(() => {});
      const meta = readMeta();
      const pulled = await pull({ user, meta });
      const captured = await captureAll();
      const flushed = flush && root.navigator?.onLine !== false ? await Cloud?.flush?.({ force: true, maxItems: 100 }) : { ok: false, reason: "offline" };
      const repulled = root.navigator?.onLine !== false ? await pull({ user, meta: readMeta() }) : { skipped: true, reason: "offline" };
      const finalMeta = readMeta();
      userMeta(finalMeta, user.id).lastSyncAt = nowIso();
      writeMeta(finalMeta);
      return { ok: true, pulled, captured, flushed, repulled };
    } catch (error) {
      lastError = error?.message || String(error);
      return { ok: false, error };
    } finally {
      syncing = false;
      await emitStatus("sync-end");
    }
  }

  function updateRevisionFromMutation(event) {
    const mutation = event?.detail?.mutation;
    const remote = event?.detail?.remote;
    if (mutation?.documentType !== "annotations" || !isHistologyDocumentKey(mutation.documentKey) || !mutation.userId) return;
    const slideId = slideIdFromDocumentKey(mutation.documentKey);
    if (!slideId) return;
    const meta = readMeta();
    const entry = slideMeta(meta, mutation.userId, slideId);
    entry.revision = Number(remote?.revision || entry.revision || 0);
    entry.remoteUpdatedAt = rowTime(remote) || nowIso();
    entry.fingerprint = mutation.operation === "delete" ? null : fingerprint(mutation.payload || {});
    entry.localUpdatedAt = mutation.operation === "delete" ? null : (workspaceTime(mutation.payload) || mutation.clientUpdatedAt || nowIso());
    writeMeta(meta);
  }

  async function acceptCloudConflict(mutationId) {
    const user = await currentUser();
    if (!user) return { ok: false, reason: "signed-out" };
    const queue = await Cloud?.listQueue?.() || [];
    const mutation = queue.find((item) => item.id === mutationId && item.state === "conflict" && item.documentType === "annotations" && isHistologyDocumentKey(item.documentKey));
    if (!mutation) return { ok: false, reason: "not-found" };
    const slideId = slideIdFromDocumentKey(mutation.documentKey);
    const remote = mutation.remote || null;
    const principal = principalForUser(user);
    const workspace = remote?.deleted_at ? emptyWorkspace(slideId) : normalizeWorkspace(remote?.payload, slideId);
    if (remote?.deleted_at) workspace.updatedAt = rowTime(remote) || nowIso();
    writeWorkspace(slideId, workspace, { principal, source: "cloud-conflict" });
    const meta = readMeta();
    const entry = slideMeta(meta, user.id, slideId);
    entry.revision = Number(remote?.revision || 0);
    entry.remoteUpdatedAt = rowTime(remote) || nowIso();
    entry.fingerprint = fingerprint(workspace);
    entry.localUpdatedAt = workspaceTime(workspace) || entry.remoteUpdatedAt;
    writeMeta(meta);
    await Cloud?.discardMutation?.(mutationId);
    await emitStatus("conflict-cloud-accepted");
    return { ok: true, slideId };
  }

  function scheduleCapture(slideId, workspace) {
    if (!slideId) return;
    root.clearTimeout?.(captureTimer);
    captureTimer = root.setTimeout?.(() => captureSlide(slideId, workspace).catch(() => {}), 160);
  }

  function bind() {
    if (initialized) return;
    initialized = true;
    root.addEventListener?.("morphora:histologyworkspacechange", (event) => {
      if (["cloud", "vault", "cloud-conflict"].includes(event?.detail?.source)) return;
      scheduleCapture(event?.detail?.slideId, event?.detail?.workspace);
    });
    root.addEventListener?.("morphora:syncmutationapplied", updateRevisionFromMutation);
    root.addEventListener?.("morphora:syncstatus", () => emitStatus("queue-status"));
    root.addEventListener?.("morphora:authchange", (event) => {
      const user = event?.detail?.session?.user || null;
      if (user) {
        root.setTimeout?.(() => Promise.resolve(Vault?.ready).then(() => { adoptGuestWorkspaces(user); return synchronize(); }).catch(() => {}), 80);
      } else emitStatus("signed-out");
    });
    root.addEventListener?.("online", () => root.setTimeout?.(() => synchronize().catch(() => {}), 120));
    root.addEventListener?.("offline", () => emitStatus("offline"));
    root.setTimeout?.(() => Promise.resolve(Vault?.ready).then(() => synchronize().catch(() => {})), 900);
  }

  bind();

  root.MorphoraHistologySync = Object.freeze({
    version: VERSION,
    workspacePrefix: WORKSPACE_PREFIX,
    documentPrefix: DOC_PREFIX,
    documentKey,
    isHistologyDocumentKey,
    status,
    synchronize,
    pull,
    captureSlide,
    captureAll,
    acceptCloudConflict,
    adoptGuestWorkspaces
  });
})();
