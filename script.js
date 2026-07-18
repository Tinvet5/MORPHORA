document.addEventListener("DOMContentLoaded", () => {
  "use strict";

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
    searchInput: document.getElementById("searchInput"),
    searchStatus: document.getElementById("searchStatus"),
    viewButtons: document.getElementById("viewButtons"),
    menuBtn: document.getElementById("menuBtn"),
    menuPanel: document.getElementById("menuPanel"),
    infoPanel: document.getElementById("infoPanel"),
    infoEyebrow: document.getElementById("infoEyebrow"),
    infoTitle: document.getElementById("infoTitle"),
    infoText: document.getElementById("infoText"),
    closeInfoPanelButton: document.getElementById("closeInfoPanel")
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
    elements.searchInput.disabled = disabled;
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
      title: "Preparing MORPHORA",
      message: "MORPHORA is loading the atlas manifest and building the available anatomical views."
    });
  }

  function showLoadingState(viewName = "anatomical view") {
    showViewerState({
      type: "loading",
      eyebrow: "Loading high-resolution image",
      title: `Preparing ${viewName}`,
      message: "MORPHORA is loading the selected view data, anatomical photograph, and interactive overlays."
    });
  }

  function showAtlasDataErrorState(details = "") {
    const localFileMessage = window.location.protocol === "file:"
      ? " JSON files cannot be loaded reliably by opening index.html directly. Run MORPHORA through VS Code Live Server or another local web server."
      : "";

    const safeDetails = details ? ` ${details}` : "";

    showViewerState({
      type: "error",
      eyebrow: "Atlas data unavailable",
      title: "MORPHORA could not load its atlas manifest",
      message: `Check that “data/atlas.json” exists and contains valid JSON.${localFileMessage}${safeDetails}`,
      retryLabel: "Retry atlas data",
      onRetry: initializeAtlas
    });

    elements.viewer.setAttribute("aria-busy", "false");
    setImageButtonsLoading();
  }

  function showViewDataErrorState(viewEntry, details = "") {
    const safeDetails = details ? ` ${details}` : "";

    showViewerState({
      type: "error",
      eyebrow: "View data unavailable",
      title: `We couldn't load ${viewEntry.buttonLabel}`,
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
      title: "We couldn't load this anatomical view",
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
      title: "This image does not have labels yet",
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
      title: "The image viewer could not start",
      message: "OpenSeadragon did not load. Check the internet connection and the OpenSeadragon script address in index.html."
    });

    return;
  }

  // =========================
  // VIEWER
  // =========================
  const viewer = OpenSeadragon({
    id: "viewer",
    prefixUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
    showNavigationControl: true,
    showNavigator: true,
    navigatorPosition: "BOTTOM_LEFT"
  });

  // =========================
  // ATLAS DATA CONFIGURATION
  // =========================
  const ATLAS_MANIFEST_PATH = "data/atlas.json";
  const SUPPORTED_SCHEMA_VERSION = 1;

  let atlasManifest = null;
  const viewManifestById = new Map();
  const viewDataCache = new Map();

  // =========================
  // APPLICATION STATE
  // =========================
  const trackedOverlays = new Set();

  let activeViewId = null;
  let activeViewData = null;
  let activeViewLoadController = null;
  let viewLoadSequence = 0;
  let labelsVisible = true;
  let addingAnnotation = false;
  let searchQuery = "";
  let ignoreNextColorPanelOutsideClick = false;
  let activeInfoElement = null;
  let lastInfoTrigger = null;

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
    const sourceUrl = source && typeof source === "object" ? source.url : source;

    // Some tile-source types do not expose a URL. In that case, allow rendering.
    if (!sourceUrl) return true;

    return normalizePath(sourceUrl) === normalizePath(expectedImagePath);
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

  async function fetchJson(path, { signal } = {}) {
    const response = await fetch(path, {
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
    requireData(isPlainObject(data), "The atlas manifest must be a JSON object.");
    requireData(
      data.schemaVersion === SUPPORTED_SCHEMA_VERSION,
      `Unsupported atlas schema version: ${data.schemaVersion}.`
    );
    requireData(
      typeof data.defaultViewId === "string" && data.defaultViewId.trim(),
      "The atlas manifest requires a defaultViewId."
    );
    requireData(
      Array.isArray(data.views) && data.views.length > 0,
      "The atlas manifest requires at least one view."
    );

    const seenIds = new Set();

    const views = data.views.map((entry, index) => {
      requireData(
        isPlainObject(entry),
        `Atlas view entry ${index + 1} must be an object.`
      );
      requireData(
        typeof entry.id === "string" && entry.id.trim(),
        `Atlas view entry ${index + 1} requires an id.`
      );
      requireData(
        !seenIds.has(entry.id),
        `Duplicate atlas view id: ${entry.id}.`
      );
      requireData(
        typeof entry.buttonLabel === "string" && entry.buttonLabel.trim(),
        `Atlas view “${entry.id}” requires a buttonLabel.`
      );
      requireData(
        typeof entry.dataPath === "string" && entry.dataPath.trim(),
        `Atlas view “${entry.id}” requires a dataPath.`
      );

      seenIds.add(entry.id);

      return {
        id: entry.id.trim(),
        buttonLabel: entry.buttonLabel.trim(),
        dataPath: entry.dataPath.trim()
      };
    });

    requireData(
      seenIds.has(data.defaultViewId),
      `The default view “${data.defaultViewId}” is not registered in views.`
    );

    return {
      ...data,
      views
    };
  }

  function validateViewData(data, manifestEntry) {
    requireData(isPlainObject(data), `View data for “${manifestEntry.id}” must be an object.`);
    requireData(
      data.schemaVersion === SUPPORTED_SCHEMA_VERSION,
      `Unsupported schema version in ${manifestEntry.dataPath}: ${data.schemaVersion}.`
    );
    requireData(
      data.id === manifestEntry.id,
      `View id “${data.id}” does not match manifest id “${manifestEntry.id}”.`
    );
    requireData(isPlainObject(data.image), `View “${data.id}” requires an image object.`);
    requireData(
      typeof data.image.src === "string" && data.image.src.trim(),
      `View “${data.id}” requires image.src.`
    );
    requireData(
      Array.isArray(data.labels),
      `View “${data.id}” requires a labels array. Use an empty array when labels are pending.`
    );

    const seenLabelIds = new Set();

    const labels = data.labels.map((label, index) => {
      requireData(
        isPlainObject(label),
        `Label ${index + 1} in “${data.id}” must be an object.`
      );
      requireData(
        typeof label.id === "string" && label.id.trim(),
        `Label ${index + 1} in “${data.id}” requires an id.`
      );
      requireData(
        !seenLabelIds.has(label.id),
        `Duplicate label id “${label.id}” in “${data.id}”.`
      );
      requireData(
        typeof label.name === "string" && label.name.trim(),
        `Label “${label.id}” in “${data.id}” requires a name.`
      );
      requireData(
        isPlainObject(label.position),
        `Label “${label.id}” in “${data.id}” requires a position object.`
      );

      const x = Number(label.position.x);
      const y = Number(label.position.y);

      requireData(
        Number.isFinite(x) && Number.isFinite(y),
        `Label “${label.id}” in “${data.id}” requires numeric x and y coordinates.`
      );
      requireData(
        x >= 0 && x <= 1 && y >= 0 && y <= 1,
        `Label “${label.id}” in “${data.id}” must use normalized coordinates between 0 and 1.`
      );

      seenLabelIds.add(label.id);

      return {
        id: label.id.trim(),
        name: label.name.trim(),
        description: typeof label.description === "string" ? label.description.trim() : "",
        position: { x, y }
      };
    });

    return {
      ...data,
      image: {
        ...data.image,
        src: data.image.src.trim()
      },
      labels
    };
  }

  function renderViewButtons(manifest) {
    elements.viewButtons.replaceChildren();

    manifest.views.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.viewId = entry.id;
      button.textContent = entry.buttonLabel;
      button.setAttribute("aria-pressed", "false");

      button.addEventListener("click", () => {
        loadView(entry.id);
        closeMenu();
      });

      elements.viewButtons.appendChild(button);
    });
  }

  async function initializeAtlas() {
    showAtlasLoadingState();
    viewLoadSequence += 1;

    if (activeViewLoadController) {
      activeViewLoadController.abort();
      activeViewLoadController = null;
    }

    activeViewId = null;
    activeViewData = null;
    searchQuery = "";
    elements.searchInput.value = "";
    elements.searchStatus.hidden = true;
    elements.searchStatus.textContent = "";
    elements.viewButtons.replaceChildren();
    clearCurrentOverlays();
    closeInfoPanel();
    closeColorPanel();
    setAnnotationMode(false);

    try {
      const manifestData = await fetchJson(ATLAS_MANIFEST_PATH);
      const validatedManifest = validateAtlasManifest(manifestData);

      atlasManifest = validatedManifest;
      viewManifestById.clear();
      viewDataCache.clear();

      validatedManifest.views.forEach((entry) => {
        viewManifestById.set(entry.id, entry);
      });

      renderViewButtons(validatedManifest);
      await loadView(validatedManifest.defaultViewId);
    } catch (error) {
      console.error("MORPHORA could not load atlas data.", error);
      atlasManifest = null;
      activeViewId = null;
      activeViewData = null;
      viewManifestById.clear();
      viewDataCache.clear();
      elements.viewButtons.replaceChildren();
      showAtlasDataErrorState(error.message || "");
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
    sourceElement = null
  }) {
    clearActiveInfoElement();
    lastInfoTrigger = sourceElement || null;

    if (sourceElement) {
      activeInfoElement = sourceElement;
      activeInfoElement.classList.add("active");
      activeInfoElement.setAttribute("aria-expanded", "true");
    }

    const isAnnotation = kind === "annotation";

    elements.infoEyebrow.textContent = isAnnotation
      ? "Personal annotation"
      : "Anatomical structure";

    elements.infoTitle.textContent = title || (
      isAnnotation ? "Untitled annotation" : "Untitled structure"
    );

    elements.infoText.textContent = text || (
      isAnnotation
        ? "No annotation description was provided."
        : "No anatomical information is available yet."
    );

    elements.infoPanel.dataset.kind = isAnnotation
      ? "annotation"
      : "structure";

    elements.infoPanel.classList.add("show");
    elements.infoPanel.setAttribute("aria-hidden", "false");
  }

  function closeInfoPanel({ restoreFocus = false } = {}) {
    const focusTarget = lastInfoTrigger;

    elements.infoPanel.classList.remove("show");
    elements.infoPanel.setAttribute("aria-hidden", "true");

    clearActiveInfoElement();
    lastInfoTrigger = null;

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
  function closeMenu() {
    elements.menuPanel.classList.remove("open");
    elements.menuBtn.setAttribute("aria-expanded", "false");
  }

  function setAnnotationMode(enabled) {
    addingAnnotation = enabled;
    elements.addAnnotation.classList.toggle("active", enabled);
    elements.addAnnotation.setAttribute("aria-pressed", String(enabled));
  }

  // =========================
  // LABEL DOM CREATION
  // =========================
  function createLabelElement(labelData) {
    const element = document.createElement("div");
    element.className = "label-anchor";
    element.dataset.searchText = labelData.name.toLocaleLowerCase();
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", `Open information for ${labelData.name}`);
    element.setAttribute("aria-expanded", "false");

    const isLeft = labelData.position.x < 0.5;
    element.classList.add(isLeft ? "left" : "right");

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
      showInfo({
        title: labelData.name,
        text: labelData.description,
        kind: "structure",
        sourceElement: element
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
  function updateConnectorLine(element) {
    if (!element || !element.isConnected) return;

    const dot = element.querySelector(".anchor-dot");
    const labelBox = element.querySelector(".label-box");
    const svg = element.querySelector(".connector-svg");
    const line = element.querySelector(".connector-line");

    if (!dot || !labelBox || !svg || !line) return;

    const dotX = dot.offsetLeft;
    const dotY = dot.offsetTop;
    const labelX = labelBox.offsetLeft + labelBox.offsetWidth / 2;
    const labelY = labelBox.offsetTop + labelBox.offsetHeight / 2;

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
  function updateSearchStatus(matchCount, totalLabelCount) {
    if (!searchQuery || !labelsVisible || totalLabelCount === 0) {
      elements.searchStatus.hidden = true;
      elements.searchStatus.textContent = "";
      return;
    }

    elements.searchStatus.hidden = false;

    if (matchCount === 0) {
      elements.searchStatus.textContent = `No labels match “${elements.searchInput.value.trim()}” in this view.`;
      return;
    }

    elements.searchStatus.textContent = `${matchCount} label${matchCount === 1 ? "" : "s"} found.`;
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
    return entry ? `${entry.buttonLabel} view` : "anatomical view";
  }

  async function loadView(viewId, { forceReload = false } = {}) {
    const viewEntry = viewManifestById.get(viewId);

    if (!viewEntry) {
      console.error(`MORPHORA atlas view not found: ${viewId}`);

      showViewerState({
        type: "error",
        eyebrow: "Atlas configuration error",
        title: "This anatomical view is not configured",
        message: `No manifest entry exists for “${viewId}”. Check data/atlas.json.`,
        retryLabel: "Reload atlas data",
        onRetry: initializeAtlas
      });

      return;
    }

    const requestSequence = ++viewLoadSequence;

    if (activeViewLoadController) {
      activeViewLoadController.abort();
    }

    const controller = new AbortController();
    activeViewLoadController = controller;
    activeViewId = viewId;
    activeViewData = null;

    elements.searchStatus.hidden = true;
    elements.searchStatus.textContent = "";

    clearCurrentOverlays();
    closeInfoPanel();
    closeColorPanel();
    setAnnotationMode(false);
    setActiveViewButton(viewId);
    setImageButtonsLoading(viewId);
    showLoadingState(getViewName(viewId));

    try {
      let viewData = forceReload ? null : viewDataCache.get(viewId);

      if (!viewData) {
        const rawViewData = await fetchJson(viewEntry.dataPath, {
          signal: controller.signal
        });

        viewData = validateViewData(rawViewData, viewEntry);
        viewDataCache.set(viewId, viewData);
      }

      if (requestSequence !== viewLoadSequence || activeViewId !== viewId) {
        return;
      }

      activeViewData = viewData;
      activeViewLoadController = null;

      viewer.open({
        type: "image",
        url: viewData.image.src
      });
    } catch (error) {
      if (error.name === "AbortError") return;
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

    // Ignore a delayed event from an image that is no longer active.
    if (!sourceMatchesImage(event.source, viewData.image.src)) return;

    clearCurrentOverlays();
    renderLabels(viewData.labels);
    refreshLabelVisibility();
    updateAllConnectorLines();

    if (viewData.image.alt) {
      elements.viewer.setAttribute("aria-label", viewData.image.alt);
    }

    if (viewData.labels.length === 0) {
      showEmptyLabelsState();
    } else {
      hideViewerState();
    }
  });

  viewer.addHandler("open-failed", (event) => {
    const viewData = activeViewData;

    if (
      viewData &&
      event.source &&
      !sourceMatchesImage(event.source, viewData.image.src)
    ) {
      return;
    }

    const source = viewData ? viewData.image.src : event.source || "unknown";
    const details = event.message || "The browser did not provide additional details.";

    console.error(
      `MORPHORA could not open the image source: ${source}`,
      details
    );

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
  elements.toggleLabels.addEventListener("click", () => {
    labelsVisible = !labelsVisible;
    elements.toggleLabels.setAttribute("aria-pressed", String(labelsVisible));
    refreshLabelVisibility();
  });

  elements.resetView.addEventListener("click", () => {
    if (viewer.viewport) {
      viewer.viewport.goHome();
    }
  });

  elements.toggleTheme.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
  });


  // =========================
  // SEARCH
  // =========================
  elements.searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value.trim().toLocaleLowerCase();
    refreshLabelVisibility();
  });

  // =========================
  // ANNOTATIONS
  // =========================
  const pastelColors = [
    "#fff8a0",
    "#ffb6b9",
    "#a0ffc8",
    "#a0c8ff",
    "#ffd1a0",
    "#e0a0ff"
  ];

  const colorPanel = document.createElement("div");
  colorPanel.className = "color-picker-panel";
  colorPanel.setAttribute("role", "dialog");
  colorPanel.setAttribute("aria-label", "Choose annotation color");
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
    swatch.setAttribute("aria-label", `Use annotation color ${color}`);

    swatch.addEventListener("click", (event) => {
      event.stopPropagation();

      const viewportPoint = colorPanel.viewportPoint;
      closeColorPanel();

      if (!viewportPoint) return;

      const title = window.prompt("Enter annotation title:");
      if (!title || !title.trim()) return;

      const description = window.prompt("Enter description:") || "";

      addAnnotation({
        title: title.trim(),
        description: description.trim(),
        x: viewportPoint.x,
        y: viewportPoint.y,
        color
      });
    });

    colorPanel.appendChild(swatch);
  });

  document.body.appendChild(colorPanel);

  // Prevent clicks inside the palette from reaching the document-level
  // outside-click handler.
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

    // Once note mode is active, close the controls so the viewer is clear.
    if (nextMode) {
      closeMenu();
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

    // Stop this same browser click from immediately triggering the
    // document outside-click handler and closing the palette again.
    if (originalEvent && typeof originalEvent.stopPropagation === "function") {
      originalEvent.stopPropagation();
    }

    // Prevent OpenSeadragon from treating annotation placement as a normal
    // viewer click (for example, click-to-zoom behavior).
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

    // OpenSeadragon's canvas-click can be followed by a normal document
    // click. Ignore that one click so the palette does not close instantly.
    ignoreNextColorPanelOutsideClick = true;
    window.setTimeout(() => {
      ignoreNextColorPanelOutsideClick = false;
    }, 0);

    setAnnotationMode(false);
  });

  function addAnnotation(annotationData) {
    const element = document.createElement("div");
    element.className = "user-annotation";
    element.style.background = annotationData.color;
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", `Open annotation: ${annotationData.title}`);
    element.setAttribute("aria-expanded", "false");

    const title = document.createElement("div");
    title.className = "annotation-title";
    title.textContent = annotationData.title;

    const description = document.createElement("div");
    description.className = "annotation-text";
    description.textContent = annotationData.description || "";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "annotation-delete";
    deleteButton.textContent = "🗑️";
    deleteButton.setAttribute("aria-label", "Delete annotation");

    element.append(title, description, deleteButton);

    ["pointerdown", "pointerup", "click"].forEach((eventName) => {
      element.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    });

    addTrackedOverlay({
      element,
      location: new OpenSeadragon.Point(annotationData.x, annotationData.y)
    });

    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();

      const wasActiveInfoSource = element === activeInfoElement;
      removeTrackedOverlay(element);

      if (wasActiveInfoSource) {
        closeInfoPanel();
      }
    });

    const openAnnotationInfo = () => {
      showInfo({
        title: annotationData.title,
        text: annotationData.description,
        kind: "annotation",
        sourceElement: element
      });
    };

    element.addEventListener("click", (event) => {
      event.stopPropagation();
      openAnnotationInfo();
    });

    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      event.stopPropagation();
      openAnnotationInfo();
    });
  }

  // =========================
  // MENU
  // =========================
  elements.menuBtn.setAttribute("aria-expanded", "false");

  elements.menuBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    const willOpen = !elements.menuPanel.classList.contains("open");
    elements.menuPanel.classList.toggle("open", willOpen);
    elements.menuBtn.setAttribute("aria-expanded", String(willOpen));
  });

  // =========================
  // GLOBAL KEYBOARD HANDLER
  // =========================
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (elements.infoPanel.classList.contains("show")) {
      closeInfoPanel({ restoreFocus: true });
    }

    if (
      !elements.viewerState.hidden &&
      elements.viewerState.dataset.state === "empty"
    ) {
      hideViewerState();
    }

    closeMenu();
    closeColorPanel();
    setAnnotationMode(false);
  });

  // =========================
  // GLOBAL CLICK HANDLER
  // =========================
  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!isElementTarget(target)) return;

    if (!target.closest(".label-anchor, .user-annotation, #infoPanel")) {
      closeInfoPanel();
    }

    if (!target.closest(".menu")) {
      closeMenu();
    }

    if (ignoreNextColorPanelOutsideClick) {
      ignoreNextColorPanelOutsideClick = false;
    } else if (!target.closest(".color-picker-panel, #addAnnotation")) {
      closeColorPanel();
    }
  });

  // =========================
  // INITIAL STATE
  // =========================
  elements.toggleLabels.setAttribute("aria-pressed", "true");
  elements.addAnnotation.setAttribute("aria-pressed", "false");

  initializeAtlas();
});
