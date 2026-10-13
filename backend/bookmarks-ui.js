(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Bookmarks = root.MorphoraBookmarks;
  const I18n = root.MorphoraI18n;
  const A11y = root.MorphoraA11y || { activateFocusTrap() {}, releaseFocusTrap() {}, announce() {} };
  let currentStructure = null;
  let lastFocused = null;

  const $ = (id) => root.document?.getElementById?.(id) || null;
  const t = (key, vars) => I18n?.t?.(key, vars) || key;

  function elements() {
    return {
      actions: $("structureInfoActions"), toggle: $("bookmarkStructureInfo"),
      open: $("openBookmarks"), count: $("bookmarkCountBadge"),
      backdrop: $("bookmarksBackdrop"), drawer: $("bookmarksDrawer"), close: $("closeBookmarks"),
      list: $("bookmarksList"), summary: $("bookmarksCount"), storageTitle: $("bookmarksStorageTitle"), storageBody: $("bookmarksStorageBody")
    };
  }

  function localizedName(bookmark) {
    return I18n?.localize?.(bookmark, "name") || bookmark?.name || bookmark?.structureId || t("bookmarks.untitled");
  }

  function metaLabel(bookmark) {
    return bookmark?.viewLabel || bookmark?.viewId || "";
  }

  function initials(bookmark) {
    const words = String(localizedName(bookmark) || "").split(/\s+/).filter(Boolean).slice(0, 2);
    return (words.map((word) => word[0]).join("") || "☆").toUpperCase();
  }

  function updateToggle() {
    const el = elements();
    if (!el.toggle) return;
    const active = currentStructure && Bookmarks?.isBookmarked?.(Bookmarks.keyFor(currentStructure));
    el.toggle.setAttribute("aria-pressed", String(Boolean(active)));
    el.toggle.classList.toggle("is-bookmarked", Boolean(active));
    el.toggle.textContent = active ? `★ ${t("bookmarks.saved")}` : `☆ ${t("bookmarks.save")}`;
  }

  function updateCount() {
    const el = elements();
    const count = Bookmarks?.list?.().length || 0;
    if (el.count) {
      el.count.textContent = String(count);
      el.count.setAttribute("aria-label", t(count === 1 ? "bookmarks.count.one" : "bookmarks.count.many", { count }));
    }
    if (el.summary) el.summary.textContent = t(count === 1 ? "bookmarks.count.one" : "bookmarks.count.many", { count });
  }

  async function openBookmark(bookmark) {
    closeDrawer();
    try {
      await root.MorphoraAtlas?.openCollection?.(bookmark.manifestPath, bookmark.viewId);
      root.setTimeout?.(() => {
        root.document?.dispatchEvent?.(new root.CustomEvent("morphora:focus-structure", { detail: { structureId: bookmark.structureId } }));
      }, 180);
    } catch (_) {}
  }

  function renderList() {
    const el = elements();
    if (!el.list) return;
    const items = Bookmarks?.list?.() || [];
    el.list.replaceChildren();
    updateCount();
    if (!items.length) {
      const empty = root.document.createElement("div");
      empty.className = "notes-empty-state";
      const title = root.document.createElement("strong");
      title.textContent = t("bookmarks.emptyTitle");
      const body = root.document.createElement("p");
      body.textContent = t("bookmarks.emptyBody");
      empty.append(title, body);
      el.list.appendChild(empty);
      return;
    }
    items.forEach((bookmark) => {
      const item = root.document.createElement("article");
      item.className = "note-list-item bookmark-list-item";

      const open = root.document.createElement("button");
      open.type = "button";
      open.className = "note-open-button";

      const avatar = root.document.createElement("span");
      avatar.className = "bookmark-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = initials(bookmark);

      const copy = root.document.createElement("span");
      copy.className = "bookmark-copy";
      const eyebrow = root.document.createElement("span");
      eyebrow.className = "bookmark-chip";
      eyebrow.textContent = t("bookmarks.savedStructures");
      const title = root.document.createElement("strong");
      title.textContent = localizedName(bookmark);
      const meta = root.document.createElement("span");
      meta.textContent = metaLabel(bookmark);
      copy.append(eyebrow, title, meta);
      open.append(avatar, copy);
      open.addEventListener("click", () => openBookmark(bookmark));

      const actions = root.document.createElement("div");
      actions.className = "note-list-actions bookmark-item-actions";
      const jump = root.document.createElement("button");
      jump.type = "button";
      jump.className = "secondary-action";
      jump.textContent = t("bookmarks.openAction");
      jump.addEventListener("click", () => openBookmark(bookmark));
      const remove = root.document.createElement("button");
      remove.type = "button";
      remove.className = "danger-action";
      remove.textContent = t("bookmarks.remove");
      remove.addEventListener("click", () => Bookmarks.remove(bookmark.id));
      actions.append(jump, remove);

      item.append(open, actions);
      el.list.appendChild(item);
    });
  }

  function openDrawer(trigger) {
    const el = elements();
    if (!el.drawer || !el.backdrop) return;
    lastFocused = trigger || root.document.activeElement;
    el.backdrop.hidden = false;
    el.drawer.setAttribute("aria-hidden", "false");
    el.drawer.classList.add("open");
    el.open?.setAttribute("aria-expanded", "true");
    root.document.body.classList.add("notes-drawer-open");
    renderList();
    A11y.activateFocusTrap(el.drawer, { initialFocus: el.close, returnFocus: lastFocused, onEscape: () => closeDrawer({ restoreFocus: true }) });
    A11y.announce(t("bookmarks.opened", { count: Bookmarks?.list?.().length || 0 }));
  }

  function closeDrawer({ restoreFocus = true } = {}) {
    const el = elements();
    if (!el.drawer) return;
    el.drawer.classList.remove("open");
    el.drawer.setAttribute("aria-hidden", "true");
    if (el.backdrop) el.backdrop.hidden = true;
    el.open?.setAttribute("aria-expanded", "false");
    root.document.body.classList.remove("notes-drawer-open");
    A11y.releaseFocusTrap(el.drawer, { restoreFocus });
    lastFocused = null;
  }

  function setSyncCopy(detail = {}) {
    const el = elements();
    if (!el.storageTitle || !el.storageBody) return;
    if (!detail.signedIn) {
      el.storageTitle.textContent = t("bookmarks.localTitle");
      el.storageBody.textContent = t("bookmarks.localBody");
    } else if (!detail.online) {
      el.storageTitle.textContent = t("bookmarks.offlineTitle");
      el.storageBody.textContent = t("bookmarks.offlineBody");
    } else if (detail.conflicts) {
      el.storageTitle.textContent = t("bookmarks.conflictTitle");
      el.storageBody.textContent = t("bookmarks.conflictBody");
    } else {
      el.storageTitle.textContent = detail.pending || detail.syncing ? t("bookmarks.syncingTitle") : t("bookmarks.cloudTitle");
      el.storageBody.textContent = detail.pending || detail.syncing ? t("bookmarks.syncingBody") : t("bookmarks.cloudBody");
    }
  }

  function bind() {
    const el = elements();
    el.toggle?.addEventListener("click", () => {
      if (!currentStructure) return;
      Bookmarks?.toggle?.(currentStructure);
      updateToggle();
    });
    el.open?.addEventListener("click", (event) => openDrawer(event.currentTarget));
    el.close?.addEventListener("click", () => closeDrawer());
    el.backdrop?.addEventListener("click", () => closeDrawer());

    root.document?.addEventListener?.("morphora:structureinfo", (event) => {
      currentStructure = event?.detail || null;
      if (el.actions) el.actions.hidden = !currentStructure?.structureId;
      updateToggle();
    });
    root.document?.addEventListener?.("morphora:structureinfoclose", () => {
      currentStructure = null;
      if (el.actions) el.actions.hidden = true;
    });
    root.addEventListener?.("morphora:bookmarkschange", () => { updateToggle(); renderList(); });
    root.addEventListener?.("morphora:languagechange", () => { updateToggle(); renderList(); });
    root.addEventListener?.("morphora:personalsyncstate", (event) => setSyncCopy(event?.detail || {}));
    root.addEventListener?.("keydown", (event) => { if (event.key === "Escape" && el.drawer?.classList.contains("open")) closeDrawer(); });
    updateCount();
    root.MorphoraPersonalSync?.status?.().then(setSyncCopy).catch(() => {});
  }

  if (root.document?.readyState === "loading") root.document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();

  root.MorphoraBookmarksUI = Object.freeze({ version: 1, renderList, openDrawer, closeDrawer, updateCount });
})();
