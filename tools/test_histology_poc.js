"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const catalog = json("histology/catalog.json");
assert(catalog.module === "histology", "catalog.module must be histology");
assert(Array.isArray(catalog.slides) && catalog.slides.length === 6, "v0.8.3 catalog must contain exactly six current slides");
const ids = new Set();
for (const entry of catalog.slides || []) {
  assert(entry.id, "catalog slide requires id");
  assert(!ids.has(entry.id), `${entry.id}: duplicate catalog id`); ids.add(entry.id);
  assert(entry.manifest && fs.existsSync(path.join(root, entry.manifest)), `manifest missing for ${entry.id}`);
  assert(entry.viewerHref === `histology-poc.html?slide=${entry.id}`, `${entry.id}: viewerHref must target shared viewer`);
  if (!entry.manifest || !fs.existsSync(path.join(root, entry.manifest))) continue;
  const m = json(entry.manifest);
  assert(m.id === entry.id, `${entry.id}: manifest id mismatch`);
  assert(["histology", "histopathology", "unclassified"].includes(m.classification?.branch), `${entry.id}: invalid branch`);
  assert(m.image?.width > 0 && m.image?.height > 0, `${entry.id}: invalid dimensions`);
  assert(m.image?.micrometresPerPixelX > 0 && m.image?.micrometresPerPixelY > 0, `${entry.id}: physical resolution missing`);
  assert(Array.isArray(m.structures), `${entry.id}: structures must be an array`);
  assert(m.source?.type === "pma-start", `${entry.id}: local source must use PMA.start`);
  assert(m.source?.slidePath, `${entry.id}: PMA.start slide path missing`);
}
for (let i = 1; i <= 5; i += 1) assert(ids.has(`hueso-${i}`), `bone slide hueso-${i} missing`);

for (const file of ["histology.html", "histology-poc.html", "histology/histology-menu.css", "histology/histology-menu.js", "histology/histology-poc.css", "histology/histology-poc.js"]) {
  assert(fs.existsSync(path.join(root, file)), `${file} missing`);
}
const index = read("index.html");
const menu = read("histology.html");
const viewerHtml = read("histology-poc.html");
const viewer = read("histology/histology-poc.js");
const viewerCss = read("histology/histology-poc.css");
const release = read("release-meta.js");

assert(index.includes('href="histology.html"'), "main home must link to histology.html");
assert(menu.includes("Library v0.8.3"), "histology home must identify Library v0.8.3");
assert(menu.includes('data-filter="collection:bone"'), "histology library must expose Bone collection filter");
assert(!menu.includes("morphora-histology-wordmark.png"), "black/shoulder wordmark must not return");
assert(viewerHtml.includes('id="developerPanel"'), "v0.5 must separate technical setup into developer panel");
assert(viewerHtml.includes('id="notesDrawer"'), "v0.5 must provide slide notes");
assert(viewerHtml.includes('id="drawingCanvas"'), "v0.5 must provide drawing overlay");
assert(viewerHtml.includes('id="bookmarkButton"'), "v0.5 must provide slide bookmark control");
assert(viewerHtml.includes('id="structureOverlay"'), "v0.5 must provide structure overlay foundation");
assert(viewerHtml.includes('Library v0.8.3'), "viewer must identify Library v0.8.3");
assert(viewer.includes('openDrawer(els.drawingDrawer,{modal:false})'), "drawing drawer must be non-modal so the WSI canvas remains interactive");
assert(viewer.includes('event.stopPropagation()'), "drawing pointer handlers must stop propagation to viewer/backdrop handlers");
assert(!viewer.includes('if(!currentStroke||!event.buttons)return'), "drawing must not rely on mouse-only event.buttons state");

assert(viewer.includes('new URL("tile"'), "viewer must retain PMA.start tile endpoint");
assert(viewer.includes('api/json/${method}'), "viewer must retain PMA.start JSON API endpoint");
assert(viewer.includes('morphora:histology-viewer:v0.5:'), "viewer settings must be scoped per slide in v0.4");
assert(viewer.includes('morphora:histology-workspace:v1:'), "student workspace must persist locally");
assert(viewer.includes('localVaultPrincipal'), "histology workspace must respect V5 account-local principal scoping");
assert(viewer.includes('histology/slides/${requestedSlide}.json'), "viewer must load requested slide manifest dynamically");
assert(viewer.includes('renderStructures'), "structure overlay renderer missing");
assert(viewer.includes('renderDrawings'), "drawing renderer missing");
assert(viewer.includes('saveNotes'), "notes persistence missing");
assert(viewer.includes('toggleBookmark'), "bookmark persistence missing");
assert(viewerCss.includes('.developer-panel'), "developer panel styles missing");
assert(viewerCss.includes('.drawing-overlay'), "drawing overlay styles missing");
assert(release.includes('5.0.5-histology-library-v0.8.3-cloud'), "asset cache identity must be v0.8.3");

