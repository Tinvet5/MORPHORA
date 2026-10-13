(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Models = root.MorphoraModels;
  const STORAGE_LAYER_VERSION = 1;
  const BACKUP_VERSION = 1;
  const MAX_RECOVERY_SNAPSHOTS = 3;

  const KEYS = Object.freeze({
    annotations: "morphora:annotations:v2",
    annotationsLegacy: "morphora:annotations:v1",
    drawings: "morphora:drawings:v2",
    drawingsLegacy: "morphora:drawings:v1",
    learningProgress: "morphora:learning-progress:v2",
    learningProgressLegacy: "morphora:learning-progress:v1",
    activeQuizSession: "morphora:quiz-session:v1",
    theme: "morphora:theme",
    language: "morphora:language",
    lastAtlasRoute: "morphora:last-atlas-route",
    performanceHistory: "morphora:performance:v1",
    studioLastContext: "morphora:studio:last-context",
    studioContentLanguage: "morphora:studio:content-language",
    studioDraftPrefix: "morphora:studio:draft:",
    studioCollectionDraftPrefix: "morphora:studio:collection-draft:",
    studioDeviceAdviceDismissed: "morphora:studio:device-advice-dismissed",
    libraryDrawerScroll: "morphora:library-drawer-scroll",
    syncQueue: "morphora:sync-queue:v1",
    syncState: "morphora:sync-state:v1",
    syncClientId: "morphora:sync-client-id:v1",
    personalSyncMeta: "morphora:personal-sync-meta:v1",
    histologySyncMeta: "morphora:histology-sync-meta:v1",
    histologyWorkspacePrefix: "morphora:histology-workspace:v1:",
    bookmarks: "morphora:bookmarks:v2",
    localVaultPrefix: "morphora:local-vault:v1:",
    localVaultPrincipal: "morphora:local-vault-principal:v1",
    hardeningMigration: "morphora:hardening-migration:v1",
    recoveryPrefix: "morphora:recovery:"
  });

  const STORE_DEFINITIONS = Object.freeze({
    annotations: Object.freeze({
      key: KEYS.annotations,
      legacyKeys: [KEYS.annotationsLegacy],
      migrate(value) {
        return Models?.migrateUserStore ? Models.migrateUserStore("annotations", value) : value;
      }
    }),
    drawings: Object.freeze({
      key: KEYS.drawings,
      legacyKeys: [KEYS.drawingsLegacy],
      migrate(value) {
        return Models?.migrateUserStore ? Models.migrateUserStore("drawings", value) : value;
      }
    }),
    learningProgress: Object.freeze({
      key: KEYS.learningProgress,
      legacyKeys: [KEYS.learningProgressLegacy],
      migrate(value) {
        return Models?.migrateUserStore ? Models.migrateUserStore("progress", value) : (value?.progress || value);
      }
    }),
    bookmarks: Object.freeze({
      key: KEYS.bookmarks,
      legacyKeys: [],
      migrate(value) {
        return Models?.migrateUserStore ? Models.migrateUserStore("bookmarks", value) : value;
      }
    })
  });

  const memoryFallback = new Map();
  const storageCache = { local: undefined, session: undefined };

  function event(name, detail) {
    try {
      if (typeof root.dispatchEvent === "function" && typeof root.CustomEvent === "function") {
        root.dispatchEvent(new root.CustomEvent(name, { detail }));
      }
    } catch (_) {
      // Storage notifications are advisory only.
    }
  }

  function byteLength(value) {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    try {
      return new Blob([text]).size;
    } catch (_) {
      return String(text).length * 2;
    }
  }

  function isQuotaError(error) {
    if (!error) return false;
    return error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 || error.code === 1014;
  }

  function storageObject(kind = "local") {
    if (storageCache[kind] !== undefined) return storageCache[kind];
    try {
      const storage = kind === "session" ? root.sessionStorage : root.localStorage;
      if (!storage) {
        storageCache[kind] = null;
        return null;
      }
      const probe = `__morphora_storage_probe__${Date.now()}`;
      storage.setItem(probe, "1");
      storage.removeItem(probe);
      storageCache[kind] = storage;
      return storage;
    } catch (_) {
      storageCache[kind] = null;
      return null;
    }
  }

  function memoryKey(kind, key) {
    return `${kind}:${key}`;
  }

  function getRaw(key, { kind = "local" } = {}) {
    const memKey = memoryKey(kind, key);
    if (memoryFallback.has(memKey)) return memoryFallback.get(memKey);
    const storage = storageObject(kind);
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch (error) {
      event("morphora:storage-error", { operation: "read", key, kind, quota: isQuotaError(error), error });
      return null;
    }
  }

  function setRaw(key, value, { kind = "local", allowMemoryFallback = true } = {}) {
    const text = String(value);
    const storage = storageObject(kind);
    const memKey = memoryKey(kind, key);
    if (!storage) {
      if (allowMemoryFallback) memoryFallback.set(memKey, text);
      event("morphora:storage-error", { operation: "write", key, kind, unavailable: true, bytes: byteLength(text) });
      return { ok: false, persistent: false, fallback: allowMemoryFallback, unavailable: true, bytes: byteLength(text) };
    }
    try {
      storage.setItem(key, text);
      memoryFallback.delete(memKey);
      return { ok: true, persistent: true, fallback: false, bytes: byteLength(text) };
    } catch (error) {
      if (allowMemoryFallback) memoryFallback.set(memKey, text);
      const quota = isQuotaError(error);
      event("morphora:storage-error", { operation: "write", key, kind, quota, error, bytes: byteLength(text) });
      return { ok: false, persistent: false, fallback: allowMemoryFallback, quota, error, bytes: byteLength(text) };
    }
  }

  function remove(key, { kind = "local" } = {}) {
    memoryFallback.delete(memoryKey(kind, key));
    const storage = storageObject(kind);
    if (!storage) return false;
    try {
      storage.removeItem(key);
      return true;
    } catch (error) {
      event("morphora:storage-error", { operation: "remove", key, kind, error });
      return false;
    }
  }

  function listKeys({ kind = "local", prefix = "" } = {}) {
    const keys = new Set();
    const storage = storageObject(kind);
    if (storage) {
      try {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (key && (!prefix || key.startsWith(prefix))) keys.add(key);
        }
      } catch (_) {}
    }
    const memoryPrefix = `${kind}:`;
    memoryFallback.forEach((_, key) => {
      if (!key.startsWith(memoryPrefix)) return;
      const actual = key.slice(memoryPrefix.length);
      if (!prefix || actual.startsWith(prefix)) keys.add(actual);
    });
    return Array.from(keys).sort();
  }

  function recoveryKey(originalKey, timestamp = Date.now()) {
    const safe = String(originalKey).replace(/[^a-zA-Z0-9._-]+/g, "_");
    return `${KEYS.recoveryPrefix}${safe}:${timestamp}`;
  }

  function trimRecoverySnapshots(originalKey) {
    const safe = String(originalKey).replace(/[^a-zA-Z0-9._-]+/g, "_");
    const prefix = `${KEYS.recoveryPrefix}${safe}:`;
    const keys = listKeys({ prefix }).sort().reverse();
    keys.slice(MAX_RECOVERY_SNAPSHOTS).forEach((key) => remove(key));
  }

  function quarantine(originalKey, raw, error) {
    if (raw == null) return null;
    const principal = String(readText(KEYS.localVaultPrincipal, { fallback: "guest" }) || "guest");
    const scopedKey = `${originalKey}:${principal}`;
    const key = recoveryKey(scopedKey);
    const payload = JSON.stringify({
      originalKey: scopedKey,
      principal,
      capturedAt: new Date().toISOString(),
      reason: error?.message || "Stored JSON could not be parsed or migrated.",
      raw
    });
    setRaw(key, payload, { allowMemoryFallback: false });
    trimRecoverySnapshots(scopedKey);
    event("morphora:storage-recovery", { originalKey: scopedKey, principal, recoveryKey: key });
    return key;
  }

  function readText(key, { kind = "local", legacyKeys = [], fallback = null, persistLegacy = true } = {}) {
    const candidates = [key, ...legacyKeys];
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const value = getRaw(candidate, { kind });
      if (value == null) continue;
      if (index > 0 && persistLegacy) setRaw(key, value, { kind });
      return value;
    }
    return fallback;
  }

  function writeText(key, value, options = {}) {
    return setRaw(key, value, options);
  }

  function readJSON(key, {
    kind = "local",
    legacyKeys = [],
    fallback = null,
    migrate = null,
    persistLegacy = true,
    persistMigrated = true,
    quarantineCorrupt = true
  } = {}) {
    const candidates = [key, ...legacyKeys];
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const raw = getRaw(candidate, { kind });
      if (raw == null) continue;
      try {
        const parsed = JSON.parse(raw);
        const value = typeof migrate === "function" ? migrate(parsed) : parsed;
        const serialized = JSON.stringify(value);
        const shouldPersistLegacy = index > 0 && persistLegacy;
        const shouldPersistMigration = persistMigrated && typeof migrate === "function" && serialized !== raw;
        if (shouldPersistLegacy || shouldPersistMigration) {
          setRaw(key, serialized, { kind });
        }
        return value;
      } catch (error) {
        if (quarantineCorrupt) quarantine(candidate, raw, error);
        remove(candidate, { kind });
        event("morphora:storage-error", { operation: "parse", key: candidate, kind, corrupt: true, error });
      }
    }
    return typeof fallback === "function" ? fallback() : fallback;
  }

  function writeJSON(key, value, options = {}) {
    try {
      return setRaw(key, JSON.stringify(value), options);
    } catch (error) {
      event("morphora:storage-error", { operation: "serialize", key, error });
      return { ok: false, persistent: false, fallback: false, error };
    }
  }

  function readStore(name, { fallback = null } = {}) {
    const definition = STORE_DEFINITIONS[name];
    if (!definition) throw new Error(`Unknown MORPHORA store: ${name}`);
    return readJSON(definition.key, {
      legacyKeys: definition.legacyKeys,
      fallback,
      migrate: definition.migrate
    });
  }

  function writeStore(name, value) {
    const definition = STORE_DEFINITIONS[name];
    if (!definition) throw new Error(`Unknown MORPHORA store: ${name}`);
    return writeJSON(definition.key, value);
  }

  function removeStore(name) {
    const definition = STORE_DEFINITIONS[name];
    if (!definition) return false;
    return remove(definition.key);
  }

  function readPrefix(prefix, { kind = "local" } = {}) {
    return listKeys({ kind, prefix }).map((key) => ({ key, value: getRaw(key, { kind }) }));
  }

  function extractBackupStore(parsed, name) {
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.stores && Object.prototype.hasOwnProperty.call(parsed.stores, name)) return parsed.stores[name];
    if (name === "annotations") return parsed.annotations ? { schemaVersion: parsed.schemaVersion, views: parsed.annotations } : null;
    if (name === "drawings") return parsed.drawings ? { schemaVersion: parsed.schemaVersion, views: parsed.drawings } : null;
    if (name === "learningProgress") return parsed.progress || null;
    if (name === "bookmarks") return parsed.bookmarks || null;
    return null;
  }

  function createRecoverySnapshot({
    label = "Recovery snapshot",
    reason = "Manual MORPHORA recovery point",
    principal = null,
    includePreferences = true
  } = {}) {
    const effectivePrincipal = String(principal || readText(KEYS.localVaultPrincipal) || "guest");
    const safePrincipal = effectivePrincipal.replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 180) || "guest";
    const bundle = createBackup({ includePreferences, includeStudioDrafts: false });
    const originalKey = `personal-data-bundle:${safePrincipal}`;
    const key = recoveryKey(originalKey);
    const payload = {
      originalKey,
      principal: effectivePrincipal,
      label: String(label || "Recovery snapshot").slice(0, 160),
      capturedAt: new Date().toISOString(),
      reason: String(reason || "Recovery snapshot").slice(0, 500),
      bundle
    };
    const result = setRaw(key, JSON.stringify(payload), { allowMemoryFallback: false });
    trimRecoverySnapshots(originalKey);
    if (result?.ok) event("morphora:storage-recovery-snapshot", { key, principal: effectivePrincipal, label: payload.label });
    return { key, principal: effectivePrincipal, payload, ...result };
  }

  function listRecoverySnapshots({ principal = null, limit = 10 } = {}) {
    const effectivePrincipal = principal == null ? null : String(principal);
    return listKeys({ prefix: KEYS.recoveryPrefix })
      .map((key) => {
        const raw = getRaw(key);
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          const bundle = parsed.bundle || (parsed.raw ? JSON.parse(parsed.raw) : null);
          const snapshotPrincipal = parsed.principal || null;
          if (effectivePrincipal && snapshotPrincipal !== effectivePrincipal) return null;
          return { key, capturedAt: parsed.capturedAt || null, label: parsed.label || parsed.reason || "Recovery snapshot", reason: parsed.reason || "", principal: snapshotPrincipal, bundle };
        } catch (_) { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => String(b.capturedAt || "").localeCompare(String(a.capturedAt || "")))
      .slice(0, Math.max(1, Number(limit) || 10));
  }

  function restoreRecoverySnapshot(key, { includePreferences = true } = {}) {
    const raw = getRaw(String(key || ""));
    if (!raw) throw new Error("Recovery snapshot was not found.");
    const parsed = JSON.parse(raw);
    const bundle = parsed.bundle || (parsed.raw ? JSON.parse(parsed.raw) : null);
    if (!bundle) throw new Error("Recovery snapshot does not contain a MORPHORA data bundle.");
    const currentPrincipal = String(readText(KEYS.localVaultPrincipal) || "guest");
    if (!parsed.principal) {
      throw new Error("Legacy unscoped recovery snapshots cannot be restored after V5.0.5 account isolation is enabled.");
    }
    if (parsed.principal !== currentPrincipal) {
      throw new Error("This recovery snapshot belongs to a different MORPHORA account on this device.");
    }
    const results = importBackup(bundle, { includePreferences, includeStudioDrafts: false });
    event("morphora:storage-recovery-restored", { key, principal: currentPrincipal, capturedAt: parsed.capturedAt || null });
    return results;
  }

  function histologyWorkspacesForPrincipal(principal = null) {
    const effectivePrincipal = String(principal || readText(KEYS.localVaultPrincipal) || "guest").replace(/[^a-zA-Z0-9._:@-]+/g, "_").slice(0, 180) || "guest";
    const prefix = `${KEYS.histologyWorkspacePrefix}${effectivePrincipal}:`;
    return readPrefix(prefix).map(({ key, value }) => {
      if (!value) return null;
      try { return { slideId: key.slice(prefix.length), value: JSON.parse(value) }; } catch (_) { return null; }
    }).filter((entry) => entry?.slideId && entry.value && typeof entry.value === "object");
  }

  function createBackup({ includePreferences = true, includeStudioDrafts = false } = {}) {
    const stores = {
      annotations: readStore("annotations", { fallback: null }),
      drawings: readStore("drawings", { fallback: null }),
      learningProgress: readStore("learningProgress", { fallback: null }),
      bookmarks: readStore("bookmarks", { fallback: null })
    };
    const bundle = {
      product: "MORPHORA",
      kind: "personal-data-bundle",
      backupVersion: BACKUP_VERSION,
      userDataSchemaVersion: root.MORPHORA_CONFIG?.userDataSchemaVersion || Models?.USER_DATA_SCHEMA_VERSION || 2,
      exportedAt: new Date().toISOString(),
      stores,
      histologyWorkspaces: histologyWorkspacesForPrincipal()
    };
    if (includePreferences) {
      bundle.preferences = {
        theme: readText(KEYS.theme),
        lastAtlasRoute: readText(KEYS.lastAtlasRoute),
        studioLastContext: readJSON(KEYS.studioLastContext, { fallback: null })
      };
    }
    if (includeStudioDrafts) {
      bundle.studioDrafts = readPrefix(KEYS.studioDraftPrefix).map(({ key, value }) => ({ key, value: value ? JSON.parse(value) : null }));
      bundle.collectionDrafts = readPrefix(KEYS.studioCollectionDraftPrefix).map(({ key, value }) => ({ key, value: value ? JSON.parse(value) : null }));
    }
    return bundle;
  }

  function importBackup(bundle, { includePreferences = true, includeStudioDrafts = false } = {}) {
    if (!bundle || typeof bundle !== "object") throw new Error("Invalid MORPHORA backup bundle.");
    if (bundle.backupVersion && Number(bundle.backupVersion) > BACKUP_VERSION) {
      throw new Error(`This backup uses version ${bundle.backupVersion}, but this build supports up to ${BACKUP_VERSION}.`);
    }
    try {
      createRecoverySnapshot({
        label: "Before backup import",
        reason: "Automatic account-scoped recovery point before importing a MORPHORA backup.",
        principal: readText(KEYS.localVaultPrincipal) || "guest",
        includePreferences: true
      });
    } catch (_) {
      // A recovery snapshot is best-effort; import can still continue.
    }
    const results = [];
    ["annotations", "drawings", "learningProgress", "bookmarks"].forEach((name) => {
      const value = extractBackupStore(bundle, name);
      if (value == null) return;
      const definition = STORE_DEFINITIONS[name];
      const migrated = definition.migrate ? definition.migrate(value) : value;
      results.push({ name, ...writeStore(name, migrated) });
    });
    if (Array.isArray(bundle.histologyWorkspaces)) {
      const principal = String(readText(KEYS.localVaultPrincipal) || "guest").replace(/[^a-zA-Z0-9._:@-]+/g, "_").slice(0, 180) || "guest";
      const prefix = `${KEYS.histologyWorkspacePrefix}${principal}:`;
      bundle.histologyWorkspaces.forEach((entry) => {
        const slideId = String(entry?.slideId || "").replace(/[^a-zA-Z0-9._-]+/g, "").slice(0, 120);
        if (slideId && entry?.value && typeof entry.value === "object") results.push({ name:`histology:${slideId}`, ...writeJSON(`${prefix}${slideId}`, entry.value) });
      });
    }
    if (includePreferences && bundle.preferences) {
      if (bundle.preferences.theme) writeText(KEYS.theme, bundle.preferences.theme);
      if (bundle.preferences.lastAtlasRoute) writeText(KEYS.lastAtlasRoute, bundle.preferences.lastAtlasRoute);
      if (bundle.preferences.studioLastContext) writeJSON(KEYS.studioLastContext, bundle.preferences.studioLastContext);
    }
    if (includeStudioDrafts) {
      [...(bundle.studioDrafts || []), ...(bundle.collectionDrafts || [])].forEach((item) => {
        if (item?.key && item.value) writeJSON(item.key, item.value);
      });
    }
    return results;
  }

  async function health() {
    const localAvailable = Boolean(storageObject("local"));
    const sessionAvailable = Boolean(storageObject("session"));
    let usage = null;
    let quota = null;
    let persisted = null;
    try {
      if (root.navigator?.storage?.estimate) {
        const estimate = await root.navigator.storage.estimate();
        usage = Number.isFinite(estimate?.usage) ? estimate.usage : null;
        quota = Number.isFinite(estimate?.quota) ? estimate.quota : null;
      }
      if (root.navigator?.storage?.persisted) persisted = await root.navigator.storage.persisted();
    } catch (_) {}
    return {
      layerVersion: STORAGE_LAYER_VERSION,
      localAvailable,
      sessionAvailable,
      usage,
      quota,
      usageRatio: usage != null && quota ? usage / quota : null,
      persisted,
      recoverySnapshots: listKeys({ prefix: KEYS.recoveryPrefix }).length,
      memoryFallbackKeys: Array.from(memoryFallback.keys())
    };
  }

  async function requestPersistence() {
    if (!root.navigator?.storage?.persist) return false;
    try {
      return Boolean(await root.navigator.storage.persist());
    } catch (_) {
      return false;
    }
  }

  root.MorphoraStorage = Object.freeze({
    version: STORAGE_LAYER_VERSION,
    backupVersion: BACKUP_VERSION,
    keys: KEYS,
    stores: STORE_DEFINITIONS,
    getRaw,
    setRaw,
    remove,
    listKeys,
    readText,
    writeText,
    readJSON,
    writeJSON,
    readStore,
    writeStore,
    removeStore,
    readPrefix,
    quarantine,
    extractBackupStore,
    histologyWorkspacesForPrincipal,
    createBackup,
    importBackup,
    createRecoverySnapshot,
    listRecoverySnapshots,
    restoreRecoverySnapshot,
    health,
    requestPersistence,
    isQuotaError
  });
})();
