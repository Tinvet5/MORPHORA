(() => {
  "use strict";

  const CATALOG_URL = "histology/catalog.json";
  const COPY = {
    en: {
      moduleKicker:"Microscopic atlas", moduleName:"Histology", anatomy:"Anatomy", heroPill:"MORPHORA · Histology", heroEyebrow:"A new scale of learning",
      heroTitle:"Explore tissue from architecture to cellular detail.", heroBody:"Navigate digitized histological specimens at true whole-slide scale, with a learning environment designed specifically for microscopy.", exploreSlides:"Explore slides",
      libraryEyebrow:"Microscopic library", libraryTitle:"Explore histology", libraryBody:"Browse a growing whole-slide library by collection, tissue and identification status.", slides:"slides", species:"confirmed species", stain:"confirmed stain",
      searchPlaceholder:"Search tissue, collection, species…", filterAll:"All", filterNormal:"Normal histology", filterPathology:"Histopathology", filterBone:"Bone collection", loading:"Loading microscopic library…",
      emptyTitle:"No slides match this view.", emptyBody:"Try another search or collection.", branchesEyebrow:"Growing microscopic atlas", branchesTitle:"Built to expand with every new specimen.", normalLabel:"Normal histology",
      normalTitle:"Learn the healthy microscopic blueprint.", normalBody:"Organized tissue architecture, cell types and normal microscopic landmarks.", comingSoon:"Growing soon", pathLabel:"Histopathology", pathTitle:"See how disease changes tissue.", pathBody:"Lesions, inflammation and pathological patterns explored directly on whole-slide specimens.", availableNow:"Available now",
      footerCopy:"Explore. Learn. Understand.", footerModule:"Histology · Library v0.8.3", open:"Open slide", resolution:"µm/px", slideSingular:"slide", slidePlural:"slides", pending:"Identification pending", cloudLocal:"Guest · Local", cloudSynced:"Cloud synced", cloudSyncing:"Syncing…", cloudOffline:"Offline · saved locally", cloudAttention:"Sync needs attention", cloudSignIn:"Sign in from the MORPHORA home screen to sync Histology across devices.", cloudSyncComplete:"Histology workspace synced."
    },
    es: {
      moduleKicker:"Atlas microscópico", moduleName:"Histología", anatomy:"Anatomía", heroPill:"MORPHORA · Histología", heroEyebrow:"Una nueva escala de aprendizaje",
      heroTitle:"Explora el tejido desde su arquitectura hasta el detalle celular.", heroBody:"Navega preparaciones histológicas digitalizadas a escala de lámina completa, en un entorno de aprendizaje diseñado específicamente para microscopía.", exploreSlides:"Explorar láminas",
      libraryEyebrow:"Biblioteca microscópica", libraryTitle:"Explora histología", libraryBody:"Navega una biblioteca creciente de láminas completas por colección, tejido y estado de identificación.", slides:"láminas", species:"especies confirmadas", stain:"tinción confirmada",
      searchPlaceholder:"Buscar tejido, colección, especie…", filterAll:"Todo", filterNormal:"Histología normal", filterPathology:"Histopatología", filterBone:"Colección ósea", loading:"Cargando biblioteca microscópica…",
      emptyTitle:"No hay láminas que coincidan.", emptyBody:"Prueba otra búsqueda o colección.", branchesEyebrow:"Atlas microscópico en crecimiento", branchesTitle:"Diseñado para crecer con cada nuevo espécimen.", normalLabel:"Histología normal",
      normalTitle:"Aprende la arquitectura microscópica sana.", normalBody:"Arquitectura tisular organizada, tipos celulares y referencias microscópicas normales.", comingSoon:"En crecimiento", pathLabel:"Histopatología", pathTitle:"Observa cómo la enfermedad modifica el tejido.", pathBody:"Lesiones, inflamación y patrones patológicos explorados directamente en preparaciones de lámina completa.", availableNow:"Disponible",
      footerCopy:"Explora. Aprende. Comprende.", footerModule:"Histología · Biblioteca v0.8.3", open:"Abrir lámina", resolution:"µm/px", slideSingular:"lámina", slidePlural:"láminas", pending:"Identificación pendiente", cloudLocal:"Invitado · Local", cloudSynced:"Sincronizado", cloudSyncing:"Sincronizando…", cloudOffline:"Sin conexión · guardado local", cloudAttention:"La sincronización requiere atención", cloudSignIn:"Inicia sesión desde la pantalla principal de MORPHORA para sincronizar Histología entre dispositivos.", cloudSyncComplete:"Espacio de Histología sincronizado."
    }
  };

  let catalog = { slides: [] };
  let activeFilter = "all";
  let query = "";
  let language = loadLanguage();

  const $ = (id) => document.getElementById(id);
  const els = {};

  function loadLanguage() {
    const stored = localStorage.getItem("morphora:language");
    return stored === "es" || stored === "en" ? stored : "en";
  }

  function effectiveTheme() {
    const stored = localStorage.getItem("morphora:theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
  }

  function applyTheme(theme = effectiveTheme()) {
    document.documentElement.dataset.theme = theme;
    $("themeIcon").textContent = theme === "light" ? "☀" : "☾";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#fff8fb" : "#1c0d1b");
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem("morphora:theme", next);
    applyTheme(next);
  }

  function text(value) {
    if (value && typeof value === "object") return value[language] || value.en || value.es || "";
    return String(value ?? "");
  }

  function tr(key) { return COPY[language]?.[key] || COPY.en[key] || key; }

  function applyCopy() {
    document.documentElement.lang = language;
    $("languageCode").textContent = language.toUpperCase();
    document.querySelectorAll("[data-copy]").forEach((node) => { node.textContent = tr(node.dataset.copy); });
    document.querySelectorAll("[data-placeholder]").forEach((node) => { node.placeholder = tr(node.dataset.placeholder); });
    render();
  }

  function toggleLanguage() {
    language = language === "en" ? "es" : "en";
    localStorage.setItem("morphora:language", language);
    applyCopy();
  }

  function searchable(slide) {
    return [slide.id, slide.category, slide.collection, slide.identificationStatus, text(slide.title), text(slide.subtitle), text(slide.speciesLabel), text(slide.systemLabel), text(slide.organLabel), text(slide.categoryLabel), text(slide.stainLabel)].join(" ").toLocaleLowerCase(language);
  }

  function matchesFilter(slide) {
    if (activeFilter === "all") return true;
    const [field, value] = activeFilter.split(":");
    return field && value ? String(slide[field] || "") === value : true;
  }

  function filteredSlides() {
    const needle = query.trim().toLocaleLowerCase(language);
    return catalog.slides.filter((slide) => matchesFilter(slide) && (!needle || searchable(slide).includes(needle)));
  }

  function slideCard(slide) {
    const article = document.createElement("article");
    article.className = "slide-card";
    article.dataset.collection = slide.collection || "general";
    article.dataset.category = slide.category || "unclassified";
    article.innerHTML = `
      <div class="slide-preview" data-preview="${slide.preview || "histology"}" aria-hidden="true">
        <div class="preview-topline"><span class="category-badge"></span><span class="stain-badge"></span></div>
        <div class="preview-scale">20 µm</div>
      </div>
      <div class="slide-card-body">
        <span class="slide-overline"></span>
        <h3></h3>
        <p class="slide-subtitle"></p>
        <div class="slide-meta"><span class="meta-organ"></span><span class="meta-system"></span><span class="meta-mag"></span></div>
        <div class="slide-card-actions"><span class="slide-resolution"></span><a class="open-slide"></a></div>
      </div>`;
    article.querySelector(".category-badge").textContent = text(slide.categoryLabel);
    article.querySelector(".stain-badge").textContent = text(slide.stainLabel);
    article.querySelector(".slide-overline").textContent = slide.identificationStatus === "pending" ? tr("pending") : text(slide.speciesLabel);
    article.querySelector("h3").textContent = text(slide.title);
    article.querySelector(".slide-subtitle").textContent = text(slide.subtitle);
    article.querySelector(".meta-organ").textContent = text(slide.organLabel);
    article.querySelector(".meta-system").textContent = text(slide.systemLabel);
    article.querySelector(".meta-mag").textContent = `${slide.nativeMagnification}×`;
    article.querySelector(".slide-resolution").textContent = `${Number(slide.micrometresPerPixel).toFixed(6)} ${tr("resolution")}`;
    const link = article.querySelector(".open-slide");
    const publicSite = ['morphora.cl','www.morphora.cl'].includes(location.hostname);
    const demoExpired = Date.now() >= Date.parse('2026-10-17T03:00:00Z');
    if(['hueso-1','hueso-4'].includes(slide.id) && !(publicSite && demoExpired)){
      link.href = slide.viewerHref;
      link.innerHTML = `<span>${language === 'es' ? 'Demo online · Sin registro' : 'Online demo · No sign-in'}</span><span aria-hidden="true">→</span>`;
      link.setAttribute('aria-label', `${tr('open')}: ${text(slide.title)}`);
    } else {
      // The remaining WSIs still require the local PMA.start source and must
      // not be advertised as cloud-hosted on morphora.cl.
      if (publicSite) {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled','true');
        link.style.opacity = '0.56';
        link.style.cursor = 'not-allowed';
        link.textContent = language === 'es' ? 'Próximamente online' : 'Cloud version coming soon';
      } else {
        link.href = slide.viewerHref;
        link.innerHTML = `<span>${tr('open')}</span><span aria-hidden='true'>→</span>`;
        link.setAttribute('aria-label', `${tr('open')}: ${text(slide.title)}`);
      }
    }
    return article;
  }

  function renderStats() {
    const slides = catalog.slides || [];
    const knownSpecies = new Set(slides.map((s) => s.species).filter((value) => value && value !== "unknown"));
    const confirmedStains = new Set(slides.map((s) => s.stain).filter((value) => value && value !== "unconfirmed" && value !== "unknown"));
    $("slideCount").textContent = String(slides.length);
    $("speciesCount").textContent = String(knownSpecies.size);
    $("stainCount").textContent = String(confirmedStains.size);
    document.querySelector('[data-copy="slides"]').textContent = slides.length === 1 ? tr("slideSingular") : tr("slidePlural");
  }

  function render() {
    if (!els.grid) return;
    const slides = filteredSlides().slice().sort((a,b)=> (b.id === 'hueso-4' ? 2 : b.id === 'hueso-1' ? 1 : 0) - (a.id === 'hueso-4' ? 2 : a.id === 'hueso-1' ? 1 : 0));
    els.grid.replaceChildren(...slides.map(slideCard));
    els.empty.hidden = slides.length > 0;
    els.grid.hidden = slides.length === 0;
    renderStats();
  }

  async function updateCloudUi(detail=null) {
    const button=$("libraryCloudButton"), label=$("libraryCloudText");
    if(!button||!label)return;
    let state=detail;
    if(!state){try{state=await window.MorphoraHistologySync?.status?.();}catch(_){state=null;}}
    const mode=state?.state||"local";
    button.dataset.state=mode;
    label.textContent=tr(mode==="synced"?"cloudSynced":mode==="syncing"?"cloudSyncing":mode==="offline"?"cloudOffline":mode==="attention"?"cloudAttention":"cloudLocal");
    button.title=state?.signedIn?(mode==="attention"?tr("cloudAttention"):tr("cloudSynced")):tr("cloudSignIn");
  }

  async function syncNow() {
    const service=window.MorphoraHistologySync;
    if(!service)return;
    const state=await service.status?.();
    if(!state?.signedIn){window.alert?.(tr("cloudSignIn"));await updateCloudUi(state);return;}
    const button=$("libraryCloudButton");if(button)button.disabled=true;
    try{await updateCloudUi({...state,state:"syncing"});await service.synchronize?.({flush:true});}
    finally{if(button)button.disabled=false;await updateCloudUi();}
  }

  function bind() {
    $("themeButton").addEventListener("click", toggleTheme);
    $("libraryCloudButton")?.addEventListener("click", syncNow);
    $("languageButton").addEventListener("click", toggleLanguage);
    $("exploreSlidesButton").addEventListener("click", () => $("slideCatalog").scrollIntoView({ behavior: "smooth", block: "start" }));
    $("searchInput").addEventListener("input", (event) => { query = event.target.value; render(); });
    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
        render();
      });
    });
  }

  async function init() {
    els.grid = $("catalogGrid");
    els.empty = $("emptyState");
    applyTheme();
    bind();
    applyCopy();
    await Promise.resolve(window.MorphoraLocalVault?.ready).catch(()=>{});
    await updateCloudUi();
    window.addEventListener("morphora:histologysyncstate", event=>updateCloudUi(event.detail));
    try {
      const response = await fetch(CATALOG_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      catalog = await response.json();
      render();
    } catch (error) {
      els.grid.innerHTML = `<div class="loading-card">${language === "es" ? "No se pudo cargar la biblioteca de histología." : "The histology library could not be loaded."}</div>`;
      console.error("MORPHORA Histology catalog failed", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
