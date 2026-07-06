document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // VIEWER
  // =========================
  const viewer = OpenSeadragon({
    id: "viewer",
    prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
    showNavigationControl: true,
    showNavigator: true,
    navigatorPosition: "BOTTOM_LEFT"
  });

  // =========================
  // DATA
  // =========================
  const atlas = {
    skull1: { image: "images/lateral.jpg", labels: [
      { name: "Arco Cigomático", info: "El Arco Cigomático...", x: 0.395, y: 0.315 },
      { name: "Agujero Infraorbitario", info: "El agujero infraorbitario...", x: 0.655, y: 0.360 },
      { name: "Proceso Cigomático", info: "El Proceso Cigomático...", x: 0.275, y: 0.360 },
      { name: "Hueso Cigomático", info: "El Hueso Cigomático...", x: 0.455, y: 0.335},
      { name: "Fisura Temporocigomática", info: "La Fisura Temporocigomática...", x: 0.322, y: 0.335},
      { name: "Hueso Parietal", info: "El Hueso Parietal...", x: 0.165, y: 0.285},
      { name: "Sutura Escamosa", info: "La Sutura Escamosa...", x: 0.197, y: 0.305},
      { name: "Sutura Coronal", info: "La Sutura Coronal...", x: 0.261, y: 0.227}
    ]},
    skull2: { image: "images/ventral.jpg", labels: [
      { name: "Agujero Magno", info: "El agujero magno...", x: 0.145, y: 0.33}
    ]},
    skull3: { image: "images/dorsal.jpg", labels: [
      { name: "Hueso Frontal", info: "El hueso frontal...", x: 0.35, y: 0.45 }
    ]},
    skull4: { image: "images/craneal.jpg", labels: [
      { name: "Lamina Cribosa", info: "La lamina cribosa...", x: 0.35, y: 0.45 }
    ]}
  };

  let currentOverlays = [];
  let labelsVisible = true;
  let addingAnnotation = false;

  // =========================
  // LOAD IMAGE
  // =========================
  function loadImage(key) {
    const data = atlas[key];

    viewer.open({ type: "image", url: data.image });

    viewer.addOnceHandler("open", () => {

      currentOverlays.forEach(el => el.remove());
      currentOverlays = [];

      data.labels.forEach(labelData => {

        const el = document.createElement("div");
        el.className = "label-anchor";

        const isLeft = labelData.x < 0.5;
        el.classList.add(isLeft ? "left" : "right");

        el.innerHTML = `
          <svg class="connector-svg">
            <line class="connector-line"/>
          </svg>
          <div class="anchor-dot"></div>
          <div class="label-box">
            <span class="label-text">${labelData.name}</span>
          </div>
        `;

        viewer.addOverlay({
          element: el,
          location: new OpenSeadragon.Point(labelData.x, labelData.y),
          placement: OpenSeadragon.Placement.CENTER
        });

        currentOverlays.push(el);

        // Prevent zoom interaction
        ["pointerdown","pointerup","click"].forEach(evt =>
          el.addEventListener(evt, e => e.stopPropagation())
        );

        el.addEventListener("click", () => {
          showInfo(labelData.name, labelData.info);
        });

        // Stable connector render
        requestAnimationFrame(() => updateConnectorLine(el));
      });

      applyLabelVisibility();
    });
  }

  // =========================
  // CONNECTOR
  // =========================
  function updateConnectorLine(el) {
    const dot = el.querySelector(".anchor-dot");
    const labelBox = el.querySelector(".label-box");
    const svg = el.querySelector(".connector-svg");
    const line = el.querySelector(".connector-line");

    if (!dot || !labelBox) return;

    const dotX = dot.offsetLeft;
    const dotY = dot.offsetTop;

    const labelX = labelBox.offsetLeft + labelBox.offsetWidth / 2;
    const labelY = labelBox.offsetTop + labelBox.offsetHeight / 2;

    const width = Math.max(dotX, labelX) + 50;
    const height = Math.max(dotY, labelY) + 50;

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    line.setAttribute("x1", dotX);
    line.setAttribute("y1", dotY);
    line.setAttribute("x2", labelX);
    line.setAttribute("y2", labelY);
  }

  // =========================
  // ZOOM + UPDATE
  // =========================
  viewer.addHandler("animation", () => {
    const zoom = viewer.viewport.getZoom();

    currentOverlays.forEach(el => {

      if (el.classList.contains("label-anchor")) {
        updateConnectorLine(el);

        // Zoom-based visibility
        el.style.opacity = zoom > 1.2 && labelsVisible ? "1" : "0";
      }
    });
  });

  // =========================
  // INFO PANEL
  // =========================
  function showInfo(title, text) {
    document.getElementById("infoTitle").innerText = title;
    document.getElementById("infoText").innerText = text || "No info available";
    document.getElementById("infoPanel").classList.add("show");
  }

  // =========================
  // LABEL TOGGLE
  // =========================
  function applyLabelVisibility() {
    currentOverlays.forEach(el => {
      if (el.classList.contains("label-anchor")) {
        el.style.display = labelsVisible ? "block" : "none";
      }
    });
  }

  document.getElementById("toggleLabels").addEventListener("click", () => {
    labelsVisible = !labelsVisible;
    applyLabelVisibility();
  });

  // =========================
  // CONTROLS
  // =========================
  document.getElementById("resetView").addEventListener("click", () => {
    viewer.viewport.goHome();
  });

  document.getElementById("toggleTheme").addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
  });

  document.querySelectorAll("[data-img]").forEach(btn => {
    btn.addEventListener("click", () => {
      loadImage(btn.dataset.img);
    });
  });

  // =========================
  // SEARCH (FIXED)
  // =========================
  document.getElementById("searchInput").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();

    currentOverlays.forEach(el => {
      if (!el.classList.contains("label-anchor")) return;

      const text = el.querySelector(".label-text").innerText.toLowerCase();
      el.style.display = (text.includes(query) && labelsVisible) ? "block" : "none";
    });
  });

  // =========================
  // ANNOTATIONS
  // =========================
  document.getElementById("addAnnotation").addEventListener("click", () => {
    addingAnnotation = !addingAnnotation;
  });

  const pastelColors = ["#fff8a0","#ffb6b9","#a0ffc8","#a0c8ff","#ffd1a0","#e0a0ff"];

  const colorPanel = document.createElement("div");
  colorPanel.className = "color-picker-panel";

  pastelColors.forEach(c => {
    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.background = c;

    swatch.addEventListener("click", () => {
      colorPanel.style.display = "none";

      const title = prompt("Enter annotation title:");
      if (!title) return;

      const desc = prompt("Enter description:");

      addAnnotation({
        title,
        desc,
        x: colorPanel.viewportPoint.x,
        y: colorPanel.viewportPoint.y,
        color: c
      });
    });

    colorPanel.appendChild(swatch);
  });

  document.body.appendChild(colorPanel);

  viewer.addHandler("canvas-click", (event) => {
    if (!addingAnnotation) return;

    if (event.originalEvent.target.closest(".label-anchor, .user-annotation")) return;

    const vp = viewer.viewport.pointFromPixel(event.position);

    colorPanel.viewportPoint = vp;
    colorPanel.style.display = "flex";
    colorPanel.style.left = event.originalEvent.clientX + "px";
    colorPanel.style.top = event.originalEvent.clientY + "px";

    addingAnnotation = false;
  });

  function addAnnotation(a) {
    const el = document.createElement("div");
    el.className = "user-annotation";
    el.style.background = a.color;

    el.innerHTML = `
      <div class="annotation-title">${a.title}</div>
      <div class="annotation-text">${a.desc || ""}</div>
      <div class="annotation-delete">🗑️</div>
    `;

    viewer.addOverlay({
      element: el,
      location: new OpenSeadragon.Point(a.x, a.y)
    });

    currentOverlays.push(el);

    el.querySelector(".annotation-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      el.remove();
    });

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      showInfo(a.title, a.desc);
    });
  }

  // =========================
  // MENU
  // =========================
  const menuBtn = document.getElementById("menuBtn");
  const menuPanel = document.getElementById("menuPanel");

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menuPanel.classList.toggle("open");
  });

  // =========================
  // GLOBAL CLICK HANDLER
  // =========================
  document.addEventListener("click", (e) => {

    // Close info
    if (!e.target.closest(".label-anchor, .user-annotation, #infoPanel")) {
      document.getElementById("infoPanel").classList.remove("show");
    }

    // Close menu
    if (!e.target.closest(".menu")) {
      menuPanel.classList.remove("open");
    }
  });

  // =========================
  // INIT
  // =========================
  loadImage("skull1");

});
