document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const A11y = window.MorphoraA11y || { announce() {} };
  const Config = window.MORPHORA_CONFIG || {};
  const Models = window.MorphoraModels;
  const AppStorage = window.MorphoraStorage;
  const I18n = window.MorphoraI18n || { ready: Promise.resolve(), sourceLocale: "es", supportedLocales: ["es", "en"], localize(item, field, options = {}) { return item?.translations?.[options.locale]?.[field] ?? item?.[field] ?? ""; }, localizeArray(item, field, options = {}) { const value = item?.translations?.[options.locale]?.[field] ?? item?.[field]; return Array.isArray(value) ? value : []; } };
  await I18n.ready;
  I18n.applyDom?.();
  const Validation = window.MorphoraValidation || null;
  const Storage = window.MorphoraStudioStorage || { supported: false, async putImage() { return false; }, async getImage() { return null; }, async deleteImage() { return false; } };
  const Perf = window.MorphoraPerformance || {
    profile: { id: "balanced", label: "Balanced" },
    mark() {},
    measure() {},
    shouldPrefetch() { return false; },
    getViewerOptions() { return {}; }
  };
  Perf.mark("studio-dom-ready");
  const APP_VERSION = Config.assetVersion || Config.version || "4.9.8-dev";
  const CATALOG_PATH = "data/catalog.json";
  const SUPPORTED_SCHEMA_VERSION = Config.schemaVersion || Models?.SCHEMA_VERSION || 2;
  const DRAFT_PREFIX = AppStorage?.keys.studioDraftPrefix || "morphora:studio:draft:";
  const COLLECTION_DRAFT_PREFIX = AppStorage?.keys.studioCollectionDraftPrefix || "morphora:studio:collection-draft:";
  const THEME_KEY = AppStorage?.keys.theme || "morphora:theme";
  const LAST_CONTEXT_KEY = AppStorage?.keys.studioLastContext || "morphora:studio:last-context";
  const LABEL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const CONTENT_LANGUAGE_KEY = AppStorage?.keys?.studioContentLanguage || "morphora:studio:content-language";
  let studioContentLanguage = I18n.supportedLocales.includes(AppStorage?.readText?.(CONTENT_LANGUAGE_KEY))
    ? AppStorage.readText(CONTENT_LANGUAGE_KEY)
    : (I18n.sourceLocale || "es");

  const elements = {
    body: document.body,
    themeToggle: document.getElementById("themeToggle"),
    documentStatusDot: document.getElementById("documentStatusDot"),
    documentStatusText: document.getElementById("documentStatusText"),
    draftStatusText: document.getElementById("draftStatusText"),
    saveDraftButton: document.getElementById("saveDraftButton"),
    copyJsonButton: document.getElementById("copyJsonButton"),
    exportJsonButton: document.getElementById("exportJsonButton"),
    speciesSelect: document.getElementById("speciesSelect"),
    systemSelect: document.getElementById("systemSelect"),
    collectionSelect: document.getElementById("collectionSelect"),
    viewSelect: document.getElementById("viewSelect"),
    viewMetadataCard: document.getElementById("viewMetadataCard"),
    viewTitleInput: document.getElementById("viewTitleInput"),
    viewButtonLabelInput: document.getElementById("viewButtonLabelInput"),
    viewIdReadonly: document.getElementById("viewIdReadonly"),
    viewOrientationInput: document.getElementById("viewOrientationInput"),
    viewDataPathInput: document.getElementById("viewDataPathInput"),
    viewImagePathInput: document.getElementById("viewImagePathInput"),
    viewAltInput: document.getElementById("viewAltInput"),
    addLabelFromSidebar: document.getElementById("addLabelFromSidebar"),
    labelFilterInput: document.getElementById("labelFilterInput"),
    labelList: document.getElementById("labelList"),
    labelCount: document.getElementById("labelCount"),
    importJsonButton: document.getElementById("importJsonButton"),
    importJsonInput: document.getElementById("importJsonInput"),
    newImageViewButton: document.getElementById("newImageViewButton"),
    replaceImageButton: document.getElementById("replaceImageButton"),
    saveProjectFolderButton: document.getElementById("saveProjectFolderButton"),
    batchImageButton: document.getElementById("batchImageButton"),
    batchImageInput: document.getElementById("batchImageInput"),
    connectProjectFolderButton: document.getElementById("connectProjectFolderButton"),
    projectFolderDot: document.getElementById("projectFolderDot"),
    projectFolderStatus: document.getElementById("projectFolderStatus"),
    runPreflightButton: document.getElementById("runPreflightButton"),
    pipelinePreflightBadge: document.getElementById("pipelinePreflightBadge"),
    pipelinePreflightList: document.getElementById("pipelinePreflightList"),
    imageToolStatus: document.getElementById("imageToolStatus"),
    imageImportDialog: document.getElementById("imageImportDialog"),
    imageImportForm: document.getElementById("imageImportForm"),
    imageImportMode: document.getElementById("imageImportMode"),
    imageNewViewFields: document.getElementById("imageNewViewFields"),
    imageFileInput: document.getElementById("imageFileInput"),
    imageViewTitleInput: document.getElementById("imageViewTitleInput"),
    imageButtonLabelInput: document.getElementById("imageButtonLabelInput"),
    imageViewIdInput: document.getElementById("imageViewIdInput"),
    imageOrientationInput: document.getElementById("imageOrientationInput"),
    imageRepoPathInput: document.getElementById("imageRepoPathInput"),
    imageAltInput: document.getElementById("imageAltInput"),
    imageImportSummary: document.getElementById("imageImportSummary"),
    imageImportDialogTitle: document.getElementById("imageImportDialogTitle"),
    confirmImageImportButton: document.getElementById("confirmImageImportButton"),
    cancelImageImportButton: document.getElementById("cancelImageImportButton"),
    closeImageImportDialog: document.getElementById("closeImageImportDialog"),
    resetSourceButton: document.getElementById("resetSourceButton"),
    browseModeButton: document.getElementById("browseModeButton"),
    addModeButton: document.getElementById("addModeButton"),
    repositionModeButton: document.getElementById("repositionModeButton"),
    repositionLabelModeButton: document.getElementById("repositionLabelModeButton"),
    previewModeButton: document.getElementById("previewModeButton"),
    undoButton: document.getElementById("undoButton"),
    redoButton: document.getElementById("redoButton"),
    resetViewButton: document.getElementById("resetViewButton"),
    viewerShell: document.getElementById("viewerShell"),
    studioViewer: document.getElementById("studioViewer"),
    studioViewerState: document.getElementById("studioViewerState"),
    viewerStateEyebrow: document.getElementById("viewerStateEyebrow"),
    viewerStateTitle: document.getElementById("viewerStateTitle"),
    viewerStateMessage: document.getElementById("viewerStateMessage"),
    retryStudioButton: document.getElementById("retryStudioButton"),
    modeGuidance: document.getElementById("modeGuidance"),
    activeViewTitle: document.getElementById("activeViewTitle"),
    imagePathText: document.getElementById("imagePathText"),
    coordinateReadout: document.getElementById("coordinateReadout"),
    inspectorTitle: document.getElementById("inspectorTitle"),
    selectionIndex: document.getElementById("selectionIndex"),
    emptyInspector: document.getElementById("emptyInspector"),
    labelForm: document.getElementById("labelForm"),
    labelLanguageInput: document.getElementById("labelLanguageInput"),
    labelTranslationStatus: document.getElementById("labelTranslationStatus"),
    labelNameInput: document.getElementById("labelNameInput"),
    labelIdInput: document.getElementById("labelIdInput"),
    generateIdButton: document.getElementById("generateIdButton"),
    labelDescriptionInput: document.getElementById("labelDescriptionInput"),
    labelAliasesInput: document.getElementById("labelAliasesInput"),
    labelCategoryInput: document.getElementById("labelCategoryInput"),
    labelStatusInput: document.getElementById("labelStatusInput"),
    labelQuizEligibleInput: document.getElementById("labelQuizEligibleInput"),
    labelDifficultyInput: document.getElementById("labelDifficultyInput"),
    labelAcceptedRadiusInput: document.getElementById("labelAcceptedRadiusInput"),
    anchorXInput: document.getElementById("anchorXInput"),
    anchorYInput: document.getElementById("anchorYInput"),
    repositionAnchorButton: document.getElementById("repositionAnchorButton"),
    repositionLabelButton: document.getElementById("repositionLabelButton"),
    labelXInput: document.getElementById("labelXInput"),
    labelYInput: document.getElementById("labelYInput"),
    resetLabelPositionButton: document.getElementById("resetLabelPositionButton"),
    duplicateLabelButton: document.getElementById("duplicateLabelButton"),
    deleteLabelButton: document.getElementById("deleteLabelButton"),
    validationBadge: document.getElementById("validationBadge"),
    validationList: document.getElementById("validationList"),
    studioToast: document.getElementById("studioToast"),
    studioDeviceAdvisory: document.getElementById("studioDeviceAdvisory"),
    dismissStudioAdvisory: document.getElementById("dismissStudioAdvisory"),
    mobileLibraryTab: document.getElementById("mobileLibraryTab"),
    mobileWorkspaceTab: document.getElementById("mobileWorkspaceTab"),
    mobileInspectorTab: document.getElementById("mobileInspectorTab")
  };

  const missingElements = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length) {
    console.error(`MORPHORA Studio cannot start. Missing elements: ${missingElements.join(", ")}`);
    return;
  }

  let catalog = null;
  const speciesCache = new Map();
  const collectionCache = new Map();
  const viewSourceCache = new Map();

  let viewer = null;
  let currentSpeciesEntry = null;
  let currentSpeciesData = null;
  let currentSystem = null;
  let currentCollection = null;
  let currentCollectionManifest = null;
  let currentViewEntry = null;
  let sourceViewData = null;
  let workingViewData = null;
  let selectedLabelKey = null;
  let mode = "browse";
  let dirty = false;
  let exportedFingerprint = "";
  let retryAction = null;
  let autosaveTimer = null;
  let toastTimer = null;
  let activeDragCleanup = null;
  let activeImageLoad = null;
  let fieldEditSnapshotTaken = false;
  const localImageSessions = new Map();
  let projectRootHandle = null;
  let manifestDirty = false;
  let lastDraftSavedAt = null;
  let lastPreflightReport = null;

  const overlayByLabelKey = new Map();
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 60;

  function versionedPath(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}v=${APP_VERSION}`;
  }

  function deepClone(value) {
    return Models?.clone ? Models.clone(value) : JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, Number(value)));
  }

  function inferImageType(image) {
    const explicitType = typeof image?.type === "string"
      ? image.type.trim().toLowerCase()
      : "";
    if (explicitType) return explicitType;
    return String(image?.src || "").split("?", 1)[0].toLowerCase().endsWith(".dzi")
      ? "dzi"
      : "image";
  }

  function getImageSourcePath(image, useFallback = false) {
    if (useFallback && image?.fallback) return image.fallback;
    if (!useFallback && image?._studioRuntimeSrc) return image._studioRuntimeSrc;
    return image?.src || "";
  }

  function createOpenSeadragonSource(image, useFallback = false) {
    const sourcePath = getImageSourcePath(image, useFallback);
    const sourceType = useFallback ? "image" : image.type;
    return sourceType === "dzi"
      ? sourcePath
      : { type: "image", url: sourcePath };
  }

  function normalizePath(url) {
    try {
      return new URL(url, window.location.href).pathname;
    } catch (error) {
      return String(url || "");
    }
  }

  function sourceMatchesImage(source, expectedPath) {
    if (!expectedPath) return true;
    const sourceUrl = source && typeof source === "object"
      ? source.url || source.tilesUrl || source._url
      : source;
    if (!sourceUrl) return true;
    return normalizePath(sourceUrl) === normalizePath(expectedPath) ||
      normalizePath(sourceUrl).includes(normalizePath(expectedPath).replace(/\.dzi$/i, "_files/"));
  }

  function setViewerPreview(image) {
    if (!image?.thumbnail) {
      clearViewerPreview();
      return;
    }
    const escaped = image.thumbnail.replace(/["\\]/g, "\\$&");
    elements.studioViewer.style.backgroundImage = `url("${escaped}")`;
    elements.studioViewer.classList.add("has-image-preview");
  }

  function clearViewerPreview() {
    elements.studioViewer.classList.remove("has-image-preview");
    elements.studioViewer.style.removeProperty("background-image");
  }

  function roundCoordinate(value) {
    return Number(clamp(value).toFixed(4));
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "new-label";
  }

  function fileExtension(file) {
    const fromName = String(file?.name || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
    if (["jpg", "jpeg", "png", "webp"].includes(fromName || "")) {
      return fromName === "jpeg" ? "jpg" : fromName;
    }
    const byType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    };
    return byType[file?.type] || "jpg";
  }

  function sanitizeRepositoryPath(path) {
    const normalized = String(path || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\/+/g, "/");
    if (!normalized || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
      throw new Error("Use a project-relative path without empty, . or .. segments.");
    }
    return normalized;
  }

  async function readImageDimensions(file) {
    if (!file) throw new Error("Choose an image first.");
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file);
        const result = { width: bitmap.width, height: bitmap.height };
        bitmap.close?.();
        return result;
      } catch (error) {
        // Fall back to an HTMLImageElement below.
      }
    }

    const url = URL.createObjectURL(file);
    try {
      const dimensions = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error("This browser could not decode the selected image."));
        image.src = url;
      });
      return dimensions;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function defaultImageViewId(file) {
    return slugify(String(file?.name || "new-anatomical-view").replace(/\.[^.]+$/, ""));
  }

  function humanizeIdentifier(value) {
    return String(value || "")
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\w/g, (char) => char.toUpperCase())
      .trim();
  }

  function inferOrientationFromId(value) {
    const parts = slugify(value).split("-");
    return ["lateral", "medial", "dorsal", "ventral", "cranial", "caudal", "rostral"]
      .find((candidate) => parts.includes(candidate)) || "other";
  }

  function uniqueViewId(base) {
    const used = new Set((currentCollectionManifest?.views || []).map((view) => view.id));
    const normalized = slugify(base);
    if (!used.has(normalized)) return normalized;
    let suffix = 2;
    while (used.has(`${normalized}-${suffix}`)) suffix += 1;
    return `${normalized}-${suffix}`;
  }

  function collectionDraftKey(path = currentCollection?.manifestPath) {
    return path ? `${COLLECTION_DRAFT_PREFIX}${path}` : null;
  }

  function cleanManifestEntry(entry, { preserveStudioLocal = false } = {}) {
    const clean = {};
    Object.entries(entry || {}).forEach(([key, value]) => {
      if (!key.startsWith("_") || (preserveStudioLocal && key === "_studioLocal")) clean[key] = value;
    });
    return clean;
  }

  function saveCollectionDraft() {
    const key = collectionDraftKey();
    if (!key || !currentCollectionManifest) return;
    const localEntries = (currentCollectionManifest.views || [])
      .filter((view) => view._studioLocal)
      .map((view) => cleanManifestEntry(view, { preserveStudioLocal: true }));
    try {
      if (localEntries.length) {
        AppStorage?.writeJSON?.(key, { savedAt: new Date().toISOString(), entries: localEntries });
      } else {
        AppStorage?.remove?.(key);
      }
    } catch (error) {
      console.warn("Could not save the local collection draft.", error);
    }
  }

  function mergeCollectionDraft(manifest) {
    const key = collectionDraftKey(currentCollection?.manifestPath);
    if (!key || !manifest || !Array.isArray(manifest.views)) return manifest;
    try {
      const parsed = AppStorage?.readJSON?.(key, { fallback: null });
      if (!parsed) return manifest;
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const existing = new Set(manifest.views.map((view) => view.id));
      entries.forEach((entry) => {
        if (!entry?.id || existing.has(entry.id)) return;
        manifest.views.push({ ...entry, _studioLocal: true });
        existing.add(entry.id);
      });
    } catch (error) {
      console.warn("Could not restore local collection draft entries.", error);
    }
    return manifest;
  }

  function currentImageSession() {
    return currentViewEntry?.id ? localImageSessions.get(currentViewEntry.id) || null : null;
  }

  function updateImageToolControls() {
    const hasView = Boolean(workingViewData && currentViewEntry);
    const session = currentImageSession();
    const directWriteSupported = typeof window.showDirectoryPicker === "function";

    elements.replaceImageButton.disabled = !hasView;
    elements.runPreflightButton.disabled = !hasView;
    elements.saveProjectFolderButton.disabled = !hasView || !directWriteSupported;
    elements.connectProjectFolderButton.disabled = !directWriteSupported;

    elements.projectFolderDot.classList.toggle("is-connected", Boolean(projectRootHandle));
    elements.projectFolderStatus.textContent = projectRootHandle
      ? `Connected: ${projectRootHandle.name || "MORPHORA project"}`
      : (directWriteSupported ? "Project folder not connected" : "Direct folder access unavailable");
    elements.connectProjectFolderButton.textContent = projectRootHandle ? I18n.t("studio.changeFolder") : I18n.t("studio.connectFolder");

    if (!directWriteSupported) {
      elements.saveProjectFolderButton.title = "Direct project-folder writing requires a Chromium browser with the File System Access API";
    } else if (!hasView) {
      elements.saveProjectFolderButton.title = "Select a view first";
    } else {
      elements.saveProjectFolderButton.title = "Validate, back up and write the current view to the connected MORPHORA repository";
    }

    if (session) {
      elements.imageToolStatus.textContent = Storage.supported
        ? `Local photograph retained for this view (${session.file.name}). Studio keeps a browser copy until the view is published.`
        : `Local photograph loaded (${session.file.name}). Keep this tab open until you publish or copy the image to ${session.repoPath}.`;
    } else if (hasView) {
      elements.imageToolStatus.textContent = I18n.t("studio.editThenPublish");
    } else {
      elements.imageToolStatus.textContent = I18n.t("studio.uploadHint");
    }
  }

  function closeImageImport() {
    if (elements.imageImportDialog.open && typeof elements.imageImportDialog.close === "function") {
      elements.imageImportDialog.close();
    } else {
      elements.imageImportDialog.removeAttribute("open");
    }
    elements.imageImportForm.reset();
    elements.imageImportSummary.textContent = I18n.t("studio.choosePhotoDimensions");
  }

  function showImageImportDialog(importMode) {
    if (importMode === "replace" && !workingViewData) {
      showToast(I18n.t("studio.selectViewReplace"));
      return;
    }
    if (dirty && importMode === "new" && !confirmContextChange()) return;

    elements.imageImportForm.reset();
    elements.imageImportMode.value = importMode;
    const isNew = importMode === "new";
    elements.imageNewViewFields.hidden = !isNew;
    elements.imageImportDialogTitle.textContent = isNew ? I18n.t("studio.createFromPhoto") : I18n.t("studio.replaceCurrentImage");
    elements.confirmImageImportButton.textContent = isNew ? I18n.t("studio.createLocalView") : I18n.t("studio.usePhoto");

    if (!isNew && workingViewData) {
      elements.imageViewTitleInput.value = workingViewData.title || currentViewEntry?.buttonLabel || "";
      elements.imageButtonLabelInput.value = currentViewEntry?.buttonLabel || workingViewData.title || "";
      elements.imageViewIdInput.value = workingViewData.id || currentViewEntry?.id || "";
      elements.imageOrientationInput.value = workingViewData.orientation || "other";
      const currentPath = workingViewData.image?.type === "dzi"
        ? (workingViewData.image?.fallback || `images/views/${workingViewData.id}.jpg`)
        : (workingViewData.image?.src || `images/views/${workingViewData.id}.jpg`);
      elements.imageRepoPathInput.value = currentPath;
      elements.imageAltInput.value = workingViewData.image?.alt || workingViewData.title || "";
    }

    if (typeof elements.imageImportDialog.showModal === "function") {
      elements.imageImportDialog.showModal();
    } else {
      elements.imageImportDialog.setAttribute("open", "");
    }
    requestAnimationFrame(() => elements.imageFileInput.focus());
  }

  async function updateImageImportFromFile() {
    const file = elements.imageFileInput.files?.[0];
    if (!file) {
      elements.imageImportSummary.textContent = I18n.t("studio.choosePhotoDimensions");
      return;
    }

    try {
      const dimensions = await readImageDimensions(file);
      const ext = fileExtension(file);
      const isNew = elements.imageImportMode.value === "new";
      if (isNew) {
        const id = defaultImageViewId(file);
        if (!elements.imageViewIdInput.value.trim()) elements.imageViewIdInput.value = id;
        const inferredOrientation = ["lateral", "medial", "dorsal", "ventral", "cranial", "caudal", "rostral"]
          .find((candidate) => id.split("-").includes(candidate));
        if (inferredOrientation) elements.imageOrientationInput.value = inferredOrientation;
        if (!elements.imageViewTitleInput.value.trim()) {
          elements.imageViewTitleInput.value = String(file.name).replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        }
        if (!elements.imageButtonLabelInput.value.trim()) elements.imageButtonLabelInput.value = elements.imageViewTitleInput.value;
        if (!elements.imageAltInput.value.trim()) elements.imageAltInput.value = elements.imageViewTitleInput.value;
        if (!elements.imageRepoPathInput.value.trim()) elements.imageRepoPathInput.value = `images/views/${elements.imageViewIdInput.value}.${ext}`;
      } else if (!elements.imageRepoPathInput.value.trim()) {
        elements.imageRepoPathInput.value = `images/views/${workingViewData.id}.${ext}`;
      }
      elements.imageImportSummary.textContent = `${file.name} · ${dimensions.width} × ${dimensions.height}px · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
    } catch (error) {
      elements.imageImportSummary.textContent = error.message;
    }
  }

  function attachLocalImageToView(viewData, file, repoPath, dimensions) {
    const previous = localImageSessions.get(viewData.id);
    if (previous?.objectUrl) URL.revokeObjectURL(previous.objectUrl);
    const objectUrl = URL.createObjectURL(file);
    const session = {
      file,
      objectUrl,
      repoPath,
      width: dimensions.width,
      height: dimensions.height,
      loadedAt: new Date().toISOString()
    };
    localImageSessions.set(viewData.id, session);
    viewData.image = {
      ...viewData.image,
      type: "image",
      src: repoPath,
      width: dimensions.width,
      height: dimensions.height,
      _studioRuntimeSrc: objectUrl
    };
    delete viewData.image.fallback;
    delete viewData.image.thumbnail;
    return session;
  }

  async function persistLocalImage(viewId, session) {
    if (!Storage.supported || !viewId || !session?.file) return;
    try {
      await Storage.putImage(viewId, session.file, {
        repoPath: session.repoPath,
        width: session.width,
        height: session.height
      });
    } catch (error) {
      console.warn("Could not persist the uploaded Studio image.", error);
      showToast(I18n.t("studio.photoRecoveryWarning"), { duration: 5000 });
    }
  }

  async function restorePersistedLocalImage(viewId, targetView = workingViewData) {
    if (!Storage.supported || !viewId || !targetView || localImageSessions.has(viewId)) return false;
    try {
      const record = await Storage.getImage(viewId);
      if (!record?.blob) return false;
      const file = new File([record.blob], record.name || `${viewId}.jpg`, {
        type: record.type || record.blob.type || "application/octet-stream",
        lastModified: record.lastModified || Date.now()
      });
      attachLocalImageToView(
        targetView,
        file,
        record.repoPath || targetView.image?.src || `images/views/${viewId}.jpg`,
        {
          width: record.width || targetView.image?.width,
          height: record.height || targetView.image?.height
        }
      );
      return true;
    } catch (error) {
      console.warn("Could not restore the uploaded Studio image.", error);
      return false;
    }
  }

  async function importImageFromDialog(event) {
    event.preventDefault();
    const file = elements.imageFileInput.files?.[0];
    if (!file) {
      showToast(I18n.t("studio.choosePhotoFirst"));
      return;
    }

    try {
      const dimensions = await readImageDimensions(file);
      const repoPath = sanitizeRepositoryPath(elements.imageRepoPathInput.value || `images/views/${defaultImageViewId(file)}.${fileExtension(file)}`);
      const importMode = elements.imageImportMode.value;

      if (importMode === "replace") {
        pushHistorySnapshot();
        const session = attachLocalImageToView(workingViewData, file, repoPath, dimensions);
        await persistLocalImage(workingViewData.id, session);
        if (elements.imageAltInput.value.trim()) workingViewData.image.alt = elements.imageAltInput.value.trim();
        setDirty(true, "Local image loaded · save or export before publishing");
        clearOverlays();
        loadViewerImage();
        updateDocumentUI();
        closeImageImport();
        showToast(`Using ${file.name} for ${workingViewData.title || workingViewData.id}.`);
        return;
      }

      const viewId = slugify(elements.imageViewIdInput.value || defaultImageViewId(file));
      if ((currentCollectionManifest?.views || []).some((view) => view.id === viewId)) {
        throw new Error(`A view with id “${viewId}” already exists in this collection.`);
      }
      const title = elements.imageViewTitleInput.value.trim() || viewId;
      const buttonLabel = elements.imageButtonLabelInput.value.trim() || title;
      const dataPath = `data/views/${viewId}.json`;
      const raw = {
        schemaVersion: SUPPORTED_SCHEMA_VERSION,
        id: viewId,
        title,
        orientation: elements.imageOrientationInput.value || "other",
        status: "draft",
        image: {
          type: "image",
          src: repoPath,
          width: dimensions.width,
          height: dimensions.height,
          alt: elements.imageAltInput.value.trim() || title
        },
        labels: []
      };
      const session = attachLocalImageToView(raw, file, repoPath, dimensions);
      await persistLocalImage(viewId, session);

      const entry = {
        id: viewId,
        buttonLabel,
        dataPath,
        status: "draft",
        _studioLocal: true
      };
      currentCollectionManifest.views.push(entry);
      manifestDirty = true;
      saveCollectionDraft();
      viewSourceCache.set(dataPath, deepClone(raw));
      currentViewEntry = entry;
      sourceViewData = null;
      workingViewData = normalizeViewData(raw, entry);
      selectedLabelKey = null;
      undoStack.length = 0;
      redoStack.length = 0;
      exportedFingerprint = "";

      populateSelect(
        elements.viewSelect,
        currentCollectionManifest.views.map((view) => ({ value: view.id, label: `${view.buttonLabel}${view._studioLocal ? " · local" : ""}` })),
        viewId
      );
      setDirty(true, "New local view · not yet saved to repository");
      updateUndoRedoButtons();
      updateDocumentUI();
      loadViewerImage();
      closeImageImport();
      showToast(`${buttonLabel} created from ${file.name}. Add labels, then export or save to your project folder.`);
    } catch (error) {
      console.error(error);
      showToast(`Could not use this image: ${error.message}`, { duration: 5000 });
    }
  }

  async function importImageBatch(fileList) {
    const files = Array.from(fileList || []).filter((file) => /^image\/(?:jpeg|png|webp)$/i.test(file.type) || /\.(?:jpe?g|png|webp)$/i.test(file.name));
    if (!files.length) {
      showToast(I18n.t("studio.choosePhotos"));
      return;
    }
    if (!currentCollectionManifest || !currentCollection) {
      showToast(I18n.t("studio.selectCollectionBatch"));
      return;
    }
    if (dirty && !confirmContextChange()) return;

    const created = [];
    elements.batchImageButton.disabled = true;
    elements.batchImageButton.textContent = I18n.t("studio.readingImages");
    try {
      for (const file of files) {
        const dimensions = await readImageDimensions(file);
        const viewId = uniqueViewId(defaultImageViewId(file));
        const title = humanizeIdentifier(String(file.name).replace(/\.[^.]+$/, ""));
        const orientation = inferOrientationFromId(viewId);
        const repoPath = `images/views/${viewId}.${fileExtension(file)}`;
        const dataPath = `data/views/${viewId}.json`;
        const raw = {
          schemaVersion: SUPPORTED_SCHEMA_VERSION,
          id: viewId,
          title,
          orientation,
          status: "draft",
          image: {
            type: "image",
            src: repoPath,
            width: dimensions.width,
            height: dimensions.height,
            alt: title
          },
          labels: []
        };
        const session = attachLocalImageToView(raw, file, repoPath, dimensions);
        await persistLocalImage(viewId, session);
        const entry = {
          id: viewId,
          buttonLabel: title,
          dataPath,
          status: "draft",
          _studioLocal: true
        };
        currentCollectionManifest.views.push(entry);
        viewSourceCache.set(dataPath, deepClone(raw));
        saveDraftSnapshot(viewId, raw, entry, session);
        created.push(entry);
      }

      manifestDirty = true;
      saveCollectionDraft();
      populateSelect(
        elements.viewSelect,
        currentCollectionManifest.views.map((view) => ({
          value: view.id,
          label: `${view.buttonLabel}${view._studioLocal ? " · local" : ""}`
        })),
        created[0]?.id
      );
      if (created[0]) {
        await selectView(created[0].id, { skipGuard: true });
        setDirty(true, `${created.length} local view${created.length === 1 ? "" : "s"} created · publish each when ready`);
      }
      showToast(`${created.length} photograph${created.length === 1 ? "" : "s"} added to ${currentCollection.name}. Refine metadata and labels, then publish each view.`, { duration: 5000 });
    } catch (error) {
      console.error(error);
      showToast(`Batch import stopped: ${error.message}`, { duration: 5000 });
    } finally {
      elements.batchImageButton.disabled = false;
      elements.batchImageButton.textContent = I18n.t("studio.imageBatch");
      elements.batchImageInput.value = "";
    }
  }

  async function getDirectoryHandleForPath(rootHandle, path, { create = true } = {}) {
    const segments = sanitizeRepositoryPath(path).split("/");
    const fileName = segments.pop();
    let directory = rootHandle;
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment, { create });
    }
    return { directory, fileName };
  }

  async function getProjectFileHandle(rootHandle, path, { create = false } = {}) {
    const { directory, fileName } = await getDirectoryHandleForPath(rootHandle, path, { create });
    return directory.getFileHandle(fileName, { create });
  }

  async function projectPathExists(rootHandle, path) {
    try {
      await getProjectFileHandle(rootHandle, path, { create: false });
      return true;
    } catch (error) {
      if (error?.name === "NotFoundError") return false;
      return false;
    }
  }

  async function writeProjectFile(rootHandle, path, contents) {
    const handle = await getProjectFileHandle(rootHandle, path, { create: true });
    const writable = await handle.createWritable();
    await writable.write(contents);
    await writable.close();
  }

  async function readProjectFile(rootHandle, path) {
    try {
      const handle = await getProjectFileHandle(rootHandle, path, { create: false });
      return await handle.getFile();
    } catch (error) {
      if (error?.name === "NotFoundError") return null;
      throw error;
    }
  }

  async function verifyProjectRoot(rootHandle) {
    const required = ["index.html", "studio.html", "data/catalog.json"];
    const checks = await Promise.all(required.map(async (path) => ({ path, exists: await projectPathExists(rootHandle, path) })));
    const missing = checks.filter((check) => !check.exists).map((check) => check.path);
    if (missing.length) {
      throw new Error(`This does not look like the MORPHORA repository root. Missing: ${missing.join(", ")}.`);
    }
    return true;
  }

  async function connectProjectFolder() {
    if (typeof window.showDirectoryPicker !== "function") {
      showToast(I18n.t("studio.folderUnsupported"), { duration: 5000 });
      return null;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      await verifyProjectRoot(handle);
      projectRootHandle = handle;
      updateImageToolControls();
      showToast(`Connected to ${handle.name || "MORPHORA project"}.`);
      await runPublishPreflight();
      return handle;
    } catch (error) {
      if (error?.name === "AbortError") return null;
      console.error(error);
      projectRootHandle = null;
      updateImageToolControls();
      showToast(error.message, { duration: 5000 });
      return null;
    }
  }

  function sanitizeManifestForWrite(manifest, { includeLocalIds = [] } = {}) {
    const includeSet = new Set(includeLocalIds);
    const output = deepClone(manifest);
    output.views = (output.views || [])
      .filter((view) => !view._studioLocal || includeSet.has(view.id))
      .map((view) => cleanManifestEntry(view));
    output.schemaVersion = SUPPORTED_SCHEMA_VERSION;
    return Models?.migrate ? Models.migrate("collection", output) : output;
  }

  function safeTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, "-");
  }

  async function backupProjectFile(rootHandle, path, backupStamp) {
    const existing = await readProjectFile(rootHandle, path);
    if (!existing) return false;
    const backupPath = `.morphora-backups/${backupStamp}/${path}`;
    await writeProjectFile(rootHandle, backupPath, existing);
    return true;
  }

  function buildPublishPlan() {
    if (!workingViewData || !currentViewEntry) return [];
    const plan = [];
    const session = currentImageSession();
    if (session && !session.published) {
      plan.push({ kind: "Photograph", path: session.repoPath, contents: session.file });
    }
    plan.push({
      kind: "View JSON",
      path: currentViewEntry.dataPath || `data/views/${workingViewData.id}.json`,
      contents: `${JSON.stringify(buildExportData(), null, 2)}\n`
    });
    if (currentCollection?.manifestPath && currentCollectionManifest) {
      const manifest = sanitizeManifestForWrite(currentCollectionManifest, {
        includeLocalIds: [currentViewEntry.id]
      });
      plan.push({
        kind: "Collection manifest",
        path: currentCollection.manifestPath,
        contents: `${JSON.stringify(manifest, null, 2)}\n`
      });
    }
    return plan;
  }

  function renderPreflight(report) {
    lastPreflightReport = report;
    elements.pipelinePreflightList.replaceChildren();
    const failures = report.checks.filter((check) => check.level === "fail").length;
    const warnings = report.checks.filter((check) => check.level === "warn").length;
    elements.pipelinePreflightBadge.className = "validation-badge";
    if (failures) {
      elements.pipelinePreflightBadge.classList.add("is-invalid");
      elements.pipelinePreflightBadge.textContent = `${failures} blocker${failures === 1 ? "" : "s"}`;
    } else if (warnings) {
      elements.pipelinePreflightBadge.classList.add("is-review");
      elements.pipelinePreflightBadge.textContent = `${warnings} review`;
    } else {
      elements.pipelinePreflightBadge.classList.add("is-valid");
      elements.pipelinePreflightBadge.textContent = "Ready";
    }
    report.checks.forEach((check) => {
      const item = document.createElement("li");
      item.className = `pipeline-check is-${check.level}`;
      const symbol = check.level === "pass" ? "✓" : check.level === "warn" ? "!" : "×";
      item.textContent = `${symbol} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`;
      elements.pipelinePreflightList.appendChild(item);
    });
    return report;
  }

  async function runPublishPreflight({ rootHandle = projectRootHandle } = {}) {
    const checks = [];
    if (!workingViewData || !currentViewEntry) {
      return renderPreflight({ checks: [{ level: "fail", label: "View loaded", detail: I18n.t("studio.selectOrCreateView") }] });
    }

    const validation = validateAndRender();
    checks.push({
      level: validation.errors.length ? "fail" : "pass",
      label: "View data",
      detail: validation.errors.length ? `${validation.errors.length} validation error${validation.errors.length === 1 ? "" : "s"}` : `${workingViewData.labels.length} label${workingViewData.labels.length === 1 ? "" : "s"} validated`
    });
    if (validation.warnings.length) {
      checks.push({ level: "warn", label: "Editorial review", detail: `${validation.warnings.length} warning${validation.warnings.length === 1 ? "" : "s"}` });
    }

    const idMatches = workingViewData.id === currentViewEntry.id && LABEL_ID_PATTERN.test(workingViewData.id);
    checks.push({ level: idMatches ? "pass" : "fail", label: "Stable view ID", detail: workingViewData.id || "Missing ID" });

    try {
      sanitizeRepositoryPath(currentViewEntry.dataPath || "");
      sanitizeRepositoryPath(workingViewData.image?.src || "");
      checks.push({ level: "pass", label: "Repository paths", detail: `${currentViewEntry.dataPath} · ${workingViewData.image?.src}` });
    } catch (error) {
      checks.push({ level: "fail", label: "Repository paths", detail: error.message });
    }

    const duplicateId = (currentCollectionManifest?.views || []).filter((view) => view.id === currentViewEntry.id).length > 1;
    const duplicateDataPath = (currentCollectionManifest?.views || []).filter((view) => view.dataPath === currentViewEntry.dataPath).length > 1;
    checks.push({
      level: duplicateId || duplicateDataPath ? "fail" : "pass",
      label: "Collection registration",
      detail: duplicateId ? "Duplicate view ID in manifest" : duplicateDataPath ? "Duplicate view JSON path in manifest" : currentCollection?.name || "Registered"
    });

    const session = currentImageSession();
    if (session) {
      checks.push({ level: "pass", label: "Photograph", detail: `${session.file.name} · ${session.width}×${session.height}px${session.published ? " · already written" : " · staged for publish"}` });
    } else if (workingViewData.image?.src) {
      checks.push({ level: "pass", label: "Image source", detail: workingViewData.image.src });
    } else {
      checks.push({ level: "fail", label: "Photograph", detail: "No image source is configured." });
    }

    if (!rootHandle) {
      checks.push({ level: "warn", label: "Project folder", detail: "Connect the local GitHub repository to publish directly." });
    } else {
      try {
        await verifyProjectRoot(rootHandle);
        checks.push({ level: "pass", label: "Project folder", detail: rootHandle.name || "Verified MORPHORA repository" });
        if (currentViewEntry._studioLocal) {
          const viewTargetExists = await projectPathExists(rootHandle, currentViewEntry.dataPath);
          const imageTargetExists = session ? await projectPathExists(rootHandle, session.repoPath) : false;
          if (viewTargetExists || imageTargetExists) {
            checks.push({
              level: "fail",
              label: "New-view file collision",
              detail: `${viewTargetExists ? currentViewEntry.dataPath : ""}${viewTargetExists && imageTargetExists ? " · " : ""}${imageTargetExists ? session.repoPath : ""} already exists on disk`
            });
          } else {
            checks.push({ level: "pass", label: "New-view file collision", detail: "Target paths are available" });
          }
        }
        if (!session && inferImageType(workingViewData.image) !== "dzi") {
          const imageExists = await projectPathExists(rootHandle, workingViewData.image.src);
          checks.push({ level: imageExists ? "pass" : "fail", label: "Image file on disk", detail: imageExists ? workingViewData.image.src : `Missing ${workingViewData.image.src}` });
        }
        if (inferImageType(workingViewData.image) === "dzi") {
          const dziExists = await projectPathExists(rootHandle, workingViewData.image.src);
          checks.push({ level: dziExists ? "pass" : "fail", label: "Deep Zoom descriptor", detail: dziExists ? workingViewData.image.src : `Missing ${workingViewData.image.src}` });
        }
      } catch (error) {
        checks.push({ level: "fail", label: "Project folder", detail: error.message });
      }
    }

    return renderPreflight({ checks });
  }

  async function saveCurrentViewToProjectFolder() {
    if (!workingViewData || !currentViewEntry) {
      showToast(I18n.t("studio.selectOrCreateView"));
      return;
    }
    if (typeof window.showDirectoryPicker !== "function") {
      showToast(I18n.t("studio.folderWriteUnsupported"), { duration: 5000 });
      return;
    }
    if (!projectRootHandle) {
      const connected = await connectProjectFolder();
      if (!connected) return;
    }

    const report = await runPublishPreflight();
    const failures = report.checks.filter((check) => check.level === "fail");
    if (failures.length) {
      showToast(I18n.t("studio.publishBlocked"), { duration: 4000 });
      return;
    }

    const plan = buildPublishPlan();
    const summary = plan.map((item) => `• ${item.kind}: ${item.path}`).join("\n");
    if (!window.confirm(`Publish this view to the connected MORPHORA project?\n\n${summary}\n\nExisting files will be copied to .morphora-backups before replacement.`)) return;

    const backupStamp = safeTimestamp();
    try {
      elements.saveProjectFolderButton.disabled = true;
      elements.saveProjectFolderButton.textContent = I18n.t("studio.publishing");
      for (const item of plan) {
        await backupProjectFile(projectRootHandle, item.path, backupStamp);
        await writeProjectFile(projectRootHandle, item.path, item.contents);
      }

      exportedFingerprint = fingerprintView(workingViewData);
      dirty = false;
      currentViewEntry._studioLocal = false;
      manifestDirty = false;
      const publishedSource = normalizeViewData(buildExportData(), currentViewEntry);
      sourceViewData = deepClone(publishedSource);
      viewSourceCache.set(currentViewEntry.dataPath, deepClone(publishedSource));
      saveCollectionDraft();
      clearDraft();
      const publishedSession = currentImageSession();
      if (publishedSession) publishedSession.published = true;
      try { await Storage.deleteImage(workingViewData.id); } catch (error) {}
      setDocumentStatus("saved", I18n.t("studio.publishedLocal"));
      elements.draftStatusText.textContent = `Published ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      updateImageToolControls();
      await runPublishPreflight();
      showToast(`Published ${workingViewData.id}. GitHub Desktop can now commit and push the changes.`, { duration: 5000 });
    } catch (error) {
      console.error(error);
      showToast(`Publish failed: ${error.message}`, { duration: 6000 });
    } finally {
      elements.saveProjectFolderButton.textContent = I18n.t("studio.publishView");
      updateImageToolControls();
    }
  }

  function uniqueLabelId(base, excludeId = null) {
    const normalized = slugify(base);
    const ids = new Set(
      (workingViewData?.labels || [])
        .filter((label) => label.id !== excludeId)
        .map((label) => label.id)
    );

    if (!ids.has(normalized)) return normalized;

    let counter = 2;
    while (ids.has(`${normalized}-${counter}`)) counter += 1;
    return `${normalized}-${counter}`;
  }

  function createStudioKey() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `studio-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function defaultLabelPosition(position) {
    const direction = position.x < 0.5 ? -1 : 1;
    return {
      x: roundCoordinate(position.x + direction * 0.085),
      y: roundCoordinate(position.y - 0.035)
    };
  }

  function getEffectiveLabelPosition(label) {
    if (
      isPlainObject(label.labelPosition) &&
      Number.isFinite(Number(label.labelPosition.x)) &&
      Number.isFinite(Number(label.labelPosition.y))
    ) {
      return {
        x: clamp(label.labelPosition.x),
        y: clamp(label.labelPosition.y)
      };
    }
    return defaultLabelPosition(label.position);
  }

  function showToast(message, { duration = 2600 } = {}) {
    clearTimeout(toastTimer);
    elements.studioToast.textContent = message;
    elements.studioToast.hidden = false;
    toastTimer = window.setTimeout(() => {
      elements.studioToast.hidden = true;
    }, duration);
  }

  function setDocumentStatus(type, text) {
    elements.documentStatusDot.className = "status-dot";
    if (type) elements.documentStatusDot.classList.add(`is-${type}`);
    elements.documentStatusText.textContent = text;
  }

  function setDirty(value, message = null) {
    dirty = Boolean(value);
    if (dirty) {
      setDocumentStatus("dirty", message || I18n.t("studio.unsavedDraft"));
      scheduleDraftSave();
    } else {
      setDocumentStatus("saved", message || I18n.t("studio.sourceLoaded"));
    }
  }

  function showViewerState({ eyebrow, title, message, onRetry = null }) {
    retryAction = typeof onRetry === "function" ? onRetry : null;
    elements.viewerStateEyebrow.textContent = eyebrow;
    elements.viewerStateTitle.textContent = title;
    elements.viewerStateMessage.textContent = message;
    elements.retryStudioButton.hidden = !retryAction;
    elements.studioViewerState.hidden = false;
  }

  function hideViewerState() {
    retryAction = null;
    elements.studioViewerState.hidden = true;
  }

  async function fetchJson(path) {
    const response = await fetch(versionedPath(path), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} while loading ${path}`);
    }
    try {
      return await response.json();
    } catch (error) {
      throw new Error(`Invalid JSON in ${path}: ${error.message}`);
    }
  }

  function normalizeViewData(raw, entry = null) {
    const canonical = Models?.prepare
      ? Models.prepare("view", raw, { expectedId: entry?.id || null })
      : raw;
    if (!isPlainObject(canonical)) throw new Error("View JSON must contain an object.");

    const labels = (canonical.labels || []).map((label, index) => {
      const position = isPlainObject(label.position) ? label.position : label.anchor;
      if (!isPlainObject(position)) throw new Error(`Label ${index + 1} requires position coordinates.`);
      const normalized = Models?.normalizeLabel ? Models.normalizeLabel(label) : { ...label };
      normalized._studioKey = typeof label._studioKey === "string" ? label._studioKey : createStudioKey();
      normalized.position = {
        x: roundCoordinate(Number(position.x)),
        y: roundCoordinate(Number(position.y))
      };
      if (isPlainObject(label.labelPosition)) {
        normalized.labelPosition = {
          x: roundCoordinate(Number(label.labelPosition.x)),
          y: roundCoordinate(Number(label.labelPosition.y))
        };
      }
      return normalized;
    });

    return {
      ...canonical,
      labels
    };
  }

  async function getSpeciesData(entry) {
    if (speciesCache.has(entry.id)) return speciesCache.get(entry.id);
    if (!entry.dataPath) throw new Error(`Species “${entry.name}” has no dataPath.`);
    const raw = await fetchJson(entry.dataPath);
    const data = Models?.prepare ? Models.prepare("species", raw, { expectedId: entry.id }) : raw;
    speciesCache.set(entry.id, data);
    return data;
  }

  async function getCollectionManifest(collection, { force = false } = {}) {
    if (!collection.manifestPath) {
      throw new Error(`Collection “${collection.name}” has no manifestPath.`);
    }
    if (!force && collectionCache.has(collection.manifestPath)) {
      return collectionCache.get(collection.manifestPath);
    }
    const raw = await fetchJson(collection.manifestPath);
    const manifest = Models?.prepare ? Models.prepare("collection", raw, { path: collection.manifestPath }) : raw;
    if (!isPlainObject(manifest) || !Array.isArray(manifest.views)) {
      throw new Error(`Collection manifest “${collection.manifestPath}” is invalid.`);
    }
    collectionCache.set(collection.manifestPath, manifest);
    return manifest;
  }

  function availableSpeciesEntries() {
    return (catalog?.species || []).filter((entry) => entry.dataPath);
  }

  function collectionsWithManifests(system) {
    return (system?.collections || []).filter((collection) => collection.manifestPath);
  }

  function populateSelect(select, options, selectedValue = null) {
    select.replaceChildren();
    options.forEach(({ value, label, disabled = false }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.disabled = disabled;
      select.appendChild(option);
    });
    if (selectedValue && options.some((option) => option.value === selectedValue)) {
      select.value = selectedValue;
    } else if (options.length) {
      select.value = options[0].value;
    }
  }

  function readLastContext() {
    try {
      return AppStorage?.readJSON?.(LAST_CONTEXT_KEY, { fallback: null }) || null;
    } catch (error) {
      return null;
    }
  }

  function persistContext() {
    if (!currentSpeciesEntry || !currentSystem || !currentCollection || !currentViewEntry) return;
    try {
      AppStorage?.writeJSON?.(LAST_CONTEXT_KEY, {
        speciesId: currentSpeciesEntry.id,
        systemId: currentSystem.id,
        collectionId: currentCollection.id,
        viewId: currentViewEntry.id
      });
    } catch (error) {
      console.warn("Could not persist Studio context.", error);
    }
  }

  async function populateSpecies({ preferredId = null, preferredSystemId = null, preferredCollectionId = null, preferredViewId = null } = {}) {
    const entries = availableSpeciesEntries();
    if (!entries.length) throw new Error("No editable species are configured in catalog.json.");

    populateSelect(
      elements.speciesSelect,
      entries.map((entry) => ({ value: entry.id, label: `${entry.name} · ${entry.scientificName || ""}` })),
      preferredId || catalog.defaultSpeciesId
    );

    await selectSpecies(elements.speciesSelect.value, {
      preferredSystemId,
      preferredCollectionId,
      preferredViewId,
      skipGuard: true
    });
  }

  async function selectSpecies(speciesId, { preferredSystemId = null, preferredCollectionId = null, preferredViewId = null, skipGuard = false } = {}) {
    if (!skipGuard && !confirmContextChange()) {
      elements.speciesSelect.value = currentSpeciesEntry?.id || speciesId;
      return;
    }

    const entry = availableSpeciesEntries().find((item) => item.id === speciesId);
    if (!entry) throw new Error(`Species “${speciesId}” is not configured for editing.`);

    currentSpeciesEntry = entry;
    currentSpeciesData = await getSpeciesData(entry);

    const systems = (currentSpeciesData.systems || []).filter((system) => collectionsWithManifests(system).length > 0);
    if (!systems.length) throw new Error(`No editable collections are configured for ${entry.name}.`);

    populateSelect(
      elements.systemSelect,
      systems.map((system) => ({ value: system.id, label: system.name })),
      preferredSystemId
    );

    await selectSystem(elements.systemSelect.value, { preferredCollectionId, preferredViewId, skipGuard: true });
  }

  async function selectSystem(systemId, { preferredCollectionId = null, preferredViewId = null, skipGuard = false } = {}) {
    if (!skipGuard && !confirmContextChange()) {
      elements.systemSelect.value = currentSystem?.id || systemId;
      return;
    }

    const system = (currentSpeciesData?.systems || []).find((item) => item.id === systemId);
    if (!system) throw new Error(`System “${systemId}” is not configured.`);
    currentSystem = system;

    const collections = collectionsWithManifests(system);
    populateSelect(
      elements.collectionSelect,
      collections.map((collection) => ({
        value: collection.id,
        label: `${collection.name}${collection.status === "coming-soon" ? " · framework" : ""}`
      })),
      preferredCollectionId
    );

    await selectCollection(elements.collectionSelect.value, { preferredViewId, skipGuard: true });
  }

  async function selectCollection(collectionId, { preferredViewId = null, skipGuard = false } = {}) {
    if (!skipGuard && !confirmContextChange()) {
      elements.collectionSelect.value = currentCollection?.id || collectionId;
      return;
    }

    const collection = collectionsWithManifests(currentSystem).find((item) => item.id === collectionId);
    if (!collection) throw new Error(`Collection “${collectionId}” is not configured.`);

    currentCollection = collection;
    showViewerState({
      eyebrow: "Collection data",
      title: `Loading ${collection.name}`,
      message: "Reading the collection manifest and available anatomical views."
    });

    currentCollectionManifest = mergeCollectionDraft(deepClone(await getCollectionManifest(collection)));
    manifestDirty = false;
    const views = currentCollectionManifest.views || [];
    if (!views.length) throw new Error(`Collection “${collection.name}” does not contain any views.`);

    populateSelect(
      elements.viewSelect,
      views.map((view) => ({ value: view.id, label: view.buttonLabel })),
      preferredViewId || currentCollectionManifest.defaultViewId
    );

    await selectView(elements.viewSelect.value, { skipGuard: true });
  }

  function confirmContextChange() {
    if (!dirty) return true;
    return window.confirm(
      "This view has changes that have not been exported. A local draft exists, but the repository JSON has not been replaced. Continue to another view?"
    );
  }

  async function selectView(viewId, { skipGuard = false, force = false } = {}) {
    if (!skipGuard && !confirmContextChange()) {
      elements.viewSelect.value = currentViewEntry?.id || viewId;
      return;
    }

    const entry = (currentCollectionManifest?.views || []).find((item) => item.id === viewId);
    if (!entry) throw new Error(`View “${viewId}” is not registered in this collection.`);

    currentViewEntry = entry;
    persistContext();
    showViewerState({
      eyebrow: "View data",
      title: `Loading ${entry.buttonLabel}`,
      message: "Loading the anatomical image and existing labels."
    });

    try {
      let raw = force ? null : viewSourceCache.get(entry.dataPath);
      const draftEnvelope = readDraftEnvelope(entry.id);
      if (!raw && entry._studioLocal && draftEnvelope?.viewData) {
        raw = draftEnvelope.viewData;
        viewSourceCache.set(entry.dataPath, deepClone(raw));
      }
      if (!raw) {
        raw = await fetchJson(entry.dataPath);
        viewSourceCache.set(entry.dataPath, deepClone(raw));
      }

      const normalizedSource = normalizeViewData(raw, entry);
      sourceViewData = entry._studioLocal ? null : normalizedSource;
      workingViewData = deepClone(normalizedSource);
      selectedLabelKey = null;
      undoStack.length = 0;
      redoStack.length = 0;
      exportedFingerprint = fingerprintView(workingViewData);
      setDirty(false, "Repository data loaded");

      const draft = readDraftEnvelope(entry.id);
      if (draft?.manifestEntry) {
        Object.assign(currentViewEntry, draft.manifestEntry);
      }
      if (draft?.viewData && (entry._studioLocal || window.confirm(`A local draft exists for ${entry.buttonLabel}. Restore it?`))) {
        workingViewData = normalizeViewData(draft.viewData, entry);
        lastDraftSavedAt = draft.savedAt ? new Date(draft.savedAt) : null;
        if (lastDraftSavedAt && !Number.isNaN(lastDraftSavedAt.getTime())) {
          elements.draftStatusText.textContent = `Recovered ${lastDraftSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        }
        setDirty(true, entry._studioLocal ? "Recovered local view draft · not yet published" : "Local draft restored · not yet published");
      } else if (entry._studioLocal) {
        setDirty(true, "Local view · not yet published");
      }

      await restorePersistedLocalImage(entry.id, workingViewData);
      updateUndoRedoButtons();
      updateDocumentUI();
      loadViewerImage();
    } catch (error) {
      console.error(error);
      setDocumentStatus("error", I18n.t("studio.viewDataLoadError"));
      showViewerState({
        eyebrow: "View unavailable",
        title: `Could not load ${entry.buttonLabel}`,
        message: error.message,
        onRetry: () => selectView(entry.id, { skipGuard: true, force: true })
      });
    }
  }

  function initializeViewer() {
    if (typeof OpenSeadragon === "undefined") {
      throw new Error("OpenSeadragon did not load. Check the network connection and CDN script.");
    }

    const viewerPerformanceOptions = Perf.getViewerOptions();
    viewer = OpenSeadragon({
      id: "studioViewer",
      prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
      showNavigationControl: false,
      showNavigator: true,
      navigatorPosition: "BOTTOM_LEFT",
      immediateRender: viewerPerformanceOptions.immediateRender,
      imageLoaderLimit: viewerPerformanceOptions.imageLoaderLimit,
      maxImageCacheCount: viewerPerformanceOptions.maxImageCacheCount,
      minPixelRatio: viewerPerformanceOptions.minPixelRatio,
      tileRetryMax: viewerPerformanceOptions.tileRetryMax,
      tileRetryDelay: viewerPerformanceOptions.tileRetryDelay,
      gestureSettingsMouse: { clickToZoom: false },
      gestureSettingsTouch: { clickToZoom: false }
    });
    Perf.mark("studio-viewer-created", {
      profile: Perf.profile?.id || "balanced",
      options: viewerPerformanceOptions
    });

    viewer.addHandler("open", (event) => {
      const expectedSource = activeImageLoad?.sourcePath || workingViewData?.image?.src;
      if (!sourceMatchesImage(event.source, expectedSource)) return;

      renderAllOverlays();
      viewer.viewport.goHome(true);
      if (activeImageLoad) {
        activeImageLoad.tiledImage = viewer.world?.getItemAt?.(0) || null;
        activeImageLoad.openConfirmed = true;
      }

      if (workingViewData) {
        const mode = activeImageLoad?.useFallback
          ? "fallback"
          : workingViewData.image.type;
        Perf.mark(`studio:${workingViewData.id}:image-ready`, { mode });
        Perf.measure(
          `Studio image open ${workingViewData.id}`,
          `studio:${workingViewData.id}:image-start`,
          `studio:${workingViewData.id}:image-ready`
        );
        elements.studioViewer.dataset.imageMode = mode;
        if (mode !== "dzi") {
          clearViewerPreview();
        }
        if (activeImageLoad?.useFallback) {
          A11y.announce("Deep Zoom was unavailable in Studio. The standard fallback image is active.");
        }
      }
    });

    viewer.addHandler("tile-loaded", (event) => {
      if (
        !workingViewData ||
        !activeImageLoad ||
        !activeImageLoad.openConfirmed ||
        activeImageLoad.firstTileMarked
      ) return;
      if (
        event?.tiledImage &&
        activeImageLoad.tiledImage &&
        event.tiledImage !== activeImageLoad.tiledImage
      ) {
        return;
      }

      activeImageLoad.firstTileMarked = true;
      Perf.mark(`studio:${workingViewData.id}:first-tile-ready`);
      Perf.measure(
        `Studio first tile ${workingViewData.id}`,
        `studio:${workingViewData.id}:image-start`,
        `studio:${workingViewData.id}:first-tile-ready`
      );

      const completedViewId = workingViewData.id;
      const completedLoad = activeImageLoad;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (
            !workingViewData ||
            workingViewData.id !== completedViewId ||
            activeImageLoad !== completedLoad
          ) {
            return;
          }
          clearViewerPreview();
          hideViewerState();
        });
      });
    });

    viewer.addHandler("open-failed", (event) => {
      const expectedSource = activeImageLoad?.sourcePath || workingViewData?.image?.src;
      if (event.source && !sourceMatchesImage(event.source, expectedSource)) return;

      if (
        workingViewData?.image?.fallback &&
        activeImageLoad &&
        !activeImageLoad.fallbackAttempted
      ) {
        activeImageLoad.fallbackAttempted = true;
        openStudioImage({ useFallback: true });
        return;
      }

      clearViewerPreview();
      const message = event.message || `Could not open ${expectedSource || "the image"}.`;
      showViewerState({
        eyebrow: "Image unavailable",
        title: "The anatomical photograph could not be loaded",
        message,
        onRetry: loadViewerImage
      });
    });

    viewer.addHandler("animation", updateAllOverlayGeometry);
    viewer.addHandler("resize", updateAllOverlayGeometry);
    viewer.addHandler("canvas-click", handleCanvasClick);
    viewer.addHandler("canvas-hover", (event) => {
      if (!event.position || !viewer.viewport) return;
      const point = viewer.viewport.pointFromPixel(event.position);
      elements.coordinateReadout.textContent = `Pointer: ${point.x.toFixed(4)}, ${point.y.toFixed(4)}`;
    });
  }

  function openStudioImage({ useFallback = false } = {}) {
    if (!workingViewData?.image?.src) return;
    const sourcePath = getImageSourcePath(workingViewData.image, useFallback);
    if (!sourcePath) return;

    if (!activeImageLoad || activeImageLoad.viewId !== workingViewData.id) {
      activeImageLoad = {
        viewId: workingViewData.id,
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

    if (!useFallback && workingViewData.image.type === "dzi") {
      setViewerPreview(workingViewData.image);
    } else {
      clearViewerPreview();
    }

    showViewerState({
      eyebrow: useFallback
        ? "Compatible image"
        : workingViewData.image.type === "dzi"
          ? "Deep Zoom workspace"
          : "High-resolution image",
      title: `Preparing ${workingViewData.title || currentViewEntry.buttonLabel}`,
      message: useFallback
        ? "The tiled source was unavailable. MORPHORA Studio is opening the standard fallback."
        : workingViewData.image.type === "dzi"
          ? "Loading the tiled image pyramid. Existing normalized coordinates remain unchanged."
          : sourcePath
    });

    Perf.mark(`studio:${workingViewData.id}:image-start`, {
      source: sourcePath,
      mode: useFallback ? "fallback" : workingViewData.image.type
    });
    viewer.open(createOpenSeadragonSource(workingViewData.image, useFallback));
  }

  function loadViewerImage() {
    if (!workingViewData?.image?.src) return;
    clearOverlays();
    activeImageLoad = null;
    openStudioImage();
  }

  function clearOverlays() {
    activeDragCleanup?.();
    activeDragCleanup = null;
    for (const overlay of overlayByLabelKey.values()) {
      viewer?.removeOverlay(overlay.element);
    }
    overlayByLabelKey.clear();
  }

  function getEditableTranslation(label, field, locale = studioContentLanguage) {
    const exact = label?.translations?.[locale]?.[field];
    if (exact !== undefined && exact !== null) return exact;
    if (locale === (I18n.sourceLocale || "es")) return label?.[field] ?? "";
    return field === "aliases" ? [] : "";
  }

  function getStudioLabelName(label, locale = studioContentLanguage) {
    return I18n.localize(label, "name", { locale }) || label?.name || label?.id || "Untitled label";
  }

  function ensureTranslation(label, locale = studioContentLanguage) {
    if (!label.translations || typeof label.translations !== "object") label.translations = {};
    if (!label.translations[locale] || typeof label.translations[locale] !== "object") label.translations[locale] = {};
    return label.translations[locale];
  }

  function renderTranslationStatus(label) {
    if (!elements.labelTranslationStatus) return;
    elements.labelTranslationStatus.replaceChildren();
    for (const locale of I18n.supportedLocales || ["es", "en"]) {
      const translation = label?.translations?.[locale] || {};
      const sourceFallback = locale === (I18n.sourceLocale || "es");
      const hasName = Boolean(String((translation.name ?? (sourceFallback ? label?.name : "")) || "").trim());
      const hasDescription = Boolean(String((translation.description ?? (sourceFallback ? label?.description : "")) || "").trim());
      const chip = document.createElement("span");
      chip.className = `translation-status-chip ${hasName && hasDescription ? "is-complete" : "is-missing"}`;
      chip.textContent = `${locale.toUpperCase()} · ${hasName && hasDescription ? I18n.t("studio.complete") : I18n.t("studio.missingFields")}`;
      elements.labelTranslationStatus.appendChild(chip);
    }
  }

  function refreshLocalizedStudioOverlays() {
    if (!workingViewData) return;
    for (const label of workingViewData.labels || []) {
      const overlay = overlayByLabelKey.get(label._studioKey);
      if (!overlay) continue;
      const displayName = getStudioLabelName(label);
      overlay.box.textContent = displayName;
      overlay.box.setAttribute("aria-label", `Select and move ${displayName}`);
      overlay.anchor.setAttribute("aria-label", `Move anchor for ${displayName}`);
    }
    updateAllOverlayGeometry();
  }

  function createOverlay(label) {
    const labelKey = label._studioKey;
    const element = document.createElement("div");
    element.className = "studio-label-overlay";
    element.dataset.labelKey = labelKey;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("studio-connector-svg");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.classList.add("studio-connector-line");
    svg.appendChild(line);

    const anchor = document.createElement("button");
    anchor.type = "button";
    anchor.className = "studio-anchor-handle";
    anchor.setAttribute("aria-label", `Move anchor for ${getStudioLabelName(label)}`);

    const box = document.createElement("button");
    box.type = "button";
    box.className = "studio-label-box";
    box.textContent = getStudioLabelName(label);
    box.setAttribute("aria-label", `Select and move ${getStudioLabelName(label)}`);

    element.append(svg, anchor, box);

    [element, anchor, box].forEach((target) => {
      ["pointerdown", "pointerup", "click", "dblclick"].forEach((eventName) => {
        target.addEventListener(eventName, (event) => event.stopPropagation());
      });
    });

    element.addEventListener("click", () => selectLabel(labelKey));
    box.addEventListener("click", () => selectLabel(labelKey));
    anchor.addEventListener("click", () => selectLabel(labelKey));

    anchor.addEventListener("pointerdown", (event) => beginOverlayDrag(event, labelKey, "anchor"));
    box.addEventListener("pointerdown", (event) => beginOverlayDrag(event, labelKey, "label"));

    viewer.addOverlay({
      element,
      location: new OpenSeadragon.Point(label.position.x, label.position.y),
      placement: OpenSeadragon.Placement.CENTER
    });

    const overlay = { element, svg, line, anchor, box };
    overlayByLabelKey.set(labelKey, overlay);
    updateOverlayGeometry(labelKey);
    return overlay;
  }

  function renderAllOverlays() {
    clearOverlays();
    if (!workingViewData) return;
    workingViewData.labels.forEach(createOverlay);
    syncOverlaySelection();
    updateAllOverlayGeometry();
  }

  function updateOverlayGeometry(labelKey) {
    const label = getLabel(labelKey);
    const overlay = overlayByLabelKey.get(labelKey);
    if (!label || !overlay || !viewer?.viewport || !overlay.element.isConnected) return;

    const anchorPoint = new OpenSeadragon.Point(label.position.x, label.position.y);
    const targetPosition = getEffectiveLabelPosition(label);
    const labelPoint = new OpenSeadragon.Point(targetPosition.x, targetPosition.y);
    const anchorPixel = viewer.viewport.pixelFromPoint(anchorPoint, true);
    const labelPixel = viewer.viewport.pixelFromPoint(labelPoint, true);
    const dx = labelPixel.x - anchorPixel.x;
    const dy = labelPixel.y - anchorPixel.y;

    overlay.box.style.left = `${dx}px`;
    overlay.box.style.top = `${dy}px`;
    overlay.box.textContent = getStudioLabelName(label);

    const padding = 10;
    const minX = Math.min(0, dx) - padding;
    const minY = Math.min(0, dy) - padding;
    const maxX = Math.max(0, dx) + padding;
    const maxY = Math.max(0, dy) + padding;

    overlay.svg.style.left = `${minX}px`;
    overlay.svg.style.top = `${minY}px`;
    overlay.svg.setAttribute("width", String(Math.max(1, maxX - minX)));
    overlay.svg.setAttribute("height", String(Math.max(1, maxY - minY)));
    overlay.line.setAttribute("x1", String(-minX));
    overlay.line.setAttribute("y1", String(-minY));
    overlay.line.setAttribute("x2", String(dx - minX));
    overlay.line.setAttribute("y2", String(dy - minY));
  }

  function updateAllOverlayGeometry() {
    overlayByLabelKey.forEach((_, labelKey) => updateOverlayGeometry(labelKey));
  }

  function syncOverlaySelection() {
    overlayByLabelKey.forEach((overlay, labelKey) => {
      overlay.element.classList.toggle("selected", labelKey === selectedLabelKey);
    });
  }

  function pointerToViewportPoint(event) {
    const rect = elements.studioViewer.getBoundingClientRect();
    const pixel = new OpenSeadragon.Point(event.clientX - rect.left, event.clientY - rect.top);
    const point = viewer.viewport.pointFromPixel(pixel);
    return { x: roundCoordinate(point.x), y: roundCoordinate(point.y) };
  }

  function beginOverlayDrag(event, labelKey, target) {
    if (["preview", "reposition", "reposition-label"].includes(mode)) return;
    event.preventDefault();
    event.stopPropagation();
    selectLabel(labelKey);

    const label = getLabel(labelKey);
    if (!label) return;

    const startAnchor = deepClone(label.position);
    const startLabel = deepClone(getEffectiveLabelPosition(label));
    const startPointer = pointerToViewportPoint(event);
    const startClient = { x: event.clientX, y: event.clientY };
    let moved = false;
    let historyCaptured = false;

    viewer.setMouseNavEnabled(false);
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const move = (moveEvent) => {
      const travel = Math.hypot(moveEvent.clientX - startClient.x, moveEvent.clientY - startClient.y);
      if (!moved && travel < 3) return;
      moved = true;
      if (!historyCaptured) {
        pushHistorySnapshot();
        historyCaptured = true;
      }

      const point = pointerToViewportPoint(moveEvent);
      if (target === "anchor") {
        const deltaX = point.x - startPointer.x;
        const deltaY = point.y - startPointer.y;
        label.position = {
          x: roundCoordinate(startAnchor.x + deltaX),
          y: roundCoordinate(startAnchor.y + deltaY)
        };
        label.labelPosition = {
          x: roundCoordinate(startLabel.x + deltaX),
          y: roundCoordinate(startLabel.y + deltaY)
        };
        viewer.updateOverlay(
          overlayByLabelKey.get(labelKey).element,
          new OpenSeadragon.Point(label.position.x, label.position.y),
          OpenSeadragon.Placement.CENTER
        );
      } else {
        label.labelPosition = point;
      }

      setDirty(true);
      updateOverlayGeometry(labelKey);
      updateInspectorCoordinates();
    };

    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      viewer.setMouseNavEnabled(true);
      activeDragCleanup = null;
      if (moved) {
        updateOverlayGeometry(labelKey);
        updateInspectorCoordinates();
        updateLabelList();
        validateAndRender();
        updateUndoRedoButtons();
        const coordinates = target === "anchor" ? label.position : getEffectiveLabelPosition(label);
        showToast(`${target === "anchor" ? "Anchor" : "Label"} set to ${coordinates.x.toFixed(4)}, ${coordinates.y.toFixed(4)}.`);
      }
    };

    activeDragCleanup = end;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
    window.addEventListener("pointercancel", end, { once: true });
  }

  function handleCanvasClick(event) {
    if (!workingViewData || !event.position) return;

    const originalTarget = event.originalEvent?.target;
    if (originalTarget instanceof Element && originalTarget.closest(".studio-label-overlay")) return;

    const modifierAnchor = mode === "browse" && selectedLabelKey && Boolean(event.originalEvent?.shiftKey);
    const modifierLabel = mode === "browse" && selectedLabelKey && Boolean(event.originalEvent?.altKey);
    const actionable = ["add", "reposition", "reposition-label"].includes(mode) || modifierAnchor || modifierLabel;
    if (!actionable) return;

    event.preventDefaultAction = true;
    const point = viewer.viewport.pointFromPixel(event.position);
    const normalizedPoint = { x: roundCoordinate(point.x), y: roundCoordinate(point.y) };

    if (mode === "add") {
      addLabelAt(normalizedPoint);
      return;
    }

    if (mode === "reposition-label" || modifierLabel) {
      repositionSelectedLabelAt(normalizedPoint);
      return;
    }

    repositionSelectedAnchorAt(normalizedPoint);
  }

  function repositionSelectedAnchorAt(position) {
    const label = getLabel();
    if (!label) {
      setMode("browse");
      showToast(I18n.t("studio.selectLabelAnchor"));
      return;
    }

    pushHistorySnapshot();

    const previousAnchor = deepClone(label.position);
    const previousLabelPosition = deepClone(getEffectiveLabelPosition(label));
    const offset = {
      x: previousLabelPosition.x - previousAnchor.x,
      y: previousLabelPosition.y - previousAnchor.y
    };

    label.position = {
      x: roundCoordinate(position.x),
      y: roundCoordinate(position.y)
    };
    label.labelPosition = {
      x: roundCoordinate(label.position.x + offset.x),
      y: roundCoordinate(label.position.y + offset.y)
    };

    const overlay = overlayByLabelKey.get(label._studioKey);
    if (overlay) {
      viewer.updateOverlay(
        overlay.element,
        new OpenSeadragon.Point(label.position.x, label.position.y),
        OpenSeadragon.Placement.CENTER
      );
      updateOverlayGeometry(label._studioKey);
    }

    setDirty(true);
    updateInspectorCoordinates();
    updateLabelList();
    validateAndRender();
    setMode("browse");
    showToast(`Anchor placed at ${label.position.x.toFixed(4)}, ${label.position.y.toFixed(4)} for ${label.name || label.id || "the selected label"}.`);
  }

  function repositionSelectedLabelAt(position) {
    const label = getLabel();
    if (!label) {
      setMode("browse");
      showToast(I18n.t("studio.selectLabelText"));
      return;
    }

    pushHistorySnapshot();
    label.labelPosition = {
      x: roundCoordinate(position.x),
      y: roundCoordinate(position.y)
    };
    updateOverlayGeometry(label._studioKey);
    setDirty(true);
    updateInspectorCoordinates();
    updateLabelList();
    validateAndRender();
    setMode("browse");
    showToast(`Label placed at ${label.labelPosition.x.toFixed(4)}, ${label.labelPosition.y.toFixed(4)} for ${label.name || label.id || "the selected label"}.`);
  }

  function addLabelAt(position = null) {
    if (!workingViewData) return;
    const anchor = position || { x: 0.5, y: 0.5 };
    pushHistorySnapshot();

    const nextNumber = workingViewData.labels.length + 1;
    const label = {
      _studioKey: createStudioKey(),
      id: uniqueLabelId(`new-label-${nextNumber}`),
      name: "New anatomical label",
      description: "",
      translations: {
        es: { name: studioContentLanguage === "es" ? "Nueva estructura anatómica" : "", description: "", aliases: [] },
        en: { name: studioContentLanguage === "en" ? "New anatomical label" : "", description: "", aliases: [] }
      },
      position: { x: roundCoordinate(anchor.x), y: roundCoordinate(anchor.y) },
      labelPosition: defaultLabelPosition(anchor),
      category: "",
      status: "draft",
      quizEligible: true,
      difficulty: "intermediate",
      acceptedRadius: 0.045
    };

    workingViewData.labels.push(label);
    createOverlay(label);
    selectLabel(label._studioKey);
    setMode("browse");
    setDirty(true);
    updateDocumentUI();
    elements.labelNameInput.focus();
    elements.labelNameInput.select();
  }

  function getLabel(labelKey = selectedLabelKey) {
    return workingViewData?.labels.find((label) => label._studioKey === labelKey) || null;
  }

  function selectLabel(labelKey) {
    selectedLabelKey = getLabel(labelKey) ? labelKey : null;
    syncOverlaySelection();
    updateLabelList();
    updateInspector();
    updateRepositionControls();
    if (["reposition", "reposition-label"].includes(mode) && selectedLabelKey) {
      setMode(mode);
    }
  }

  function updateRepositionControls() {
    const hasSelection = Boolean(getLabel());
    elements.repositionModeButton.disabled = !hasSelection;
    elements.repositionLabelModeButton.disabled = !hasSelection;
    elements.repositionAnchorButton.disabled = !hasSelection;
    elements.repositionLabelButton.disabled = !hasSelection;

    if (!hasSelection && ["reposition", "reposition-label"].includes(mode)) {
      setMode("browse");
    }
  }

  function updateLabelList() {
    const labels = workingViewData?.labels || [];
    const query = elements.labelFilterInput.value.trim().toLowerCase();
    const filtered = labels.filter((label) => {
      if (!query) return true;
      const localizedTerms = (I18n.supportedLocales || ["es", "en"]).flatMap((locale) => [I18n.localize(label, "name", { locale }), ...I18n.localizeArray(label, "aliases", { locale })]);
      return [getStudioLabelName(label), ...localizedTerms, label.id, label.category, label.status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    elements.labelCount.textContent = String(labels.length);
    elements.labelList.replaceChildren();

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "label-list-empty";
      empty.textContent = labels.length ? I18n.t("studio.noFilterMatches") : I18n.t("studio.noLabels");
      elements.labelList.appendChild(empty);
      return;
    }

    filtered.forEach((label) => {
      const index = labels.indexOf(label);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "label-list-button";
      button.classList.toggle("active", label._studioKey === selectedLabelKey);
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(label._studioKey === selectedLabelKey));

      const order = document.createElement("span");
      order.className = "label-order";
      order.textContent = String(index + 1);

      const name = document.createElement("span");
      name.className = "label-list-name";
      name.textContent = getStudioLabelName(label);

      const status = document.createElement("span");
      status.className = "label-list-status";
      status.textContent = label.status || I18n.t("studio.draft");

      button.append(order, name, status);
      button.addEventListener("click", () => selectLabel(label._studioKey));
      elements.labelList.appendChild(button);
    });
  }

  function updateInspector() {
    const label = getLabel();
    const labels = workingViewData?.labels || [];

    if (!label) {
      elements.emptyInspector.hidden = false;
      elements.labelForm.hidden = true;
      elements.inspectorTitle.textContent = I18n.t("studio.noLabel");
      elements.selectionIndex.textContent = "—";
      elements.coordinateReadout.textContent = I18n.t("studio.anchorEmpty");
      return;
    }

    const index = labels.findIndex((item) => item._studioKey === label._studioKey);
    const labelPosition = getEffectiveLabelPosition(label);

    elements.emptyInspector.hidden = true;
    elements.labelForm.hidden = false;
    const displayName = getStudioLabelName(label);
    elements.inspectorTitle.textContent = displayName;
    elements.selectionIndex.textContent = `${index + 1}/${labels.length}`;
    elements.labelLanguageInput.value = studioContentLanguage;
    elements.labelNameInput.value = getEditableTranslation(label, "name") || "";
    elements.labelIdInput.value = label.id || "";
    elements.labelDescriptionInput.value = getEditableTranslation(label, "description") || "";
    elements.labelAliasesInput.value = getEditableTranslation(label, "aliases").join(", ");
    const fallbackName = I18n.localize(label, "name", { locale: studioContentLanguage }) || label.name || "";
    elements.labelNameInput.placeholder = elements.labelNameInput.value ? "" : (fallbackName ? `Fallback: ${fallbackName}` : "Add localized structure name");
    renderTranslationStatus(label);
    elements.labelCategoryInput.value = label.category || "";
    elements.labelStatusInput.value = label.status || I18n.t("studio.draft");
    elements.labelQuizEligibleInput.checked = label.quizEligible !== false;
    elements.labelDifficultyInput.value = ["beginner", "intermediate", "advanced"].includes(label.difficulty)
      ? label.difficulty
      : "intermediate";
    elements.labelAcceptedRadiusInput.value = Number.isFinite(Number(label.acceptedRadius))
      ? Number(label.acceptedRadius).toFixed(3)
      : "0.045";
    elements.anchorXInput.value = label.position.x.toFixed(4);
    elements.anchorYInput.value = label.position.y.toFixed(4);
    elements.labelXInput.value = labelPosition.x.toFixed(4);
    elements.labelYInput.value = labelPosition.y.toFixed(4);
    elements.coordinateReadout.textContent = `Anchor: ${label.position.x.toFixed(4)}, ${label.position.y.toFixed(4)} · Label: ${labelPosition.x.toFixed(4)}, ${labelPosition.y.toFixed(4)}`;
  }

  function updateInspectorCoordinates() {
    const label = getLabel();
    if (!label) return;
    const labelPosition = getEffectiveLabelPosition(label);
    elements.anchorXInput.value = label.position.x.toFixed(4);
    elements.anchorYInput.value = label.position.y.toFixed(4);
    elements.labelXInput.value = labelPosition.x.toFixed(4);
    elements.labelYInput.value = labelPosition.y.toFixed(4);
    elements.coordinateReadout.textContent = `Anchor: ${label.position.x.toFixed(4)}, ${label.position.y.toFixed(4)} · Label: ${labelPosition.x.toFixed(4)}, ${labelPosition.y.toFixed(4)}`;
  }

  function updateViewMetadataFields() {
    const hasView = Boolean(workingViewData && currentViewEntry);
    [
      elements.viewTitleInput,
      elements.viewButtonLabelInput,
      elements.viewOrientationInput,
      elements.viewImagePathInput,
      elements.viewAltInput
    ].forEach((field) => { field.disabled = !hasView; });
    if (!hasView) {
      elements.viewTitleInput.value = "";
      elements.viewButtonLabelInput.value = "";
      elements.viewIdReadonly.value = "";
      elements.viewOrientationInput.value = "other";
      elements.viewDataPathInput.value = "";
      elements.viewImagePathInput.value = "";
      elements.viewAltInput.value = "";
      return;
    }
    elements.viewTitleInput.value = workingViewData.title || "";
    elements.viewButtonLabelInput.value = currentViewEntry.buttonLabel || workingViewData.title || "";
    elements.viewIdReadonly.value = workingViewData.id || currentViewEntry.id || "";
    elements.viewOrientationInput.value = workingViewData.orientation || "other";
    elements.viewDataPathInput.value = currentViewEntry.dataPath || `data/views/${workingViewData.id}.json`;
    elements.viewImagePathInput.value = workingViewData.image?.src || "";
    elements.viewAltInput.value = workingViewData.image?.alt || "";
  }

  function updateViewMetadataFromForm() {
    if (!workingViewData || !currentViewEntry) return;
    const previousButtonLabel = currentViewEntry.buttonLabel;
    const previousImagePath = workingViewData.image?.src || "";
    workingViewData.title = elements.viewTitleInput.value.trim() || workingViewData.id;
    currentViewEntry.buttonLabel = elements.viewButtonLabelInput.value.trim() || workingViewData.title;
    workingViewData.orientation = elements.viewOrientationInput.value || "other";
    const imagePath = elements.viewImagePathInput.value.trim();
    if (imagePath) {
      try {
        workingViewData.image.src = sanitizeRepositoryPath(imagePath);
        const session = currentImageSession();
        if (session) session.repoPath = workingViewData.image.src;
      } catch (error) {
        showToast(`Image path not changed: ${error.message}`, { duration: 4000 });
        updateViewMetadataFields();
        return;
      }
    }
    workingViewData.image.alt = elements.viewAltInput.value.trim() || workingViewData.title;
    if (previousButtonLabel !== currentViewEntry.buttonLabel) manifestDirty = true;
    if (currentViewEntry._studioLocal) saveCollectionDraft();
    const option = Array.from(elements.viewSelect.options).find((item) => item.value === currentViewEntry.id);
    if (option) option.textContent = `${currentViewEntry.buttonLabel}${currentViewEntry._studioLocal ? " · local" : ""}`;
    setDirty(true, "View metadata changed · autosaved locally");
    updateDocumentUI();
  }

  function updateDocumentUI() {
    elements.activeViewTitle.textContent = workingViewData?.title || currentViewEntry?.buttonLabel || I18n.t("studio.noView");
    elements.imagePathText.textContent = workingViewData?.image?.src
      ? `${workingViewData.image._studioRuntimeSrc ? "LOCAL · " : ""}${String(workingViewData.image.type || inferImageType(workingViewData.image)).toUpperCase()} · ${workingViewData.image.src}`
      : "—";
    elements.resetSourceButton.disabled = !sourceViewData;
    updateLabelList();
    updateInspector();
    updateRepositionControls();
    updateImageToolControls();
    updateViewMetadataFields();
    validateAndRender();
    runPublishPreflight().catch((error) => console.warn("Preflight refresh failed.", error));
  }

  function pushHistorySnapshot() {
    if (!workingViewData) return;
    undoStack.push({ data: deepClone(workingViewData), selectedLabelKey });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    updateUndoRedoButtons();
  }

  function restoreSnapshot(snapshot) {
    workingViewData = deepClone(snapshot.data);
    selectedLabelKey = snapshot.selectedLabelKey;
    renderAllOverlays();
    updateDocumentUI();
    setDirty(true);
  }

  function undo() {
    if (!undoStack.length || !workingViewData) return;
    redoStack.push({ data: deepClone(workingViewData), selectedLabelKey });
    restoreSnapshot(undoStack.pop());
    updateUndoRedoButtons();
  }

  function redo() {
    if (!redoStack.length || !workingViewData) return;
    undoStack.push({ data: deepClone(workingViewData), selectedLabelKey });
    restoreSnapshot(redoStack.pop());
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    elements.undoButton.disabled = undoStack.length === 0;
    elements.redoButton.disabled = redoStack.length === 0;
  }

  function setMode(nextMode) {
    if (["reposition", "reposition-label"].includes(nextMode) && !getLabel()) {
      showToast(`Select a label before entering ${nextMode === "reposition" ? "Place anchor" : "Place label"} mode.`);
      nextMode = "browse";
    }

    mode = nextMode;
    document.body.classList.toggle("preview-mode", mode === "preview");
    document.body.classList.toggle("reposition-mode", mode === "reposition");
    document.body.classList.toggle("reposition-label-mode", mode === "reposition-label");

    [
      elements.browseModeButton,
      elements.addModeButton,
      elements.repositionModeButton,
      elements.repositionLabelModeButton,
      elements.previewModeButton
    ].forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (mode === "add") {
      elements.modeGuidance.textContent = I18n.t("studio.guidanceAdd");
      elements.studioViewer.style.cursor = "crosshair";
    } else if (mode === "reposition") {
      const label = getLabel();
      elements.modeGuidance.textContent = `Place anchor: click the new anatomical point for ${label?.name || label?.id || "the selected label"}. The text box keeps its relative offset.`;
      elements.studioViewer.style.cursor = "crosshair";
    } else if (mode === "reposition-label") {
      const label = getLabel();
      elements.modeGuidance.textContent = `Place label: click where the text box for ${label?.name || label?.id || "the selected label"} should sit. The anatomical anchor stays fixed.`;
      elements.studioViewer.style.cursor = "crosshair";
    } else if (mode === "preview") {
      elements.modeGuidance.textContent = I18n.t("studio.guidancePreview");
      elements.studioViewer.style.cursor = "default";
    } else {
      elements.modeGuidance.textContent = I18n.t("studio.guidanceBrowse");
      elements.studioViewer.style.cursor = "default";
    }
    A11y.announce(elements.modeGuidance.textContent);
  }

  function markFieldEditStart() {
    if (!fieldEditSnapshotTaken) {
      pushHistorySnapshot();
      fieldEditSnapshotTaken = true;
    }
  }

  function markFieldEditEnd() {
    fieldEditSnapshotTaken = false;
    updateUndoRedoButtons();
  }

  function updateSelectedLabelFromForm() {
    const label = getLabel();
    if (!label) return;

    const translation = ensureTranslation(label);
    translation.name = elements.labelNameInput.value.trim();
    translation.description = elements.labelDescriptionInput.value;
    translation.aliases = elements.labelAliasesInput.value.split(",").map((value) => value.trim()).filter(Boolean);
    if (studioContentLanguage === (I18n.sourceLocale || "es")) {
      label.name = translation.name;
      label.description = translation.description;
    }
    label.id = elements.labelIdInput.value.trim();
    label.category = elements.labelCategoryInput.value;
    label.status = elements.labelStatusInput.value;
    label.quizEligible = elements.labelQuizEligibleInput.checked;
    label.difficulty = elements.labelDifficultyInput.value;
    const acceptedRadius = Number(elements.labelAcceptedRadiusInput.value);
    if (Number.isFinite(acceptedRadius)) label.acceptedRadius = roundCoordinate(acceptedRadius);
    const anchorX = Number(elements.anchorXInput.value);
    const anchorY = Number(elements.anchorYInput.value);
    const labelX = Number(elements.labelXInput.value);
    const labelY = Number(elements.labelYInput.value);

    if (Number.isFinite(anchorX) && Number.isFinite(anchorY)) {
      label.position = { x: roundCoordinate(anchorX), y: roundCoordinate(anchorY) };
    }
    if (Number.isFinite(labelX) && Number.isFinite(labelY)) {
      label.labelPosition = { x: roundCoordinate(labelX), y: roundCoordinate(labelY) };
    }

    const overlay = overlayByLabelKey.get(label._studioKey);
    if (overlay && Number.isFinite(label.position.x) && Number.isFinite(label.position.y)) {
      viewer.updateOverlay(
        overlay.element,
        new OpenSeadragon.Point(label.position.x, label.position.y),
        OpenSeadragon.Placement.CENTER
      );
      updateOverlayGeometry(label._studioKey);
    }

    elements.inspectorTitle.textContent = getStudioLabelName(label);
    renderTranslationStatus(label);
    refreshLocalizedStudioOverlays();
    setDirty(true);
    updateLabelList();
    validateAndRender();
    updateInspectorCoordinates();
  }

  function duplicateSelectedLabel() {
    const source = getLabel();
    if (!source) return;
    pushHistorySnapshot();

    const duplicate = deepClone(source);
    duplicate._studioKey = createStudioKey();
    duplicate.id = uniqueLabelId(`${source.id || slugify(source.name)}-copy`);
    duplicate.name = `${source.name || "Untitled label"} copy`;
    duplicate.position = {
      x: roundCoordinate(source.position.x + 0.015),
      y: roundCoordinate(source.position.y + 0.015)
    };
    const oldLabelPosition = getEffectiveLabelPosition(source);
    duplicate.labelPosition = {
      x: roundCoordinate(oldLabelPosition.x + 0.015),
      y: roundCoordinate(oldLabelPosition.y + 0.015)
    };
    duplicate.status = "draft";

    workingViewData.labels.push(duplicate);
    createOverlay(duplicate);
    selectLabel(duplicate._studioKey);
    setDirty(true);
    updateDocumentUI();
  }

  function deleteSelectedLabel() {
    const label = getLabel();
    if (!label) return;
    if (!window.confirm(`Delete “${label.name || label.id}” from this exported view JSON?`)) return;

    pushHistorySnapshot();
    const index = workingViewData.labels.findIndex((item) => item._studioKey === label._studioKey);
    workingViewData.labels.splice(index, 1);
    const overlay = overlayByLabelKey.get(label._studioKey);
    if (overlay) viewer.removeOverlay(overlay.element);
    overlayByLabelKey.delete(label._studioKey);
    selectedLabelKey = workingViewData.labels[Math.min(index, workingViewData.labels.length - 1)]?._studioKey || null;
    setDirty(true);
    updateDocumentUI();
    syncOverlaySelection();
  }

  function resetAutomaticLabelPosition() {
    const label = getLabel();
    if (!label) return;
    pushHistorySnapshot();
    delete label.labelPosition;
    updateOverlayGeometry(label._studioKey);
    setDirty(true);
    updateInspector();
    validateAndRender();
  }

  function validateView(data = workingViewData) {
    if (!data) return { errors: ["No view is loaded."], warnings: [], issues: [] };

    const fallbackIssues = [];
    let canonical = data;
    try {
      canonical = Models?.migrate ? Models.migrate("view", data) : data;
    } catch (error) {
      return { errors: [error.message], warnings: [], issues: [] };
    }

    if (Validation?.validateView) {
      const result = Validation.validateView(canonical, { expectedId: currentViewEntry?.id || null });
      fallbackIssues.push(...(result.issues || []));
    } else {
      const modelResult = Models?.validate
        ? Models.validate("view", canonical, { expectedId: currentViewEntry?.id || null })
        : { errors: [], warnings: [] };
      fallbackIssues.push(...(modelResult.errors || []).map((message) => ({ severity: "error", message })));
      fallbackIssues.push(...(modelResult.warnings || []).map((message) => ({ severity: "warning", message })));
    }

    if (currentViewEntry?.dataPath) {
      try { sanitizeRepositoryPath(currentViewEntry.dataPath); }
      catch (error) { fallbackIssues.push({ severity: "error", code: "PATH_UNSAFE", message: `View JSON path is invalid: ${error.message}` }); }
    }
    if (canonical?.image?.src) {
      try { sanitizeRepositoryPath(canonical.image.src); }
      catch (error) { fallbackIssues.push({ severity: "error", code: "PATH_UNSAFE", message: `image.src is invalid: ${error.message}` }); }
    }
    (canonical.labels || []).forEach((label, index) => {
      const eligible = label?.quiz?.eligible ?? label?.quizEligible;
      if (eligible === false) fallbackIssues.push({
        severity: "warning",
        code: "QUIZ_EXCLUDED",
        path: `labels[${index}].quiz.eligible`,
        message: `${label.name || `Label ${index + 1}`} is excluded from Study and Quiz modes.`
      });
    });

    const seen = new Set();
    const issues = fallbackIssues.filter((item) => {
      const key = `${item.severity}|${item.code || ""}|${item.path || ""}|${item.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      errors: issues.filter((item) => item.severity === "error").map((item) => item.path ? `${item.path}: ${item.message}` : item.message),
      warnings: issues.filter((item) => item.severity === "warning").map((item) => item.path ? `${item.path}: ${item.message}` : item.message),
      issues
    };
  }

  function validateAndRender() {
    const result = validateView();
    elements.validationList.replaceChildren();

    if (!workingViewData) {
      elements.validationBadge.className = "validation-badge";
      elements.validationBadge.textContent = I18n.t("studio.notChecked");
      const item = document.createElement("li");
      item.textContent = I18n.t("studio.selectViewValidation");
      elements.validationList.appendChild(item);
      return result;
    }

    if (result.errors.length) {
      elements.validationBadge.className = "validation-badge is-invalid";
      elements.validationBadge.textContent = `${result.errors.length} error${result.errors.length === 1 ? "" : "s"}`;
    } else {
      elements.validationBadge.className = "validation-badge is-valid";
      elements.validationBadge.textContent = I18n.t("studio.valid");
    }

    const messages = [
      ...result.errors.map((message) => `Error: ${message}`),
      ...result.warnings.slice(0, 8).map((message) => `Review: ${message}`)
    ];

    if (!messages.length) messages.push("The view is ready to export.");
    if (result.warnings.length > 8) messages.push(`${result.warnings.length - 8} additional review notices are not shown.`);

    messages.forEach((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      elements.validationList.appendChild(item);
    });

    return result;
  }

  function buildExportData() {
    if (!workingViewData) return null;
    const exportData = deepClone(workingViewData);
    if (exportData.image && typeof exportData.image === "object") {
      Object.keys(exportData.image).forEach((key) => {
        if (key.startsWith("_studio")) delete exportData.image[key];
      });
    }
    Object.keys(exportData).forEach((key) => {
      if (key.startsWith("_studio")) delete exportData[key];
    });
    exportData.schemaVersion = SUPPORTED_SCHEMA_VERSION;
    exportData.status = ["draft", "review", "published", "unpublished"].includes(exportData.status)
      ? exportData.status
      : "published";
    exportData.labels = exportData.labels.map((label) => {
      const quiz = Models?.getQuiz ? Models.getQuiz(label) : {
        eligible: label.quizEligible !== false,
        difficulty: label.difficulty || "intermediate",
        acceptedRadius: Number(label.acceptedRadius) || 0.045
      };
      const normalized = {
        id: String(label.id || "").trim(),
        name: String(label.name || "").trim(),
        description: String(label.description || ""),
        position: {
          x: roundCoordinate(label.position.x),
          y: roundCoordinate(label.position.y)
        },
        category: String(label.category || ""),
        status: label.status || "published",
        quiz: {
          eligible: quiz.eligible !== false,
          difficulty: ["beginner", "intermediate", "advanced"].includes(quiz.difficulty)
            ? quiz.difficulty
            : "intermediate",
          acceptedRadius: roundCoordinate(Number(quiz.acceptedRadius) || 0.045)
        }
      };
      if (label.labelPosition) {
        normalized.labelPosition = {
          x: roundCoordinate(label.labelPosition.x),
          y: roundCoordinate(label.labelPosition.y)
        };
      }
      Object.keys(label).forEach((key) => {
        if (key.startsWith("_studio")) return;
        if (["id", "name", "description", "position", "labelPosition", "category", "status", "quiz", "quizEligible", "difficulty", "acceptedRadius"].includes(key)) return;
        normalized[key] = deepClone(label[key]);
      });
      return normalized;
    });
    return Models?.migrate ? Models.migrate("view", exportData) : exportData;
  }

  function exportJson() {
    const validation = validateAndRender();
    if (validation.errors.length) {
      showToast(I18n.t("studio.fixBeforeExport"), { duration: 3500 });
      return;
    }

    const data = buildExportData();
    const json = `${JSON.stringify(data, null, 2)}\n`;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${data.id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    exportedFingerprint = fingerprintView(workingViewData);
    dirty = false;
    const localSession = currentImageSession();
    setDocumentStatus(
      "saved",
      localSession
        ? `JSON exported · copy the photograph to ${localSession.repoPath}`
        : "JSON exported · replace the repository view file"
    );
    saveDraft({ silent: true });
    showToast(
      localSession
        ? `${data.id}.json exported. Remember to add ${localSession.file.name} at ${localSession.repoPath}.`
        : `${data.id}.json exported successfully.`,
      { duration: localSession ? 4500 : 2600 }
    );
  }

  async function copyJson() {
    const validation = validateAndRender();
    if (validation.errors.length) {
      showToast(I18n.t("studio.fixBeforeCopy"));
      return;
    }
    const json = JSON.stringify(buildExportData(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      showToast(I18n.t("studio.jsonCopied"));
    } catch (error) {
      console.error(error);
      showToast(I18n.t("studio.clipboardUnavailable"));
    }
  }

  function draftKey(viewId = currentViewEntry?.id) {
    return viewId ? `${DRAFT_PREFIX}${viewId}` : null;
  }

  function saveDraftSnapshot(viewId, viewData, entry, session = null) {
    const key = draftKey(viewId);
    if (!key || !viewData || !entry) return { ok: false, fallback: false };
    const previous = workingViewData;
    try {
      workingViewData = viewData;
      const exportData = buildExportData();
      workingViewData = previous;
      const result = AppStorage?.writeJSON?.(key, {
        formatVersion: 2,
        savedAt: new Date().toISOString(),
        viewData: exportData,
        manifestEntry: cleanManifestEntry(entry, { preserveStudioLocal: true }),
        imageSession: session ? {
          repoPath: session.repoPath,
          fileName: session.file?.name || "",
          width: session.width,
          height: session.height
        } : null
      });
      return result || { ok: false, fallback: false };
    } catch (error) {
      console.warn("Could not save Studio draft snapshot.", error);
      return { ok: false, fallback: false, error };
    } finally {
      workingViewData = previous;
    }
  }

  function saveDraft({ silent = false } = {}) {
    if (!workingViewData || !currentViewEntry) return;
    const result = saveDraftSnapshot(currentViewEntry.id, workingViewData, currentViewEntry, currentImageSession());
    if (result?.ok) {
      lastDraftSavedAt = new Date();
      elements.draftStatusText.textContent = `Autosaved ${lastDraftSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
      if (!silent) showToast(I18n.t("studio.draftSaved"));
      if (dirty) setDocumentStatus("dirty", I18n.t("studio.draftCurrent"));
    } else if (result?.fallback) {
      lastDraftSavedAt = new Date();
      setDocumentStatus("warning", I18n.t("studio.sessionOnly"));
      elements.draftStatusText.textContent = I18n.t("studio.storageFull");
      if (!silent) showToast(I18n.t("studio.sessionSafe"));
    } else {
      setDocumentStatus("error", I18n.t("studio.draftSaveError"));
      elements.draftStatusText.textContent = I18n.t("studio.autosaveFailed");
      if (!silent) showToast(I18n.t("studio.browserSaveFailed"));
    }
  }

  function scheduleDraftSave() {
    clearTimeout(autosaveTimer);
    elements.draftStatusText.textContent = I18n.t("studio.autosaving");
    autosaveTimer = window.setTimeout(() => saveDraft({ silent: true }), 500);
  }

  function readDraftEnvelope(viewId) {
    try {
      const parsed = AppStorage?.readJSON?.(draftKey(viewId), { fallback: null });
      if (!parsed) return null;
      if (parsed?.viewData) return parsed;
      return { formatVersion: 1, savedAt: null, viewData: parsed, manifestEntry: null, imageSession: null };
    } catch (error) {
      console.warn("Could not read Studio draft.", error);
      return null;
    }
  }

  function readDraft(viewId) {
    return readDraftEnvelope(viewId)?.viewData || null;
  }

  function clearDraft(viewId = currentViewEntry?.id) {
    if (!viewId) return;
    try {
      AppStorage?.remove?.(draftKey(viewId));
    } catch (error) {
      console.warn("Could not clear Studio draft.", error);
    }
  }

  function fingerprintView(data) {
    return data ? JSON.stringify(buildExportDataFrom(data)) : "";
  }

  function buildExportDataFrom(data) {
    const current = workingViewData;
    workingViewData = data;
    const result = buildExportData();
    workingViewData = current;
    return result;
  }

  function resetToSource() {
    if (!sourceViewData) return;
    if (!window.confirm("Discard the current draft and restore the repository version of this view?")) return;
    workingViewData = deepClone(sourceViewData);
    selectedLabelKey = null;
    undoStack.length = 0;
    redoStack.length = 0;
    clearDraft();
    exportedFingerprint = fingerprintView(workingViewData);
    setDirty(false, "Repository data restored");
    renderAllOverlays();
    updateUndoRedoButtons();
    updateDocumentUI();
  }

  async function importJsonFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const normalized = normalizeViewData(raw, currentViewEntry);
      if (!window.confirm(`Replace the current working copy with “${file.name}”?`)) return;
      pushHistorySnapshot();
      workingViewData = normalized;
      selectedLabelKey = null;
      setDirty(true, "Imported JSON · not yet exported");
      loadViewerImage();
      updateDocumentUI();
      showToast(`${file.name} imported into the working copy.`);
    } catch (error) {
      console.error(error);
      showToast(`Could not import JSON: ${error.message}`, { duration: 5000 });
    } finally {
      elements.importJsonInput.value = "";
    }
  }

  function applyTheme(theme) {
    const light = theme === "light";
    document.body.classList.toggle("light-mode", light);
    document.documentElement.classList.toggle("preload-light-theme", light);
    elements.themeToggle.textContent = light ? "☀" : "☾";
    elements.themeToggle.setAttribute("aria-label", light ? I18n.t("studio.switchDark") : I18n.t("studio.switchLight"));
    try { AppStorage?.writeText?.(THEME_KEY, light ? "light" : "dark"); } catch (error) {}
  }

  function initializeTheme() {
    let theme = "dark";
    try {
      theme = AppStorage?.readText?.(THEME_KEY) || (document.documentElement.classList.contains("preload-light-theme") ? "light" : "dark");
    } catch (error) {}
    applyTheme(theme);
  }

  function setMobileStudioPanel(panel, { focus = false } = {}) {
    const validPanel = ["library", "workspace", "inspector"].includes(panel)
      ? panel
      : "workspace";
    document.body.dataset.studioPanel = validPanel;

    [
      elements.mobileLibraryTab,
      elements.mobileWorkspaceTab,
      elements.mobileInspectorTab
    ].forEach((button) => {
      const active = button.dataset.studioTarget === validPanel;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("active", active);
    });

    const panelElement = document.querySelector(`[data-studio-panel="${validPanel}"]`);
    if (focus && panelElement instanceof HTMLElement) {
      panelElement.setAttribute("tabindex", "-1");
      requestAnimationFrame(() => panelElement.focus({ preventScroll: true }));
    }

    if (validPanel === "workspace") {
      requestAnimationFrame(() => {
        if (viewer?.viewport && elements.studioViewer.clientWidth && elements.studioViewer.clientHeight) {
          viewer.viewport.resize(
            new OpenSeadragon.Point(
              elements.studioViewer.clientWidth,
              elements.studioViewer.clientHeight
            ),
            true
          );
          viewer.viewport.applyConstraints();
          viewer.forceRedraw?.();
        }
      });
    }

    A11y.announce(`${validPanel.charAt(0).toUpperCase() + validPanel.slice(1)} panel selected.`);
  }

  function bindEvents() {
    [elements.mobileLibraryTab, elements.mobileWorkspaceTab, elements.mobileInspectorTab]
      .forEach((button) => {
        button.addEventListener("click", () => {
          setMobileStudioPanel(button.dataset.studioTarget, { focus: true });
        });
      });

    elements.dismissStudioAdvisory.addEventListener("click", () => {
      elements.studioDeviceAdvisory.hidden = true;
      try { AppStorage?.writeText?.(AppStorage.keys.studioDeviceAdviceDismissed, "true", { kind: "session" }); } catch (error) {}
    });

    elements.themeToggle.addEventListener("click", () => {
      applyTheme(document.body.classList.contains("light-mode") ? "dark" : "light");
    });

    elements.speciesSelect.addEventListener("change", () => selectSpecies(elements.speciesSelect.value).catch(handleTopLevelError));
    elements.systemSelect.addEventListener("change", () => selectSystem(elements.systemSelect.value).catch(handleTopLevelError));
    elements.collectionSelect.addEventListener("change", () => selectCollection(elements.collectionSelect.value).catch(handleTopLevelError));
    elements.viewSelect.addEventListener("change", () => selectView(elements.viewSelect.value).catch(handleTopLevelError));

    elements.browseModeButton.addEventListener("click", () => setMode("browse"));
    elements.addModeButton.addEventListener("click", () => setMode("add"));
    elements.repositionModeButton.addEventListener("click", () => setMode("reposition"));
    elements.repositionAnchorButton.addEventListener("click", () => setMode("reposition"));
    elements.repositionLabelModeButton.addEventListener("click", () => setMode("reposition-label"));
    elements.repositionLabelButton.addEventListener("click", () => setMode("reposition-label"));
    elements.previewModeButton.addEventListener("click", () => setMode("preview"));
    elements.addLabelFromSidebar.addEventListener("click", () => setMode("add"));
    elements.resetViewButton.addEventListener("click", () => viewer?.viewport?.goHome());
    elements.undoButton.addEventListener("click", undo);
    elements.redoButton.addEventListener("click", redo);
    elements.saveDraftButton.addEventListener("click", () => saveDraft());
    elements.copyJsonButton.addEventListener("click", copyJson);
    elements.exportJsonButton.addEventListener("click", exportJson);
    elements.resetSourceButton.addEventListener("click", resetToSource);
    elements.importJsonButton.addEventListener("click", () => elements.importJsonInput.click());
    elements.importJsonInput.addEventListener("change", () => importJsonFile(elements.importJsonInput.files?.[0]));
    elements.newImageViewButton.addEventListener("click", () => showImageImportDialog("new"));
    elements.batchImageButton.addEventListener("click", () => elements.batchImageInput.click());
    elements.batchImageInput.addEventListener("change", () => importImageBatch(elements.batchImageInput.files));
    elements.replaceImageButton.addEventListener("click", () => showImageImportDialog("replace"));
    elements.connectProjectFolderButton.addEventListener("click", connectProjectFolder);
    elements.runPreflightButton.addEventListener("click", () => runPublishPreflight());
    elements.saveProjectFolderButton.addEventListener("click", saveCurrentViewToProjectFolder);
    elements.imageImportForm.addEventListener("submit", importImageFromDialog);
    elements.imageFileInput.addEventListener("change", updateImageImportFromFile);
    elements.cancelImageImportButton.addEventListener("click", closeImageImport);
    elements.closeImageImportDialog.addEventListener("click", closeImageImport);
    elements.imageImportDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeImageImport();
    });
    elements.imageViewIdInput.addEventListener("input", () => {
      if (!elements.imageFileInput.files?.[0] || elements.imageImportMode.value !== "new") return;
      const ext = fileExtension(elements.imageFileInput.files[0]);
      elements.imageRepoPathInput.value = `images/views/${slugify(elements.imageViewIdInput.value)}.${ext}`;
    });
    elements.retryStudioButton.addEventListener("click", () => retryAction?.());
    elements.labelFilterInput.addEventListener("input", updateLabelList);
    elements.generateIdButton.addEventListener("click", () => {
      const label = getLabel();
      if (!label) return;
      pushHistorySnapshot();
      elements.labelIdInput.value = uniqueLabelId(elements.labelNameInput.value || getStudioLabelName(label), label.id);
      updateSelectedLabelFromForm();
      markFieldEditEnd();
    });
    elements.duplicateLabelButton.addEventListener("click", duplicateSelectedLabel);
    elements.deleteLabelButton.addEventListener("click", deleteSelectedLabel);
    elements.resetLabelPositionButton.addEventListener("click", resetAutomaticLabelPosition);

    const viewMetadataFields = [
      elements.viewTitleInput,
      elements.viewButtonLabelInput,
      elements.viewOrientationInput,
      elements.viewImagePathInput,
      elements.viewAltInput
    ];
    viewMetadataFields.forEach((field) => {
      field.addEventListener("change", () => {
        pushHistorySnapshot();
        updateViewMetadataFromForm();
        if (currentViewEntry?._studioLocal) saveCollectionDraft();
      });
    });

    elements.labelLanguageInput.addEventListener("change", () => {
      studioContentLanguage = elements.labelLanguageInput.value;
      AppStorage?.writeText?.(CONTENT_LANGUAGE_KEY, studioContentLanguage);
      updateInspector();
      updateLabelList();
      refreshLocalizedStudioOverlays();
    });

    elements.labelLanguageInput.value = studioContentLanguage;

    const formFields = [
      elements.labelNameInput,
      elements.labelIdInput,
      elements.labelDescriptionInput,
      elements.labelAliasesInput,
      elements.labelCategoryInput,
      elements.labelStatusInput,
      elements.labelQuizEligibleInput,
      elements.labelDifficultyInput,
      elements.labelAcceptedRadiusInput,
      elements.anchorXInput,
      elements.anchorYInput,
      elements.labelXInput,
      elements.labelYInput
    ];

    formFields.forEach((field) => {
      field.addEventListener("focus", markFieldEditStart);
      field.addEventListener("input", updateSelectedLabelFromForm);
      field.addEventListener("change", updateSelectedLabelFromForm);
      field.addEventListener("blur", markFieldEditEnd);
    });

    window.addEventListener("keydown", (event) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveDraft();
      } else if (modifier && event.key.toLowerCase() === "e") {
        event.preventDefault();
        exportJson();
      } else if (modifier && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      } else if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (
        event.key.toLowerCase() === "r" &&
        selectedLabelKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
      ) {
        event.preventDefault();
        setMode("reposition");
      } else if (
        event.key.toLowerCase() === "l" &&
        selectedLabelKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
      ) {
        event.preventDefault();
        setMode("reposition-label");
      } else if (event.key === "Escape") {
        setMode("browse");
      } else if (event.key === "Delete" && selectedLabelKey && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        deleteSelectedLabel();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && dirty) saveDraft({ silent: true });
    });

    window.addEventListener("beforeunload", (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });

    window.addEventListener("pagehide", () => {
      if (dirty) saveDraft({ silent: true });
      saveCollectionDraft();
      localImageSessions.forEach((session) => {
        if (session.objectUrl) URL.revokeObjectURL(session.objectUrl);
      });
    });
  }

  function handleTopLevelError(error) {
    console.error(error);
    setDocumentStatus("error", I18n.t("studio.dataError"));
    showViewerState({
      eyebrow: "Studio error",
      title: "MORPHORA could not load this content",
      message: error.message,
      onRetry: () => window.location.reload()
    });
  }

  async function initialize() {
    I18n.applyDom?.();
    if (elements.labelLanguageInput) elements.labelLanguageInput.value = studioContentLanguage;
    initializeTheme();
    bindEvents();
    setMobileStudioPanel("workspace");
    try {
      if (AppStorage?.readText?.(AppStorage.keys.studioDeviceAdviceDismissed, { kind: "session" }) === "true") {
        elements.studioDeviceAdvisory.hidden = true;
      }
    } catch (error) {}
    setMode("browse");
    showViewerState({
      eyebrow: "Content Studio",
      title: "Loading the MORPHORA library",
      message: "Reading species, collections and anatomical view data."
    });

    try {
      initializeViewer();
      catalog = Models?.prepare
        ? Models.prepare("catalog", await fetchJson(CATALOG_PATH))
        : await fetchJson(CATALOG_PATH);
      const lastContext = readLastContext();
      await populateSpecies({
        preferredId: lastContext?.speciesId,
        preferredSystemId: lastContext?.systemId,
        preferredCollectionId: lastContext?.collectionId,
        preferredViewId: lastContext?.viewId
      });
    } catch (error) {
      handleTopLevelError(error);
    }
  }

  window.addEventListener("morphora:languagechange", () => {
    I18n.applyDom?.();
  });

  initialize();
});
