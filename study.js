document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const Atlas = window.MorphoraAtlas;
  const Models = window.MorphoraModels;
  const Storage = window.MorphoraStorage;
  const I18n = window.MorphoraI18n || { ready: Promise.resolve(), applyDom() {}, t(key, vars = {}) { return key; }, localize(item, field) { return item?.[field] ?? ""; }, localizeArray(item, field) { const value = item?.[field]; return Array.isArray(value) ? value : []; }, getLanguage() { return "en"; } };
  await I18n.ready;
  I18n.applyDom();
  const A11y = window.MorphoraA11y || {
    announce() {},
    activateFocusTrap() {},
    releaseFocusTrap() {},
    setExpanded(button, value) {
      button?.setAttribute("aria-expanded", String(Boolean(value)));
    }
  };

  if (!Atlas) {
    console.error("MORPHORA Study could not start because the atlas API is unavailable.");
    return;
  }

  const STORAGE_KEY = Storage?.keys.learningProgress || "morphora:learning-progress:v2";
  const LEGACY_STORAGE_KEY = Storage?.keys.learningProgressLegacy || "morphora:learning-progress:v1";
  const SCHEMA_VERSION = window.MORPHORA_CONFIG?.userDataSchemaVersion || Models?.USER_DATA_SCHEMA_VERSION || 2;
  const DEFAULT_ACCEPTED_RADIUS = 0.045;

  function localizeToken(prefix, value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const camel = raw.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const key = `${prefix}.${camel}`;
    const translated = I18n.t(key);
    return translated === key ? raw.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : translated;
  }
  const MAX_RECENT_SESSIONS = 30;
  const MAX_MASTERY_HISTORY = 12;
  const WEAK_MASTERY_THRESHOLD = Number(window.MORPHORA_CONFIG?.masteryWeakThreshold) || 60;
  const STRONG_MASTERY_THRESHOLD = Number(window.MORPHORA_CONFIG?.masteryStrongThreshold) || 80;
  const ACTIVE_QUIZ_KEY = Storage?.keys.activeQuizSession || "morphora:quiz-session:v1";
  const elements = {
    exploreModeButton: document.getElementById("exploreModeButton"),
    studyModeButton: document.getElementById("studyModeButton"),
    quizModeButton: document.getElementById("quizModeButton"),
    openStudyWorkspace: document.getElementById("openStudyWorkspace"),
    openProgressDashboard: document.getElementById("openProgressDashboard"),
    studyProgressBadge: document.getElementById("studyProgressBadge"),
    mobileStudyButton: document.getElementById("mobileStudyButton"),
    studyBackdrop: document.getElementById("studyBackdrop"),
    studyDrawer: document.getElementById("studyDrawer"),
    closeStudyDrawer: document.getElementById("closeStudyDrawer"),
    studyViewName: document.getElementById("studyViewName"),
    studyViewCount: document.getElementById("studyViewCount"),
    studyMasteryValue: document.getElementById("studyMasteryValue"),
    studyMasteryTrack: document.getElementById("studyMasteryTrack"),
    studyMasteryBar: document.getElementById("studyMasteryBar"),
    studyCurrentCounter: document.getElementById("studyCurrentCounter"),
    studyCurrentPrompt: document.getElementById("studyCurrentPrompt"),
    studyCurrentDescription: document.getElementById("studyCurrentDescription"),
    studyCurrentStatus: document.getElementById("studyCurrentStatus"),
    revealStudyStructure: document.getElementById("revealStudyStructure"),
    markStudyReview: document.getElementById("markStudyReview"),
    previousStudyStructure: document.getElementById("previousStudyStructure"),
    nextStudyStructure: document.getElementById("nextStudyStructure"),
    revealAllStudyStructures: document.getElementById("revealAllStudyStructures"),
    hideAllStudyStructures: document.getElementById("hideAllStudyStructures"),
    startQuickQuiz: document.getElementById("startQuickQuiz"),
    studySearchInput: document.getElementById("studySearchInput"),
    studyDifficultyFilter: document.getElementById("studyDifficultyFilter"),
    studyCategoryFilter: document.getElementById("studyCategoryFilter"),
    studyStructureList: document.getElementById("studyStructureList"),
    quizSetupBackdrop: document.getElementById("quizSetupBackdrop"),
    quizSetupDialog: document.getElementById("quizSetupDialog"),
    quizSetupForm: document.getElementById("quizSetupForm"),
    closeQuizSetup: document.getElementById("closeQuizSetup"),
    cancelQuizSetup: document.getElementById("cancelQuizSetup"),
    quizSetupViewName: document.getElementById("quizSetupViewName"),
    quizQuestionCount: document.getElementById("quizQuestionCount"),
    quizDifficultyFilter: document.getElementById("quizDifficultyFilter"),
    quizCategoryFilter: document.getElementById("quizCategoryFilter"),
    quizProgressFilter: document.getElementById("quizProgressFilter"),
    quizIncludeReviewOnly: document.getElementById("quizIncludeReviewOnly"),
    quizShowDescriptions: document.getElementById("quizShowDescriptions"),
    quizEligibilityNote: document.getElementById("quizEligibilityNote"),
    quizResumeCard: document.getElementById("quizResumeCard"),
    quizResumeSummary: document.getElementById("quizResumeSummary"),
    resumeQuizSession: document.getElementById("resumeQuizSession"),
    discardQuizSession: document.getElementById("discardQuizSession"),
    beginQuizButton: document.getElementById("beginQuizButton"),
    quizHud: document.getElementById("quizHud"),
    quizTypeLabel: document.getElementById("quizTypeLabel"),
    quizProgressLabel: document.getElementById("quizProgressLabel"),
    quizTimerLabel: document.getElementById("quizTimerLabel"),
    quizProgressTrack: document.getElementById("quizProgressTrack"),
    quizProgressBar: document.getElementById("quizProgressBar"),
    quizPromptTitle: document.getElementById("quizPromptTitle"),
    quizPromptText: document.getElementById("quizPromptText"),
    quizAnswerOptions: document.getElementById("quizAnswerOptions"),
    flashcardAnswer: document.getElementById("flashcardAnswer"),
    flashcardAnswerName: document.getElementById("flashcardAnswerName"),
    flashcardAnswerDescription: document.getElementById("flashcardAnswerDescription"),
    quizFeedback: document.getElementById("quizFeedback"),
    quizFeedbackTitle: document.getElementById("quizFeedbackTitle"),
    quizFeedbackText: document.getElementById("quizFeedbackText"),
    revealFlashcardAnswer: document.getElementById("revealFlashcardAnswer"),
    flashcardRatingActions: document.getElementById("flashcardRatingActions"),
    nextQuizQuestion: document.getElementById("nextQuizQuestion"),
    cancelActiveQuiz: document.getElementById("cancelActiveQuiz"),
    quizResultsBackdrop: document.getElementById("quizResultsBackdrop"),
    quizResultsDialog: document.getElementById("quizResultsDialog"),
    closeQuizResults: document.getElementById("closeQuizResults"),
    quizScoreRing: document.getElementById("quizScoreRing"),
    quizScorePercent: document.getElementById("quizScorePercent"),
    quizScoreFraction: document.getElementById("quizScoreFraction"),
    quizAverageTime: document.getElementById("quizAverageTime"),
    quizMasteryChange: document.getElementById("quizMasteryChange"),
    quizMistakesList: document.getElementById("quizMistakesList"),
    quizRecommendationTitle: document.getElementById("quizRecommendationTitle"),
    quizRecommendationText: document.getElementById("quizRecommendationText"),
    reviewQuizMistakes: document.getElementById("reviewQuizMistakes"),
    repeatMissedQuiz: document.getElementById("repeatMissedQuiz"),
    finishQuizResults: document.getElementById("finishQuizResults"),
    progressBackdrop: document.getElementById("progressBackdrop"),
    progressDrawer: document.getElementById("progressDrawer"),
    closeProgressDrawer: document.getElementById("closeProgressDrawer"),
    progressStructuresStudied: document.getElementById("progressStructuresStudied"),
    progressQuestionsAnswered: document.getElementById("progressQuestionsAnswered"),
    progressOverallAccuracy: document.getElementById("progressOverallAccuracy"),
    progressCurrentViewName: document.getElementById("progressCurrentViewName"),
    progressCurrentViewList: document.getElementById("progressCurrentViewList"),
    progressRecentSessions: document.getElementById("progressRecentSessions"),
    exportLearningProgress: document.getElementById("exportLearningProgress"),
    importLearningProgress: document.getElementById("importLearningProgress"),
    learningProgressImportInput: document.getElementById("learningProgressImportInput"),
    clearLearningProgress: document.getElementById("clearLearningProgress")
  };

  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    console.error(`MORPHORA Study cannot start. Missing elements: ${missing.join(", ")}`);
    return;
  }

  const state = {
    mode: "explore",
    activeViewId: null,
    activeViewData: null,
    labels: [],
    studyIndex: 0,
    studySearch: "",
    studyDifficulty: "all",
    studyCategory: "all",
    revealed: new Set(),
    highlightLabelId: null,
    highlightStyle: "anchor",
    previousExploreLabelsVisible: true,
    drawerTrigger: null,
    progressTrigger: null,
    quizSetupTrigger: null,
    resultsTrigger: null,
    quiz: null,
    lastQuizResult: null,
    timerId: null,
    customQuestions: [],
    questionBankPath: null,
    recoverableSession: null,
    progress: loadProgress()
  };

  function createEmptyProgress() {
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: null,
      structures: {},
      customQuestions: {},
      sessions: []
    };
  }

  function historyScore(item) {
    if (!item || typeof item !== "object") return 0;
    if (item.rating === "easy") return 100;
    if (item.rating === "good") return 82;
    if (item.rating === "difficult") return 35;
    if (item.rating === "again") return 0;
    return item.correct ? 100 : 0;
  }

  function calculateMastery({ attempts = 0, correct = 0, history = [] } = {}) {
    if (!attempts) return 0;
    const accuracy = Math.max(0, Math.min(100, (correct / attempts) * 100));
    if (!history.length) return Math.round(accuracy);
    let weighted = 0;
    let weights = 0;
    history.slice(-MAX_MASTERY_HISTORY).forEach((item, index, array) => {
      const weight = 1 + (index / Math.max(1, array.length - 1)) * 2;
      weighted += historyScore(item) * weight;
      weights += weight;
    });
    const recent = weights ? weighted / weights : accuracy;
    return Math.round((recent * 0.72) + (accuracy * 0.28));
  }

  function calculateStreak(history = []) {
    let streak = 0;
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const item = history[index];
      if (item?.correct || item?.rating === "good" || item?.rating === "easy") streak += 1;
      else break;
    }
    return streak;
  }

  function normalizeProgressEntry(value, key) {
    if (!value || typeof value !== "object") return null;
    const attempts = Math.max(0, Number(value.attempts) || 0);
    const correct = Math.min(attempts, Math.max(0, Number(value.correct) || 0));
    const incorrect = Math.max(0, attempts - correct);
    const history = Array.isArray(value.history)
      ? value.history.filter((item) => item && typeof item === "object").slice(-MAX_MASTERY_HISTORY)
      : [];
    const mastery = calculateMastery({ attempts, correct, history });
    return {
      key,
      viewId: String(value.viewId || key.split("::")[0] || ""),
      labelId: String(value.labelId || key.split("::")[1] || ""),
      name: String(value.name || "Structure"),
      attempts,
      correct,
      incorrect,
      mastery,
      streak: Number.isFinite(Number(value.streak)) ? Number(value.streak) : calculateStreak(history),
      history,
      reviewFlag: Boolean(value.reviewFlag),
      lastReviewedAt: value.lastReviewedAt || null,
      lastRating: value.lastRating || null
    };
  }

  function loadProgress() {
    try {
      const migrated = Storage?.readStore
        ? Storage.readStore("learningProgress", { fallback: null })
        : null;
      if (!migrated) return createEmptyProgress();
      const normalized = createEmptyProgress();
      normalized.updatedAt = migrated.updatedAt || null;
      Object.entries(migrated.structures || {}).forEach(([key, value]) => {
        const entry = normalizeProgressEntry(value, key);
        if (entry) normalized.structures[key] = entry;
      });
      normalized.customQuestions = migrated.customQuestions && typeof migrated.customQuestions === "object"
        ? { ...migrated.customQuestions }
        : {};
      normalized.sessions = Array.isArray(migrated.sessions)
        ? migrated.sessions.filter((item) => item && typeof item === "object").slice(0, MAX_RECENT_SESSIONS)
        : [];
      return normalized;
    } catch (error) {
      console.warn("MORPHORA could not read learning progress. A clean record was started.", error);
      return createEmptyProgress();
    }
  }

  function saveProgress(message = "Learning progress saved") {
    state.progress.updatedAt = new Date().toISOString();
    const result = Storage?.writeStore
      ? Storage.writeStore("learningProgress", state.progress)
      : { ok: false, fallback: false };
    if (result?.ok) {
      updateProgressUi();
      if (message) A11y.announce(message);
      return true;
    }
    updateProgressUi();
    if (result?.fallback) {
      A11y.announce("Learning progress is available for this session, but could not be saved permanently on this device.", { assertive: true });
    } else {
      A11y.announce("Learning progress could not be saved on this device.", { assertive: true });
    }
    return false;
  }

  function structureKey(viewId, labelId) {
    return `${viewId}::${labelId}`;
  }

  function getProgressEntry(label, create = false) {
    if (!state.activeViewId || !label?.id) return null;
    const key = structureKey(state.activeViewId, label.id);
    let entry = state.progress.structures[key] || null;
    if (!entry && create) {
      entry = {
        key,
        viewId: state.activeViewId,
        labelId: label.id,
        name: label.name,
        attempts: 0,
        correct: 0,
        incorrect: 0,
        mastery: 0,
        streak: 0,
        history: [],
        reviewFlag: false,
        lastReviewedAt: null,
        lastRating: null
      };
      state.progress.structures[key] = entry;
    }
    if (entry && label.name) entry.name = label.name;
    return entry;
  }

  function isPublishedLabel(label) {
    return !["draft", "review", "unpublished"].includes(String(label?.status || "").toLowerCase());
  }

  function matchesProgressFilter(label, filter = "all") {
    const entry = getProgressEntry(label);
    if (filter === "review") return Boolean(entry?.reviewFlag);
    if (filter === "weak") return Boolean(entry?.attempts) && (entry.mastery || 0) < WEAK_MASTERY_THRESHOLD;
    if (filter === "unseen") return !entry || entry.attempts === 0;
    return true;
  }

  function eligibleLabels({ reviewOnly = false, difficulty = "all", category = "all", progressFilter = "all" } = {}) {
    return state.labels.filter((label) => {
      if (!label || !label.id || !label.position) return false;
      if (label.quizEligible === false || !isPublishedLabel(label)) return false;
      if (difficulty !== "all" && label.difficulty !== difficulty) return false;
      if (category !== "all" && String(label.category || "uncategorized") !== category) return false;
      if (reviewOnly && !getProgressEntry(label)?.reviewFlag) return false;
      return matchesProgressFilter(label, progressFilter);
    });
  }

  function studyPool() {
    const query = state.studySearch.trim().toLocaleLowerCase();
    return eligibleLabels({ difficulty: state.studyDifficulty, category: state.studyCategory })
      .filter((label) => `${label.name} ${label.category || ""}`.toLocaleLowerCase().includes(query));
  }

  function currentStudyLabel() {
    const labels = studyPool();
    if (!labels.length) return null;
    state.studyIndex = Math.max(0, Math.min(state.studyIndex, labels.length - 1));
    return labels[state.studyIndex] || null;
  }

  function shuffle(values) {
    const array = [...values];
    for (let index = array.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [array[index], array[target]] = [array[target], array[index]];
    }
    return array;
  }

  function formatDuration(milliseconds) {
    const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function setModeButtons(mode) {
    [
      [elements.exploreModeButton, "explore"],
      [elements.studyModeButton, "study"],
      [elements.quizModeButton, "quiz"]
    ].forEach(([button, value]) => {
      const active = mode === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    elements.mobileStudyButton.classList.toggle("is-active", mode === "study" || mode === "quiz");
  }

  function setMode(mode, { openPanel = true, restoreLabels = true } = {}) {
    if (!state.activeViewData && mode !== "explore") {
      A11y.announce("Open an anatomical view before starting a study session.");
      return;
    }

    if (mode === "quiz") {
      window.MorphoraDrawing?.setActive?.(false);
      openQuizSetup(elements.quizModeButton);
      return;
    }

    if (mode === "study") {
      window.MorphoraDrawing?.setActive?.(false);
    }

    if (state.quiz) endQuiz({ showResults: false, announce: false });
    state.mode = mode;
    state.highlightLabelId = null;
    state.highlightStyle = "anchor";
    setModeButtons(mode);

    if (mode === "study") {
      state.previousExploreLabelsVisible = Atlas.getLabelsVisible?.() ?? true;
      Atlas.setLearningActive?.(true);
      Atlas.setLabelsVisible?.(false, { announce: false });
      closeQuizSetup({ restoreFocus: false });
      if (openPanel) openStudyDrawer(elements.studyModeButton);
      renderStudyWorkspace();
      A11y.announce("Study mode started. Anatomical labels are hidden for active recall.");
    } else {
      Atlas.setLearningActive?.(false);
      state.revealed.clear();
      closeStudyDrawer({ restoreFocus: false });
      closeQuizSetup({ restoreFocus: false });
      if (restoreLabels) {
        Atlas.setLabelsVisible?.(state.previousExploreLabelsVisible, { announce: false });
      }
      A11y.announce("Explore mode restored.");
    }

    Atlas.refreshLabels?.();
  }

  function getLabelVisibility(labelId) {
    if (state.mode === "explore") return null;

    if (state.mode === "study") {
      if (state.highlightLabelId === labelId) return "highlight";
      return state.revealed.has(labelId) ? "full" : "hidden";
    }

    if (state.mode === "quiz") {
      if (state.highlightLabelId !== labelId) return "hidden";
      if (state.highlightStyle === "full") return "full";
      if (state.highlightStyle === "highlight") return "highlight";
      return "anchor";
    }

    return null;
  }

  function handleLabelActivation(label) {
    if (state.mode !== "study") return false;
    const labels = studyPool();
    const index = labels.findIndex((item) => item.id === label.id);
    if (index >= 0) {
      state.studyIndex = index;
      state.revealed.add(label.id);
      state.highlightLabelId = label.id;
      renderStudyWorkspace();
      Atlas.refreshLabels?.();
      Atlas.focusPosition?.(label.position, 2);
    }
    return true;
  }

  function openStudyDrawer(trigger = document.activeElement) {
    if (!state.activeViewData) return;
    state.drawerTrigger = trigger instanceof HTMLElement ? trigger : null;
    elements.studyBackdrop.hidden = false;
    elements.studyDrawer.classList.add("open");
    elements.studyDrawer.setAttribute("aria-hidden", "false");
    A11y.setExpanded(elements.openStudyWorkspace, true);
    A11y.setExpanded(elements.mobileStudyButton, true);
    renderStudyWorkspace();
    A11y.activateFocusTrap(elements.studyDrawer, {
      initialFocus: elements.revealStudyStructure,
      returnFocus: state.drawerTrigger,
      onEscape: () => closeStudyDrawer({ restoreFocus: true })
    });
  }

  function closeStudyDrawer({ restoreFocus = true } = {}) {
    if (!elements.studyDrawer.classList.contains("open")) return;
    elements.studyDrawer.classList.remove("open");
    elements.studyDrawer.setAttribute("aria-hidden", "true");
    elements.studyBackdrop.hidden = true;
    A11y.setExpanded(elements.openStudyWorkspace, false);
    A11y.setExpanded(elements.mobileStudyButton, false);
    A11y.releaseFocusTrap(elements.studyDrawer, { restoreFocus });
    state.drawerTrigger = null;
  }

  function labelStatusText(label) {
    const entry = getProgressEntry(label);
    if (!entry || entry.attempts === 0) return I18n.t("study.notStudied");
    const streak = entry.streak > 1 ? ` · ${I18n.t("study.correctStreak", { count: entry.streak })}` : "";
    if (entry.reviewFlag) return I18n.t("study.masteryReview", { mastery: entry.mastery, streak });
    return I18n.t(entry.attempts === 1 ? "study.masteryAttempts.one" : "study.masteryAttempts.many", { mastery: entry.mastery, attempts: entry.attempts, streak });
  }

  function renderStudyWorkspace() {
    const labels = studyPool();
    const current = currentStudyLabel();
    elements.studyViewName.textContent = state.activeViewData?.title || I18n.t("common.anatomicalView");
    elements.studyViewCount.textContent = I18n.t(labels.length === 1 ? "study.structureCount.one" : "study.structureCount.many", { count: labels.length });

    if (!current) {
      elements.studyCurrentCounter.textContent = I18n.t("study.noStructuresAvailable");
      elements.studyCurrentPrompt.textContent = state.labels.length ? I18n.t("study.noFilterMatches") : I18n.t("study.noLabelsYet");
      elements.studyCurrentDescription.textContent = state.labels.length
        ? I18n.t("study.adjustFilters")
        : I18n.t("study.addPublishedLabels");
      elements.studyCurrentStatus.textContent = I18n.t("study.unavailable");
      [elements.revealStudyStructure, elements.markStudyReview, elements.previousStudyStructure, elements.nextStudyStructure].forEach((button) => {
        button.disabled = true;
      });
      elements.studyStructureList.replaceChildren();
      return;
    }

    [elements.revealStudyStructure, elements.markStudyReview, elements.previousStudyStructure, elements.nextStudyStructure].forEach((button) => {
      button.disabled = false;
    });

    const isRevealed = state.revealed.has(current.id);
    const entry = getProgressEntry(current);
    elements.studyCurrentCounter.textContent = I18n.t("study.structureCounter", { current: state.studyIndex + 1, total: labels.length });
    elements.studyCurrentPrompt.textContent = isRevealed ? current.name : I18n.t("study.recallStructure");
    elements.studyCurrentDescription.textContent = isRevealed
      ? (current.description || I18n.t("atlas.noDescription"))
      : I18n.t("study.locateMentally");
    elements.studyCurrentStatus.textContent = labelStatusText(current);
    elements.revealStudyStructure.textContent = isRevealed ? I18n.t("study.hideStructure") : I18n.t("study.revealStructure");
    elements.markStudyReview.setAttribute("aria-pressed", String(Boolean(entry?.reviewFlag)));
    elements.markStudyReview.classList.toggle("active", Boolean(entry?.reviewFlag));
    elements.markStudyReview.textContent = entry?.reviewFlag ? I18n.t("study.removeReview") : I18n.t("study.markReview");

    elements.studyStructureList.replaceChildren();
    labels
      .map((label, index) => ({ label, index }))
      .forEach(({ label, index }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "study-structure-item";
        button.classList.toggle("active", index === state.studyIndex);
        button.setAttribute("aria-current", index === state.studyIndex ? "true" : "false");

        const number = document.createElement("span");
        number.className = "study-structure-number";
        number.textContent = String(index + 1);
        const copy = document.createElement("span");
        copy.className = "study-structure-copy";
        const name = document.createElement("strong");
        name.textContent = state.revealed.has(label.id) ? label.name : I18n.t("study.hiddenStructure");
        const status = document.createElement("small");
        status.textContent = labelStatusText(label);
        copy.append(name, status);
        const mastery = document.createElement("span");
        mastery.className = "study-item-mastery";
        mastery.textContent = `${getProgressEntry(label)?.mastery || 0}%`;
        button.append(number, copy, mastery);
        button.addEventListener("click", () => {
          state.studyIndex = index;
          state.highlightLabelId = state.revealed.has(label.id) ? label.id : null;
          renderStudyWorkspace();
          Atlas.refreshLabels?.();
          Atlas.focusPosition?.(label.position, 2);
        });
        elements.studyStructureList.appendChild(button);
      });

    updateProgressUi();
  }

  function moveStudyIndex(offset) {
    const labels = studyPool();
    if (!labels.length) return;
    state.studyIndex = (state.studyIndex + offset + labels.length) % labels.length;
    const label = currentStudyLabel();
    state.highlightLabelId = state.revealed.has(label.id) ? label.id : null;
    renderStudyWorkspace();
    Atlas.refreshLabels?.();
    Atlas.focusPosition?.(label.position, 2);
  }

  function toggleCurrentStudyReveal() {
    const label = currentStudyLabel();
    if (!label) return;
    if (state.revealed.has(label.id)) {
      state.revealed.delete(label.id);
      state.highlightLabelId = null;
    } else {
      state.revealed.add(label.id);
      state.highlightLabelId = label.id;
      Atlas.focusPosition?.(label.position, 2);
    }
    renderStudyWorkspace();
    Atlas.refreshLabels?.();
  }

  function toggleReviewFlag(label = currentStudyLabel()) {
    if (!label) return;
    const entry = getProgressEntry(label, true);
    entry.reviewFlag = !entry.reviewFlag;
    saveProgress(entry.reviewFlag ? `${label.name} marked for review.` : `${label.name} removed from review.`);
    renderStudyWorkspace();
  }

  function viewMastery() {
    if (!state.labels.length) return 0;
    const total = state.labels.reduce((sum, label) => sum + (getProgressEntry(label)?.mastery || 0), 0);
    return Math.round(total / state.labels.length);
  }

  function updateProgressUi() {
    const mastery = viewMastery();
    elements.studyMasteryValue.textContent = `${mastery}%`;
    elements.studyMasteryBar.style.width = `${mastery}%`;
    elements.studyMasteryTrack.setAttribute("aria-valuenow", String(mastery));
    elements.studyProgressBadge.textContent = `${mastery}%`;

    const entries = Object.values(state.progress.structures);
    const customEntries = Object.values(state.progress.customQuestions || {});
    const studied = entries.filter((entry) => entry.attempts > 0).length;
    const answered = entries.reduce((sum, entry) => sum + entry.attempts, 0) + customEntries.reduce((sum, entry) => sum + (Number(entry.attempts) || 0), 0);
    const correct = entries.reduce((sum, entry) => sum + entry.correct, 0) + customEntries.reduce((sum, entry) => sum + (Number(entry.correct) || 0), 0);
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    elements.progressStructuresStudied.textContent = String(studied);
    elements.progressQuestionsAnswered.textContent = String(answered);
    elements.progressOverallAccuracy.textContent = `${accuracy}%`;
    renderProgressDrawer();
  }

  function uniqueValues(values) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
  }

  function populateSelectOptions(select, values, allLabel = "All categories") {
    if (!select) return;
    const current = select.value || "all";
    select.replaceChildren();
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = allLabel;
    select.appendChild(all);
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = localizeToken("category", value);
      select.appendChild(option);
    });
    select.value = Array.from(select.options).some((option) => option.value === current) ? current : "all";
  }

  function refreshFilterOptions() {
    const studyCategories = uniqueValues(state.labels.map((label) => label.category || "uncategorized"));
    const quizCategories = uniqueValues([
      ...studyCategories,
      ...state.customQuestions.map((question) => question.category || "knowledge")
    ]);
    populateSelectOptions(elements.studyCategoryFilter, studyCategories, I18n.t("study.allCategories"));
    populateSelectOptions(elements.quizCategoryFilter, quizCategories, I18n.t("study.allCategories"));
  }

  function questionBankPathForActiveCollection() {
    const manifestPath = Atlas.getActiveManifestPath?.();
    if (!manifestPath) return null;
    const file = String(manifestPath).split("/").pop()?.replace(/\.json$/i, "");
    return file ? `data/questions/${file}.json` : null;
  }

  function normalizeCustomQuestion(raw) {
    if (!raw || typeof raw !== "object") return null;
    const prompt = String(I18n.localize(raw, "prompt") || raw.prompt || "").trim();
    const localizedOptions = I18n.localizeArray(raw, "options");
    const options = (localizedOptions.length ? localizedOptions : raw.options || []).map((item) => String(item || "").trim()).filter(Boolean);
    const correctIndex = Number(raw.correctIndex);
    if (!raw.id || !prompt || options.length < 2 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) return null;
    return {
      id: String(raw.id),
      prompt,
      options,
      correctIndex,
      explanation: String(I18n.localize(raw, "explanation") || raw.explanation || ""),
      difficulty: ["beginner", "intermediate", "advanced"].includes(raw.difficulty) ? raw.difficulty : "intermediate",
      category: String(raw.category || "knowledge"),
      status: String(raw.status || "published"),
      viewIds: Array.isArray(raw.viewIds) ? raw.viewIds.map(String) : [],
      labelId: raw.labelId ? String(raw.labelId) : null
    };
  }

  async function loadQuestionBank() {
    const path = questionBankPathForActiveCollection();
    state.questionBankPath = path;
    state.customQuestions = [];
    if (!path) { refreshFilterOptions(); return; }
    try {
      const version = window.MORPHORA_CONFIG?.assetVersion || window.MORPHORA_CONFIG?.version || "4.9.8";
      const response = await fetch(`${path}?v=${encodeURIComponent(version)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) { refreshFilterOptions(); return; }
      const data = await response.json();
      if (state.questionBankPath !== path) return;
      state.customQuestions = (Array.isArray(data.questions) ? data.questions : [])
        .map(normalizeCustomQuestion)
        .filter((question) => question && !["draft", "review", "unpublished"].includes(question.status.toLowerCase()));
    } catch (error) {
      console.warn("MORPHORA could not load the optional question bank.", error);
      state.customQuestions = [];
    }
    refreshFilterOptions();
    updateQuizEligibility();
  }

  function eligibleCustomQuestions({ difficulty = "all", category = "all" } = {}) {
    return state.customQuestions.filter((question) => {
      if (question.viewIds.length && !question.viewIds.includes(state.activeViewId)) return false;
      if (difficulty !== "all" && question.difficulty !== difficulty) return false;
      if (category !== "all" && question.category !== category) return false;
      return true;
    });
  }

  function currentQuizFilters() {
    return {
      difficulty: elements.quizDifficultyFilter.value || "all",
      category: elements.quizCategoryFilter.value || "all",
      progressFilter: elements.quizProgressFilter.value || "all",
      reviewOnly: elements.quizIncludeReviewOnly.checked
    };
  }

  function currentQuizPool(type = null) {
    const selectedType = type || new FormData(elements.quizSetupForm).get("quizType") || "locate";
    const filters = currentQuizFilters();
    return selectedType === "custom"
      ? eligibleCustomQuestions(filters)
      : eligibleLabels(filters);
  }

  function updateQuizEligibility() {
    if (!state.activeViewData) return;
    const selectedType = new FormData(elements.quizSetupForm).get("quizType") || "locate";
    const customRadio = elements.quizSetupForm.querySelector('input[value="custom"]');
    const choiceRadio = elements.quizSetupForm.querySelector('input[value="choice"]');
    const customAvailable = eligibleCustomQuestions().length > 0;
    customRadio.disabled = !customAvailable;
    customRadio.closest("label")?.classList.toggle("is-disabled", !customAvailable);
    choiceRadio.disabled = eligibleLabels().length < 2;
    choiceRadio.closest("label")?.classList.toggle("is-disabled", choiceRadio.disabled);
    if ((selectedType === "custom" && !customAvailable) || (selectedType === "choice" && choiceRadio.disabled)) {
      elements.quizSetupForm.querySelector('input[value="locate"]').checked = true;
    }
    const effectiveType = new FormData(elements.quizSetupForm).get("quizType") || "locate";
    const pool = currentQuizPool(effectiveType);
    if (pool.length) {
      const kind = effectiveType === "custom" ? "Custom" : "Structure";
      const cardinality = pool.length === 1 ? "one" : "many";
      elements.quizEligibilityNote.textContent = I18n.t(`quiz.eligible${kind}.${cardinality}`, { count: pool.length });
    } else {
      elements.quizEligibilityNote.textContent = I18n.t(effectiveType === "custom" ? "quiz.noAuthored" : "quiz.noStructures");
    }
    elements.beginQuizButton.disabled = pool.length === 0;
    const structureOnly = effectiveType !== "custom";
    elements.quizProgressFilter.disabled = !structureOnly;
    elements.quizIncludeReviewOnly.disabled = !structureOnly;
  }

  function persistQuizSession() {
    const quiz = state.quiz;
    if (!quiz || !Storage?.writeJSON) return;
    const questionIds = quiz.questions.map((item) => item.id);
    Storage.writeJSON(ACTIVE_QUIZ_KEY, {
      version: 1,
      id: quiz.id,
      savedAt: new Date().toISOString(),
      viewId: quiz.viewId,
      viewTitle: quiz.viewTitle,
      type: quiz.type,
      showDescriptions: quiz.showDescriptions,
      questionIds,
      index: quiz.index,
      correct: quiz.correct,
      responses: quiz.responses,
      mistakeIds: quiz.mistakes.map((item) => item.id),
      startedAt: quiz.startedAt
    });
  }

  function clearPersistedQuizSession() {
    Storage?.remove?.(ACTIVE_QUIZ_KEY);
    state.recoverableSession = null;
  }

  function readRecoverableQuizSession() {
    const saved = Storage?.readJSON?.(ACTIVE_QUIZ_KEY, { fallback: null }) || null;
    if (!saved || saved.viewId !== state.activeViewId || !saved.type || !Array.isArray(saved.questionIds)) return null;
    if ((saved.responses?.length || 0) >= saved.questionIds.length) {
      Storage?.remove?.(ACTIVE_QUIZ_KEY);
      return null;
    }
    return saved;
  }

  function updateResumeCard() {
    state.recoverableSession = readRecoverableQuizSession();
    elements.quizResumeCard.hidden = !state.recoverableSession;
    if (!state.recoverableSession) return;
    const saved = state.recoverableSession;
    const answered = Array.isArray(saved.responses) ? saved.responses.length : 0;
    elements.quizResumeSummary.textContent = I18n.t("quiz.resumeSummary", { type: quizTypeName(saved.type), answered, total: saved.questionIds.length });
  }

  async function restoreQuizSession() {
    const saved = state.recoverableSession || readRecoverableQuizSession();
    if (!saved) return;
    if (saved.type === "custom") await loadQuestionBank();
    const source = saved.type === "custom" ? eligibleCustomQuestions() : eligibleLabels();
    const byId = new Map(source.map((item) => [item.id, item]));
    const questions = saved.questionIds.map((id) => byId.get(id)).filter(Boolean);
    if (!questions.length) { clearPersistedQuizSession(); updateResumeCard(); return; }
    startQuiz({
      type: saved.type,
      count: "all",
      showDescriptions: saved.showDescriptions !== false,
      explicitQuestions: questions,
      resumeState: saved
    });
  }

  function openQuizSetup(trigger = document.activeElement, { reviewOnly = false } = {}) {
    if (!state.activeViewData) {
      A11y.announce("Open an anatomical view before starting a quiz.");
      return;
    }
    state.quizSetupTrigger = trigger instanceof HTMLElement ? trigger : null;
    elements.quizIncludeReviewOnly.checked = reviewOnly;
    if (reviewOnly) elements.quizProgressFilter.value = "review";
    elements.quizSetupViewName.textContent = state.activeViewData.title;
    refreshFilterOptions();
    updateResumeCard();
    updateQuizEligibility();

    elements.quizSetupBackdrop.hidden = false;
    elements.quizSetupDialog.hidden = false;
    elements.quizSetupDialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("quiz-dialog-open");
    A11y.activateFocusTrap(elements.quizSetupDialog, {
      initialFocus: state.recoverableSession ? elements.resumeQuizSession : elements.quizSetupForm.querySelector('input[name="quizType"]:not(:disabled)'),
      returnFocus: state.quizSetupTrigger,
      onEscape: () => closeQuizSetup({ restoreFocus: true })
    });
  }

  function closeQuizSetup({ restoreFocus = true } = {}) {
    if (elements.quizSetupDialog.hidden) return;
    elements.quizSetupDialog.hidden = true;
    elements.quizSetupBackdrop.hidden = true;
    elements.quizSetupDialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("quiz-dialog-open");
    A11y.releaseFocusTrap(elements.quizSetupDialog, { restoreFocus });
    state.quizSetupTrigger = null;
    if (state.mode !== "quiz") setModeButtons(state.mode);
  }

  function acceptedRadius(label) {
    const explicit = Number(label.acceptedRadius);
    if (Number.isFinite(explicit)) return explicit;
    if (label.difficulty === "advanced") return 0.032;
    if (label.difficulty === "beginner") return 0.06;
    return DEFAULT_ACCEPTED_RADIUS;
  }

  function startQuiz({ type, count, reviewOnly = false, showDescriptions = true, explicitLabels = null, explicitQuestions = null, resumeState = null, filters = null }) {
    const activeFilters = filters || currentQuizFilters();
    const basePool = explicitQuestions || explicitLabels || (type === "custom"
      ? eligibleCustomQuestions(activeFilters)
      : eligibleLabels({ ...activeFilters, reviewOnly: reviewOnly || activeFilters.reviewOnly }));
    if (!basePool.length) {
      A11y.announce("No eligible questions are available for this quiz.", { assertive: true });
      return;
    }
    window.MorphoraDrawing?.prepareForQuiz?.();

    const requestedCount = count === "all" ? basePool.length : Math.max(1, Number(count) || 5);
    const questions = explicitQuestions || explicitLabels
      ? [...basePool]
      : shuffle(basePool).slice(0, Math.min(requestedCount, basePool.length));
    if (state.mode !== "study") {
      state.previousExploreLabelsVisible = Atlas.getLabelsVisible?.() ?? true;
    }
    state.mode = "quiz";
    state.revealed.clear();
    state.highlightLabelId = null;
    state.highlightStyle = "anchor";
    const savedResponses = Array.isArray(resumeState?.responses) ? resumeState.responses : [];
    const savedIndex = Math.max(0, Number(resumeState?.index) || 0);
    const inferredIndex = resumeState && savedResponses.length > savedIndex ? savedResponses.length : savedIndex;
    const resumeIndex = resumeState ? Math.min(inferredIndex, Math.max(0, questions.length - 1)) : 0;
    state.quiz = {
      id: resumeState?.id || `session-${Date.now()}`,
      viewId: state.activeViewId,
      viewTitle: state.activeViewData.title,
      type,
      showDescriptions,
      filters: activeFilters,
      questions,
      index: resumeIndex,
      correct: Number(resumeState?.correct) || 0,
      responses: savedResponses,
      mistakes: Array.isArray(resumeState?.mistakeIds) ? resumeState.mistakeIds.map((id) => questions.find((item) => item.id === id)).filter(Boolean) : [],
      startedAt: Number(resumeState?.startedAt) || Date.now(),
      questionStartedAt: Date.now(),
      answered: false,
      flashcardRevealed: false
    };

    closeQuizSetup({ restoreFocus: false });
    closeStudyDrawer({ restoreFocus: false });
    closeProgressDrawer({ restoreFocus: false });
    Atlas.setLearningActive?.(true);
    Atlas.setLabelsVisible?.(false, { announce: false });
    setModeButtons("quiz");
    elements.quizHud.hidden = false;
    document.body.classList.add("quiz-session-active");
    startQuizTimer();
    persistQuizSession();
    renderQuizQuestion();
    A11y.announce(`${quizTypeName(type)} ${resumeState ? "resumed" : "started"} with ${questions.length} questions.`);
  }

  function quizTypeName(type) {
    if (type === "choice") return "Multiple-choice quiz";
    if (type === "flashcard") return "Flashcard session";
    if (type === "custom") return "Knowledge quiz";
    return "Locate quiz";
  }

  function startQuizTimer() {
    window.clearInterval(state.timerId);
    state.timerId = window.setInterval(() => {
      if (!state.quiz) return;
      elements.quizTimerLabel.textContent = formatDuration(Date.now() - state.quiz.startedAt);
    }, 1000);
  }

  function currentQuizLabel() {
    return state.quiz?.questions[state.quiz.index] || null;
  }

  function resetQuizQuestionUi() {
    elements.quizAnswerOptions.replaceChildren();
    elements.quizFeedback.hidden = true;
    elements.quizFeedback.dataset.type = "";
    elements.flashcardAnswer.hidden = true;
    elements.revealFlashcardAnswer.hidden = true;
    elements.flashcardRatingActions.hidden = true;
    elements.nextQuizQuestion.hidden = true;
    state.highlightLabelId = null;
    state.highlightStyle = "anchor";
  }

  function renderQuizQuestion() {
    const quiz = state.quiz;
    const item = currentQuizLabel();
    if (!quiz || !item) {
      finishQuiz();
      return;
    }

    resetQuizQuestionUi();
    quiz.answered = false;
    quiz.flashcardRevealed = false;
    quiz.questionStartedAt = Date.now();
    const currentNumber = quiz.index + 1;
    const progress = Math.round((quiz.index / quiz.questions.length) * 100);
    elements.quizTypeLabel.textContent = quizTypeName(quiz.type);
    elements.quizProgressLabel.textContent = `${currentNumber} / ${quiz.questions.length}`;
    elements.quizProgressBar.style.width = `${progress}%`;
    elements.quizProgressTrack.setAttribute("aria-valuenow", String(progress));

    if (quiz.type === "custom") {
      elements.quizPromptTitle.textContent = item.prompt;
      elements.quizPromptText.textContent = `${localizeToken("category", item.category)} · ${localizeToken("difficulty", item.difficulty)}`;
      elements.quizHud.dataset.quizType = "custom";
      renderCustomAnswers(item);
      const related = item.labelId ? state.labels.find((label) => label.id === item.labelId) : null;
      if (related) {
        state.highlightLabelId = related.id;
        state.highlightStyle = "anchor";
        Atlas.focusPosition?.(related.position, 2);
      }
    } else if (quiz.type === "locate") {
      elements.quizPromptTitle.textContent = I18n.t("quiz.locateTitle", { name: item.name });
      elements.quizPromptText.textContent = I18n.t("quiz.locateInstruction");
      elements.quizHud.dataset.quizType = "locate";
    } else if (quiz.type === "choice") {
      state.highlightLabelId = item.id;
      state.highlightStyle = "anchor";
      elements.quizPromptTitle.textContent = I18n.t("quiz.choiceTitle");
      elements.quizPromptText.textContent = I18n.t("quiz.choiceInstruction");
      elements.quizHud.dataset.quizType = "choice";
      renderChoiceAnswers(item);
      Atlas.focusPosition?.(item.position, 2);
    } else {
      state.highlightLabelId = item.id;
      state.highlightStyle = "anchor";
      elements.quizPromptTitle.textContent = I18n.t("quiz.flashcardTitle");
      elements.quizPromptText.textContent = I18n.t("quiz.flashcardInstruction");
      elements.quizHud.dataset.quizType = "flashcard";
      elements.revealFlashcardAnswer.hidden = false;
      Atlas.focusPosition?.(item.position, 2);
    }

    persistQuizSession();
    Atlas.refreshLabels?.();
  }

  function distractorScore(candidate, correctLabel) {
    let score = 0;
    if (candidate.category === correctLabel.category) score += 8;
    if (candidate.difficulty === correctLabel.difficulty) score += 4;
    const candidateName = String(candidate.name || "").toLocaleLowerCase();
    const correctName = String(correctLabel.name || "").toLocaleLowerCase();
    if (candidateName.split(/\s+/).some((word) => word.length > 4 && correctName.includes(word))) score += 2;
    const progress = getProgressEntry(candidate);
    if (progress?.reviewFlag) score += 1;
    return score + Math.random();
  }

  function renderChoiceAnswers(correctLabel) {
    const seenNames = new Set([String(correctLabel.name || "").toLocaleLowerCase()]);
    const candidates = eligibleLabels().filter((label) => {
      if (label.id === correctLabel.id) return false;
      const name = String(label.name || "").toLocaleLowerCase();
      if (!name || seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    });
    const distractors = candidates
      .map((label) => ({ label, score: distractorScore(label, correctLabel) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.label);
    const options = shuffle([correctLabel, ...distractors]);
    options.forEach((label, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-answer-button";
      button.dataset.labelId = label.id;
      button.innerHTML = `<span>${String.fromCharCode(65 + index)}</span><strong></strong>`;
      button.querySelector("strong").textContent = label.name;
      button.addEventListener("click", () => answerChoice(label.id, button));
      elements.quizAnswerOptions.appendChild(button);
    });
  }

  function renderCustomAnswers(question) {
    question.options.forEach((optionText, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-answer-button";
      button.dataset.optionIndex = String(index);
      button.innerHTML = `<span>${String.fromCharCode(65 + index)}</span><strong></strong>`;
      button.querySelector("strong").textContent = optionText;
      button.addEventListener("click", () => answerCustomQuestion(index, button));
      elements.quizAnswerOptions.appendChild(button);
    });
  }

  function recordAttempt(label, { correct, rating = null, responseTime, distance = null }) {
    const entry = getProgressEntry(label, true);
    entry.attempts += 1;
    if (correct) entry.correct += 1;
    entry.incorrect = entry.attempts - entry.correct;
    entry.lastReviewedAt = new Date().toISOString();
    entry.lastRating = rating;
    entry.history = Array.isArray(entry.history) ? entry.history : [];
    entry.history.push({ correct: Boolean(correct), rating, at: entry.lastReviewedAt });
    entry.history = entry.history.slice(-MAX_MASTERY_HISTORY);
    entry.mastery = calculateMastery(entry);
    entry.streak = calculateStreak(entry.history);
    if (!correct || rating === "again" || rating === "difficult") entry.reviewFlag = true;
    if ((rating === "easy" || entry.streak >= 3) && entry.mastery >= STRONG_MASTERY_THRESHOLD) entry.reviewFlag = false;

    state.quiz.responses.push({
      labelId: label.id,
      name: label.name,
      correct,
      rating,
      responseTime,
      distance
    });
    if (correct) state.quiz.correct += 1;
    else if (!state.quiz.mistakes.some((item) => item.id === label.id)) state.quiz.mistakes.push(label);
    saveProgress("");
    persistQuizSession();
  }

  function recordCustomAttempt(question, { correct, responseTime }) {
    const collectionKey = String(state.questionBankPath || "collection").split("/").pop()?.replace(/\.json$/i, "") || "collection";
    const key = `${collectionKey}::${question.id}`;
    const current = state.progress.customQuestions[key] || { attempts: 0, correct: 0, mastery: 0, lastReviewedAt: null };
    current.attempts += 1;
    if (correct) current.correct += 1;
    current.mastery = Math.round((current.correct / current.attempts) * 100);
    current.lastReviewedAt = new Date().toISOString();
    current.prompt = question.prompt;
    current.questionId = question.id;
    state.progress.customQuestions[key] = current;
    state.quiz.responses.push({ questionId: question.id, name: question.prompt, correct, responseTime });
    if (correct) state.quiz.correct += 1;
    else if (!state.quiz.mistakes.some((item) => item.id === question.id)) state.quiz.mistakes.push(question);
    saveProgress("");
    persistQuizSession();
  }

  function showQuizFeedback({ correct, title, text, label }) {
    state.quiz.answered = true;
    state.highlightLabelId = label.id;
    state.highlightStyle = "full";
    elements.quizFeedback.hidden = false;
    elements.quizFeedback.dataset.type = correct ? "correct" : "incorrect";
    elements.quizFeedbackTitle.textContent = title;
    elements.quizFeedbackText.textContent = text;
    elements.nextQuizQuestion.hidden = false;
    Atlas.refreshLabels?.();
    Atlas.focusPosition?.(label.position, 2);
    A11y.announce(`${title}. ${text}`);
  }

  function handleCanvasQuizClick(event) {
    const quiz = state.quiz;
    if (!quiz || quiz.type !== "locate" || quiz.answered) return;
    const viewer = Atlas.getViewer?.();
    const label = currentQuizLabel();
    if (!viewer?.viewport || !label) return;

    const target = event.originalEvent?.target;
    if (target instanceof Element && target.closest(".user-annotation, .quiz-hud, .menu, .mobile-atlas-toolbar")) return;

    event.preventDefaultAction = true;
    const point = viewer.viewport.pointFromPixel(event.position);
    const dx = point.x - label.position.x;
    const dy = point.y - label.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = acceptedRadius(label);
    const correct = distance <= radius;
    const near = !correct && distance <= radius * 2;
    const responseTime = Date.now() - quiz.questionStartedAt;
    recordAttempt(label, { correct, responseTime, distance });

    const description = quiz.showDescriptions && label.description ? ` ${label.description}` : "";
    showQuizFeedback({
      correct,
      title: correct ? I18n.t("quiz.correct") : near ? I18n.t("quiz.close") : I18n.t("quiz.notQuite"),
      text: correct
        ? `You located ${label.name}.${description}`
        : near
          ? `Your answer was close. The highlighted point shows ${label.name}.${description}`
          : `The highlighted point shows ${label.name}.${description}`,
      label
    });
  }

  function answerChoice(selectedId, button) {
    const quiz = state.quiz;
    const label = currentQuizLabel();
    if (!quiz || quiz.answered || !label) return;
    const correct = selectedId === label.id;
    const responseTime = Date.now() - quiz.questionStartedAt;
    recordAttempt(label, { correct, responseTime });

    elements.quizAnswerOptions.querySelectorAll("button").forEach((option) => {
      option.disabled = true;
      option.classList.toggle("is-correct", option.dataset.labelId === label.id);
      option.classList.toggle("is-incorrect", option === button && !correct);
    });

    const description = quiz.showDescriptions && label.description ? ` ${label.description}` : "";
    showQuizFeedback({
      correct,
      title: correct ? I18n.t("quiz.correct") : I18n.t("quiz.incorrect"),
      text: `${label.name} is the highlighted structure.${description}`,
      label
    });
  }

  function answerCustomQuestion(selectedIndex, button) {
    const quiz = state.quiz;
    const question = currentQuizLabel();
    if (!quiz || quiz.type !== "custom" || quiz.answered || !question) return;
    const correct = selectedIndex === question.correctIndex;
    const responseTime = Date.now() - quiz.questionStartedAt;
    recordCustomAttempt(question, { correct, responseTime });
    quiz.answered = true;
    elements.quizAnswerOptions.querySelectorAll("button").forEach((option) => {
      const optionIndex = Number(option.dataset.optionIndex);
      option.disabled = true;
      option.classList.toggle("is-correct", optionIndex === question.correctIndex);
      option.classList.toggle("is-incorrect", option === button && !correct);
    });
    elements.quizFeedback.hidden = false;
    elements.quizFeedback.dataset.type = correct ? "correct" : "incorrect";
    elements.quizFeedbackTitle.textContent = correct ? I18n.t("quiz.correct") : I18n.t("quiz.incorrect");
    elements.quizFeedbackText.textContent = question.explanation || I18n.t("quiz.correctAnswer", { answer: question.options[question.correctIndex] });
    elements.nextQuizQuestion.hidden = false;
    const related = question.labelId ? state.labels.find((label) => label.id === question.labelId) : null;
    if (related) {
      state.highlightLabelId = related.id;
      state.highlightStyle = "full";
      Atlas.focusPosition?.(related.position, 2);
      Atlas.refreshLabels?.();
    }
    persistQuizSession();
    A11y.announce(`${elements.quizFeedbackTitle.textContent}. ${elements.quizFeedbackText.textContent}`);
  }

  function revealFlashcard() {
    const quiz = state.quiz;
    const label = currentQuizLabel();
    if (!quiz || quiz.type !== "flashcard" || !label) return;
    quiz.flashcardRevealed = true;
    state.highlightStyle = "full";
    elements.flashcardAnswer.hidden = false;
    elements.flashcardAnswerName.textContent = label.name;
    elements.flashcardAnswerDescription.textContent = quiz.showDescriptions
      ? (label.description || I18n.t("quiz.noDescription"))
      : I18n.t("quiz.rateRecall");
    elements.revealFlashcardAnswer.hidden = true;
    elements.flashcardRatingActions.hidden = false;
    Atlas.refreshLabels?.();
    A11y.announce(I18n.t("quiz.answer", { name: label.name }));
  }

  function rateFlashcard(rating) {
    const quiz = state.quiz;
    const label = currentQuizLabel();
    if (!quiz || quiz.answered || !label || !quiz.flashcardRevealed) return;
    const correct = rating === "good" || rating === "easy";
    const responseTime = Date.now() - quiz.questionStartedAt;
    recordAttempt(label, { correct, rating, responseTime });
    quiz.answered = true;
    elements.flashcardRatingActions.hidden = true;
    elements.nextQuizQuestion.hidden = false;
    elements.quizFeedback.hidden = false;
    elements.quizFeedback.dataset.type = correct ? "correct" : "review";
    elements.quizFeedbackTitle.textContent = correct ? I18n.t("quiz.recallRecorded") : I18n.t("quiz.addedReview");
    elements.quizFeedbackText.textContent = rating === "easy"
      ? "Excellent recall."
      : rating === "good"
        ? "Good recall."
        : rating === "difficult"
          ? "This structure will remain marked for review."
          : "This structure was added to your review list.";
    A11y.announce(elements.quizFeedbackText.textContent);
  }

  function advanceQuiz() {
    if (!state.quiz) return;
    if (!state.quiz.answered) return;
    state.quiz.index += 1;
    persistQuizSession();
    if (state.quiz.index >= state.quiz.questions.length) finishQuiz();
    else renderQuizQuestion();
  }

  function finishQuiz() {
    const quiz = state.quiz;
    if (!quiz) return;
    window.clearInterval(state.timerId);
    state.timerId = null;
    const duration = Date.now() - quiz.startedAt;
    const answered = quiz.responses.length;
    const accuracy = answered ? Math.round((quiz.correct / answered) * 100) : 0;
    const result = {
      id: quiz.id,
      viewId: quiz.viewId,
      viewTitle: quiz.viewTitle,
      type: quiz.type,
      startedAt: new Date(quiz.startedAt).toISOString(),
      completedAt: new Date().toISOString(),
      duration,
      answered,
      correct: quiz.correct,
      accuracy,
      averageResponseTime: answered
        ? Math.round(quiz.responses.reduce((sum, item) => sum + item.responseTime, 0) / answered)
        : 0,
      mistakes: quiz.mistakes.map((item) => ({ id: item.id, name: item.name || item.prompt || "Question" })),
      mistakeItems: [...quiz.mistakes],
      mistakeLabels: quiz.type === "custom" ? [] : [...quiz.mistakes]
    };
    state.progress.sessions.unshift({
      id: result.id,
      viewId: result.viewId,
      viewTitle: result.viewTitle,
      type: result.type,
      completedAt: result.completedAt,
      answered: result.answered,
      correct: result.correct,
      accuracy: result.accuracy,
      duration: result.duration
    });
    state.progress.sessions = state.progress.sessions.slice(0, MAX_RECENT_SESSIONS);
    state.lastQuizResult = result;
    saveProgress("");
    clearPersistedQuizSession();
    endQuiz({ showResults: true, announce: false });
  }

  function endQuiz({ showResults = false, announce = true } = {}) {
    const hadQuiz = Boolean(state.quiz);
    state.quiz = null;
    window.clearInterval(state.timerId);
    state.timerId = null;
    elements.quizHud.hidden = true;
    document.body.classList.remove("quiz-session-active");
    state.highlightLabelId = null;
    state.highlightStyle = "anchor";
    state.mode = "explore";
    setModeButtons("explore");
    Atlas.setLearningActive?.(false);
    Atlas.setLabelsVisible?.(state.previousExploreLabelsVisible, { announce: false });
    Atlas.refreshLabels?.();
    window.MorphoraDrawing?.restoreAfterQuiz?.();
    if (showResults && state.lastQuizResult) openQuizResults();
    else if (announce && hadQuiz) A11y.announce("Quiz session ended.");
  }

  function openQuizResults() {
    const result = state.lastQuizResult;
    if (!result) return;
    state.resultsTrigger = elements.quizHud;
    elements.quizScorePercent.textContent = `${result.accuracy}%`;
    elements.quizScoreFraction.textContent = `${result.correct} / ${result.answered}`;
    elements.quizAverageTime.textContent = result.averageResponseTime < 1000
      ? `${result.averageResponseTime}ms`
      : `${(result.averageResponseTime / 1000).toFixed(1)}s`;
    elements.quizMasteryChange.textContent = String(result.answered);
    elements.quizScoreRing.style.setProperty("--score", `${result.accuracy * 3.6}deg`);
    elements.quizMistakesList.replaceChildren();

    if (!result.mistakes.length) {
      const message = document.createElement("p");
      message.className = "quiz-perfect-message";
      message.textContent = I18n.t("quiz.noImmediateReview");
      elements.quizMistakesList.appendChild(message);
      elements.repeatMissedQuiz.disabled = true;
      elements.reviewQuizMistakes.disabled = true;
    } else {
      result.mistakes.forEach((item) => {
        const row = document.createElement("div");
        row.className = "quiz-mistake-row";
        row.textContent = item.name;
        elements.quizMistakesList.appendChild(row);
      });
      elements.repeatMissedQuiz.disabled = false;
      elements.reviewQuizMistakes.disabled = result.type === "custom";
    }

    if (!result.mistakes.length) {
      elements.quizRecommendationTitle.textContent = I18n.t("quiz.recommendAdvanceTitle");
      elements.quizRecommendationText.textContent = I18n.t("quiz.recommendAdvanceBody");
    } else if (result.accuracy < 60) {
      elements.quizRecommendationTitle.textContent = I18n.t("quiz.recommendRepeatTitle");
      elements.quizRecommendationText.textContent = I18n.t("quiz.recommendRepeatBody");
    } else {
      elements.quizRecommendationTitle.textContent = I18n.t("quiz.recommendReviewTitle");
      elements.quizRecommendationText.textContent = I18n.t("quiz.recommendReviewBody");
    }

    elements.quizResultsBackdrop.hidden = false;
    elements.quizResultsDialog.hidden = false;
    elements.quizResultsDialog.setAttribute("aria-hidden", "false");
    A11y.activateFocusTrap(elements.quizResultsDialog, {
      initialFocus: elements.finishQuizResults,
      returnFocus: elements.quizModeButton,
      onEscape: () => closeQuizResults({ restoreFocus: true })
    });
    A11y.announce(`Quiz complete. ${result.accuracy}% accuracy.`);
  }

  function closeQuizResults({ restoreFocus = true } = {}) {
    if (elements.quizResultsDialog.hidden) return;
    elements.quizResultsDialog.hidden = true;
    elements.quizResultsBackdrop.hidden = true;
    elements.quizResultsDialog.setAttribute("aria-hidden", "true");
    A11y.releaseFocusTrap(elements.quizResultsDialog, { restoreFocus });
    state.resultsTrigger = null;
  }

  function reviewMistakesInStudyMode() {
    const result = state.lastQuizResult;
    if (!result?.mistakeLabels?.length) return;
    closeQuizResults({ restoreFocus: false });
    state.mode = "study";
    setModeButtons("study");
    Atlas.setLearningActive?.(true);
    Atlas.setLabelsVisible?.(false, { announce: false });
    const firstId = result.mistakeLabels[0].id;
    const index = state.labels.findIndex((label) => label.id === firstId);
    state.studyIndex = Math.max(0, index);
    state.revealed.clear();
    state.highlightLabelId = null;
    openStudyDrawer(elements.quizModeButton);
    renderStudyWorkspace();
    Atlas.refreshLabels?.();
  }

  function repeatMissedQuiz() {
    const result = state.lastQuizResult;
    const missed = result?.mistakeItems || result?.mistakeLabels || [];
    if (!missed.length) return;
    closeQuizResults({ restoreFocus: false });
    startQuiz({
      type: result.type,
      count: "all",
      showDescriptions: true,
      explicitQuestions: result.type === "custom" ? missed : null,
      explicitLabels: result.type === "custom" ? null : missed
    });
  }

  function openProgressDrawer(trigger = document.activeElement) {
    state.progressTrigger = trigger instanceof HTMLElement ? trigger : null;
    renderProgressDrawer();
    elements.progressBackdrop.hidden = false;
    elements.progressDrawer.classList.add("open");
    elements.progressDrawer.setAttribute("aria-hidden", "false");
    A11y.setExpanded(elements.openProgressDashboard, true);
    A11y.activateFocusTrap(elements.progressDrawer, {
      initialFocus: elements.closeProgressDrawer,
      returnFocus: state.progressTrigger,
      onEscape: () => closeProgressDrawer({ restoreFocus: true })
    });
  }

  function closeProgressDrawer({ restoreFocus = true } = {}) {
    if (!elements.progressDrawer.classList.contains("open")) return;
    elements.progressDrawer.classList.remove("open");
    elements.progressDrawer.setAttribute("aria-hidden", "true");
    elements.progressBackdrop.hidden = true;
    A11y.setExpanded(elements.openProgressDashboard, false);
    A11y.releaseFocusTrap(elements.progressDrawer, { restoreFocus });
    state.progressTrigger = null;
  }

  function renderProgressDrawer() {
    elements.progressCurrentViewName.textContent = state.activeViewData?.title || I18n.t("study.noViewOpen");
    elements.progressCurrentViewList.replaceChildren();
    if (!state.labels.length) {
      const empty = document.createElement("p");
      empty.className = "drawer-empty-state";
      empty.textContent = I18n.t("study.progressOpenView");
      elements.progressCurrentViewList.appendChild(empty);
    } else {
      [...state.labels]
        .sort((a, b) => (getProgressEntry(a)?.mastery || 0) - (getProgressEntry(b)?.mastery || 0))
        .forEach((label) => {
          const entry = getProgressEntry(label);
          const row = document.createElement("article");
          row.className = "progress-structure-row";
          const heading = document.createElement("div");
          heading.className = "progress-structure-heading";
          const name = document.createElement("strong");
          name.textContent = label.name;
          const score = document.createElement("span");
          score.textContent = `${entry?.mastery || 0}%`;
          heading.append(name, score);
          const track = document.createElement("div");
          track.className = "mini-progress-track";
          const bar = document.createElement("span");
          bar.style.width = `${entry?.mastery || 0}%`;
          track.appendChild(bar);
          const meta = document.createElement("small");
          meta.textContent = entry?.attempts
            ? `${entry.correct}/${entry.attempts} correct${entry.reviewFlag ? " · Review" : ""}`
            : "Not studied";
          row.append(heading, track, meta);
          elements.progressCurrentViewList.appendChild(row);
        });
    }

    elements.progressRecentSessions.replaceChildren();
    if (!state.progress.sessions.length) {
      const empty = document.createElement("p");
      empty.className = "drawer-empty-state";
      empty.textContent = I18n.t("study.noRecentSessions");
      elements.progressRecentSessions.appendChild(empty);
    } else {
      state.progress.sessions.slice(0, 8).forEach((session) => {
        const row = document.createElement("article");
        row.className = "recent-session-row";
        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = session.viewTitle || I18n.t("common.anatomicalView");
        const meta = document.createElement("small");
        meta.textContent = `${quizTypeName(session.type)} · ${new Date(session.completedAt).toLocaleDateString()}`;
        copy.append(title, meta);
        const score = document.createElement("span");
        score.textContent = `${session.accuracy}%`;
        row.append(copy, score);
        elements.progressRecentSessions.appendChild(row);
      });
    }
  }

  function exportProgress() {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      product: "MORPHORA",
      progress: state.progress
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "morphora-learning-progress.json";
    anchor.click();
    URL.revokeObjectURL(url);
    A11y.announce("Learning progress exported.");
  }

  async function importProgress(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Storage?.extractBackupStore?.(parsed, "learningProgress") || parsed.progress || parsed;
      if (!incoming || typeof incoming !== "object" || !incoming.structures) {
        throw new Error("This file does not contain MORPHORA learning progress.");
      }
      const mode = window.confirm("Replace current learning progress with this backup? Select Cancel to merge it instead.")
        ? "replace"
        : "merge";
      if (mode === "replace") state.progress = createEmptyProgress();
      Object.entries(incoming.structures || {}).forEach(([key, value]) => {
        const normalized = normalizeProgressEntry(value, key);
        if (!normalized) return;
        if (mode === "merge" && state.progress.structures[key]) {
          const current = state.progress.structures[key];
          current.attempts += normalized.attempts;
          current.correct += normalized.correct;
          current.incorrect = current.attempts - current.correct;
          current.mastery = current.attempts ? Math.round((current.correct / current.attempts) * 100) : 0;
          current.reviewFlag = current.reviewFlag || normalized.reviewFlag;
          current.lastReviewedAt = [current.lastReviewedAt, normalized.lastReviewedAt].filter(Boolean).sort().at(-1) || null;
        } else {
          state.progress.structures[key] = normalized;
        }
      });
      Object.entries(incoming.customQuestions || {}).forEach(([key, value]) => {
        const current = state.progress.customQuestions[key];
        if (mode === "merge" && current) {
          current.attempts = (Number(current.attempts) || 0) + (Number(value.attempts) || 0);
          current.correct = (Number(current.correct) || 0) + (Number(value.correct) || 0);
          current.mastery = current.attempts ? Math.round((current.correct / current.attempts) * 100) : 0;
          current.lastReviewedAt = [current.lastReviewedAt, value.lastReviewedAt].filter(Boolean).sort().at(-1) || null;
        } else {
          state.progress.customQuestions[key] = { ...value };
        }
      });
      const sessions = Array.isArray(incoming.sessions) ? incoming.sessions : [];
      const byId = new Map(state.progress.sessions.map((session) => [session.id, session]));
      sessions.forEach((session) => byId.set(session.id || `imported-${Math.random()}`, session));
      state.progress.sessions = Array.from(byId.values())
        .sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")))
        .slice(0, MAX_RECENT_SESSIONS);
      saveProgress("Learning progress imported.");
      renderStudyWorkspace();
    } catch (error) {
      console.error("MORPHORA could not import learning progress.", error);
      A11y.announce(error.message || "Learning progress could not be imported.", { assertive: true });
    } finally {
      elements.learningProgressImportInput.value = "";
    }
  }

  function clearProgress() {
    if (!window.confirm("Delete all locally saved MORPHORA learning progress? This cannot be undone unless you exported a backup.")) return;
    state.progress = createEmptyProgress();
    Storage?.removeStore?.("learningProgress");
    state.revealed.clear();
    updateProgressUi();
    renderStudyWorkspace();
    A11y.announce("Learning progress cleared.");
  }

  function syncActiveView() {
    state.activeViewId = Atlas.getActiveViewId?.() || null;
    state.activeViewData = Atlas.getActiveViewData?.() || null;
    const availableLabels = Array.isArray(state.activeViewData?.labels)
      ? state.activeViewData.labels
      : [];
    state.labels = availableLabels.filter(
      (label) => label?.quizEligible !== false && isPublishedLabel(label)
    );
    state.studyIndex = 0;
    state.revealed.clear();
    state.highlightLabelId = null;
    state.studySearch = "";
    state.studyDifficulty = "all";
    state.studyCategory = "all";
    elements.studySearchInput.value = "";
    elements.studyDifficultyFilter.value = "all";
    elements.studyCategoryFilter.value = "all";
    if (state.quiz) endQuiz({ showResults: false, announce: false });
    loadQuestionBank();
    updateResumeCard();
    if (state.mode === "study") {
      Atlas.setLearningActive?.(true);
      Atlas.setLabelsVisible?.(false, { announce: false });
    }
    renderStudyWorkspace();
    updateProgressUi();
    Atlas.refreshLabels?.();
  }

  elements.exploreModeButton.addEventListener("click", () => setMode("explore"));
  elements.studyModeButton.addEventListener("click", () => setMode("study"));
  elements.quizModeButton.addEventListener("click", () => setMode("quiz"));
  elements.openStudyWorkspace.addEventListener("click", () => {
    if (state.mode !== "study") setMode("study", { openPanel: false });
    openStudyDrawer(elements.openStudyWorkspace);
  });
  elements.mobileStudyButton.addEventListener("click", () => {
    if (state.mode !== "study") setMode("study", { openPanel: false });
    openStudyDrawer(elements.mobileStudyButton);
  });
  elements.openProgressDashboard.addEventListener("click", () => openProgressDrawer(elements.openProgressDashboard));
  elements.closeStudyDrawer.addEventListener("click", () => closeStudyDrawer({ restoreFocus: true }));
  elements.studyBackdrop.addEventListener("click", () => closeStudyDrawer({ restoreFocus: true }));
  elements.closeProgressDrawer.addEventListener("click", () => closeProgressDrawer({ restoreFocus: true }));
  elements.progressBackdrop.addEventListener("click", () => closeProgressDrawer({ restoreFocus: true }));
  elements.revealStudyStructure.addEventListener("click", toggleCurrentStudyReveal);
  elements.markStudyReview.addEventListener("click", () => toggleReviewFlag());
  elements.previousStudyStructure.addEventListener("click", () => moveStudyIndex(-1));
  elements.nextStudyStructure.addEventListener("click", () => moveStudyIndex(1));
  elements.revealAllStudyStructures.addEventListener("click", () => {
    studyPool().forEach((label) => state.revealed.add(label.id));
    state.highlightLabelId = currentStudyLabel()?.id || null;
    renderStudyWorkspace();
    Atlas.refreshLabels?.();
    A11y.announce("All structures revealed.");
  });
  elements.hideAllStudyStructures.addEventListener("click", () => {
    state.revealed.clear();
    state.highlightLabelId = null;
    renderStudyWorkspace();
    Atlas.refreshLabels?.();
    A11y.announce("All structures hidden.");
  });
  elements.startQuickQuiz.addEventListener("click", () => startQuiz({ type: "locate", count: 5, showDescriptions: true }));
  elements.studySearchInput.addEventListener("input", (event) => {
    state.studySearch = event.target.value;
    state.studyIndex = 0;
    renderStudyWorkspace();
  });
  elements.studyDifficultyFilter.addEventListener("change", () => {
    state.studyDifficulty = elements.studyDifficultyFilter.value;
    state.studyIndex = 0;
    renderStudyWorkspace();
  });
  elements.studyCategoryFilter.addEventListener("change", () => {
    state.studyCategory = elements.studyCategoryFilter.value;
    state.studyIndex = 0;
    renderStudyWorkspace();
  });

  elements.closeQuizSetup.addEventListener("click", () => closeQuizSetup({ restoreFocus: true }));
  elements.cancelQuizSetup.addEventListener("click", () => closeQuizSetup({ restoreFocus: true }));
  elements.quizSetupBackdrop.addEventListener("click", () => closeQuizSetup({ restoreFocus: true }));
  elements.quizSetupForm.addEventListener("change", (event) => {
    if (event.target === elements.quizIncludeReviewOnly) {
      if (elements.quizIncludeReviewOnly.checked) elements.quizProgressFilter.value = "review";
      else if (elements.quizProgressFilter.value === "review") elements.quizProgressFilter.value = "all";
    }
    if (event.target === elements.quizProgressFilter) {
      elements.quizIncludeReviewOnly.checked = elements.quizProgressFilter.value === "review";
    }
    updateQuizEligibility();
  });
  elements.resumeQuizSession.addEventListener("click", restoreQuizSession);
  elements.discardQuizSession.addEventListener("click", () => {
    clearPersistedQuizSession();
    updateResumeCard();
    A11y.announce("Saved quiz session discarded.");
  });
  elements.quizSetupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const type = new FormData(elements.quizSetupForm).get("quizType") || "locate";
    startQuiz({
      type,
      count: elements.quizQuestionCount.value,
      reviewOnly: elements.quizIncludeReviewOnly.checked,
      showDescriptions: elements.quizShowDescriptions.checked,
      filters: currentQuizFilters()
    });
  });

  elements.nextQuizQuestion.addEventListener("click", advanceQuiz);
  elements.cancelActiveQuiz.addEventListener("click", () => {
    if (window.confirm(I18n.t("quiz.endConfirm"))) {
      clearPersistedQuizSession();
      endQuiz({ showResults: false });
    }
  });
  elements.revealFlashcardAnswer.addEventListener("click", revealFlashcard);
  elements.flashcardRatingActions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-rating]");
    if (button) rateFlashcard(button.dataset.rating);
  });
  elements.closeQuizResults.addEventListener("click", () => closeQuizResults({ restoreFocus: true }));
  elements.quizResultsBackdrop.addEventListener("click", () => closeQuizResults({ restoreFocus: true }));
  elements.finishQuizResults.addEventListener("click", () => closeQuizResults({ restoreFocus: true }));
  elements.reviewQuizMistakes.addEventListener("click", reviewMistakesInStudyMode);
  elements.repeatMissedQuiz.addEventListener("click", repeatMissedQuiz);

  elements.exportLearningProgress.addEventListener("click", exportProgress);
  elements.importLearningProgress.addEventListener("click", () => elements.learningProgressImportInput.click());
  elements.learningProgressImportInput.addEventListener("change", () => importProgress(elements.learningProgressImportInput.files?.[0]));
  elements.clearLearningProgress.addEventListener("click", clearProgress);

  const viewer = Atlas.getViewer?.();
  viewer?.addHandler("canvas-click", handleCanvasQuizClick);

  document.addEventListener("morphora:view-change", syncActiveView);
  document.addEventListener("morphora:atlas-deactivate", () => {
    if (state.quiz) endQuiz({ showResults: false, announce: false });
    closeStudyDrawer({ restoreFocus: false });
    closeProgressDrawer({ restoreFocus: false });
    closeQuizSetup({ restoreFocus: false });
    closeQuizResults({ restoreFocus: false });
    state.mode = "explore";
    setModeButtons("explore");
  });

  document.addEventListener("keydown", (event) => {
    if (!state.quiz) return;
    const tag = document.activeElement?.tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      elements.cancelActiveQuiz.click();
      return;
    }
    if (["choice", "custom"].includes(state.quiz.type) && /^[1-9]$/.test(event.key) && !state.quiz.answered) {
      const option = elements.quizAnswerOptions.querySelectorAll("button")[Number(event.key) - 1];
      option?.click();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (state.quiz.type === "flashcard" && !state.quiz.flashcardRevealed) {
        event.preventDefault();
        revealFlashcard();
      } else if (state.quiz.answered) {
        event.preventDefault();
        advanceQuiz();
      }
    }
  });

  window.MorphoraStudy = Object.freeze({
    getLabelVisibility,
    handleLabelActivation,
    setMode,
    openQuizSetup,
    openProgress: openProgressDrawer,
    getProgress: () => state.progress,
    getMode: () => state.mode
  });

  window.addEventListener("morphora:languagechange", async () => {
    I18n.applyDom();
    await loadQuestionBank();
    if (!state.quiz) {
      syncActiveView();
      updateProgressUi();
    }
  });

  setModeButtons("explore");
  updateProgressUi();
  syncActiveView();
});
