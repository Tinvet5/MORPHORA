document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const Atlas = window.MorphoraAtlas;
  const A11y = window.MorphoraA11y || {
    announce() {}
  };

  if (!Atlas?.getViewer) {
    console.error("MORPHORA Drawing could not start because the atlas API is unavailable.");
    return;
  }

  const viewer = Atlas.getViewer();
  if (!viewer) {
    console.error("MORPHORA Drawing could not start because OpenSeadragon is unavailable.");
    return;
  }

  const STORAGE_KEY = "morphora:drawings:v1";
  const SCHEMA_VERSION = 1;
  const MAX_HISTORY = 50;
  const MAX_STROKES_PER_VIEW = 750;
  const MAX_POINTS_PER_STROKE = 5000;
  const DEFAULT_COLOR = "#e5484d";
  const DEFAULT_SIZE = 5;
  const HIGHLIGHTER_MULTIPLIER = 3.2;

  const elements = {
    toggleMode: document.getElementById("toggleDrawingMode"),
    menuVisibility: document.getElementById("toggleDrawingsVisibility"),
    countBadge: document.getElementById("drawingCountBadge"),
    toolbar: document.getElementById("drawingToolbar"),
    toolButtons: Array.from(document.querySelectorAll("[data-drawing-tool]")),
    colorPresets: document.getElementById("drawingColorPresets"),
    colorInput: document.getElementById("drawingColorInput"),
    sizeInput: document.getElementById("drawingSizeInput"),
    sizeOutput: document.getElementById("drawingSizeOutput"),
    undo: document.getElementById("drawingUndo"),
    redo: document.getElementById("drawingRedo"),
    visibility: document.getElementById("drawingVisibility"),
    clear: document.getElementById("drawingClear"),
    exportButton: document.getElementById("drawingExport"),
    importButton: document.getElementById("drawingImport"),
    importInput: document.getElementById("drawingImportInput"),
    done: document.getElementById("drawingDone"),
    hint: document.getElementById("drawingToolbarHint"),
    toast: document.getElementById("drawingToast")
  };

  const missing = Object.entries(elements)
    .filter(([key, value]) => key !== "toolButtons" && !value)
    .map(([key]) => key);

  if (missing.length || elements.toolButtons.length === 0) {
    console.error(`MORPHORA Drawing cannot start. Missing elements: ${missing.join(", ") || "drawing tool buttons"}`);
    return;
  }

  const state = {
    active: false,
    tool: "pen",
    color: DEFAULT_COLOR,
    size: DEFAULT_SIZE,
    visible: true,
    quizHidden: false,
    quizLocked: false,
    previousLabelsVisible: true,
    activeViewId: Atlas.getActiveViewId?.() || null,
    currentStroke: null,
    erasing: false,
    eraserChanged: false,
    eraseSnapshot: null,
    spaceHeld: false,
    store: loadStore(),
    histories: new Map(),
    renderFrame: null,
    toastTimer: null
  };

  state.visible = state.store.preferences.visible !== false;

  const svgNamespace = "http://www.w3.org/2000/svg";
  const drawingLayer = document.createElementNS(svgNamespace, "svg");
  drawingLayer.id = "morphoraDrawingLayer";
  drawingLayer.classList.add("morphora-drawing-layer");
  drawingLayer.setAttribute("aria-hidden", "true");
  drawingLayer.setAttribute("focusable", "false");
  drawingLayer.setAttribute("preserveAspectRatio", "none");
  elementsLayerParent().appendChild(drawingLayer);

  function elementsLayerParent() {
    return viewer.element || document.getElementById("viewer");
  }

  function createEmptyStore() {
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: null,
      preferences: { visible: true },
      views: {}
    };
  }

  function isFinitePoint(point) {
    return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
  }

  function normalizeStroke(value) {
    if (!value || typeof value !== "object" || !Array.isArray(value.points)) return null;
    const tool = value.tool === "highlighter" ? "highlighter" : "pen";
    const points = value.points
      .filter(isFinitePoint)
      .slice(0, MAX_POINTS_PER_STROKE)
      .map((point) => ({ x: Number(point.x), y: Number(point.y) }));
    if (!points.length) return null;

    const width = Number(value.width);
    return {
      id: String(value.id || createId()),
      tool,
      color: /^#[0-9a-f]{6}$/i.test(String(value.color || "")) ? String(value.color) : DEFAULT_COLOR,
      width: Number.isFinite(width) && width > 0 ? Math.min(width, 0.25) : 0.002,
      opacity: tool === "highlighter" ? clamp(Number(value.opacity) || 0.28, 0.08, 0.6) : 1,
      points,
      createdAt: value.createdAt || new Date().toISOString(),
      updatedAt: value.updatedAt || value.createdAt || new Date().toISOString()
    };
  }

  function normalizeViewStrokes(value) {
    const raw = Array.isArray(value) ? value : value?.strokes;
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeStroke).filter(Boolean).slice(0, MAX_STROKES_PER_VIEW);
  }

  function normalizeStore(value) {
    const result = createEmptyStore();
    if (!value || typeof value !== "object") return result;
    result.updatedAt = value.updatedAt || null;
    result.preferences.visible = value.preferences?.visible !== false;
    const rawViews = value.views || value.drawings || {};
    Object.entries(rawViews).forEach(([viewId, strokes]) => {
      if (!viewId) return;
      result.views[String(viewId)] = normalizeViewStrokes(strokes);
    });
    return result;
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeStore(JSON.parse(raw)) : createEmptyStore();
    } catch (error) {
      console.warn("MORPHORA could not read saved drawings. A clean drawing store was started.", error);
      return createEmptyStore();
    }
  }

  function saveStore(message = "Drawing saved") {
    state.store.updatedAt = new Date().toISOString();
    state.store.preferences.visible = state.visible;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.store));
      updateUi();
      if (message) showToast(message);
      return true;
    } catch (error) {
      console.error("MORPHORA could not save drawings.", error);
      showToast("Drawing could not be saved on this device.", true);
      A11y.announce("Drawing could not be saved on this device.", { assertive: true });
      return false;
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createId() {
    if (window.crypto?.randomUUID) return `stroke-${window.crypto.randomUUID()}`;
    return `stroke-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function cloneStrokes(strokes) {
    return strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point }))
    }));
  }

  function getViewId() {
    return Atlas.getActiveViewId?.() || state.activeViewId || null;
  }

  function getViewStrokes(viewId = getViewId(), { create = true } = {}) {
    if (!viewId) return [];
    if (!Array.isArray(state.store.views[viewId])) {
      if (!create) return [];
      state.store.views[viewId] = [];
    }
    return state.store.views[viewId];
  }

  function getHistory(viewId = getViewId()) {
    if (!viewId) return { undo: [], redo: [] };
    if (!state.histories.has(viewId)) state.histories.set(viewId, { undo: [], redo: [] });
    return state.histories.get(viewId);
  }

  function pushUndoSnapshot(snapshot = null, viewId = getViewId()) {
    if (!viewId) return;
    const history = getHistory(viewId);
    history.undo.push(snapshot || cloneStrokes(getViewStrokes(viewId)));
    if (history.undo.length > MAX_HISTORY) history.undo.shift();
    history.redo = [];
    updateHistoryButtons();
  }

  function undo() {
    const viewId = getViewId();
    const history = getHistory(viewId);
    if (!viewId || !history.undo.length) return;
    history.redo.push(cloneStrokes(getViewStrokes(viewId)));
    state.store.views[viewId] = history.undo.pop();
    saveStore("Drawing change undone");
    requestRender();
  }

  function redo() {
    const viewId = getViewId();
    const history = getHistory(viewId);
    if (!viewId || !history.redo.length) return;
    history.undo.push(cloneStrokes(getViewStrokes(viewId)));
    state.store.views[viewId] = history.redo.pop();
    saveStore("Drawing change restored");
    requestRender();
  }

  function updateHistoryButtons() {
    const history = getHistory();
    elements.undo.disabled = history.undo.length === 0;
    elements.redo.disabled = history.redo.length === 0;
  }

  function showToast(message, assertive = false) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    elements.toast.dataset.type = assertive ? "error" : "status";
    state.toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 1800);
  }

  function imageBounds() {
    const item = viewer.world?.getItemAt?.(0);
    return item?.getBounds?.(true) || new OpenSeadragon.Rect(0, 0, 1, 1);
  }

  function pointInsideImage(point) {
    const bounds = imageBounds();
    return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
  }

  function clampToImage(point) {
    const bounds = imageBounds();
    return {
      x: clamp(point.x, bounds.x, bounds.x + bounds.width),
      y: clamp(point.y, bounds.y, bounds.y + bounds.height)
    };
  }

  function eventToViewportPoint(event) {
    if (!viewer.viewport || !event?.position) return null;
    const point = viewer.viewport.pointFromPixel(event.position, true);
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    return clampToImage(point);
  }

  function screenPixelsToViewportWidth(pixels) {
    if (!viewer.viewport) return 0.002;
    const center = new OpenSeadragon.Point(viewer.container.clientWidth / 2, viewer.container.clientHeight / 2);
    const a = viewer.viewport.pointFromPixel(center, true);
    const b = viewer.viewport.pointFromPixel(new OpenSeadragon.Point(center.x + pixels, center.y), true);
    return Math.max(0.00005, Math.abs(b.x - a.x));
  }

  function viewportWidthToScreenPixels(width) {
    if (!viewer.viewport) return 1;
    const a = viewer.viewport.pixelFromPoint(new OpenSeadragon.Point(0, 0), true);
    const b = viewer.viewport.pixelFromPoint(new OpenSeadragon.Point(width, 0), true);
    return clamp(Math.abs(b.x - a.x), 0.75, 120);
  }

  function pixelDistanceBetweenPoints(a, b) {
    const pa = viewer.viewport.pixelFromPoint(new OpenSeadragon.Point(a.x, a.y), true);
    const pb = viewer.viewport.pixelFromPoint(new OpenSeadragon.Point(b.x, b.y), true);
    return Math.hypot(pb.x - pa.x, pb.y - pa.y);
  }

  function simplifyPoints(points, epsilon) {
    if (points.length <= 2) return points;

    function segmentDistance(point, start, end) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
      const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
      const x = start.x + t * dx;
      const y = start.y + t * dy;
      return Math.hypot(point.x - x, point.y - y);
    }

    function rdp(values) {
      if (values.length <= 2) return values;
      const first = values[0];
      const last = values[values.length - 1];
      let maxDistance = 0;
      let index = 0;
      for (let i = 1; i < values.length - 1; i += 1) {
        const distance = segmentDistance(values[i], first, last);
        if (distance > maxDistance) {
          maxDistance = distance;
          index = i;
        }
      }
      if (maxDistance <= epsilon) return [first, last];
      const left = rdp(values.slice(0, index + 1));
      const right = rdp(values.slice(index));
      return [...left.slice(0, -1), ...right];
    }

    return rdp(points);
  }

  function effectiveVisible() {
    return state.visible && !state.quizHidden;
  }

  function requestRender() {
    if (state.renderFrame !== null) return;
    state.renderFrame = window.requestAnimationFrame(() => {
      state.renderFrame = null;
      render();
    });
  }

  function pathData(points) {
    if (!points.length) return "";
    const pixels = points.map((point) => viewer.viewport.pixelFromPoint(new OpenSeadragon.Point(point.x, point.y), true));
    if (pixels.length === 1) {
      const p = pixels[0];
      return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} L ${(p.x + 0.01).toFixed(2)} ${p.y.toFixed(2)}`;
    }
    return pixels.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  }

  function makePath(stroke, isPreview = false) {
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", pathData(stroke.points));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", stroke.color);
    path.setAttribute("stroke-width", String(viewportWidthToScreenPixels(stroke.width)));
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("opacity", String(stroke.opacity ?? 1));
    path.setAttribute("vector-effect", "non-scaling-stroke");
    path.classList.add("morphora-drawing-stroke", `tool-${stroke.tool}`);
    if (isPreview) path.classList.add("is-preview");
    return path;
  }

  function render() {
    const width = Math.max(1, viewer.container.clientWidth || 1);
    const height = Math.max(1, viewer.container.clientHeight || 1);
    drawingLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);
    drawingLayer.setAttribute("width", String(width));
    drawingLayer.setAttribute("height", String(height));

    if (!effectiveVisible() || !getViewId() || viewer.world?.getItemCount?.() === 0) {
      drawingLayer.replaceChildren();
      drawingLayer.hidden = true;
      return;
    }

    const fragment = document.createDocumentFragment();
    getViewStrokes(getViewId(), { create: false }).forEach((stroke) => {
      fragment.appendChild(makePath(stroke));
    });
    if (state.currentStroke?.points?.length) fragment.appendChild(makePath(state.currentStroke, true));
    drawingLayer.replaceChildren(fragment);
    drawingLayer.hidden = false;
  }

  function setTool(tool, { announce = true } = {}) {
    if (!["pen", "highlighter", "eraser", "pan"].includes(tool)) return;
    state.tool = tool;
    state.currentStroke = null;
    state.erasing = false;
    elements.toolButtons.forEach((button) => {
      const active = button.dataset.drawingTool === tool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.body.dataset.drawingTool = tool;
    elements.hint.textContent = tool === "pan"
      ? "Pan mode: drag to move the image, scroll or pinch to zoom."
      : tool === "eraser"
        ? "Stroke eraser: drag across a line to remove the whole stroke."
        : "Draw with mouse, stylus or one finger. Hold Space or choose Pan to navigate.";
    if (announce) A11y.announce(`${tool === "highlighter" ? "Highlighter" : tool[0].toUpperCase() + tool.slice(1)} tool selected.`);
  }

  function setColor(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    state.color = color;
    elements.colorInput.value = color;
    elements.colorPresets.querySelectorAll("[data-drawing-color]").forEach((button) => {
      const active = button.dataset.drawingColor.toLowerCase() === color.toLowerCase();
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function setSize(size) {
    state.size = clamp(Number(size) || DEFAULT_SIZE, 2, 24);
    elements.sizeInput.value = String(state.size);
    elements.sizeOutput.value = String(state.size);
    elements.sizeOutput.textContent = String(state.size);
  }

  function closeAtlasMenu() {
    document.getElementById("menuPanel")?.classList.remove("open");
    document.getElementById("menuBtn")?.setAttribute("aria-expanded", "false");
    document.getElementById("mobileMoreButton")?.setAttribute("aria-expanded", "false");
  }

  function setActive(active, { restoreLabels = true, announce = true } = {}) {
    const enabled = Boolean(active);
    if (enabled === state.active) return;

    if (enabled) {
      if (state.quizLocked) {
        A11y.announce("Drawing is hidden during an active quiz session.");
        return;
      }
      if (!Atlas.getActiveViewData?.() || viewer.world?.getItemCount?.() === 0) {
        A11y.announce("Open an anatomical image before drawing.", { assertive: true });
        return;
      }
      if (window.MorphoraStudy?.getMode?.() !== "explore") {
        window.MorphoraStudy?.setMode?.("explore");
      }
      state.previousLabelsVisible = Atlas.getLabelsVisible?.() ?? true;
      if (!state.visible) {
        state.visible = true;
        saveStore("");
      }
      Atlas.setLabelsVisible?.(false, { announce: false });
      Atlas.setDrawingActive?.(true);
      state.active = true;
      elements.toolbar.hidden = false;
      elements.toolbar.setAttribute("aria-hidden", "false");
      elements.toggleMode.classList.add("active");
      elements.toggleMode.setAttribute("aria-pressed", "true");
      elements.toggleMode.setAttribute("aria-expanded", "true");
      document.body.classList.add("drawing-mode-active");
      closeAtlasMenu();
      setTool(state.tool, { announce: false });
      requestRender();
      if (announce) A11y.announce("Drawing mode started. Drag on the anatomical image to draw. Hold Space or choose Pan to navigate.");
    } else {
      finishPointerGesture({ save: true });
      state.active = false;
      state.spaceHeld = false;
      elements.toolbar.hidden = true;
      elements.toolbar.setAttribute("aria-hidden", "true");
      elements.toggleMode.classList.remove("active");
      elements.toggleMode.setAttribute("aria-pressed", "false");
      elements.toggleMode.setAttribute("aria-expanded", "false");
      document.body.classList.remove("drawing-mode-active", "drawing-space-pan");
      delete document.body.dataset.drawingTool;
      Atlas.setDrawingActive?.(false);
      if (restoreLabels) Atlas.setLabelsVisible?.(state.previousLabelsVisible, { announce: false });
      if (announce) A11y.announce("Drawing mode closed.");
    }
    updateUi();
  }

  function setVisible(visible, { persist = true, announce = true } = {}) {
    state.visible = Boolean(visible);
    if (persist) saveStore("");
    updateUi();
    requestRender();
    if (announce) A11y.announce(state.visible ? "Personal drawings shown." : "Personal drawings hidden.");
  }

  function prepareForQuiz() {
    setActive(false, { restoreLabels: false, announce: false });
    state.quizHidden = true;
    state.quizLocked = true;
    updateUi();
    requestRender();
  }

  function restoreAfterQuiz() {
    state.quizHidden = false;
    state.quizLocked = false;
    updateUi();
    requestRender();
  }

  function updateUi() {
    const count = getViewStrokes(getViewId(), { create: false }).length;
    elements.countBadge.textContent = String(count);
    elements.countBadge.setAttribute("aria-label", count === 0 ? "No drawing strokes in this view" : `${count} drawing stroke${count === 1 ? "" : "s"} in this view`);
    elements.toggleMode.disabled = state.quizLocked;
    elements.menuVisibility.disabled = state.quizLocked;
    elements.menuVisibility.setAttribute("aria-disabled", String(state.quizLocked));
    elements.toggleMode.setAttribute("aria-disabled", String(state.quizLocked));

    const shown = effectiveVisible();
    elements.menuVisibility.setAttribute("aria-pressed", String(shown));
    elements.menuVisibility.textContent = shown ? "◉ Drawings visible" : "○ Drawings hidden";
    elements.visibility.setAttribute("aria-pressed", String(shown));
    elements.visibility.innerHTML = shown ? "◉ <span>Hide</span>" : "○ <span>Show</span>";
    elements.clear.disabled = count === 0;
    elements.exportButton.disabled = totalStrokeCount() === 0;
    updateHistoryButtons();
  }

  function totalStrokeCount() {
    return Object.values(state.store.views).reduce((sum, strokes) => sum + (Array.isArray(strokes) ? strokes.length : 0), 0);
  }

  function beginStroke(point) {
    const tool = state.tool;
    const sizePx = tool === "highlighter" ? state.size * HIGHLIGHTER_MULTIPLIER : state.size;
    state.currentStroke = {
      id: createId(),
      tool,
      color: state.color,
      width: screenPixelsToViewportWidth(sizePx),
      opacity: tool === "highlighter" ? 0.28 : 1,
      points: [point],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    requestRender();
  }

  function appendStrokePoint(point) {
    if (!state.currentStroke) return;
    const points = state.currentStroke.points;
    const last = points[points.length - 1];
    if (last && pixelDistanceBetweenPoints(last, point) < 1.5) return;
    if (points.length >= MAX_POINTS_PER_STROKE) return;
    points.push(point);
    state.currentStroke.updatedAt = new Date().toISOString();
    requestRender();
  }

  function commitCurrentStroke() {
    if (!state.currentStroke) return false;
    const viewId = getViewId();
    if (!viewId) {
      state.currentStroke = null;
      return false;
    }

    const stroke = state.currentStroke;
    state.currentStroke = null;
    if (!stroke.points.length) return false;

    const epsilon = screenPixelsToViewportWidth(0.75);
    stroke.points = simplifyPoints(stroke.points, epsilon).slice(0, MAX_POINTS_PER_STROKE);
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      stroke.points.push({ x: p.x + stroke.width * 0.02, y: p.y });
    }

    const strokes = getViewStrokes(viewId);
    pushUndoSnapshot(cloneStrokes(strokes), viewId);
    strokes.push(stroke);
    if (strokes.length > MAX_STROKES_PER_VIEW) strokes.splice(0, strokes.length - MAX_STROKES_PER_VIEW);
    saveStore("Drawing saved");
    requestRender();
    return true;
  }

  function distancePointToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
  }

  function strokeHitsPixel(stroke, pixel, radius) {
    const pixels = stroke.points.map((point) => viewer.viewport.pixelFromPoint(new OpenSeadragon.Point(point.x, point.y), true));
    if (pixels.length === 1) return Math.hypot(pixel.x - pixels[0].x, pixel.y - pixels[0].y) <= radius;
    for (let index = 1; index < pixels.length; index += 1) {
      if (distancePointToSegment(pixel, pixels[index - 1], pixels[index]) <= radius) return true;
    }
    return false;
  }

  function eraseAt(point) {
    const viewId = getViewId();
    if (!viewId) return;
    const strokes = getViewStrokes(viewId);
    if (!strokes.length) return;
    const pixel = viewer.viewport.pixelFromPoint(new OpenSeadragon.Point(point.x, point.y), true);
    const radius = Math.max(10, state.size * 1.6);
    const remaining = strokes.filter((stroke) => !strokeHitsPixel(stroke, pixel, radius));
    if (remaining.length === strokes.length) return;
    state.store.views[viewId] = remaining;
    state.eraserChanged = true;
    requestRender();
    updateUi();
  }

  function finishPointerGesture({ save = true } = {}) {
    if (state.currentStroke) {
      if (save) commitCurrentStroke();
      else {
        state.currentStroke = null;
        requestRender();
      }
    }
    if (state.erasing) {
      if (state.eraserChanged && state.eraseSnapshot) {
        pushUndoSnapshot(state.eraseSnapshot);
        if (save) saveStore("Stroke erased");
      }
      state.erasing = false;
      state.eraserChanged = false;
      state.eraseSnapshot = null;
    }
  }

  function onCanvasPress(event) {
    if (!state.active || state.tool === "pan" || state.spaceHeld) return;
    const point = eventToViewportPoint(event);
    if (!point || !pointInsideImage(point)) return;
    event.preventDefaultAction = true;
    if (state.tool === "eraser") {
      state.erasing = true;
      state.eraserChanged = false;
      state.eraseSnapshot = cloneStrokes(getViewStrokes());
      eraseAt(point);
      return;
    }
    beginStroke(point);
  }

  function onCanvasDrag(event) {
    if (!state.active || state.tool === "pan" || state.spaceHeld) return;
    const point = eventToViewportPoint(event);
    if (!point) return;
    event.preventDefaultAction = true;
    if (state.tool === "eraser") {
      if (!state.erasing) {
        state.erasing = true;
        state.eraserChanged = false;
        state.eraseSnapshot = cloneStrokes(getViewStrokes());
      }
      eraseAt(point);
      return;
    }
    if (!state.currentStroke) beginStroke(point);
    else appendStrokePoint(point);
  }

  function onCanvasRelease(event) {
    if (!state.active || state.tool === "pan" || state.spaceHeld) return;
    event.preventDefaultAction = true;
    finishPointerGesture({ save: true });
  }

  function onCanvasPinch() {
    if (!state.active) return;
    // A second finger means navigation. Discard the uncommitted one-finger mark
    // and let OpenSeadragon own the pinch gesture.
    if (state.currentStroke) {
      state.currentStroke = null;
      requestRender();
    }
    if (state.erasing && state.eraseSnapshot && state.eraserChanged) {
      state.store.views[getViewId()] = state.eraseSnapshot;
      state.erasing = false;
      state.eraserChanged = false;
      state.eraseSnapshot = null;
      requestRender();
    }
  }

  function clearCurrentView() {
    const viewId = getViewId();
    const strokes = getViewStrokes(viewId, { create: false });
    if (!viewId || !strokes.length) return;
    if (!window.confirm(`Clear all ${strokes.length} drawing stroke${strokes.length === 1 ? "" : "s"} from this anatomical view?`)) return;
    pushUndoSnapshot(cloneStrokes(strokes), viewId);
    state.store.views[viewId] = [];
    saveStore("Drawing cleared from this view");
    requestRender();
  }

  function exportDrawings() {
    const payload = {
      product: "MORPHORA",
      kind: "personal-drawings",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      drawings: state.store.views
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `morphora-drawings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    A11y.announce("Personal drawing backup exported.");
  }

  async function importDrawings(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const rawViews = parsed?.drawings || parsed?.views;
      if (!rawViews || typeof rawViews !== "object") throw new Error("This file does not contain MORPHORA drawing data.");

      const imported = normalizeStore({ views: rawViews });
      const replace = window.confirm("Replace all current MORPHORA drawings with this backup? Select Cancel to merge the imported drawings instead.");
      if (replace) {
        state.store.views = imported.views;
        state.histories.clear();
      } else {
        Object.entries(imported.views).forEach(([viewId, incoming]) => {
          const current = getViewStrokes(viewId);
          const knownIds = new Set(current.map((stroke) => stroke.id));
          incoming.forEach((stroke) => {
            if (!knownIds.has(stroke.id)) current.push(stroke);
          });
          if (current.length > MAX_STROKES_PER_VIEW) current.splice(0, current.length - MAX_STROKES_PER_VIEW);
        });
      }
      saveStore(replace ? "Drawing backup restored" : "Drawing backup merged");
      requestRender();
      A11y.announce("Personal drawing backup imported.");
    } catch (error) {
      console.error("MORPHORA could not import drawings.", error);
      showToast("Could not import drawing backup.", true);
      A11y.announce("The drawing backup could not be imported.", { assertive: true });
    } finally {
      elements.importInput.value = "";
    }
  }

  elements.toggleMode.addEventListener("click", () => setActive(!state.active));
  elements.menuVisibility.addEventListener("click", () => setVisible(!state.visible));
  elements.toolButtons.forEach((button) => button.addEventListener("click", () => setTool(button.dataset.drawingTool)));
  elements.colorPresets.addEventListener("click", (event) => {
    const button = event.target.closest("[data-drawing-color]");
    if (button) setColor(button.dataset.drawingColor);
  });
  elements.colorInput.addEventListener("input", () => setColor(elements.colorInput.value));
  elements.sizeInput.addEventListener("input", () => setSize(elements.sizeInput.value));
  elements.undo.addEventListener("click", undo);
  elements.redo.addEventListener("click", redo);
  elements.visibility.addEventListener("click", () => setVisible(!state.visible));
  elements.clear.addEventListener("click", clearCurrentView);
  elements.exportButton.addEventListener("click", exportDrawings);
  elements.importButton.addEventListener("click", () => elements.importInput.click());
  elements.importInput.addEventListener("change", () => importDrawings(elements.importInput.files?.[0]));
  elements.done.addEventListener("click", () => setActive(false));

  viewer.addHandler("canvas-press", onCanvasPress);
  viewer.addHandler("canvas-drag", onCanvasDrag);
  viewer.addHandler("canvas-release", onCanvasRelease);
  viewer.addHandler("canvas-pinch", onCanvasPinch);
  viewer.addHandler("animation", requestRender);
  viewer.addHandler("resize", requestRender);
  viewer.addHandler("open", requestRender);

  document.addEventListener("morphora:view-change", (event) => {
    state.activeViewId = event.detail?.viewId || Atlas.getActiveViewId?.() || null;
    state.currentStroke = null;
    state.erasing = false;
    state.eraseSnapshot = null;
    if (state.active) Atlas.setLabelsVisible?.(false, { announce: false });
    updateUi();
    requestRender();
  });

  document.addEventListener("morphora:atlas-deactivate", () => {
    setActive(false, { restoreLabels: false, announce: false });
    state.activeViewId = null;
    drawingLayer.replaceChildren();
    drawingLayer.hidden = true;
    updateUi();
  });

  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName;
    const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || document.activeElement?.isContentEditable;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && state.active && !isTyping) {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y" && state.active && !isTyping) {
      event.preventDefault();
      redo();
      return;
    }
    if (isTyping) return;

    if (event.code === "Space" && state.active && !event.repeat) {
      state.spaceHeld = true;
      document.body.classList.add("drawing-space-pan");
      event.preventDefault();
      return;
    }

    if (event.key === "Escape" && state.active) {
      event.preventDefault();
      setActive(false);
      return;
    }

    if (!state.active && event.key.toLowerCase() === "d" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      setActive(true);
      return;
    }

    if (!state.active) return;
    const key = event.key.toLowerCase();
    if (key === "p") setTool("pen");
    else if (key === "h") setTool("highlighter");
    else if (key === "e") setTool("eraser");
    else if (key === "v") setTool("pan");
    else if (event.key === "[") setSize(state.size - 1);
    else if (event.key === "]") setSize(state.size + 1);
  });

  document.addEventListener("keyup", (event) => {
    if (event.code !== "Space" || !state.active) return;
    state.spaceHeld = false;
    document.body.classList.remove("drawing-space-pan");
  });

  window.addEventListener("blur", () => {
    if (!state.active) return;
    state.spaceHeld = false;
    document.body.classList.remove("drawing-space-pan");
    finishPointerGesture({ save: true });
  });

  window.MorphoraDrawing = Object.freeze({
    setActive,
    isActive: () => state.active,
    setVisible,
    isVisible: () => state.visible,
    prepareForQuiz,
    restoreAfterQuiz,
    render: requestRender,
    getDrawings: () => state.store
  });

  setColor(DEFAULT_COLOR);
  setSize(DEFAULT_SIZE);
  setTool("pen", { announce: false });
  updateUi();
  requestRender();
});
