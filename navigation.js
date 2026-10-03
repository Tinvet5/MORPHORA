document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const A11y = window.MorphoraA11y || {
    activateFocusTrap() {},
    announce() {},
    releaseFocusTrap() {}
  };
  const Config = window.MORPHORA_CONFIG || {};
  const Models = window.MorphoraModels;
  const Storage = window.MorphoraStorage;
  const I18n = window.MorphoraI18n || {
    t(key) { return key; },
    localize(item, field) { return item?.[field] ?? ""; },
    localizeArray(item, field) { const value = item?.[field]; return Array.isArray(value) ? value : []; },
    searchTerms(item) { return [item?.name, item?.title, item?.description, ...(item?.searchTerms || [])].filter(Boolean); },
    applyDom() {},
    ready: Promise.resolve()
  };
  const Perf = window.MorphoraPerformance || {
    mark() {},
    measure() {},
    prefetchJson() { return Promise.resolve(false); },
    prefetchAsset() { return false; }
  };
  await I18n.ready;
  I18n.applyDom();
  configureBrandFooter();
  Perf.mark("navigation-dom-ready");

  // =========================================================
  // MORPHORA V4.7 — PERFORMANCE + PRODUCTION NAVIGATION
  // =========================================================
  const APP_VERSION = Config.assetVersion || Config.version || "4.9.8-dev";
  const CATALOG_PATH = "data/catalog.json";
  const SUPPORTED_SCHEMA_VERSION = Config.schemaVersion || Models?.SCHEMA_VERSION || 2;
  const DEFAULT_ROUTE = "#/species";
  const LAST_ATLAS_ROUTE_KEY = Storage?.keys.lastAtlasRoute || "morphora:last-atlas-route";
  const THEME_KEY = Storage?.keys.theme || "morphora:theme";
  const DRAWER_SCROLL_KEY = Storage?.keys.libraryDrawerScroll || "morphora:library-drawer-scroll";
  let pendingStructureFocus = null;

  function tr(key, vars) { return I18n.t(key, vars); }

  function configureBrandFooter() {
    const links = Config.publicLinks || {};
    document.querySelectorAll("[data-social-link]").forEach((anchor) => {
      const href = links[anchor.dataset.socialLink];
      if (href) anchor.href = href;
    });
  }
  function localizeEntity(item) {
    if (!item || typeof item !== "object") return item;
    return {
      ...item,
      name: I18n.localize(item, "name") || item.name,
      title: I18n.localize(item, "title") || item.title,
      description: I18n.localize(item, "description") || item.description,
      summary: I18n.localize(item, "summary") || item.summary,
      buttonLabel: I18n.localize(item, "buttonLabel") || item.buttonLabel,
      searchTerms: I18n.localizeArray(item, "searchTerms").length ? I18n.localizeArray(item, "searchTerms") : (item.searchTerms || []),
      tags: I18n.localizeArray(item, "tags").length ? I18n.localizeArray(item, "tags") : (item.tags || []),
      plannedContent: I18n.localizeArray(item, "plannedContent").length ? I18n.localizeArray(item, "plannedContent") : (item.plannedContent || []),
      plannedFocus: I18n.localizeArray(item, "plannedFocus").length ? I18n.localizeArray(item, "plannedFocus") : (item.plannedFocus || [])
    };
  }

  function localizeSpeciesData(data) {
    if (!data) return data;
    const localized = localizeEntity(data);
    localized.systems = (data.systems || []).map((system) => {
      const next = localizeEntity(system);
      next.collections = (system.collections || []).map(localizeEntity);
      return next;
    });
    return localized;
  }

  function localizeManifest(manifest) {
    if (!manifest) return manifest;
    const localized = localizeEntity(manifest);
    localized.views = (manifest.views || []).map(localizeEntity);
    return localized;
  }

  const elements = {
    body: document.body,
    brandHomeButton: document.getElementById("brandHomeButton"),
    breadcrumbNav: document.getElementById("breadcrumbNav"),
    headerThemeToggle: document.getElementById("headerThemeToggle"),
    globalSearchToggle: document.getElementById("globalSearchToggle"),
    libraryToggle: document.getElementById("libraryToggle"),

    speciesScreen: document.getElementById("speciesScreen"),
    speciesHubScreen: document.getElementById("speciesHubScreen"),
    comingSoonScreen: document.getElementById("comingSoonScreen"),
    atlasScreen: document.getElementById("atlasScreen"),

    speciesGrid: document.getElementById("speciesGrid"),
    speciesCount: document.getElementById("speciesCount"),
    exploreDogButton: document.getElementById("exploreDogButton"),
    continueButton: document.getElementById("continueButton"),

    backToSpeciesButton: document.getElementById("backToSpeciesButton"),
    speciesHeroVisual: document.getElementById("speciesHeroVisual"),
    speciesHeroImage: document.getElementById("speciesHeroImage"),
    speciesHeroMonogram: document.getElementById("speciesHeroMonogram"),
    speciesHubTitle: document.getElementById("speciesHubTitle"),
    speciesHubScientific: document.getElementById("speciesHubScientific"),
    speciesHubSummary: document.getElementById("speciesHubSummary"),
    speciesHubStats: document.getElementById("speciesHubStats"),
    systemsTitle: document.getElementById("systemsTitle"),
    systemsSectionMeta: document.getElementById("systemsSectionMeta"),
    systemsGrid: document.getElementById("systemsGrid"),
    collectionsTitle: document.getElementById("collectionsTitle"),
    collectionsSectionMeta: document.getElementById("collectionsSectionMeta"),
    collectionsGrid: document.getElementById("collectionsGrid"),

    comingSoonBackButton: document.getElementById("comingSoonBackButton"),
    comingSoonEyebrow: document.getElementById("comingSoonEyebrow"),
    comingSoonTitle: document.getElementById("comingSoonTitle"),
    comingSoonDescription: document.getElementById("comingSoonDescription"),
    comingSoonPlanned: document.getElementById("comingSoonPlanned"),
    comingSoonList: document.getElementById("comingSoonList"),
    comingSoonReturnButton: document.getElementById("comingSoonReturnButton"),

    drawerBackdrop: document.getElementById("drawerBackdrop"),
    libraryDrawer: document.getElementById("libraryDrawer"),
    closeLibraryDrawer: document.getElementById("closeLibraryDrawer"),
    libraryContent: document.getElementById("libraryContent"),

    librarySearchBackdrop: document.getElementById("librarySearchBackdrop"),
    librarySearchDialog: document.getElementById("librarySearchDialog"),
    closeLibrarySearch: document.getElementById("closeLibrarySearch"),
    librarySearchInput: document.getElementById("librarySearchInput"),
    librarySearchStatus: document.getElementById("librarySearchStatus"),
    librarySearchResults: document.getElementById("librarySearchResults")
  };

  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length > 0) {
    console.error(
      `MORPHORA navigation could not start. Missing elements: ${missing.join(", ")}`
    );
    return;
  }

  let catalog = null;
  let currentRoute = null;
  let currentAtlasContext = null;
  let currentViewLabel = "";
  let pendingAtlasViewId = null;
  let lastDrawerTrigger = null;
  let lastSearchTrigger = null;
  let comingSoonReturnRoute = DEFAULT_ROUTE;
  let drawerScrollPosition = 0;
  let searchIndex = [];

  const speciesDataCache = new Map();
  const collectionManifestCache = new Map();
  const maxSpeciesCacheEntries = 8;
  const maxCollectionCacheEntries = Number(Config.maxCollectionManifestCacheEntries) || 10;

  function touchMapEntry(cache, key) {
    if (!cache.has(key)) return null;
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
    return value;
  }

  function setBoundedMapEntry(cache, key, value, limit) {
    if (cache.has(key)) cache.delete(key);
    cache.set(key, value);
    while (cache.size > limit) {
      cache.delete(cache.keys().next().value);
    }
    return value;
  }

  function renderNavigationError(container, { title, detail = "", retryId, onRetry }) {
    const card = document.createElement("div");
    card.className = "navigation-error-card";

    const heading = document.createElement("strong");
    heading.textContent = title;
    const message = document.createElement("p");
    message.textContent = detail || tr("status.noMatchesBody");
    const retry = document.createElement("button");
    retry.type = "button";
    retry.id = retryId;
    retry.textContent = tr("common.retry");
    retry.addEventListener("click", onRetry);

    card.append(heading, message, retry);
    container.replaceChildren(card);
    A11y.announce(`${title}. ${message.textContent}`, { assertive: true });
  }

  // =========================================================
  // DATA HELPERS + VALIDATION
  // =========================================================
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
    if (Models?.prepare) return Models.prepare("catalog", data);
    requireData(isPlainObject(data), "Catalog must be an object.");
    return data;
  }

  function validateSpeciesData(data, speciesEntry) {
    if (Models?.prepare) return Models.prepare("species", data, { expectedId: speciesEntry.id });
    requireData(isPlainObject(data), `Species data for ${speciesEntry.id} must be an object.`);
    return data;
  }

  function validateCollectionManifest(data, path) {
    if (Models?.prepare) return Models.prepare("collection", data, { path });
    requireData(isPlainObject(data), `Collection manifest ${path} must be an object.`);
    return data;
  }

  async function getSpeciesData(speciesId) {
    if (speciesDataCache.has(speciesId)) return localizeSpeciesData(touchMapEntry(speciesDataCache, speciesId));

    const entry = catalog?.species.find((item) => item.id === speciesId);
    if (!entry || entry.status !== "available") {
      throw new Error(`Species ${speciesId} is not available.`);
    }

    const data = validateSpeciesData(await fetchJson(entry.dataPath), entry);
    setBoundedMapEntry(speciesDataCache, speciesId, data, maxSpeciesCacheEntries);
    return localizeSpeciesData(data);
  }

  async function getCollectionManifest(path) {
    if (collectionManifestCache.has(path)) {
      return localizeManifest(touchMapEntry(collectionManifestCache, path));
    }

    const manifest = validateCollectionManifest(await fetchJson(path), path);
    setBoundedMapEntry(collectionManifestCache, path, manifest, maxCollectionCacheEntries);
    return localizeManifest(manifest);
  }

  // =========================================================
  // ROUTING
  // =========================================================
  function normalizeHash(hash = window.location.hash) {
    const value = hash && hash.startsWith("#/") ? hash : DEFAULT_ROUTE;
    return value.replace(/\/+$/, "") || DEFAULT_ROUTE;
  }

  function parseRoute(hash = window.location.hash) {
    const normalized = normalizeHash(hash);
    const segments = normalized.slice(2).split("/").filter(Boolean);

    if (segments[0] !== "species" || segments.length === 1) {
      return { type: "species-list", hash: DEFAULT_ROUTE, segments: ["species"] };
    }

    if (segments.length === 2) {
      return {
        type: "species-hub",
        hash: normalized,
        speciesId: segments[1],
        segments
      };
    }

    if (segments.length === 3) {
      return {
        type: "system-hub",
        hash: normalized,
        speciesId: segments[1],
        systemId: segments[2],
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
    closeLibrarySearch();

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
    return collection.route || `#/species/${speciesId}/${systemId}/${collection.id}`;
  }

  function getRouteBase(route) {
    if (!route || route.type !== "atlas") return "";
    return `#/species/${route.speciesId}/${route.systemId}/${route.collectionId}`;
  }

  async function resolveSpeciesContext(speciesId) {
    const rawSpeciesEntry = catalog?.species.find((entry) => entry.id === speciesId);
    if (!rawSpeciesEntry) return null;
    const speciesEntry = localizeEntity(rawSpeciesEntry);

    if (speciesEntry.status !== "available") {
      return { speciesEntry, speciesData: null };
    }

    const speciesData = await getSpeciesData(speciesId);
    return { speciesEntry, speciesData };
  }

  async function resolveRouteContext(route, { includeManifest = true } = {}) {
    if (!route?.speciesId) return null;

    const speciesContext = await resolveSpeciesContext(route.speciesId);
    if (!speciesContext) return null;

    const { speciesEntry, speciesData } = speciesContext;
    if (!speciesData) return { speciesEntry, speciesData: null };

    const system = route.systemId
      ? speciesData.systems.find((entry) => entry.id === route.systemId)
      : null;

    if (route.systemId && !system) return null;

    const collection = route.collectionId
      ? (system?.collections || []).find((entry) => entry.id === route.collectionId)
      : null;

    if (route.collectionId && !collection) return null;

    let manifest = null;
    if (
      includeManifest &&
      collection?.status === "available" &&
      collection.manifestPath
    ) {
      manifest = await getCollectionManifest(collection.manifestPath);
    }

    return {
      speciesEntry,
      speciesData,
      system,
      collection,
      manifest,
      baseRoute: collection
        ? getCollectionRoute(route.speciesId, route.systemId, collection)
        : ""
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

  // =========================================================
  // BASIC UI HELPERS
  // =========================================================
  function setScreen(name) {
    elements.speciesScreen.hidden = name !== "species";
    elements.speciesHubScreen.hidden = name !== "hub";
    elements.comingSoonScreen.hidden = name !== "coming-soon";
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
    badge.textContent = status === "available" ? tr("status.available") : tr("status.comingSoon");
    return badge;
  }

  function createTagList(tags = []) {
    const list = document.createElement("div");
    list.className = "content-tags";

    tags.slice(0, 3).forEach((tag) => {
      const chip = document.createElement("span");
      chip.textContent = tag;
      list.appendChild(chip);
    });

    return list;
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

  function createImageVisual({ src, alt = "", className, fallbackText }) {
    const visual = document.createElement("div");
    visual.className = className;

    const fallback = document.createElement("div");
    fallback.className = `${className}-fallback`;
    fallback.textContent = fallbackText;
    fallback.setAttribute("aria-hidden", "true");
    visual.appendChild(fallback);

    if (src) {
      const image = document.createElement("img");
      image.src = versionedPath(src);
      image.alt = alt;
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("load", () => visual.classList.add("has-image"));
      image.addEventListener("error", () => visual.classList.add("image-failed"));
      visual.prepend(image);
    }

    return visual;
  }

  async function getSpeciesMetrics(speciesData) {
    const collections = speciesData.systems.flatMap((system) =>
      (system.collections || []).map((collection) => ({ system, collection }))
    );
    const available = collections.filter(
      ({ collection }) => collection.status === "available"
    );
    const planned = collections.length - available.length;

    let views = 0;
    await Promise.all(
      available.map(async ({ collection }) => {
        try {
          const manifest = await getCollectionManifest(collection.manifestPath);
          views += manifest.views.length;
        } catch (error) {
          console.warn(`Could not count views for ${collection.name}.`, error);
        }
      })
    );

    return {
      systems: speciesData.systems.length,
      collections: collections.length,
      availableCollections: available.length,
      plannedCollections: planned,
      views
    };
  }

  // =========================================================
  // SPECIES LIBRARY
  // =========================================================
  async function createSpeciesCard(species) {
    species = localizeEntity(species);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `species-card species-${species.id}`;
    card.dataset.speciesId = species.id;
    card.setAttribute(
      "aria-label",
      species.status === "available"
        ? `Open ${species.name} anatomy`
        : `View planned ${species.name} anatomy`
    );
    card.addEventListener("click", () => navigate(`#/species/${species.id}`));

    const visual = createImageVisual({
      src: species.coverImage,
      alt: species.coverImage ? `${species.name} anatomy preview` : "",
      className: "species-card-media",
      fallbackText: species.name.charAt(0).toUpperCase()
    });

    const overlay = document.createElement("div");
    overlay.className = "species-card-media-overlay";
    overlay.appendChild(createStatusBadge(species.status));
    visual.appendChild(overlay);

    const copy = document.createElement("div");
    copy.className = "species-card-copy";

    const title = document.createElement("h3");
    title.textContent = species.name;

    const scientific = document.createElement("p");
    scientific.className = "scientific-name";
    scientific.textContent = species.scientificName || "";

    const description = document.createElement("p");
    description.className = "species-card-description";
    description.textContent = species.description || "";

    const meta = document.createElement("p");
    meta.className = "species-card-meta";
    meta.textContent = species.status === "available"
      ? tr("species.loadingDetails")
      : tr("species.collectionsPreparation");

    if (species.status === "available") {
      try {
        const speciesData = await getSpeciesData(species.id);
        const metrics = await getSpeciesMetrics(speciesData);
        meta.textContent = tr("species.metrics", { collections: metrics.availableCollections, views: metrics.views });
      } catch (error) {
        console.warn(`Could not load metrics for ${species.name}.`, error);
        meta.textContent = tr("species.libraryAvailable");
      }
    }

    const action = document.createElement("span");
    action.className = "species-card-action";
    action.innerHTML = species.status === "available"
      ? `<span>${tr("species.exploreAnatomy")}</span> <span aria-hidden="true">→</span>`
      : `<span>${tr("species.viewRoadmap")}</span> <span aria-hidden="true">→</span>`;

    copy.append(title, scientific, description, meta, action);
    card.append(visual, copy);
    return card;
  }

  async function renderSpeciesCards() {
    elements.speciesGrid.replaceChildren();
    const availableCount = catalog.species.filter(
      (item) => item.status === "available"
    ).length;
    elements.speciesCount.textContent =
      tr("species.catalogCount", { available: availableCount, planned: catalog.species.length });

    const cards = await Promise.all(catalog.species.map(createSpeciesCard));
    elements.speciesGrid.append(...cards);
  }

  // =========================================================
  // SPECIES / SYSTEM HUB
  // =========================================================
  function renderSpeciesHero(entry, data, metrics) {
    elements.speciesHubTitle.textContent = data.name;
    elements.speciesHubScientific.textContent = data.scientificName || "";
    elements.speciesHubSummary.textContent = data.summary || entry.description || "";

    elements.speciesHeroMonogram.textContent = data.name.charAt(0).toUpperCase();
    elements.speciesHeroMonogram.className =
      `species-hero-monogram species-monogram-${data.id}`;

    const coverImage = data.coverImage || entry.coverImage;
    if (coverImage) {
      elements.speciesHeroImage.src = versionedPath(coverImage);
      elements.speciesHeroImage.hidden = false;
      elements.speciesHeroVisual.classList.add("has-image");
      elements.speciesHeroImage.onerror = () => {
        elements.speciesHeroImage.hidden = true;
        elements.speciesHeroVisual.classList.remove("has-image");
      };
    } else {
      elements.speciesHeroImage.hidden = true;
      elements.speciesHeroVisual.classList.remove("has-image");
    }

    elements.speciesHubStats.replaceChildren();
    const stats = [
      [String(metrics.availableCollections), tr("species.statCollections")],
      [String(metrics.views), tr("species.statViews")],
      [String(metrics.systems), tr("species.statSystems")]
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
  }

  function createSystemCard(speciesId, system, selectedSystemId) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `system-card system-filter-control ${
      system.status === "available" ? "is-available" : "is-coming-soon"
    }${selectedSystemId === system.id ? " is-selected" : ""}`;
    card.setAttribute("aria-pressed", String(selectedSystemId === system.id));
    card.setAttribute("aria-label", `${system.name}${system.status === "available" ? "" : `, ${tr("status.comingSoon")}`}`);
    card.addEventListener("click", () =>
      navigate(`#/species/${speciesId}/${system.id}`)
    );

    const icon = document.createElement("div");
    icon.className = "system-icon";
    icon.textContent = system.icon || system.name.charAt(0);
    icon.setAttribute("aria-hidden", "true");

    const copy = document.createElement("div");
    const top = document.createElement("div");
    top.className = "system-title-row";
    const title = document.createElement("h3");
    title.textContent = system.name;
    top.append(title, createStatusBadge(system.status));

    const description = document.createElement("p");
    description.textContent = system.description || "";

    const count = document.createElement("span");
    count.className = "system-collection-count";
    const available = (system.collections || []).filter(
      (collection) => collection.status === "available"
    ).length;
    count.textContent = system.status === "available"
      ? tr("species.systemCount", { available, planned: (system.collections || []).length })
      : tr("species.developmentPlanned");

    copy.append(top, description, count);
    card.append(icon, copy);
    return card;
  }

  function createAllSystemsControl(speciesId, selectedSystemId) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `system-card system-filter-control system-filter-all${selectedSystemId ? "" : " is-selected"}`;
    card.setAttribute("aria-pressed", String(!selectedSystemId));
    card.setAttribute("aria-label", tr("species.allSystems"));
    card.addEventListener("click", () => navigate(`#/species/${speciesId}`));

    const icon = document.createElement("div");
    icon.className = "system-icon";
    icon.textContent = tr("species.allSystems").split(" ")[0];
    icon.setAttribute("aria-hidden", "true");

    const copy = document.createElement("div");
    const top = document.createElement("div");
    top.className = "system-title-row";
    const title = document.createElement("h3");
    title.textContent = tr("species.allSystems");
    top.appendChild(title);
    copy.appendChild(top);
    card.append(icon, copy);
    return card;
  }

  async function createCollectionCard(speciesId, system, collection) {
    const route = getCollectionRoute(speciesId, system.id, collection);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `collection-card ${
      collection.status === "available" ? "is-available" : "is-coming-soon"
    }${collection.featured ? " is-featured" : ""}`;
    card.addEventListener("click", () => navigate(route));

    const visual = createImageVisual({
      src: collection.thumbnail,
      alt: collection.thumbnail ? `${collection.name} preview` : "",
      className: "collection-media",
      fallbackText: createCollectionCode(collection)
    });

    const mediaHeader = document.createElement("div");
    mediaHeader.className = "collection-media-header";
    mediaHeader.appendChild(createStatusBadge(collection.status));
    visual.appendChild(mediaHeader);

    const copy = document.createElement("div");
    copy.className = "collection-copy";

    const eyebrow = document.createElement("p");
    eyebrow.className = "section-eyebrow";
    eyebrow.textContent = system.name;

    const title = document.createElement("h3");
    title.textContent = collection.name;

    const description = document.createElement("p");
    description.textContent = collection.description || "";

    const tags = createTagList(collection.tags || []);

    const meta = document.createElement("span");
    meta.className = "collection-meta";
    if (collection.status === "available") {
      meta.textContent = tr("collection.loadingViews");
      try {
        const manifest = await getCollectionManifest(collection.manifestPath);
        const count = manifest.views.length;
        meta.textContent = tr(count === 1 ? "collection.views.one" : "collection.views.many", { count });
      } catch (error) {
        console.warn(`Could not read collection metadata for ${collection.name}.`, error);
        meta.textContent = tr("collection.dataAttention");
      }
    } else {
      meta.textContent = tr("common.collectionPreparation");
    }

    const action = document.createElement("span");
    action.className = "collection-arrow";
    action.innerHTML = collection.status === "available"
      ? `<span>${tr("collection.openAtlas")}</span> <span aria-hidden="true">→</span>`
      : `<span>${tr("collection.viewPlanned")}</span> <span aria-hidden="true">→</span>`;

    copy.append(eyebrow, title, description);
    if (tags.childElementCount) copy.appendChild(tags);
    copy.append(meta, action);
    card.append(visual, copy);
    return card;
  }

  async function renderSpeciesHub(speciesId, selectedSystemId = null) {
    const entry = catalog.species.find((species) => species.id === speciesId);
    if (!entry || entry.status !== "available") {
      return false;
    }

    elements.systemsGrid.innerHTML =
      `<div class="navigation-loading-card"><span class="navigation-spinner" aria-hidden="true"></span><span>${tr("status.loadingSystems")}</span></div>`;
    elements.collectionsGrid.replaceChildren();

    try {
      const data = await getSpeciesData(speciesId);
      const metrics = await getSpeciesMetrics(data);
      const selectedSystem = selectedSystemId
        ? data.systems.find((system) => system.id === selectedSystemId)
        : null;

      renderSpeciesHero(entry, data, metrics);

      const availableSystems = data.systems.filter((system) => system.status === "available").length;
      elements.systemsTitle.textContent = tr("species.browseBySystem");
      elements.systemsSectionMeta.textContent = selectedSystem
        ? tr("species.systemSelected", { name: selectedSystem.name })
        : tr("species.systemsCount", { available: availableSystems, total: data.systems.length });

      elements.collectionsTitle.textContent = selectedSystem
        ? `${selectedSystem.name}`
        : tr("species.anatomyCollections");

      const systems = data.systems;
      elements.systemsGrid.replaceChildren(
        createAllSystemsControl(speciesId, selectedSystemId),
        ...systems.map((system) => createSystemCard(speciesId, system, selectedSystemId))
      );

      const systemsForCollections = selectedSystem ? [selectedSystem] : data.systems;
      const collectionEntries = systemsForCollections.flatMap((system) =>
        (system.collections || []).map((collection) => ({ system, collection }))
      );

      elements.collectionsSectionMeta.textContent =
        tr("species.collectionsCount", { available: collectionEntries.filter(({ collection }) => collection.status === "available").length, planned: collectionEntries.length });

      elements.collectionsGrid.replaceChildren();
      if (collectionEntries.length === 0) {
        const empty = document.createElement("div");
        empty.className = "navigation-empty-card";
        empty.innerHTML = `<strong>${tr("species.noCollectionsTitle")}</strong><p>${tr("species.noCollectionsBody")}</p>`;
        elements.collectionsGrid.appendChild(empty);
      } else {
        const cards = [];
        for (const { system, collection } of collectionEntries) {
          cards.push(await createCollectionCard(speciesId, system, collection));
        }
        elements.collectionsGrid.append(...cards);
      }

      return true;
    } catch (error) {
      console.error("Could not render species hub.", error);
      renderNavigationError(elements.systemsGrid, {
        title: tr("species.dataUnavailable"),
        detail: error.message,
        retryId: "retrySpeciesData",
        onRetry: () => {
          speciesDataCache.delete(speciesId);
          renderSpeciesHub(speciesId, selectedSystemId);
        }
      });
      return false;
    }
  }

  // =========================================================
  // COMING-SOON VIEW
  // =========================================================
  function renderComingSoon({ eyebrow, title, description, planned = [], returnRoute }) {
    comingSoonReturnRoute = returnRoute || DEFAULT_ROUTE;
    elements.comingSoonEyebrow.textContent = eyebrow || "In preparation";
    elements.comingSoonTitle.textContent = title || "Coming soon";
    elements.comingSoonDescription.textContent =
      description || "This part of the MORPHORA library is currently in preparation.";
    elements.comingSoonList.replaceChildren();

    planned.filter(Boolean).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      elements.comingSoonList.appendChild(li);
    });

    elements.comingSoonPlanned.hidden = elements.comingSoonList.childElementCount === 0;
    setScreen("coming-soon");
    window.scrollTo(0, 0);
  }

  // =========================================================
  // BREADCRUMBS
  // =========================================================
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

  function renderBreadcrumbs(route, context = null, viewLabel = "") {
    elements.breadcrumbNav.replaceChildren();
    const crumbs = [];

    if (route.type === "species-list") {
      crumbs.push(createBreadcrumb(tr("nav.species"), null, true));
    } else {
      const speciesEntry = context?.speciesEntry || catalog?.species.find(
        (entry) => entry.id === route.speciesId
      );

      crumbs.push(createBreadcrumb(tr("nav.species"), DEFAULT_ROUTE));

      if (route.type === "species-hub") {
        crumbs.push(createBreadcrumb(speciesEntry?.name || route.speciesId, null, true));
      } else {
        crumbs.push(
          createBreadcrumb(
            speciesEntry?.name || route.speciesId,
            `#/species/${route.speciesId}`
          )
        );

        const system = context?.system;
        if (route.type === "system-hub") {
          crumbs.push(createBreadcrumb(system?.name || route.systemId, null, true));
        } else if (route.type === "atlas") {
          crumbs.push(
            createBreadcrumb(
              system?.name || route.systemId,
              `#/species/${route.speciesId}/${route.systemId}`
            )
          );

          const collection = context?.collection;
          if (viewLabel) {
            crumbs.push(
              createBreadcrumb(
                collection?.name || route.collectionId,
                context?.baseRoute || getRouteBase(route)
              )
            );
            crumbs.push(createBreadcrumb(viewLabel, null, true));
          } else {
            crumbs.push(
              createBreadcrumb(collection?.name || route.collectionId, null, true)
            );
          }
        }
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

    elements.breadcrumbNav.dataset.crumbCount = String(crumbs.length);
  }

  // =========================================================
  // GLOBAL LIBRARY SEARCH
  // =========================================================
  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .trim();
  }

  function addSearchEntry(entry) {
    const normalizedKeywords = normalizeSearchText(
      [entry.title, entry.subtitle, ...(entry.keywords || [])].join(" ")
    );
    searchIndex.push({ ...entry, normalizedKeywords });
  }

  async function buildSearchIndex() {
    searchIndex = [];

    for (const rawSpeciesEntry of catalog.species) {
      const speciesEntry = localizeEntity(rawSpeciesEntry);
      addSearchEntry({
        type: "species",
        title: speciesEntry.name,
        subtitle: speciesEntry.scientificName || "",
        status: speciesEntry.status,
        route: `#/species/${speciesEntry.id}`,
        keywords: I18n.searchTerms(rawSpeciesEntry)
      });

      if (speciesEntry.status !== "available") continue;

      try {
        const speciesData = await getSpeciesData(speciesEntry.id);
        for (const system of speciesData.systems) {
          const systemRoute = `#/species/${speciesEntry.id}/${system.id}`;
          addSearchEntry({
            type: "system",
            title: system.name,
            subtitle: `${speciesData.name} · ${system.description || ""}`,
            status: system.status,
            route: systemRoute,
            keywords: I18n.searchTerms(system)
          });

          for (const collection of system.collections || []) {
            const collectionRoute = getCollectionRoute(
              speciesEntry.id,
              system.id,
              collection
            );
            addSearchEntry({
              type: "collection",
              title: collection.name,
              subtitle: `${speciesData.name} · ${system.name}`,
              status: collection.status,
              route: collectionRoute,
              keywords: I18n.searchTerms(collection)
            });

            if (collection.status !== "available" || !collection.manifestPath) {
              continue;
            }

            try {
              const manifest = await getCollectionManifest(collection.manifestPath);
              for (const view of manifest.views) {
                addSearchEntry({
                  type: "view",
                  title: view.buttonLabel,
                  subtitle: `${speciesData.name} · ${collection.name}`,
                  status: "available",
                  route: `${collectionRoute}/${view.id}`,
                  keywords: [view.id, collection.name, system.name, ...I18n.searchTerms(view)]
                });

                try {
                  const rawView = Models?.prepare
                    ? Models.prepare("view", await fetchJson(view.dataPath), { expectedId: view.id })
                    : await fetchJson(view.dataPath);
                  for (const label of rawView.labels || []) {
                    addSearchEntry({
                      type: "structure",
                      title: I18n.localize(label, "name") || label.name,
                      subtitle: `${collection.name} · ${view.buttonLabel}`,
                      status: "available",
                      route: `${collectionRoute}/${view.id}`,
                      structureId: label.id,
                      keywords: [label.id, label.category || "", ...I18n.searchTerms(label)]
                    });
                  }
                } catch (error) {
                  console.warn(`Could not index structures for ${view.id}.`, error);
                }
              }
            } catch (error) {
              console.warn(`Could not index views for ${collection.name}.`, error);
            }
          }
        }
      } catch (error) {
        console.warn(`Could not build search index for ${speciesEntry.name}.`, error);
      }
    }
  }

  function scoreSearchResult(entry, query) {
    const title = normalizeSearchText(entry.title);
    const subtitle = normalizeSearchText(entry.subtitle);
    if (title === query) return 100;
    if (title.startsWith(query)) return 80;
    if (title.includes(query)) return 60;
    if (subtitle.includes(query)) return 35;
    if (entry.normalizedKeywords.includes(query)) return 20;
    return 0;
  }

  function createSearchResult(entry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-search-result";
    button.addEventListener("click", () => {
      if (entry.structureId) pendingStructureFocus = { route: entry.route, structureId: entry.structureId };
      navigate(entry.route);
      if (entry.structureId && currentRoute?.hash === normalizeHash(entry.route)) {
        window.setTimeout(() => document.dispatchEvent(new CustomEvent("morphora:focus-structure", { detail: { structureId: entry.structureId } })), 0);
      }
    });

    const icon = document.createElement("span");
    icon.className = "library-search-result-icon";
    icon.textContent = tr(`search.type.${entry.type}`).charAt(0);
    icon.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "library-search-result-copy";
    const type = document.createElement("small");
    type.textContent = tr(`search.type.${entry.type}`);
    const title = document.createElement("strong");
    title.textContent = entry.title;
    const subtitle = document.createElement("span");
    subtitle.textContent = entry.subtitle;
    copy.append(type, title, subtitle);

    const status = createStatusBadge(entry.status || "available");
    button.append(icon, copy, status);
    return button;
  }

  function renderSearchResults(query = "") {
    const normalizedQuery = normalizeSearchText(query);
    elements.librarySearchResults.replaceChildren();

    let results;
    if (!normalizedQuery) {
      results = searchIndex
        .filter((entry) => entry.status === "available" && ["species", "collection"].includes(entry.type))
        .slice(0, 8);
      elements.librarySearchStatus.textContent = tr("status.popular");
    } else {
      results = searchIndex
        .map((entry) => ({ entry, score: scoreSearchResult(entry, normalizedQuery) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
        .slice(0, 20)
        .map(({ entry }) => entry);
      elements.librarySearchStatus.textContent = tr(results.length === 1 ? "search.results.one" : "search.results.many", { count: results.length, query: query.trim() });
    }

    if (results.length === 0) {
      const empty = document.createElement("div");
      empty.className = "library-search-empty";
      const strong = document.createElement("strong");
      strong.textContent = tr("status.noMatchesTitle");
      const paragraph = document.createElement("p");
      paragraph.textContent = tr("status.noMatchesBody");
      empty.append(strong, paragraph);
      elements.librarySearchResults.appendChild(empty);
      return;
    }

    results.forEach((entry) =>
      elements.librarySearchResults.appendChild(createSearchResult(entry))
    );
  }

  function openLibrarySearch(trigger = elements.globalSearchToggle) {
    lastSearchTrigger = trigger instanceof HTMLElement ? trigger : elements.globalSearchToggle;
    closeLibraryDrawer();
    elements.librarySearchDialog.hidden = false;
    elements.librarySearchBackdrop.hidden = false;
    elements.librarySearchDialog.setAttribute("aria-hidden", "false");
    elements.body.classList.add("search-dialog-open");
    elements.librarySearchInput.value = "";
    renderSearchResults("");
    A11y.activateFocusTrap(elements.librarySearchDialog, {
      initialFocus: elements.librarySearchInput,
      returnFocus: lastSearchTrigger,
      onEscape: () => closeLibrarySearch({ restoreFocus: true })
    });
    A11y.announce("MORPHORA library search opened.");
  }

  function closeLibrarySearch({ restoreFocus = false } = {}) {
    if (elements.librarySearchDialog.hidden) return;
    elements.librarySearchDialog.hidden = true;
    elements.librarySearchBackdrop.hidden = true;
    elements.librarySearchDialog.setAttribute("aria-hidden", "true");
    elements.body.classList.remove("search-dialog-open");
    A11y.releaseFocusTrap(elements.librarySearchDialog, { restoreFocus });
    lastSearchTrigger = null;
  }

  // =========================================================
  // LIBRARY DRAWER
  // =========================================================
  function createDrawerRouteButton({ label, subtitle = "", route, className, status }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.route = route;
    button.addEventListener("click", () => navigate(route));

    const copy = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = label;
    copy.appendChild(strong);
    if (subtitle) {
      const small = document.createElement("small");
      small.textContent = subtitle;
      copy.appendChild(small);
    }
    button.appendChild(copy);
    if (status) button.appendChild(createStatusBadge(status));
    return button;
  }

  async function renderLibraryDrawer() {
    elements.libraryContent.replaceChildren();

    const homeButton = createDrawerRouteButton({
      label: "Species library",
      subtitle: "Browse all animals",
      route: DEFAULT_ROUTE,
      className: "drawer-home-button"
    });
    homeButton.prepend(Object.assign(document.createElement("span"), {
      textContent: "⌂"
    }));
    elements.libraryContent.appendChild(homeButton);

    for (const speciesEntry of catalog.species) {
      if (speciesEntry.status !== "available") {
        elements.libraryContent.appendChild(
          createDrawerRouteButton({
            label: speciesEntry.name,
            subtitle: "Coming soon",
            route: `#/species/${speciesEntry.id}`,
            className: "drawer-coming-soon-button",
            status: "coming-soon"
          })
        );
        continue;
      }

      try {
        const speciesData = await getSpeciesData(speciesEntry.id);
        const speciesDetails = document.createElement("details");
        speciesDetails.className = "drawer-tree drawer-species-tree";
        speciesDetails.dataset.treeSpecies = speciesEntry.id;

        const speciesSummary = document.createElement("summary");
        speciesSummary.appendChild(createMonogram(speciesEntry.id, speciesEntry.name));
        const speciesCopy = document.createElement("span");
        const speciesName = document.createElement("strong");
        speciesName.textContent = speciesData.name;
        const scientific = document.createElement("small");
        scientific.textContent = speciesData.scientificName || "";
        speciesCopy.append(speciesName, scientific);
        speciesSummary.appendChild(speciesCopy);
        speciesDetails.appendChild(speciesSummary);

        speciesDetails.appendChild(
          createDrawerRouteButton({
            label: `${speciesData.name} overview`,
            subtitle: "Systems and collections",
            route: `#/species/${speciesEntry.id}`,
            className: "drawer-overview-button"
          })
        );

        for (const system of speciesData.systems) {
          const systemRoute = `#/species/${speciesEntry.id}/${system.id}`;
          const systemDetails = document.createElement("details");
          systemDetails.className = "drawer-tree drawer-system-tree";
          systemDetails.dataset.treeSystem = systemRoute;

          const systemSummary = document.createElement("summary");
          const systemCopy = document.createElement("span");
          const systemName = document.createElement("strong");
          systemName.textContent = system.name;
          const systemStatus = document.createElement("small");
          systemStatus.textContent = system.status === "available"
            ? `${(system.collections || []).length} collections`
            : "Coming soon";
          systemCopy.append(systemName, systemStatus);
          systemSummary.appendChild(systemCopy);
          systemDetails.appendChild(systemSummary);

          systemDetails.appendChild(
            createDrawerRouteButton({
              label: `${system.name} overview`,
              route: systemRoute,
              className: "drawer-overview-button",
              status: system.status
            })
          );

          for (const collection of system.collections || []) {
            const collectionRoute = getCollectionRoute(
              speciesEntry.id,
              system.id,
              collection
            );

            if (collection.status !== "available") {
              systemDetails.appendChild(
                createDrawerRouteButton({
                  label: collection.name,
                  subtitle: "Planned collection",
                  route: collectionRoute,
                  className: "drawer-collection-link is-coming-soon",
                  status: "coming-soon"
                })
              );
              continue;
            }

            const collectionDetails = document.createElement("details");
            collectionDetails.className = "drawer-tree drawer-collection-tree";
            collectionDetails.dataset.treeCollection = collectionRoute;

            const collectionSummary = document.createElement("summary");
            const collectionCopy = document.createElement("span");
            const collectionName = document.createElement("strong");
            collectionName.textContent = collection.name;
            const collectionMeta = document.createElement("small");
            collectionMeta.textContent = tr("collection.interactiveAtlas");
            collectionCopy.append(collectionName, collectionMeta);
            collectionSummary.appendChild(collectionCopy);
            collectionDetails.appendChild(collectionSummary);

            collectionDetails.appendChild(
              createDrawerRouteButton({
                label: "Open collection",
                subtitle: collection.description || "",
                route: collectionRoute,
                className: "drawer-overview-button"
              })
            );

            try {
              const manifest = await getCollectionManifest(collection.manifestPath);
              const viewList = document.createElement("div");
              viewList.className = "drawer-view-list";
              manifest.views.forEach((view) => {
                viewList.appendChild(
                  createDrawerRouteButton({
                    label: view.buttonLabel,
                    route: `${collectionRoute}/${view.id}`,
                    className: "drawer-view-button"
                  })
                );
              });
              collectionDetails.appendChild(viewList);
            } catch (error) {
              console.warn(`Could not load drawer views for ${collection.name}.`, error);
            }

            systemDetails.appendChild(collectionDetails);
          }

          speciesDetails.appendChild(systemDetails);
        }

        elements.libraryContent.appendChild(speciesDetails);
      } catch (error) {
        console.warn(`Could not load ${speciesEntry.name} in the drawer.`, error);
      }
    }

    syncDrawerActiveState();
  }

  function syncDrawerActiveState() {
    elements.libraryContent
      .querySelectorAll(".is-active")
      .forEach((node) => node.classList.remove("is-active"));

    if (!currentRoute) return;

    const activeRoute = currentRoute.hash;
    let active = elements.libraryContent.querySelector(`[data-route="${CSS.escape(activeRoute)}"]`);

    if (!active && currentRoute.type === "atlas" && currentRoute.viewId) {
      active = elements.libraryContent.querySelector(
        `[data-route="${CSS.escape(getRouteBase(currentRoute))}"]`
      );
    }

    active?.classList.add("is-active");

    const speciesTree = elements.libraryContent.querySelector(
      `[data-tree-species="${CSS.escape(currentRoute.speciesId || "")}"]`
    );
    if (speciesTree) speciesTree.open = true;

    if (currentRoute.systemId) {
      const systemRoute = `#/species/${currentRoute.speciesId}/${currentRoute.systemId}`;
      const systemTree = elements.libraryContent.querySelector(
        `[data-tree-system="${CSS.escape(systemRoute)}"]`
      );
      if (systemTree) systemTree.open = true;
    }

    if (currentRoute.type === "atlas") {
      const collectionTree = elements.libraryContent.querySelector(
        `[data-tree-collection="${CSS.escape(getRouteBase(currentRoute))}"]`
      );
      if (collectionTree) collectionTree.open = true;
    }
  }

  function openLibraryDrawer(trigger = elements.libraryToggle) {
    lastDrawerTrigger = trigger instanceof HTMLElement ? trigger : elements.libraryToggle;
    closeLibrarySearch();
    elements.libraryDrawer.classList.add("is-open");
    elements.libraryDrawer.setAttribute("aria-hidden", "false");
    elements.drawerBackdrop.hidden = false;
    elements.libraryToggle.setAttribute("aria-expanded", "true");
    elements.body.classList.add("library-drawer-open");
    syncDrawerActiveState();

    requestAnimationFrame(() => {
      elements.libraryContent.scrollTop = drawerScrollPosition;
      elements.libraryContent.querySelector(".is-active")?.scrollIntoView({
        block: "nearest"
      });
    });
    A11y.activateFocusTrap(elements.libraryDrawer, {
      initialFocus: elements.closeLibraryDrawer,
      returnFocus: lastDrawerTrigger,
      onEscape: () => closeLibraryDrawer({ restoreFocus: true })
    });
    A11y.announce("MORPHORA library navigation opened.");
  }

  function closeLibraryDrawer({ restoreFocus = false } = {}) {
    if (!elements.libraryDrawer.classList.contains("is-open")) return;
    drawerScrollPosition = elements.libraryContent.scrollTop;
    try {
      Storage?.writeText?.(DRAWER_SCROLL_KEY, String(drawerScrollPosition), { kind: "session" });
    } catch (error) {
      // Session storage may be unavailable in private contexts.
    }

    elements.libraryDrawer.classList.remove("is-open");
    elements.libraryDrawer.setAttribute("aria-hidden", "true");
    elements.drawerBackdrop.hidden = true;
    elements.libraryToggle.setAttribute("aria-expanded", "false");
    elements.body.classList.remove("library-drawer-open");
    A11y.releaseFocusTrap(elements.libraryDrawer, { restoreFocus });
    lastDrawerTrigger = null;
  }

  // =========================================================
  // THEME + CONTINUE STUDYING
  // =========================================================
  function applyTheme(theme, { persist = true } = {}) {
    const light = theme === "light";
    elements.body.classList.toggle("light-mode", light);
    document.documentElement.classList.toggle("preload-light-theme", light);
    document.documentElement.style.colorScheme = light ? "light" : "dark";
    elements.headerThemeToggle.innerHTML =
      `<span aria-hidden="true">${light ? "☀" : "☾"}</span>`;
    elements.headerThemeToggle.setAttribute(
      "aria-label",
      tr(light ? "theme.switchDark" : "theme.switchLight")
    );
    if (persist) Storage?.writeText?.(THEME_KEY, light ? "light" : "dark");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", light ? "#f5f3ee" : "#001030");
  }

  function toggleTheme() {
    applyTheme(elements.body.classList.contains("light-mode") ? "dark" : "light", { persist: true });
  }

  function updateContinueButton() {
    const lastRoute = Storage?.readText?.(LAST_ATLAS_ROUTE_KEY);
    elements.continueButton.hidden = !lastRoute;
    elements.continueButton.onclick = lastRoute ? () => navigate(lastRoute) : null;
  }

  // =========================================================
  // ROUTE ACTIVATION
  // =========================================================
  async function activateAtlasRoute(route, context) {
    if (
      !context?.collection ||
      context.collection.status !== "available" ||
      !context.collection.manifestPath ||
      !context.manifest
    ) {
      return false;
    }

    currentAtlasContext = context;
    const hasRequestedView =
      route.viewId && context.manifest.views.some((entry) => entry.id === route.viewId);
    pendingAtlasViewId = hasRequestedView ? route.viewId : null;
    currentViewLabel = getViewLabel(pendingAtlasViewId, context);
    renderBreadcrumbs(route, context, currentViewLabel);

    Storage?.writeText?.(LAST_ATLAS_ROUTE_KEY, route.hash);
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
      window.MorphoraAtlas?.deactivate();
    }

    if (route.type === "species-list") {
      setScreen("species");
      renderBreadcrumbs(route);
      document.title = "Species library · MORPHORA";
      window.scrollTo(0, 0);
      syncDrawerActiveState();
      return;
    }

    let context;
    try {
      context = await resolveRouteContext(route, {
        includeManifest: route.type === "atlas"
      });
    } catch (error) {
      console.error("Could not resolve route data.", error);
      navigate(DEFAULT_ROUTE, { replace: true });
      return;
    }

    if (!context) {
      navigate(DEFAULT_ROUTE, { replace: true });
      return;
    }

    if (!context.speciesData) {
      renderComingSoon({
        eyebrow: "Species library expansion",
        title: context.speciesEntry.name,
        description:
          context.speciesEntry.description ||
          `${context.speciesEntry.name} anatomy collections are planned for a future MORPHORA release.`,
        planned: context.speciesEntry.plannedFocus || [],
        returnRoute: DEFAULT_ROUTE
      });
      renderBreadcrumbs(route, context);
      document.title = `${context.speciesEntry.name} · Coming soon · MORPHORA`;
      syncDrawerActiveState();
      return;
    }

    if (route.type === "species-hub") {
      setScreen("hub");
      await renderSpeciesHub(route.speciesId);
      renderBreadcrumbs(route, context);
      document.title = `${context.speciesEntry.name} anatomy · MORPHORA`;
      window.scrollTo(0, 0);
      syncDrawerActiveState();
      return;
    }

    if (route.type === "system-hub") {
      if (!context.system) {
        navigate(`#/species/${route.speciesId}`, { replace: true });
        return;
      }

      if (context.system.status !== "available") {
        renderComingSoon({
          eyebrow: `${context.speciesData.name} anatomy`,
          title: context.system.name,
          description:
            context.system.description || "This anatomical system is in preparation.",
          planned: (context.system.collections || []).map((item) => item.name),
          returnRoute: `#/species/${route.speciesId}`
        });
        renderBreadcrumbs(route, context);
        document.title = `${context.system.name} · Coming soon · MORPHORA`;
      } else {
        setScreen("hub");
        await renderSpeciesHub(route.speciesId, route.systemId);
        renderBreadcrumbs(route, context);
        document.title = `${context.system.name} · ${context.speciesData.name} · MORPHORA`;
        window.scrollTo(0, 0);
      }
      syncDrawerActiveState();
      return;
    }

    if (!context.collection) {
      navigate(`#/species/${route.speciesId}/${route.systemId}`, { replace: true });
      return;
    }

    if (context.collection.status !== "available") {
      renderComingSoon({
        eyebrow: `${context.speciesData.name} · ${context.system.name}`,
        title: context.collection.name,
        description:
          context.collection.description || "This anatomical collection is in preparation.",
        planned: context.collection.plannedContent || [],
        returnRoute: `#/species/${route.speciesId}/${route.systemId}`
      });
      renderBreadcrumbs(route, context);
      document.title = `${context.collection.name} · Coming soon · MORPHORA`;
      syncDrawerActiveState();
      return;
    }

    setScreen("atlas");
    try {
      const activated = await activateAtlasRoute(route, context);
      if (!activated) {
        navigate(`#/species/${route.speciesId}/${route.systemId}`, { replace: true });
        return;
      }
      const viewTitle = currentViewLabel || context.collection.name;
      document.title = `${viewTitle} · ${context.collection.name} · MORPHORA`;
    } catch (error) {
      console.error("Could not activate atlas route.", error);
      navigate(`#/species/${route.speciesId}/${route.systemId}`, { replace: true });
      return;
    }

    syncDrawerActiveState();
  }

  function openAtlasView(viewId) {
    if (!currentRoute || currentRoute.type !== "atlas" || !viewId) return;
    navigate(`${getRouteBase(currentRoute)}/${viewId}`);
  }

  // =========================================================
  // INITIALIZATION + EVENTS
  // =========================================================
  async function initializeNavigation() {
    const savedTheme = Storage?.readText?.(THEME_KEY);
    const systemThemeQuery = window.matchMedia?.("(prefers-color-scheme: light)");
    const systemPrefersLight = Boolean(systemThemeQuery?.matches);
    applyTheme(savedTheme || (systemPrefersLight ? "light" : "dark"), { persist: Boolean(savedTheme) });
    systemThemeQuery?.addEventListener?.("change", (event) => {
      if (!Storage?.readText?.(THEME_KEY)) {
        applyTheme(event.matches ? "light" : "dark", { persist: false });
      }
    });
    updateContinueButton();

    try {
      drawerScrollPosition = Number(Storage?.readText?.(DRAWER_SCROLL_KEY, { kind: "session" })) || 0;
    } catch (error) {
      drawerScrollPosition = 0;
    }

    try {
      Perf.mark("catalog-load-start", { path: CATALOG_PATH });
      catalog = validateCatalog(await fetchJson(CATALOG_PATH));
      Perf.mark("catalog-ready", { species: catalog.species.length });
      Perf.measure("Catalog load", "catalog-load-start", "catalog-ready");
      await Promise.all([renderSpeciesCards(), renderLibraryDrawer(), buildSearchIndex()]);
      Perf.mark("navigation-ready", { searchEntries: searchIndex.length });

      if (!window.location.hash || !window.location.hash.startsWith("#/")) {
        history.replaceState(null, "", DEFAULT_ROUTE);
      }
      await handleRoute();
    } catch (error) {
      console.error("MORPHORA could not load species navigation.", error);
      renderNavigationError(elements.speciesGrid, {
        title: tr("species.libraryUnavailable"),
        detail: error.message,
        retryId: "retryCatalog",
        onRetry: () => window.location.reload()
      });
    }
  }

  window.MorphoraNavigation = {
    navigate,
    openAtlasView,
    toggleTheme,
    openLibraryDrawer,
    closeLibraryDrawer,
    openLibrarySearch
  };

  elements.brandHomeButton.addEventListener("click", () => navigate(DEFAULT_ROUTE));
  elements.exploreDogButton.addEventListener("click", () => {
    const speciesId = catalog?.defaultSpeciesId || "dog";
    navigate(`#/species/${speciesId}`);
  });
  elements.backToSpeciesButton.addEventListener("click", () => navigate(DEFAULT_ROUTE));
  elements.headerThemeToggle.addEventListener("click", toggleTheme);
  elements.globalSearchToggle.addEventListener("click", () =>
    openLibrarySearch(elements.globalSearchToggle)
  );

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

  elements.closeLibrarySearch.addEventListener("click", () =>
    closeLibrarySearch({ restoreFocus: true })
  );
  elements.librarySearchBackdrop.addEventListener("click", () =>
    closeLibrarySearch({ restoreFocus: true })
  );
  elements.librarySearchInput.addEventListener("input", (event) =>
    renderSearchResults(event.target.value)
  );

  elements.comingSoonBackButton.addEventListener("click", () =>
    navigate(comingSoonReturnRoute)
  );
  elements.comingSoonReturnButton.addEventListener("click", () =>
    navigate(comingSoonReturnRoute)
  );

  window.addEventListener("hashchange", handleRoute);

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

    if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
      event.preventDefault();
      openLibrarySearch(elements.globalSearchToggle);
      return;
    }

    if (event.key === "/" && !isTyping && elements.librarySearchDialog.hidden) {
      event.preventDefault();
      openLibrarySearch(elements.globalSearchToggle);
      return;
    }

    if (event.key === "Escape") {
      if (!elements.librarySearchDialog.hidden) {
        closeLibrarySearch({ restoreFocus: true });
      } else if (elements.libraryDrawer.classList.contains("is-open")) {
        closeLibraryDrawer({ restoreFocus: true });
      }
    }
  });

  document.addEventListener("morphora:atlas-ready", async () => {
    if (currentRoute?.type !== "atlas") return;

    try {
      const context =
        currentAtlasContext || (await resolveRouteContext(currentRoute, { includeManifest: true }));
      if (
        !context?.collection ||
        context.collection.status !== "available" ||
        !window.MorphoraAtlas
      ) {
        return;
      }
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
    if (!viewId || currentRoute?.type !== "atlas" || !currentAtlasContext) return;
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
      Storage?.writeText?.(LAST_ATLAS_ROUTE_KEY, target);
      updateContinueButton();
    }

    renderBreadcrumbs(currentRoute, currentAtlasContext, currentViewLabel);
    document.title =
      `${currentViewLabel} · ${currentAtlasContext.collection.name} · MORPHORA`;
    syncDrawerActiveState();

    if (pendingStructureFocus && normalizeHash(pendingStructureFocus.route) === currentRoute.hash) {
      const structureId = pendingStructureFocus.structureId;
      pendingStructureFocus = null;
      window.setTimeout(() => document.dispatchEvent(new CustomEvent("morphora:focus-structure", { detail: { structureId } })), 0);
    }
  });

  window.addEventListener("morphora:languagechange", async () => {
    I18n.applyDom();
    applyTheme(elements.body.classList.contains("light-mode") ? "light" : "dark", { persist: false });
    try {
      await Promise.all([buildSearchIndex(), handleRoute()]);
      renderLibraryDrawer();
    } catch (error) {
      console.warn("MORPHORA could not fully refresh navigation after language change.", error);
    }
  });

  initializeNavigation();
});