assert(viewerHtml.includes('id="structureEditorDrawer"'), "v0.5 must provide structure editor drawer");
assert(viewerHtml.includes('id="studioAddPointButton"'), "v0.5 must provide point authoring control");
assert(viewerHtml.includes('id="studioAddRegionButton"'), "v0.5 must provide polygon authoring control");
assert(viewerHtml.includes('id="studioInteractionLayer"'), "v0.5 must provide slide interaction authoring layer");
assert(viewer.includes('morphora:histology-studio:v1:'), "v0.5 Studio draft persistence key missing");
assert(viewer.includes('startStudioMode'), "v0.5 Studio placement workflow missing");
assert(viewer.includes('saveStructureEditor'), "v0.5 bilingual structure save flow missing");
assert(viewer.includes('exportStudioManifest'), "v0.5 manifest export missing");
assert(viewer.includes('resetStudioDraft'), "v0.5 draft reset missing");
assert(viewer.includes('type:"polygon"') && viewer.includes('studioPolygonPoints'), "v0.5 polygon geometry support missing");
assert(viewerCss.includes('.studio-mode-bar'), "v0.5 authoring mode styles missing");
assert(viewerCss.includes('.studio-editor-grid'), "v0.5 structure editor styles missing");

assert(viewerHtml.includes('id="personalLabelsButton"'), "v0.5.1 must expose personal Histology labels as a student tool");
assert(viewerHtml.includes('id="personalLabelsDrawer"'), "v0.5.1 personal label manager missing");
assert(viewerHtml.includes('id="personalEditorDrawer"'), "v0.5.1 personal label editor missing");
assert(viewerHtml.includes('id="personalAnnotationOverlay"'), "v0.5.1 personal annotation overlay missing");
assert(viewerHtml.includes('id="officialStructuresTab"') && viewerHtml.includes('id="personalStructuresTab"'), "v0.5.1 must separate Official and Mine structure layers");
assert(viewerHtml.includes('data-annotation-color="#e879ae"') && viewerHtml.includes('data-annotation-color="#60a5fa"'), "v0.5.1 preset color palette missing");
assert(viewer.includes('personalAnnotations:[]'), "v0.5.1 workspace schema must store personal annotations");
assert(viewer.includes('startPersonalMode'), "v0.5.1 personal point/region placement workflow missing");
assert(viewer.includes('renderPersonalAnnotations'), "v0.5.1 personal annotation renderer missing");
assert(viewer.includes('savePersonalEditor'), "v0.5.1 personal annotation persistence missing");
assert(viewer.includes('personalAnnotationsVisible'), "v0.5.1 personal layer visibility control missing");
assert(viewerCss.includes('.personal-region') && viewerCss.includes('.color-palette'), "v0.5.1 personal color-coded region styles missing");

