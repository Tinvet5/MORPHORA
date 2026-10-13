(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Storage = root.MorphoraStorage;
  const Auth = root.MorphoraAuth;
  const Sync = root.MorphoraSync;
  const Cloud = root.MorphoraCloudSync;
  const Bookmarks = root.MorphoraBookmarks;
  const META_VERSION = 1;
  let syncing = false;
  let initialized = false;
  let lastError = null;

  function isHistologyDocumentKey(value) {
    return String(value || "").startsWith("histology:") && String(value || "").endsWith(":workspace");
  }

  function nowIso() { return new Date().toISOString(); }
  function metaKey() { return Storage?.keys?.personalSyncMeta || "morphora:personal-sync-meta:v1"; }
  function emptyMeta() { return { version: META_VERSION, users: {} }; }
  function readMeta() { return Storage?.readJSON?.(metaKey(), { fallback: emptyMeta() }) || emptyMeta(); }
  function writeMeta(meta) { return Storage?.writeJSON?.(metaKey(), meta); }

  async function currentUser() {
    try {
      const result = await Auth?.getUser?.();
      if (result?.error) throw result.error;
      return result?.user || null;
    } catch (_) { return null; }
  }

  function userMeta(meta, userId) {
    if (!meta.users || typeof meta.users !== "object") meta.users = {};
    if (!meta.users[userId]) meta.users[userId] = { annotations: {}, bookmarks: {}, drawings: {}, learning_progress: {}, quiz_history: {}, lastPullAt: null };
    const value = meta.users[userId];
    if (!value.annotations || typeof value.annotations !== "object") value.annotations = {};
    if (!value.bookmarks || typeof value.bookmarks !== "object") value.bookmarks = {};
    if (!value.drawings || typeof value.drawings !== "object") value.drawings = {};
    if (!value.learning_progress || typeof value.learning_progress !== "object") value.learning_progress = {};
    if (!value.quiz_history || typeof value.quiz_history !== "object") value.quiz_history = {};
    return value;
  }

  function flattenAnnotations(store) {
    const map = new Map();
    const views = store?.views && typeof store.views === "object" ? store.views : {};
    Object.values(views).forEach((notes) => {
      if (!Array.isArray(notes)) return;
      notes.forEach((note) => {
        if (note?.id) map.set(String(note.id), JSON.parse(JSON.stringify(note)));
      });
    });
    return map;
  }

  function buildAnnotationStore(map, previous) {
    const views = {};
    for (const note of map.values()) {
      if (!note?.viewId) continue;
      if (!views[note.viewId]) views[note.viewId] = [];
      views[note.viewId].push(note);
    }
    Object.values(views).forEach((notes) => notes.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""))));
    return {
      schemaVersion: Number(previous?.schemaVersion || root.MORPHORA_CONFIG?.userDataSchemaVersion || 2),
      updatedAt: nowIso(),
      views
    };
  }

  function bookmarkMap(store) {
    return new Map(Object.entries(store?.items && typeof store.items === "object" ? store.items : {}));
  }

  function latestDrawingUpdate(strokes = []) {
    if (!Array.isArray(strokes) || !strokes.length) return null;
    return strokes.reduce((latest, stroke) => {
      const value = stroke?.updatedAt || stroke?.createdAt || null;
      return newestIso(latest, value);
    }, null);
  }

  function drawingMap(store) {
    const views = store?.views && typeof store.views === "object" ? store.views : {};
    const map = new Map();
    Object.entries(views).forEach(([viewId, strokes]) => {
      if (!viewId || !Array.isArray(strokes) || !strokes.length) return;
      map.set(String(viewId), {
        viewId: String(viewId),
        strokes: JSON.parse(JSON.stringify(strokes)),
        updatedAt: latestDrawingUpdate(strokes) || store?.updatedAt || nowIso()
      });
    });
    return map;
  }

  function buildDrawingStore(map, previous) {
    const views = {};
    for (const [viewId, drawing] of map.entries()) {
      const strokes = Array.isArray(drawing?.strokes) ? drawing.strokes : [];
      if (!strokes.length) continue;
      views[String(viewId)] = JSON.parse(JSON.stringify(strokes));
    }
    return {
      schemaVersion: Number(previous?.schemaVersion || root.MORPHORA_CONFIG?.userDataSchemaVersion || 2),
      updatedAt: nowIso(),
      preferences: { visible: previous?.preferences?.visible !== false },
      views
    };
  }

  function normalizeDrawingDocument(payload, viewId) {
    const strokes = Array.isArray(payload?.strokes) ? payload.strokes : [];
    if (!strokes.length) return null;
    return {
      viewId: String(payload?.viewId || viewId),
      strokes: JSON.parse(JSON.stringify(strokes)),
      updatedAt: payload?.updatedAt || latestDrawingUpdate(strokes) || nowIso()
    };
  }

  function emptyProgressStore() {
    return { schemaVersion: Number(root.MORPHORA_CONFIG?.userDataSchemaVersion || 2), updatedAt: null, structures: {}, customQuestions: {}, sessions: [] };
  }

  function progressPayload(store) {
    return {
      schemaVersion: Number(store?.schemaVersion || root.MORPHORA_CONFIG?.userDataSchemaVersion || 2),
      updatedAt: store?.updatedAt || null,
      structures: JSON.parse(JSON.stringify(store?.structures || {})),
      customQuestions: JSON.parse(JSON.stringify(store?.customQuestions || {}))
    };
  }

  function entryTime(value) { return value?.lastReviewedAt || value?.updatedAt || value?.createdAt || null; }

  function mergeHistory(a = [], b = [], limit = 20) {
    const map = new Map();
    [...a, ...b].forEach((item) => {
      if (!item || typeof item !== "object") return;
      const key = `${item.at || ""}|${item.rating || ""}|${item.correct === true ? "1" : item.correct === false ? "0" : ""}`;
      if (!map.has(key)) map.set(key, JSON.parse(JSON.stringify(item)));
    });
    return Array.from(map.values()).sort((x, y) => String(x.at || "").localeCompare(String(y.at || ""))).slice(-limit);
  }

  function mergeStructureProgress(local, remote, key) {
    if (!local) return remote ? JSON.parse(JSON.stringify(remote)) : null;
    if (!remote) return JSON.parse(JSON.stringify(local));
    const latest = String(entryTime(local) || "") >= String(entryTime(remote) || "") ? local : remote;
    const attempts = Math.max(Number(local.attempts) || 0, Number(remote.attempts) || 0);
    const correct = Math.min(attempts, Math.max(Number(local.correct) || 0, Number(remote.correct) || 0));
    const history = mergeHistory(local.history, remote.history);
    return {
      ...JSON.parse(JSON.stringify(latest)),
      key: latest.key || key,
      attempts,
      correct,
      incorrect: Math.max(0, attempts - correct),
      mastery: Math.max(Number(local.mastery) || 0, Number(remote.mastery) || 0),
      streak: Math.max(Number(local.streak) || 0, Number(remote.streak) || 0),
      history,
      lastReviewedAt: newestIso(local.lastReviewedAt, remote.lastReviewedAt)
    };
  }

  function mergeCustomProgress(local, remote) {
    if (!local) return remote ? JSON.parse(JSON.stringify(remote)) : null;
    if (!remote) return JSON.parse(JSON.stringify(local));
    const latest = String(entryTime(local) || "") >= String(entryTime(remote) || "") ? local : remote;
    const attempts = Math.max(Number(local.attempts) || 0, Number(remote.attempts) || 0);
    const correct = Math.min(attempts, Math.max(Number(local.correct) || 0, Number(remote.correct) || 0));
    return {
      ...JSON.parse(JSON.stringify(latest)),
      attempts,
      correct,
      mastery: Math.max(Number(local.mastery) || 0, Number(remote.mastery) || 0),
      lastReviewedAt: newestIso(local.lastReviewedAt, remote.lastReviewedAt)
    };
  }

  function mergeLearningStores(localStore, remotePayload, remoteSessions = []) {
    const local = localStore && typeof localStore === "object" ? localStore : emptyProgressStore();
    const remote = remotePayload && typeof remotePayload === "object" ? remotePayload : {};
    const structures = {};
    const structureKeys = new Set([...Object.keys(local.structures || {}), ...Object.keys(remote.structures || {})]);
    structureKeys.forEach((key) => {
      const merged = mergeStructureProgress(local.structures?.[key], remote.structures?.[key], key);
      if (merged) structures[key] = merged;
    });
    const customQuestions = {};
    const customKeys = new Set([...Object.keys(local.customQuestions || {}), ...Object.keys(remote.customQuestions || {})]);
    customKeys.forEach((key) => {
      const merged = mergeCustomProgress(local.customQuestions?.[key], remote.customQuestions?.[key]);
      if (merged) customQuestions[key] = merged;
    });
    const sessions = new Map();
    [...(Array.isArray(local.sessions) ? local.sessions : []), ...(Array.isArray(remoteSessions) ? remoteSessions : [])].forEach((session) => {
      if (!session || typeof session !== "object") return;
      const id = String(session.id || "");
      if (!id) return;
      const current = sessions.get(id);
      if (!current || String(session.completedAt || "") >= String(current.completedAt || "")) sessions.set(id, JSON.parse(JSON.stringify(session)));
    });
    return {
      schemaVersion: Number(local.schemaVersion || remote.schemaVersion || root.MORPHORA_CONFIG?.userDataSchemaVersion || 2),
      updatedAt: newestIso(local.updatedAt, remote.updatedAt),
      structures,
      customQuestions,
      sessions: Array.from(sessions.values()).sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || ""))).slice(0, 50)
    };
  }

  function newestIso(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    return String(a) >= String(b) ? a : b;
  }

  function remoteTime(row) { return row?.client_updated_at || row?.updated_at || row?.deleted_at || null; }
  function localTime(value) { return value?.updatedAt || value?.createdAt || null; }

  async function queueIndex() {
    const queue = await Cloud?.listQueue?.() || [];
    return new Map(queue.map((item) => [`${item.documentType}::${item.documentKey}`, item]));
  }

  function emit(detail = {}) {
    try {
      root.dispatchEvent?.(new root.CustomEvent("morphora:personalsyncstate", { detail }));
    } catch (_) {}
  }

  async function status() {
    const user = await currentUser();
    const cloudStatus = await Cloud?.status?.() || {};
    return Object.freeze({
      version: 1,
      signedIn: Boolean(user),
      userId: user?.id || null,
      online: root.navigator?.onLine !== false,
      syncing,
      pending: cloudStatus.pending || 0,
      conflicts: cloudStatus.conflicts || 0,
      failed: cloudStatus.failed || 0,
      lastError
    });
  }

  async function emitStatus(extra = {}) { const value = { ...(await status()), ...extra }; emit(value); return value; }

  async function captureAnnotations(store = null) {
    const user = await currentUser();
    if (!user || !Cloud?.enqueueUpsert) return { queued: 0, skipped: true };
    const localStore = store || Storage?.readStore?.("annotations", { fallback: { schemaVersion: 2, updatedAt: null, views: {} } });
    const current = flattenAnnotations(localStore);
    const meta = readMeta();
    const scoped = userMeta(meta, user.id);
    let queued = 0;

    for (const [id, note] of current.entries()) {
      const entry = scoped.annotations[id] || {};
      const changed = !entry.localPresent || String(entry.localUpdatedAt || "") !== String(localTime(note) || "");
      if (!changed) continue;
      await Cloud.enqueueUpsert("annotations", id, note, { expectedRevision: Number.isInteger(entry.revision) ? entry.revision : 0 });
      scoped.annotations[id] = { ...entry, localPresent: true, localUpdatedAt: localTime(note) || nowIso() };
      queued += 1;
    }

    for (const [id, entry] of Object.entries(scoped.annotations)) {
      if (!entry?.localPresent || current.has(id)) continue;
      await Cloud.enqueueDelete("annotations", id, { expectedRevision: Number.isInteger(entry.revision) ? entry.revision : 0 });
      scoped.annotations[id] = { ...entry, localPresent: false, localUpdatedAt: nowIso() };
      queued += 1;
    }
    writeMeta(meta);
    await emitStatus({ reason: "annotations-captured" });
    return { queued, skipped: false };
  }

  async function captureBookmarks(store = null) {
    const user = await currentUser();
    if (!user || !Cloud?.enqueueUpsert) return { queued: 0, skipped: true };
    const localStore = store || Bookmarks?.load?.() || { items: {} };
    const current = bookmarkMap(localStore);
    const meta = readMeta();
    const scoped = userMeta(meta, user.id);
    let queued = 0;

    for (const [id, bookmark] of current.entries()) {
      const entry = scoped.bookmarks[id] || {};
      const changed = !entry.localPresent || String(entry.localUpdatedAt || "") !== String(localTime(bookmark) || "");
      if (!changed) continue;
      await Cloud.enqueueUpsert("bookmarks", id, bookmark, { expectedRevision: Number.isInteger(entry.revision) ? entry.revision : 0 });
      scoped.bookmarks[id] = { ...entry, localPresent: true, localUpdatedAt: localTime(bookmark) || nowIso() };
      queued += 1;
    }

    for (const [id, entry] of Object.entries(scoped.bookmarks)) {
      if (!entry?.localPresent || current.has(id)) continue;
      await Cloud.enqueueDelete("bookmarks", id, { expectedRevision: Number.isInteger(entry.revision) ? entry.revision : 0 });
      scoped.bookmarks[id] = { ...entry, localPresent: false, localUpdatedAt: nowIso() };
      queued += 1;
    }
    writeMeta(meta);
    await emitStatus({ reason: "bookmarks-captured" });
    return { queued, skipped: false };
  }

  async function captureDrawings(store = null) {
    const user = await currentUser();
    if (!user || !Cloud?.enqueueUpsert) return { queued: 0, skipped: true };
    const localStore = store || Storage?.readStore?.("drawings", { fallback: { schemaVersion: 2, updatedAt: null, preferences: { visible: true }, views: {} } }) || { schemaVersion: 2, updatedAt: null, preferences: { visible: true }, views: {} };
    const current = drawingMap(localStore);
    const meta = readMeta();
    const scoped = userMeta(meta, user.id);
    let queued = 0;

    for (const [id, drawing] of current.entries()) {
      const entry = scoped.drawings[id] || {};
      const changed = !entry.localPresent || String(entry.localUpdatedAt || "") !== String(localTime(drawing) || "");
      if (!changed) continue;
      await Cloud.enqueueUpsert("drawings", id, drawing, { expectedRevision: Number.isInteger(entry.revision) ? entry.revision : 0 });
      scoped.drawings[id] = { ...entry, localPresent: true, localUpdatedAt: localTime(drawing) || nowIso() };
      queued += 1;
    }

    for (const [id, entry] of Object.entries(scoped.drawings)) {
      if (!entry?.localPresent || current.has(id)) continue;
      await Cloud.enqueueDelete("drawings", id, { expectedRevision: Number.isInteger(entry.revision) ? entry.revision : 0 });
      scoped.drawings[id] = { ...entry, localPresent: false, localUpdatedAt: nowIso() };
      queued += 1;
    }
    writeMeta(meta);
    await emitStatus({ reason: "drawings-captured" });
    return { queued, skipped: false };
  }

  async function resetLearningProgressCloud(user, scoped) {
    const progressEntry = scoped.learning_progress.root || {};
    await Cloud.enqueueDelete("learning_progress", "root", { expectedRevision: Number.isInteger(progressEntry.revision) ? progressEntry.revision : null });
    scoped.learning_progress.root = { ...progressEntry, localPresent: false, localUpdatedAt: nowIso() };
    for (const [id, entry] of Object.entries(scoped.quiz_history)) {
      if (!entry?.localPresent) continue;
      await Cloud.enqueueDelete("quiz_history", id, { expectedRevision: Number.isInteger(entry.revision) ? entry.revision : null });
      scoped.quiz_history[id] = { ...entry, localPresent: false, localUpdatedAt: nowIso() };
    }
  }

  async function captureLearningProgress(store = null, { reset = false } = {}) {
    const user = await currentUser();
    if (!user || !Cloud?.enqueueUpsert) return { queued: 0, skipped: true };
    const localStore = store || Storage?.readStore?.("learningProgress", { fallback: emptyProgressStore() }) || emptyProgressStore();
    const meta = readMeta();
    const scoped = userMeta(meta, user.id);
    let queued = 0;

    if (reset) {
      await resetLearningProgressCloud(user, scoped);
      writeMeta(meta);
      await emitStatus({ reason: "learning-progress-reset" });
      return { queued: 1, skipped: false, reset: true };
    }

    const payload = progressPayload(localStore);
    const progressEntry = scoped.learning_progress.root || {};
    const progressUpdatedAt = localStore.updatedAt || null;
    const hasLearningData = Object.keys(localStore.structures || {}).length > 0 || Object.keys(localStore.customQuestions || {}).length > 0;
    const progressChanged = String(progressEntry.localUpdatedAt || "") !== String(progressUpdatedAt || "") || (hasLearningData && !progressEntry.localPresent);
    if (progressChanged && (hasLearningData || progressEntry.localPresent)) {
      await Cloud.enqueueUpsert("learning_progress", "root", payload, { expectedRevision: Number.isInteger(progressEntry.revision) ? progressEntry.revision : 0 });
      scoped.learning_progress.root = { ...progressEntry, localPresent: true, localUpdatedAt: progressUpdatedAt || nowIso() };
      queued += 1;
    }

    const sessions = Array.isArray(localStore.sessions) ? localStore.sessions : [];
    for (const session of sessions) {
      const id = String(session?.id || "");
      if (!id) continue;
      const entry = scoped.quiz_history[id] || {};
      const updatedAt = session.completedAt || session.startedAt || localStore.updatedAt || null;
      const changed = !entry.localPresent || String(entry.localUpdatedAt || "") !== String(updatedAt || "");
      if (!changed) continue;
      await Cloud.enqueueUpsert("quiz_history", id, session, { expectedRevision: Number.isInteger(entry.revision) ? entry.revision : 0 });
      scoped.quiz_history[id] = { ...entry, localPresent: true, localUpdatedAt: updatedAt || nowIso() };
      queued += 1;
    }

    writeMeta(meta);
    await emitStatus({ reason: "learning-progress-captured" });
    return { queued, skipped: false };
  }

  async function pullAnnotations(user, meta, pending) {
    const response = await Sync?.listDocuments?.("annotations", { includeDeleted: true });
    if (response?.error) throw response.error;
    const rows = Array.isArray(response?.data) ? response.data : [];
    const store = Storage?.readStore?.("annotations", { fallback: { schemaVersion: 2, updatedAt: null, views: {} } }) || { schemaVersion: 2, updatedAt: null, views: {} };
    const local = flattenAnnotations(store);
    const scoped = userMeta(meta, user.id);
    let changed = false;

    for (const row of rows) {
      const id = String(row.document_key || "");
      if (!id || isHistologyDocumentKey(id)) continue;
      const entry = scoped.annotations[id] || {};
      entry.revision = Number(row.revision || 0);
      entry.remoteUpdatedAt = remoteTime(row);
      scoped.annotations[id] = entry;
      if (pending.has(`annotations::${id}`)) continue;

      const existing = local.get(id);
      const localUpdated = localTime(existing);
      const remoteUpdated = remoteTime(row);
      if (row.deleted_at) {
        if (existing && localUpdated && remoteUpdated && localUpdated > remoteUpdated) {
          await Cloud.enqueueUpsert("annotations", id, existing, { expectedRevision: entry.revision });
          entry.localPresent = true;
          entry.localUpdatedAt = localUpdated;
        } else if (existing) {
          local.delete(id); changed = true;
          entry.localPresent = false;
          entry.localUpdatedAt = null;
        }
        continue;
      }
      const remoteNote = row.payload && typeof row.payload === "object" ? row.payload : null;
      if (!remoteNote?.id) continue;
      if (existing && localUpdated && remoteUpdated && localUpdated > remoteUpdated) {
        await Cloud.enqueueUpsert("annotations", id, existing, { expectedRevision: entry.revision });
        entry.localPresent = true;
        entry.localUpdatedAt = localUpdated;
      } else {
        if (JSON.stringify(existing || null) !== JSON.stringify(remoteNote)) { local.set(id, remoteNote); changed = true; }
        entry.localPresent = true;
        entry.localUpdatedAt = localTime(remoteNote) || remoteUpdated;
      }
    }

    if (changed) {
      const nextStore = buildAnnotationStore(local, store);
      Storage?.writeStore?.("annotations", nextStore);
      root.dispatchEvent?.(new root.CustomEvent("morphora:annotationsremotechange", { detail: { store: nextStore } }));
    }
    return { rows: rows.length, changed };
  }

  async function pullBookmarks(user, meta, pending) {
    const response = await Sync?.listDocuments?.("bookmarks", { includeDeleted: true });
    if (response?.error) throw response.error;
    const rows = Array.isArray(response?.data) ? response.data : [];
    const store = Bookmarks?.load?.() || { schemaVersion: 2, updatedAt: null, items: {} };
    const local = bookmarkMap(store);
    const scoped = userMeta(meta, user.id);
    let changed = false;

    for (const row of rows) {
      const id = String(row.document_key || "");
      if (!id || isHistologyDocumentKey(id)) continue;
      const entry = scoped.bookmarks[id] || {};
      entry.revision = Number(row.revision || 0);
      entry.remoteUpdatedAt = remoteTime(row);
      scoped.bookmarks[id] = entry;
      if (pending.has(`bookmarks::${id}`)) continue;

      const existing = local.get(id);
      const localUpdated = localTime(existing);
      const remoteUpdated = remoteTime(row);
      if (row.deleted_at) {
        if (existing && localUpdated && remoteUpdated && localUpdated > remoteUpdated) {
          await Cloud.enqueueUpsert("bookmarks", id, existing, { expectedRevision: entry.revision });
          entry.localPresent = true;
          entry.localUpdatedAt = localUpdated;
        } else if (existing) {
          local.delete(id); changed = true;
          entry.localPresent = false;
          entry.localUpdatedAt = null;
        }
        continue;
      }
      const remoteBookmark = Bookmarks?.normalizeBookmark?.(row.payload, id);
      if (!remoteBookmark) continue;
      if (existing && localUpdated && remoteUpdated && localUpdated > remoteUpdated) {
        await Cloud.enqueueUpsert("bookmarks", id, existing, { expectedRevision: entry.revision });
        entry.localPresent = true;
        entry.localUpdatedAt = localUpdated;
      } else {
        if (JSON.stringify(existing || null) !== JSON.stringify(remoteBookmark)) { local.set(id, remoteBookmark); changed = true; }
        entry.localPresent = true;
        entry.localUpdatedAt = localTime(remoteBookmark) || remoteUpdated;
      }
    }

    if (changed) {
      Bookmarks?.replaceStore?.({ schemaVersion: 2, updatedAt: nowIso(), items: Object.fromEntries(local) }, { source: "cloud" });
    }
    return { rows: rows.length, changed };
  }

  async function pullDrawings(user, meta, pending) {
    const response = await Sync?.listDocuments?.("drawings", { includeDeleted: true });
    if (response?.error) throw response.error;
    const rows = Array.isArray(response?.data) ? response.data : [];
    const store = Storage?.readStore?.("drawings", { fallback: { schemaVersion: 2, updatedAt: null, preferences: { visible: true }, views: {} } }) || { schemaVersion: 2, updatedAt: null, preferences: { visible: true }, views: {} };
    const local = drawingMap(store);
    const scoped = userMeta(meta, user.id);
    let changed = false;

    for (const row of rows) {
      const id = String(row.document_key || "");
      if (!id || isHistologyDocumentKey(id)) continue;
      const entry = scoped.drawings[id] || {};
      entry.revision = Number(row.revision || 0);
      entry.remoteUpdatedAt = remoteTime(row);
      scoped.drawings[id] = entry;
      if (pending.has(`drawings::${id}`)) continue;

      const existing = local.get(id);
      const localUpdated = localTime(existing);
      const remoteUpdated = remoteTime(row);
      if (row.deleted_at) {
        if (existing && localUpdated && remoteUpdated && localUpdated > remoteUpdated) {
          await Cloud.enqueueUpsert("drawings", id, existing, { expectedRevision: entry.revision });
          entry.localPresent = true;
          entry.localUpdatedAt = localUpdated;
        } else if (existing) {
          local.delete(id); changed = true;
          entry.localPresent = false;
          entry.localUpdatedAt = null;
        }
        continue;
      }

      const remoteDrawing = normalizeDrawingDocument(row.payload, id);
      if (!remoteDrawing) continue;
      if (existing && localUpdated && remoteUpdated && localUpdated > remoteUpdated) {
        await Cloud.enqueueUpsert("drawings", id, existing, { expectedRevision: entry.revision });
        entry.localPresent = true;
        entry.localUpdatedAt = localUpdated;
      } else {
        if (JSON.stringify(existing || null) !== JSON.stringify(remoteDrawing)) { local.set(id, remoteDrawing); changed = true; }
        entry.localPresent = true;
        entry.localUpdatedAt = localTime(remoteDrawing) || remoteUpdated;
      }
    }

    if (changed) {
      const nextStore = buildDrawingStore(local, store);
      Storage?.writeStore?.("drawings", nextStore);
      root.dispatchEvent?.(new root.CustomEvent("morphora:drawingsremotechange", { detail: { store: nextStore } }));
    }
    return { rows: rows.length, changed };
  }

  async function pullLearningProgress(user, meta, pending) {
    const localStore = Storage?.readStore?.("learningProgress", { fallback: emptyProgressStore() }) || emptyProgressStore();
    const scoped = userMeta(meta, user.id);

    const progressResponse = await Sync?.listDocuments?.("learning_progress", { includeDeleted: true });
    if (progressResponse?.error) throw progressResponse.error;
    const progressRows = Array.isArray(progressResponse?.data) ? progressResponse.data : [];
    const rootRow = progressRows.find((row) => String(row.document_key || "") === "root") || null;
    let remotePayload = null;
    if (rootRow) {
      const entry = scoped.learning_progress.root || {};
      entry.revision = Number(rootRow.revision || 0);
      entry.remoteUpdatedAt = remoteTime(rootRow);
      scoped.learning_progress.root = entry;
      if (!rootRow.deleted_at && !pending.has("learning_progress::root")) remotePayload = rootRow.payload || {};
      if (rootRow.deleted_at && !pending.has("learning_progress::root")) remotePayload = { schemaVersion: localStore.schemaVersion, updatedAt: remoteTime(rootRow), structures: {}, customQuestions: {} };
    }

    const quizResponse = await Sync?.listDocuments?.("quiz_history", { includeDeleted: true });
    if (quizResponse?.error) throw quizResponse.error;
    const quizRows = Array.isArray(quizResponse?.data) ? quizResponse.data : [];
    const remoteSessions = [];
    const deletedSessionIds = new Set();
    for (const row of quizRows) {
      const id = String(row.document_key || "");
      if (!id || isHistologyDocumentKey(id)) continue;
      const entry = scoped.quiz_history[id] || {};
      entry.revision = Number(row.revision || 0);
      entry.remoteUpdatedAt = remoteTime(row);
      scoped.quiz_history[id] = entry;
      if (pending.has(`quiz_history::${id}`)) continue;
      if (row.deleted_at) { deletedSessionIds.add(id); entry.localPresent = false; entry.localUpdatedAt = null; continue; }
      if (row.payload && typeof row.payload === "object") {
        remoteSessions.push(row.payload);
        entry.localPresent = true;
        entry.localUpdatedAt = row.payload.completedAt || remoteTime(row);
      }
    }

    let filteredLocal = { ...localStore, sessions: (Array.isArray(localStore.sessions) ? localStore.sessions : []).filter((session) => !deletedSessionIds.has(String(session?.id || ""))) };
    let acceptedRootTombstone = false;
    if (rootRow?.deleted_at && !pending.has("learning_progress::root")) {
      const deletionTime = remoteTime(rootRow);
      const localIsNewer = Boolean(localStore.updatedAt && deletionTime && String(localStore.updatedAt) > String(deletionTime));
      if (localIsNewer) {
        await Cloud.enqueueUpsert("learning_progress", "root", progressPayload(localStore), { expectedRevision: Number(rootRow.revision || 0) });
      } else {
        acceptedRootTombstone = true;
        filteredLocal = { ...filteredLocal, updatedAt: deletionTime, structures: {}, customQuestions: {} };
      }
    }
    const merged = mergeLearningStores(filteredLocal, remotePayload, remoteSessions);
    const changed = JSON.stringify(merged) !== JSON.stringify(localStore);
    if (changed) {
      Storage?.writeStore?.("learningProgress", merged);
      root.dispatchEvent?.(new root.CustomEvent("morphora:learningprogressremotechange", { detail: { store: merged } }));
    }

    const rootEntry = scoped.learning_progress.root || {};
    rootEntry.localPresent = !acceptedRootTombstone && (Object.keys(merged.structures || {}).length > 0 || Object.keys(merged.customQuestions || {}).length > 0);
    rootEntry.localUpdatedAt = rootEntry.localPresent ? (merged.updatedAt || localStore.updatedAt || null) : null;
    scoped.learning_progress.root = rootEntry;

    // If the merged state contains information not present in the cloud root,
    // queue one revision-aware write so both devices converge without dropping progress.
    if (rootRow && !rootRow.deleted_at && !pending.has("learning_progress::root")) {
      const cloudComparable = progressPayload({ ...merged, sessions: [] });
      if (JSON.stringify(cloudComparable) !== JSON.stringify(rootRow.payload || {})) {
        await Cloud.enqueueUpsert("learning_progress", "root", cloudComparable, { expectedRevision: Number(rootRow.revision || 0) });
      }
    }

    return { progressRows: progressRows.length, quizRows: quizRows.length, changed };
  }

  async function pull() {
    const user = await currentUser();
    if (!user || !Sync?.listDocuments) return { skipped: true, reason: "signed-out" };
    const meta = readMeta();
    const pending = await queueIndex();
    const annotations = await pullAnnotations(user, meta, pending);
    const bookmarks = await pullBookmarks(user, meta, pending);
    const drawings = await pullDrawings(user, meta, pending);
    const learning = await pullLearningProgress(user, meta, pending);
    userMeta(meta, user.id).lastPullAt = nowIso();
    writeMeta(meta);
    return { skipped: false, annotations, bookmarks, drawings, learning };
  }

  async function synchronize({ flush = true } = {}) {
    if (syncing) return { ok: false, reason: "already-syncing" };
    const user = await currentUser();
    if (!user) { await emitStatus({ reason: "signed-out" }); return { ok: false, reason: "signed-out" }; }
    syncing = true; lastError = null; await emitStatus({ reason: "sync-start" });
    try {
      const pulled = await pull();
      await captureAnnotations();
      await captureBookmarks();
      await captureDrawings();
      await captureLearningProgress();
      const flushed = flush && root.navigator?.onLine !== false ? await Cloud?.flush?.({ force: true, maxItems: 100 }) : { ok: false, reason: "offline" };
      // Refresh remote revisions after queued writes. This also propagates
      // changes from another device that landed during our flush.
      const repulled = root.navigator?.onLine !== false ? await pull() : { skipped: true, reason: "offline" };
      return { ok: true, pulled, flushed, repulled };
    } catch (error) {
      lastError = error?.message || String(error);
      return { ok: false, error };
    } finally {
      syncing = false;
      await emitStatus({ reason: "sync-end" });
    }
  }

  function updateRevisionFromMutation(event) {
    const mutation = event?.detail?.mutation;
    const remote = event?.detail?.remote;
    if (!mutation?.userId || !["annotations", "bookmarks", "drawings", "learning_progress", "quiz_history"].includes(mutation.documentType)) return;
    if (isHistologyDocumentKey(mutation.documentKey)) return;
    const meta = readMeta();
    const scoped = userMeta(meta, mutation.userId);
    const bucket = scoped[mutation.documentType];
    const entry = bucket[mutation.documentKey] || {};
    bucket[mutation.documentKey] = {
      ...entry,
      revision: Number(remote?.revision || entry.revision || 0),
      remoteUpdatedAt: remoteTime(remote) || entry.remoteUpdatedAt || nowIso(),
      localPresent: mutation.operation !== "delete",
      localUpdatedAt: mutation.operation === "delete" ? null : (localTime(mutation.payload) || mutation.clientUpdatedAt)
    };
    writeMeta(meta);
  }


  async function acceptCloudConflict(mutationId) {
    const user = await currentUser();
    if (!user) return { ok: false, reason: "signed-out" };
    const queue = await Cloud?.listQueue?.() || [];
    const mutation = queue.find((item) => item.id === mutationId && item.state === "conflict");
    if (!mutation) return { ok: false, reason: "not-found" };
    const remote = mutation.remote || null;
    const type = mutation.documentType;
    const key = String(mutation.documentKey || "root");
    if (isHistologyDocumentKey(key)) return { ok: false, reason: "histology-conflict" };
    const meta = readMeta();
    const scoped = userMeta(meta, user.id);
    const remoteDeleted = Boolean(remote?.deleted_at);
    const payload = remote?.payload && typeof remote.payload === "object" ? remote.payload : null;

    if (type === "annotations") {
      const store = Storage?.readStore?.("annotations", { fallback: { schemaVersion: 2, updatedAt: null, views: {} } }) || { schemaVersion: 2, updatedAt: null, views: {} };
      const map = flattenAnnotations(store);
      if (remoteDeleted || !payload?.id) map.delete(key);
      else map.set(key, JSON.parse(JSON.stringify(payload)));
      const next = buildAnnotationStore(map, store);
      Storage?.writeStore?.("annotations", next);
      root.dispatchEvent?.(new root.CustomEvent("morphora:annotationsremotechange", { detail: { store: next } }));
    } else if (type === "bookmarks") {
      const store = Bookmarks?.load?.() || { schemaVersion: 2, updatedAt: null, items: {} };
      const map = bookmarkMap(store);
      const normalized = remoteDeleted ? null : Bookmarks?.normalizeBookmark?.(payload, key);
      if (normalized) map.set(key, normalized); else map.delete(key);
      Bookmarks?.replaceStore?.({ schemaVersion: 2, updatedAt: nowIso(), items: Object.fromEntries(map) }, { source: "cloud" });
    } else if (type === "drawings") {
      const store = Storage?.readStore?.("drawings", { fallback: { schemaVersion: 2, updatedAt: null, preferences: { visible: true }, views: {} } }) || { schemaVersion: 2, updatedAt: null, preferences: { visible: true }, views: {} };
      const map = drawingMap(store);
      const normalized = remoteDeleted ? null : normalizeDrawingDocument(payload, key);
      if (normalized) map.set(key, normalized); else map.delete(key);
      const next = buildDrawingStore(map, store);
      Storage?.writeStore?.("drawings", next);
      root.dispatchEvent?.(new root.CustomEvent("morphora:drawingsremotechange", { detail: { store: next } }));
    } else if (type === "learning_progress") {
      const store = Storage?.readStore?.("learningProgress", { fallback: emptyProgressStore() }) || emptyProgressStore();
      const next = remoteDeleted
        ? { ...store, updatedAt: remoteTime(remote) || nowIso(), structures: {}, customQuestions: {} }
        : { ...store, ...progressPayload(payload || {}), sessions: Array.isArray(store.sessions) ? store.sessions : [], updatedAt: remoteTime(remote) || payload?.updatedAt || nowIso() };
      Storage?.writeStore?.("learningProgress", next);
      root.dispatchEvent?.(new root.CustomEvent("morphora:learningprogressremotechange", { detail: { store: next } }));
    } else if (type === "quiz_history") {
      const store = Storage?.readStore?.("learningProgress", { fallback: emptyProgressStore() }) || emptyProgressStore();
      const sessions = Array.isArray(store.sessions) ? [...store.sessions] : [];
      const index = sessions.findIndex((session) => String(session?.id || "") === key);
      if (remoteDeleted || !payload) {
        if (index >= 0) sessions.splice(index, 1);
      } else if (index >= 0) sessions[index] = JSON.parse(JSON.stringify(payload));
      else sessions.push(JSON.parse(JSON.stringify(payload)));
      const next = { ...store, sessions, updatedAt: nowIso() };
      Storage?.writeStore?.("learningProgress", next);
      root.dispatchEvent?.(new root.CustomEvent("morphora:learningprogressremotechange", { detail: { store: next } }));
    } else {
      return { ok: false, reason: "unsupported-type" };
    }

    const bucket = scoped[type] || (scoped[type] = {});
    bucket[key] = {
      ...(bucket[key] || {}),
      revision: Number(remote?.revision || 0),
      remoteUpdatedAt: remoteTime(remote) || nowIso(),
      localPresent: !remoteDeleted,
      localUpdatedAt: remoteDeleted ? null : (payload?.updatedAt || payload?.completedAt || remoteTime(remote) || nowIso())
    };
    writeMeta(meta);
    await Cloud?.discardMutation?.(mutationId);
    await emitStatus({ reason: "conflict-cloud-accepted" });
    return { ok: true, type, key };
  }

  function bind() {
    if (initialized) return;
    initialized = true;
    root.addEventListener?.("morphora:bookmarkschange", (event) => {
      if (["cloud", "vault"].includes(event?.detail?.source)) return;
      captureBookmarks(event?.detail?.store).catch(() => {});
    });
    root.addEventListener?.("morphora:drawingschange", (event) => {
      if (["cloud", "vault"].includes(event?.detail?.source)) return;
      captureDrawings(event?.detail?.store).catch(() => {});
    });
    root.addEventListener?.("morphora:learningprogresschange", (event) => {
      if (["cloud", "vault"].includes(event?.detail?.source)) return;
      captureLearningProgress(event?.detail?.store, { reset: Boolean(event?.detail?.reset) }).catch(() => {});
    });
    root.addEventListener?.("morphora:syncmutationapplied", updateRevisionFromMutation);
    root.addEventListener?.("morphora:authchange", (event) => {
      if (event?.detail?.session?.user) {
        root.setTimeout?.(() => Promise.resolve(root.MorphoraLocalVault?.ready).then(() => synchronize().catch(() => {})), 50);
      } else emitStatus({ reason: "signed-out" });
    });
    root.addEventListener?.("online", () => root.setTimeout?.(() => Promise.resolve(root.MorphoraLocalVault?.ready).then(() => synchronize().catch(() => {})), 100));
    root.addEventListener?.("morphora:syncstatus", () => emitStatus({ reason: "queue-status" }));
    root.setTimeout?.(() => Promise.resolve(root.MorphoraLocalVault?.ready).then(() => synchronize().catch(() => {})), 700);
  }

  bind();

  root.MorphoraPersonalSync = Object.freeze({
    version: 1,
    status,
    synchronize,
    pull,
    captureAnnotations,
    captureBookmarks,
    captureDrawings,
    captureLearningProgress,
    acceptCloudConflict
  });
})();
