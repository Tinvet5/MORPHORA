document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const A11y = window.MorphoraA11y || {
    activateFocusTrap() {},
    announce() {},
    isCoarsePointer() { return false; },
    releaseFocusTrap() {}
  };
  const Config = window.MORPHORA_CONFIG || {};
  const Models = window.MorphoraModels;
  const Storage = window.MorphoraStorage;
  const I18n = window.MorphoraI18n || {
    ready: Promise.resolve(), applyDom() {},
    localize(item, field) { return item?.[field] ?? ""; },
    localizeArray(item, field) { const value = item?.[field]; return Array.isArray(value) ? value : []; },
    localizeView(view) { return view; },
    t(key) { return key; }
  };
  const Perf = window.MorphoraPerformance || {
    profile: { id: "balanced", label: "Balanced" },
    mark() {},
    measure() {},
    begin() { return () => null; },
    prefetchJson() { return Promise.resolve(false); },
    prefetchAsset() { return false; },
    shouldPrefetch() { return false; },
    startView() {},
    recordViewStage() {},
    completeView() {},
    cancelView() {},
    getViewerOptions() { return {}; },
    getTileCacheTrimThreshold() { return 170; }
  };
  await I18n.ready;
  I18n.applyDom();
  Perf.mark("atlas-dom-ready");
  const DRAG_THRESHOLD = A11y.isCoarsePointer() ? 10 : 6;

  function localizeToken(prefix, value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const camel = raw.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const key = `${prefix}.${camel}`;
    const translated = I18n.t(key);
    return translated === key ? raw.replace(/-/g, " ") : translated;
  }

  function localizeOrientation(value) {
    const name = localizeToken("orientation", value);
    return name ? I18n.t("orientation.view", { name }) : "";
  }
  let notesDrawerTrigger = null;
  let annotationEditorTrigger = null;

  // =========================
  // DOM REFERENCES
  // =========================
  const elements = {
    viewer: document.getElementById("viewer"),
    viewerState: document.getElementById("viewerState"),
    viewerStateCard: document.getElementById("viewerStateCard"),
    viewerStateIcon: document.getElementById("viewerStateIcon"),
    viewerStateEyebrow: document.getElementById("viewerStateEyebrow"),
    viewerStateTitle: document.getElementById("viewerStateTitle"),
    viewerStateMessage: document.getElementById("viewerStateMessage"),
    viewerStateActions: document.getElementById("viewerStateActions"),
    retryViewerStateButton: document.getElementById("retryViewerState"),
    dismissViewerStateButton: document.getElementById("dismissViewerState"),
    toggleLabels: document.getElementById("toggleLabels"),
    resetView: document.getElementById("resetView"),
    toggleTheme: document.getElementById("toggleTheme"),
    addAnnotation: document.getElementById("addAnnotation"),
    openNotes: document.getElementById("openNotes"),
    noteCountBadge: document.getElementById("noteCountBadge"),
    searchInput: document.getElementById("searchInput"),
    searchSuggestions: document.getElementById("labelSearchSuggestions"),
    searchStatus: document.getElementById("searchStatus"),
    viewButtons: document.getElementById("viewButtons"),
    menuBtn: document.getElementById("menuBtn"),
    menuPanel: document.getElementById("menuPanel"),
    infoPanel: document.getElementById("infoPanel"),
    infoEyebrow: document.getElementById("infoEyebrow"),
    infoTitle: document.getElementById("infoTitle"),
    infoText: document.getElementById("infoText"),
    infoMetaRow: document.getElementById("infoMetaRow"),
    infoMeta: document.getElementById("infoMeta"),
    infoContext: document.getElementById("infoContext"),
    focusModeToggle: document.getElementById("focusModeToggle"),
    focusModeExit: document.getElementById("focusModeExit"),
    closeInfoPanelButton: document.getElementById("closeInfoPanel"),
    annotationInfoActions: document.getElementById("annotationInfoActions"),
    editAnnotationInfo: document.getElementById("editAnnotationInfo"),
    recolorAnnotationInfo: document.getElementById("recolorAnnotationInfo"),
    deleteAnnotationInfo: document.getElementById("deleteAnnotationInfo"),
    notesBackdrop: document.getElementById("notesBackdrop"),
    notesDrawer: document.getElementById("notesDrawer"),
    closeNotes: document.getElementById("closeNotes"),
    notesSearchInput: document.getElementById("notesSearchInput"),
    notesViewName: document.getElementById("notesViewName"),
    notesViewCount: document.getElementById("notesViewCount"),
    notesList: document.getElementById("notesList"),
    exportNotes: document.getElementById("exportNotes"),
    importNotes: document.getElementById("importNotes"),
    notesImportInput: document.getElementById("notesImportInput"),
    clearCurrentNotes: document.getElementById("clearCurrentNotes"),
    clearAllNotes: document.getElementById("clearAllNotes"),
    annotationEditorBackdrop: document.getElementById("annotationEditorBackdrop"),
    annotationEditorDialog: document.getElementById("annotationEditorDialog"),
    annotationEditorForm: document.getElementById("annotationEditorForm"),
    annotationEditorEyebrow: document.getElementById("annotationEditorEyebrow"),
    annotationEditorTitle: document.getElementById("annotationEditorTitle"),
    annotationTitleInput: document.getElementById("annotationTitleInput"),
    annotationDescriptionInput: document.getElementById("annotationDescriptionInput"),
    annotationColorPresets: document.getElementById("annotationColorPresets"),
    annotationColorInput: document.getElementById("annotationColorInput"),
    closeAnnotationEditor: document.getElementById("closeAnnotationEditor"),
    cancelAnnotationEditor: document.getElementById("cancelAnnotationEditor"),
    annotationToast: document.getElementById("annotationToast"),
    mobileAtlasToolbar: document.getElementById("mobileAtlasToolbar"),
    mobileLibraryButton: document.getElementById("mobileLibraryButton"),
    mobileLabelsButton: document.getElementById("mobileLabelsButton"),
    mobileSearchButton: document.getElementById("mobileSearchButton"),
    mobileNotesButton: document.getElementById("mobileNotesButton"),
    mobileNoteCountBadge: document.getElementById("mobileNoteCountBadge"),
    mobileMoreButton: document.getElementById("mobileMoreButton")
  };

  const missingElementIds = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([id]) => id);

  if (missingElementIds.length > 0) {
    console.error(
      `MORPHORA could not start because these HTML elements are missing: ${missingElementIds.join(
        ", "
      )}`
    );
    return;
  }

  // =========================
  // VIEWER STATUS STATES
  // =========================
  let retryViewerAction = null;

  function setImageButtonsLoading(viewId = null) {
    document.querySelectorAll("[data-view-id]").forEach((button) => {
      const isLoading = Boolean(viewId) && button.dataset.viewId === viewId;
      button.classList.toggle("is-loading", isLoading);
      button.setAttribute("aria-busy", String(isLoading));
    });
  }

  function setViewerToolsDisabled(disabled) {
    elements.toggleLabels.disabled = disabled;
    elements.resetView.disabled = disabled;
    elements.addAnnotation.disabled = disabled;
    elements.openNotes.disabled = disabled;
    elements.searchInput.disabled = disabled;
    elements.mobileLabelsButton.disabled = disabled;
    elements.mobileSearchButton.disabled = disabled;
    elements.mobileNotesButton.disabled = disabled;
    elements.mobileMoreButton.disabled = disabled;
    elements.focusModeToggle.disabled = disabled;
  }

  function showViewerState({
    type,
    eyebrow,
    title,
    message,
    retryLabel = "Retry",
    onRetry = null,
    allowDismiss = false
  }) {
    const isLoading = type === "loading";
    const allowRetry = typeof onRetry === "function";

    retryViewerAction = allowRetry ? onRetry : null;

    elements.viewerState.dataset.state = type;
    elements.viewerStateEyebrow.textContent = eyebrow;
    elements.viewerStateTitle.textContent = title;
    elements.viewerStateMessage.textContent = message;
    elements.retryViewerStateButton.textContent = retryLabel;
    elements.retryViewerStateButton.hidden = !allowRetry;
    elements.dismissViewerStateButton.hidden = !allowDismiss;
    elements.viewerStateActions.hidden = !allowRetry && !allowDismiss;

    elements.viewerStateCard.setAttribute(
      "role",
      type === "error" ? "alert" : "status"
    );

    elements.viewerState.hidden = false;
    elements.viewerState.setAttribute("aria-hidden", "false");
    elements.viewer.setAttribute("aria-busy", String(isLoading));
    setViewerToolsDisabled(type === "loading" || type === "error");
    A11y.announce(`${title}. ${message}`, { assertive: type === "error" });
  }

  function hideViewerState() {
    retryViewerAction = null;
    elements.viewerState.hidden = true;
    elements.viewerState.setAttribute("aria-hidden", "true");
    elements.viewer.setAttribute("aria-busy", "false");
    setImageButtonsLoading();
    setViewerToolsDisabled(false);
  }

  function showAtlasLoadingState() {
    showViewerState({
      type: "loading",
      eyebrow: "Loading atlas data",
      title: I18n.t("viewer.preparingMorphora"),
      message: "MORPHORA is loading the atlas manifest and building the available anatomical views."
    });
  }

  function showLoadingState(viewName = "anatomical view") {
    showViewerState({
      type: "loading",
      eyebrow: "Loading view data",
      title: I18n.t("viewer.preparingNamed", { name: viewName }),
      message: "MORPHORA is loading the view metadata and preparing the anatomical image."
    });
  }

  function showImageSourceLoadingState(viewData, { fallback = false } = {}) {
    const isDeepZoom = viewData?.image?.type === "dzi" && !fallback;
    showViewerState({
      type: "loading",
      eyebrow: fallback
        ? "Loading compatible image"
        : isDeepZoom
          ? "Loading Deep Zoom preview"
          : "Loading anatomical image",
      title: I18n.t("viewer.preparingNamed", { name: viewData?.title || I18n.t("common.anatomicalView") }),
      message: fallback
        ? "The tiled image was unavailable, so MORPHORA is opening the standard-resolution fallback."
        : isDeepZoom
          ? "A low-resolution overview will appear first. Fine detail loads progressively as you zoom."
          : "MORPHORA is decoding the selected anatomical photograph and preparing its overlays."
    });
  }

  function showAtlasDataErrorState(manifestPath, details = "") {
    const localFileMessage = window.location.protocol === "file:"
      ? " JSON files cannot be loaded reliably by opening index.html directly. Run MORPHORA through VS Code Live Server or another local web server."
      : "";

    const safeDetails = details ? ` ${details}` : "";
    const pathLabel = manifestPath || activeManifestPath || DEFAULT_COLLECTION_MANIFEST_PATH;

    showViewerState({
      type: "error",
      eyebrow: "Collection data unavailable",
      title: I18n.t("viewer.collectionLoadError"),
      message: `Check that “${pathLabel}” exists and contains valid JSON.${localFileMessage}${safeDetails}`,
      retryLabel: "Retry collection data",
      onRetry: () => initializeAtlas(pathLabel, pendingInitialViewId, { forceReload: true })
    });

    elements.viewer.setAttribute("aria-busy", "false");
    setImageButtonsLoading();
  }

  function showViewDataErrorState(viewEntry, details = "") {
    const safeDetails = details ? ` ${details}` : "";

    showViewerState({
      type: "error",
      eyebrow: "View data unavailable",
      title: I18n.t("viewer.viewLoadErrorNamed", { name: viewEntry.buttonLabel }),
      message: `Check that “${viewEntry.dataPath}” exists and contains valid JSON.${safeDetails}`,
      retryLabel: "Retry view data",
      onRetry: () => loadView(viewEntry.id, { forceReload: true })
    });

    elements.viewer.setAttribute("aria-busy", "false");
    setImageButtonsLoading();
  }

  function showImageErrorState(imagePath, details = "") {
    const safeDetails = details ? ` ${details}` : "";

    showViewerState({
      type: "error",
      eyebrow: "Image unavailable",
      title: I18n.t("viewer.viewLoadError"),
      message: `Check that “${imagePath}” exists and that its capitalization matches the JSON data.${safeDetails}`,
      retryLabel: "Retry image",
      onRetry: () => {
        if (activeViewId) {
          loadView(activeViewId);
        }
      }
    });

    elements.viewer.setAttribute("aria-busy", "false");
    setImageButtonsLoading();
  }

  function showEmptyLabelsState() {
    showViewerState({
      type: "empty",
      eyebrow: "Atlas content pending",
      title: I18n.t("viewer.noLabels"),
      message: "The anatomical photograph is available and fully navigable. Labels can be added later by editing this view's JSON file.",
      allowDismiss: true
    });

    elements.viewer.setAttribute("aria-busy", "false");
    setImageButtonsLoading();
  }

  // =========================
  // DEPENDENCY CHECK
  // =========================
  if (typeof OpenSeadragon === "undefined") {
    console.error(
      "MORPHORA could not start because OpenSeadragon did not load. Check the CDN script in index.html or the network connection."
    );

    showViewerState({
      type: "error",
      eyebrow: "Viewer unavailable",
      title: I18n.t("viewer.startError"),
      message: "OpenSeadragon did not load. Check the internet connection and the OpenSeadragon script address in index.html."
    });

    return;
  }

  // =========================
  // VIEWER
  // =========================
  const viewerPerformanceOptions = Perf.getViewerOptions();
  const viewer = OpenSeadragon({
    id: "viewer",
    prefixUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
    showNavigationControl: false,
    showNavigator: true,
    navigatorPosition: "BOTTOM_LEFT",
    immediateRender: viewerPerformanceOptions.immediateRender,
    imageLoaderLimit: viewerPerformanceOptions.imageLoaderLimit,
    maxImageCacheCount: viewerPerformanceOptions.maxImageCacheCount,
    minPixelRatio: viewerPerformanceOptions.minPixelRatio,
    tileRetryMax: viewerPerformanceOptions.tileRetryMax,
    tileRetryDelay: viewerPerformanceOptions.tileRetryDelay
  });

  Perf.mark("viewer-created", {
    profile: Perf.profile?.id || "balanced",
    options: viewerPerformanceOptions
  });

  // =========================
  // ATLAS DATA CONFIGURATION
  // =========================
  const APP_VERSION = Config.assetVersion || Config.version || "4.9.7-dev";
  const DEFAULT_COLLECTION_MANIFEST_PATH =
    Config.defaultCollectionManifest || "data/collections/dog-skull.json";
  const SUPPORTED_SCHEMA_VERSION = Config.schemaVersion || Models?.SCHEMA_VERSION || 2;

  let atlasManifest = null;
  let activeManifestPath = null;
  let pendingInitialViewId = null;
  const collectionManifestCache = new Map();
  const viewManifestById = new Map();
  const viewDataCache = new Map();
  const maxViewDataCacheEntries = Number(Config.maxViewDataCacheEntries) || 24;

  function getCachedViewData(cacheKey) {
    if (!viewDataCache.has(cacheKey)) return null;
    const value = viewDataCache.get(cacheKey);
    // Refresh insertion order so the Map behaves like a tiny LRU cache.
    viewDataCache.delete(cacheKey);
    viewDataCache.set(cacheKey, value);
    return value;
  }

  function setCachedViewData(cacheKey, value) {
    if (viewDataCache.has(cacheKey)) viewDataCache.delete(cacheKey);
    viewDataCache.set(cacheKey, value);
    while (viewDataCache.size > maxViewDataCacheEntries) {
      const oldestKey = viewDataCache.keys().next().value;
      viewDataCache.delete(oldestKey);
    }
  }

  // =========================
  // APPLICATION STATE
  // =========================
  const trackedOverlays = new Set();

  let activeViewId = null;
  let activeViewData = null;
  let activeViewLoadController = null;
  let activeImageLoad = null;
  let adjacentPrefetchTimer = null;
  let viewLoadSequence = 0;
  let labelsVisible = true;
  let addingAnnotation = false;
  let searchQuery = "";
  let searchSuggestionIndex = -1;
  let ignoreNextColorPanelOutsideClick = false;
  let activeInfoElement = null;
  let lastInfoTrigger = null;
  let focusModeEnabled = false;

  const ANNOTATION_STORAGE_KEY = Storage?.keys.annotations || "morphora:annotations:v2";
  const LEGACY_ANNOTATION_STORAGE_KEY = Storage?.keys.annotationsLegacy || "morphora:annotations:v1";
  const ANNOTATION_SCHEMA_VERSION = Config.userDataSchemaVersion || Models?.USER_DATA_SCHEMA_VERSION || 2;
  const annotationElements = new Map();
  let annotationStore = loadAnnotationStore();
  let selectedAnnotationId = null;
  let annotationEditorMode = null;
  let annotationEditorAnnotationId = null;
  let pendingAnnotationPosition = null;
  let notesSearchQuery = "";
  let annotationToastTimer = null;

  const labelZoomThreshold = 1.2;

  // =========================
  // GENERAL HELPERS
  // =========================
  function normalizePath(url) {
    try {
      return new URL(url, window.location.href).pathname;
    } catch (error) {
      return String(url || "");
    }
  }

  function sourceMatchesImage(source, expectedImagePath) {
    if (!expectedImagePath) return true;

    const sourceUrl = source && typeof source === "object"
      ? source.url || source.tilesUrl || source._url
      : source;

    // Some tile-source types do not expose a URL. In that case, the active
    // load token is the safer source of truth.
    if (!sourceUrl) return true;

    const normalizedSource = normalizePath(sourceUrl)
      .replace(/_files\/?$/, ".dzi");
    const normalizedExpected = normalizePath(expectedImagePath);

    return normalizedSource === normalizedExpected ||
      normalizedSource.includes(normalizedExpected.replace(/\.dzi$/i, "_files/"));
  }

  function inferImageType(image) {
    const explicitType = typeof image.type === "string"
      ? image.type.trim().toLowerCase()
      : "";
    if (explicitType) return explicitType;
    return String(image.src || "").split("?", 1)[0].toLowerCase().endsWith(".dzi")
      ? "dzi"
      : "image";
  }

  function getImageSourcePath(image, useFallback = false) {
    if (useFallback && image.fallback) return image.fallback;
    return image.src;
  }

  function createOpenSeadragonSource(image, useFallback = false) {
    const sourcePath = getImageSourcePath(image, useFallback);
    const sourceType = useFallback ? "image" : image.type;

    if (sourceType === "dzi") {
      // OpenSeadragon resolves tile paths relative to the descriptor URL.
      // DZI assets are immutable release files, so no query parameter is
      // appended here.
      return sourcePath;
    }

    return {
      type: "image",
      url: sourcePath
    };
  }

  function getCurrentZoom() {
    if (!viewer.viewport) return 1;

    const zoom = viewer.viewport.getZoom();
    return Number.isFinite(zoom) ? zoom : 1;
  }

  function isElementTarget(target) {
    return target instanceof Element;
  }

  // =========================
  // JSON DATA LOADING + VALIDATION
  // =========================
  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function requireData(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function versionedPath(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}v=${APP_VERSION}`;
  }

  async function fetchJson(path, { signal } = {}) {
    const response = await fetch(versionedPath(path), {
      headers: { Accept: "application/json" },
      signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while requesting ${path}.`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error(`Invalid JSON in ${path}: ${error.message}`);
    }
  }

  function validateAtlasManifest(data) {
    if (Models?.prepare) return Models.prepare("collection", data);
    requireData(isPlainObject(data), "The atlas manifest must be a JSON object.");
    return data;
  }

  function validateViewData(data, manifestEntry) {
    if (Models?.prepare) {
      return Models.prepare("view", data, { expectedId: manifestEntry.id });
    }
    requireData(isPlainObject(data), `View data for “${manifestEntry.id}” must be an object.`);
    return data;
  }

  function renderViewButtons(manifest) {
    elements.viewButtons.replaceChildren();

    manifest.views.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.viewId = entry.id;
      const displayLabel = I18n.localize(entry, "buttonLabel") || entry.buttonLabel;
      button.dataset.orientation = String(entry.orientation || displayLabel || "").toLowerCase();
      button.className = "view-segment-button";
      button.innerHTML = `<span>${displayLabel}</span>`;
      button.setAttribute("aria-label", `Open ${displayLabel} anatomical view`);
      button.setAttribute("aria-pressed", "false");

      button.addEventListener("click", () => {
        if (window.MorphoraNavigation) {
          window.MorphoraNavigation.openAtlasView(entry.id);
        } else {
          loadView(entry.id);
        }
        closeMenu();
      });

      elements.viewButtons.appendChild(button);
    });
  }

  async function initializeAtlas(
    manifestPath = DEFAULT_COLLECTION_MANIFEST_PATH,
    initialViewId = null,
    { forceReload = false } = {}
  ) {
    const requestedManifestPath =
      typeof manifestPath === "string" && manifestPath.trim()
        ? manifestPath.trim()
        : DEFAULT_COLLECTION_MANIFEST_PATH;

    activeManifestPath = requestedManifestPath;
    pendingInitialViewId = initialViewId;
    showAtlasLoadingState();
    viewLoadSequence += 1;

    if (activeViewLoadController) {
      activeViewLoadController.abort();
      activeViewLoadController = null;
    }

    activeViewId = null;
    activeViewData = null;
    activeImageLoad = null;
    clearViewerPreview();
    if (adjacentPrefetchTimer) {
      window.clearTimeout(adjacentPrefetchTimer);
      adjacentPrefetchTimer = null;
    }
    Perf.mark("atlas-manifest-load-start", { path: requestedManifestPath });
    searchQuery = "";
    elements.searchInput.value = "";
    elements.searchStatus.hidden = true;
    elements.searchStatus.textContent = "";
    hideLabelSearchSuggestions();
    elements.viewButtons.replaceChildren();
    clearCurrentOverlays();
    closeInfoPanel();
    closeColorPanel();
    closeNotesDrawer();
    closeAnnotationEditor();
    setAnnotationMode(false);

    try {
      let validatedManifest = forceReload
        ? null
        : collectionManifestCache.get(requestedManifestPath);

      if (!validatedManifest) {
        const manifestData = await fetchJson(requestedManifestPath);
        validatedManifest = validateAtlasManifest(manifestData);
        collectionManifestCache.set(requestedManifestPath, validatedManifest);
      }

      // Ignore a collection response that finished after the user selected
      // another collection.
      if (activeManifestPath !== requestedManifestPath) return;

      atlasManifest = validatedManifest;
      Perf.mark("atlas-manifest-ready", {
        path: requestedManifestPath,
        views: validatedManifest.views.length
      });
      Perf.measure("Atlas manifest", "atlas-manifest-load-start", "atlas-manifest-ready");
      viewManifestById.clear();

      validatedManifest.views.forEach((entry) => {
        viewManifestById.set(entry.id, entry);
      });

      renderViewButtons(validatedManifest);

      const requestedViewId =
        initialViewId && viewManifestById.has(initialViewId)
          ? initialViewId
          : validatedManifest.defaultViewId;

      pendingInitialViewId = requestedViewId;
      await loadView(requestedViewId);
    } catch (error) {
      console.error(
        `MORPHORA could not load collection manifest ${requestedManifestPath}.`,
        error
      );

      if (activeManifestPath !== requestedManifestPath) return;

      atlasManifest = null;
      activeViewId = null;
      activeViewData = null;
      activeImageLoad = null;
      viewManifestById.clear();
      elements.viewButtons.replaceChildren();
      showAtlasDataErrorState(requestedManifestPath, error.message || "");
    }
  }

  // =========================
  // OVERLAY LIFECYCLE
  // =========================
  function addTrackedOverlay(options) {
    if (!options || !options.element) {
      console.error("MORPHORA tried to add an overlay without an element.");
      return null;
    }

    viewer.addOverlay(options);
    trackedOverlays.add(options.element);

    return options.element;
  }

  function removeTrackedOverlay(element) {
    if (!element) return;

    viewer.removeOverlay(element);
    trackedOverlays.delete(element);
  }

  function clearCurrentOverlays() {
    const overlaysToRemove = Array.from(trackedOverlays);

    // Clear tracking first so later event callbacks cannot reuse stale entries.
    trackedOverlays.clear();

    overlaysToRemove.forEach((element) => {
      viewer.removeOverlay(element);
    });

    annotationElements.clear();
  }

  // =========================
  // INFO PANEL
  // =========================
  function clearActiveInfoElement() {
    if (!activeInfoElement) return;

    activeInfoElement.classList.remove("active");
    activeInfoElement.setAttribute("aria-expanded", "false");
    activeInfoElement = null;
  }

  function showInfo({
    title,
    text,
    kind = "structure",
    sourceElement = null,
    annotationId = null,
    meta = "",
    context = ""
  }) {
    clearActiveInfoElement();
    lastInfoTrigger = sourceElement || null;

    if (sourceElement) {
      activeInfoElement = sourceElement;
      activeInfoElement.classList.add("active");
      activeInfoElement.setAttribute("aria-expanded", "true");
    }

    const isAnnotation = kind === "annotation";
    selectedAnnotationId = isAnnotation ? annotationId : null;

    elements.infoEyebrow.textContent = isAnnotation
      ? I18n.t("atlas.personalAnnotation")
      : I18n.t("atlas.structure");

    elements.infoTitle.textContent = title || (
      isAnnotation ? I18n.t("atlas.untitledAnnotation") : I18n.t("atlas.untitledStructure")
    );

    elements.infoText.textContent = text || (
      isAnnotation
        ? I18n.t("atlas.noAnnotationDescription")
        : I18n.t("atlas.noInformation")
    );

    const cleanMeta = String(meta || "").replace(/-/g, " ").trim();
    const cleanContext = String(context || "").trim();
    elements.infoMeta.textContent = cleanMeta;
    elements.infoContext.textContent = cleanContext;
    elements.infoMeta.hidden = !cleanMeta;
    elements.infoContext.hidden = !cleanContext;
    elements.infoMetaRow.hidden = !cleanMeta && !cleanContext;

    elements.infoPanel.dataset.kind = isAnnotation
      ? "annotation"
      : "structure";

    elements.annotationInfoActions.hidden = !isAnnotation;
    elements.infoPanel.classList.add("show");
    elements.infoPanel.setAttribute("aria-hidden", "false");
  }

  function closeInfoPanel({ restoreFocus = false } = {}) {
    const focusTarget = lastInfoTrigger;

    elements.infoPanel.classList.remove("show");
    elements.infoPanel.setAttribute("aria-hidden", "true");
    elements.annotationInfoActions.hidden = true;

    clearActiveInfoElement();
    lastInfoTrigger = null;
    selectedAnnotationId = null;

    if (
      restoreFocus &&
      focusTarget &&
      focusTarget.isConnected &&
      typeof focusTarget.focus === "function"
    ) {
      focusTarget.focus({ preventScroll: true });
    }
  }

  elements.closeInfoPanelButton.addEventListener("click", () => {
    closeInfoPanel({ restoreFocus: true });
  });

  // =========================
  // MENU + COLOR PICKER HELPERS
  // =========================
  function closeMenu({ restoreFocus = false } = {}) {
    const wasOpen = elements.menuPanel.classList.contains("open");
    hideLabelSearchSuggestions();
    elements.menuPanel.classList.remove("open");
    elements.menuBtn.setAttribute("aria-expanded", "false");
    elements.mobileMoreButton.setAttribute("aria-expanded", "false");
    if (restoreFocus && wasOpen && elements.mobileMoreButton.offsetParent !== null) {
      elements.mobileMoreButton.focus({ preventScroll: true });
    }
  }

  function openMenu({ focusSearch = false, trigger = elements.menuBtn } = {}) {
    elements.menuPanel.classList.add("open");
    elements.menuBtn.setAttribute("aria-expanded", "true");
    elements.mobileMoreButton.setAttribute("aria-expanded", "true");
    if (focusSearch) {
      requestAnimationFrame(() => elements.searchInput.focus({ preventScroll: true }));
    } else if (trigger === elements.mobileMoreButton) {
      requestAnimationFrame(() => {
        const first = elements.menuPanel.querySelector("button:not([disabled]), input:not([disabled])");
        first?.focus({ preventScroll: true });
      });
    }
  }

  function setFocusMode(enabled, { announce = true } = {}) {
    focusModeEnabled = Boolean(enabled);
    document.body.classList.toggle("atlas-focus-mode", focusModeEnabled);
    elements.focusModeToggle.setAttribute("aria-pressed", String(focusModeEnabled));
    elements.focusModeToggle.textContent = focusModeEnabled ? `↙ ${I18n.t("atlas.exitFocus")}` : `⛶ ${I18n.t("atlas.focus")}`;
    elements.focusModeExit.hidden = !focusModeEnabled;

    if (focusModeEnabled) {
      closeMenu();
      closeInfoPanel();
      if (announce) A11y.announce("Focus view enabled. Press Escape to exit.");
    } else if (announce) {
      A11y.announce("Focus view disabled.");
    }

    requestAnimationFrame(() => {
      if (viewer?.viewport && typeof viewer.viewport.resize === "function") {
        const rect = elements.viewer.getBoundingClientRect();
        viewer.viewport.resize(new OpenSeadragon.Point(rect.width, rect.height), true);
      }
    });
  }

  elements.focusModeToggle.addEventListener("click", () => setFocusMode(!focusModeEnabled));
  elements.focusModeExit.addEventListener("click", () => setFocusMode(false));

  function setAnnotationMode(enabled) {
    addingAnnotation = enabled;
    elements.addAnnotation.classList.toggle("active", enabled);
    elements.addAnnotation.setAttribute("aria-pressed", String(enabled));
    if (enabled) A11y.announce("Add note mode. Tap or click the anatomical image to place a note.");
  }

  // =========================
  // LABEL DOM CREATION
  // =========================
  function createLabelElement(labelData) {
    const element = document.createElement("div");
    element.className = "label-anchor";
    element.dataset.labelId = labelData.id;
    element.dataset.searchText = [labelData.name, ...(labelData.aliases || [])].join(" ").toLocaleLowerCase();
    element._morphoraLabelData = labelData;
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", I18n.t("atlas.openInfoAria", { name: labelData.name }));
    element.setAttribute("aria-expanded", "false");
    element.setAttribute("aria-description", "Press Enter or Space to open this anatomical label.");

    const isLeft = labelData.position.x < 0.5;
    element.classList.add(isLeft ? "left" : "right");
    element._morphoraAnchorPosition = { ...labelData.position };
    element._morphoraLabelPosition = labelData.labelPosition
      ? { ...labelData.labelPosition }
      : null;

    const svgNamespace = "http://www.w3.org/2000/svg";
    const connectorSvg = document.createElementNS(svgNamespace, "svg");
    connectorSvg.classList.add("connector-svg");
    connectorSvg.setAttribute("aria-hidden", "true");

    const connectorLine = document.createElementNS(svgNamespace, "line");
    connectorLine.classList.add("connector-line");
    connectorSvg.appendChild(connectorLine);

    const anchorDot = document.createElement("div");
    anchorDot.className = "anchor-dot";

    const labelBox = document.createElement("div");
    labelBox.className = "label-box";

    const labelText = document.createElement("span");
    labelText.className = "label-text";
    labelText.textContent = labelData.name;

    labelBox.appendChild(labelText);
    element.append(connectorSvg, anchorDot, labelBox);

    ["pointerdown", "pointerup", "click"].forEach((eventName) => {
      element.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    });

    const openLabelInfo = () => {
      const handledByLearning = window.MorphoraStudy?.handleLabelActivation?.(
        labelData,
        element
      );
      if (handledByLearning) return;

      showInfo({
        title: labelData.name,
        text: labelData.description,
        kind: "structure",
        sourceElement: element,
        meta: labelData.category || "Anatomical structure",
        context: activeViewData?.orientation
          ? localizeOrientation(activeViewData.orientation)
          : (activeViewData?.title || "")
      });
    };

    element.addEventListener("click", openLabelInfo);

    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      event.stopPropagation();
      openLabelInfo();
    });

    return element;
  }

  function renderLabels(labels) {
    if (!Array.isArray(labels)) return;

    labels.forEach((labelData) => {
      const hasValidCoordinates =
        labelData.position &&
        Number.isFinite(labelData.position.x) &&
        Number.isFinite(labelData.position.y);

      if (!labelData.name || !hasValidCoordinates) {
        console.warn("MORPHORA skipped an invalid label:", labelData);
        return;
      }

      const element = createLabelElement(labelData);

      addTrackedOverlay({
        element,
        location: new OpenSeadragon.Point(labelData.position.x, labelData.position.y),
        placement: OpenSeadragon.Placement.CENTER
      });

      requestAnimationFrame(() => {
        updateConnectorLine(element);
      });
    });
  }

  // =========================
  // CONNECTOR LINES
  // =========================
  function applyCustomLabelPosition(element) {
    const labelBox = element.querySelector(".label-box");
    const anchorPosition = element._morphoraAnchorPosition;
    const labelPosition = element._morphoraLabelPosition;

    if (!labelBox || !anchorPosition || !labelPosition || !viewer.viewport) {
      element._morphoraLabelDelta = null;
      return;
    }

    const anchorPixel = viewer.viewport.pixelFromPoint(
      new OpenSeadragon.Point(anchorPosition.x, anchorPosition.y),
      true
    );
    const labelPixel = viewer.viewport.pixelFromPoint(
      new OpenSeadragon.Point(labelPosition.x, labelPosition.y),
      true
    );

    const delta = {
      x: labelPixel.x - anchorPixel.x,
      y: labelPixel.y - anchorPixel.y
    };

    labelBox.style.left = `${delta.x}px`;
    labelBox.style.right = "auto";
    labelBox.style.top = `${delta.y}px`;
    labelBox.style.transform = "translate(-50%, -50%)";
    element._morphoraLabelDelta = delta;
  }

  function updateConnectorLine(element) {
    if (!element || !element.isConnected) return;

    applyCustomLabelPosition(element);

    const dot = element.querySelector(".anchor-dot");
    const labelBox = element.querySelector(".label-box");
    const svg = element.querySelector(".connector-svg");
    const line = element.querySelector(".connector-line");

    if (!dot || !labelBox || !svg || !line) return;

    const dotX = dot.offsetLeft;
    const dotY = dot.offsetTop;
    const customDelta = element._morphoraLabelDelta;
    const labelX = customDelta
      ? customDelta.x
      : labelBox.offsetLeft + labelBox.offsetWidth / 2;
    const labelY = customDelta
      ? customDelta.y
      : labelBox.offsetTop + labelBox.offsetHeight / 2;

    const minX = Math.min(dotX, labelX);
    const minY = Math.min(dotY, labelY);
    const maxX = Math.max(dotX, labelX);
    const maxY = Math.max(dotY, labelY);
    const padding = 12;

    svg.style.left = `${minX - padding}px`;
    svg.style.top = `${minY - padding}px`;
    svg.setAttribute("width", String(maxX - minX + padding * 2));
    svg.setAttribute("height", String(maxY - minY + padding * 2));

    line.setAttribute("x1", String(dotX - minX + padding));
    line.setAttribute("y1", String(dotY - minY + padding));
    line.setAttribute("x2", String(labelX - minX + padding));
    line.setAttribute("y2", String(labelY - minY + padding));
  }

  function updateAllConnectorLines() {
    trackedOverlays.forEach((element) => {
      if (element.classList.contains("label-anchor")) {
        updateConnectorLine(element);
      }
    });
  }

  // =========================
  // LABEL VISIBILITY + SEARCH
  // =========================
  function getLabelSearchMatches(query = searchQuery) {
    if (!query || !Array.isArray(activeViewData?.labels)) return [];

    const normalizedQuery = query.toLocaleLowerCase();
    return activeViewData.labels
      .filter((label) => String(label?.name || "").toLocaleLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const aName = String(a.name || "").toLocaleLowerCase();
        const bName = String(b.name || "").toLocaleLowerCase();
        const aStarts = aName.startsWith(normalizedQuery);
        const bStarts = bName.startsWith(normalizedQuery);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return aName.localeCompare(bName);
      })
      .slice(0, 7);
  }

  function hideLabelSearchSuggestions() {
    searchSuggestionIndex = -1;
    elements.searchSuggestions.hidden = true;
    elements.searchSuggestions.replaceChildren();
    elements.searchInput.setAttribute("aria-expanded", "false");
    elements.searchInput.removeAttribute("aria-activedescendant");
  }

  function focusSearchSuggestionAt(index) {
    const options = Array.from(elements.searchSuggestions.querySelectorAll("[role='option']"));
    if (!options.length) return;

    searchSuggestionIndex = Math.max(0, Math.min(index, options.length - 1));
    options.forEach((option, optionIndex) => {
      const active = optionIndex === searchSuggestionIndex;
      option.classList.toggle("is-active", active);
      option.setAttribute("aria-selected", String(active));
      if (active) {
        elements.searchInput.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function selectLabelSearchSuggestion(label) {
    if (!label) return;

    elements.searchInput.value = label.name;
    searchQuery = String(label.name || "").toLocaleLowerCase();
    if (!labelsVisible) setLabelsVisible(true, { announce: false });
    refreshLabelVisibility();
    hideLabelSearchSuggestions();

    const element = Array.from(trackedOverlays).find(
      (overlay) => overlay.classList?.contains("label-anchor") && overlay.dataset.labelId === label.id
    );

    if (viewer.viewport && label.position) {
      const point = new OpenSeadragon.Point(label.position.x, label.position.y);
      viewer.viewport.panTo(point);
      viewer.viewport.zoomTo(Math.max(getCurrentZoom(), 2), point);
    }

    closeMenu();
    window.setTimeout(() => {
      if (!element) return;
      showInfo({
        title: label.name,
        text: label.description,
        kind: "structure",
        sourceElement: element,
        meta: label.category || "Anatomical structure",
        context: activeViewData?.orientation
          ? localizeOrientation(activeViewData.orientation)
          : (activeViewData?.title || "")
      });
    }, 140);
  }

  function renderLabelSearchSuggestions() {
    const matches = getLabelSearchMatches();
    elements.searchSuggestions.replaceChildren();
    searchSuggestionIndex = -1;

    if (!searchQuery || matches.length === 0) {
      hideLabelSearchSuggestions();
      return;
    }

    matches.forEach((label, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.id = `label-search-option-${index}`;
      option.className = "label-search-option";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");

      const name = document.createElement("span");
      name.className = "label-search-option-name";
      const typed = elements.searchInput.value.trim();
      const labelName = String(label.name || "");
      const matchIndex = typed ? labelName.toLocaleLowerCase().indexOf(typed.toLocaleLowerCase()) : -1;
      if (matchIndex >= 0) {
        name.append(document.createTextNode(labelName.slice(0, matchIndex)));
        const mark = document.createElement("mark");
        mark.textContent = labelName.slice(matchIndex, matchIndex + typed.length);
        name.append(mark, document.createTextNode(labelName.slice(matchIndex + typed.length)));
      } else {
        name.textContent = labelName;
      }

      const meta = document.createElement("span");
      meta.className = "label-search-option-meta";
      const categoryText = label.category ? localizeToken("category", label.category) : I18n.t("atlas.anatomicalLabel");
      const orientationText = activeViewData?.orientation
        ? localizeToken("orientation", activeViewData.orientation)
        : "current view";
      meta.textContent = `${categoryText} · ${orientationText}`;

      option.append(name, meta);
      option.addEventListener("pointerdown", (event) => event.preventDefault());
      option.addEventListener("click", () => selectLabelSearchSuggestion(label));
      elements.searchSuggestions.appendChild(option);
    });

    elements.searchSuggestions.hidden = false;
    elements.searchInput.setAttribute("aria-expanded", "true");
  }

  function updateSearchStatus(matchCount, totalLabelCount) {
    if (!searchQuery || !labelsVisible || totalLabelCount === 0) {
      elements.searchStatus.hidden = true;
      elements.searchStatus.textContent = "";
      return;
    }

    elements.searchStatus.hidden = false;

    if (matchCount === 0) {
      elements.searchStatus.textContent = I18n.t("atlas.searchNoMatch", { query: elements.searchInput.value.trim() });
      return;
    }

    elements.searchStatus.textContent = I18n.t(matchCount === 1 ? "atlas.searchFound.one" : "atlas.searchFound.many", { count: matchCount });
  }

  function refreshLabelVisibility() {
    const currentZoom = getCurrentZoom();
    const zoomAllowsLabels = currentZoom > labelZoomThreshold;
    let totalLabelCount = 0;
    let matchCount = 0;

    trackedOverlays.forEach((element) => {
      if (!element.classList.contains("label-anchor")) return;

      totalLabelCount += 1;

      const labelText = element.dataset.searchText || "";
      const matchesSearch = labelText.includes(searchQuery);

      if (matchesSearch) {
        matchCount += 1;
      }

      const learningVisibility = window.MorphoraStudy?.getLabelVisibility?.(
        element.dataset.labelId,
        element._morphoraLabelData
      );

      if (learningVisibility) {
        const isHidden = learningVisibility === "hidden";
        const isAnchorOnly = learningVisibility === "anchor";
        element.classList.toggle("learning-anchor-only", isAnchorOnly);
        element.classList.toggle("learning-highlight", learningVisibility === "highlight");
        element.style.display = isHidden ? "none" : "block";
        element.style.opacity = isHidden ? "0" : "1";
        element.style.pointerEvents = learningVisibility === "full" ? "auto" : "none";
        element.tabIndex = learningVisibility === "full" ? 0 : -1;
        element.setAttribute("aria-hidden", String(isHidden));
        return;
      }

      element.classList.remove("learning-anchor-only", "learning-highlight");
      const shouldExistInLayout = labelsVisible && matchesSearch;
      const shouldBeInteractive = shouldExistInLayout && zoomAllowsLabels;

      element.style.display = shouldExistInLayout ? "block" : "none";
      element.style.opacity = shouldBeInteractive ? "1" : "0";
      element.style.pointerEvents = shouldBeInteractive ? "auto" : "none";
      element.tabIndex = shouldBeInteractive ? 0 : -1;
      element.setAttribute("aria-hidden", String(!shouldBeInteractive));

      if (element === activeInfoElement && !shouldBeInteractive) {
        closeInfoPanel();
      }
    });

    updateSearchStatus(matchCount, totalLabelCount);
  }

  // =========================
  // IMAGE + VIEW DATA LIFECYCLE
  // =========================
  function setActiveViewButton(viewId) {
    document.querySelectorAll("[data-view-id]").forEach((button) => {
      const isActive = button.dataset.viewId === viewId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function getViewName(viewId) {
    const entry = viewManifestById.get(viewId);
    const label = entry ? (I18n.localize(entry, "buttonLabel") || entry.buttonLabel) : "";
    return label ? `${label} view` : "anatomical view";
  }

  function setViewerPreview(image) {
    if (!image?.thumbnail) {
      clearViewerPreview();
      return;
    }
    const escaped = image.thumbnail.replace(/["\\]/g, "\\$&");
    elements.viewer.style.backgroundImage = `url("${escaped}")`;
    elements.viewer.classList.add("has-image-preview");
  }

  function clearViewerPreview() {
    elements.viewer.classList.remove("has-image-preview");
    elements.viewer.style.removeProperty("background-image");
  }

  function openViewImage(viewData, { useFallback = false } = {}) {
    const sourcePath = getImageSourcePath(viewData.image, useFallback);
    if (!sourcePath) {
      throw new Error(`View “${viewData.id}” does not provide a usable image source.`);
    }

    if (!activeImageLoad || activeImageLoad.viewId !== viewData.id) {
      activeImageLoad = {
        viewId: viewData.id,
        sourcePath,
        useFallback,
        fallbackAttempted: useFallback,
        firstTileMarked: false,
        openConfirmed: false,
        tiledImage: null
      };
    } else {
      activeImageLoad.sourcePath = sourcePath;
      activeImageLoad.useFallback = useFallback;
      activeImageLoad.fallbackAttempted =
        activeImageLoad.fallbackAttempted || useFallback;
      activeImageLoad.firstTileMarked = false;
      activeImageLoad.openConfirmed = false;
      activeImageLoad.tiledImage = null;
    }

    if (!useFallback && viewData.image.type === "dzi") {
      setViewerPreview(viewData.image);
    }

    showImageSourceLoadingState(viewData, { fallback: useFallback });
    Perf.mark(`view:${viewData.id}:image-open-start`, {
      type: useFallback ? "fallback" : viewData.image.type,
      source: sourcePath
    });

    // On constrained devices, prevent old Deep Zoom tiles from accumulating
    // across many view switches. The current image is immediately replaced by
    // the preview while the next source opens, so this remains visually stable.
    try {
      const loadedTiles = viewer.tileCache?.numTilesLoaded?.() || 0;
      const trimThreshold = Perf.getTileCacheTrimThreshold();
      if (Perf.profile?.id === "constrained" && loadedTiles > trimThreshold) {
        viewer.tileCache.clear();
        Perf.mark("viewer-tile-cache-trimmed", { loadedTiles, trimThreshold });
      }
    } catch (_) {
      // Cache introspection is optional and should never block a view load.
    }

    viewer.open(createOpenSeadragonSource(viewData.image, useFallback));
  }

  async function prefetchViewEntry(entry) {
    if (!entry || !Config.prefetchAdjacentViews || !Perf.shouldPrefetch()) return;

    const cacheKey = `${activeManifestPath || "default"}::${entry.id}`;
    let viewData = getCachedViewData(cacheKey);

    try {
      if (!viewData) {
        const raw = await fetchJson(entry.dataPath);
        viewData = validateViewData(raw, entry);
        setCachedViewData(cacheKey, viewData);
      }

      const thumbnail = viewData.image.thumbnail || entry.thumbnail;
      if (thumbnail) {
        Perf.prefetchAsset(thumbnail, { as: "image" });
      } else if (viewData.image.type === "image") {
        Perf.prefetchAsset(viewData.image.src, { as: "image" });
      }

      if (viewData.image.type === "dzi") {
        fetch(viewData.image.src, {
          cache: "force-cache",
          priority: "low"
        }).catch(() => {});
      }
    } catch (error) {
      if (Perf.enabled) {
        console.info(`MORPHORA skipped prefetch for ${entry.id}.`, error);
      }
    }
  }

  function scheduleAdjacentViewPrefetch(viewId) {
    if (adjacentPrefetchTimer) {
      window.clearTimeout(adjacentPrefetchTimer);
    }
    if (!atlasManifest || !Config.prefetchAdjacentViews || !Perf.shouldPrefetch()) return;

    adjacentPrefetchTimer = window.setTimeout(() => {
      const views = atlasManifest.views || [];
      const index = views.findIndex((entry) => entry.id === viewId);
      if (index < 0 || views.length < 2) return;

      const nextEntry = views[(index + 1) % views.length];
      prefetchViewEntry(nextEntry);
    }, 900);
  }

  async function loadView(viewId, { forceReload = false } = {}) {
    const viewEntry = viewManifestById.get(viewId);

    if (!viewEntry) {
      console.error(`MORPHORA atlas view not found: ${viewId}`);

      showViewerState({
        type: "error",
        eyebrow: "Atlas configuration error",
        title: "This anatomical view is not configured",
        message: `No manifest entry exists for “${viewId}”. Check “${activeManifestPath || DEFAULT_COLLECTION_MANIFEST_PATH}”.`,
        retryLabel: "Reload collection data",
        onRetry: () => initializeAtlas(
          activeManifestPath || DEFAULT_COLLECTION_MANIFEST_PATH,
          viewId,
          { forceReload: true }
        )
      });

      return;
    }

    const requestSequence = ++viewLoadSequence;

    if (activeViewId && activeViewId !== viewId) {
      Perf.cancelView(activeViewId, "superseded-by-view-switch");
    }

    if (activeViewLoadController) {
      activeViewLoadController.abort();
    }

    const controller = new AbortController();
    activeViewLoadController = controller;
    activeViewId = viewId;
    activeViewData = null;
    activeImageLoad = null;
    Perf.startView(viewId, { source: viewEntry.dataPath });
    Perf.mark(`view:${viewId}:load-start`, { dataPath: viewEntry.dataPath });

    elements.searchStatus.hidden = true;
    elements.searchStatus.textContent = "";

    clearCurrentOverlays();
    closeInfoPanel();
    closeColorPanel();
    closeNotesDrawer();
    closeAnnotationEditor();
    setAnnotationMode(false);
    setActiveViewButton(viewId);
    setImageButtonsLoading(viewId);
    showLoadingState(getViewName(viewId));

    try {
      const cacheKey = `${activeManifestPath || "default"}::${viewId}`;
      let viewData = forceReload ? null : getCachedViewData(cacheKey);
      const fromDataCache = Boolean(viewData);

      if (!viewData) {
        const rawViewData = await fetchJson(viewEntry.dataPath, {
          signal: controller.signal
        });

        viewData = validateViewData(rawViewData, viewEntry);
        setCachedViewData(cacheKey, viewData);
      }

      // V4.9.7 keeps the validated canonical data in cache and localizes only
      // the render copy. IDs, coordinates, quiz metadata and storage links stay
      // language-independent.
      viewData = I18n.localizeView(viewData);

      if (requestSequence !== viewLoadSequence || activeViewId !== viewId) {
        return;
      }

      activeViewData = viewData;
      activeViewLoadController = null;
      Perf.mark(`view:${viewId}:data-ready`, {
        labels: viewData.labels.length,
        imageType: viewData.image.type,
        fromDataCache
      });
      Perf.recordViewStage(viewId, "dataReady", {
        labels: viewData.labels.length,
        imageType: viewData.image.type,
        fromDataCache
      });
      Perf.measure(
        `View data ${viewId}`,
        `view:${viewId}:load-start`,
        `view:${viewId}:data-ready`
      );

      openViewImage(viewData);
    } catch (error) {
      if (error.name === "AbortError") {
        Perf.cancelView(viewId, "aborted");
        return;
      }
      if (requestSequence !== viewLoadSequence || activeViewId !== viewId) return;

      activeViewLoadController = null;
      activeViewData = null;

      console.error(
        `MORPHORA could not load view data for ${viewId}.`,
        error
      );

      showViewDataErrorState(viewEntry, error.message || "");
    }
  }

  // One stable handler is used for every image instead of creating a new
  // handler each time a view is selected.
  viewer.addHandler("open", (event) => {
    const viewData = activeViewData;

    if (!viewData) return;

    const expectedSource = activeImageLoad?.sourcePath || viewData.image.src;

    // Ignore a delayed event from an image that is no longer active.
    if (!sourceMatchesImage(event.source, expectedSource)) return;

    clearCurrentOverlays();
    renderLabels(viewData.labels);
    renderAnnotationsForActiveView();
    refreshLabelVisibility();
    updateAllConnectorLines();
    updateAnnotationUi();

    const imageMode = activeImageLoad?.useFallback
      ? "fallback"
      : viewData.image.type;
    elements.viewer.dataset.imageMode = imageMode;
    elements.viewer.dataset.fallbackLabel = I18n.t("viewer.compatibleImage");
    if (imageMode !== "dzi") {
      clearViewerPreview();
    }

    if (viewData.image.alt) {
      elements.viewer.setAttribute("aria-label", viewData.image.alt);
    }

    Perf.mark(`view:${viewData.id}:image-open-ready`, {
      mode: imageMode,
      labels: viewData.labels.length
    });
    Perf.recordViewStage(viewData.id, "viewerOpen", {
      imageType: viewData.image.type,
      labels: viewData.labels.length,
      mode: imageMode
    });
    Perf.measure(
      `Image open ${viewData.id}`,
      `view:${viewData.id}:image-open-start`,
      `view:${viewData.id}:image-open-ready`
    );

    const activeManifestEntry = viewManifestById.get(activeViewId);
    document.dispatchEvent(
      new CustomEvent("morphora:view-change", {
        detail: {
          viewId: activeViewId,
          label: activeManifestEntry ? (I18n.localize(activeManifestEntry, "buttonLabel") || activeManifestEntry.buttonLabel) : viewData.title,
          title: viewData.title,
          manifestPath: activeManifestPath,
          imageType: viewData.image.type,
          imageMode
        }
      })
    );

    if (activeImageLoad?.useFallback) {
      A11y.announce(I18n.t("viewer.fallbackOpened"));
    }

    scheduleAdjacentViewPrefetch(activeViewId);

    // Keep the loading shield in place until the first tile has actually
    // reached the renderer. OpenSeadragon's `open` event means the source is
    // ready, not that a visible frame has been painted. Hiding here caused a
    // brief flash of the outgoing/new image between view switches.
    if (activeImageLoad) {
      activeImageLoad.tiledImage = viewer.world?.getItemAt?.(0) || null;
      activeImageLoad.openConfirmed = true;
      activeImageLoad.pendingEmptyState = viewData.labels.length === 0;
    }
  });

  viewer.addHandler("tile-loaded", (event) => {
    if (
      !activeViewData ||
      !activeImageLoad ||
      !activeImageLoad.openConfirmed ||
      activeImageLoad.firstTileMarked
    ) return;

    // A late tile from the previous view must never dismiss the current
    // loading shield. OpenSeadragon supplies tiledImage on tile events when
    // available; object identity is the strongest check because DZI tile URLs
    // themselves do not equal the descriptor path.
    if (
      event?.tiledImage &&
      activeImageLoad.tiledImage &&
      event.tiledImage !== activeImageLoad.tiledImage
    ) {
      return;
    }

    activeImageLoad.firstTileMarked = true;
    Perf.mark(`view:${activeViewData.id}:first-tile-ready`);
    Perf.recordViewStage(activeViewData.id, "firstTile", {
      imageType: activeViewData.image.type,
      mode: activeImageLoad?.useFallback ? "fallback" : activeViewData.image.type
    });
    Perf.measure(
      `First visible tile ${activeViewData.id}`,
      `view:${activeViewData.id}:image-open-start`,
      `view:${activeViewData.id}:first-tile-ready`
    );
    Perf.completeView(activeViewData.id, {
      mode: activeImageLoad?.useFallback ? "fallback" : activeViewData.image.type
    });

    const completedViewId = activeViewData.id;
    const completedLoad = activeImageLoad;

    // Give the browser a paint opportunity after the tile resolves. Keeping
    // the shield for two animation frames prevents the loaded tile and the
    // outgoing canvas from flashing through during the handoff.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (
          !activeViewData ||
          activeViewData.id !== completedViewId ||
          activeImageLoad !== completedLoad
        ) {
          return;
        }

        clearViewerPreview();
        if (completedLoad.pendingEmptyState) {
          showEmptyLabelsState();
        } else {
          hideViewerState();
        }
      });
    });
  });

  viewer.addHandler("open-failed", (event) => {
    const viewData = activeViewData;
    const expectedSource = activeImageLoad?.sourcePath || viewData?.image?.src;

    if (viewData && event.source && !sourceMatchesImage(event.source, expectedSource)) {
      return;
    }

    const source = expectedSource || event.source || "unknown";
    const details = event.message || "The browser did not provide additional details.";

    if (
      viewData &&
      viewData.image.fallback &&
      activeImageLoad &&
      !activeImageLoad.fallbackAttempted
    ) {
      console.warn(
        `MORPHORA could not open ${source}; loading fallback ${viewData.image.fallback}.`,
        details
      );
      activeImageLoad.fallbackAttempted = true;
      openViewImage(viewData, { useFallback: true });
      return;
    }

    console.error(
      `MORPHORA could not open the image source: ${source}`,
      details
    );

    clearViewerPreview();
    clearCurrentOverlays();
    closeInfoPanel();
    showImageErrorState(source, details);
  });

  elements.retryViewerStateButton.addEventListener("click", () => {
    if (typeof retryViewerAction === "function") {
      const action = retryViewerAction;
      retryViewerAction = null;
      action();
    }
  });

  elements.dismissViewerStateButton.addEventListener("click", () => {
    if (elements.viewerState.dataset.state === "empty") {
      hideViewerState();
    }
  });

  viewer.addHandler("animation", () => {
    updateAllConnectorLines();
    refreshLabelVisibility();
  });

  viewer.addHandler("resize", () => {
    requestAnimationFrame(updateAllConnectorLines);
  });

  // =========================
  // CONTROLS
  // =========================
  function setLabelsVisible(visible, { announce = true } = {}) {
    labelsVisible = Boolean(visible);
    elements.toggleLabels.setAttribute("aria-pressed", String(labelsVisible));
    elements.mobileLabelsButton.setAttribute("aria-pressed", String(labelsVisible));
    elements.mobileLabelsButton.classList.toggle("is-active", labelsVisible);
    refreshLabelVisibility();
    if (announce) A11y.announce(labelsVisible ? "Anatomical labels shown." : "Anatomical labels hidden.");
  }

  elements.toggleLabels.addEventListener("click", () => {
    setLabelsVisible(!labelsVisible);
  });

  elements.resetView.addEventListener("click", () => {
    if (viewer.viewport) {
      viewer.viewport.goHome();
    }
  });

  elements.toggleTheme.addEventListener("click", () => {
    if (window.MorphoraNavigation) {
      window.MorphoraNavigation.toggleTheme();
    } else {
      document.body.classList.toggle("light-mode");
    }
  });


  // =========================
  // SEARCH
  // =========================
  elements.searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value.trim().toLocaleLowerCase();
    refreshLabelVisibility();
    renderLabelSearchSuggestions();
  });

  elements.searchInput.addEventListener("focus", () => {
    renderLabelSearchSuggestions();
  });

  elements.searchInput.addEventListener("keydown", (event) => {
    const options = Array.from(elements.searchSuggestions.querySelectorAll("[role='option']"));

    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      focusSearchSuggestionAt(searchSuggestionIndex < options.length - 1 ? searchSuggestionIndex + 1 : 0);
      return;
    }

    if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      focusSearchSuggestionAt(searchSuggestionIndex > 0 ? searchSuggestionIndex - 1 : options.length - 1);
      return;
    }

    if (event.key === "Enter" && searchSuggestionIndex >= 0 && options[searchSuggestionIndex]) {
      event.preventDefault();
      options[searchSuggestionIndex].click();
      return;
    }

    if (event.key === "Escape" && !elements.searchSuggestions.hidden) {
      event.preventDefault();
      event.stopPropagation();
      hideLabelSearchSuggestions();
    }
  });

  // =========================
  // PERSISTENT PERSONAL ANNOTATIONS
  // =========================
  const pastelColors = [
    "#fff8a0",
    "#ffb6b9",
    "#a0ffc8",
    "#a0c8ff",
    "#ffd1a0",
    "#e0a0ff"
  ];

  function createEmptyAnnotationStore() {
    return {
      schemaVersion: ANNOTATION_SCHEMA_VERSION,
      updatedAt: null,
      views: {}
    };
  }

  function clampCoordinate(value) {
    return Math.min(1, Math.max(0, Number(value)));
  }

  function normalizeStoredAnnotation(value, fallbackViewId = "") {
    if (!isPlainObject(value)) return null;

    const x = Number(value.position && value.position.x);
    const y = Number(value.position && value.position.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    const viewId = typeof value.viewId === "string" && value.viewId.trim()
      ? value.viewId.trim()
      : fallbackViewId;

    if (!viewId) return null;

    const now = new Date().toISOString();

    return {
      id: typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : createAnnotationId(),
      viewId,
      manifestPath: typeof value.manifestPath === "string"
        ? value.manifestPath
        : "",
      viewLabel: typeof value.viewLabel === "string" && value.viewLabel.trim()
        ? value.viewLabel.trim()
        : viewId,
      title: typeof value.title === "string" && value.title.trim()
        ? value.title.trim().slice(0, 100)
        : "Untitled note",
      description: typeof value.description === "string"
        ? value.description.trim().slice(0, 2000)
        : "",
      color: typeof value.color === "string" && /^#[0-9a-f]{6}$/i.test(value.color)
        ? value.color
        : "#fff8a0",
      position: {
        x: clampCoordinate(x),
        y: clampCoordinate(y)
      },
      createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now
    };
  }

  function normalizeAnnotationViews(rawViews) {
    const views = {};

    if (!isPlainObject(rawViews)) return views;

    Object.entries(rawViews).forEach(([viewId, annotations]) => {
      if (!Array.isArray(annotations)) return;

      const normalized = annotations
        .map((annotation) => normalizeStoredAnnotation(annotation, viewId))
        .filter(Boolean);

      if (normalized.length > 0) {
        views[viewId] = normalized;
      }
    });

    return views;
  }

  function loadAnnotationStore() {
    const emptyStore = createEmptyAnnotationStore();
    try {
      const migrated = Storage?.readStore
        ? Storage.readStore("annotations", { fallback: null })
        : null;
      if (!migrated) return emptyStore;
      const rawViews = migrated.views || migrated.annotations;
      return {
        schemaVersion: ANNOTATION_SCHEMA_VERSION,
        updatedAt: typeof migrated.updatedAt === "string" ? migrated.updatedAt : null,
        views: normalizeAnnotationViews(rawViews)
      };
    } catch (error) {
      console.warn("MORPHORA could not read saved annotations.", error);
      return emptyStore;
    }
  }

  function createAnnotationId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `annotation-${window.crypto.randomUUID()}`;
    }

    return `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function showAnnotationToast(message, type = "success") {
    window.clearTimeout(annotationToastTimer);
    elements.annotationToast.textContent = message;
    elements.annotationToast.dataset.type = type;
    elements.annotationToast.classList.add("show");

    annotationToastTimer = window.setTimeout(() => {
      elements.annotationToast.classList.remove("show");
    }, 2200);
  }

  function saveAnnotationStore(message = "Notes saved") {
    annotationStore.updatedAt = new Date().toISOString();
    const result = Storage?.writeStore
      ? Storage.writeStore("annotations", annotationStore)
      : { ok: false, fallback: false };
    updateAnnotationUi();
    if (result?.ok) {
      if (message) showAnnotationToast(message);
      return true;
    }
    showAnnotationToast(
      result?.fallback
        ? "Notes are retained for this session, but could not be saved permanently."
        : "Notes could not be saved. Browser storage may be unavailable or full.",
      "error"
    );
    return false;
  }

  function getAnnotationsForView(viewId = activeViewId) {
    if (!viewId) return [];
    return annotationStore.views[viewId] || [];
  }

  function findAnnotation(annotationId, viewId = activeViewId) {
    return getAnnotationsForView(viewId).find(
      (annotation) => annotation.id === annotationId
    ) || null;
  }

  function getActiveViewLabel() {
    const entry = activeViewId ? viewManifestById.get(activeViewId) : null;
    return entry
      ? (I18n.localize(entry, "buttonLabel") || entry.buttonLabel)
      : activeViewData && activeViewData.title
        ? activeViewData.title
        : "Anatomical view";
  }

  function updateAnnotationUi() {
    const count = getAnnotationsForView().length;
    const noteLabel = `${count} personal ${count === 1 ? "note" : "notes"} in this view`;
    elements.noteCountBadge.textContent = String(count);
    elements.noteCountBadge.setAttribute("aria-label", noteLabel);
    elements.mobileNoteCountBadge.textContent = String(count);
    elements.mobileNoteCountBadge.setAttribute("aria-label", noteLabel);
    elements.openNotes.setAttribute("aria-expanded", String(
      elements.notesDrawer.classList.contains("open")
    ));
    elements.mobileNotesButton.setAttribute("aria-expanded", String(
      elements.notesDrawer.classList.contains("open")
    ));

    if (elements.notesDrawer.classList.contains("open")) {
      renderNotesList();
    }
  }

  function ensureViewAnnotationArray(viewId = activeViewId) {
    if (!viewId) return null;
    if (!Array.isArray(annotationStore.views[viewId])) {
      annotationStore.views[viewId] = [];
    }
    return annotationStore.views[viewId];
  }

  function removeRenderedAnnotations() {
    annotationElements.forEach((element) => {
      removeTrackedOverlay(element);
    });
    annotationElements.clear();
  }

  function refreshRenderedAnnotations(annotationIdToOpen = null) {
    const annotationIdToRestore = annotationIdToOpen || selectedAnnotationId;
    closeInfoPanel();
    removeRenderedAnnotations();
    renderAnnotationsForActiveView();
    updateAnnotationUi();

    if (annotationIdToRestore && findAnnotation(annotationIdToRestore)) {
      requestAnimationFrame(() => openAnnotationInfo(annotationIdToRestore));
    }
  }

  function renderAnnotationsForActiveView() {
    getAnnotationsForView().forEach((annotation) => {
      renderAnnotation(annotation);
    });
  }

  function openAnnotationInfo(annotationId) {
    const annotation = findAnnotation(annotationId);
    const element = annotationElements.get(annotationId);
    if (!annotation || !element) return;

    showInfo({
      title: annotation.title,
      text: annotation.description,
      kind: "annotation",
      sourceElement: element,
      annotationId,
      meta: "Private note",
      context: getActiveViewLabel()
    });
  }

  function updateAnnotationElement(element, annotation) {
    if (!element || !annotation) return;

    element.style.background = annotation.color;
    element.setAttribute("aria-label", `Open annotation: ${annotation.title}`);

    const title = element.querySelector(".annotation-title");
    const description = element.querySelector(".annotation-text");

    if (title) title.textContent = annotation.title;
    if (description) description.textContent = annotation.description || "";
  }

  function viewportPointFromPointerEvent(event) {
    const viewerRect = elements.viewer.getBoundingClientRect();
    const pixelPoint = new OpenSeadragon.Point(
      event.clientX - viewerRect.left,
      event.clientY - viewerRect.top
    );
    return viewer.viewport.pointFromPixel(pixelPoint);
  }

  function attachAnnotationDragging(element, annotation) {
    let dragState = null;

    element.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button")) return;

      event.stopPropagation();
      dragState = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPosition: { ...annotation.position },
        moved: false
      };

      element.setPointerCapture(event.pointerId);
      element.classList.add("is-dragging");
      viewer.setMouseNavEnabled(false);
    });

    element.addEventListener("pointermove", (event) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      const distance = Math.hypot(
        event.clientX - dragState.startClientX,
        event.clientY - dragState.startClientY
      );

      if (distance < DRAG_THRESHOLD && !dragState.moved) return;

      dragState.moved = true;
      event.preventDefault();
      event.stopPropagation();

      const point = viewportPointFromPointerEvent(event);
      annotation.position = {
        x: clampCoordinate(point.x),
        y: clampCoordinate(point.y)
      };

      viewer.updateOverlay(
        element,
        new OpenSeadragon.Point(annotation.position.x, annotation.position.y)
      );
    });

    const finishDrag = (event, cancelled = false) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      const wasMoved = dragState.moved;

      if (cancelled && wasMoved) {
        annotation.position = { ...dragState.startPosition };
        viewer.updateOverlay(
          element,
          new OpenSeadragon.Point(annotation.position.x, annotation.position.y)
        );
      }

      try {
        element.releasePointerCapture(event.pointerId);
      } catch (error) {
        // The browser may already have released pointer capture.
      }

      element.classList.remove("is-dragging");
      viewer.setMouseNavEnabled(true);
      dragState = null;

      if (wasMoved && !cancelled) {
        annotation.updatedAt = new Date().toISOString();
        element.dataset.justDragged = "true";
        window.setTimeout(() => {
          delete element.dataset.justDragged;
        }, 0);
        saveAnnotationStore("Note position saved");
      }
    };

    element.addEventListener("pointerup", (event) => finishDrag(event));
    element.addEventListener("pointercancel", (event) => finishDrag(event, true));
  }

  function renderAnnotation(annotation) {
    const element = document.createElement("article");
    element.className = "user-annotation";
    element.dataset.annotationId = annotation.id;
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-expanded", "false");
    element.setAttribute("aria-description", "Press Enter to open. Drag to reposition this personal note.");

    const title = document.createElement("div");
    title.className = "annotation-title";

    const description = document.createElement("div");
    description.className = "annotation-text";

    const actions = document.createElement("div");
    actions.className = "annotation-inline-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "annotation-edit";
    editButton.textContent = "✎";
    editButton.setAttribute("aria-label", I18n.t("notes.editAnnotation"));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "annotation-delete";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", I18n.t("notes.deleteAnnotation"));

    actions.append(editButton, deleteButton);
    element.append(title, description, actions);
    updateAnnotationElement(element, annotation);

    ["pointerdown", "pointerup", "pointermove", "click"].forEach((eventName) => {
      element.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    });

    addTrackedOverlay({
      element,
      location: new OpenSeadragon.Point(
        annotation.position.x,
        annotation.position.y
      )
    });

    annotationElements.set(annotation.id, element);
    attachAnnotationDragging(element, annotation);

    editButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openAnnotationEditor({ mode: "edit", annotation });
    });

    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteAnnotation(annotation.id);
    });

    element.addEventListener("click", (event) => {
      event.stopPropagation();
      if (element.dataset.justDragged === "true") return;
      openAnnotationInfo(annotation.id);
    });

    element.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openAnnotationEditor({ mode: "edit", annotation });
    });

    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        openAnnotationInfo(annotation.id);
      }
    });
  }

  function deleteAnnotation(annotationId) {
    const annotation = findAnnotation(annotationId);
    if (!annotation) return;

    if (!window.confirm(I18n.t("notes.deleteConfirm", { title: annotation.title }))) return;

    const annotations = ensureViewAnnotationArray(annotation.viewId);
    annotationStore.views[annotation.viewId] = annotations.filter(
      (item) => item.id !== annotationId
    );

    if (annotationStore.views[annotation.viewId].length === 0) {
      delete annotationStore.views[annotation.viewId];
    }

    if (selectedAnnotationId === annotationId) {
      closeInfoPanel();
    }

    saveAnnotationStore("Note deleted");
    refreshRenderedAnnotations();
  }

  function setEditorColor(color) {
    const normalized = /^#[0-9a-f]{6}$/i.test(color) ? color : pastelColors[0];
    elements.annotationColorInput.value = normalized;

    elements.annotationColorPresets.querySelectorAll("[data-color]").forEach((button) => {
      const active = button.dataset.color.toLowerCase() === normalized.toLowerCase();
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function openAnnotationEditor({
    mode,
    annotation = null,
    position = null,
    color = pastelColors[0]
  }) {
    if (mode === "create" && (!activeViewId || !position)) return;
    if (mode === "edit" && !annotation) return;

    annotationEditorMode = mode;
    annotationEditorAnnotationId = annotation ? annotation.id : null;
    pendingAnnotationPosition = position ? { ...position } : null;

    const isEditing = mode === "edit";
    elements.annotationEditorEyebrow.textContent = isEditing
      ? "Edit personal annotation"
      : "New personal annotation";
    elements.annotationEditorTitle.textContent = isEditing ? I18n.t("notes.editNote") : I18n.t("atlas.addNote");
    elements.annotationTitleInput.value = annotation ? annotation.title : "";
    elements.annotationDescriptionInput.value = annotation ? annotation.description : "";
    setEditorColor(annotation ? annotation.color : color);

    annotationEditorTrigger = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : elements.addAnnotation;
    elements.annotationEditorBackdrop.hidden = false;
    elements.annotationEditorDialog.hidden = false;
    elements.annotationEditorDialog.classList.add("open");
    elements.annotationEditorDialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("annotation-editor-open");
    A11y.activateFocusTrap(elements.annotationEditorDialog, {
      initialFocus: elements.annotationTitleInput,
      returnFocus: annotationEditorTrigger,
      onEscape: () => closeAnnotationEditor({ restoreFocus: true })
    });
  }

  function closeAnnotationEditor({ restoreFocus = false } = {}) {
    if (elements.annotationEditorDialog.hidden) return;
    annotationEditorMode = null;
    annotationEditorAnnotationId = null;
    pendingAnnotationPosition = null;
    elements.annotationEditorDialog.classList.remove("open");
    elements.annotationEditorDialog.setAttribute("aria-hidden", "true");
    elements.annotationEditorDialog.hidden = true;
    elements.annotationEditorBackdrop.hidden = true;
    document.body.classList.remove("annotation-editor-open");
    elements.annotationEditorForm.reset();
    setEditorColor(pastelColors[0]);
    A11y.releaseFocusTrap(elements.annotationEditorDialog, { restoreFocus });
    annotationEditorTrigger = null;
  }

  pastelColors.forEach((color) => {
    const preset = document.createElement("button");
    preset.type = "button";
    preset.className = "annotation-color-preset";
    preset.dataset.color = color;
    preset.style.background = color;
    preset.setAttribute("aria-label", `Use note color ${color}`);
    preset.setAttribute("aria-pressed", "false");
    preset.addEventListener("click", () => setEditorColor(color));
    elements.annotationColorPresets.appendChild(preset);
  });

  elements.annotationColorInput.addEventListener("input", (event) => {
    setEditorColor(event.target.value);
  });

  elements.annotationEditorForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = elements.annotationTitleInput.value.trim();
    const description = elements.annotationDescriptionInput.value.trim();
    const color = elements.annotationColorInput.value;

    if (!title) {
      elements.annotationTitleInput.focus();
      return;
    }

    const now = new Date().toISOString();
    let annotationId = annotationEditorAnnotationId;

    if (annotationEditorMode === "create") {
      const annotations = ensureViewAnnotationArray();
      if (!annotations || !pendingAnnotationPosition) return;

      const annotation = {
        id: createAnnotationId(),
        viewId: activeViewId,
        manifestPath: activeManifestPath || "",
        viewLabel: getActiveViewLabel(),
        title,
        description,
        color,
        position: {
          x: clampCoordinate(pendingAnnotationPosition.x),
          y: clampCoordinate(pendingAnnotationPosition.y)
        },
        createdAt: now,
        updatedAt: now
      };

      annotations.push(annotation);
      annotationId = annotation.id;
    } else if (annotationEditorMode === "edit") {
      const annotation = findAnnotation(annotationEditorAnnotationId);
      if (!annotation) return;

      annotation.title = title;
      annotation.description = description;
      annotation.color = color;
      annotation.updatedAt = now;
    }

    saveAnnotationStore(annotationEditorMode === "create" ? "Note created" : "Note updated");
    closeAnnotationEditor({ restoreFocus: true });
    refreshRenderedAnnotations(annotationId);
  });

  elements.closeAnnotationEditor.addEventListener("click", () => closeAnnotationEditor({ restoreFocus: true }));
  elements.cancelAnnotationEditor.addEventListener("click", () => closeAnnotationEditor({ restoreFocus: true }));
  elements.annotationEditorBackdrop.addEventListener("click", () => closeAnnotationEditor({ restoreFocus: true }));

  const colorPanel = document.createElement("div");
  colorPanel.className = "color-picker-panel";
  colorPanel.setAttribute("role", "dialog");
  colorPanel.setAttribute("aria-label", I18n.t("notes.chooseColor"));
  colorPanel.viewportPoint = null;

  function closeColorPanel() {
    colorPanel.style.display = "none";
    colorPanel.viewportPoint = null;
  }

  pastelColors.forEach((color) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-swatch";
    swatch.style.background = color;
    swatch.setAttribute("aria-label", I18n.t("notes.useColor", { color }));

    swatch.addEventListener("click", (event) => {
      event.stopPropagation();

      const viewportPoint = colorPanel.viewportPoint;
      closeColorPanel();
      if (!viewportPoint) return;

      openAnnotationEditor({
        mode: "create",
        position: {
          x: clampCoordinate(viewportPoint.x),
          y: clampCoordinate(viewportPoint.y)
        },
        color
      });
    });

    colorPanel.appendChild(swatch);
  });

  document.body.appendChild(colorPanel);

  ["pointerdown", "click"].forEach((eventName) => {
    colorPanel.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
  });

  elements.addAnnotation.addEventListener("click", (event) => {
    event.stopPropagation();

    const nextMode = !addingAnnotation;
    setAnnotationMode(nextMode);
    closeColorPanel();

    if (nextMode) {
      closeMenu();
      showAnnotationToast(I18n.t("notes.placeHint"), "info");
    }
  });

  viewer.addHandler("canvas-click", (event) => {
    if (!addingAnnotation) return;

    const originalEvent = event.originalEvent;
    const originalTarget = originalEvent && originalEvent.target;

    if (
      isElementTarget(originalTarget) &&
      originalTarget.closest(".label-anchor, .user-annotation, .color-picker-panel")
    ) {
      return;
    }

    if (originalEvent && typeof originalEvent.stopPropagation === "function") {
      originalEvent.stopPropagation();
    }

    event.preventDefaultAction = true;

    const viewportPoint = viewer.viewport.pointFromPixel(event.position);
    colorPanel.viewportPoint = viewportPoint;

    const clickX = originalEvent && Number.isFinite(originalEvent.pageX)
      ? originalEvent.pageX
      : event.position.x + window.scrollX;

    const clickY = originalEvent && Number.isFinite(originalEvent.pageY)
      ? originalEvent.pageY
      : event.position.y + window.scrollY;

    colorPanel.style.left = `${clickX}px`;
    colorPanel.style.top = `${clickY}px`;
    colorPanel.style.display = "flex";

    ignoreNextColorPanelOutsideClick = true;
    window.setTimeout(() => {
      ignoreNextColorPanelOutsideClick = false;
    }, 0);

    setAnnotationMode(false);
  });

  function openNotesDrawer(trigger = document.activeElement) {
    notesDrawerTrigger = trigger instanceof HTMLElement ? trigger : elements.openNotes;
    notesSearchQuery = "";
    elements.notesSearchInput.value = "";
    elements.notesBackdrop.hidden = false;
    elements.notesDrawer.classList.add("open");
    elements.notesDrawer.setAttribute("aria-hidden", "false");
    elements.openNotes.setAttribute("aria-expanded", "true");
    elements.mobileNotesButton.setAttribute("aria-expanded", "true");
    document.body.classList.add("notes-drawer-open");
    renderNotesList();
    A11y.activateFocusTrap(elements.notesDrawer, {
      initialFocus: elements.notesSearchInput,
      returnFocus: notesDrawerTrigger,
      onEscape: () => closeNotesDrawer({ restoreFocus: true })
    });
    A11y.announce(`My notes opened. ${getAnnotationsForView().length} notes in this view.`);
  }

  function closeNotesDrawer({ restoreFocus = false } = {}) {
    if (!elements.notesDrawer.classList.contains("open")) return;
    elements.notesDrawer.classList.remove("open");
    elements.notesDrawer.setAttribute("aria-hidden", "true");
    elements.notesBackdrop.hidden = true;
    elements.openNotes.setAttribute("aria-expanded", "false");
    elements.mobileNotesButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("notes-drawer-open");
    A11y.releaseFocusTrap(elements.notesDrawer, { restoreFocus });
    notesDrawerTrigger = null;
  }

  function renderNotesList() {
    const annotations = getAnnotationsForView();
    const query = notesSearchQuery.toLocaleLowerCase();
    const filtered = annotations.filter((annotation) => {
      if (!query) return true;
      return `${annotation.title} ${annotation.description}`
        .toLocaleLowerCase()
        .includes(query);
    });

    elements.notesViewName.textContent = getActiveViewLabel();
    elements.notesViewCount.textContent = I18n.t(annotations.length === 1 ? "notes.count.one" : "notes.count.many", { count: annotations.length });
    elements.notesList.replaceChildren();

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "notes-empty-state";
      empty.innerHTML = query
        ? `<strong>${I18n.t("notes.noMatchesTitle")}</strong><p>${I18n.t("notes.noMatchesBody")}</p>`
        : `<strong>${I18n.t("notes.emptyTitle")}</strong><p>${I18n.t("notes.emptyBody")}</p>`;
      elements.notesList.appendChild(empty);
      return;
    }

    filtered
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .forEach((annotation) => {
        const item = document.createElement("article");
        item.className = "notes-list-item";

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "notes-list-open";

        const color = document.createElement("span");
        color.className = "notes-list-color";
        color.style.background = annotation.color;

        const copy = document.createElement("span");
        copy.className = "notes-list-copy";

        const title = document.createElement("strong");
        title.textContent = annotation.title;

        const description = document.createElement("span");
        description.textContent = annotation.description || I18n.t("notes.noDescription");

        copy.append(title, description);
        openButton.append(color, copy);

        const actions = document.createElement("div");
        actions.className = "notes-list-actions";

        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = I18n.t("notes.edit");
        edit.addEventListener("click", () => {
          closeNotesDrawer();
          openAnnotationEditor({ mode: "edit", annotation });
        });

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "danger-action";
        remove.textContent = I18n.t("notes.delete");
        remove.addEventListener("click", () => deleteAnnotation(annotation.id));

        actions.append(edit, remove);
        item.append(openButton, actions);

        openButton.addEventListener("click", () => {
          closeNotesDrawer();
          focusAnnotation(annotation.id);
        });

        elements.notesList.appendChild(item);
      });
  }

  function focusAnnotation(annotationId) {
    const annotation = findAnnotation(annotationId);
    if (!annotation) return;

    const point = new OpenSeadragon.Point(
      annotation.position.x,
      annotation.position.y
    );

    if (viewer.viewport) {
      const zoom = Math.max(getCurrentZoom(), 2);
      viewer.viewport.panTo(point);
      viewer.viewport.zoomTo(zoom, point);
    }

    window.setTimeout(() => openAnnotationInfo(annotationId), 120);
  }

  elements.openNotes.addEventListener("click", (event) => {
    event.stopPropagation();
    closeMenu();
    openNotesDrawer(event.currentTarget);
  });
  elements.closeNotes.addEventListener("click", () => closeNotesDrawer({ restoreFocus: true }));
  elements.notesBackdrop.addEventListener("click", () => closeNotesDrawer({ restoreFocus: true }));
  elements.notesSearchInput.addEventListener("input", (event) => {
    notesSearchQuery = event.target.value.trim();
    renderNotesList();
  });

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportAnnotationBackup() {
    downloadJson("morphora-personal-notes.json", {
      schemaVersion: ANNOTATION_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      annotations: annotationStore.views
    });
    showAnnotationToast("Notes backup exported");
  }

  async function importAnnotationBackup(file) {
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const backupStore = Storage?.extractBackupStore?.(parsed, "annotations");
      const rawViews = backupStore?.views || (parsed && (parsed.annotations || parsed.views));
      const importedViews = normalizeAnnotationViews(rawViews);
      const importedCount = Object.values(importedViews)
        .reduce((total, annotations) => total + annotations.length, 0);

      if (importedCount === 0) {
        throw new Error("The selected file does not contain valid MORPHORA notes.");
      }

      const mode = window.prompt(
        "Type MERGE to keep current notes and add the backup, or REPLACE to overwrite all current notes.",
        "MERGE"
      );

      if (mode === null) return;
      const normalizedMode = mode.trim().toUpperCase();
      if (normalizedMode !== "MERGE" && normalizedMode !== "REPLACE") {
        showAnnotationToast("Import cancelled: choose MERGE or REPLACE", "error");
        return;
      }

      if (normalizedMode === "REPLACE") {
        if (!window.confirm("Replace every saved MORPHORA note on this device?")) return;
        annotationStore.views = importedViews;
      } else {
        Object.entries(importedViews).forEach(([viewId, importedAnnotations]) => {
          const existing = annotationStore.views[viewId] || [];
          const merged = new Map(existing.map((annotation) => [annotation.id, annotation]));
          importedAnnotations.forEach((annotation) => merged.set(annotation.id, annotation));
          annotationStore.views[viewId] = Array.from(merged.values());
        });
      }

      saveAnnotationStore(`${importedCount} ${importedCount === 1 ? "note" : "notes"} imported`);
      refreshRenderedAnnotations();
    } catch (error) {
      console.error("MORPHORA could not import the note backup.", error);
      showAnnotationToast(error.message || "The notes file could not be imported.", "error");
    } finally {
      elements.notesImportInput.value = "";
    }
  }

  elements.exportNotes.addEventListener("click", exportAnnotationBackup);
  elements.importNotes.addEventListener("click", () => elements.notesImportInput.click());
  elements.notesImportInput.addEventListener("change", (event) => {
    importAnnotationBackup(event.target.files && event.target.files[0]);
  });

  elements.clearCurrentNotes.addEventListener("click", () => {
    const annotations = getAnnotationsForView();
    if (annotations.length === 0) return;
    if (!window.confirm(`Delete all ${annotations.length} notes in this view?`)) return;

    delete annotationStore.views[activeViewId];
    closeInfoPanel();
    saveAnnotationStore("Notes in this view cleared");
    refreshRenderedAnnotations();
  });

  elements.clearAllNotes.addEventListener("click", () => {
    const total = Object.values(annotationStore.views)
      .reduce((count, annotations) => count + annotations.length, 0);
    if (total === 0) return;
    if (!window.confirm(`Delete all ${total} MORPHORA notes saved on this device?`)) return;

    annotationStore = createEmptyAnnotationStore();
    closeInfoPanel();
    saveAnnotationStore("All notes cleared");
    refreshRenderedAnnotations();
  });

  elements.editAnnotationInfo.addEventListener("click", () => {
    const annotation = findAnnotation(selectedAnnotationId);
    if (annotation) openAnnotationEditor({ mode: "edit", annotation });
  });

  elements.recolorAnnotationInfo.addEventListener("click", () => {
    const annotation = findAnnotation(selectedAnnotationId);
    if (annotation) openAnnotationEditor({ mode: "edit", annotation });
  });

  elements.deleteAnnotationInfo.addEventListener("click", () => {
    if (selectedAnnotationId) deleteAnnotation(selectedAnnotationId);
  });

  // =========================
  // MENU
  // =========================
  elements.menuBtn.setAttribute("aria-expanded", "false");

  elements.menuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (elements.menuPanel.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu({ trigger: elements.menuBtn });
    }
  });

  elements.mobileLibraryButton.addEventListener("click", () => {
    closeMenu();
    window.MorphoraNavigation?.openLibraryDrawer?.(elements.mobileLibraryButton);
  });

  elements.mobileLabelsButton.addEventListener("click", () => {
    setLabelsVisible(!labelsVisible);
  });

  elements.mobileSearchButton.addEventListener("click", () => {
    openMenu({ focusSearch: true, trigger: elements.mobileSearchButton });
  });

  elements.mobileNotesButton.addEventListener("click", () => {
    closeMenu();
    openNotesDrawer(elements.mobileNotesButton);
  });

  elements.mobileMoreButton.addEventListener("click", () => {
    if (elements.menuPanel.classList.contains("open")) {
      closeMenu({ restoreFocus: true });
    } else {
      openMenu({ trigger: elements.mobileMoreButton });
    }
  });

  // =========================
  // GLOBAL KEYBOARD HANDLER
  // =========================
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (!elements.annotationEditorDialog.hidden) {
      closeAnnotationEditor({ restoreFocus: true });
      return;
    }

    if (elements.notesDrawer.classList.contains("open")) {
      closeNotesDrawer({ restoreFocus: true });
      return;
    }

    if (elements.infoPanel.classList.contains("show")) {
      closeInfoPanel({ restoreFocus: true });
      return;
    }

    if (focusModeEnabled) {
      setFocusMode(false);
      return;
    }

    if (
      !elements.viewerState.hidden &&
      elements.viewerState.dataset.state === "empty"
    ) {
      hideViewerState();
    }

    closeMenu({ restoreFocus: true });
    closeColorPanel();
    setAnnotationMode(false);
  });

  // =========================
  // GLOBAL CLICK HANDLER
  // =========================
  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!isElementTarget(target)) return;

    if (!target.closest(".label-anchor, .user-annotation, #infoPanel, #annotationEditorDialog, #notesDrawer")) {
      closeInfoPanel();
    }

    if (!target.closest(".atlas-search-field")) {
      hideLabelSearchSuggestions();
    }

    if (!target.closest(".menu, #mobileMoreButton, #mobileSearchButton")) {
      closeMenu();
    }

    if (ignoreNextColorPanelOutsideClick) {
      ignoreNextColorPanelOutsideClick = false;
    } else if (!target.closest(".color-picker-panel, #addAnnotation")) {
      closeColorPanel();
    }
  });

  // =========================
  // PUBLIC ATLAS API + INITIAL STATE
  // =========================
  async function openAtlasView(viewId = null) {
    // The atlas screen remains mounted while navigation screens are visible,
    // so OpenSeadragon keeps a stable viewport and can resume instantly.
    requestAnimationFrame(() => {
      if (viewer.viewport && elements.viewer.clientWidth && elements.viewer.clientHeight) {
        viewer.viewport.resize(
          new OpenSeadragon.Point(
            elements.viewer.clientWidth,
            elements.viewer.clientHeight
          ),
          true
        );
        viewer.forceRedraw();
      }
    });

    if (!atlasManifest) {
      return initializeAtlas(
        activeManifestPath || DEFAULT_COLLECTION_MANIFEST_PATH,
        viewId
      );
    }

    const targetViewId =
      viewId && viewManifestById.has(viewId)
        ? viewId
        : atlasManifest.defaultViewId;

    const hasOpenImage =
      activeViewId === targetViewId &&
      activeViewData &&
      viewer.world &&
      viewer.world.getItemCount() > 0;

    if (hasOpenImage) {
      setActiveViewButton(targetViewId);
      hideViewerState();
      const entry = viewManifestById.get(targetViewId);
      document.dispatchEvent(
        new CustomEvent("morphora:view-change", {
          detail: {
            viewId: targetViewId,
            label: entry ? (I18n.localize(entry, "buttonLabel") || entry.buttonLabel) : activeViewData.title,
            title: activeViewData.title,
            manifestPath: activeManifestPath
          }
        })
      );
      return;
    }

    return loadView(targetViewId);
  }

  async function openCollection(manifestPath, viewId = null) {
    const requestedPath =
      typeof manifestPath === "string" && manifestPath.trim()
        ? manifestPath.trim()
        : DEFAULT_COLLECTION_MANIFEST_PATH;

    if (!atlasManifest || activeManifestPath !== requestedPath) {
      return initializeAtlas(requestedPath, viewId);
    }

    return openAtlasView(viewId);
  }

  function deactivateAtlas() {
    document.dispatchEvent(new CustomEvent("morphora:atlas-deactivate"));
    closeMenu();
    closeColorPanel();
    closeInfoPanel();
    closeNotesDrawer();
    closeAnnotationEditor();
    setAnnotationMode(false);

    if (activeViewLoadController) {
      activeViewLoadController.abort();
      activeViewLoadController = null;
      viewLoadSequence += 1;
      hideViewerState();
    }

    activeViewData = null;
    activeImageLoad = null;
    if (adjacentPrefetchTimer) {
      window.clearTimeout(adjacentPrefetchTimer);
      adjacentPrefetchTimer = null;
    }
  }

  elements.toggleLabels.setAttribute("aria-pressed", "true");
  elements.mobileLabelsButton.setAttribute("aria-pressed", "true");
  elements.mobileMoreButton.setAttribute("aria-expanded", "false");
  elements.mobileNotesButton.setAttribute("aria-expanded", "false");
  elements.addAnnotation.setAttribute("aria-pressed", "false");
  elements.openNotes.setAttribute("aria-expanded", "false");
  updateAnnotationUi();

  document.addEventListener("morphora:focus-structure", (event) => {
    const structureId = event.detail?.structureId;
    if (!structureId || !activeViewData) return;
    const label = activeViewData.labels.find((item) => item.id === structureId);
    if (!label) return;
    selectSearchResult(label);
  });

  window.addEventListener("morphora:languagechange", () => {
    I18n.applyDom();
    elements.viewer.dataset.fallbackLabel = I18n.t("viewer.compatibleImage");
    if (atlasManifest) {
      renderViewButtons(atlasManifest);
    }
    if (activeViewId) {
      // The data cache stores canonical bilingual records; reloading here only
      // rebuilds the localized render copy and does not refetch unless needed.
      loadView(activeViewId);
    }
  });

  window.MorphoraAtlas = {
    openCollection,
    openView: openAtlasView,
    initialize: initializeAtlas,
    deactivate: deactivateAtlas,
    getActiveViewId: () => activeViewId,
    getActiveViewData: () => activeViewData,
    isFocusMode: () => focusModeEnabled,
    setFocusMode,
    getActiveManifestPath: () => activeManifestPath,
    getViewer: () => viewer,
    getLabelsVisible: () => labelsVisible,
    setLabelsVisible,
    refreshLabels: refreshLabelVisibility,
    closeInfoPanel,
    setLearningActive(active) {
      const enabled = Boolean(active);
      document.body.classList.toggle("learning-session-active", enabled);
      if (enabled) {
        setAnnotationMode(false);
        closeColorPanel();
        closeInfoPanel();
      }
      elements.addAnnotation.disabled = enabled;
      elements.addAnnotation.setAttribute("aria-disabled", String(enabled));
    },
    setDrawingActive(active) {
      const enabled = Boolean(active);
      document.body.classList.toggle("drawing-session-active", enabled);
      if (enabled) {
        setAnnotationMode(false);
        closeColorPanel();
        closeInfoPanel();
        closeNotesDrawer();
      }
      elements.addAnnotation.disabled = enabled;
      elements.openNotes.disabled = enabled;
      elements.addAnnotation.setAttribute("aria-disabled", String(enabled));
      elements.openNotes.setAttribute("aria-disabled", String(enabled));
    },
    focusPosition(position, zoom = 2) {
      if (!viewer.viewport || !position) return;
      const point = new OpenSeadragon.Point(position.x, position.y);
      viewer.viewport.panTo(point);
      if (Number.isFinite(zoom)) viewer.viewport.zoomTo(zoom, point);
    }
  };

  document.dispatchEvent(new CustomEvent("morphora:atlas-ready"));
});