assert(viewerHtml.includes('id="studyDrawer"') && viewerHtml.includes('id="quizDrawer"'), "v0.6 Study/Quiz setup drawers missing");
assert(viewerHtml.includes('data-study-source="official"') && viewerHtml.includes('data-study-source="personal"') && viewerHtml.includes('data-study-source="both"'), "v0.6 Study source selector must support Official, Mine and Both");
assert(viewerHtml.includes('data-quiz-mode="mixed"') && viewerHtml.includes('data-quiz-mode="multiple"') && viewerHtml.includes('data-quiz-mode="locate"'), "v0.6 quiz mode selector missing");
assert(viewerHtml.includes('id="learningSessionPanel"') && viewerHtml.includes('id="learningTargetOverlay"'), "v0.6 active learning viewer layer missing");
assert(viewer.includes('studyProgress:{}') && viewer.includes('quizHistory:[]'), "v0.6 workspace learning persistence missing");
assert(viewer.includes('startStudySession') && viewer.includes('markStudy'), "v0.6 Study active-recall workflow missing");
assert(viewer.includes('startQuizSession') && viewer.includes('answerMultipleChoice'), "v0.6 multiple-choice quiz workflow missing");
assert(viewer.includes('handleLocateAnswer') && viewer.includes('pointInPolygon'), "v0.6 Locate grading workflow missing");
assert(viewer.includes('canvas-click'), "v0.6 Locate mode must use the OpenSeadragon canvas so pan/zoom remains available");
assert(viewer.includes('quizResultPersonal') && viewer.includes('personalPracticeHelp'), "v0.6 must distinguish personal-label practice from official assessment");
assert(viewerCss.includes('.learning-session-panel') && viewerCss.includes('.quiz-answer-button'), "v0.6 learning session styles missing");
assert(viewerCss.includes('.progress-stats'), "v0.6 learning progress statistics styles missing");
assert(fs.existsSync(path.join(root, "backend/histology-sync-service.js")), "v0.7 Histology cloud sync service missing");
assert(viewerHtml.includes('id="histologyCloudButton"'), "v0.7 viewer cloud status control missing");
assert(menu.includes('id="libraryCloudButton"'), "v0.7 library cloud status control missing");
assert(viewer.includes('morphora:histologyworkspacechange'), "v0.7 workspace changes must emit for cloud capture");
assert(viewer.includes('morphora:histologyworkspaceremotechange'), "v0.7 viewer must react to remote workspace updates");
assert(viewer.includes('MorphoraLocalVault?.ready'), "v0.7 viewer must await account-scoped local vault restoration");
const histologySync = read("backend/histology-sync-service.js");
assert(histologySync.includes('const DOC_PREFIX = "histology:"') && histologySync.includes('const DOC_SUFFIX = ":workspace"'), "v0.7 cloud document must be Histology-namespaced");
assert(histologySync.includes('adoptGuestWorkspaces'), "v0.7 must support guest-to-account Histology adoption");
assert(histologySync.includes('acceptCloudConflict'), "v0.7 must support cloud-side Histology conflict resolution");
assert(read("backend/personal-sync-service.js").includes('isHistologyDocumentKey'), "Anatomy personal sync must ignore Histology cloud documents");
assert(read("service-worker.js").includes('./backend/histology-sync-service.js'), "v0.7 service worker must cache Histology sync runtime");

assert(viewer.includes('document.body.classList.add("learning-active")') && viewerCss.includes('body.learning-active .structures-section'), "v0.6 must hide structure-name clues during active recall");
assert(viewer.includes('if(learningSession||!viewer?.world?.getItemCount()||!workspace)return'), "v0.6 must hide personal drawings during active recall");


// v0.7.1 viewport/sidebar hotfix invariants
const histologyCss = read("histology/histology-poc.css");
assert(histologyCss.includes("height:100dvh") && histologyCss.includes("max-height:100dvh"), "v0.7.1 shell must be clamped to the dynamic viewport");
assert(histologyCss.includes(".histology-main{min-width:0;min-height:0;height:100%;overflow:hidden"), "v0.7.1 main workspace must not grow beyond its grid track");
assert(histologyCss.includes(".histology-sidebar{min-height:0;height:100%;max-height:100%") && histologyCss.includes("overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable"), "v0.7.1 sidebar must scroll internally within the viewport");
assert(histologyCss.includes("@media(max-width:820px){html,body{height:auto") && histologyCss.includes(".histology-shell{height:auto;min-height:100dvh;max-height:none;overflow:visible"), "v0.7.1 mobile layout must restore document scrolling");

