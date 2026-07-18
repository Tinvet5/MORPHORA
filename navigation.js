document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const CATALOG_PATH = "data/catalog.json";
  const SUPPORTED_SCHEMA_VERSION = 1;
  const DEFAULT_ROUTE = "#/species";
  const LAST_ATLAS_ROUTE_KEY = "morphora:last-atlas-route";
  const THEME_KEY = "morphora:theme";

  const elements = {
    body: document.body,
    brandHomeButton: document.getElementById("brandHomeButton"),
    breadcrumbNav: document.getElementById("breadcrumbNav"),
    headerThemeToggle: document.getElementById("headerThemeToggle"),
    libraryToggle: document.getElementById("libraryToggle"),
    speciesScreen: document.getElementById("speciesScreen"),
    speciesHubScreen: document.getElementById("speciesHubScreen"),
    atlasScreen: document.getElementById("atlasScreen"),
    speciesGrid: document.getElementById("speciesGrid"),
    speciesCount: document.getElementById("speciesCount"),
    exploreDogButton: document.getElementById("exploreDogButton"),
    continueButton: document.getElementById("continueButton"),
    backToSpeciesButton: document.getElementById("backToSpeciesButton"),
    speciesHeroMonogram: document.getElementById("speciesHeroMonogram"),
    speciesHubTitle: document.getElementById("speciesHubTitle"),
    speciesHubScientific: document.getElementById("speciesHubScientific"),
    speciesHubSummary: document.getElementById("speciesHubSummary"),
    speciesHubStats: document.getElementById("speciesHubStats"),
    systemsGrid: document.getElementById("systemsGrid"),
    collectionsGrid: document.getElementById("collectionsGrid"),
    drawerBackdrop: document.getElementById("drawerBackdrop"),
    libraryDrawer: document.getElementById("libraryDrawer"),
    closeLibraryDrawer: document.getElementById("closeLibraryDrawer"),
    libraryContent: document.getElementById("libraryContent")
  };

  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length > 0) {
    console.error(`MORPHORA navigation could not start. Missing: ${missing.join(", ")}`);
    return;
  }

  let catalog = null;
  const speciesDataCache = new Map();
  const collectionManifestCache = new Map();
  let currentRoute = null;
  let currentViewLabel = "";
  let pendingAtlasViewId = null;
  let atlasApiReady = Boolean(window.MorphoraAtlas);
  let lastDrawerTrigger = null;

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function requireData(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function fetchJson(path) {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status} while requesting ${path}.`);
    try {
      return await response.json();
    } catch (error) {
      throw new Error(`Invalid JSON in ${path}: ${error.message}`);
    }
  }

  function validateCatalog(data) {
    requireData(isPlainObject(data), "Catalog must be an object.");
    requireData(data.schemaVersion === SUPPORTED_SCHEMA_VERSION, "Unsupported catalog schema version.");
    requireData(Array.isArray(data.species) && data.species.length > 0, "Catalog needs species entries.");

    const ids = new Set();
    const species = data.species.map((entry, index) => {
      requireData(isPlainObject(entry), `Species entry ${index + 1} must be an object.`);
      requireData(typeof entry.id === "string" && entry.id.trim(), `Species entry ${index + 1} requires id.`);
      requireData(!ids.has(entry.id), `Duplicate species id: ${entry.id}.`);
      requireData(typeof entry.name === "string" && entry.name.trim(), `Species ${entry.id} requires name.`);
      requireData(["available", "coming-soon"].includes(entry.status), `Invalid status for ${entry.id}.`);
      if (entry.status === "available") {
        requireData(typeof entry.dataPath === "string" && entry.dataPath.trim(), `Available species ${entry.id} requires dataPath.`);
      }
      ids.add(entry.id);
      return { ...entry, id: entry.id.trim(), name: entry.name.trim() };
    });

    return { ...data, species };
  }

  function validateSpeciesData(data, speciesEntry) {
    requireData(isPlainObject(data), `Species data for ${speciesEntry.id} must be an object.`);
    requireData(data.schemaVersion === SUPPORTED_SCHEMA_VERSION, `Unsupported species schema for ${speciesEntry.id}.`);
    requireData(data.id === speciesEntry.id, `Species id mismatch for ${speciesEntry.id}.`);
    requireData(Array.isArray(data.systems), `Species ${speciesEntry.id} requires systems array.`);
    return data;
  }

  async function getSpeciesData(speciesId) {
    if (speciesDataCache.has(speciesId)) return speciesDataCache.get(speciesId);
    const entry = catalog && catalog.species.find((item) => item.id === speciesId);
    if (!entry || entry.status !== "available") throw new Error(`Species ${speciesId} is not available.`);
    const data = validateSpeciesData(await fetchJson(entry.dataPath), entry);
    speciesDataCache.set(speciesId, data);
    return data;
  }

  async function getCollectionManifest(path) {
    if (collectionManifestCache.has(path)) return collectionManifestCache.get(path);
    const manifest = await fetchJson(path);
    collectionManifestCache.set(path, manifest);
    return manifest;
  }

  function normalizeHash(hash = window.location.hash) {
    const value = hash && hash.startsWith("#/") ? hash : DEFAULT_ROUTE;
    return value.replace(/\/+$/, "") || DEFAULT_ROUTE;
  }

  function parseRoute(hash = window.location.hash) {
    const normalized = normalizeHash(hash);
    const segments = normalized.slice(2).split("/").filter(Boolean);

    if (segments[0] !== "species") return { type: "species-list", hash: DEFAULT_ROUTE, segments: ["species"] };
    if (segments.length === 1) return { type: "species-list", hash: normalized, segments };
    if (segments.length === 2) {
      return { type: "species-hub", hash: normalized, speciesId: segments[1], segments };
    }

    return {
      type: "atlas",
      hash: normalized,
      speciesId: segments[1],
      systemId: segments[2],
      collectionId: segments[3],
      viewId: segments[4] || null,
      segments
    };
  }

  function navigate(hash, { replace = false } = {}) {
    const destination = normalizeHash(hash);
    if (replace) {
      history.replaceState(null, "", destination);
      handleRoute();
      return;
    }
    if (window.location.hash === destination) {
      handleRoute();
    } else {
      window.location.hash = destination;
    }
  }

  function setScreen(name) {
    const screens = {
      species: elements.speciesScreen,
      hub: elements.speciesHubScreen,
      atlas: elements.atlasScreen
    };

    elements.speciesScreen.hidden = name !== "species";
    elements.speciesHubScreen.hidden = name !== "hub";
    elements.atlasScreen.classList.toggle("is-active", name === "atlas");
    elements.atlasScreen.setAttribute("aria-hidden", String(name !== "atlas"));

    elements.body.dataset.screen = name;
  }

  function createMonogram(speciesId, name) {
    const span = document.createElement("span");
    span.className = `species-monogram species-monogram-${speciesId}`;
    span.textContent = name.charAt(0).toUpperCase();
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  function createStatusBadge(status) {
    const badge = document.createElement("span");
    badge.className = `status-badge status-${status}`;
    badge.textContent = status === "available" ? "Available" : "Coming soon";
    return badge;
  }

  function renderSpeciesCards() {
    elements.speciesGrid.replaceChildren();
    const availableCount = catalog.species.filter((item) => item.status === "available").length;
    elements.speciesCount.textContent = `${availableCount} available · ${catalog.species.length} planned`;

    catalog.species.forEach((species) => {
      const card = document.createElement(species.status === "available" ? "button" : "article");
      card.className = `species-card species-${species.id}`;
      card.dataset.speciesId = species.id;

      if (card instanceof HTMLButtonElement) {
        card.type = "button";
        card.addEventListener("click", () => navigate(`#/species/${species.id}`));
        card.setAttribute("aria-label", `Open ${species.name} anatomy`);
      } else {
        card.setAttribute("aria-disabled", "true");
      }

      const visual = document.createElement("div");
      visual.className = "species-card-visual";
      visual.appendChild(createMonogram(species.id, species.name));

      const copy = document.createElement("div");
      copy.className = "species-card-copy";

      const titleRow = document.createElement("div");
      titleRow.className = "species-card-title-row";
      const title = document.createElement("h3");
      title.textContent = species.name;
      titleRow.append(title, createStatusBadge(species.status));

      const scientific = document.createElement("p");
      scientific.className = "scientific-name";
      scientific.textContent = species.scientificName || "";

      const description = document.createElement("p");
      description.className = "species-card-description";
      description.textContent = species.description || "";

      copy.append(titleRow, scientific, description);

      const arrow = document.createElement("span");
      arrow.className = "species-card-arrow";
      arrow.textContent = species.status === "available" ? "→" : "○";
      arrow.setAttribute("aria-hidden", "true");

      card.append(visual, copy, arrow);
      elements.speciesGrid.appendChild(card);
    });
  }

  function countAvailableCollections(speciesData) {
    return speciesData.systems.reduce((total, system) => {
      return total + (system.collections || []).filter((collection) => collection.status === "available").length;
    }, 0);
  }

  function countPlannedSystems(speciesData) {
    return speciesData.systems.length;
  }

  async function renderSpeciesHub(speciesId) {
    const entry = catalog.species.find((species) => species.id === speciesId);
    if (!entry || entry.status !== "available") {
      navigate(DEFAULT_ROUTE, { replace: true });
      return;
    }

    elements.systemsGrid.innerHTML = '<div class="navigation-loading-card"><span class="navigation-spinner" aria-hidden="true"></span><span>Loading anatomical systems…</span></div>';
    elements.collectionsGrid.replaceChildren();

    try {
      const data = await getSpeciesData(speciesId);
      elements.speciesHeroMonogram.textContent = data.name.charAt(0).toUpperCase();
      elements.speciesHeroMonogram.className = `species-hero-monogram species-monogram-${speciesId}`;
      elements.speciesHubTitle.textContent = data.name;
      elements.speciesHubScientific.textContent = data.scientificName || "";
      elements.speciesHubSummary.textContent = data.summary || "";

      elements.speciesHubStats.replaceChildren();
      const stats = [
        [String(countAvailableCollections(data)), "available collection"],
        [String(countPlannedSystems(data)), "anatomical systems"]
      ];
      stats.forEach(([value, label]) => {
        const item = document.createElement("div");
        item.className = "species-stat";
        item.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
        elements.speciesHubStats.appendChild(item);
      });

      elements.systemsGrid.replaceChildren();
      elements.collectionsGrid.replaceChildren();

      data.systems.forEach((system) => {
        const card = document.createElement("article");
        card.className = `system-card${system.status === "available" ? " is-available" : " is-coming-soon"}`;

        const icon = document.createElement("div");
        icon.className = "system-icon";
        icon.textContent = system.name.charAt(0);
        icon.setAttribute("aria-hidden", "true");

        const copy = document.createElement("div");
        const top = document.createElement("div");
        top.className = "system-title-row";
        const title = document.createElement("h3");
        title.textContent = system.name;
        top.append(title, createStatusBadge(system.status));
        const description = document.createElement("p");
        description.textContent = system.description || "";
        copy.append(top, description);
        card.append(icon, copy);
        elements.systemsGrid.appendChild(card);

        (system.collections || []).forEach((collection) => {
          if (collection.status !== "available") return;
          const collectionCard = document.createElement("button");
          collectionCard.type = "button";
          collectionCard.className = "collection-card";
          collectionCard.addEventListener("click", () => navigate(collection.route));

          const collectionVisual = document.createElement("div");
          collectionVisual.className = "collection-visual";
          collectionVisual.innerHTML = '<span class="collection-skull-symbol" aria-hidden="true">SK</span>';

          const collectionCopy = document.createElement("div");
          collectionCopy.className = "collection-copy";
          const eyebrow = document.createElement("p");
          eyebrow.className = "section-eyebrow";
          eyebrow.textContent = system.name;
          const collectionTitle = document.createElement("h3");
          collectionTitle.textContent = collection.name;
          const collectionDescription = document.createElement("p");
          collectionDescription.textContent = collection.description || "";
          const collectionMeta = document.createElement("span");
          collectionMeta.className = "collection-meta";
          collectionMeta.textContent = "5 views · Interactive labels";
          collectionCopy.append(eyebrow, collectionTitle, collectionDescription, collectionMeta);

          const arrow = document.createElement("span");
          arrow.className = "collection-arrow";
          arrow.textContent = "Open atlas →";

          collectionCard.append(collectionVisual, collectionCopy, arrow);
          elements.collectionsGrid.appendChild(collectionCard);
        });
      });
    } catch (error) {
      console.error("Could not render species hub.", error);
      elements.systemsGrid.innerHTML = `<div class="navigation-error-card"><strong>Species data unavailable</strong><p>${error.message}</p><button type="button" id="retrySpeciesData">Retry</button></div>`;
      document.getElementById("retrySpeciesData")?.addEventListener("click", () => {
        speciesDataCache.delete(speciesId);
        renderSpeciesHub(speciesId);
      });
    }
  }

  function createBreadcrumb(label, hash = null, current = false) {
    const item = hash ? document.createElement("button") : document.createElement("span");
    item.className = `breadcrumb-item${current ? " is-current" : ""}`;
    item.textContent = label;
    if (hash) {
      item.type = "button";
      item.addEventListener("click", () => navigate(hash));
    }
    if (current) item.setAttribute("aria-current", "page");
    return item;
  }

  function renderBreadcrumbs(route, extraViewLabel = currentViewLabel) {
    elements.breadcrumbNav.replaceChildren();
    const crumbs = [];

    if (route.type === "species-list") {
      crumbs.push(createBreadcrumb("Species", null, true));
    } else if (route.type === "species-hub") {
      crumbs.push(createBreadcrumb("Species", DEFAULT_ROUTE));
      crumbs.push(createBreadcrumb(route.speciesId === "dog" ? "Dog" : route.speciesId, null, true));
    } else {
      crumbs.push(createBreadcrumb("Species", DEFAULT_ROUTE));
      crumbs.push(createBreadcrumb("Dog", "#/species/dog"));
      crumbs.push(createBreadcrumb("Skeletal system", "#/species/dog"));
      crumbs.push(createBreadcrumb("Canine skull", "#/species/dog/skeletal/skull"));
      if (extraViewLabel) crumbs.push(createBreadcrumb(extraViewLabel, null, true));
    }

    crumbs.forEach((crumb, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "breadcrumb-separator";
        separator.textContent = "›";
        separator.setAttribute("aria-hidden", "true");
        elements.breadcrumbNav.appendChild(separator);
      }
      elements.breadcrumbNav.appendChild(crumb);
    });
  }

  function getSpeciesEntry(speciesId) {
    return catalog?.species.find((entry) => entry.id === speciesId) || null;
  }

  async function renderLibraryDrawer() {
    elements.libraryContent.replaceChildren();

    const homeButton = document.createElement("button");
    homeButton.type = "button";
    homeButton.className = "drawer-home-button";
    homeButton.innerHTML = '<span aria-hidden="true">⌂</span><span><strong>Species library</strong><small>Browse all available animals</small></span>';
    homeButton.addEventListener("click", () => navigate(DEFAULT_ROUTE));
    elements.libraryContent.appendChild(homeButton);

    const speciesSection = document.createElement("section");
    speciesSection.className = "drawer-section";
    speciesSection.innerHTML = '<p class="drawer-section-title">Species</p>';

    catalog.species.forEach((species) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "drawer-species-row";
      row.dataset.drawerSpecies = species.id;
      row.disabled = species.status !== "available";
      row.appendChild(createMonogram(species.id, species.name));
      const copy = document.createElement("span");
      copy.innerHTML = `<strong>${species.name}</strong><small>${species.status === "available" ? species.scientificName : "Coming soon"}</small>`;
      row.appendChild(copy);
      if (species.status === "available") row.addEventListener("click", () => navigate(`#/species/${species.id}`));
      speciesSection.appendChild(row);
    });
    elements.libraryContent.appendChild(speciesSection);

    try {
      const dogData = await getSpeciesData("dog");
      const anatomySection = document.createElement("section");
      anatomySection.className = "drawer-section";
      anatomySection.innerHTML = '<p class="drawer-section-title">Dog anatomy</p>';

      for (const system of dogData.systems) {
        const systemBlock = document.createElement("div");
        systemBlock.className = "drawer-system";
        const systemHeader = document.createElement("div");
        systemHeader.className = "drawer-system-header";
        systemHeader.innerHTML = `<span>${system.name}</span><small>${system.status === "available" ? "" : "Coming soon"}</small>`;
        systemBlock.appendChild(systemHeader);

        for (const collection of system.collections || []) {
          const collectionButton = document.createElement("button");
          collectionButton.type = "button";
          collectionButton.className = "drawer-collection-button";
          collectionButton.disabled = collection.status !== "available";
          collectionButton.textContent = collection.name;
          if (collection.status === "available") {
            collectionButton.addEventListener("click", () => navigate(collection.route));
            try {
              const manifest = await getCollectionManifest(collection.manifestPath);
              const viewList = document.createElement("div");
              viewList.className = "drawer-view-list";
              manifest.views.forEach((view) => {
                const viewButton = document.createElement("button");
                viewButton.type = "button";
                viewButton.className = "drawer-view-button";
                viewButton.dataset.drawerViewId = view.id;
                viewButton.textContent = view.buttonLabel;
                viewButton.addEventListener("click", () => openAtlasView(view.id));
                viewList.appendChild(viewButton);
              });
              systemBlock.append(collectionButton, viewList);
              continue;
            } catch (error) {
              console.warn(`Could not load drawer views for ${collection.name}.`, error);
            }
          }
          systemBlock.appendChild(collectionButton);
        }
        anatomySection.appendChild(systemBlock);
      }
      elements.libraryContent.appendChild(anatomySection);
    } catch (error) {
      console.warn("Could not load dog navigation in drawer.", error);
    }

    syncDrawerActiveState();
  }

  function syncDrawerActiveState() {
    if (!currentRoute) return;
    elements.libraryContent.querySelectorAll(".is-active").forEach((node) => node.classList.remove("is-active"));
    elements.libraryContent.querySelector(`[data-drawer-species="${currentRoute.speciesId || ""}"]`)?.classList.add("is-active");
    if (currentRoute.viewId) {
      elements.libraryContent.querySelector(`[data-drawer-view-id="${currentRoute.viewId}"]`)?.classList.add("is-active");
    }
  }

  function openLibraryDrawer(trigger = elements.libraryToggle) {
    lastDrawerTrigger = trigger;
    elements.libraryDrawer.classList.add("is-open");
    elements.libraryDrawer.setAttribute("aria-hidden", "false");
    elements.drawerBackdrop.hidden = false;
    elements.libraryToggle.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => elements.closeLibraryDrawer.focus());
  }

  function closeLibraryDrawer({ restoreFocus = false } = {}) {
    elements.libraryDrawer.classList.remove("is-open");
    elements.libraryDrawer.setAttribute("aria-hidden", "true");
    elements.drawerBackdrop.hidden = true;
    elements.libraryToggle.setAttribute("aria-expanded", "false");
    if (restoreFocus && lastDrawerTrigger?.isConnected) lastDrawerTrigger.focus();
    lastDrawerTrigger = null;
  }

  function applyTheme(theme) {
    const light = theme === "light";
    elements.body.classList.toggle("light-mode", light);
    elements.headerThemeToggle.innerHTML = `<span aria-hidden="true">${light ? "☀" : "☾"}</span>`;
    elements.headerThemeToggle.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    localStorage.setItem(THEME_KEY, light ? "light" : "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#f4f7fb" : "#07101f");
  }

  function toggleTheme() {
    applyTheme(elements.body.classList.contains("light-mode") ? "dark" : "light");
  }

  function updateContinueButton() {
    const lastRoute = localStorage.getItem(LAST_ATLAS_ROUTE_KEY);
    elements.continueButton.hidden = !lastRoute;
    if (lastRoute) {
      elements.continueButton.onclick = () => navigate(lastRoute);
    }
  }

  function getViewLabelFromId(viewId) {
    if (!viewId) return "";
    const compact = viewId.replace(/^dog-skull-/, "");
    return compact.charAt(0).toUpperCase() + compact.slice(1);
  }

  async function activateAtlasRoute(route) {
    if (route.speciesId !== "dog" || route.systemId !== "skeletal" || route.collectionId !== "skull") {
      navigate("#/species/dog", { replace: true });
      return;
    }

    pendingAtlasViewId = route.viewId;
    currentViewLabel = getViewLabelFromId(route.viewId);
    renderBreadcrumbs(route);
    localStorage.setItem(LAST_ATLAS_ROUTE_KEY, route.hash);
    updateContinueButton();

    if (window.MorphoraAtlas) {
      atlasApiReady = true;
      await window.MorphoraAtlas.openView(route.viewId || null);
      pendingAtlasViewId = null;
    }
  }

  async function handleRoute() {
    if (!catalog) return;
    const route = parseRoute();
    currentRoute = route;
    closeLibraryDrawer();

    if (route.type !== "atlas" && window.MorphoraAtlas) {
      window.MorphoraAtlas.deactivate();
    }

    if (route.type === "species-list") {
      setScreen("species");
      currentViewLabel = "";
      renderBreadcrumbs(route);
      document.title = "Species library · MORPHORA";
      window.scrollTo(0, 0);
    } else if (route.type === "species-hub") {
      const entry = getSpeciesEntry(route.speciesId);
      if (!entry || entry.status !== "available") {
        navigate(DEFAULT_ROUTE, { replace: true });
        return;
      }
      setScreen("hub");
      currentViewLabel = "";
      renderBreadcrumbs(route);
      document.title = `${entry.name} anatomy · MORPHORA`;
      await renderSpeciesHub(route.speciesId);
      elements.speciesHubScreen.scrollTo(0, 0);
    } else {
      setScreen("atlas");
      document.title = `${getViewLabelFromId(route.viewId) || "Canine skull"} · MORPHORA`;
      await activateAtlasRoute(route);
    }

    syncDrawerActiveState();
  }

  function openAtlasView(viewId) {
    navigate(`#/species/dog/skeletal/skull/${viewId}`);
  }

  async function initializeNavigation() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const systemPrefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
    applyTheme(savedTheme || (systemPrefersLight ? "light" : "dark"));
    updateContinueButton();

    try {
      catalog = validateCatalog(await fetchJson(CATALOG_PATH));
      renderSpeciesCards();
      await renderLibraryDrawer();
      if (!window.location.hash || !window.location.hash.startsWith("#/")) {
        history.replaceState(null, "", DEFAULT_ROUTE);
      }
      await handleRoute();
    } catch (error) {
      console.error("MORPHORA could not load species navigation.", error);
      elements.speciesGrid.innerHTML = `<div class="navigation-error-card"><strong>Species library unavailable</strong><p>${error.message}</p><button type="button" id="retryCatalog">Retry</button></div>`;
      document.getElementById("retryCatalog")?.addEventListener("click", () => window.location.reload());
    }
  }

  window.MorphoraNavigation = {
    navigate,
    openAtlasView,
    toggleTheme,
    closeLibraryDrawer
  };

  elements.brandHomeButton.addEventListener("click", () => navigate(DEFAULT_ROUTE));
  elements.exploreDogButton.addEventListener("click", () => navigate("#/species/dog"));
  elements.backToSpeciesButton.addEventListener("click", () => navigate(DEFAULT_ROUTE));
  elements.headerThemeToggle.addEventListener("click", toggleTheme);
  elements.libraryToggle.addEventListener("click", () => {
    if (elements.libraryDrawer.classList.contains("is-open")) closeLibraryDrawer({ restoreFocus: true });
    else openLibraryDrawer(elements.libraryToggle);
  });
  elements.closeLibraryDrawer.addEventListener("click", () => closeLibraryDrawer({ restoreFocus: true }));
  elements.drawerBackdrop.addEventListener("click", () => closeLibraryDrawer({ restoreFocus: true }));

  window.addEventListener("hashchange", handleRoute);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.libraryDrawer.classList.contains("is-open")) {
      closeLibraryDrawer({ restoreFocus: true });
    }
  });

  document.addEventListener("morphora:atlas-ready", async () => {
    atlasApiReady = true;
    if (currentRoute?.type === "atlas") {
      await window.MorphoraAtlas.openView(pendingAtlasViewId || currentRoute.viewId || null);
      pendingAtlasViewId = null;
    }
  });

  document.addEventListener("morphora:view-change", (event) => {
    const { viewId, label } = event.detail || {};
    if (!viewId || currentRoute?.type !== "atlas") return;
    currentViewLabel = label || getViewLabelFromId(viewId);

    if (currentRoute.viewId !== viewId) {
      const target = `#/species/dog/skeletal/skull/${viewId}`;
      history.replaceState(null, "", target);
      currentRoute = parseRoute(target);
      localStorage.setItem(LAST_ATLAS_ROUTE_KEY, target);
      updateContinueButton();
    }

    renderBreadcrumbs(currentRoute, currentViewLabel);
    document.title = `${currentViewLabel} · MORPHORA`;
    syncDrawerActiveState();
  });

  initializeNavigation();
});
