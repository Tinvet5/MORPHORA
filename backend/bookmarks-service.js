(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Storage = root.MorphoraStorage;
  const SCHEMA_VERSION = 2;

  function emptyStore() {
    return { schemaVersion: SCHEMA_VERSION, updatedAt: null, items: {} };
  }

  function nowIso() { return new Date().toISOString(); }

  function safeText(value, max = 240) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }

  function keyFor(value = {}) {
    const manifestPath = safeText(value.manifestPath, 160);
    const viewId = safeText(value.viewId, 120);
    const structureId = safeText(value.structureId, 120);
    const raw = [manifestPath, viewId, structureId].join("::");
    if (raw.length <= 240) return raw;
    // Stable compact fallback for unusually long collection paths. The readable
    // structure suffix makes diagnostics useful while keeping the DB key bound.
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i += 1) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `bookmark-${(hash >>> 0).toString(16)}-${structureId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 72)}`;
  }

  function normalizeBookmark(value, fallbackId = "") {
    if (!value || typeof value !== "object") return null;
    const structureId = safeText(value.structureId, 120);
    const viewId = safeText(value.viewId, 120);
    if (!structureId || !viewId) return null;
    const manifestPath = safeText(value.manifestPath, 200);
    const id = safeText(value.id, 240) || fallbackId || keyFor({ manifestPath, viewId, structureId });
    const now = nowIso();
    return {
      id,
      structureId,
      name: safeText(value.name || value.structureName, 200) || structureId,
      description: safeText(value.description, 2000),
      category: safeText(value.category, 160),
      manifestPath,
      viewId,
      viewLabel: safeText(value.viewLabel, 200) || viewId,
      translations: value.translations && typeof value.translations === "object" ? value.translations : undefined,
      createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now
    };
  }

  function normalizeStore(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const items = {};
    const rawItems = source.items && typeof source.items === "object" ? source.items : {};
    Object.entries(rawItems).forEach(([id, value]) => {
      const bookmark = normalizeBookmark(value, id);
      if (bookmark) items[bookmark.id] = bookmark;
    });
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
      items
    };
  }

  function load() {
    try {
      return normalizeStore(Storage?.readStore?.("bookmarks", { fallback: null }) || emptyStore());
    } catch (_) {
      return emptyStore();
    }
  }

  function dispatch(store, detail = {}) {
    try {
      root.dispatchEvent?.(new root.CustomEvent("morphora:bookmarkschange", {
        detail: { store, source: detail.source || "local", bookmark: detail.bookmark || null, removedId: detail.removedId || null }
      }));
    } catch (_) {}
  }

  function save(store, { source = "local", bookmark = null, removedId = null } = {}) {
    const normalized = normalizeStore(store);
    normalized.updatedAt = nowIso();
    const result = Storage?.writeStore?.("bookmarks", normalized) || { ok: false };
    if (result?.ok) dispatch(normalized, { source, bookmark, removedId });
    return { store: normalized, result };
  }

  function list() {
    return Object.values(load().items).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  function get(id) { return load().items[String(id || "")] || null; }
  function isBookmarked(value) { return Boolean(get(typeof value === "string" ? value : keyFor(value))); }

  function upsert(value, { source = "local" } = {}) {
    const store = load();
    const id = safeText(value?.id, 240) || keyFor(value);
    const existing = store.items[id];
    const bookmark = normalizeBookmark({
      ...existing,
      ...value,
      id,
      createdAt: existing?.createdAt || value?.createdAt || nowIso(),
      updatedAt: value?.updatedAt || nowIso()
    }, id);
    if (!bookmark) return { ok: false, reason: "invalid-bookmark" };
    store.items[id] = bookmark;
    const saved = save(store, { source, bookmark });
    return { ok: Boolean(saved.result?.ok), bookmark, store: saved.store, storage: saved.result };
  }

  function remove(value, { source = "local" } = {}) {
    const id = typeof value === "string" ? value : keyFor(value);
    const store = load();
    if (!store.items[id]) return { ok: true, removed: false, store };
    delete store.items[id];
    const saved = save(store, { source, removedId: id });
    return { ok: Boolean(saved.result?.ok), removed: true, id, store: saved.store, storage: saved.result };
  }

  function toggle(value) {
    const id = keyFor(value);
    if (isBookmarked(id)) return { ...remove(id), bookmarked: false };
    return { ...upsert({ ...value, id }), bookmarked: true };
  }

  function replaceStore(store, { source = "cloud" } = {}) {
    return save(store, { source });
  }

  root.MorphoraBookmarks = Object.freeze({
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    emptyStore,
    normalizeStore,
    normalizeBookmark,
    keyFor,
    load,
    list,
    get,
    isBookmarked,
    upsert,
    remove,
    toggle,
    replaceStore
  });
})();
