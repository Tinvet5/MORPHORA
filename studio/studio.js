document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const A11y = window.MorphoraA11y || { announce() {} };
  const Config = window.MORPHORA_CONFIG || {};
  const Perf = window.MorphoraPerformance || {
    mark() {},
    measure() {},
    shouldPrefetch() { return false; }
  };
  Perf.mark("studio-dom-ready");
  const APP_VERSION = Config.version || "4.8.2";
  const CATALOG_PATH = "data/catalog.json";
  const SUPPORTED_SCHEMA_VERSION = Config.schemaVersion || 1;
  const DRAFT_PREFIX = "morphora:studio:draft:";
  const THEME_KEY = "morphora:theme";
  const LAST_CONTEXT_KEY = "morphora:studio:last-context";
  const LABEL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const elements = {
    body: document.body,
    themeToggle: document.getElementById("themeToggle"),
    documentStatusDot: document.getElementById("documentStatusDot"),
    documentStatusText: document.getElementById("documentStatusText"),
    saveDraftButton: document.getElementById("saveDraftButton"),
    copyJsonButton: document.getElementById("copyJsonButton"),
    exportJsonButton: document.getElementById("exportJsonButton"),
    speciesSelect: document.getElementById("speciesSelect"),
    systemSelect: document.getElementById("systemSelect"),
    collectionSelect: document.getElementById("collectionSelect"),
    viewSelect: document.getElementById("viewSelect"),
    addLabelFromSidebar: document.getElementById("addLabelFromSidebar"),
    labelFilterInput: document.getElementById("labelFilterInput"),
    labelList: document.getElementById("labelList"),
    labelCount: document.getElementById("labelCount"),
    importJsonButton: document.getElementById("importJsonButton"),
    importJsonInput: document.getElementById("importJsonInput"),
    newImageViewButton: document.getElementById("newImageViewButton"),
    replaceImageButton: document.getElementById("replaceImageButton"),
    saveProjectFolderButton: document.getElementById("saveProjectFolderButton"),
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
    labelNameInput: document.getElementById("labelNameInput"),
    labelIdInput: document.getElementById("labelIdInput"),
    generateIdButton: document.getElementById("generateIdButton"),
    labelDescriptionInput: document.getElementById("labelDescriptionInput"),
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

  const overlayByLabelKey = new Map();
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 60;

  function versionedPath(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}v=${APP_VERSION}`;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
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

  function currentImageSession() {
    return currentViewEntry?.id ? localImageSessions.get(currentViewEntry.id) || null : null;
  }

  function updateImageToolControls() {
    const hasView = Boolean(workingViewData && currentViewEntry);
    const session = currentImageSession();
    elements.replaceImageButton.disabled = !hasView;
    elements.saveProjectFolderButton.disabled = !session;

    if (session) {
      const support = typeof window.showDirectoryPicker === "function";
      elements.imageToolStatus.textContent = support
        ? `Local photograph loaded (${session.file.name}). Save view to project folder writes the image, view JSON${currentViewEntry?._studioLocal ? " and collection manifest" : ""} after you choose the MORPHORA repository root.`
        : `Local photograph loaded (${session.file.name}). Export the JSON and copy the image to ${session.repoPath}. Direct folder writing is not supported by this browser.`;
      elements.saveProjectFolderButton.title = support
        ? "Choose your MORPHORA repository root and write the current image/view files"
        : "Direct project-folder writing requires a Chromium browser with the File System Access API";
    } else {
      elements.imageToolStatus.textContent = "Upload a browser-compatible JPG, PNG or WebP directly into Studio. Deep Zoom conversion can still be performed later with the V4.7 production tools.";
      elements.saveProjectFolderButton.title = "Upload or replace an image first";
    }
  }

  function closeImageImport() {
    if (elements.imageImportDialog.open && typeof elements.imageImportDialog.close === "function") {
      elements.imageImportDialog.close();
    } else {
      elements.imageImportDialog.removeAttribute("open");
    }
    elements.imageImportForm.reset();
    elements.imageImportSummary.textContent = "Choose a photograph to read its dimensions.";
  }

  function showImageImportDialog(importMode) {
    if (importMode === "replace" && !workingViewData) {
      showToast("Select a view before replacing its image.");
      return;
    }
    if (dirty && importMode === "new" && !confirmContextChange()) return;

    elements.imageImportForm.reset();
    elements.imageImportMode.value = importMode;
    const isNew = importMode === "new";
    elements.imageNewViewFields.hidden = !isNew;
    elements.imageImportDialogTitle.textContent = isNew ? "Create view from photograph" : "Replace current view image";
    elements.confirmImageImportButton.textContent = isNew ? "Create local view" : "Use this photograph";

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
      elements.imageImportSummary.textContent = "Choose a photograph to read its dimensions.";
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

  async function importImageFromDialog(event) {
    event.preventDefault();
    const file = elements.imageFileInput.files?.[0];
    if (!file) {
      showToast("Choose a JPG, PNG or WebP photograph first.");
      return;
    }

    try {
      const dimensions = await readImageDimensions(file);
      const repoPath = sanitizeRepositoryPath(elements.imageRepoPathInput.value || `images/views/${defaultImageViewId(file)}.${fileExtension(file)}`);
      const importMode = elements.imageImportMode.value;

      if (importMode === "replace") {
        pushHistorySnapshot();
        attachLocalImageToView(workingViewData, file, repoPath, dimensions);
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
        image: {
          type: "image",
          src: repoPath,
          width: dimensions.width,
          height: dimensions.height,
          alt: elements.imageAltInput.value.trim() || title
        },
        labels: []
      };
      attachLocalImageToView(raw, file, repoPath, dimensions);

      const entry = {
        id: viewId,
        buttonLabel,
        dataPath,
        status: "draft",
        _studioLocal: true
      };
      currentCollectionManifest.views.push(entry);
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

  async function getDirectoryHandleForPath(rootHandle, path, { create = true } = {}) {
    const segments = sanitizeRepositoryPath(path).split("/");
    const fileName = segments.pop();
    let directory = rootHandle;
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment, { create });
    }
    return { directory, fileName };
  }

  async function writeProjectFile(rootHandle, path, contents) {
    const { directory, fileName } = await getDirectoryHandleForPath(rootHandle, path, { create: true });
    const handle = await directory.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(contents);
    await writable.close();
  }

  function sanitizeManifestForWrite(manifest) {
    const output = deepClone(manifest);
    output.views = (output.views || []).map((view) => {
      const clean = {};
      Object.entries(view).forEach(([key, value]) => {
        if (!key.startsWith("_")) clean[key] = value;
      });
      return clean;
    });
    return output;
  }

  async function saveCurrentViewToProjectFolder() {
    const session = currentImageSession();
    if (!session || !workingViewData || !currentViewEntry) {
      showToast("Upload or replace an image before using direct project-folder save.");
      return;
    }
    if (typeof window.showDirectoryPicker !== "function") {
      showToast("This browser cannot write directly to a project folder. Export JSON and copy the photograph manually instead.", { duration: 5000 });
      return;
    }

    const validation = validateAndRender();
    if (validation.errors.length) {
      showToast("Fix validation errors before saving to the project folder.");
      return;
    }

    try {
      const rootHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      await writeProjectFile(rootHandle, session.repoPath, session.file);
      await writeProjectFile(
        rootHandle,
        currentViewEntry.dataPath || `data/views/${workingViewData.id}.json`,
        `${JSON.stringify(buildExportData(), null, 2)}\n`
      );

      if (currentViewEntry._studioLocal && currentCollection?.manifestPath) {
        await writeProjectFile(
          rootHandle,
          currentCollection.manifestPath,
          `${JSON.stringify(sanitizeManifestForWrite(currentCollectionManifest), null, 2)}\n`
        );
      }

      exportedFingerprint = fingerprintView(workingViewData);
      dirty = false;
      currentViewEntry._studioLocal = false;
      setDocumentStatus("saved", "View and photograph written to project folder");
      updateImageToolControls();
      showToast(`Saved image and ${workingViewData.id}.json to the selected MORPHORA project folder.`);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error(error);
      showToast(`Project-folder save failed: ${error.message}`, { duration: 5000 });
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
      setDocumentStatus("dirty", message || "Unsaved changes · draft will be stored locally");
      scheduleDraftSave();
    } else {
      setDocumentStatus("saved", message || "Source data loaded");
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
    if (!isPlainObject(raw)) throw new Error("View JSON must contain an object.");
    if (raw.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
      throw new Error(`Unsupported schemaVersion ${raw.schemaVersion}. Expected ${SUPPORTED_SCHEMA_VERSION}.`);
    }
    if (entry && raw.id !== entry.id) {
      throw new Error(`View id “${raw.id}” does not match manifest id “${entry.id}”.`);
    }
    if (!isPlainObject(raw.image) || typeof raw.image.src !== "string" || !raw.image.src.trim()) {
      throw new Error("View JSON requires image.src.");
    }

    const imageType = inferImageType(raw.image);
    if (!(["image", "dzi"].includes(imageType))) {
      throw new Error("View JSON image.type must be “image” or “dzi”.");
    }
    if (raw.image.fallback !== undefined &&
        (typeof raw.image.fallback !== "string" || !raw.image.fallback.trim())) {
      throw new Error("image.fallback must be a non-empty path when provided.");
    }
    if (raw.image.thumbnail !== undefined &&
        (typeof raw.image.thumbnail !== "string" || !raw.image.thumbnail.trim())) {
      throw new Error("image.thumbnail must be a non-empty path when provided.");
    }

    if (!Array.isArray(raw.labels)) {
      throw new Error("View JSON requires a labels array.");
    }

    const labels = raw.labels.map((label, index) => {
      if (!isPlainObject(label)) throw new Error(`Label ${index + 1} must be an object.`);
      const position = isPlainObject(label.position) ? label.position : label.anchor;
      if (!isPlainObject(position)) throw new Error(`Label ${index + 1} requires position coordinates.`);

      const x = Number(position.x);
      const y = Number(position.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error(`Label ${index + 1} requires numeric x and y coordinates.`);
      }

      const normalized = {
        ...label,
        _studioKey: typeof label._studioKey === "string" ? label._studioKey : createStudioKey(),
        id: typeof label.id === "string" ? label.id.trim() : "",
        name: typeof label.name === "string" ? label.name.trim() : "",
        description: typeof label.description === "string" ? label.description : "",
        position: { x: roundCoordinate(x), y: roundCoordinate(y) },
        category: typeof label.category === "string" ? label.category : "",
        status: typeof label.status === "string" ? label.status : "published"
      };

      delete normalized.anchor;

      if (isPlainObject(label.labelPosition)) {
        const labelX = Number(label.labelPosition.x);
        const labelY = Number(label.labelPosition.y);
        if (Number.isFinite(labelX) && Number.isFinite(labelY)) {
          normalized.labelPosition = {
            x: roundCoordinate(labelX),
            y: roundCoordinate(labelY)
          };
        }
      }

      return normalized;
    });

    return {
      ...raw,
      image: {
        ...raw.image,
        type: imageType,
        src: raw.image.src.trim(),
        ...(typeof raw.image.fallback === "string"
          ? { fallback: raw.image.fallback.trim() }
          : {}),
        ...(typeof raw.image.thumbnail === "string"
          ? { thumbnail: raw.image.thumbnail.trim() }
          : {})
      },
      labels
    };
  }

  async function getSpeciesData(entry) {
    if (speciesCache.has(entry.id)) return speciesCache.get(entry.id);
    if (!entry.dataPath) throw new Error(`Species “${entry.name}” has no dataPath.`);
    const data = await fetchJson(entry.dataPath);
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
    const manifest = await fetchJson(collection.manifestPath);
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
      const raw = localStorage.getItem(LAST_CONTEXT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function persistContext() {
    if (!currentSpeciesEntry || !currentSystem || !currentCollection || !currentViewEntry) return;
    try {
      localStorage.setItem(
        LAST_CONTEXT_KEY,
        JSON.stringify({
          speciesId: currentSpeciesEntry.id,
          systemId: currentSystem.id,
          collectionId: currentCollection.id,
          viewId: currentViewEntry.id
        })
      );
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

    currentCollectionManifest = await getCollectionManifest(collection);
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

      const draft = readDraft(entry.id);
      if (draft && window.confirm(`A local draft exists for ${entry.buttonLabel}. Restore it?`)) {
        workingViewData = normalizeViewData(draft, entry);
        setDirty(true, "Local draft restored · not yet exported");
      }

      updateUndoRedoButtons();
      updateDocumentUI();
      loadViewerImage();
    } catch (error) {
      console.error(error);
      setDocumentStatus("error", "View data could not be loaded");
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

    viewer = OpenSeadragon({
      id: "studioViewer",
      prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
      showNavigationControl: true,
      showNavigator: true,
      navigatorPosition: "BOTTOM_LEFT",
      gestureSettingsMouse: { clickToZoom: false },
      gestureSettingsTouch: { clickToZoom: false }
    });

    viewer.addHandler("open", (event) => {
      const expectedSource = activeImageLoad?.sourcePath || workingViewData?.image?.src;
      if (!sourceMatchesImage(event.source, expectedSource)) return;

      renderAllOverlays();
      hideViewerState();
      viewer.viewport.goHome(true);

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

    viewer.addHandler("tile-loaded", () => {
      if (!workingViewData || !activeImageLoad || activeImageLoad.firstTileMarked) return;
      activeImageLoad.firstTileMarked = true;
      clearViewerPreview();
      Perf.mark(`studio:${workingViewData.id}:first-tile-ready`);
      Perf.measure(
        `Studio first tile ${workingViewData.id}`,
        `studio:${workingViewData.id}:image-start`,
        `studio:${workingViewData.id}:first-tile-ready`
      );
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
        firstTileMarked: false
      };
    } else {
      activeImageLoad.sourcePath = sourcePath;
      activeImageLoad.useFallback = useFallback;
      activeImageLoad.fallbackAttempted =
        activeImageLoad.fallbackAttempted || useFallback;
      activeImageLoad.firstTileMarked = false;
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
    anchor.setAttribute("aria-label", `Move anchor for ${label.name || label.id}`);

    const box = document.createElement("button");
    box.type = "button";
    box.className = "studio-label-box";
    box.textContent = label.name || "Untitled label";
    box.setAttribute("aria-label", `Select and move ${label.name || label.id}`);

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
    overlay.box.textContent = label.name || "Untitled label";

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
      showToast("Select a label before placing its anchor.");
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
      showToast("Select a label before placing its text box.");
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
      return [label.name, label.id, label.category, label.status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    elements.labelCount.textContent = String(labels.length);
    elements.labelList.replaceChildren();

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "label-list-empty";
      empty.textContent = labels.length ? "No labels match this filter." : "No labels in this view yet.";
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
      name.textContent = label.name || label.id || "Untitled";

      const status = document.createElement("span");
      status.className = "label-list-status";
      status.textContent = label.status || "draft";

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
      elements.inspectorTitle.textContent = "No label selected";
      elements.selectionIndex.textContent = "—";
      elements.coordinateReadout.textContent = "Anchor: —";
      return;
    }

    const index = labels.findIndex((item) => item._studioKey === label._studioKey);
    const labelPosition = getEffectiveLabelPosition(label);

    elements.emptyInspector.hidden = true;
    elements.labelForm.hidden = false;
    elements.inspectorTitle.textContent = label.name || "Untitled label";
    elements.selectionIndex.textContent = `${index + 1}/${labels.length}`;
    elements.labelNameInput.value = label.name || "";
    elements.labelIdInput.value = label.id || "";
    elements.labelDescriptionInput.value = label.description || "";
    elements.labelCategoryInput.value = label.category || "";
    elements.labelStatusInput.value = label.status || "draft";
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

  function updateDocumentUI() {
    elements.activeViewTitle.textContent = workingViewData?.title || currentViewEntry?.buttonLabel || "No view selected";
    elements.imagePathText.textContent = workingViewData?.image?.src
      ? `${workingViewData.image._studioRuntimeSrc ? "LOCAL · " : ""}${String(workingViewData.image.type || inferImageType(workingViewData.image)).toUpperCase()} · ${workingViewData.image.src}`
      : "—";
    elements.resetSourceButton.disabled = !sourceViewData;
    updateLabelList();
    updateInspector();
    updateRepositionControls();
    updateImageToolControls();
    validateAndRender();
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
      elements.modeGuidance.textContent = "Add label mode: click the exact anatomical structure to place a new anchor.";
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
      elements.modeGuidance.textContent = "Student preview: labels are visible without editing handles. Select Browse to continue editing.";
      elements.studioViewer.style.cursor = "default";
    } else {
      elements.modeGuidance.textContent = "Browse mode: drag the anchor or label box, use Place anchor / Place label for one-click positioning, or Shift-click / Alt-click the image after selecting a label.";
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

    label.name = elements.labelNameInput.value;
    label.id = elements.labelIdInput.value.trim();
    label.description = elements.labelDescriptionInput.value;
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

    elements.inspectorTitle.textContent = label.name || "Untitled label";
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
    const errors = [];
    const warnings = [];

    if (!data) {
      errors.push("No view is loaded.");
      return { errors, warnings };
    }

    if (data.schemaVersion !== SUPPORTED_SCHEMA_VERSION) errors.push(`schemaVersion must be ${SUPPORTED_SCHEMA_VERSION}.`);
    if (!data.id || typeof data.id !== "string") errors.push("View id is required.");
    if (!isPlainObject(data.image) || !data.image.src) {
      errors.push("image.src is required.");
    } else {
      const imageType = inferImageType(data.image);
      if (!(["image", "dzi"].includes(imageType))) {
        errors.push("image.type must be “image” or “dzi”.");
      }
      if (imageType === "dzi" && !data.image.fallback) {
        warnings.push("Deep Zoom view has no standard fallback image.");
      }
      if (imageType === "dzi" && !data.image.thumbnail) {
        warnings.push("Deep Zoom view has no optimized thumbnail.");
      }
      ["width", "height"].forEach((dimension) => {
        const value = Number(data.image[dimension]);
        if (!Number.isFinite(value) || value <= 0) {
          errors.push(`image.${dimension} must be a positive number.`);
        }
      });
    }
    if (!Array.isArray(data.labels)) errors.push("labels must be an array.");

    const ids = new Set();
    (data.labels || []).forEach((label, index) => {
      const prefix = `Label ${index + 1}`;
      if (!label.id) errors.push(`${prefix} has no identifier.`);
      else if (!LABEL_ID_PATTERN.test(label.id)) errors.push(`${prefix} id “${label.id}” must use lowercase letters, numbers and hyphens.`);
      else if (ids.has(label.id)) errors.push(`Duplicate label id “${label.id}”.`);
      else ids.add(label.id);

      if (!String(label.name || "").trim()) errors.push(`${prefix} has no structure name.`);
      if (!isPlainObject(label.position)) errors.push(`${prefix} has no anchor position.`);
      else {
        const { x, y } = label.position;
        if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) errors.push(`${prefix} anchor coordinates must be numeric.`);
        else if (x < 0 || x > 1 || y < 0 || y > 1) errors.push(`${prefix} anchor is outside the normalized image boundaries.`);
      }

      if (label.labelPosition) {
        const { x, y } = label.labelPosition;
        if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) errors.push(`${prefix} label-position coordinates must be numeric.`);
        else if (x < 0 || x > 1 || y < 0 || y > 1) errors.push(`${prefix} label box is outside the normalized image boundaries.`);
      }

      if (!String(label.description || "").trim()) warnings.push(`${label.name || prefix} has no description.`);
      if (!label.category) warnings.push(`${label.name || prefix} has no category.`);
      if (label.status !== "published") warnings.push(`${label.name || prefix} is marked “${label.status || "draft"}”.`);
      if (!["beginner", "intermediate", "advanced"].includes(label.difficulty || "intermediate")) {
        errors.push(`${prefix} difficulty must be beginner, intermediate or advanced.`);
      }
      const acceptedRadius = Number(label.acceptedRadius ?? 0.045);
      if (!Number.isFinite(acceptedRadius) || acceptedRadius < 0.005 || acceptedRadius > 0.2) {
        errors.push(`${prefix} locate tolerance must be between 0.005 and 0.2.`);
      }
      if (label.quizEligible === false) warnings.push(`${label.name || prefix} is excluded from Study and Quiz modes.`);
    });

    return { errors, warnings };
  }

  function validateAndRender() {
    const result = validateView();
    elements.validationList.replaceChildren();

    if (!workingViewData) {
      elements.validationBadge.className = "validation-badge";
      elements.validationBadge.textContent = "Not checked";
      const item = document.createElement("li");
      item.textContent = "Select a view to begin validation.";
      elements.validationList.appendChild(item);
      return result;
    }

    if (result.errors.length) {
      elements.validationBadge.className = "validation-badge is-invalid";
      elements.validationBadge.textContent = `${result.errors.length} error${result.errors.length === 1 ? "" : "s"}`;
    } else {
      elements.validationBadge.className = "validation-badge is-valid";
      elements.validationBadge.textContent = "Valid";
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
    exportData.labels = exportData.labels.map((label) => {
      const normalized = {
        id: String(label.id || "").trim(),
        name: String(label.name || "").trim(),
        description: String(label.description || ""),
        position: {
          x: roundCoordinate(label.position.x),
          y: roundCoordinate(label.position.y)
        }
      };

      if (label.labelPosition) {
        normalized.labelPosition = {
          x: roundCoordinate(label.labelPosition.x),
          y: roundCoordinate(label.labelPosition.y)
        };
      }
      if (label.category) normalized.category = label.category;
      if (label.status) normalized.status = label.status;
      normalized.quizEligible = label.quizEligible !== false;
      normalized.difficulty = ["beginner", "intermediate", "advanced"].includes(label.difficulty)
        ? label.difficulty
        : "intermediate";
      normalized.acceptedRadius = roundCoordinate(Number(label.acceptedRadius) || 0.045);
      return normalized;
    });
    return exportData;
  }

  function exportJson() {
    const validation = validateAndRender();
    if (validation.errors.length) {
      showToast("Fix validation errors before exporting.", { duration: 3500 });
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
      showToast("Fix validation errors before copying JSON.");
      return;
    }
    const json = JSON.stringify(buildExportData(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      showToast("Validated JSON copied to the clipboard.");
    } catch (error) {
      console.error(error);
      showToast("Clipboard access was unavailable. Use Export JSON instead.");
    }
  }

  function draftKey(viewId = currentViewEntry?.id) {
    return viewId ? `${DRAFT_PREFIX}${viewId}` : null;
  }

  function saveDraft({ silent = false } = {}) {
    if (!workingViewData || !currentViewEntry) return;
    try {
      localStorage.setItem(
        draftKey(),
        JSON.stringify({
          savedAt: new Date().toISOString(),
          viewData: buildExportData()
        })
      );
      if (!silent) showToast("Draft saved in this browser.");
      if (dirty) setDocumentStatus("dirty", "Draft saved locally · not yet exported");
    } catch (error) {
      console.error(error);
      setDocumentStatus("error", "Draft could not be saved");
      if (!silent) showToast("The browser could not save this draft.");
    }
  }

  function scheduleDraftSave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => saveDraft({ silent: true }), 700);
  }

  function readDraft(viewId) {
    try {
      const raw = localStorage.getItem(draftKey(viewId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.viewData || null;
    } catch (error) {
      console.warn("Could not read Studio draft.", error);
      return null;
    }
  }

  function clearDraft(viewId = currentViewEntry?.id) {
    if (!viewId) return;
    try {
      localStorage.removeItem(draftKey(viewId));
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
    elements.themeToggle.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    try { localStorage.setItem(THEME_KEY, light ? "light" : "dark"); } catch (error) {}
  }

  function initializeTheme() {
    let theme = "dark";
    try {
      theme = localStorage.getItem(THEME_KEY) || (document.documentElement.classList.contains("preload-light-theme") ? "light" : "dark");
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
      try { sessionStorage.setItem("morphora:studio:device-advice-dismissed", "true"); } catch (error) {}
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
    elements.replaceImageButton.addEventListener("click", () => showImageImportDialog("replace"));
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
      elements.labelIdInput.value = uniqueLabelId(elements.labelNameInput.value || label.name, label.id);
      updateSelectedLabelFromForm();
      markFieldEditEnd();
    });
    elements.duplicateLabelButton.addEventListener("click", duplicateSelectedLabel);
    elements.deleteLabelButton.addEventListener("click", deleteSelectedLabel);
    elements.resetLabelPositionButton.addEventListener("click", resetAutomaticLabelPosition);

    const formFields = [
      elements.labelNameInput,
      elements.labelIdInput,
      elements.labelDescriptionInput,
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

    window.addEventListener("beforeunload", (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });

    window.addEventListener("pagehide", () => {
      localImageSessions.forEach((session) => {
        if (session.objectUrl) URL.revokeObjectURL(session.objectUrl);
      });
    });
  }

  function handleTopLevelError(error) {
    console.error(error);
    setDocumentStatus("error", "Studio encountered a data error");
    showViewerState({
      eyebrow: "Studio error",
      title: "MORPHORA could not load this content",
      message: error.message,
      onRetry: () => window.location.reload()
    });
  }

  async function initialize() {
    initializeTheme();
    bindEvents();
    setMobileStudioPanel("workspace");
    try {
      if (sessionStorage.getItem("morphora:studio:device-advice-dismissed") === "true") {
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
      catalog = await fetchJson(CATALOG_PATH);
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

  initialize();
});
