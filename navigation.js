document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // =========================
  // NAVIGATION CONFIGURATION
  // =========================
  const APP_VERSION = "4.1.0";
  const CATALOG_PATH = "data/catalog.json";
  const SUPPORTED_SCHEMA_VERSION = 1;
  const DEFAULT_ROUTE = "#/species";
  const LAST_ATLAS_ROUTE_KEY = "morphora:last-atlas-route";
  const THEME_KEY = "morphora:theme";

  // =========================
  // DOM REFERENCES
  // =========================
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
    console.error(
      `MORPHORA navigation could not start. Missing: ${missing.join(", ")}`
    );
    return;
  }

  // =========================
  // APPLICATION STATE
  // =========================
  let catalog = null;
  let currentRoute = null;
  let currentAtlasContext = null;
  let currentViewLabel = "";
  let pendingAtlasViewId = null;
  let lastDrawerTrigger = null;

  const speciesDataCache = new Map();
  const collectionManifestCache = new Map();

  // =========================
  // DATA HELPERS + VALIDATION
  // =========================
  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function requireData(condition, message) {
    if (!condition) throw new Error(message);
  }

  function versionedPath(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}v=${APP_VERSION}`;
  }

  async function fetchJson(path) {
    const response = await fetch(versionedPath(path), {
      headers: { Accept: "application/json" }
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

  function validateCatalog(data) {
    requireData(isPlainObject(data), "Catalog must be an object.");
    requireData(
      data.schemaVersion === SUPPORTED_SCHEMA_VERSION,
      "Unsupported catalog schema version."
    );
    requireData(
      Array.isArray(data.species) && data.species.length > 0,
      "Catalog needs species entries."
    );

    const ids = new Set();
    const species = data.species.map((entry, index) => {
      requireData(
        isPlainObject(entry),
        `Species entry ${index + 1} must be an object.`
      );
      requireData(
        typeof entry.id === "string" && entry.id.trim(),
        `Species entry ${index + 1} requires id.`
      );
      requireData(!ids.has(entry.id), `Duplicate species id: ${entry.id}.`);
      requireData(
        typeof entry.name === "string" && entry.name.trim(),
        `Species ${entry.id} requires name.`
      );
      requireData(
        ["available", "coming-soon"].includes(entry.status),
        `Invalid status for ${entry.id}.`
      );

      if (entry.status === "available") {
        requireData(
          typeof entry.dataPath === "string" && entry.dataPath.trim(),
          `Available species ${entry.id} requires dataPath.`
        );
      }

      ids.add(entry.id);

      return {
        ...entry,
        id: entry.id.trim(),
        name: entry.name.trim()
      };
    });

    return { ...data, species };
  }

  function validateSpeciesData(data, speciesEntry) {
    requireData(
      isPlainObject(data),
      `Species data for ${speciesEntry.id} must be an object.`
    );
    requireData(
      data.schemaVersion === SUPPORTED_SCHEMA_VERSION,
      `Unsupported species schema for ${speciesEntry.id}.`
    );
    requireData(
      data.id === speciesEntry.id,
      `Species id mismatch for ${speciesEntry.id}.`
    );
    requireData(
      Array.isArray(data.systems),
      `Species ${speciesEntry.id} requires systems array.`
    );

    const systemIds = new Set();
    const systems = data.systems.map((system, systemIndex) => {
      requireData(
        isPlainObject(system),
        `System ${systemIndex + 1} in ${speciesEntry.id} must be an object.`
      );
      requireData(
        typeof system.id === "string" && system.id.trim(),
        `System ${systemIndex + 1} in ${speciesEntry.id} requires id.`
      );
      requireData(
        !systemIds.has(system.id),
        `Duplicate system id “${system.id}” in ${speciesEntry.id}.`
      );
      requireData(
        typeof system.name === "string" && system.name.trim(),
        `System ${system.id} requires name.`
      );
      requireData(
        ["available", "coming-soon"].includes(system.status),
        `Invalid system status for ${system.id}.`
      );
      requireData(
        Array.isArray(system.collections),
        `System ${system.id} requires collections array.`
      );

      systemIds.add(system.id);
      const collectionIds = new Set();

      const collections = system.collections.map((collection, collectionIndex) => {
        requireData(
          isPlainObject(collection),
          `Collection ${collectionIndex + 1} in ${system.id} must be an object.`
        );
        requireData(
          typeof collection.id === "string" && collection.id.trim(),
          `Collection ${collectionIndex + 1} in ${system.id} requires id.`
        );
        requireData(
          !collectionIds.has(collection.id),
          `Duplicate collection id “${collection.id}” in ${system.id}.`
        );
        requireData(
          typeof collection.name === "string" && collection.name.trim(),
          `Collection ${collection.id} requires name.`
        );
        requireData(
          ["available", "coming-soon"].includes(collection.status),
          `Invalid collection status for ${collection.id}.`
        );

        if (collection.status === "available") {
          requireData(
            typeof collection.manifestPath === "string" &&
              collection.manifestPath.trim(),
            `Available collection ${collection.id} requires manifestPath.`
          );
        }

        collectionIds.add(collection.id);
        return { ...collection };
      });

      return { ...system, collections };
    });

    return { ...data, systems };
  }

  function validateCollectionManifest(data, path) {
    requireData(
      isPlainObject(data),
      `Collection manifest ${path} must be an object.`
    );
    requireData(
      data.schemaVersion === SUPPORTED_SCHEMA_VERSION,
      `Unsupported collection schema in ${path}.`
    );
    requireData(
      typeof data.defaultViewId === "string" && data.defaultViewId.trim(),
      `Collection manifest ${path} requires defaultViewId.`
    );
    requireData(
      Array.isArray(data.views) && data.views.length > 0,
      `Collection manifest ${path} requires at least one view.`
    );

    const ids = new Set();
    const views = data.views.map((view, index) => {
      requireData(
        isPlainObject(view),
        `View entry ${index + 1} in ${path} must be an object.`
      );
      requireData(
        typeof view.id === "string" && view.id.trim(),
        `View entry ${index + 1} in ${path} requires id.`
      );
      requireData(!ids.has(view.id), `Duplicate view id “${view.id}” in ${path}.`);
      requireData(
        typeof view.buttonLabel === "string" && view.buttonLabel.trim(),
        `View ${view.id} requires buttonLabel.`
      );
      requireData(
        typeof view.dataPath === "string" && view.dataPath.trim(),
        `View ${view.id} requires dataPath.`
      );

      ids.add(view.id);
      return { ...view };
    });

    requireData(
      ids.has(data.defaultViewId),
      `Default view “${data.defaultViewId}” is not registered in ${path}.`
    );

    return { ...data, views };
  }

  async function getSpeciesData(speciesId) {
    if (speciesDataCache.has(speciesId)) {
      return speciesDataCache.get(speciesId);
    }

    const entry = catalog?.species.find((item) => item.id === speciesId);

    if (!entry || entry.status !== "available") {
      throw new Error(`Species ${speciesId} is not available.`);
    }

    const data = validateSpeciesData(await fetchJson(entry.dataPath), entry);
    speciesDataCache.set(speciesId, data);
    return data;
  }

  async function getCollectionManifest(path) {
    if (collectionManifestCache.has(path)) {
      return collectionManifestCache.get(path);
    }

    const manifest = validateCollectionManifest(await fetchJson(path), path);
    collectionManifestCache.set(path, manifest);
    return manifest;
  }

  // =========================
  // ROUTING HELPERS
  // =========================
  function normalizeHash(hash = window.location.hash) {
    const value = hash && hash.startsWith("#/") ? hash : DEFAULT_ROUTE;
    return value.replace(/\/+$/, "") || DEFAULT_ROUTE;
  }

  function parseRoute(hash = window.location.hash) {
    const normalized = normalizeHash(hash);
    const segments = normalized.slice(2).split("/").filter(Boolean);

    if (segments[0] !== "species") {
      return {
        type: "species-list",
        hash: DEFAULT_ROUTE,
        segments: ["species"]
      };
    }

    if (segments.length === 1) {
      return { type: "species-list", hash: normalized, segments };
    }

    if (segments.length === 2) {
      return {
        type: "species-hub",
        hash: normalized,
        speciesId: segments[1],
        segments
      };
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

  function getCollectionRoute(speciesId, systemId, collection) {
    return collection.route ||
      `#/species/${speciesId}/${systemId}/${collection.id}`;
  }

  function getRouteBase(route) {
    if (!route || route.type !== "atlas") return "";
    return `#/species/${route.speciesId}/${route.systemId}/${route.collectionId}`;
  }

  async function resolveAtlasContext(route) {
    if (!route || route.type !== "atlas") return null;

    const speciesEntry = catalog?.species.find(
      (entry) => entry.id === route.speciesId
    );

    if (!speciesEntry || speciesEntry.status !== "available") return null;

    const speciesData = await getSpeciesData(route.speciesId);
    const system = speciesData.systems.find(
      (entry) => entry.id === route.systemId
    );

    if (!system) return null;

    const collection = (system.collections || []).find(
      (entry) => entry.id === route.collectionId
    );

    if (
      !collection ||
      collection.status !== "available" ||
      !collection.manifestPath
    ) {
      return null;
    }

    const manifest = await getCollectionManifest(collection.manifestPath);

    return {
      speciesEntry,
      speciesData,
      system,
      collection,
      manifest,
      baseRoute: getCollectionRoute(route.speciesId, route.systemId, collection)
    };
  }

  function getViewLabel(viewId, context = currentAtlasContext) {
    if (!viewId) return "";

    const view = context?.manifest?.views?.find((entry) => entry.id === viewId);
    if (view) return view.buttonLabel;

    return viewId
      .split("-")
      .slice(-2)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" · ");
  }

  // =========================
  // SCREEN + BASIC COMPONENTS
  // =========================
  function setScreen(name) {
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

  function createCollectionCode(collection) {
    if (collection.shortCode) return collection.shortCode;

    return collection.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  }

  // =========================
  // SPECIES LIBRARY
  // =========================
  function renderSpeciesCards() {
    elements.speciesGrid.replaceChildren();

    const availableCount = catalog.species.filter(
      (item) => item.status === "available"
    ).length;

    elements.speciesCount.textContent =
      `${availableCount} available · ${catalog.species.length} planned`;

    catalog.species.forEach((species) => {
      const card = document.createElement(
        species.status === "available" ? "button" : "article"
      );

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
      return total + (system.collections || []).filter(
        (collection) => collection.status === "available"
      ).length;
    }, 0);
  }

  async function createCollectionCard(speciesId, system, collection) {
    const collectionCard = document.createElement("button");
    collectionCard.type = "button";
    collectionCard.className = "collection-card";

    const route = getCollectionRoute(speciesId, system.id, collection);
    collectionCard.addEventListener("click", () => navigate(route));

    const collectionVisual = document.createElement("div");
    collectionVisual.className = "collection-visual";

    const code = document.createElement("span");
    code.className = "collection-skull-symbol";
    code.textContent = createCollectionCode(collection);
    code.setAttribute("aria-hidden", "true");
    collectionVisual.appendChild(code);

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
    collectionMeta.textContent = "Loading views…";

    try {
      const manifest = await getCollectionManifest(collection.manifestPath);
      const count = manifest.views.length;
      collectionMeta.textContent =
        `${count} ${count === 1 ? "view" : "views"} · Interactive atlas`;
    } catch (error) {
      console.warn(`Could not read collection metadata for ${collection.name}.`, error);
      collectionMeta.textContent = "Collection data needs attention";
    }

    collectionCopy.append(
      eyebrow,
      collectionTitle,
      collectionDescription,
      collectionMeta
    );

    const arrow = document.createElement("span");
    arrow.className = "collection-arrow";
    arrow.textContent = "Open atlas →";

    collectionCard.append(collectionVisual, collectionCopy, arrow);
    return collectionCard;
  }

  async function renderSpeciesHub(speciesId) {
    const entry = catalog.species.find((species) => species.id === speciesId);

    if (!entry || entry.status !== "available") {
      navigate(DEFAULT_ROUTE, { replace: true });
      return;
    }

    elements.systemsGrid.innerHTML =
      '<div class="navigation-loading-card"><span class="navigation-spinner" aria-hidden="true"></span><span>Loading anatomical systems…</span></div>';
    elements.collectionsGrid.replaceChildren();

    try {
      const data = await getSpeciesData(speciesId);

      elements.speciesHeroMonogram.textContent = data.name.charAt(0).toUpperCase();
      elements.speciesHeroMonogram.className =
        `species-hero-monogram species-monogram-${speciesId}`;
      elements.speciesHubTitle.textContent = data.name;
      elements.speciesHubScientific.textContent = data.scientificName || "";
      elements.speciesHubSummary.textContent = data.summary || "";

      elements.speciesHubStats.replaceChildren();
      const stats = [
        [String(countAvailableCollections(data)), "available collections"],
        [String(data.systems.length), "anatomical systems"]
      ];

      stats.forEach(([value, label]) => {
        const item = document.createElement("div");
        item.className = "species-stat";

        const strong = document.createElement("strong");
        strong.textContent = value;

        const span = document.createElement("span");
        span.textContent = label;

        item.append(strong, span);
        elements.speciesHubStats.appendChild(item);
      });

      elements.systemsGrid.replaceChildren();
      elements.collectionsGrid.replaceChildren();

      for (const system of data.systems) {
        const card = document.createElement("article");
        card.className =
          `system-card${system.status === "available" ? " is-available" : " is-coming-soon"}`;

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

        for (const collection of system.collections || []) {
          if (collection.status !== "available") continue;

          const collectionCard = await createCollectionCard(
            speciesId,
            system,
            collection
          );
          elements.collectionsGrid.appendChild(collectionCard);
        }
      }
    } catch (error) {
      console.error("Could not render species hub.", error);
      elements.systemsGrid.innerHTML =
        `<div class="navigation-error-card"><strong>Species data unavailable</strong><p>${error.message}</p><button type="button" id="retrySpeciesData">Retry</button></div>`;

      document.getElementById("retrySpeciesData")?.addEventListener("click", () => {
        speciesDataCache.delete(speciesId);
        renderSpeciesHub(speciesId);
      });
    }
  }

  // =========================
  // BREADCRUMBS
  // =========================
  function createBreadcrumb(label, hash = null, current = false) {
    const item = hash
      ? document.createElement("button")
      : document.createElement("span");

    item.className = `breadcrumb-item${current ? " is-current" : ""}`;
    item.textContent = label;

    if (hash) {
      item.type = "button";
      item.addEventListener("click", () => navigate(hash));
    }

    if (current) item.setAttribute("aria-current", "page");
    return item;
  }

  function renderBreadcrumbs(
    route,
    context = currentAtlasContext,
    viewLabel = currentViewLabel
  ) {
    elements.breadcrumbNav.replaceChildren();
    const crumbs = [];

    if (route.type === "species-list") {
      crumbs.push(createBreadcrumb("Species", null, true));
    } else if (route.type === "species-hub") {
      const speciesEntry = catalog?.species.find(
        (entry) => entry.id === route.speciesId
      );

      crumbs.push(createBreadcrumb("Species", DEFAULT_ROUTE));
      crumbs.push(
        createBreadcrumb(speciesEntry?.name || route.speciesId, null, true)
      );
    } else if (context) {
      crumbs.push(createBreadcrumb("Species", DEFAULT_ROUTE));
      crumbs.push(
        createBreadcrumb(
          context.speciesEntry.name,
          `#/species/${route.speciesId}`
        )
      );
      crumbs.push(
        createBreadcrumb(
          context.system.name,
          `#/species/${route.speciesId}`
        )
      );

      if (viewLabel) {
        crumbs.push(createBreadcrumb(context.collection.name, context.baseRoute));
        crumbs.push(createBreadcrumb(viewLabel, null, true));
      } else {
        crumbs.push(createBreadcrumb(context.collection.name, null, true));
      }
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

  // =========================
  // LIBRARY DRAWER
  // =========================
  async function renderLibraryDrawer() {
    elements.libraryContent.replaceChildren();

    const homeButton = document.createElement("button");
    homeButton.type = "button";
    homeButton.className = "drawer-home-button";
    homeButton.innerHTML =
      '<span aria-hidden="true">⌂</span><span><strong>Species library</strong><small>Browse all available animals</small></span>';
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
      const strong = document.createElement("strong");
      strong.textContent = species.name;
      const small = document.createElement("small");
      small.textContent =
        species.status === "available"
          ? species.scientificName || ""
          : "Coming soon";
      copy.append(strong, small);
      row.appendChild(copy);

      if (species.status === "available") {
        row.addEventListener("click", () => navigate(`#/species/${species.id}`));
      }

      speciesSection.appendChild(row);
    });

    elements.libraryContent.appendChild(speciesSection);

    for (const speciesEntry of catalog.species.filter(
      (entry) => entry.status === "available"
    )) {
      try {
        const speciesData = await getSpeciesData(speciesEntry.id);
        const anatomySection = document.createElement("section");
        anatomySection.className = "drawer-section";

        const title = document.createElement("p");
        title.className = "drawer-section-title";
        title.textContent = `${speciesData.name} anatomy`;
        anatomySection.appendChild(title);

        for (const system of speciesData.systems) {
          const systemBlock = document.createElement("div");
          systemBlock.className = "drawer-system";

          const systemHeader = document.createElement("div");
          systemHeader.className = "drawer-system-header";

          const systemName = document.createElement("span");
          systemName.textContent = system.name;
          const status = document.createElement("small");
          status.textContent =
            system.status === "available" ? "" : "Coming soon";
          systemHeader.append(systemName, status);
          systemBlock.appendChild(systemHeader);

          for (const collection of system.collections || []) {
            const collectionButton = document.createElement("button");
            collectionButton.type = "button";
            collectionButton.className = "drawer-collection-button";
            collectionButton.disabled = collection.status !== "available";
            collectionButton.textContent = collection.name;

            const collectionRoute = getCollectionRoute(
              speciesEntry.id,
              system.id,
              collection
            );
            collectionButton.dataset.drawerCollectionRoute = collectionRoute;

            if (collection.status === "available") {
              collectionButton.addEventListener("click", () =>
                navigate(collectionRoute)
              );

              try {
                const manifest = await getCollectionManifest(
                  collection.manifestPath
                );
                const viewList = document.createElement("div");
                viewList.className = "drawer-view-list";

                manifest.views.forEach((view) => {
                  const viewRoute = `${collectionRoute}/${view.id}`;
                  const viewButton = document.createElement("button");
                  viewButton.type = "button";
                  viewButton.className = "drawer-view-button";
                  viewButton.dataset.drawerViewRoute = viewRoute;
                  viewButton.textContent = view.buttonLabel;
                  viewButton.addEventListener("click", () => navigate(viewRoute));
                  viewList.appendChild(viewButton);
                });

                systemBlock.append(collectionButton, viewList);
                continue;
              } catch (error) {
                console.warn(
                  `Could not load drawer views for ${collection.name}.`,
                  error
                );
              }
            }

            systemBlock.appendChild(collectionButton);
          }

          anatomySection.appendChild(systemBlock);
        }

        elements.libraryContent.appendChild(anatomySection);
      } catch (error) {
        console.warn(
          `Could not load ${speciesEntry.name} navigation in drawer.`,
          error
        );
      }
    }

    syncDrawerActiveState();
  }

  function syncDrawerActiveState() {
    if (!currentRoute) return;

    elements.libraryContent
      .querySelectorAll(".is-active")
      .forEach((node) => node.classList.remove("is-active"));

    elements.libraryContent
      .querySelector(
        `[data-drawer-species="${currentRoute.speciesId || ""}"]`
      )
      ?.classList.add("is-active");

    if (currentRoute.type === "atlas") {
      const baseRoute = getRouteBase(currentRoute);

      elements.libraryContent
        .querySelector(`[data-drawer-collection-route="${baseRoute}"]`)
        ?.classList.add("is-active");

      if (currentRoute.viewId) {
        elements.libraryContent
          .querySelector(`[data-drawer-view-route="${currentRoute.hash}"]`)
          ?.classList.add("is-active");
      }
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

    if (restoreFocus && lastDrawerTrigger?.isConnected) {
      lastDrawerTrigger.focus();
    }

    lastDrawerTrigger = null;
  }

  // =========================
  // THEME + CONTINUE STUDYING
  // =========================
  function applyTheme(theme) {
    const light = theme === "light";
    elements.body.classList.toggle("light-mode", light);
    document.documentElement.classList.toggle("preload-light-theme", light);
    elements.headerThemeToggle.innerHTML =
      `<span aria-hidden="true">${light ? "☀" : "☾"}</span>`;
    elements.headerThemeToggle.setAttribute(
      "aria-label",
      light ? "Switch to dark theme" : "Switch to light theme"
    );
    localStorage.setItem(THEME_KEY, light ? "light" : "dark");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", light ? "#f5f3ee" : "#001030");
  }

  function toggleTheme() {
    applyTheme(
      elements.body.classList.contains("light-mode") ? "dark" : "light"
    );
  }

  function updateContinueButton() {
    const lastRoute = localStorage.getItem(LAST_ATLAS_ROUTE_KEY);
    elements.continueButton.hidden = !lastRoute;

    if (lastRoute) {
      elements.continueButton.onclick = () => navigate(lastRoute);
    }
  }

  // =========================
  // ROUTE ACTIVATION
  // =========================
  async function activateAtlasRoute(route) {
    const context = await resolveAtlasContext(route);

    if (!context) {
      navigate(`#/species/${route.speciesId}`, { replace: true });
      return false;
    }

    currentAtlasContext = context;

    const hasRequestedView =
      route.viewId &&
      context.manifest.views.some((entry) => entry.id === route.viewId);

    pendingAtlasViewId = hasRequestedView ? route.viewId : null;
    currentViewLabel = getViewLabel(pendingAtlasViewId, context);
    renderBreadcrumbs(route, context, currentViewLabel);

    localStorage.setItem(LAST_ATLAS_ROUTE_KEY, route.hash);
    updateContinueButton();

    if (window.MorphoraAtlas) {
      await window.MorphoraAtlas.openCollection(
        context.collection.manifestPath,
        pendingAtlasViewId
      );
      pendingAtlasViewId = null;
    }

    return true;
  }

  async function handleRoute() {
    if (!catalog) return;

    const route = parseRoute();
    currentRoute = route;
    closeLibraryDrawer();

    if (route.type !== "atlas") {
      currentAtlasContext = null;
      currentViewLabel = "";

      if (window.MorphoraAtlas) {
        window.MorphoraAtlas.deactivate();
      }
    }

    if (route.type === "species-list") {
      setScreen("species");
      renderBreadcrumbs(route);
      document.title = "Species library · MORPHORA";
      window.scrollTo(0, 0);
    } else if (route.type === "species-hub") {
      const entry = catalog.species.find(
        (species) => species.id === route.speciesId
      );

      if (!entry || entry.status !== "available") {
        navigate(DEFAULT_ROUTE, { replace: true });
        return;
      }

      setScreen("hub");
      renderBreadcrumbs(route);
      document.title = `${entry.name} anatomy · MORPHORA`;
      await renderSpeciesHub(route.speciesId);
      elements.speciesHubScreen.scrollTo(0, 0);
    } else {
      setScreen("atlas");

      try {
        const activated = await activateAtlasRoute(route);
        if (!activated || !currentAtlasContext) return;

        const viewTitle = currentViewLabel || currentAtlasContext.collection.name;
        document.title =
          `${viewTitle} · ${currentAtlasContext.collection.name} · MORPHORA`;
      } catch (error) {
        console.error("Could not activate atlas route.", error);
        navigate(`#/species/${route.speciesId}`, { replace: true });
        return;
      }
    }

    syncDrawerActiveState();
  }

  function openAtlasView(viewId) {
    if (!currentRoute || currentRoute.type !== "atlas" || !viewId) return;
    navigate(`${getRouteBase(currentRoute)}/${viewId}`);
  }

  // =========================
  // INITIALIZATION + EVENTS
  // =========================
  async function initializeNavigation() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const systemPrefersLight = window.matchMedia?.(
      "(prefers-color-scheme: light)"
    ).matches;

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
      elements.speciesGrid.innerHTML =
        `<div class="navigation-error-card"><strong>Species library unavailable</strong><p>${error.message}</p><button type="button" id="retryCatalog">Retry</button></div>`;
      document
        .getElementById("retryCatalog")
        ?.addEventListener("click", () => window.location.reload());
    }
  }

  window.MorphoraNavigation = {
    navigate,
    openAtlasView,
    toggleTheme,
    closeLibraryDrawer
  };

  elements.brandHomeButton.addEventListener("click", () => navigate(DEFAULT_ROUTE));
  elements.exploreDogButton.addEventListener("click", () => {
    const speciesId = catalog?.defaultSpeciesId || "dog";
    navigate(`#/species/${speciesId}`);
  });
  elements.backToSpeciesButton.addEventListener("click", () => navigate(DEFAULT_ROUTE));
  elements.headerThemeToggle.addEventListener("click", toggleTheme);

  elements.libraryToggle.addEventListener("click", () => {
    if (elements.libraryDrawer.classList.contains("is-open")) {
      closeLibraryDrawer({ restoreFocus: true });
    } else {
      openLibraryDrawer(elements.libraryToggle);
    }
  });

  elements.closeLibraryDrawer.addEventListener("click", () =>
    closeLibraryDrawer({ restoreFocus: true })
  );
  elements.drawerBackdrop.addEventListener("click", () =>
    closeLibraryDrawer({ restoreFocus: true })
  );

  window.addEventListener("hashchange", handleRoute);

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      elements.libraryDrawer.classList.contains("is-open")
    ) {
      closeLibraryDrawer({ restoreFocus: true });
    }
  });

  document.addEventListener("morphora:atlas-ready", async () => {
    if (currentRoute?.type !== "atlas") return;

    try {
      const context =
        currentAtlasContext || (await resolveAtlasContext(currentRoute));

      if (!context || !window.MorphoraAtlas) return;
      currentAtlasContext = context;

      await window.MorphoraAtlas.openCollection(
        context.collection.manifestPath,
        pendingAtlasViewId || currentRoute.viewId || null
      );
      pendingAtlasViewId = null;
    } catch (error) {
      console.error("Could not open collection after atlas initialization.", error);
    }
  });

  document.addEventListener("morphora:view-change", (event) => {
    const { viewId, label, manifestPath } = event.detail || {};

    if (!viewId || currentRoute?.type !== "atlas" || !currentAtlasContext) {
      return;
    }

    if (
      manifestPath &&
      manifestPath !== currentAtlasContext.collection.manifestPath
    ) {
      return;
    }

    currentViewLabel = label || getViewLabel(viewId, currentAtlasContext);

    if (currentRoute.viewId !== viewId) {
      const target = `${getRouteBase(currentRoute)}/${viewId}`;
      history.replaceState(null, "", target);
      currentRoute = parseRoute(target);
      localStorage.setItem(LAST_ATLAS_ROUTE_KEY, target);
      updateContinueButton();
    }

    renderBreadcrumbs(currentRoute, currentAtlasContext, currentViewLabel);
    document.title =
      `${currentViewLabel} · ${currentAtlasContext.collection.name} · MORPHORA`;
    syncDrawerActiveState();
  });

  initializeNavigation();
});
