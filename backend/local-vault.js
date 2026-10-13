(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Storage = root.MorphoraStorage;
  const Auth = root.MorphoraAuth;
  const VERSION = 1;
  const GUEST = "guest";
  const STORE_NAMES = Object.freeze(["annotations", "drawings", "learningProgress", "bookmarks"]);
  let currentPrincipal = null;
  let transitioning = false;
  let initialized = false;

  const emptyStores = Object.freeze({
    annotations: () => ({ schemaVersion: 2, updatedAt: null, views: {} }),
    drawings: () => ({ schemaVersion: 2, updatedAt: null, preferences: { visible: true }, views: {} }),
    learningProgress: () => ({ schemaVersion: 2, updatedAt: null, structures: {}, customQuestions: {}, sessions: [] }),
    bookmarks: () => ({ schemaVersion: 2, updatedAt: null, items: {} })
  });

  function nowIso() { return new Date().toISOString(); }
  function markerKey() { return Storage?.keys?.localVaultPrincipal || "morphora:local-vault-principal:v1"; }
  function prefixKey() { return Storage?.keys?.localVaultPrefix || "morphora:local-vault:v1:"; }
  function migrationKey() { return Storage?.keys?.hardeningMigration || "morphora:hardening-migration:v1"; }

  function sanitizePrincipal(value) {
    const principal = String(value || GUEST);
    return principal.replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 180) || GUEST;
  }

  function principalForUser(user) {
    const id = String(user?.id || "").trim();
    return id ? `user:${id}` : GUEST;
  }

  function vaultKey(principal) {
    return `${prefixKey()}${sanitizePrincipal(principal)}`;
  }

  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function readStore(name) {
    return Storage?.readStore?.(name, { fallback: emptyStores[name]?.() || null }) || emptyStores[name]?.() || null;
  }

  function captureWorkspace() {
    const stores = {};
    STORE_NAMES.forEach((name) => { stores[name] = clone(readStore(name)); });
    const activeQuizSession = Storage?.readJSON?.(Storage?.keys?.activeQuizSession || "morphora:quiz-session:v1", { fallback: null });
    return {
      version: VERSION,
      capturedAt: nowIso(),
      userDataSchemaVersion: root.MORPHORA_CONFIG?.userDataSchemaVersion || root.MorphoraModels?.USER_DATA_SCHEMA_VERSION || 2,
      stores,
      activeQuizSession: activeQuizSession ? clone(activeQuizSession) : null
    };
  }

  function savePrincipal(principal, workspace = null) {
    const clean = sanitizePrincipal(principal);
    const value = { principal: clean, ...(workspace || captureWorkspace()), capturedAt: nowIso() };
    const result = Storage?.writeJSON?.(vaultKey(clean), value) || { ok: false };
    return { ok: Boolean(result?.ok), principal: clean, workspace: value, storage: result };
  }

  function readPrincipal(principal) {
    const clean = sanitizePrincipal(principal);
    const value = Storage?.readJSON?.(vaultKey(clean), { fallback: null });
    if (!value || typeof value !== "object" || value.version !== VERSION) return null;
    return value;
  }

  function writeWorkspace(workspace) {
    const value = workspace && typeof workspace === "object" ? workspace : {};
    const stores = value.stores && typeof value.stores === "object" ? value.stores : {};
    STORE_NAMES.forEach((name) => {
      const next = stores[name] || emptyStores[name]?.();
      Storage?.writeStore?.(name, clone(next));
    });

    const quizKey = Storage?.keys?.activeQuizSession || "morphora:quiz-session:v1";
    if (value.activeQuizSession) Storage?.writeJSON?.(quizKey, clone(value.activeQuizSession));
    else Storage?.remove?.(quizKey);
  }

  function emitRestored(principal, workspace, reason = "principal-change") {
    const stores = workspace?.stores || {};
    try {
      root.dispatchEvent?.(new root.CustomEvent("morphora:localvaultrestored", { detail: { principal, reason, stores: clone(stores) } }));
      root.document?.dispatchEvent?.(new root.CustomEvent("morphora:annotationsremotechange", { detail: { store: clone(stores.annotations || emptyStores.annotations()), source: "vault" } }));
      root.dispatchEvent?.(new root.CustomEvent("morphora:drawingsremotechange", { detail: { store: clone(stores.drawings || emptyStores.drawings()), source: "vault" } }));
      root.dispatchEvent?.(new root.CustomEvent("morphora:learningprogressremotechange", { detail: { store: clone(stores.learningProgress || emptyStores.learningProgress()), source: "vault" } }));
      root.dispatchEvent?.(new root.CustomEvent("morphora:bookmarkschange", { detail: { store: clone(stores.bookmarks || emptyStores.bookmarks()), source: "vault" } }));
    } catch (_) {}
  }

  function recordMigration(principal, details = {}) {
    Storage?.writeJSON?.(migrationKey(), {
      version: VERSION,
      completedAt: nowIso(),
      principal: sanitizePrincipal(principal),
      ...details
    });
  }

  function createMigrationRecovery(principal) {
    try {
      return Storage?.createRecoverySnapshot?.({
        label: "V5.0.5 pre-migration snapshot",
        reason: "Automatic recovery point before account-scoped local vault migration.",
        principal: sanitizePrincipal(principal),
        includePreferences: false
      }) || null;
    } catch (_) { return null; }
  }

  function transition(nextPrincipal, { initial = false, reason = "principal-change" } = {}) {
    if (transitioning) return { ok: false, reason: "transition-in-progress" };
    transitioning = true;
    try {
      const next = sanitizePrincipal(nextPrincipal || GUEST);
      const markerRaw = Storage?.readText?.(markerKey());
      const marker = markerRaw ? sanitizePrincipal(markerRaw) : null;
      const previous = currentPrincipal || marker;

      // First V5.0.5 run: the current browser workspace belongs to whichever
      // principal is already authenticated. Preserve it in-place and create a
      // recovery point before adding account scoping.
      if (!previous) {
        createMigrationRecovery(next);
        const saved = savePrincipal(next);
        Storage?.writeText?.(markerKey(), next);
        currentPrincipal = next;
        recordMigration(next, { mode: "first-run-preserve", recoveryCreated: true });
        emitRestored(next, saved.workspace, "initial-migration");
        return { ok: true, previous: null, principal: next, migrated: true, adopted: true };
      }

      currentPrincipal = previous;
      if (previous === next) {
        if (!readPrincipal(next)) savePrincipal(next);
        Storage?.writeText?.(markerKey(), next);
        return { ok: true, previous, principal: next, unchanged: true };
      }

      // Always create an account-scoped recovery point and vault the outgoing
      // workspace before replacing browser-local stores. This makes sign-out
      // and account switching reversible even while offline.
      try {
        Storage?.createRecoverySnapshot?.({
          label: "Before account switch",
          reason: `Automatic recovery point before switching from ${previous} to ${next}.`,
          principal: previous,
          includePreferences: false
        });
      } catch (_) {}
      savePrincipal(previous);
      const incoming = readPrincipal(next);

      let workspace = incoming;
      let adopted = false;
      if (!workspace && previous === GUEST && next.startsWith("user:")) {
        // Preserve the long-standing MORPHORA behavior where a user can study
        // as a guest and then sign in without losing that work. Adoption only
        // happens guest -> first-time account, never user -> user.
        workspace = captureWorkspace();
        savePrincipal(next, workspace);
        adopted = true;
      }
      if (!workspace) {
        workspace = {
          version: VERSION,
          principal: next,
          capturedAt: nowIso(),
          stores: Object.fromEntries(STORE_NAMES.map((name) => [name, emptyStores[name]() ])),
          activeQuizSession: null
        };
        savePrincipal(next, workspace);
      }

      writeWorkspace(workspace);
      Storage?.writeText?.(markerKey(), next);
      currentPrincipal = next;
      emitRestored(next, workspace, reason);
      return { ok: true, previous, principal: next, adopted, restored: Boolean(incoming) };
    } finally {
      transitioning = false;
    }
  }

  function persistCurrent() {
    const principal = currentPrincipal || sanitizePrincipal(Storage?.readText?.(markerKey()) || GUEST);
    return savePrincipal(principal);
  }

  function getStatus() {
    const principal = currentPrincipal || sanitizePrincipal(Storage?.readText?.(markerKey()) || GUEST);
    return Object.freeze({
      version: VERSION,
      principal,
      guest: principal === GUEST,
      vaultExists: Boolean(readPrincipal(principal)),
      transitioning
    });
  }

  async function initialize() {
    if (initialized) return getStatus();
    initialized = true;
    let user = null;
    try { user = (await Auth?.getSession?.())?.session?.user || null; } catch (_) {}
    transition(principalForUser(user), { initial: true, reason: "initial-session" });
    Storage?.requestPersistence?.().catch?.(() => {});
    return getStatus();
  }

  function bind() {
    root.addEventListener?.("morphora:authchange", (event) => {
      const next = principalForUser(event?.detail?.session?.user || null);
      transition(next, { reason: event?.detail?.event || "auth-change" });
    });
    ["pagehide", "beforeunload"].forEach((name) => root.addEventListener?.(name, () => { try { persistCurrent(); } catch (_) {} }));
    ["morphora:bookmarkschange", "morphora:drawingschange", "morphora:learningprogresschange"].forEach((name) => {
      root.addEventListener?.(name, (event) => {
        if (["cloud", "vault"].includes(event?.detail?.source)) return;
        root.clearTimeout?.(bind.persistTimer);
        bind.persistTimer = root.setTimeout?.(() => { try { persistCurrent(); } catch (_) {} }, 150);
      });
    });
  }

  bind();
  const ready = initialize();

  root.MorphoraLocalVault = Object.freeze({
    version: VERSION,
    ready,
    principalForUser,
    transition,
    persistCurrent,
    readPrincipal,
    getStatus,
    captureWorkspace
  });
})();