// v0.8 hosted whole-slide delivery invariants
assert(fs.existsSync(path.join(root, "histology/histology-source-provider.js")), "v0.8 hosted source provider missing");
const sourceProvider = read("histology/histology-source-provider.js");
assert(sourceProvider.includes('parseDziDescriptor') && sourceProvider.includes('createDziTileSource'), "v0.8 DZI parsing/tile-source support missing");
assert(sourceProvider.includes('resolveCandidates'), "v0.8 provider fallback resolver missing");
assert(viewerHtml.includes('id="sourceModeInput"') && viewerHtml.includes('id="hostedUrlInput"'), "v0.8 developer source controls missing");
assert(viewer.includes('connectHostedDzi') && viewer.includes('connectLocalPma'), "v0.8 must implement hosted DZI plus PMA.start fallback providers");
assert(viewer.includes('sourceCandidates') && viewer.includes('localFallbackUsed'), "v0.8 automatic hosted-to-local fallback missing");
assert(read("service-worker.js").includes('./histology/histology-source-provider.js'), "v0.8 service worker must cache source-provider runtime");
for (const slide of catalog.slides) {
  const slideManifest = JSON.parse(read(`histology/slides/${slide.id}.json`));
  assert(slideManifest.delivery?.mode === (["hueso-1","hueso-4"].includes(slide.id) ? "hosted" : "auto"), `${slide.id}: v0.8.3 delivery mode mismatch`);
  assert(slideManifest.delivery?.hosted?.type === "dzi", `${slide.id}: v0.8 hosted provider must be DZI`);
  assert(slideManifest.delivery?.fallback?.type === "pma-start", `${slide.id}: v0.8 local fallback must remain PMA.start`);
}
assert(fs.existsSync(path.join(root, "tools/histology_wsi/convert_to_dzi.py")), "v0.8 DZI conversion tool missing");
assert(fs.existsSync(path.join(root, "tools/histology_wsi/register_hosted_slide.py")), "v0.8 hosted manifest registration tool missing");

// v0.8.1 hosted pilot and integrity-check invariants
assert(viewerHtml.includes('id="hostedCheckButton"') && viewerHtml.includes('id="localPilotButton"') && viewerHtml.includes('id="restoreAutoButton"'), "v0.8.1 hosted pilot controls missing");
assert(viewer.includes('assertHostedGeometry') && viewer.includes('pilotDimensionMismatch'), "v0.8.1 must reject DZI derivatives whose dimensions differ from the slide manifest");
assert(viewer.includes('runHostedSourceCheck') && viewer.includes('enableLocalDziPilot') && viewer.includes('restoreAutoSource'), "v0.8.1 hosted pilot workflow missing");
assert(viewer.includes('http://127.0.0.1:8008/${encodeURIComponent(manifest?.id||requestedSlide)}/slide.dzi'), "v0.8.1 local pilot descriptor route missing");
assert(viewerCss.includes('.hosted-pilot-card') && viewerCss.includes('.hosted-check-details'), "v0.8.1 hosted pilot styles missing");
assert(fs.existsSync(path.join(root, "tools/histology_wsi/pilot_slide.py")), "v0.8.1 pilot orchestration tool missing");
assert(fs.existsSync(path.join(root, "tools/histology_wsi/check_hosted_url.py")), "v0.8.1 deployed-host checker missing");
assert(fs.existsSync(path.join(root, "hosted-slides/.gitignore")), "v0.8.1 must guard generated WSI tiles from accidental Git commits");
assert(viewer.includes("hostedAuthorizationHeaders") && viewer.includes("setAjaxHeaders"), "v0.8.3 must authenticate private hosted tile requests");
assert(viewerHtml.includes("openseadragon/4.1.1/"), "v0.8.3 hosted AJAX navigator patch requires OSD 4.1.1");
assert(read("histology/slides/hueso-4.json").includes("/demo/slides/hueso-4/slide.dzi"), "v0.8.3 must register Hueso-4 online descriptor");
assert(read("histology/slides/hueso-1.json").includes("/demo/slides/hueso-1/slide.dzi"), "v0.8.3 must register Hueso-1 online descriptor");


// v0.8.2 PMA → DZI ingestion invariants
assert(viewerHtml.includes('id="pmaExportCommandPreview"') && viewerHtml.includes('id="pmaExportCopyButton"'), "v0.8.2 PMA export helper controls missing");
assert(viewer.includes('currentPmaExportCommand') && viewer.includes('copyPmaExportCommand'), "v0.8.2 current-slide export command helper missing");
assert(viewerCss.includes('.pma-export-card') && viewerCss.includes('.pma-export-command'), "v0.8.2 PMA export styles missing");
assert(fs.existsSync(path.join(root, "tools/histology_wsi/export_from_pma.py")), "v0.8.2 PMA exporter missing");
assert(fs.existsSync(path.join(root, "tools/histology_wsi/plan_hueso4_pma_export.cmd")), "v0.8.2 Hueso-4 PMA preflight helper missing");
assert(fs.existsSync(path.join(root, "tools/histology_wsi/export_hueso4_from_pma.cmd")), "v0.8.2 Hueso-4 PMA export helper missing");

if (failures.length) {
  console.error("Histology Library v0.8.3 checks failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`Histology Library v0.8.3 checks passed (${catalog.slides.length} slides + student workspace).`);
