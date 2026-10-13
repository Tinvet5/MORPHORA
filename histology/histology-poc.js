(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const requestedSlide = /^[a-zA-Z0-9._-]+$/.test(params.get("slide") || "") ? params.get("slide") : "48515-2";
  const MANIFEST_URL = `histology/slides/${requestedSlide}.json`;
  const SETTINGS_PREFIX = "morphora:histology-viewer:v0.5:";
  const STUDIO_PREFIX = "morphora:histology-studio:v1:";
  const WORKSPACE_PREFIX = "morphora:histology-workspace:v1:";
  const LANGUAGE_KEY = "morphora:language";
  const THEME_KEY = "morphora:theme";
  const DEFAULT_DRAW_COLOR = "#e879ae";
  const DEFAULT_ANNOTATION_COLOR = "#e879ae";
  const DEFAULT_ANNOTATION_OPACITY = 20;

  const COPY = {
    en: {
      moduleKicker:"Microscopic atlas", moduleName:"Histology", library:"Library", speciesLabel:"Species", organLabel:"Organ", diagnosisLabel:"Diagnosis", stainLabel:"Stain",
      learnEyebrow:"Learn", learningActions:"Learning modes", study:"Study", quiz:"Quiz", needsStructures:"Needs structures", workspaceEyebrow:"Workspace", studentTools:"Student tools", notes:"Notes", draw:"Draw", bookmark:"Bookmark", personalLabels:"My labels", personalLabelsHelp:"Create your own color-coded labels and zones for studying or teaching. These annotations are private and separate from official MORPHORA content.", personalPoint:"Point label", personalPointHelp:"Mark one cell or microscopic feature", personalRegion:"Color zone", personalRegionHelp:"Outline a region for color-coded study", personalLayerTitle:"Personal layer", personalLayerBody:"Only you see these labels on this device/account workspace. Official MORPHORA labels remain unchanged.", personalAuthoring:"Personal labeling", editPersonalLabel:"Edit personal label", personalEditorHelp:"Name your label, choose a color, and optionally add a study note.", labelName:"Label name", labelNamePlaceholder:"e.g. inflammatory focus", personalCategoryPlaceholder:"Optional group", personalNote:"Study note", personalNotePlaceholder:"Optional observation or teaching note…", labelColor:"Label color", zoneOpacity:"Zone opacity", deletePersonal:"Delete", savePersonal:"Save label", noPersonalLabels:"No personal labels yet.", personalLabelCount:"{count} labels", personalLabelSingular:"label", personalLabelPlural:"labels", official:"Official", mine:"Mine", cloudLocal:"Guest · Local", cloudSynced:"Cloud synced", cloudSyncing:"Syncing…", cloudOffline:"Offline · saved locally", cloudAttention:"Sync needs attention", cloudSignIn:"Sign in from the MORPHORA home screen to sync Histology across devices.", cloudSyncComplete:"Histology workspace synced.",
      contentEyebrow:"Content", structures:"Structures", visible:"Visible", hidden:"Hidden", noStructuresTitle:"No structures added yet.", noStructuresBody:"This slide is ready for labels when Histology Studio authoring begins.",
      progressEyebrow:"Progress", learningProgress:"Learning progress", magnification:"Magnification", resolution:"Resolution", position:"Position", overview:"Overview", fullscreen:"Fullscreen", exitFullscreen:"Exit fullscreen",
      readyTitle:"Ready for whole-slide microscopy.", readyBody:"Open the slide to explore from tissue architecture to cellular detail.", openSlide:"Open slide", openSlideTitle:"Open digital slide", openSlideBody:"Stream this specimen from the best available whole-slide source.", localSetup:"Slide setup",
      statusIdle:"Ready", statusConnected:"Slide connected", statusWorking:"Opening…", statusAttention:"Needs setup", statusOffline:"Slide offline", connectingTitle:"Opening digital slide", connectingBody:"Connecting to the whole-slide source.", streamingTitle:"Slide ready", streamingBody:"The whole-slide image is streaming.", hostedStreamingBody:"The whole-slide image is streaming from hosted MORPHORA tiles.", localStreamingBody:"The whole-slide image is streaming through the local PMA.start fallback.",
      openSetup:"Open setup", retry:"Retry", developerPanel:"Histology setup", developerIntro:"Author microscopic content and manage hosted or local whole-slide delivery without exposing technical controls to students.",
      connectionHeading:"Slide connection", connectSlide:"Connect slide", authorizeBrowser:"Authorize browser", sourceEyebrow:"Source", deliveryEyebrow:"Delivery", deliveryHeading:"Whole-slide source", deliveryHelp:"Auto prefers a hosted DZI slide and falls back to PMA.start while migration is in progress.", sourceMode:"Source mode", sourceAuto:"Auto · hosted first", sourceHosted:"Hosted DZI only", sourceLocal:"PMA.start only", hostedDescriptor:"Hosted DZI descriptor", localFallbackEyebrow:"Local fallback", slidePath:"Slide path", saveReconnect:"Save & reconnect", resetDefault:"Reset default", hostedUnavailableTitle:"Hosted slide unavailable", hostedUnavailableBody:"This slide does not have a usable hosted DZI source yet.", hostedFailedBody:"The hosted DZI source could not be reached or its tiles are unavailable.", localFallbackUsed:"Hosted source unavailable · using PMA.start fallback", pilotEyebrow:"Pilot migration", pilotTitle:"Hosted source check", pilotUnchecked:"Not checked", pilotChecking:"Checking…", pilotReady:"Ready", pilotFailed:"Failed", pilotHelp:"Validate the DZI descriptor, exact slide dimensions and a real tile before switching away from PMA.start.", pilotReadyHint:"Generate or serve the DZI pyramid, then run the check.", runHostedCheck:"Run hosted check", useLocalPilot:"Use local DZI pilot", restoreAuto:"Restore Auto", pilotNoUrl:"Add a DZI descriptor URL first.", pilotDimensionMismatch:"DZI dimensions do not match this MORPHORA slide manifest.", pilotCheckPassed:"Descriptor OK · {width} × {height} px · tile {tile} · first tile reachable", pilotModeEnabled:"Local DZI pilot enabled. PMA.start is not used in Hosted-only mode.", pilotRestored:"Source settings restored to the manifest defaults.", pmaExportEyebrow:"MDSX ingestion", pmaExportTitle:"PMA → DZI export", pmaExportHelp:"Use PMA.start once on the developer computer to create a standalone static DZI pyramid. Students never need PMA.start.", copyExportCommand:"Copy export command", exportCommandCopied:"Export command copied.",
      technicalEyebrow:"Digital slide", metadataHeading:"Whole-slide metadata", dimensions:"Dimensions", tileSize:"Tile size", physicalField:"Physical field", layers:"Layers", channels:"Channels", format:"Format", native:"Native", associatedEyebrow:"Associated image", slideLabel:"Slide label", availableAfterConnection:"Available after connection", labelUnavailable:"Label unavailable",
      authoringEyebrow:"Content authoring", studioTitle:"Histology Studio", studioIntro:"Create microscopic point labels and polygon regions directly on the whole-slide image. Changes remain local until you export the slide manifest.", studioDraft:"Studio draft", localDraft:"Local draft", pointStructure:"Point structure", pointStructureHelp:"Place one precise microscopic location", regionStructure:"Region structure", regionStructureHelp:"Outline a tissue region with a polygon", editStructure:"Edit structure", structureEditorHelp:"Add bilingual educational content, then save it to the local Studio draft.", structureId:"Structure ID", category:"Category", categoryPlaceholder:"e.g. cortex, trabecula, lesion", nameEnglish:"Name · English", nameSpanish:"Name · Spanish", descriptionEnglish:"Description · English", descriptionSpanish:"Description · Spanish", geometry:"Geometry", saveStructure:"Save structure", deleteStructure:"Delete", movePoint:"Move point", redrawRegion:"Redraw region", exportJson:"Export JSON", resetDraft:"Reset draft", noDraftStructures:"No authored structures yet.", studioMode:"Authoring", finishRegion:"Finish region", cancel:"Cancel", placementPoint:"Click the microscopic structure to place the point.", placementRegion:"Click around the region to add vertices. Finish when at least three points are placed.", vertices:"vertices", focus:"Focus", edit:"Edit", studioNeedsSlide:"Open the slide before authoring structures.", studioSaved:"Structure saved to the local Studio draft.", studioDeleted:"Structure deleted from the local Studio draft.", studioReset:"Local Studio draft reset to the source manifest.", studioExported:"Slide manifest exported.", studioNameRequired:"Add both English and Spanish names before saving.", studioRegionMin:"A region needs at least three points.", comingNext:"Available now",
      readyToLearn:"{count} available", studyMode:"Study mode", quizMode:"Quiz mode", studySetupHelp:"Practice active recall one structure at a time. Reveal the answer, then mark it as Learning or Known.", quizSetupHelp:"Create a short quiz from official structures, your personal labels, or both.", contentSource:"Study content", sourceDistinction:"Official MORPHORA content and personal labels remain clearly separated.", morphoraOfficial:"MORPHORA Official", myLabels:"My Labels", bothSources:"Both", sourceItems:"{count} items", startStudy:"Start study", startQuiz:"Start quiz", questionType:"Question type", mixed:"Mixed", mixedHelp:"Multiple choice + locate", multipleChoice:"Multiple choice", multipleChoiceHelp:"Identify the highlighted structure", locate:"Locate", locateHelp:"Find the structure on the slide", questionCount:"Questions", allAvailable:"All available", personalPractice:"Personal practice", personalPracticeHelp:"Scores using My Labels are personal study results, not an official MORPHORA assessment.", reveal:"Reveal", markLearning:"Learning", markKnown:"Known", next:"Next", exitLearning:"Exit", activeRecall:"Active recall", whatIsHighlighted:"What structure is highlighted?", studyComplete:"Study session complete", studyCompleteBody:"You reviewed {count} structures.", quizQuestion:"Question", locatePrompt:"Locate: {name}", locateInstruction:"Navigate the whole slide, then click your answer.", highlightedPrompt:"Which structure is highlighted?", correct:"Correct", incorrect:"Not quite", correctAnswer:"Correct answer: {name}", quizComplete:"Quiz complete", scoreSummary:"{correct} / {total} correct", noLearningContent:"Add official structures in Studio or create My Labels to use Study and Quiz.", openSlideForLearning:"Open the digital slide before starting a learning session.", known:"Known", learning:"Learning", quizAccuracy:"Quiz", locateAccuracy:"Locate", progressSummary:"{known} known · {learning} learning · {total} available", officialSource:"Official", personalSource:"Personal", bothSource:"Official + Personal", quizResultOfficial:"Official MORPHORA practice", quizResultPersonal:"Personal-label practice", quizResultMixed:"Mixed-source practice",
      slideNotes:"Slide notes", notesHelp:"Keep a personal note for this slide. It stays on this device and is separated by MORPHORA account.", notesPlaceholder:"Write your observations…", saveNotes:"Save notes", noteEmpty:"Empty", noteSaved:"Saved", notSavedYet:"Not saved yet", savedAt:"Saved",
      drawingTools:"Drawing tools", drawingHelp:"Draw directly over the microscopic field. Strokes remain anchored to the slide as you zoom.", pen:"Pen", highlighter:"Highlighter", eraser:"Eraser", color:"Color", size:"Size", undo:"Undo", clear:"Clear", done:"Done", strokes:"strokes", stroke:"stroke",
      saveSlide:"Save slide", savedSlide:"Saved", bookmarkSaved:"Slide saved to your Histology workspace.", bookmarkRemoved:"Slide removed from your Histology workspace.",
      structureSearch:"Search structures…", structuresStudied:"{done} / {total} structures studied", localAccount:"Local account workspace", structureCount:"{count} structures", personalPlacementPoint:"Click the microscopic feature to place your personal label.", personalPlacementRegion:"Click around the area to create your color zone. Finish when at least three points are placed.", personalSaved:"Personal label saved.", personalDeleted:"Personal label deleted.", personalNameRequired:"Add a label name before saving.", personalNeedsSlide:"Open the slide before creating personal labels.", personalLayerVisible:"Personal labels visible", personalLayerHidden:"Personal labels hidden",
      unauthorizedTitle:"Local viewer setup needed", unauthorizedBody:"PMA.start is running, but this browser origin has not been authorized yet. Open Local setup, authorize this browser, then retry.", serverFailedTitle:"Local slide source unavailable", serverFailedBody:"Start PMA.start on this computer, then try again.", liveServerTitle:"Live Server required", liveServerBody:"Open this folder through VS Code Live Server so the local slide source can authorize the browser origin.",
      classificationPending:"Classification pending", normalHistology:"Normal histology", histopathology:"Histopathology", stainPending:"Stain pending", developerStatusIdle:"Idle", developerStatusConnected:"Connected", developerStatusWorking:"Connecting", developerStatusError:"Attention"
    },
    es: {
      moduleKicker:"Atlas microscópico", moduleName:"Histología", library:"Biblioteca", speciesLabel:"Especie", organLabel:"Órgano", diagnosisLabel:"Diagnóstico", stainLabel:"Tinción",
      learnEyebrow:"Aprender", learningActions:"Modos de aprendizaje", study:"Estudio", quiz:"Quiz", needsStructures:"Requiere estructuras", workspaceEyebrow:"Espacio personal", studentTools:"Herramientas del estudiante", notes:"Notas", draw:"Dibujar", bookmark:"Guardar", personalLabels:"Mis etiquetas", personalLabelsHelp:"Crea tus propias etiquetas y zonas con colores para estudiar o enseñar. Estas anotaciones son privadas y están separadas del contenido oficial de MORPHORA.", personalPoint:"Etiqueta puntual", personalPointHelp:"Marca una célula o característica microscópica", personalRegion:"Zona de color", personalRegionHelp:"Delimita una región para estudiar con código de colores", personalLayerTitle:"Capa personal", personalLayerBody:"Solo tú ves estas etiquetas en este dispositivo/espacio de cuenta. Las etiquetas oficiales de MORPHORA no se modifican.", personalAuthoring:"Etiquetado personal", editPersonalLabel:"Editar etiqueta personal", personalEditorHelp:"Nombra tu etiqueta, elige un color y añade una nota de estudio si quieres.", labelName:"Nombre de etiqueta", labelNamePlaceholder:"ej. foco inflamatorio", personalCategoryPlaceholder:"Grupo opcional", personalNote:"Nota de estudio", personalNotePlaceholder:"Observación o nota docente opcional…", labelColor:"Color de etiqueta", zoneOpacity:"Opacidad de zona", deletePersonal:"Eliminar", savePersonal:"Guardar etiqueta", noPersonalLabels:"Aún no hay etiquetas personales.", personalLabelCount:"{count} etiquetas", personalLabelSingular:"etiqueta", personalLabelPlural:"etiquetas", official:"Oficial", mine:"Mías", cloudLocal:"Invitado · Local", cloudSynced:"Sincronizado", cloudSyncing:"Sincronizando…", cloudOffline:"Sin conexión · guardado local", cloudAttention:"La sincronización requiere atención", cloudSignIn:"Inicia sesión desde la pantalla principal de MORPHORA para sincronizar Histología entre dispositivos.", cloudSyncComplete:"Espacio de Histología sincronizado.",
      contentEyebrow:"Contenido", structures:"Estructuras", visible:"Visibles", hidden:"Ocultas", noStructuresTitle:"Aún no hay estructuras.", noStructuresBody:"La lámina está preparada para recibir etiquetas cuando comience la autoría en Histology Studio.",
      progressEyebrow:"Progreso", learningProgress:"Progreso de aprendizaje", magnification:"Aumento", resolution:"Resolución", position:"Posición", overview:"Vista general", fullscreen:"Pantalla completa", exitFullscreen:"Salir de pantalla completa",
      readyTitle:"Lista para microscopía de lámina completa.", readyBody:"Abre la lámina para explorar desde la arquitectura del tejido hasta el detalle celular.", openSlide:"Abrir lámina", openSlideTitle:"Abrir lámina digital", openSlideBody:"Transmite este espécimen desde la mejor fuente de lámina completa disponible.", localSetup:"Configuración de lámina",
      statusIdle:"Lista", statusConnected:"Lámina conectada", statusWorking:"Abriendo…", statusAttention:"Requiere configuración", statusOffline:"Lámina sin conexión", connectingTitle:"Abriendo lámina digital", connectingBody:"Conectando con la fuente de lámina completa.", streamingTitle:"Lámina lista", streamingBody:"La imagen de lámina completa se está transmitiendo.", hostedStreamingBody:"La lámina se está transmitiendo desde mosaicos alojados por MORPHORA.", localStreamingBody:"La lámina se está transmitiendo mediante el respaldo local de PMA.start.",
      openSetup:"Abrir configuración", retry:"Reintentar", developerPanel:"Configuración de histología", developerIntro:"Crea contenido microscópico y administra la entrega alojada o local sin exponer controles técnicos a los estudiantes.",
      connectionHeading:"Conexión de la lámina", connectSlide:"Conectar lámina", authorizeBrowser:"Autorizar navegador", sourceEyebrow:"Fuente", deliveryEyebrow:"Entrega", deliveryHeading:"Fuente de lámina completa", deliveryHelp:"Auto prioriza una lámina DZI alojada y usa PMA.start como respaldo mientras avanza la migración.", sourceMode:"Modo de fuente", sourceAuto:"Auto · alojada primero", sourceHosted:"Solo DZI alojado", sourceLocal:"Solo PMA.start", hostedDescriptor:"Descriptor DZI alojado", localFallbackEyebrow:"Respaldo local", slidePath:"Ruta de la lámina", saveReconnect:"Guardar y reconectar", resetDefault:"Restablecer", hostedUnavailableTitle:"Lámina alojada no disponible", hostedUnavailableBody:"Esta lámina aún no tiene una fuente DZI alojada utilizable.", hostedFailedBody:"No se pudo acceder a la fuente DZI alojada o sus mosaicos no están disponibles.", localFallbackUsed:"Fuente alojada no disponible · usando respaldo PMA.start", pilotEyebrow:"Migración piloto", pilotTitle:"Comprobación de fuente alojada", pilotUnchecked:"Sin comprobar", pilotChecking:"Comprobando…", pilotReady:"Lista", pilotFailed:"Falló", pilotHelp:"Valida el descriptor DZI, las dimensiones exactas de la lámina y un mosaico real antes de dejar PMA.start.", pilotReadyHint:"Genera o sirve la pirámide DZI y luego ejecuta la comprobación.", runHostedCheck:"Comprobar fuente", useLocalPilot:"Usar piloto DZI local", restoreAuto:"Restaurar Auto", pilotNoUrl:"Añade primero una URL de descriptor DZI.", pilotDimensionMismatch:"Las dimensiones DZI no coinciden con el manifiesto de esta lámina MORPHORA.", pilotCheckPassed:"Descriptor OK · {width} × {height} px · mosaico {tile} · primer mosaico accesible", pilotModeEnabled:"Piloto DZI local activado. PMA.start no se usa en modo Solo DZI alojado.", pilotRestored:"La fuente se restauró a los valores del manifiesto.", pmaExportEyebrow:"Ingesta MDSX", pmaExportTitle:"Exportación PMA → DZI", pmaExportHelp:"Usa PMA.start una sola vez en el computador de desarrollo para crear una pirámide DZI estática e independiente. Los estudiantes nunca necesitan PMA.start.", copyExportCommand:"Copiar comando de exportación", exportCommandCopied:"Comando de exportación copiado.",
      technicalEyebrow:"Lámina digital", metadataHeading:"Metadatos de lámina completa", dimensions:"Dimensiones", tileSize:"Tamaño de mosaico", physicalField:"Campo físico", layers:"Capas", channels:"Canales", format:"Formato", native:"Nativo", associatedEyebrow:"Imagen asociada", slideLabel:"Etiqueta de la lámina", availableAfterConnection:"Disponible tras conectar", labelUnavailable:"Etiqueta no disponible",
      authoringEyebrow:"Autoría de contenido", studioTitle:"Histology Studio", studioIntro:"Crea etiquetas puntuales y regiones poligonales directamente sobre la lámina completa. Los cambios permanecen locales hasta exportar el manifiesto.", studioDraft:"Borrador de Studio", localDraft:"Borrador local", pointStructure:"Estructura puntual", pointStructureHelp:"Marca una ubicación microscópica precisa", regionStructure:"Estructura regional", regionStructureHelp:"Delimita una región tisular con un polígono", editStructure:"Editar estructura", structureEditorHelp:"Añade contenido educativo bilingüe y guárdalo en el borrador local de Studio.", structureId:"ID de estructura", category:"Categoría", categoryPlaceholder:"ej. corteza, trabécula, lesión", nameEnglish:"Nombre · Inglés", nameSpanish:"Nombre · Español", descriptionEnglish:"Descripción · Inglés", descriptionSpanish:"Descripción · Español", geometry:"Geometría", saveStructure:"Guardar estructura", deleteStructure:"Eliminar", movePoint:"Mover punto", redrawRegion:"Redibujar región", exportJson:"Exportar JSON", resetDraft:"Restablecer borrador", noDraftStructures:"Aún no hay estructuras creadas.", studioMode:"Autoría", finishRegion:"Finalizar región", cancel:"Cancelar", placementPoint:"Haz clic sobre la estructura microscópica para colocar el punto.", placementRegion:"Haz clic alrededor de la región para añadir vértices. Finaliza cuando haya al menos tres puntos.", vertices:"vértices", focus:"Enfocar", edit:"Editar", studioNeedsSlide:"Abre la lámina antes de crear estructuras.", studioSaved:"Estructura guardada en el borrador local de Studio.", studioDeleted:"Estructura eliminada del borrador local de Studio.", studioReset:"Borrador local de Studio restablecido al manifiesto de origen.", studioExported:"Manifiesto de la lámina exportado.", studioNameRequired:"Añade los nombres en inglés y español antes de guardar.", studioRegionMin:"Una región necesita al menos tres puntos.", comingNext:"Disponible ahora",
      readyToLearn:"{count} disponibles", studyMode:"Modo estudio", quizMode:"Modo quiz", studySetupHelp:"Practica recuerdo activo estructura por estructura. Revela la respuesta y luego márcala como En aprendizaje o Conocida.", quizSetupHelp:"Crea un quiz corto con estructuras oficiales, tus etiquetas personales o ambas.", contentSource:"Contenido de estudio", sourceDistinction:"El contenido oficial de MORPHORA y las etiquetas personales permanecen claramente separados.", morphoraOfficial:"MORPHORA Oficial", myLabels:"Mis etiquetas", bothSources:"Ambas", sourceItems:"{count} elementos", startStudy:"Iniciar estudio", startQuiz:"Iniciar quiz", questionType:"Tipo de pregunta", mixed:"Mixto", mixedHelp:"Opción múltiple + localizar", multipleChoice:"Opción múltiple", multipleChoiceHelp:"Identifica la estructura resaltada", locate:"Localizar", locateHelp:"Encuentra la estructura en la lámina", questionCount:"Preguntas", allAvailable:"Todas disponibles", personalPractice:"Práctica personal", personalPracticeHelp:"Los puntajes con Mis etiquetas son resultados personales de estudio, no una evaluación oficial de MORPHORA.", reveal:"Revelar", markLearning:"En aprendizaje", markKnown:"Conocida", next:"Siguiente", exitLearning:"Salir", activeRecall:"Recuerdo activo", whatIsHighlighted:"¿Qué estructura está resaltada?", studyComplete:"Sesión de estudio completada", studyCompleteBody:"Revisaste {count} estructuras.", quizQuestion:"Pregunta", locatePrompt:"Localiza: {name}", locateInstruction:"Navega por la lámina completa y luego haz clic en tu respuesta.", highlightedPrompt:"¿Qué estructura está resaltada?", correct:"Correcto", incorrect:"No exactamente", correctAnswer:"Respuesta correcta: {name}", quizComplete:"Quiz completado", scoreSummary:"{correct} / {total} correctas", noLearningContent:"Añade estructuras oficiales en Studio o crea Mis etiquetas para usar Estudio y Quiz.", openSlideForLearning:"Abre la lámina digital antes de iniciar una sesión de aprendizaje.", known:"Conocidas", learning:"En aprendizaje", quizAccuracy:"Quiz", locateAccuracy:"Localizar", progressSummary:"{known} conocidas · {learning} en aprendizaje · {total} disponibles", officialSource:"Oficial", personalSource:"Personal", bothSource:"Oficial + Personal", quizResultOfficial:"Práctica oficial de MORPHORA", quizResultPersonal:"Práctica con etiquetas personales", quizResultMixed:"Práctica de fuentes mixtas",
      slideNotes:"Notas de la lámina", notesHelp:"Guarda una nota personal para esta lámina. Permanece en este dispositivo y se separa por cuenta de MORPHORA.", notesPlaceholder:"Escribe tus observaciones…", saveNotes:"Guardar notas", noteEmpty:"Vacía", noteSaved:"Guardada", notSavedYet:"Aún no guardada", savedAt:"Guardada",
      drawingTools:"Herramientas de dibujo", drawingHelp:"Dibuja directamente sobre el campo microscópico. Los trazos permanecen anclados a la lámina al hacer zoom.", pen:"Lápiz", highlighter:"Resaltador", eraser:"Borrador", color:"Color", size:"Tamaño", undo:"Deshacer", clear:"Borrar todo", done:"Listo", strokes:"trazos", stroke:"trazo",
      saveSlide:"Guardar lámina", savedSlide:"Guardada", bookmarkSaved:"Lámina guardada en tu espacio de Histología.", bookmarkRemoved:"Lámina eliminada de tu espacio de Histología.",
      structureSearch:"Buscar estructuras…", structuresStudied:"{done} / {total} estructuras estudiadas", localAccount:"Espacio local de cuenta", structureCount:"{count} estructuras", personalPlacementPoint:"Haz clic sobre la característica microscópica para colocar tu etiqueta personal.", personalPlacementRegion:"Haz clic alrededor del área para crear tu zona de color. Finaliza cuando haya al menos tres puntos.", personalSaved:"Etiqueta personal guardada.", personalDeleted:"Etiqueta personal eliminada.", personalNameRequired:"Añade un nombre antes de guardar.", personalNeedsSlide:"Abre la lámina antes de crear etiquetas personales.", personalLayerVisible:"Etiquetas personales visibles", personalLayerHidden:"Etiquetas personales ocultas",
      unauthorizedTitle:"Se requiere configuración del visor local", unauthorizedBody:"PMA.start está ejecutándose, pero este origen del navegador aún no está autorizado. Abre Configuración local, autoriza este navegador y vuelve a intentar.", serverFailedTitle:"La fuente local no está disponible", serverFailedBody:"Inicia PMA.start en este computador y vuelve a intentar.", liveServerTitle:"Se requiere Live Server", liveServerBody:"Abre esta carpeta mediante VS Code Live Server para que la fuente local pueda autorizar el origen del navegador.",
      classificationPending:"Clasificación pendiente", normalHistology:"Histología normal", histopathology:"Histopatología", stainPending:"Tinción pendiente", developerStatusIdle:"Inactivo", developerStatusConnected:"Conectado", developerStatusWorking:"Conectando", developerStatusError:"Atención"
    }
  };

  let manifest = null;
  let sourceManifest = null;
  let studioDraft = null;
  let viewer = null;
  let imageInfo = null;
  let currentSettings = null;
  let activeProvider = null;
  let connecting = false;
  let language = loadLanguage();
  let structuresVisible = true;
  let personalAnnotationsVisible = true;
  let structureLayer = "official";
  let workspace = null;
  let drawingActive = false;
  let currentStroke = null;
  let drawTool = "pen";
  let drawUndo = [];
  let drawPointerId = null;
  let toastTimer = null;
  let studioMode = null;
  let studioPolygonPoints = [];
  let pendingStructure = null;
  let editingStructureId = null;
  let personalMode = null;
  let personalPolygonPoints = [];
  let pendingPersonalAnnotation = null;
  let editingPersonalId = null;
  let learningSession = null;
  let studySource = "official";
  let viewerAjaxMode = null;
  let quizSource = "official";
  let quizMode = "mixed";
  let hostedCheckState = { state:"idle", key:"pilotReadyHint", vars:{}, raw:"" };

  const $ = (id) => document.getElementById(id);
  const els = {};

  function cacheElements() {
    [
      "connectionPill","connectionPillText","histologyCloudButton","histologyCloudText","connectButton","emptyConnectButton","studentConnectCard","studentConnectTitle","studentConnectBody","setupButton",
      "slideTitle","slideSubtitle","speciesSystemLine","categoryBadge","stainBadge","organQuickFact","speciesQuickFact",
      "studyButton","studyButtonStatus","quizButton","quizButtonStatus","structureReadyChip","studyDrawer","quizDrawer","studySourceOfficial","studySourcePersonal","studySourceBoth","studyOfficialCount","studyPersonalCount","studyBothCount","studyConfigSummary","startStudyButton","quizSourceOfficial","quizSourcePersonal","quizSourceBoth","quizOfficialCount","quizPersonalCount","quizBothCount","quizModeMixed","quizModeMultiple","quizModeLocate","quizLengthSelect","personalPracticeNote","quizConfigSummary","startQuizButton","notesButton","notesStatus","drawButton","drawingStatus","personalLabelsButton","personalLabelsStatus","bookmarkButton","bookmarkIcon","bookmarkStatus",
      "structuresVisibilityButton","personalVisibilityButton","officialStructuresTab","personalStructuresTab","personalLayerCount","structureSearch","structureList","structureEmpty","progressValue","progressBar","progressCopy","knownCountValue","learningCountValue","quizAccuracyValue","locateAccuracyValue",
      "viewerStage","viewerEmpty","histologyViewer","structureOverlay","personalAnnotationOverlay","learningTargetOverlay","learningSessionPanel","learningSessionKicker","learningSessionTitle","learningSessionCounter","learningSessionPrompt","learningSessionAnswer","learningAnswerSource","learningAnswerName","learningAnswerDescription","learningAnswers","learningFeedback","learningExitButton","learningRevealButton","learningMarkLearningButton","learningMarkKnownButton","learningNextButton","drawingCanvas","personalDraftOverlay","personalInteractionLayer","personalModeBar","personalModeTitle","personalModePrompt","personalCancelModeButton","personalFinishRegionButton","viewerError","viewerErrorTitle","viewerErrorBody","errorSetupButton","errorRetryButton",
      "magnificationReadout","resolutionReadout","positionReadout","scaleOverlay","scaleLine","scaleLabel","zoomOutButton","zoomInButton","homeButton","fullscreenButton","themeToggle","themeIcon","languageToggle","languageCode","viewerSlideName","objectiveGroup","toolbarStructuresButton","structureCountBadge","toolbarNote",
      "notesDrawer","notesEditor","notesSavedAt","saveNotesButton","drawingDrawer","drawingColor","drawingSize","drawingSizeValue","drawingUndoButton","drawingClearButton","drawingDoneButton","personalLabelsDrawer","personalAddPointButton","personalAddRegionButton","personalManagerList","personalManagerEmpty","personalEditorDrawer","personalTitleInput","personalCategoryInput","personalNoteInput","personalColorInput","personalColorValue","personalColorPalette","personalOpacityInput","personalOpacityValue","personalOpacityRow","personalGeometrySummary","personalRepositionButton","deletePersonalButton","cancelPersonalEditButton","savePersonalButton","structureEditorDrawer","structureIdInput","structureCategoryInput","structureNameEnInput","structureNameEsInput","structureDescriptionEnInput","structureDescriptionEsInput","structureGeometrySummary","studioRepositionButton","deleteStructureButton","cancelStructureEditButton","saveStructureButton","drawerBackdrop",
      "developerButton","developerPanel","developerCloseButton","developerStatus","developerConnectButton","authorizeButton","connectionTitle","connectionBody","sourceModeInput","hostedUrlInput","activeProviderValue","sourceRoutePreview","hostedCheckStatus","hostedCheckDetails","hostedCheckButton","localPilotButton","restoreAutoButton","pilotUrlPreview","pmaExportCommandPreview","pmaExportCopyButton","serverInput","slidePathInput","saveSourceButton","resetSourceButton","dimensionsValue","resolutionValue","tileSizeValue","physicalFieldValue","layersValue","channelsValue","formatDisplay","nativeDisplay","barcodeImage","barcodePlaceholder","studioAddPointButton","studioAddRegionButton","studioDraftStatus","studioDraftBadge","studioStructureList","studioListEmpty","exportManifestButton","resetStudioDraftButton","studioDraftOverlay","studioInteractionLayer","studioModeBar","studioModeTitle","studioModePrompt","studioCancelModeButton","studioFinishRegionButton"
    ].forEach((id) => { els[id] = $(id); });
    els.drawToolButtons = Array.from(document.querySelectorAll("[data-draw-tool]"));
    els.annotationColorButtons = Array.from(document.querySelectorAll("[data-annotation-color]"));
    els.drawerCloseButtons = Array.from(document.querySelectorAll("[data-close-drawer]"));
    els.studySourceButtons = Array.from(document.querySelectorAll("[data-study-source]"));
    els.quizSourceButtons = Array.from(document.querySelectorAll("[data-quiz-source]"));
    els.quizModeButtons = Array.from(document.querySelectorAll("[data-quiz-mode]"));
  }

  function loadLanguage() {
    const value = localStorage.getItem(LANGUAGE_KEY);
    return value === "es" || value === "en" ? value : "en";
  }

  function tr(key, vars = {}) {
    let value = COPY[language]?.[key] || COPY.en[key] || key;
    Object.entries(vars).forEach(([name, replacement]) => { value = value.replaceAll(`{${name}}`, String(replacement)); });
    return value;
  }
  function localize(value) { return value && typeof value === "object" ? (value[language] || value.en || value.es || "") : String(value ?? ""); }
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function studioKey() { return `${STUDIO_PREFIX}${manifest?.id || requestedSlide}`; }
  function slugify(value) { return String(value || "structure").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,64) || "structure"; }
  function uniqueStructureId(base, ignoreId = null) { const ids = new Set((studioDraft?.structures || manifest?.structures || []).map(s => s.id).filter(id => id !== ignoreId)); let candidate = slugify(base), n = 2; while (ids.has(candidate)) candidate = `${slugify(base)}-${n++}`; return candidate; }
  function normalizeServerUrl(value) { let url = String(value || "").trim(); if (!url) return "http://127.0.0.1:54001/"; if (!/^https?:\/\//i.test(url)) url = `http://${url}`; if (!url.endsWith("/")) url += "/"; return url; }
  function settingsKey() { return `${SETTINGS_PREFIX}${manifest?.id || requestedSlide}`; }

  function principalKey() {
    try {
      const Storage = window.MorphoraStorage;
      return String(Storage?.readText?.(Storage?.keys?.localVaultPrincipal, { fallback:"guest" }) || "guest").replace(/[^a-zA-Z0-9._:@-]+/g, "_").slice(0,160) || "guest";
    } catch (_) { return "guest"; }
  }
  function workspaceKey() { return `${WORKSPACE_PREFIX}${principalKey()}:${manifest?.id || requestedSlide}`; }
  function emptyWorkspace() { return { schemaVersion:4, slideId:manifest?.id || requestedSlide, updatedAt:null, note:{ text:"", updatedAt:null }, bookmarked:false, drawings:[], studiedStructureIds:[], personalAnnotations:[], studyProgress:{}, quizHistory:[] }; }
  function loadWorkspace() {
    try {
      const parsed = JSON.parse(localStorage.getItem(workspaceKey()) || "null");
      if (!parsed || typeof parsed !== "object") return emptyWorkspace();
      return { ...emptyWorkspace(), ...parsed, schemaVersion:4, note:{ ...emptyWorkspace().note, ...(parsed.note || {}) }, drawings:Array.isArray(parsed.drawings) ? parsed.drawings : [], studiedStructureIds:Array.isArray(parsed.studiedStructureIds) ? parsed.studiedStructureIds : [], personalAnnotations:Array.isArray(parsed.personalAnnotations) ? parsed.personalAnnotations : [], studyProgress:parsed.studyProgress && typeof parsed.studyProgress === "object" ? parsed.studyProgress : {}, quizHistory:Array.isArray(parsed.quizHistory) ? parsed.quizHistory : [] };
    } catch (_) { return emptyWorkspace(); }
  }
  function saveWorkspace() {
    if (!workspace) return;
    workspace.schemaVersion = 4;
    workspace.updatedAt = new Date().toISOString();
    try { localStorage.setItem(workspaceKey(), JSON.stringify(workspace)); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent("morphora:histologyworkspacechange", { detail:{ slideId:manifest?.id || requestedSlide, workspace:clone(workspace), source:"local" } })); } catch (_) {}
    updateWorkspaceUi();
  }

  function manifestDelivery() {
    const delivery=manifest?.delivery&&typeof manifest.delivery==="object"?manifest.delivery:{};
    const hosted=delivery.hosted&&typeof delivery.hosted==="object"?delivery.hosted:{};
    return { mode:window.MorphoraHistologySource?.normalizeMode?.(delivery.mode||"auto")||"auto", hostedDescriptorUrl:String(hosted.descriptorUrl||"").trim() };
  }
  function loadSettings() {
    const delivery=manifestDelivery();
    const defaults = { mode:delivery.mode, hostedDescriptorUrl:delivery.hostedDescriptorUrl, serverUrl:normalizeServerUrl(manifest.source.serverUrl), slidePath:manifest.source.slidePath, sessionId:manifest.source.sessionId || "SDK.Python" };
    try {
      const stored = JSON.parse(localStorage.getItem(settingsKey()) || "null");
      const merged = { ...defaults, ...(stored && typeof stored === "object" ? stored : {}), mode:window.MorphoraHistologySource?.normalizeMode?.(stored?.mode||defaults.mode)||defaults.mode };
      // Public visitor always starts with cloud-hosted, approved guest slides.
      if (['hueso-1','hueso-4'].includes(manifest?.id) && ['morphora.cl','www.morphora.cl'].includes(location.hostname)) return defaults;
      return merged;
    } catch (_) { return defaults; }
  }
  function saveSettings() { localStorage.setItem(settingsKey(), JSON.stringify(currentSettings)); }
  function resetSettings() { const delivery=manifestDelivery(); localStorage.removeItem(settingsKey()); currentSettings = { mode:delivery.mode, hostedDescriptorUrl:delivery.hostedDescriptorUrl, serverUrl:normalizeServerUrl(manifest.source.serverUrl), slidePath:manifest.source.slidePath, sessionId:manifest.source.sessionId || "SDK.Python" }; syncDeveloperFields(); }

  function effectiveTheme() { const stored = localStorage.getItem(THEME_KEY); if (stored === "light" || stored === "dark") return stored; return window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark"; }
  function applyTheme(theme = effectiveTheme()) { document.documentElement.dataset.theme = theme; els.themeIcon.textContent = theme === "light" ? "☀" : "☾"; document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#fff8fb" : "#170c17"); }
  function toggleTheme() { const next = document.documentElement.dataset.theme === "light" ? "dark" : "light"; localStorage.setItem(THEME_KEY, next); applyTheme(next); }
  function toggleLanguage() { language = language === "en" ? "es" : "en"; localStorage.setItem(LANGUAGE_KEY, language); applyCopy(); renderStructures(); renderPersonalAnnotations(); renderStructureList(); renderPersonalManagerList(); renderStudioStructureList(); updateWorkspaceUi(); updateLearningSetup(); renderLearningSession(); }

  function applyCopy() {
    document.documentElement.lang = language;
    els.languageCode.textContent = language.toUpperCase();
    document.querySelectorAll("[data-copy]").forEach((node) => { node.textContent = tr(node.dataset.copy); });
    document.querySelectorAll("[data-placeholder]").forEach((node) => { node.placeholder = tr(node.dataset.placeholder); });
    if (manifest) applyManifestLabels();
    if (!imageInfo && manifest) setStatus("idle", tr("statusIdle"));
    els.fullscreenButton.textContent = document.fullscreenElement ? tr("exitFullscreen") : tr("fullscreen");
    els.structuresVisibilityButton.textContent = tr("official");
    els.personalVisibilityButton.textContent = tr("mine");
    els.toolbarStructuresButton.querySelector("span:first-child").textContent = tr("structures");
    updateWorkspaceUi();
    updateStudioSummary();
    updateLearningSetup();
    renderLearningSession();
    if(currentSettings)syncProviderUi();
    renderHostedCheckUi();
  }

  function setStatus(state, label, title, body) {
    els.connectionPill.dataset.state = state;
    els.connectionPillText.textContent = label;
    if (title) els.connectionTitle.textContent = title;
    if (body) els.connectionBody.textContent = body;
    els.developerStatus.textContent = state === "connected" ? tr("developerStatusConnected") : state === "working" ? tr("developerStatusWorking") : state === "error" ? tr("developerStatusError") : tr("developerStatusIdle");
    els.developerStatus.dataset.state = state;
  }

  function setError(title, body) {
    els.viewerErrorTitle.textContent = title;
    els.viewerErrorBody.textContent = body;
    els.viewerError.hidden = false;
    setStatus("error", tr("statusAttention"), title, body);
    els.studentConnectCard.dataset.state = "error";
    els.studentConnectTitle.textContent = title;
    els.studentConnectBody.textContent = body;
  }
  function clearError() { els.viewerError.hidden = true; els.studentConnectCard.dataset.state = "idle"; }

  function showToast(message) {
    let toast = document.getElementById("histologyToast");
    if (!toast) { toast = document.createElement("div"); toast.id = "histologyToast"; toast.className = "histology-toast"; document.body.appendChild(toast); }
    toast.textContent = message; toast.classList.add("is-visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function apiUrl(method, params = {}) { const url = new URL(`api/json/${method}`, currentSettings.serverUrl); Object.entries(params).forEach(([key,value]) => { if (value !== undefined && value !== null) url.searchParams.set(key,String(value)); }); return url.toString(); }
  function tileUrl(level, x, y) { const url = new URL("tile", currentSettings.serverUrl); const p=url.searchParams; p.set("sessionID",currentSettings.sessionId); p.set("pathOrUid",currentSettings.slidePath); p.set("timeframe","0"); p.set("layer","0"); p.set("channels","0"); p.set("x",String(x)); p.set("y",String(y)); p.set("z",String(level)); p.set("cache","true"); p.set("format","jpg"); p.set("quality","90"); return url.toString(); }
  function associatedUrl(kind,width=360,height=180) { const url=new URL(kind,currentSettings.serverUrl); url.searchParams.set("SessionID",currentSettings.sessionId); url.searchParams.set("pathOrUid",currentSettings.slidePath); url.searchParams.set("w",String(width)); url.searchParams.set("h",String(height)); return url.toString(); }
  function unwrap(value) { return value && typeof value === "object" && "d" in value ? value.d : value; }
  async function fetchJson(url,options={}) { const response=await fetch(url,{cache:"no-store",...options}); if(!response.ok) throw new Error(`PMA.start returned HTTP ${response.status}.`); const result=unwrap(await response.json()); if(result && typeof result === "object" && (result.Code || result.Message) && !result.Width) throw new Error(result.Message || result.Code); return result; }
  function parseNumber(value,fallback){const parsed=Number.parseFloat(value);return Number.isFinite(parsed)?parsed:fallback;}
  function parseInteger(value,fallback){const parsed=Number.parseInt(value,10);return Number.isInteger(parsed)?parsed:fallback;}
  function deriveSlideInfo(remote){const fallback=manifest.image;const width=parseInteger(remote?.Width,fallback.width);const height=parseInteger(remote?.Height,fallback.height);const tileSize=parseInteger(remote?.TileSize,fallback.tileSize);const mppX=parseNumber(remote?.MicrometresPerPixelX??remote?.MicrometersPerPixelX,fallback.micrometresPerPixelX);const mppY=parseNumber(remote?.MicrometresPerPixelY??remote?.MicrometersPerPixelY,fallback.micrometresPerPixelY);let maxZoomLevel=parseInteger(remote?.MaxZoomLevel??remote?.NumberOfZoomLevels,fallback.maxZoomLevel);if(!Number.isInteger(maxZoomLevel)||maxZoomLevel<1)maxZoomLevel=Math.ceil(Math.log2(Math.max(width,height)/tileSize));return{...remote,Width:width,Height:height,TileSize:tileSize,MaxZoomLevel:maxZoomLevel,MicrometresPerPixelX:mppX,MicrometresPerPixelY:mppY};}
  function remoteFormat(info){return info?.FileFormat||info?.Format||manifest.image.format;}
  function createLocalTileSource(info){return{width:info.Width,height:info.Height,tileSize:info.TileSize,tileOverlap:0,minLevel:0,maxLevel:info.MaxZoomLevel,getTileUrl(level,x,y){return tileUrl(level,x,y);}};}
  function hostedDescriptorUrl(value=currentSettings?.hostedDescriptorUrl||""){return window.MorphoraHistologySource?.resolveUrl?.(value,location.href)||String(value||"").trim();}
  function localPilotDescriptorUrl(){return `http://127.0.0.1:8008/${encodeURIComponent(manifest?.id||requestedSlide)}/slide.dzi`;}
  function assertHostedGeometry(info){
    const expectedWidth=Number(manifest?.image?.width||0),expectedHeight=Number(manifest?.image?.height||0);
    if(Number(info?.Width)!==expectedWidth||Number(info?.Height)!==expectedHeight){
      throw new Error(`${tr("pilotDimensionMismatch")} DZI ${Number(info?.Width||0).toLocaleString()} × ${Number(info?.Height||0).toLocaleString()} px · MORPHORA ${expectedWidth.toLocaleString()} × ${expectedHeight.toLocaleString()} px.`);
    }
    return info;
  }
  const HISTOLOGY_GATEWAY_ORIGIN = "https://morphora-histology-gateway.martin-fuentesvet.workers.dev";
  async function hostedAuthorizationHeaders(descriptorUrl) {
    const url = new URL(descriptorUrl, location.href);
    // Never forward a user's Supabase bearer token to a URL entered in Developer Setup.
    if (url.origin !== HISTOLOGY_GATEWAY_ORIGIN || !url.pathname.startsWith('/slides/')) return {};
    const {session,error} = await window.MorphoraAuth?.getSession?.() || {};
    if (error || !session?.access_token) throw new Error(language === 'es'
      ? 'Inicia sesión en MORPHORA para ver esta lámina privada.'
      : 'Sign in to MORPHORA to open this private slide.');
    return {Authorization:`Bearer ${session.access_token}`};
  }
  async function getHostedDziInfo(descriptorOverride=""){
    const descriptorUrl=hostedDescriptorUrl(descriptorOverride||currentSettings?.hostedDescriptorUrl||"");
    if(!descriptorUrl)throw new Error(tr("hostedUnavailableBody"));
    if(!window.MorphoraHistologySource)throw new Error("Histology source provider did not load.");
    const headers=await hostedAuthorizationHeaders(descriptorUrl);
    const response=await fetch(descriptorUrl,{cache:"no-store",headers});
    if(!response.ok)throw new Error(`Hosted DZI returned HTTP ${response.status}.`);
    const xml=await response.text();
    const info=assertHostedGeometry(window.MorphoraHistologySource.parseDziDescriptor(xml,descriptorUrl,manifest.image));
    const firstTile=window.MorphoraHistologySource.tileUrl(info,0,0,0);
    const probe=await fetch(firstTile,{cache:"no-store",headers});
    if(!probe.ok)throw new Error(`Hosted DZI tile probe returned HTTP ${probe.status}.`);
    return {...info, privateAjaxHeaders:headers};
  }
  function renderHostedCheckUi(){
    if(!els.hostedCheckStatus||!els.hostedCheckDetails)return;
    const state=hostedCheckState?.state||"idle";
    const statusKey=state==="checking"?"pilotChecking":state==="ready"?"pilotReady":state==="error"?"pilotFailed":"pilotUnchecked";
    els.hostedCheckStatus.textContent=tr(statusKey);els.hostedCheckStatus.dataset.state=state;
    els.hostedCheckDetails.dataset.state=state;
    els.hostedCheckDetails.textContent=hostedCheckState.raw||tr(hostedCheckState.key||"pilotReadyHint",hostedCheckState.vars||{});
    if(els.pilotUrlPreview)els.pilotUrlPreview.textContent=localPilotDescriptorUrl();
  }
  function setHostedCheckState(state,key="pilotReadyHint",vars={},raw=""){hostedCheckState={state,key,vars,raw};renderHostedCheckUi();}
  async function runHostedSourceCheck({descriptorUrl="",notify=true}={}){
    const candidate=String(descriptorUrl||els.hostedUrlInput?.value||currentSettings?.hostedDescriptorUrl||"").trim();
    if(!candidate){setHostedCheckState("error","pilotNoUrl");if(notify)showToast(tr("pilotNoUrl"));return null;}
    setHostedCheckState("checking","pilotReadyHint");if(els.hostedCheckButton)els.hostedCheckButton.disabled=true;
    try{
      const info=await getHostedDziInfo(candidate);
      setHostedCheckState("ready","pilotCheckPassed",{width:Number(info.Width).toLocaleString(),height:Number(info.Height).toLocaleString(),tile:Number(info.TileSize).toLocaleString()});
      if(notify)showToast(tr("pilotReady"));
      return info;
    }catch(error){setHostedCheckState("error","pilotReadyHint",{},error?.message||String(error));if(notify)showToast(tr("pilotFailed"));return null;}
    finally{if(els.hostedCheckButton)els.hostedCheckButton.disabled=false;}
  }
  async function enableLocalDziPilot(){
    const url=localPilotDescriptorUrl();
    currentSettings.mode="hosted";currentSettings.hostedDescriptorUrl=url;saveSettings();syncDeveloperFields();
    const info=await runHostedSourceCheck({descriptorUrl:url,notify:false});
    if(!info)return;showToast(tr("pilotModeEnabled"));connectSlide();
  }
  function restoreAutoSource(){
    const delivery=manifestDelivery();currentSettings.mode="auto";currentSettings.hostedDescriptorUrl=delivery.hostedDescriptorUrl;saveSettings();activeProvider=null;setHostedCheckState("idle","pilotReadyHint");syncDeveloperFields();showToast(tr("pilotRestored"));connectSlide();
  }

  function updateMetadata(info) {
    const width=info.Width,height=info.Height,mppX=info.MicrometresPerPixelX,mppY=info.MicrometresPerPixelY;
    els.dimensionsValue.textContent=`${width.toLocaleString()} × ${height.toLocaleString()} px`;
    els.resolutionValue.textContent=`${mppX.toFixed(6)} µm/px`;
    els.tileSizeValue.textContent=`${info.TileSize.toLocaleString()} px`;
    els.physicalFieldValue.textContent=`${(width*mppX/1000).toFixed(2)} × ${(height*mppY/1000).toFixed(2)} mm`;
    const layers=info.TimeFrames?.[0]?.Layers?.length??manifest.image.layers; const channels=info.TimeFrames?.[0]?.Layers?.[0]?.Channels?.length??manifest.image.channels;
    els.layersValue.textContent=String(layers); els.channelsValue.textContent=String(channels); els.resolutionReadout.textContent=`${mppX.toFixed(3)} µm/px`; els.formatDisplay.textContent=remoteFormat(info); els.nativeDisplay.textContent=`${manifest.objective.nativeMagnification}×`;
  }

  function ensureViewer(useAjax = false) {
    // Preserve v0.8.2 PMA.start image-loading behavior if hosted delivery fails.
    if (viewer && viewerAjaxMode === Boolean(useAjax)) return viewer;
    if (viewer) { viewer.destroy(); viewer = null; }
    viewerAjaxMode = Boolean(useAjax);
    if (!window.OpenSeadragon) throw new Error("OpenSeadragon did not load. Check your internet connection and reload the page.");
    viewer=OpenSeadragon({id:"histologyViewer",loadTilesWithAjax:Boolean(useAjax),prefixUrl:"https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",showNavigator:true,navigatorPosition:"BOTTOM_RIGHT",navigatorWidth:"142px",navigatorHeight:"112px",showNavigationControl:false,showFullPageControl:false,visibilityRatio:.55,constrainDuringPan:true,minZoomImageRatio:.75,maxZoomPixelRatio:1.15,animationTime:.65,blendTime:.08,immediateRender:false,preserveViewport:false,gestureSettingsMouse:{clickToZoom:false,dblClickToZoom:true,scrollToZoom:true},gestureSettingsTouch:{pinchToZoom:true,flickEnabled:true},ajaxWithCredentials:false,crossOriginPolicy:false});
    viewer.addHandler("open",()=>{els.viewerStage.classList.add("is-ready");els.scaleOverlay.hidden=false;clearError();updateReadouts();renderStructures();renderPersonalAnnotations();renderDrawings();renderPersonalDraftOverlay();renderStudioDraftOverlay();renderLearningTarget();setStatus("connected",tr("statusConnected"),tr("streamingTitle"),activeProvider==="hosted-dzi"?tr("hostedStreamingBody"):activeProvider==="pma-start"?tr("localStreamingBody"):tr("streamingBody"));syncProviderUi();els.studentConnectCard.hidden=true;});
    viewer.addHandler("open-failed",(event)=>setError(language==="es"?"No se pudieron abrir los mosaicos":"Slide tiles could not be opened",event?.message||(activeProvider==="hosted-dzi"?tr("hostedFailedBody"):tr("serverFailedBody"))));
    ["animation","animation-finish","resize","pan","zoom"].forEach(name=>viewer.addHandler(name,()=>{updateReadouts();renderStructures();renderPersonalAnnotations();renderDrawings();renderPersonalDraftOverlay();renderStudioDraftOverlay();renderLearningTarget();}));
    viewer.addHandler("canvas-click",event=>{if(learningSession?.type==="quiz"&&learningSession.awaitingLocate&&event.quick)handleLocateAnswer(event.position);});
    return viewer;
  }

  function imageZoom(){if(!viewer?.viewport||!viewer.world.getItemCount())return 0;try{return viewer.viewport.viewportToImageZoom(viewer.viewport.getZoom(true));}catch(_){return 0;}}
  function niceScale(value){if(!Number.isFinite(value)||value<=0)return 100;const exponent=Math.floor(Math.log10(value));const fraction=value/Math.pow(10,exponent);let niceFraction=1;if(fraction>=5)niceFraction=5;else if(fraction>=2)niceFraction=2;return niceFraction*Math.pow(10,exponent);}
  function updateScaleBar(imgZoom){if(!imageInfo||!imgZoom)return;const micronsPerScreenPixel=imageInfo.MicrometresPerPixelX/imgZoom;const targetMicrons=niceScale(110*micronsPerScreenPixel);const widthPx=Math.max(45,Math.min(180,targetMicrons/micronsPerScreenPixel));els.scaleLine.style.width=`${widthPx}px`;els.scaleLabel.textContent=targetMicrons>=1000?`${(targetMicrons/1000).toLocaleString(undefined,{maximumFractionDigits:2})} mm`:`${targetMicrons.toLocaleString(undefined,{maximumFractionDigits:1})} µm`;}
  function updateReadouts(){if(!viewer?.viewport||!viewer.world.getItemCount()||!imageInfo)return;const imgZoom=Math.max(.000001,imageZoom());const nativeObjective=manifest.objective.nativeMagnification;const objective=Math.min(nativeObjective,nativeObjective*imgZoom);els.magnificationReadout.textContent=objective<1?`${objective.toFixed(1)}×`:`${Math.round(objective)}×`;updateScaleBar(imgZoom);try{const center=viewer.viewport.viewportToImageCoordinates(viewer.viewport.getCenter(true));const x=Math.max(0,Math.min(imageInfo.Width,center.x));const y=Math.max(0,Math.min(imageInfo.Height,center.y));els.positionReadout.textContent=`${Math.round(x).toLocaleString()}, ${Math.round(y).toLocaleString()}`;}catch(_){els.positionReadout.textContent="—";}Array.from(els.objectiveGroup.querySelectorAll("[data-objective]")).forEach(button=>{const target=Number(button.dataset.objective);button.classList.toggle("is-active",Math.abs(target-objective)<=Math.max(1,target*.14));});}
  function zoomToObjective(objective){if(!viewer?.viewport||!viewer.world.getItemCount())return;const targetImageZoom=Number(objective)/manifest.objective.nativeMagnification;let viewportZoom;if(typeof viewer.viewport.imageToViewportZoom==="function")viewportZoom=viewer.viewport.imageToViewportZoom(targetImageZoom);else{const currentImageZoom=imageZoom()||.01;viewportZoom=viewer.viewport.getZoom()*(targetImageZoom/currentImageZoom);}viewer.viewport.zoomTo(viewportZoom,null,false);viewer.viewport.applyConstraints();}

  function setAssociatedImages(){
    els.barcodeImage.onload=()=>{els.barcodePlaceholder.hidden=true;els.barcodeImage.hidden=false;};
    els.barcodeImage.onerror=()=>{els.barcodeImage.hidden=true;els.barcodePlaceholder.hidden=false;els.barcodePlaceholder.textContent=tr("labelUnavailable");};
    if(activeProvider==="pma-start"){els.barcodeImage.src=associatedUrl("barcode",420,180);return;}
    const hostedBarcode=String(manifest?.delivery?.hosted?.barcodeUrl||"").trim();
    if(hostedBarcode){els.barcodeImage.src=window.MorphoraHistologySource?.resolveUrl?.(hostedBarcode,location.href)||hostedBarcode;return;}
    els.barcodeImage.removeAttribute("src");els.barcodeImage.hidden=true;els.barcodePlaceholder.hidden=false;els.barcodePlaceholder.textContent=tr("labelUnavailable");
  }
  async function detectServer(){return fetchJson(apiUrl("GetVersionInfo"));}
  async function getRemoteImageInfo(){return fetchJson(apiUrl("GetImageInfo",{SessionID:currentSettings.sessionId,pathOrUid:currentSettings.slidePath}));}
  function sourceCandidates(forceLocal=false){
    if(forceLocal)return["pma-start"];
    return window.MorphoraHistologySource?.resolveCandidates?.({mode:currentSettings?.mode||"auto",hostedDescriptorUrl:hostedDescriptorUrl(),localAvailable:Boolean(currentSettings?.serverUrl&&currentSettings?.slidePath)})||["pma-start"];
  }
  function syncProviderUi(){
    if(!currentSettings)return;
    const mode=currentSettings.mode||"auto";
    const hosted=Boolean(String(currentSettings.hostedDescriptorUrl||"").trim());
    const active=activeProvider==="hosted-dzi"?(language==="es"?"DZI alojado":"Hosted DZI"):activeProvider==="pma-start"?"PMA.start":mode==="hosted"?(language==="es"?"DZI alojado":"Hosted DZI"):mode==="local"?"PMA.start":"Auto";
    els.activeProviderValue.textContent=active;els.activeProviderValue.dataset.state=activeProvider==="hosted-dzi"?"hosted":activeProvider==="pma-start"?"local":"idle";
    if(mode==="hosted")els.sourceRoutePreview.textContent=hosted?(language==="es"?"Solo DZI alojado":"Hosted DZI only"):tr("hostedUnavailableBody");
    else if(mode==="local")els.sourceRoutePreview.textContent=language==="es"?"Solo respaldo local PMA.start":"PMA.start local source only";
    else els.sourceRoutePreview.textContent=hosted?(language==="es"?"DZI alojado → respaldo PMA.start":"Hosted DZI → PMA.start fallback"):(language==="es"?"PMA.start hasta registrar una URL DZI alojada":"PMA.start until a hosted DZI URL is registered");
    els.authorizeButton.hidden=mode==="hosted";
  }
  function classifyConnectionError(error,provider){const message=error?.message||String(error);if(provider==="hosted-dzi")return{title:tr("hostedUnavailableTitle"),body:message||tr("hostedFailedBody")};if(location.protocol==="file:")return{title:tr("liveServerTitle"),body:tr("liveServerBody")};if(/fetch|network|cors|failed/i.test(message))return{title:tr("unauthorizedTitle"),body:tr("unauthorizedBody")};return{title:tr("serverFailedTitle"),body:message||tr("serverFailedBody")};}
  async function connectHostedDzi(){
    imageInfo=await getHostedDziInfo();updateMetadata(imageInfo);activeProvider="hosted-dzi";syncProviderUi();
    const osd=ensureViewer(true);if(osd.world.getItemCount())osd.close();
    // ajaxHeaders cover all tiles including the OpenSeadragon navigator.
    osd.setAjaxHeaders(imageInfo.privateAjaxHeaders || {});
    osd.open(window.MorphoraHistologySource.createDziTileSource(imageInfo));setAssociatedImages();
  }
  async function connectLocalPma(){
    await detectServer();imageInfo=deriveSlideInfo((await getRemoteImageInfo())||{});updateMetadata(imageInfo);activeProvider="pma-start";syncProviderUi();
    const osd=ensureViewer(false);if(osd.world.getItemCount())osd.close();osd.open(createLocalTileSource(imageInfo));setAssociatedImages();
  }
  async function connectSlide({silent=false,forceLocal=false}={}){
    if(connecting)return;connecting=true;clearError();setStatus("working",tr("statusWorking"),tr("connectingTitle"),tr("connectingBody"));[els.connectButton,els.emptyConnectButton,els.developerConnectButton].forEach(b=>{if(b)b.disabled=true;});
    let lastError=null,lastProvider=null;
    try{
      if(location.protocol==="file:")throw new Error(tr("liveServerBody"));
      const candidates=sourceCandidates(forceLocal);
      if(!candidates.length)throw new Error(tr("hostedUnavailableBody"));
      for(const provider of candidates){
        try{if(provider==="hosted-dzi")await connectHostedDzi();else await connectLocalPma();if(provider==="pma-start"&&candidates[0]==="hosted-dzi"&&!silent)showToast(tr("localFallbackUsed"));return;}
        catch(error){lastError=error;lastProvider=provider;activeProvider=null;syncProviderUi();}
      }
      throw lastError||new Error(tr("serverFailedBody"));
    }catch(error){const classified=classifyConnectionError(error,lastProvider||sourceCandidates(forceLocal)[0]);if(!silent||!els.viewerStage.classList.contains("is-ready"))setError(classified.title,classified.body);}
    finally{connecting=false;[els.connectButton,els.emptyConnectButton,els.developerConnectButton].forEach(b=>{if(b)b.disabled=false;});}
  }
  function authorizeBrowser(){if(location.protocol==="file:"){setError(tr("liveServerTitle"),tr("liveServerBody"));return;}const url=new URL("home/allowdomain/",normalizeServerUrl(currentSettings.serverUrl));url.searchParams.set("host",location.origin);const popup=window.open(url.toString(),"_blank");if(popup){try{popup.opener=null;}catch(_){}}else showToast(language==="es"?"El navegador bloqueó la ventana de autorización.":"The browser blocked the authorization window.");}

  function currentPmaExportCommand(){return `python tools\\histology_wsi\\export_from_pma.py --slide-id ${manifest?.id||requestedSlide} --serve`; }
  async function copyPmaExportCommand(){const command=currentPmaExportCommand();try{await navigator.clipboard.writeText(command);}catch(_){const area=document.createElement("textarea");area.value=command;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();}showToast(tr("exportCommandCopied"));}
  function syncDeveloperFields(){if(!currentSettings||!manifest)return;els.sourceModeInput.value=currentSettings.mode||"auto";els.hostedUrlInput.value=currentSettings.hostedDescriptorUrl||"";els.serverInput.value=currentSettings.serverUrl;els.slidePathInput.value=currentSettings.slidePath;els.formatDisplay.textContent=manifest.image.format;els.nativeDisplay.textContent=`${manifest.objective.nativeMagnification}×`;if(els.pmaExportCommandPreview)els.pmaExportCommandPreview.textContent=currentPmaExportCommand();syncProviderUi();renderHostedCheckUi();}
  function openDeveloperPanel(){if(learningSession)endLearningSession({silent:true});if(studioMode)cancelStudioMode();
    if(personalMode)cancelPersonalMode();closeToolDrawers();els.developerPanel.hidden=false;els.drawerBackdrop.hidden=false;syncDeveloperFields();renderStudioStructureList();updateStudioSummary();}
  function closeDeveloperPanel(){els.developerPanel.hidden=true;if(els.studyDrawer.hidden&&els.quizDrawer.hidden&&els.notesDrawer.hidden&&els.drawingDrawer.hidden&&els.personalLabelsDrawer.hidden&&els.personalEditorDrawer.hidden&&els.structureEditorDrawer.hidden)els.drawerBackdrop.hidden=true;}
  function saveSourceEditor(){currentSettings.mode=window.MorphoraHistologySource?.normalizeMode?.(els.sourceModeInput.value)||"auto";currentSettings.hostedDescriptorUrl=String(els.hostedUrlInput.value||"").trim();currentSettings.serverUrl=normalizeServerUrl(els.serverInput.value);currentSettings.slidePath=String(els.slidePathInput.value||"").trim();saveSettings();syncDeveloperFields();connectSlide();}
  function resetSourceEditor(){activeProvider=null;resetSettings();connectSlide();}

  function branchLabel(branch){if(branch==="histopathology")return tr("histopathology");if(branch==="histology")return tr("normalHistology");return tr("classificationPending");}
  function stainBadgeLabel(stain){const id=stain?.id||"";if(id==="he")return"H&E";if(id==="unconfirmed"||id==="unknown")return tr("stainPending");return localize(stain);}
  function applyManifestLabels(){const c=manifest.classification||{};els.slideTitle.textContent=localize(manifest.title);els.slideSubtitle.textContent=localize(manifest.subtitle);els.speciesSystemLine.textContent=`${localize(c.species)} · ${localize(c.system)}`;els.organQuickFact.textContent=localize(c.organ);els.speciesQuickFact.textContent=localize(c.species);els.categoryBadge.textContent=branchLabel(c.branch);els.categoryBadge.className=`case-badge ${c.branch==="histopathology"?"pathology":c.branch==="histology"?"normal":"unclassified"}`;els.stainBadge.textContent=stainBadgeLabel(c.stain);els.viewerSlideName.textContent=`${localize(manifest.title)} · ${stainBadgeLabel(c.stain)}`;els.toolbarNote.textContent=`${manifest.image.width.toLocaleString()} × ${manifest.image.height.toLocaleString()} px · ${manifest.image.micrometresPerPixelX.toFixed(3)} µm/px`;document.title=`MORPHORA Histology — ${localize(manifest.title)}`;}

  function buildObjectiveButtons(){els.objectiveGroup.replaceChildren();(manifest.objective?.presets||[]).forEach(value=>{const button=document.createElement("button");button.type="button";button.dataset.objective=String(value);button.textContent=`${value}×`;button.addEventListener("click",()=>zoomToObjective(value));els.objectiveGroup.appendChild(button);});}

  function structureName(structure){return localize(structure?.name)||structure?.id||"Structure";}
  function structureDescription(structure){return localize(structure?.description)||"";}
  function toggleStructures(){structuresVisible=!structuresVisible;els.structuresVisibilityButton.classList.toggle("is-on",structuresVisible);els.structuresVisibilityButton.setAttribute("aria-pressed",String(structuresVisible));els.structuresVisibilityButton.textContent=tr("official");els.toolbarStructuresButton.classList.toggle("is-on",structuresVisible);els.toolbarStructuresButton.setAttribute("aria-pressed",String(structuresVisible));renderStructures();}

  function normalizedToScreen(x,y){if(!viewer?.viewport||!viewer.world.getItemCount()||!imageInfo)return null;const item=viewer.world.getItemAt(0);const vp=item.imageToViewportCoordinates(new OpenSeadragon.Point(x*imageInfo.Width,y*imageInfo.Height));return viewer.viewport.pixelFromPoint(vp,true);}
  function screenToNormalized(clientX,clientY){if(!viewer?.viewport||!viewer.world.getItemCount()||!imageInfo)return null;const rect=els.viewerStage.getBoundingClientRect();const pixel=new OpenSeadragon.Point(clientX-rect.left,clientY-rect.top);const vp=viewer.viewport.pointFromPixel(pixel,true);const imagePoint=viewer.world.getItemAt(0).viewportToImageCoordinates(vp);return[Math.max(0,Math.min(1,imagePoint.x/imageInfo.Width)),Math.max(0,Math.min(1,imagePoint.y/imageInfo.Height))];}

  function renderStructures(){
    if(!manifest)return;const structures=Array.isArray(manifest.structures)?manifest.structures:[];const learningCount=getLearningItems("both").length;els.structureCountBadge.textContent=String(structures.length);els.structureReadyChip.textContent=tr("readyToLearn",{count:learningCount});els.studyButton.disabled=learningCount===0;els.quizButton.disabled=learningCount===0;const nextCopy=learningCount?tr("readyToLearn",{count:learningCount}):tr("needsStructures");els.studyButtonStatus.textContent=nextCopy;els.quizButtonStatus.textContent=nextCopy;
    if(learningSession||!viewer?.world?.getItemCount()||!structuresVisible){els.structureOverlay.replaceChildren();return;}
    const width=els.viewerStage.clientWidth,height=els.viewerStage.clientHeight;els.structureOverlay.setAttribute("viewBox",`0 0 ${width} ${height}`);els.structureOverlay.replaceChildren();
    structures.forEach((structure,index)=>{const geometry=structure.geometry||{};if(geometry.type==="point"){const pt=normalizedToScreen(Number(geometry.x),Number(geometry.y));if(!pt)return;const group=document.createElementNS("http://www.w3.org/2000/svg","g");group.classList.add("structure-marker");group.dataset.structureId=structure.id;const halo=document.createElementNS("http://www.w3.org/2000/svg","circle");halo.setAttribute("cx",pt.x);halo.setAttribute("cy",pt.y);halo.setAttribute("r","13");halo.classList.add("structure-halo");const dot=document.createElementNS("http://www.w3.org/2000/svg","circle");dot.setAttribute("cx",pt.x);dot.setAttribute("cy",pt.y);dot.setAttribute("r","5");dot.classList.add("structure-dot");group.append(halo,dot);els.structureOverlay.appendChild(group);}else if(geometry.type==="polygon"&&Array.isArray(geometry.points)){const pts=geometry.points.map(([x,y])=>normalizedToScreen(Number(x),Number(y))).filter(Boolean);if(pts.length<3)return;const polygon=document.createElementNS("http://www.w3.org/2000/svg","polygon");polygon.setAttribute("points",pts.map(pt=>`${pt.x},${pt.y}`).join(" "));polygon.classList.add("structure-region");polygon.dataset.structureId=structure.id;els.structureOverlay.appendChild(polygon);}});
  }

  function zoomToStructure(structure){if(!viewer?.viewport||!viewer.world.getItemCount()||!imageInfo)return;const g=structure.geometry||{};let x=.5,y=.5;if(g.type==="point"){x=Number(g.x);y=Number(g.y);}else if(g.type==="polygon"&&Array.isArray(g.points)&&g.points.length){x=g.points.reduce((s,p)=>s+Number(p[0]),0)/g.points.length;y=g.points.reduce((s,p)=>s+Number(p[1]),0)/g.points.length;}const item=viewer.world.getItemAt(0);const vp=item.imageToViewportCoordinates(new OpenSeadragon.Point(x*imageInfo.Width,y*imageInfo.Height));viewer.viewport.panTo(vp,false);const target=Math.min(manifest.objective.nativeMagnification,20);zoomToObjective(target);}

  function personalName(annotation){return String(annotation?.title||"").trim()||tr("personalLabels");}
  function personalNote(annotation){return String(annotation?.note||"").trim();}
  function setStructureLayer(layer){structureLayer=layer==="personal"?"personal":"official";els.officialStructuresTab.classList.toggle("is-active",structureLayer==="official");els.personalStructuresTab.classList.toggle("is-active",structureLayer==="personal");els.officialStructuresTab.setAttribute("aria-selected",String(structureLayer==="official"));els.personalStructuresTab.setAttribute("aria-selected",String(structureLayer==="personal"));renderStructureList();}
  function renderStructureList(){
    const query=String(els.structureSearch.value||"").trim().toLowerCase();
    Array.from(els.structureList.querySelectorAll(".structure-item")).forEach(n=>n.remove());
    if(structureLayer==="personal"){
      const annotations=(workspace?.personalAnnotations||[]).filter(a=>!query||`${personalName(a)} ${personalNote(a)} ${a.category||""}`.toLowerCase().includes(query));
      els.structureEmpty.hidden=annotations.length>0;
      els.structureEmpty.querySelector("strong").textContent=tr("noPersonalLabels");
      els.structureEmpty.querySelector("p").textContent=tr("personalLayerBody");
      annotations.forEach(annotation=>{const row=document.createElement("div");row.className="structure-item personal-structure-item";row.style.setProperty("--item-color",annotation.style?.color||DEFAULT_ANNOTATION_COLOR);row.innerHTML=`<span class="personal-color-swatch">${annotation.geometry?.type==="polygon"?"⬡":"●"}</span><button class="personal-structure-focus" type="button"><strong></strong><small></small></button><button class="personal-edit-mini" type="button" aria-label="Edit">✎</button>`;const focus=row.querySelector(".personal-structure-focus");focus.querySelector("strong").textContent=personalName(annotation);focus.querySelector("small").textContent=personalNote(annotation)||annotation.category||tr("mine");focus.addEventListener("click",()=>zoomToStructure(annotation));row.querySelector(".personal-edit-mini").addEventListener("click",()=>openPersonalEditor(annotation));els.structureList.appendChild(row);});
      return;
    }
    const structures=(manifest?.structures||[]).filter(s=>!query||`${structureName(s)} ${structureDescription(s)} ${s.category||""}`.toLowerCase().includes(query));
    els.structureEmpty.hidden=structures.length>0;
    els.structureEmpty.querySelector("strong").textContent=tr("noStructuresTitle");
    els.structureEmpty.querySelector("p").textContent=tr("noStructuresBody");
    structures.forEach(structure=>{const button=document.createElement("button");button.type="button";button.className="structure-item";button.innerHTML=`<span class="structure-index">${structure.geometry?.type==="polygon"?"⬡":"●"}</span><span><strong></strong><small></small></span><span class="structure-arrow">→</span>`;button.querySelector("strong").textContent=structureName(structure);button.querySelector("small").textContent=structureDescription(structure)||structure.category||tr("official");button.addEventListener("click",()=>zoomToStructure(structure));els.structureList.appendChild(button);});
  }
  function renderStructuresAndList(){renderStructureList();renderStructures();renderPersonalAnnotations();renderPersonalManagerList();}

  function safeColor(value){return /^#[0-9a-fA-F]{6}$/.test(String(value||""))?String(value):DEFAULT_ANNOTATION_COLOR;}
  function renderPersonalAnnotations(){
    if(!els.personalAnnotationOverlay)return;const annotations=workspace?.personalAnnotations||[];if(learningSession||!viewer?.world?.getItemCount()||!personalAnnotationsVisible){els.personalAnnotationOverlay.replaceChildren();return;}
    const width=els.viewerStage.clientWidth,height=els.viewerStage.clientHeight;els.personalAnnotationOverlay.setAttribute("viewBox",`0 0 ${width} ${height}`);els.personalAnnotationOverlay.replaceChildren();const ns="http://www.w3.org/2000/svg";
    annotations.forEach(annotation=>{const g=annotation.geometry||{},color=safeColor(annotation.style?.color),opacity=Math.max(.08,Math.min(.55,Number(annotation.style?.opacity??DEFAULT_ANNOTATION_OPACITY)/100));if(g.type==="point"){const pt=normalizedToScreen(Number(g.x),Number(g.y));if(!pt)return;const group=document.createElementNS(ns,"g");group.style.setProperty("--annotation-color",color);group.dataset.personalId=annotation.id;const halo=document.createElementNS(ns,"circle");halo.setAttribute("cx",pt.x);halo.setAttribute("cy",pt.y);halo.setAttribute("r","14");halo.classList.add("personal-marker-halo");const dot=document.createElementNS(ns,"circle");dot.setAttribute("cx",pt.x);dot.setAttribute("cy",pt.y);dot.setAttribute("r","5");dot.classList.add("personal-marker-dot");const text=document.createElementNS(ns,"text");text.setAttribute("x",pt.x+11);text.setAttribute("y",pt.y-9);text.classList.add("personal-label-text");text.textContent=personalName(annotation);group.append(halo,dot,text);els.personalAnnotationOverlay.appendChild(group);}else if(g.type==="polygon"&&Array.isArray(g.points)){const pts=g.points.map(([x,y])=>normalizedToScreen(Number(x),Number(y))).filter(Boolean);if(pts.length<3)return;const group=document.createElementNS(ns,"g");group.style.setProperty("--annotation-color",color);group.style.setProperty("--annotation-opacity",String(opacity));const polygon=document.createElementNS(ns,"polygon");polygon.setAttribute("points",pts.map(pt=>`${pt.x},${pt.y}`).join(" "));polygon.classList.add("personal-region");const cx=pts.reduce((sum,p)=>sum+p.x,0)/pts.length,cy=pts.reduce((sum,p)=>sum+p.y,0)/pts.length;const text=document.createElementNS(ns,"text");text.setAttribute("x",cx);text.setAttribute("y",cy);text.setAttribute("text-anchor","middle");text.classList.add("personal-label-text","personal-region-label");text.textContent=personalName(annotation);group.append(polygon,text);els.personalAnnotationOverlay.appendChild(group);}});
  }
  function togglePersonalVisibility(){personalAnnotationsVisible=!personalAnnotationsVisible;els.personalVisibilityButton.classList.toggle("is-on",personalAnnotationsVisible);els.personalVisibilityButton.setAttribute("aria-pressed",String(personalAnnotationsVisible));renderPersonalAnnotations();showToast(tr(personalAnnotationsVisible?"personalLayerVisible":"personalLayerHidden"));}

  function openDrawer(drawer,{modal=true}={}){
    if(learningSession)endLearningSession({silent:true});
    if(studioMode)cancelStudioMode();
    if(personalMode)cancelPersonalMode();
    closeDeveloperPanel();
    closeToolDrawers();
    drawer.hidden=false;
    els.drawerBackdrop.hidden=!modal;
  }
  function closeToolDrawers(){els.studyDrawer.hidden=true;els.quizDrawer.hidden=true;els.notesDrawer.hidden=true;els.drawingDrawer.hidden=true;els.personalLabelsDrawer.hidden=true;els.personalEditorDrawer.hidden=true;els.structureEditorDrawer.hidden=true;setDrawingActive(false,{keepDrawer:true});if(els.developerPanel.hidden)els.drawerBackdrop.hidden=true;}
  function closeAllPanels(){closeToolDrawers();closeDeveloperPanel();}

  function saveNotes(){workspace.note.text=String(els.notesEditor.value||"");workspace.note.updatedAt=new Date().toISOString();saveWorkspace();els.notesSavedAt.textContent=`${tr("savedAt")} ${new Date(workspace.note.updatedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;showToast(language==="es"?"Notas guardadas.":"Notes saved.");}
  function openNotes(){els.notesEditor.value=workspace.note.text||"";els.notesSavedAt.textContent=workspace.note.updatedAt?`${tr("savedAt")} ${new Date(workspace.note.updatedAt).toLocaleString()}`:tr("notSavedYet");openDrawer(els.notesDrawer);setTimeout(()=>els.notesEditor.focus(),60);}
  function toggleBookmark(){workspace.bookmarked=!workspace.bookmarked;saveWorkspace();showToast(workspace.bookmarked?tr("bookmarkSaved"):tr("bookmarkRemoved"));}

  function pushDrawingUndo(){drawUndo.push(JSON.stringify(workspace.drawings||[]));if(drawUndo.length>30)drawUndo.shift();}
  function updateDrawingPointerMode(){els.drawingCanvas.classList.toggle("is-active",drawingActive);els.drawingCanvas.style.pointerEvents=drawingActive?"auto":"none";if(viewer)viewer.setMouseNavEnabled(!drawingActive);}
  function setDrawingActive(active,{keepDrawer=false}={}){drawingActive=Boolean(active)&&Boolean(viewer?.world?.getItemCount());currentStroke=null;drawPointerId=null;updateDrawingPointerMode();els.drawButton.classList.toggle("is-active",drawingActive);if(!active&&!keepDrawer&&els.drawingDrawer&&!els.drawingDrawer.hidden)els.drawingDrawer.hidden=true;renderDrawings();}
  function openDrawing(){
    if(learningSession)endLearningSession({silent:true});
    if(!viewer?.world?.getItemCount()){
      connectSlide();
      showToast(language==="es"?"Abre la lámina antes de dibujar.":"Open the slide before drawing.");
      return;
    }
    // Drawing must remain non-modal: the student needs to interact with the slide
    // while the tool drawer stays open. A modal backdrop would intercept the stroke.
    openDrawer(els.drawingDrawer,{modal:false});
    setDrawingActive(true,{keepDrawer:true});
  }
  function setDrawTool(tool){drawTool=tool;els.drawToolButtons.forEach(button=>button.classList.toggle("is-active",button.dataset.drawTool===tool));}
  function eraseAt(clientX,clientY){if(!workspace.drawings.length)return;const rect=els.viewerStage.getBoundingClientRect();const target={x:clientX-rect.left,y:clientY-rect.top};let bestIndex=-1,bestDist=Infinity;workspace.drawings.forEach((stroke,index)=>{for(const [nx,ny] of stroke.points||[]){const pt=normalizedToScreen(nx,ny);if(!pt)continue;const d=Math.hypot(pt.x-target.x,pt.y-target.y);if(d<bestDist){bestDist=d;bestIndex=index;}}});if(bestIndex>=0&&bestDist<28){pushDrawingUndo();workspace.drawings.splice(bestIndex,1);saveWorkspace();renderDrawings();}}
  function drawingPointerDown(event){
    if(!drawingActive||!viewer?.world?.getItemCount())return;
    event.preventDefault();
    event.stopPropagation();
    drawPointerId=event.pointerId;
    try{els.drawingCanvas.setPointerCapture?.(event.pointerId);}catch(_){}
    if(drawTool==="eraser"){eraseAt(event.clientX,event.clientY);return;}
    const point=screenToNormalized(event.clientX,event.clientY);
    if(!point)return;
    pushDrawingUndo();
    currentStroke={id:`stroke-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,tool:drawTool,color:els.drawingColor.value||DEFAULT_DRAW_COLOR,size:Number(els.drawingSize.value)||5,points:[point],createdAt:new Date().toISOString()};
    workspace.drawings.push(currentStroke);
    renderDrawings();
  }
  function drawingPointerMove(event){
    if(!drawingActive||drawPointerId!==event.pointerId)return;
    event.preventDefault();
    event.stopPropagation();
    if(drawTool==="eraser"){eraseAt(event.clientX,event.clientY);return;}
    if(!currentStroke)return;
    const point=screenToNormalized(event.clientX,event.clientY);
    if(!point)return;
    const last=currentStroke.points.at(-1);
    if(last&&Math.hypot(point[0]-last[0],point[1]-last[1])<0.00008)return;
    currentStroke.points.push(point);
    renderDrawings();
  }
  function drawingPointerUp(event){
    if(drawPointerId!==event.pointerId)return;
    event.preventDefault();
    event.stopPropagation();
    if(currentStroke){currentStroke=null;saveWorkspace();}
    try{if(els.drawingCanvas.hasPointerCapture?.(event.pointerId))els.drawingCanvas.releasePointerCapture?.(event.pointerId);}catch(_){}
    drawPointerId=null;
  }
  function undoDrawing(){if(!drawUndo.length)return;try{workspace.drawings=JSON.parse(drawUndo.pop());saveWorkspace();renderDrawings();}catch(_){}}
  function clearDrawings(){if(!workspace.drawings.length)return;if(!window.confirm(language==="es"?"¿Borrar todos los dibujos de esta lámina?":"Clear all drawings from this slide?"))return;pushDrawingUndo();workspace.drawings=[];saveWorkspace();renderDrawings();}

  function renderDrawings(){
    const canvas=els.drawingCanvas;if(!canvas)return;const rect=els.viewerStage.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));canvas.style.width=`${rect.width}px`;canvas.style.height=`${rect.height}px`;}const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);if(learningSession||!viewer?.world?.getItemCount()||!workspace)return;ctx.lineCap="round";ctx.lineJoin="round";(workspace.drawings||[]).forEach(stroke=>{const pts=(stroke.points||[]).map(([x,y])=>normalizedToScreen(x,y)).filter(Boolean);if(pts.length<1)return;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);if(pts.length===1){ctx.lineTo(pts[0].x+.01,pts[0].y+.01);}ctx.strokeStyle=stroke.color||DEFAULT_DRAW_COLOR;ctx.globalAlpha=stroke.tool==="highlighter"?.32:.96;ctx.lineWidth=(Number(stroke.size)||5)*(stroke.tool==="highlighter"?2.3:1);ctx.stroke();ctx.globalAlpha=1;});
  }

  function personalId(){return `personal-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;}
  function blankPersonalAnnotation(type){return{id:personalId(),title:"",note:"",category:"",geometry:type==="polygon"?{type:"polygon",points:[]}:{type:"point",x:.5,y:.5},style:{color:DEFAULT_ANNOTATION_COLOR,opacity:DEFAULT_ANNOTATION_OPACITY},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};}
  function personalGeometrySummary(annotation){const g=annotation?.geometry||{};if(g.type==="point")return `${Number(g.x||0).toFixed(5)}, ${Number(g.y||0).toFixed(5)}`;if(g.type==="polygon")return `${g.points?.length||0} ${tr("vertices")}`;return "—";}
  function updatePersonalColorUi(color){const safe=safeColor(color);els.personalColorInput.value=safe;els.personalColorValue.textContent=safe;els.annotationColorButtons.forEach(button=>button.classList.toggle("is-active",button.dataset.annotationColor.toLowerCase()===safe.toLowerCase()));}
  function openPersonalLabels(){renderPersonalManagerList();openDrawer(els.personalLabelsDrawer);}
  function renderPersonalManagerList(){
    if(!els.personalManagerList||!workspace)return;Array.from(els.personalManagerList.querySelectorAll(".personal-manager-row")).forEach(node=>node.remove());const annotations=workspace.personalAnnotations||[];els.personalManagerEmpty.hidden=annotations.length>0;annotations.forEach(annotation=>{const row=document.createElement("div");row.className="personal-manager-row";row.style.setProperty("--row-color",safeColor(annotation.style?.color));const badge=document.createElement("span");badge.className="personal-color-swatch";badge.style.setProperty("--item-color",safeColor(annotation.style?.color));badge.textContent=annotation.geometry?.type==="polygon"?"⬡":"●";const text=document.createElement("div");const strong=document.createElement("strong");strong.textContent=personalName(annotation);const small=document.createElement("small");small.textContent=personalNote(annotation)||annotation.category||tr("mine");text.append(strong,small);const actions=document.createElement("div");actions.className="personal-row-actions";const focus=document.createElement("button");focus.type="button";focus.textContent=tr("focus");focus.addEventListener("click",()=>{closeToolDrawers();zoomToStructure(annotation);});const edit=document.createElement("button");edit.type="button";edit.textContent=tr("edit");edit.addEventListener("click",()=>openPersonalEditor(annotation));actions.append(focus,edit);row.append(badge,text,actions);els.personalManagerList.appendChild(row);});
  }
  function openPersonalEditor(annotation,{isNew=false}={}){const selected=clone(annotation||blankPersonalAnnotation("point"));pendingPersonalAnnotation=selected;editingPersonalId=isNew?null:selected.id;els.personalTitleInput.value=selected.title||"";els.personalCategoryInput.value=selected.category||"";els.personalNoteInput.value=selected.note||"";updatePersonalColorUi(selected.style?.color||DEFAULT_ANNOTATION_COLOR);const opacity=Math.max(8,Math.min(55,Number(selected.style?.opacity??DEFAULT_ANNOTATION_OPACITY)));els.personalOpacityInput.value=String(opacity);els.personalOpacityValue.textContent=`${opacity}%`;els.personalGeometrySummary.textContent=personalGeometrySummary(selected);els.personalOpacityRow.hidden=selected.geometry?.type!=="polygon";els.personalRepositionButton.textContent=selected.geometry?.type==="polygon"?tr("redrawRegion"):tr("movePoint");els.deletePersonalButton.hidden=isNew;openDrawer(els.personalEditorDrawer);setTimeout(()=>els.personalTitleInput.focus(),50);}
  function personalFromEditor(){const draft=clone(pendingPersonalAnnotation||blankPersonalAnnotation("point"));draft.title=String(els.personalTitleInput.value||"").trim();draft.category=String(els.personalCategoryInput.value||"").trim();draft.note=String(els.personalNoteInput.value||"").trim();draft.style={color:safeColor(els.personalColorInput.value),opacity:Math.max(8,Math.min(55,Number(els.personalOpacityInput.value)||DEFAULT_ANNOTATION_OPACITY))};draft.updatedAt=new Date().toISOString();return draft;}
  function savePersonalEditor(){const annotation=personalFromEditor();if(!annotation.title){showToast(tr("personalNameRequired"));return;}workspace.personalAnnotations=workspace.personalAnnotations||[];if(editingPersonalId){const index=workspace.personalAnnotations.findIndex(a=>a.id===editingPersonalId);if(index>=0)workspace.personalAnnotations[index]=annotation;else workspace.personalAnnotations.push(annotation);}else workspace.personalAnnotations.push(annotation);pendingPersonalAnnotation=null;editingPersonalId=null;saveWorkspace();renderPersonalAnnotations();renderStructureList();renderPersonalManagerList();closeToolDrawers();showToast(tr("personalSaved"));}
  function deletePersonalAnnotation(){const id=editingPersonalId||pendingPersonalAnnotation?.id;if(!id)return;const annotation=(workspace.personalAnnotations||[]).find(a=>a.id===id);if(!annotation)return;const ok=window.confirm(language==="es"?`¿Eliminar “${personalName(annotation)}”?`:`Delete “${personalName(annotation)}”?`);if(!ok)return;workspace.personalAnnotations=workspace.personalAnnotations.filter(a=>a.id!==id);pendingPersonalAnnotation=null;editingPersonalId=null;saveWorkspace();renderPersonalAnnotations();renderStructureList();renderPersonalManagerList();closeToolDrawers();showToast(tr("personalDeleted"));}
  function setPersonalInteractionActive(active){els.personalInteractionLayer.classList.toggle("is-active",active);els.personalInteractionLayer.setAttribute("aria-hidden",String(!active));if(viewer)viewer.setMouseNavEnabled(!active&&!drawingActive&&!studioMode);}
  function startPersonalMode(type,annotation=null){if(learningSession)endLearningSession({silent:true});if(!viewer?.world?.getItemCount()){connectSlide();showToast(tr("personalNeedsSlide"));return;}if(studioMode)cancelStudioMode();if(drawingActive)closeToolDrawers();pendingPersonalAnnotation=clone(annotation||blankPersonalAnnotation(type));if(annotation&&!editingPersonalId)editingPersonalId=annotation.id;personalMode=type;personalPolygonPoints=[];closeDeveloperPanel();els.personalLabelsDrawer.hidden=true;els.personalEditorDrawer.hidden=true;els.drawerBackdrop.hidden=true;els.personalModeBar.hidden=false;els.personalModeTitle.textContent=type==="polygon"?tr("personalRegion"):tr("personalPoint");els.personalModePrompt.textContent=type==="polygon"?tr("personalPlacementRegion"):tr("personalPlacementPoint");els.personalFinishRegionButton.hidden=type!=="polygon";els.personalFinishRegionButton.disabled=true;setPersonalInteractionActive(true);renderPersonalDraftOverlay();}
  function cancelPersonalMode({reopenEditor=false}={}){const reopen=reopenEditor&&pendingPersonalAnnotation;personalMode=null;personalPolygonPoints=[];els.personalModeBar.hidden=true;setPersonalInteractionActive(false);renderPersonalDraftOverlay();if(reopen)openPersonalEditor(pendingPersonalAnnotation,{isNew:!editingPersonalId});else{pendingPersonalAnnotation=null;editingPersonalId=null;}}
  function finishPersonalPlacement(){if(personalMode==="polygon"){if(personalPolygonPoints.length<3){showToast(tr("studioRegionMin"));return;}pendingPersonalAnnotation.geometry={type:"polygon",points:clone(personalPolygonPoints)};}const annotation=clone(pendingPersonalAnnotation);const isNew=!editingPersonalId;personalMode=null;personalPolygonPoints=[];els.personalModeBar.hidden=true;setPersonalInteractionActive(false);renderPersonalDraftOverlay();openPersonalEditor(annotation,{isNew});}
  function personalPointerDown(event){if(!personalMode)return;event.preventDefault();event.stopPropagation();const point=screenToNormalized(event.clientX,event.clientY);if(!point)return;if(personalMode==="point"){pendingPersonalAnnotation.geometry={type:"point",x:point[0],y:point[1]};finishPersonalPlacement();return;}personalPolygonPoints.push(point);els.personalFinishRegionButton.disabled=personalPolygonPoints.length<3;els.personalModePrompt.textContent=`${tr("personalPlacementRegion")} · ${personalPolygonPoints.length} ${tr("vertices")}`;renderPersonalDraftOverlay();}
  function renderPersonalDraftOverlay(){if(!els.personalDraftOverlay)return;const width=els.viewerStage.clientWidth,height=els.viewerStage.clientHeight;els.personalDraftOverlay.setAttribute("viewBox",`0 0 ${width} ${height}`);els.personalDraftOverlay.replaceChildren();if(personalMode!=="polygon"||!personalPolygonPoints.length||!viewer?.world?.getItemCount())return;const pts=personalPolygonPoints.map(([x,y])=>normalizedToScreen(x,y)).filter(Boolean);if(!pts.length)return;const ns="http://www.w3.org/2000/svg";const poly=document.createElementNS(ns,"polyline");poly.setAttribute("points",pts.map(p=>`${p.x},${p.y}`).join(" "));poly.classList.add("personal-draft-line");els.personalDraftOverlay.appendChild(poly);pts.forEach((p,i)=>{const circle=document.createElementNS(ns,"circle");circle.setAttribute("cx",p.x);circle.setAttribute("cy",p.y);circle.setAttribute("r",i===0?6:4);circle.classList.add("personal-draft-point");els.personalDraftOverlay.appendChild(circle);});}
  function repositionPersonalAnnotation(){const draft=personalFromEditor();pendingPersonalAnnotation=draft;const type=draft.geometry?.type==="polygon"?"polygon":"point";startPersonalMode(type,draft);}

  function loadStudioDraft(){
    const base=clone(sourceManifest?.structures||[]);
    try{
      const parsed=JSON.parse(localStorage.getItem(studioKey())||"null");
      if(parsed&&parsed.slideId===manifest.id&&Array.isArray(parsed.structures))studioDraft={schemaVersion:1,slideId:manifest.id,updatedAt:parsed.updatedAt||null,structures:clone(parsed.structures)};
      else studioDraft={schemaVersion:1,slideId:manifest.id,updatedAt:null,structures:base};
    }catch(_){studioDraft={schemaVersion:1,slideId:manifest.id,updatedAt:null,structures:base};}
    manifest.structures=clone(studioDraft.structures);
  }
  function saveStudioDraft(){
    if(!studioDraft)return;
    studioDraft.updatedAt=new Date().toISOString();
    localStorage.setItem(studioKey(),JSON.stringify(studioDraft));
    manifest.structures=clone(studioDraft.structures);
    renderStructuresAndList();renderStudioStructureList();updateStudioSummary();updateWorkspaceUi();
  }
  function updateStudioSummary(){
    if(!els.studioDraftStatus||!manifest)return;
    const count=studioDraft?.structures?.length??manifest.structures?.length??0;
    els.studioDraftStatus.textContent=tr("structureCount",{count});
    els.studioDraftBadge.dataset.state=studioDraft?.updatedAt?"connected":"idle";
    els.studioDraftBadge.textContent=tr("localDraft");
  }
  function renderStudioStructureList(){
    if(!els.studioStructureList||!manifest)return;
    Array.from(els.studioStructureList.querySelectorAll(".studio-structure-row")).forEach(node=>node.remove());
    const structures=studioDraft?.structures||manifest.structures||[];
    els.studioListEmpty.hidden=structures.length>0;
    structures.forEach((structure,index)=>{
      const row=document.createElement("div");row.className="studio-structure-row";row.dataset.structureId=structure.id;
      const badge=document.createElement("span");badge.className="studio-geometry-badge";badge.textContent=structure.geometry?.type==="polygon"?"⬡":"●";
      const text=document.createElement("div");const strong=document.createElement("strong");strong.textContent=structureName(structure);const small=document.createElement("small");small.textContent=structure.category||structureDescription(structure)||`#${index+1}`;text.append(strong,small);
      const actions=document.createElement("div");actions.className="studio-row-actions";
      const focus=document.createElement("button");focus.type="button";focus.textContent=tr("focus");focus.addEventListener("click",()=>{closeDeveloperPanel();zoomToStructure(structure);});
      const edit=document.createElement("button");edit.type="button";edit.textContent=tr("edit");edit.addEventListener("click",()=>openStructureEditor(structure));
      actions.append(focus,edit);row.append(badge,text,actions);els.studioStructureList.appendChild(row);
    });
  }
  function blankStructure(type){return{id:`structure-${Date.now()}`,name:{en:"",es:""},description:{en:"",es:""},category:"",geometry:type==="polygon"?{type:"polygon",points:[]}:{type:"point",x:.5,y:.5}};}
  function geometrySummary(structure){const g=structure?.geometry||{};if(g.type==="point")return `${Number(g.x||0).toFixed(5)}, ${Number(g.y||0).toFixed(5)}`;if(g.type==="polygon")return `${g.points?.length||0} ${tr("vertices")}`;return "—";}
  function openStructureEditor(structure,{isNew=false}={}){
    const selected=clone(structure||blankStructure("point"));pendingStructure=selected;editingStructureId=isNew?null:selected.id;
    els.structureIdInput.value=isNew&&selected.id.startsWith("structure-")?"":selected.id||"";
    els.structureCategoryInput.value=selected.category||"";els.structureNameEnInput.value=selected.name?.en||"";els.structureNameEsInput.value=selected.name?.es||"";els.structureDescriptionEnInput.value=selected.description?.en||"";els.structureDescriptionEsInput.value=selected.description?.es||"";
    els.structureGeometrySummary.textContent=geometrySummary(selected);els.studioRepositionButton.textContent=selected.geometry?.type==="polygon"?tr("redrawRegion"):tr("movePoint");els.deleteStructureButton.hidden=isNew;
    openDrawer(els.structureEditorDrawer);setTimeout(()=>els.structureNameEnInput.focus(),50);
  }
  function structureFromEditor(){
    const geometry=clone(pendingStructure?.geometry||{type:"point",x:.5,y:.5});
    const requested=String(els.structureIdInput.value||"").trim();const seed=requested||els.structureNameEnInput.value||els.structureNameEsInput.value||"structure";
    const requestedSlug=requested?slugify(requested):"";const id=requestedSlug?uniqueStructureId(requestedSlug,editingStructureId):uniqueStructureId(seed,editingStructureId);
    return{id,name:{en:String(els.structureNameEnInput.value||"").trim(),es:String(els.structureNameEsInput.value||"").trim()},description:{en:String(els.structureDescriptionEnInput.value||"").trim(),es:String(els.structureDescriptionEsInput.value||"").trim()},category:String(els.structureCategoryInput.value||"").trim(),geometry};
  }
  function saveStructureEditor(){
    if(!studioDraft)return;const structure=structureFromEditor();if(!structure.name.en||!structure.name.es){showToast(tr("studioNameRequired"));return;}
    if(editingStructureId){const index=studioDraft.structures.findIndex(s=>s.id===editingStructureId);if(index>=0)studioDraft.structures[index]=structure;else studioDraft.structures.push(structure);}else studioDraft.structures.push(structure);
    pendingStructure=null;editingStructureId=null;saveStudioDraft();closeToolDrawers();showToast(tr("studioSaved"));
  }
  function deleteStructureById(id){
    if(!id||!studioDraft)return;const structure=studioDraft.structures.find(s=>s.id===id);if(!structure)return;
    const ok=window.confirm(language==="es"?`¿Eliminar “${structureName(structure)}”?`:`Delete “${structureName(structure)}”?`);if(!ok)return;
    studioDraft.structures=studioDraft.structures.filter(s=>s.id!==id);workspace.studiedStructureIds=(workspace.studiedStructureIds||[]).filter(x=>x!==id);saveWorkspace();saveStudioDraft();closeToolDrawers();showToast(tr("studioDeleted"));
  }
  function deleteStructureFromEditor(){deleteStructureById(editingStructureId||pendingStructure?.id);}
  function resetStudioDraft(){
    if(!manifest||!sourceManifest)return;const ok=window.confirm(language==="es"?"¿Restablecer el borrador local al manifiesto original?":"Reset the local Studio draft to the source manifest?");if(!ok)return;
    localStorage.removeItem(studioKey());studioDraft={schemaVersion:1,slideId:manifest.id,updatedAt:null,structures:clone(sourceManifest.structures||[])};manifest.structures=clone(studioDraft.structures);renderStructuresAndList();renderStudioStructureList();updateStudioSummary();updateWorkspaceUi();showToast(tr("studioReset"));
  }
  function downloadJson(filename,value){const blob=new Blob([JSON.stringify(value,null,2)+"\n"],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportStudioManifest(){const payload=clone(manifest);payload.structures=clone(studioDraft?.structures||manifest.structures||[]);downloadJson(`${manifest.id}.json`,payload);showToast(tr("studioExported"));}
  function setStudioInteractionActive(active){els.studioInteractionLayer.classList.toggle("is-active",active);els.studioInteractionLayer.setAttribute("aria-hidden",String(!active));if(viewer)viewer.setMouseNavEnabled(!active&&!drawingActive);}
  function startStudioMode(type,structure=null){
    if(learningSession)endLearningSession({silent:true});
    if(!viewer?.world?.getItemCount()){connectSlide();showToast(tr("studioNeedsSlide"));return;}
    if(drawingActive)closeToolDrawers();
    if(personalMode)cancelPersonalMode();
    pendingStructure=clone(structure||blankStructure(type));if(structure&&!editingStructureId)editingStructureId=structure.id;
    studioMode=type;studioPolygonPoints=[];closeDeveloperPanel();els.structureEditorDrawer.hidden=true;els.drawerBackdrop.hidden=true;els.studioModeBar.hidden=false;els.studioModeTitle.textContent=type==="polygon"?tr("regionStructure"):tr("pointStructure");els.studioModePrompt.textContent=type==="polygon"?tr("placementRegion"):tr("placementPoint");els.studioFinishRegionButton.hidden=type!=="polygon";els.studioFinishRegionButton.disabled=true;setStudioInteractionActive(true);renderStudioDraftOverlay();
  }
  function cancelStudioMode({reopenEditor=false}={}){const reopen=reopenEditor&&pendingStructure;studioMode=null;studioPolygonPoints=[];els.studioModeBar.hidden=true;setStudioInteractionActive(false);renderStudioDraftOverlay();if(reopen)openStructureEditor(pendingStructure,{isNew:!editingStructureId});else{pendingStructure=null;editingStructureId=null;}}
  function finishStudioPlacement(){
    if(studioMode==="polygon"){if(studioPolygonPoints.length<3){showToast(tr("studioRegionMin"));return;}pendingStructure.geometry={type:"polygon",points:clone(studioPolygonPoints)};}
    const structure=clone(pendingStructure);const isNew=!editingStructureId;studioMode=null;studioPolygonPoints=[];els.studioModeBar.hidden=true;setStudioInteractionActive(false);renderStudioDraftOverlay();openStructureEditor(structure,{isNew});
  }
  function studioPointerDown(event){
    if(!studioMode)return;event.preventDefault();event.stopPropagation();const point=screenToNormalized(event.clientX,event.clientY);if(!point)return;
    if(studioMode==="point"){pendingStructure.geometry={type:"point",x:point[0],y:point[1]};finishStudioPlacement();return;}
    studioPolygonPoints.push(point);els.studioFinishRegionButton.disabled=studioPolygonPoints.length<3;els.studioModePrompt.textContent=`${tr("placementRegion")} · ${studioPolygonPoints.length} ${tr("vertices")}`;renderStudioDraftOverlay();
  }
  function renderStudioDraftOverlay(){
    if(!els.studioDraftOverlay)return;const width=els.viewerStage.clientWidth,height=els.viewerStage.clientHeight;els.studioDraftOverlay.setAttribute("viewBox",`0 0 ${width} ${height}`);els.studioDraftOverlay.replaceChildren();if(studioMode!=="polygon"||!studioPolygonPoints.length||!viewer?.world?.getItemCount())return;
    const pts=studioPolygonPoints.map(([x,y])=>normalizedToScreen(x,y)).filter(Boolean);if(!pts.length)return;const ns="http://www.w3.org/2000/svg";const poly=document.createElementNS(ns,"polyline");poly.setAttribute("points",pts.map(p=>`${p.x},${p.y}`).join(" "));poly.classList.add("studio-draft-line");els.studioDraftOverlay.appendChild(poly);pts.forEach((p,i)=>{const circle=document.createElementNS(ns,"circle");circle.setAttribute("cx",p.x);circle.setAttribute("cy",p.y);circle.setAttribute("r",i===0?6:4);circle.classList.add("studio-draft-point");els.studioDraftOverlay.appendChild(circle);});
  }
  function repositionCurrentStructure(){const draft=structureFromEditor();pendingStructure=draft;const type=draft.geometry?.type==="polygon"?"polygon":"point";startStudioMode(type,draft);}

  function learningItemKey(item){return `${item.source}:${item.id}`;}
  function learningItemName(item){return item.source==="personal"?personalName(item.data):structureName(item.data);}
  function learningItemDescription(item){return item.source==="personal"?(personalNote(item.data)||item.data.category||""):(structureDescription(item.data)||item.data.category||"");}
  function learningSourceLabel(source){return source==="official"?tr("morphoraOfficial"):source==="personal"?tr("myLabels"):tr("bothSources");}
  function getLearningItems(source="both"){
    const official=(manifest?.structures||[]).map(data=>({source:"official",id:data.id,data}));
    const personal=(workspace?.personalAnnotations||[]).map(data=>({source:"personal",id:data.id,data}));
    if(source==="official")return official;if(source==="personal")return personal;return [...official,...personal];
  }
  function shuffle(values){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
  function setLearningSource(context,source){
    const key=source==="personal"?"personal":source==="both"?"both":"official";
    if(!getLearningItems(key).length)return;
    if(context==="study")studySource=key;else quizSource=key;
    const buttons=context==="study"?els.studySourceButtons:els.quizSourceButtons;
    buttons.forEach(button=>button.classList.toggle("is-active",button.dataset[context+"Source"]===key));
    updateLearningSetup();
  }
  function sourceCountCopy(count){return tr("sourceItems",{count});}
  function chooseDefaultLearningSources(){
    const official=getLearningItems("official").length,personal=getLearningItems("personal").length;
    if(!getLearningItems(studySource).length)studySource=official?"official":personal?"personal":"both";
    if(!getLearningItems(quizSource).length)quizSource=official?"official":personal?"personal":"both";
  }
  function updateLearningSetup(){
    if(!manifest||!workspace||!els.studySourceButtons)return;
    const official=getLearningItems("official").length,personal=getLearningItems("personal").length,both=official+personal;
    chooseDefaultLearningSources();
    [[els.studySourceOfficial,official],[els.studySourcePersonal,personal],[els.studySourceBoth,both],[els.quizSourceOfficial,official],[els.quizSourcePersonal,personal],[els.quizSourceBoth,both]].forEach(([button,count])=>{button.disabled=count===0;button.classList.toggle("is-unavailable",count===0);});
    els.studyOfficialCount.textContent=sourceCountCopy(official);els.studyPersonalCount.textContent=sourceCountCopy(personal);els.studyBothCount.textContent=sourceCountCopy(both);
    els.quizOfficialCount.textContent=sourceCountCopy(official);els.quizPersonalCount.textContent=sourceCountCopy(personal);els.quizBothCount.textContent=sourceCountCopy(both);
    els.studySourceButtons.forEach(button=>button.classList.toggle("is-active",button.dataset.studySource===studySource));
    els.quizSourceButtons.forEach(button=>button.classList.toggle("is-active",button.dataset.quizSource===quizSource));
    const studyCount=getLearningItems(studySource).length,quizCount=getLearningItems(quizSource).length;
    els.studyConfigSummary.textContent=studyCount?`${learningSourceLabel(studySource)} · ${sourceCountCopy(studyCount)}`:tr("noLearningContent");
    els.quizConfigSummary.textContent=quizCount?`${learningSourceLabel(quizSource)} · ${sourceCountCopy(quizCount)}`:tr("noLearningContent");
    els.startStudyButton.disabled=studyCount===0;els.startQuizButton.disabled=quizCount===0;
    const uniqueQuizNames=new Set(getLearningItems(quizSource).map(item=>learningItemName(item).toLowerCase())).size;
    els.quizModeMultiple.disabled=uniqueQuizNames<2;els.quizModeMixed.disabled=uniqueQuizNames<2;
    if((quizMode==="multiple"||quizMode==="mixed")&&uniqueQuizNames<2)quizMode="locate";
    els.quizModeButtons.forEach(button=>button.classList.toggle("is-active",button.dataset.quizMode===quizMode));
    els.personalPracticeNote.hidden=quizSource==="official";
  }
  function openStudySetup(){if(!getLearningItems("both").length){showToast(tr("noLearningContent"));return;}updateLearningSetup();openDrawer(els.studyDrawer);}
  function openQuizSetup(){if(!getLearningItems("both").length){showToast(tr("noLearningContent"));return;}updateLearningSetup();openDrawer(els.quizDrawer);}
  function ensureLearningSlide(){if(viewer?.world?.getItemCount())return true;connectSlide();showToast(tr("openSlideForLearning"));return false;}
  function studyProgressEntry(item){return workspace.studyProgress?.[learningItemKey(item)]||null;}
  function setStudyProgress(item,status){workspace.studyProgress=workspace.studyProgress||{};workspace.studyProgress[learningItemKey(item)]={status,updatedAt:new Date().toISOString(),source:item.source};if(item.source==="official"&&!workspace.studiedStructureIds.includes(item.id))workspace.studiedStructureIds.push(item.id);saveWorkspace();}
  function currentLearningItem(){return learningSession?.items?.[learningSession.index]||null;}
  function resetLearningPanel(){els.learningSessionAnswer.hidden=true;els.learningAnswers.hidden=true;els.learningAnswers.replaceChildren();els.learningFeedback.hidden=true;els.learningFeedback.className="learning-feedback";els.learningFeedback.textContent="";els.learningRevealButton.hidden=true;els.learningMarkLearningButton.hidden=true;els.learningMarkKnownButton.hidden=true;els.learningNextButton.hidden=true;els.learningNextButton.textContent=tr("next");}
  function startStudySession(){
    if(!ensureLearningSlide())return;const items=getLearningItems(studySource);if(!items.length)return;
    closeToolDrawers();document.body.classList.add("learning-active");learningSession={type:"study",source:studySource,items:shuffle(items),index:0,revealed:false,active:true};els.learningSessionPanel.hidden=false;renderStructures();renderPersonalAnnotations();showStudyItem();
  }
  function showStudyItem(){
    const item=currentLearningItem();if(!item){completeStudySession();return;}learningSession.revealed=false;learningSession.showTarget=true;learningSession.awaitingLocate=false;resetLearningPanel();
    els.learningSessionKicker.textContent=tr("study").toUpperCase();els.learningSessionTitle.textContent=tr("activeRecall");els.learningSessionCounter.textContent=`${learningSession.index+1} / ${learningSession.items.length}`;els.learningSessionPrompt.textContent=tr("whatIsHighlighted");els.learningRevealButton.hidden=false;zoomToStructure(item.data);renderLearningTarget();
  }
  function revealStudyAnswer(){const item=currentLearningItem();if(!item)return;learningSession.revealed=true;els.learningSessionAnswer.hidden=false;els.learningAnswerSource.textContent=learningSourceLabel(item.source);els.learningAnswerSource.dataset.source=item.source;els.learningAnswerName.textContent=learningItemName(item);els.learningAnswerDescription.textContent=learningItemDescription(item)||"—";els.learningRevealButton.hidden=true;els.learningMarkLearningButton.hidden=false;els.learningMarkKnownButton.hidden=false;}
  function markStudy(status){const item=currentLearningItem();if(!item)return;setStudyProgress(item,status);learningSession.index+=1;if(learningSession.index>=learningSession.items.length)completeStudySession();else showStudyItem();}
  function completeStudySession(){const count=learningSession?.items?.length||0;resetLearningPanel();els.learningSessionKicker.textContent=tr("study").toUpperCase();els.learningSessionTitle.textContent=tr("studyComplete");els.learningSessionCounter.textContent="✓";els.learningSessionPrompt.textContent=tr("studyCompleteBody",{count});els.learningFeedback.hidden=false;els.learningFeedback.classList.add("is-success");els.learningFeedback.textContent=tr("progressSummary",progressCounts());els.learningNextButton.hidden=false;els.learningNextButton.textContent=tr("done");learningSession.complete=true;learningSession.showTarget=false;renderLearningTarget();}
  function setQuizMode(mode){if(!["mixed","multiple","locate"].includes(mode))return;if((mode==="mixed"||mode==="multiple")&&els.quizModeMultiple.disabled)return;quizMode=mode;els.quizModeButtons.forEach(button=>button.classList.toggle("is-active",button.dataset.quizMode===quizMode));updateLearningSetup();}
  function buildQuizQuestions(items,mode){
    const requested=els.quizLengthSelect.value==="all"?items.length:Number(els.quizLengthSelect.value)||5;const chosen=shuffle(items).slice(0,Math.min(requested,items.length));const uniqueNames=new Set(items.map(item=>learningItemName(item).toLowerCase())).size;
    return chosen.map((item,index)=>{let qmode=mode;if(qmode==="mixed")qmode=uniqueNames>=2&&index%2===0?"multiple":"locate";if(qmode==="multiple"&&uniqueNames<2)qmode="locate";return{item,mode:qmode};});
  }
  function startQuizSession(){
    if(!ensureLearningSlide())return;const items=getLearningItems(quizSource);if(!items.length)return;const questions=buildQuizQuestions(items,quizMode);if(!questions.length)return;
    closeToolDrawers();document.body.classList.add("learning-active");learningSession={type:"quiz",source:quizSource,mode:quizMode,items,questions,index:0,correct:0,answered:0,locateCorrect:0,locateTotal:0,multipleCorrect:0,multipleTotal:0,active:true,awaitingLocate:false,showTarget:false};els.learningSessionPanel.hidden=false;renderStructures();renderPersonalAnnotations();showQuizQuestion();
  }
  function currentQuizQuestion(){return learningSession?.questions?.[learningSession.index]||null;}
  function quizOptionItems(target){const others=shuffle(learningSession.items.filter(item=>learningItemKey(item)!==learningItemKey(target)));const names=new Set([learningItemName(target).toLowerCase()]);const options=[target];for(const item of others){const name=learningItemName(item).toLowerCase();if(names.has(name))continue;names.add(name);options.push(item);if(options.length>=4)break;}return shuffle(options);}
  function showQuizQuestion(){
    const q=currentQuizQuestion();if(!q){completeQuizSession();return;}resetLearningPanel();learningSession.showTarget=q.mode==="multiple";learningSession.awaitingLocate=q.mode==="locate";els.learningSessionKicker.textContent=tr("quiz").toUpperCase();els.learningSessionTitle.textContent=`${tr("quizQuestion")} ${learningSession.index+1}`;els.learningSessionCounter.textContent=`${learningSession.index+1} / ${learningSession.questions.length}`;
    if(q.mode==="multiple"){
      els.learningSessionPrompt.textContent=tr("highlightedPrompt");els.learningAnswers.hidden=false;zoomToStructure(q.item.data);quizOptionItems(q.item).forEach(option=>{const button=document.createElement("button");button.type="button";button.className="quiz-answer-button";button.textContent=learningItemName(option);button.addEventListener("click",()=>answerMultipleChoice(option,button));els.learningAnswers.appendChild(button);});
    }else{
      els.learningSessionPrompt.textContent=tr("locatePrompt",{name:learningItemName(q.item)});els.learningFeedback.hidden=false;els.learningFeedback.textContent=tr("locateInstruction");viewer?.viewport?.goHome(false);
    }
    renderLearningTarget();
  }
  function answerMultipleChoice(option,button){
    if(!learningSession||learningSession.answeredCurrent)return;const q=currentQuizQuestion();if(!q)return;const correct=learningItemKey(option)===learningItemKey(q.item);learningSession.answeredCurrent=true;learningSession.answered+=1;learningSession.multipleTotal+=1;if(correct){learningSession.correct+=1;learningSession.multipleCorrect+=1;}
    Array.from(els.learningAnswers.children).forEach(node=>{node.disabled=true;const match=node.textContent===learningItemName(q.item);if(match)node.classList.add("is-correct");});if(!correct)button.classList.add("is-wrong");showQuizFeedback(correct,q.item);learningSession.showTarget=true;renderLearningTarget();els.learningNextButton.hidden=false;
  }
  function screenPositionToNormalized(position){if(!viewer?.viewport||!viewer.world.getItemCount()||!imageInfo)return null;const vp=viewer.viewport.pointFromPixel(position,true);const imagePoint=viewer.world.getItemAt(0).viewportToImageCoordinates(vp);return[Math.max(0,Math.min(1,imagePoint.x/imageInfo.Width)),Math.max(0,Math.min(1,imagePoint.y/imageInfo.Height))];}
  function pointInPolygon(point,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const xi=Number(points[i][0]),yi=Number(points[i][1]),xj=Number(points[j][0]),yj=Number(points[j][1]);const intersect=((yi>point[1])!==(yj>point[1]))&&(point[0]<(xj-xi)*(point[1]-yi)/(yj-yi+Number.EPSILON)+xi);if(intersect)inside=!inside;}return inside;}
  function locateAnswerCorrect(item,normalized,screenPosition){const g=item.data.geometry||{};if(g.type==="polygon"&&Array.isArray(g.points)&&g.points.length>=3)return pointInPolygon(normalized,g.points);if(g.type==="point"){const target=normalizedToScreen(Number(g.x),Number(g.y));if(!target)return false;const dx=target.x-screenPosition.x,dy=target.y-screenPosition.y;return Math.hypot(dx,dy)<=46;}return false;}
  function handleLocateAnswer(position){
    if(!learningSession?.awaitingLocate||learningSession.answeredCurrent)return;const q=currentQuizQuestion();if(!q)return;const normalized=screenPositionToNormalized(position);if(!normalized)return;const correct=locateAnswerCorrect(q.item,normalized,position);learningSession.awaitingLocate=false;learningSession.answeredCurrent=true;learningSession.answered+=1;learningSession.locateTotal+=1;if(correct){learningSession.correct+=1;learningSession.locateCorrect+=1;}learningSession.showTarget=true;renderLearningTarget();showQuizFeedback(correct,q.item);els.learningNextButton.hidden=false;
  }
  function showQuizFeedback(correct,item){els.learningFeedback.hidden=false;els.learningFeedback.className=`learning-feedback ${correct?"is-success":"is-error"}`;els.learningFeedback.textContent=correct?tr("correct"):`${tr("incorrect")} · ${tr("correctAnswer",{name:learningItemName(item)})}`;}
  function nextQuizQuestion(){if(!learningSession)return;if(learningSession.complete){endLearningSession();return;}learningSession.index+=1;learningSession.answeredCurrent=false;if(learningSession.index>=learningSession.questions.length)completeQuizSession();else showQuizQuestion();}
  function completeQuizSession(){
    if(!learningSession||learningSession.complete)return;learningSession.complete=true;learningSession.awaitingLocate=false;learningSession.showTarget=false;const result={id:`quiz-${Date.now()}`,at:new Date().toISOString(),source:learningSession.source,mode:learningSession.mode,correct:learningSession.correct,total:learningSession.questions.length,locateCorrect:learningSession.locateCorrect,locateTotal:learningSession.locateTotal,multipleCorrect:learningSession.multipleCorrect,multipleTotal:learningSession.multipleTotal};workspace.quizHistory=workspace.quizHistory||[];workspace.quizHistory.push(result);if(workspace.quizHistory.length>50)workspace.quizHistory=workspace.quizHistory.slice(-50);learningSession.result=result;saveWorkspace();resetLearningPanel();els.learningSessionKicker.textContent=tr("quiz").toUpperCase();els.learningSessionTitle.textContent=tr("quizComplete");els.learningSessionCounter.textContent="✓";els.learningSessionPrompt.textContent=tr("scoreSummary",{correct:result.correct,total:result.total});els.learningFeedback.hidden=false;els.learningFeedback.className="learning-feedback is-success";els.learningFeedback.textContent=result.source==="official"?tr("quizResultOfficial"):result.source==="personal"?tr("quizResultPersonal"):tr("quizResultMixed");els.learningNextButton.hidden=false;els.learningNextButton.textContent=tr("done");renderLearningTarget();
  }
  function renderLearningSession(){if(!learningSession||els.learningSessionPanel.hidden)return;if(learningSession.type==="study"&&!learningSession.complete){els.learningSessionKicker.textContent=tr("study").toUpperCase();els.learningSessionTitle.textContent=tr("activeRecall");els.learningSessionPrompt.textContent=tr("whatIsHighlighted");if(learningSession.revealed)revealStudyAnswer();}else if(learningSession.type==="study"&&learningSession.complete){els.learningSessionKicker.textContent=tr("study").toUpperCase();els.learningSessionTitle.textContent=tr("studyComplete");els.learningSessionPrompt.textContent=tr("studyCompleteBody",{count:learningSession.items?.length||0});els.learningNextButton.textContent=tr("done");}else if(learningSession.type==="quiz"&&!learningSession.complete){const q=currentQuizQuestion();if(q){els.learningSessionKicker.textContent=tr("quiz").toUpperCase();els.learningSessionTitle.textContent=`${tr("quizQuestion")} ${learningSession.index+1}`;els.learningSessionPrompt.textContent=q.mode==="locate"?tr("locatePrompt",{name:learningItemName(q.item)}):tr("highlightedPrompt");}}else if(learningSession.type==="quiz"&&learningSession.complete){const result=learningSession.result||{};els.learningSessionKicker.textContent=tr("quiz").toUpperCase();els.learningSessionTitle.textContent=tr("quizComplete");els.learningSessionPrompt.textContent=tr("scoreSummary",{correct:result.correct||0,total:result.total||0});els.learningNextButton.textContent=tr("done");}}
  function renderLearningTarget(){
    if(!els.learningTargetOverlay)return;const width=els.viewerStage.clientWidth,height=els.viewerStage.clientHeight;els.learningTargetOverlay.setAttribute("viewBox",`0 0 ${width} ${height}`);els.learningTargetOverlay.replaceChildren();if(!learningSession?.showTarget||!viewer?.world?.getItemCount())return;const item=learningSession.type==="quiz"?currentQuizQuestion()?.item:currentLearningItem();if(!item)return;const g=item.data.geometry||{},ns="http://www.w3.org/2000/svg",color=item.source==="personal"?safeColor(item.data.style?.color):"#e879ae";
    if(g.type==="point"){const pt=normalizedToScreen(Number(g.x),Number(g.y));if(!pt)return;const ring=document.createElementNS(ns,"circle");ring.setAttribute("cx",pt.x);ring.setAttribute("cy",pt.y);ring.setAttribute("r","22");ring.classList.add("learning-target-point");ring.style.setProperty("--learning-color",color);els.learningTargetOverlay.appendChild(ring);}else if(g.type==="polygon"&&Array.isArray(g.points)){const pts=g.points.map(([x,y])=>normalizedToScreen(Number(x),Number(y))).filter(Boolean);if(pts.length<3)return;const polygon=document.createElementNS(ns,"polygon");polygon.setAttribute("points",pts.map(pt=>`${pt.x},${pt.y}`).join(" "));polygon.classList.add("learning-target-region");polygon.style.setProperty("--learning-color",color);els.learningTargetOverlay.appendChild(polygon);}
  }
  function progressCounts(){const items=getLearningItems("both"),valid=new Set(items.map(learningItemKey));let known=0,learning=0;Object.entries(workspace?.studyProgress||{}).forEach(([key,value])=>{if(!valid.has(key))return;if(value?.status==="known")known+=1;else if(value?.status==="learning")learning+=1;});return{known,learning,total:items.length};}
  function aggregateQuizStats(){let correct=0,total=0,locateCorrect=0,locateTotal=0;for(const result of workspace?.quizHistory||[]){correct+=Number(result.correct)||0;total+=Number(result.total)||0;locateCorrect+=Number(result.locateCorrect)||0;locateTotal+=Number(result.locateTotal)||0;}return{quiz:total?Math.round(correct/total*100):null,locate:locateTotal?Math.round(locateCorrect/locateTotal*100):null};}
  function endLearningSession({silent=false}={}){if(!learningSession)return;learningSession=null;document.body.classList.remove("learning-active");els.learningSessionPanel.hidden=true;els.learningTargetOverlay.replaceChildren();renderStructures();renderPersonalAnnotations();renderDrawings();if(!silent)showToast(language==="es"?"Sesión cerrada.":"Learning session closed.");updateWorkspaceUi();}

  function updateWorkspaceUi(){
    if(!workspace)return;const noteHasText=Boolean(String(workspace.note?.text||"").trim());els.notesStatus.textContent=noteHasText?tr("noteSaved"):tr("noteEmpty");const count=workspace.drawings?.length||0;els.drawingStatus.textContent=`${count} ${tr(count===1?"stroke":"strokes")}`;const personalCount=(workspace.personalAnnotations||[]).length;els.personalLabelsStatus.textContent=`${personalCount} ${tr(personalCount===1?"personalLabelSingular":"personalLabelPlural")}`;els.personalLayerCount.textContent=String(personalCount);els.bookmarkButton.classList.toggle("is-saved",Boolean(workspace.bookmarked));els.bookmarkButton.setAttribute("aria-pressed",String(Boolean(workspace.bookmarked)));els.bookmarkIcon.textContent=workspace.bookmarked?"★":"☆";els.bookmarkStatus.textContent=workspace.bookmarked?tr("savedSlide"):tr("saveSlide");
    const progress=progressCounts();const pct=progress.total?Math.round(progress.known/progress.total*100):0;els.progressValue.textContent=`${pct}%`;els.progressBar.style.width=`${pct}%`;els.progressCopy.textContent=tr("progressSummary",progress);els.knownCountValue.textContent=String(progress.known);els.learningCountValue.textContent=String(progress.learning);const quizStats=aggregateQuizStats();els.quizAccuracyValue.textContent=quizStats.quiz==null?"—":`${quizStats.quiz}%`;els.locateAccuracyValue.textContent=quizStats.locate==null?"—":`${quizStats.locate}%`;updateLearningSetup();renderStructures();
  }

  async function updateHistologyCloudUi(detail=null){
    if(!els.histologyCloudButton||!els.histologyCloudText)return;
    let state=detail;
    if(!state){try{state=await window.MorphoraHistologySync?.status?.();}catch(_){state=null;}}
    const mode=state?.state||"local";
    els.histologyCloudButton.dataset.state=mode;
    els.histologyCloudText.textContent=tr(mode==="synced"?"cloudSynced":mode==="syncing"?"cloudSyncing":mode==="offline"?"cloudOffline":mode==="attention"?"cloudAttention":"cloudLocal");
    els.histologyCloudButton.setAttribute("aria-label",els.histologyCloudText.textContent);
    els.histologyCloudButton.title=state?.signedIn?(mode==="attention"?tr("cloudAttention"):tr("cloudSynced")):tr("cloudSignIn");
  }
  async function syncHistologyNow(){
    const service=window.MorphoraHistologySync;
    if(!service){showToast(tr("cloudSignIn"));return;}
    const state=await service.status?.();
    if(!state?.signedIn){showToast(tr("cloudSignIn"));await updateHistologyCloudUi(state);return;}
    els.histologyCloudButton.disabled=true;
    try{await updateHistologyCloudUi({...state,state:"syncing"});const result=await service.synchronize?.({flush:true});showToast(result?.ok?tr("cloudSyncComplete"):tr("cloudAttention"));}
    catch(_){showToast(tr("cloudAttention"));}
    finally{els.histologyCloudButton.disabled=false;await updateHistologyCloudUi();}
  }
  function applyRemoteHistologyWorkspace(event){
    const detail=event?.detail||{};
    if(String(detail.slideId||"")!==String(manifest?.id||requestedSlide))return;
    workspace=detail.workspace&&typeof detail.workspace==="object"?{...emptyWorkspace(),...clone(detail.workspace),schemaVersion:4}:loadWorkspace();
    renderPersonalAnnotations();renderPersonalManagerList();renderDrawings();updateWorkspaceUi();
  }
  function restorePrincipalWorkspace(){
    if(!manifest)return;
    workspace=loadWorkspace();
    renderPersonalAnnotations();renderPersonalManagerList();renderDrawings();updateWorkspaceUi();
  }

  function toggleFullscreen(){if(!document.fullscreenElement)els.viewerStage.requestFullscreen?.();else document.exitFullscreen?.();}

  function bind(){
    els.connectButton.addEventListener("click",()=>connectSlide());els.emptyConnectButton.addEventListener("click",()=>connectSlide());els.developerConnectButton.addEventListener("click",()=>connectSlide());els.histologyCloudButton?.addEventListener("click",syncHistologyNow);els.setupButton.addEventListener("click",openDeveloperPanel);els.errorSetupButton.addEventListener("click",openDeveloperPanel);els.errorRetryButton.addEventListener("click",()=>connectSlide());els.developerButton.addEventListener("click",openDeveloperPanel);els.developerCloseButton.addEventListener("click",closeDeveloperPanel);els.authorizeButton.addEventListener("click",authorizeBrowser);els.saveSourceButton.addEventListener("click",saveSourceEditor);els.resetSourceButton.addEventListener("click",resetSourceEditor);els.hostedCheckButton.addEventListener("click",()=>runHostedSourceCheck());els.localPilotButton.addEventListener("click",enableLocalDziPilot);els.restoreAutoButton.addEventListener("click",restoreAutoSource);els.pmaExportCopyButton?.addEventListener("click",copyPmaExportCommand);els.hostedUrlInput.addEventListener("input",()=>setHostedCheckState("idle","pilotReadyHint"));
    els.themeToggle.addEventListener("click",toggleTheme);els.languageToggle.addEventListener("click",toggleLanguage);els.zoomInButton.addEventListener("click",()=>viewer?.viewport?.zoomBy(1.45));els.zoomOutButton.addEventListener("click",()=>viewer?.viewport?.zoomBy(1/1.45));els.homeButton.addEventListener("click",()=>viewer?.viewport?.goHome(false));els.fullscreenButton.addEventListener("click",toggleFullscreen);
    els.studyButton.addEventListener("click",openStudySetup);els.quizButton.addEventListener("click",openQuizSetup);els.studySourceButtons.forEach(button=>button.addEventListener("click",()=>setLearningSource("study",button.dataset.studySource)));els.quizSourceButtons.forEach(button=>button.addEventListener("click",()=>setLearningSource("quiz",button.dataset.quizSource)));els.quizModeButtons.forEach(button=>button.addEventListener("click",()=>setQuizMode(button.dataset.quizMode)));els.startStudyButton.addEventListener("click",startStudySession);els.startQuizButton.addEventListener("click",startQuizSession);els.learningRevealButton.addEventListener("click",revealStudyAnswer);els.learningMarkLearningButton.addEventListener("click",()=>markStudy("learning"));els.learningMarkKnownButton.addEventListener("click",()=>markStudy("known"));els.learningNextButton.addEventListener("click",()=>{if(learningSession?.type==="quiz")nextQuizQuestion();else if(learningSession?.complete)endLearningSession();});els.learningExitButton.addEventListener("click",()=>endLearningSession());
    els.notesButton.addEventListener("click",openNotes);els.saveNotesButton.addEventListener("click",saveNotes);els.drawButton.addEventListener("click",openDrawing);els.personalLabelsButton.addEventListener("click",openPersonalLabels);els.bookmarkButton.addEventListener("click",toggleBookmark);els.drawerCloseButtons.forEach(button=>button.addEventListener("click",closeToolDrawers));els.drawerBackdrop.addEventListener("click",closeAllPanels);
    els.structuresVisibilityButton.addEventListener("click",toggleStructures);els.personalVisibilityButton.addEventListener("click",togglePersonalVisibility);els.officialStructuresTab.addEventListener("click",()=>setStructureLayer("official"));els.personalStructuresTab.addEventListener("click",()=>setStructureLayer("personal"));els.toolbarStructuresButton.addEventListener("click",toggleStructures);els.structureSearch.addEventListener("input",renderStructureList);
    els.personalAddPointButton.addEventListener("click",()=>{editingPersonalId=null;startPersonalMode("point");});els.personalAddRegionButton.addEventListener("click",()=>{editingPersonalId=null;startPersonalMode("polygon");});els.personalInteractionLayer.addEventListener("pointerdown",personalPointerDown);els.personalCancelModeButton.addEventListener("click",()=>cancelPersonalMode({reopenEditor:Boolean(pendingPersonalAnnotation&&editingPersonalId)}));els.personalFinishRegionButton.addEventListener("click",finishPersonalPlacement);els.savePersonalButton.addEventListener("click",savePersonalEditor);els.deletePersonalButton.addEventListener("click",deletePersonalAnnotation);els.cancelPersonalEditButton.addEventListener("click",closeToolDrawers);els.personalRepositionButton.addEventListener("click",repositionPersonalAnnotation);els.personalColorInput.addEventListener("input",()=>updatePersonalColorUi(els.personalColorInput.value));els.personalOpacityInput.addEventListener("input",()=>{els.personalOpacityValue.textContent=`${els.personalOpacityInput.value}%`;});els.annotationColorButtons.forEach(button=>button.addEventListener("click",()=>updatePersonalColorUi(button.dataset.annotationColor)));
    els.studioAddPointButton.addEventListener("click",()=>{editingStructureId=null;startStudioMode("point");});els.studioAddRegionButton.addEventListener("click",()=>{editingStructureId=null;startStudioMode("polygon");});els.exportManifestButton.addEventListener("click",exportStudioManifest);els.resetStudioDraftButton.addEventListener("click",resetStudioDraft);els.saveStructureButton.addEventListener("click",saveStructureEditor);els.deleteStructureButton.addEventListener("click",deleteStructureFromEditor);els.cancelStructureEditButton.addEventListener("click",closeToolDrawers);els.studioRepositionButton.addEventListener("click",repositionCurrentStructure);els.studioInteractionLayer.addEventListener("pointerdown",studioPointerDown);els.studioCancelModeButton.addEventListener("click",()=>cancelStudioMode({reopenEditor:Boolean(pendingStructure&&editingStructureId)}));els.studioFinishRegionButton.addEventListener("click",finishStudioPlacement);
    els.drawToolButtons.forEach(button=>button.addEventListener("click",()=>setDrawTool(button.dataset.drawTool)));els.drawingColor.addEventListener("input",renderDrawings);els.drawingSize.addEventListener("input",()=>{els.drawingSizeValue.textContent=els.drawingSize.value;});els.drawingUndoButton.addEventListener("click",undoDrawing);els.drawingClearButton.addEventListener("click",clearDrawings);els.drawingDoneButton.addEventListener("click",closeToolDrawers);
    els.drawingCanvas.addEventListener("pointerdown",drawingPointerDown);els.drawingCanvas.addEventListener("pointermove",drawingPointerMove);els.drawingCanvas.addEventListener("pointerup",drawingPointerUp);els.drawingCanvas.addEventListener("pointercancel",drawingPointerUp);
    document.addEventListener("fullscreenchange",()=>{els.fullscreenButton.textContent=document.fullscreenElement?tr("exitFullscreen"):tr("fullscreen");setTimeout(()=>{viewer?.viewport?.resize?.();renderStructures();renderPersonalAnnotations();renderDrawings();renderPersonalDraftOverlay();renderStudioDraftOverlay();renderLearningTarget();},80);});
    window.addEventListener("morphora:histologysyncstate",event=>updateHistologyCloudUi(event.detail));window.addEventListener("morphora:histologyworkspaceremotechange",applyRemoteHistologyWorkspace);window.addEventListener("morphora:localvaultrestored",()=>setTimeout(restorePrincipalWorkspace,20));
    document.addEventListener("keydown",event=>{if(event.key==="Escape"){if(learningSession){event.preventDefault();endLearningSession({silent:true});}else if(personalMode){event.preventDefault();cancelPersonalMode({reopenEditor:Boolean(pendingPersonalAnnotation&&editingPersonalId)});}else if(studioMode){event.preventDefault();cancelStudioMode({reopenEditor:Boolean(pendingStructure&&editingStructureId)});}else if(!els.developerPanel.hidden||!els.studyDrawer.hidden||!els.quizDrawer.hidden||!els.notesDrawer.hidden||!els.drawingDrawer.hidden||!els.personalLabelsDrawer.hidden||!els.personalEditorDrawer.hidden||!els.structureEditorDrawer.hidden){event.preventDefault();closeAllPanels();}}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="s"){if(!els.notesDrawer.hidden){event.preventDefault();saveNotes();}else if(!els.personalEditorDrawer.hidden){event.preventDefault();savePersonalEditor();}else if(!els.structureEditorDrawer.hidden){event.preventDefault();saveStructureEditor();}}});
  }

  function applyManifest(){currentSettings=loadSettings();workspace=loadWorkspace();loadStudioDraft();applyManifestLabels();buildObjectiveButtons();syncDeveloperFields();updateMetadata(deriveSlideInfo({}));els.barcodePlaceholder.textContent=tr("availableAfterConnection");renderStructuresAndList();renderPersonalManagerList();renderStudioStructureList();updateStudioSummary();updateWorkspaceUi();}

  async function init(){
    cacheElements();applyTheme();bind();
    try{await Promise.resolve(window.MorphoraLocalVault?.ready).catch(()=>{});await updateHistologyCloudUi();const response=await fetch(MANIFEST_URL,{cache:"no-store"});if(!response.ok)throw new Error(`Manifest returned HTTP ${response.status}.`);sourceManifest=await response.json();manifest=clone(sourceManifest);applyManifest();applyCopy();setDrawTool("pen");els.drawingSizeValue.textContent=els.drawingSize.value;if(location.protocol==="file:")setError(tr("liveServerTitle"),tr("liveServerBody"));else{setStatus("idle",tr("statusIdle"));setTimeout(()=>connectSlide({silent:true}),180);} }
    catch(error){setError(language==="es"?"No se pudo cargar el manifiesto de histología":"Histology manifest failed to load",error?.message||String(error));}
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
