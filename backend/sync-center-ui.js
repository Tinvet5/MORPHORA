(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Cloud = root.MorphoraCloudSync;
  const Personal = root.MorphoraPersonalSync;
  const Histology = root.MorphoraHistologySync;
  const Auth = root.MorphoraAuth;
  const Storage = root.MorphoraStorage;
  const Vault = root.MorphoraLocalVault;
  const I18n = root.MorphoraI18n;
  let expanded = false;
  let refreshing = false;

  const $ = (id) => root.document?.getElementById?.(id) || null;
  const t = (key, vars) => I18n?.t?.(key, vars) || key;

  function elements() {
    return {
      card: $("syncCenterCard"), caption: $("syncCenterCaption"), icon: $("syncCenterStatusIcon"),
      title: $("syncCenterStatusTitle"), body: $("syncCenterStatusBody"), pending: $("syncCenterPending"),
      conflicts: $("syncCenterConflicts"), failed: $("syncCenterFailed"), last: $("syncCenterLastSync"),
      syncNow: $("syncCenterSyncNow"), review: $("syncCenterReview"), issues: $("syncCenterIssues"),
      retryAll: $("syncCenterRetryAll"), list: $("syncCenterIssueList"),
      protectionState: $("deviceProtectionState"), protectionBody: $("deviceProtectionBody"),
      recoveryCount: $("deviceProtectionRecoveryCount"), recoveryCreate: $("deviceProtectionCreate"), recoveryRestore: $("deviceProtectionRestore")
    };
  }

  function formatTime(value) {
    if (!value) return null;
    try {
      const locale = I18n?.getLanguage?.() === "es" ? "es-CL" : "en";
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    } catch (_) { return String(value); }
  }

  function typeLabel(type) { return t(`syncCenter.type.${type}`); }
  function stateLabel(state) {
    if (state === "conflict") return t("syncCenter.conflictState");
    if (state === "failed") return t("syncCenter.failedState");
    if (state === "retry") return t("syncCenter.retryState");
    if (state === "sending") return t("syncCenter.sendingState");
    return t("syncCenter.pendingState");
  }

  function itemTypeLabel(item) {
    if (Histology?.isHistologyDocumentKey?.(item?.documentKey)) return "Histology";
    return typeLabel(item?.documentType);
  }

  function itemLabel(item) {
    const key = String(item?.documentKey || "root");
    if (Histology?.isHistologyDocumentKey?.(key)) {
      const slideId = key.replace(/^histology:/, "").replace(/:workspace$/, "");
      return `Histology · ${slideId}`;
    }
    if (item?.documentType === "learning_progress") return typeLabel(item.documentType);
    return `${typeLabel(item?.documentType)} · ${key.length > 34 ? `${key.slice(0, 31)}…` : key}`;
  }


  async function synchronizeAll() {
    const personal = await Personal?.synchronize?.({ flush: true });
    const histology = await Histology?.synchronize?.({ flush: true });
    return { ok: personal?.ok !== false && histology?.ok !== false, personal, histology };
  }

  async function currentUser() {
    try { return (await Auth?.getUser?.())?.user || null; } catch (_) { return null; }
  }

  function setState(el, state) {
    if (!el.card) return;
    el.card.dataset.state = state;
    if (el.caption) {
      el.caption.dataset.state = state;
      el.caption.textContent = t(state === "synced" ? "syncCenter.synced" : state === "syncing" ? "syncCenter.syncing" : state === "offline" ? "syncCenter.offline" : "syncCenter.attention");
    }
    const spec = state === "synced"
      ? ["✓", "syncCenter.allGood", "syncCenter.allGoodBody"]
      : state === "syncing"
        ? ["↻", "syncCenter.syncingTitle", "syncCenter.syncingBody"]
        : state === "offline"
          ? ["○", "syncCenter.offlineTitle", "syncCenter.offlineBody"]
          : ["!", "syncCenter.attentionTitle", "syncCenter.attentionBody"];
    if (el.icon) el.icon.textContent = spec[0];
    if (el.title) el.title.textContent = t(spec[1]);
    if (el.body) el.body.textContent = t(spec[2]);
  }

  function buildIssue(item) {
    const article = root.document.createElement("article");
    article.className = "sync-center-issue";
    article.dataset.state = item.state;

    const top = root.document.createElement("div");
    top.className = "sync-center-issue-top";
    const copy = root.document.createElement("div");
    const title = root.document.createElement("strong");
    title.textContent = itemLabel(item);
    const meta = root.document.createElement("span");
    meta.textContent = stateLabel(item.state);
    copy.append(title, meta);
    const badge = root.document.createElement("span");
    badge.className = "sync-center-issue-badge";
    badge.textContent = itemTypeLabel(item);
    top.append(copy, badge);
    article.append(top);

    if (item.lastError && item.lastError !== "revision-conflict") {
      const error = root.document.createElement("p");
      error.className = "sync-center-issue-error";
      error.textContent = item.lastError;
      article.append(error);
    }

    const actions = root.document.createElement("div");
    actions.className = "sync-center-issue-actions";
    if (item.state === "conflict") {
      const local = root.document.createElement("button");
      local.type = "button";
      local.className = "secondary-action";
      local.textContent = t("syncCenter.keepDevice");
      local.addEventListener("click", async () => {
        local.disabled = true;
        await Cloud?.resolveConflict?.(item.id, { strategy: "keep-local" });
        await synchronizeAll();
        root.MorphoraA11y?.announce?.(t("syncCenter.localKept"));
        await refresh();
      });
      const cloud = root.document.createElement("button");
      cloud.type = "button";
      cloud.className = "secondary-action";
      cloud.textContent = t("syncCenter.useCloud");
      cloud.addEventListener("click", async () => {
        cloud.disabled = true;
        if (Histology?.isHistologyDocumentKey?.(item.documentKey)) await Histology.acceptCloudConflict(item.id);
        else await Personal?.acceptCloudConflict?.(item.id);
        root.MorphoraA11y?.announce?.(t("syncCenter.cloudKept"));
        await refresh();
      });
      actions.append(local, cloud);
    } else if (item.state === "failed") {
      const retry = root.document.createElement("button");
      retry.type = "button";
      retry.className = "secondary-action";
      retry.textContent = t("syncCenter.retry");
      retry.addEventListener("click", async () => {
        retry.disabled = true;
        await Cloud?.retryMutation?.(item.id);
        await synchronizeAll();
        root.MorphoraA11y?.announce?.(t("syncCenter.retryQueued"));
        await refresh();
      });
      actions.append(retry);
    }
    if (actions.childElementCount) article.append(actions);
    return article;
  }

  async function renderIssues(queue) {
    const el = elements();
    if (!el.list) return;
    el.list.replaceChildren();
    const visible = queue.filter((item) => ["conflict", "failed", "retry", "pending", "sending"].includes(item.state));
    if (!visible.length) {
      const empty = root.document.createElement("div");
      empty.className = "sync-center-empty";
      empty.textContent = t("syncCenter.empty");
      el.list.append(empty);
      return;
    }
    visible.sort((a, b) => {
      const priority = { conflict: 0, failed: 1, retry: 2, pending: 3, sending: 4 };
      return (priority[a.state] ?? 9) - (priority[b.state] ?? 9) || String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    }).forEach((item) => el.list.append(buildIssue(item)));
  }

  async function refreshProtection() {
    const el = elements();
    if (!el.protectionState) return;
    const vaultStatus = Vault?.getStatus?.() || { principal: "guest", vaultExists: false };
    let health = null;
    try { health = await Storage?.health?.(); } catch (_) {}
    const snapshots = Storage?.listRecoverySnapshots?.({ principal: vaultStatus.principal, limit: 20 }) || [];
    if (el.recoveryCount) el.recoveryCount.textContent = String(snapshots.length);
    if (el.recoveryRestore) el.recoveryRestore.disabled = snapshots.length === 0;

    const persistent = health?.localAvailable !== false;
    el.protectionState.dataset.state = persistent ? "protected" : "session";
    el.protectionState.textContent = t(persistent ? "deviceProtection.protected" : "deviceProtection.sessionOnly");
    if (el.protectionBody) {
      el.protectionBody.textContent = t(persistent ? "deviceProtection.body" : "deviceProtection.sessionBody");
    }
  }

  async function createRecoveryPoint() {
    const el = elements();
    if (el.recoveryCreate) el.recoveryCreate.disabled = true;
    try {
      const principal = Vault?.getStatus?.().principal || "guest";
      const result = Storage?.createRecoverySnapshot?.({
        label: t("deviceProtection.manualLabel"),
        reason: t("deviceProtection.manualReason"),
        principal,
        includePreferences: false
      });
      root.MorphoraA11y?.announce?.(result?.ok ? t("deviceProtection.created") : t("deviceProtection.createFailed"), { assertive: !result?.ok });
    } catch (_) {
      root.MorphoraA11y?.announce?.(t("deviceProtection.createFailed"), { assertive: true });
    } finally {
      if (el.recoveryCreate) el.recoveryCreate.disabled = false;
      await refreshProtection();
    }
  }

  async function restoreLatestRecovery() {
    const el = elements();
    const principal = Vault?.getStatus?.().principal || "guest";
    const snapshots = Storage?.listRecoverySnapshots?.({ principal, limit: 1 }) || [];
    const latest = snapshots[0];
    if (!latest) return;
    if (!root.confirm?.(t("deviceProtection.restoreConfirm"))) return;
    if (el.recoveryRestore) el.recoveryRestore.disabled = true;
    try {
      Storage?.restoreRecoverySnapshot?.(latest.key, { includePreferences: false });
      Vault?.persistCurrent?.();
      root.MorphoraA11y?.announce?.(t("deviceProtection.restored"));
      root.setTimeout?.(() => root.location?.reload?.(), 120);
    } catch (_) {
      root.MorphoraA11y?.announce?.(t("deviceProtection.restoreFailed"), { assertive: true });
      if (el.recoveryRestore) el.recoveryRestore.disabled = false;
    }
  }

  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const el = elements();
      if (!el.card) return;
      const user = await currentUser();
      if (!user) return;
      const [cloud, queue] = await Promise.all([Cloud?.status?.() || {}, Cloud?.listQueue?.() || []]);
      const pending = Number(cloud.pending || 0);
      const conflicts = Number(cloud.conflicts || 0);
      const failed = Number(cloud.failed || 0);
      if (el.pending) el.pending.textContent = String(pending);
      if (el.conflicts) el.conflicts.textContent = String(conflicts);
      if (el.failed) el.failed.textContent = String(failed);
      if (el.last) {
        const formatted = formatTime(cloud.lastFlushAt);
        el.last.textContent = formatted ? t("syncCenter.lastSync", { time: formatted }) : t("syncCenter.notSyncedYet");
      }
      if (el.retryAll) el.retryAll.hidden = failed === 0;
      if (el.review) {
        el.review.setAttribute("aria-expanded", String(expanded));
        el.review.classList.toggle("has-issues", conflicts + failed > 0);
      }
      if (el.issues) el.issues.hidden = !expanded;

      let state = "synced";
      if (root.navigator?.onLine === false) state = "offline";
      else if (conflicts || failed) state = "attention";
      else if (cloud.flushing || pending) state = "syncing";
      setState(el, state);
      await renderIssues(queue);
      await refreshProtection();
    } finally { refreshing = false; }
  }

  async function syncNow() {
    const el = elements();
    if (el.syncNow) el.syncNow.disabled = true;
    try {
      const result = await synchronizeAll();
      root.MorphoraA11y?.announce?.(result?.ok ? t("syncCenter.syncComplete") : t("syncCenter.syncError"));
    } catch (_) {
      root.MorphoraA11y?.announce?.(t("syncCenter.syncError"), { assertive: true });
    } finally {
      if (el.syncNow) el.syncNow.disabled = false;
      await refresh();
    }
  }

  function bind() {
    const el = elements();
    if (!el.card) return;
    el.syncNow?.addEventListener("click", syncNow);
    el.review?.addEventListener("click", () => { expanded = !expanded; refresh(); });
    el.retryAll?.addEventListener("click", async () => {
      el.retryAll.disabled = true;
      await Cloud?.retryAllFailed?.();
      await synchronizeAll();
      el.retryAll.disabled = false;
      await refresh();
    });
    el.recoveryCreate?.addEventListener("click", createRecoveryPoint);
    el.recoveryRestore?.addEventListener("click", restoreLatestRecovery);
    ["morphora:syncstatus", "morphora:personalsyncstate", "morphora:histologysyncstate", "morphora:authchange", "morphora:localvaultrestored", "morphora:storage-recovery-snapshot", "online", "offline", "morphora:languagechange"].forEach((name) => root.addEventListener?.(name, () => refresh()));
    refresh();
  }

  if (root.document?.readyState === "loading") root.document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();

  root.MorphoraSyncCenterUI = Object.freeze({ version: 2, refresh, syncNow, refreshProtection, createRecoveryPoint, restoreLatestRecovery });
})();
