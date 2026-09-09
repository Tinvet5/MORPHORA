document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const Atlas = window.MorphoraAtlas;
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

  const STORAGE_KEY = "morphora:learning-progress:v1";
  const SCHEMA_VERSION = 1;
  const DEFAULT_ACCEPTED_RADIUS = 0.045;
  const MAX_RECENT_SESSIONS = 30;
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
    studyStructureList: document.getElementById("studyStructureList"),
    quizSetupBackdrop: document.getElementById("quizSetupBackdrop"),
    quizSetupDialog: document.getElementById("quizSetupDialog"),
    quizSetupForm: document.getElementById("quizSetupForm"),
    closeQuizSetup: document.getElementById("closeQuizSetup"),
    cancelQuizSetup: document.getElementById("cancelQuizSetup"),
    quizSetupViewName: document.getElementById("quizSetupViewName"),
    quizQuestionCount: document.getElementById("quizQuestionCount"),
    quizIncludeReviewOnly: document.getElementById("quizIncludeReviewOnly"),
    quizShowDescriptions: document.getElementById("quizShowDescriptions"),
    quizEligibilityNote: document.getElementById("quizEligibilityNote"),
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
    progress: loadProgress()
  };

  function createEmptyProgress() {
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: null,
      structures: {},
      sessions: []
    };
  }

  function normalizeProgressEntry(value, key) {
    if (!value || typeof value !== "object") return null;
    const attempts = Math.max(0, Number(value.attempts) || 0);
    const correct = Math.min(attempts, Math.max(0, Number(value.correct) || 0));
    const incorrect = Math.max(0, attempts - correct);
    const mastery = attempts ? Math.round((correct / attempts) * 100) : 0;
    return {
      key,
      viewId: String(value.viewId || key.split("::")[0] || ""),
      labelId: String(value.labelId || key.split("::")[1] || ""),
      name: String(value.name || "Structure"),
      attempts,
      correct,
      incorrect,
      mastery,
      reviewFlag: Boolean(value.reviewFlag),
      lastReviewedAt: value.lastReviewedAt || null,
      lastRating: value.lastRating || null
    };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyProgress();
      const parsed = JSON.parse(raw);
      const normalized = createEmptyProgress();
      normalized.updatedAt = parsed.updatedAt || null;
      Object.entries(parsed.structures || {}).forEach(([key, value]) => {
        const entry = normalizeProgressEntry(value, key);
        if (entry) normalized.structures[key] = entry;
      });
      normalized.sessions = Array.isArray(parsed.sessions)
        ? parsed.sessions.filter((item) => item && typeof item === "object").slice(0, MAX_RECENT_SESSIONS)
        : [];
      return normalized;
    } catch (error) {
      console.warn("MORPHORA could not read learning progress. A clean record was started.", error);
      return createEmptyProgress();
    }
  }

  function saveProgress(message = "Learning progress saved") {
    state.progress.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
      updateProgressUi();
      if (message) A11y.announce(message);
      return true;
    } catch (error) {
      console.error("MORPHORA could not save learning progress.", error);
      A11y.announce("Learning progress could not be saved on this device.", { assertive: true });
      return false;
    }
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

  function eligibleLabels({ reviewOnly = false } = {}) {
    return state.labels.filter((label) => {
      if (!label || !label.id || !label.position) return false;
      if (label.quizEligible === false || !isPublishedLabel(label)) return false;
      if (!reviewOnly) return true;
      return Boolean(getProgressEntry(label)?.reviewFlag);
    });
  }

  function currentStudyLabel() {
    if (!state.labels.length) return null;
    state.studyIndex = Math.max(0, Math.min(state.studyIndex, state.labels.length - 1));
    return state.labels[state.studyIndex] || null;
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
    const index = state.labels.findIndex((item) => item.id === label.id);
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
    if (!entry || entry.attempts === 0) return "Not studied";
    if (entry.reviewFlag) return `${entry.mastery}% mastery · marked for review`;
    return `${entry.mastery}% mastery · ${entry.attempts} attempt${entry.attempts === 1 ? "" : "s"}`;
  }

  function renderStudyWorkspace() {
    const labels = state.labels;
    const current = currentStudyLabel();
    elements.studyViewName.textContent = state.activeViewData?.title || "Anatomical view";
    elements.studyViewCount.textContent = `${labels.length} structure${labels.length === 1 ? "" : "s"}`;

    if (!current) {
      elements.studyCurrentCounter.textContent = "No structures available";
      elements.studyCurrentPrompt.textContent = "This view has no labels yet";
      elements.studyCurrentDescription.textContent = "Add published labels in Content Studio before using Study mode.";
      elements.studyCurrentStatus.textContent = "Unavailable";
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
    elements.studyCurrentCounter.textContent = `Structure ${state.studyIndex + 1} of ${labels.length}`;
    elements.studyCurrentPrompt.textContent = isRevealed ? current.name : "Recall this structure";
    elements.studyCurrentDescription.textContent = isRevealed
      ? (current.description || "No anatomical description is available yet.")
      : "Locate the structure mentally, then reveal it on the image when ready.";
    elements.studyCurrentStatus.textContent = labelStatusText(current);
    elements.revealStudyStructure.textContent = isRevealed ? "Hide structure" : "Reveal structure";
    elements.markStudyReview.setAttribute("aria-pressed", String(Boolean(entry?.reviewFlag)));
    elements.markStudyReview.classList.toggle("active", Boolean(entry?.reviewFlag));
    elements.markStudyReview.textContent = entry?.reviewFlag ? "Remove review mark" : "Mark for review";

    const query = state.studySearch.trim().toLocaleLowerCase();
    elements.studyStructureList.replaceChildren();
    labels
      .map((label, index) => ({ label, index }))
      .filter(({ label }) => `${label.name} ${label.category || ""}`.toLocaleLowerCase().includes(query))
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
        name.textContent = state.revealed.has(label.id) ? label.name : "Hidden structure";
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
    if (!state.labels.length) return;
    state.studyIndex = (state.studyIndex + offset + state.labels.length) % state.labels.length;
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
    const studied = entries.filter((entry) => entry.attempts > 0).length;
    const answered = entries.reduce((sum, entry) => sum + entry.attempts, 0);
    const correct = entries.reduce((sum, entry) => sum + entry.correct, 0);
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    elements.progressStructuresStudied.textContent = String(studied);
    elements.progressQuestionsAnswered.textContent = String(answered);
    elements.progressOverallAccuracy.textContent = `${accuracy}%`;
    renderProgressDrawer();
  }

  function openQuizSetup(trigger = document.activeElement, { reviewOnly = false } = {}) {
    if (!state.activeViewData) {
      A11y.announce("Open an anatomical view before starting a quiz.");
      return;
    }
    const labels = eligibleLabels({ reviewOnly });
    state.quizSetupTrigger = trigger instanceof HTMLElement ? trigger : null;
    elements.quizIncludeReviewOnly.checked = reviewOnly;
    elements.quizSetupViewName.textContent = state.activeViewData.title;
    elements.quizEligibilityNote.textContent = labels.length
      ? `${labels.length} structure${labels.length === 1 ? " is" : "s are"} available for this session.`
      : reviewOnly
        ? "No structures in this view are marked for review."
        : "No quiz-eligible published labels are available in this view.";
    elements.beginQuizButton.disabled = labels.length === 0;

    const choiceRadio = elements.quizSetupForm.querySelector('input[value="choice"]');
    choiceRadio.disabled = eligibleLabels().length < 2;
    choiceRadio.closest("label")?.classList.toggle("is-disabled", choiceRadio.disabled);
    if (choiceRadio.disabled && choiceRadio.checked) {
      elements.quizSetupForm.querySelector('input[value="locate"]').checked = true;
    }

    elements.quizSetupBackdrop.hidden = false;
    elements.quizSetupDialog.hidden = false;
    elements.quizSetupDialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("quiz-dialog-open");
    A11y.activateFocusTrap(elements.quizSetupDialog, {
      initialFocus: elements.quizSetupForm.querySelector('input[name="quizType"]:not(:disabled)'),
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

  function startQuiz({ type, count, reviewOnly = false, showDescriptions = true, explicitLabels = null }) {
    const pool = explicitLabels || eligibleLabels({ reviewOnly });
    if (!pool.length) {
      A11y.announce("No eligible structures are available for this quiz.", { assertive: true });
      return;
    }
    window.MorphoraDrawing?.prepareForQuiz?.();

    const requestedCount = count === "all" ? pool.length : Math.max(1, Number(count) || 5);
    const questions = shuffle(pool).slice(0, Math.min(requestedCount, pool.length));
    if (state.mode !== "study") {
      state.previousExploreLabelsVisible = Atlas.getLabelsVisible?.() ?? true;
    }
    state.mode = "quiz";
    state.revealed.clear();
    state.highlightLabelId = null;
    state.highlightStyle = "anchor";
    state.quiz = {
      id: `session-${Date.now()}`,
      viewId: state.activeViewId,
      viewTitle: state.activeViewData.title,
      type,
      showDescriptions,
      questions,
      index: 0,
      correct: 0,
      responses: [],
      mistakes: [],
      startedAt: Date.now(),
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
    renderQuizQuestion();
    A11y.announce(`${quizTypeName(type)} started with ${questions.length} questions.`);
  }

  function quizTypeName(type) {
    return type === "choice" ? "Multiple-choice quiz" : type === "flashcard" ? "Flashcard session" : "Locate quiz";
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
    const label = currentQuizLabel();
    if (!quiz || !label) {
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

    if (quiz.type === "locate") {
      elements.quizPromptTitle.textContent = `Locate: ${label.name}`;
      elements.quizPromptText.textContent = "Click or tap the exact anatomical point on the image.";
      elements.quizHud.dataset.quizType = "locate";
    } else if (quiz.type === "choice") {
      state.highlightLabelId = label.id;
      state.highlightStyle = "anchor";
      elements.quizPromptTitle.textContent = "Which structure is highlighted?";
      elements.quizPromptText.textContent = "Choose the best answer.";
      elements.quizHud.dataset.quizType = "choice";
      renderChoiceAnswers(label);
      Atlas.focusPosition?.(label.position, 2);
    } else {
      state.highlightLabelId = label.id;
      state.highlightStyle = "anchor";
      elements.quizPromptTitle.textContent = "Identify the highlighted structure";
      elements.quizPromptText.textContent = "Recall the answer, then reveal the card.";
      elements.quizHud.dataset.quizType = "flashcard";
      elements.revealFlashcardAnswer.hidden = false;
      Atlas.focusPosition?.(label.position, 2);
    }

    Atlas.refreshLabels?.();
  }

  function renderChoiceAnswers(correctLabel) {
    const distractors = shuffle(eligibleLabels().filter((label) => label.id !== correctLabel.id)).slice(0, 3);
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

  function recordAttempt(label, { correct, rating = null, responseTime, distance = null }) {
    const entry = getProgressEntry(label, true);
    entry.attempts += 1;
    if (correct) entry.correct += 1;
    entry.incorrect = entry.attempts - entry.correct;
    entry.mastery = Math.round((entry.correct / entry.attempts) * 100);
    entry.lastReviewedAt = new Date().toISOString();
    entry.lastRating = rating;
    if (!correct || rating === "again" || rating === "difficult") entry.reviewFlag = true;
    if (rating === "easy" && entry.mastery >= 80) entry.reviewFlag = false;

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
      title: correct ? "Correct" : near ? "Close" : "Not quite",
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
      title: correct ? "Correct" : "Incorrect",
      text: `${label.name} is the highlighted structure.${description}`,
      label
    });
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
      ? (label.description || "No anatomical description is available yet.")
      : "Rate how well you recalled this structure.";
    elements.revealFlashcardAnswer.hidden = true;
    elements.flashcardRatingActions.hidden = false;
    Atlas.refreshLabels?.();
    A11y.announce(`Answer: ${label.name}`);
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
    elements.quizFeedbackTitle.textContent = correct ? "Recall recorded" : "Added to review";
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
      mistakes: quiz.mistakes.map((label) => ({ id: label.id, name: label.name })),
      mistakeLabels: [...quiz.mistakes]
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
      message.textContent = "Excellent work — no structures need immediate review.";
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
      elements.reviewQuizMistakes.disabled = false;
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
    if (!result?.mistakeLabels?.length) return;
    closeQuizResults({ restoreFocus: false });
    startQuiz({
      type: result.type,
      count: "all",
      showDescriptions: true,
      explicitLabels: result.mistakeLabels
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
    elements.progressCurrentViewName.textContent = state.activeViewData?.title || "No view open";
    elements.progressCurrentViewList.replaceChildren();
    if (!state.labels.length) {
      const empty = document.createElement("p");
      empty.className = "drawer-empty-state";
      empty.textContent = "Open a labeled anatomical view to see structure progress.";
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
      empty.textContent = "Completed quiz sessions will appear here.";
      elements.progressRecentSessions.appendChild(empty);
    } else {
      state.progress.sessions.slice(0, 8).forEach((session) => {
        const row = document.createElement("article");
        row.className = "recent-session-row";
        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = session.viewTitle || "Anatomical view";
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
      const incoming = parsed.progress || parsed;
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
    localStorage.removeItem(STORAGE_KEY);
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
    elements.studySearchInput.value = "";
    if (state.quiz) endQuiz({ showResults: false, announce: false });
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
    state.labels.forEach((label) => state.revealed.add(label.id));
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
    renderStudyWorkspace();
  });

  elements.closeQuizSetup.addEventListener("click", () => closeQuizSetup({ restoreFocus: true }));
  elements.cancelQuizSetup.addEventListener("click", () => closeQuizSetup({ restoreFocus: true }));
  elements.quizSetupBackdrop.addEventListener("click", () => closeQuizSetup({ restoreFocus: true }));
  elements.quizIncludeReviewOnly.addEventListener("change", () => {
    const count = eligibleLabels({ reviewOnly: elements.quizIncludeReviewOnly.checked }).length;
    elements.quizEligibilityNote.textContent = count
      ? `${count} structure${count === 1 ? " is" : "s are"} available for this session.`
      : "No matching structures are available.";
    elements.beginQuizButton.disabled = count === 0;
  });
  elements.quizSetupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const type = new FormData(elements.quizSetupForm).get("quizType") || "locate";
    startQuiz({
      type,
      count: elements.quizQuestionCount.value,
      reviewOnly: elements.quizIncludeReviewOnly.checked,
      showDescriptions: elements.quizShowDescriptions.checked
    });
  });

  elements.nextQuizQuestion.addEventListener("click", advanceQuiz);
  elements.cancelActiveQuiz.addEventListener("click", () => {
    if (window.confirm("End this quiz session? Current answers will remain in your learning progress.")) {
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
    if (state.quiz.type === "choice" && /^[1-4]$/.test(event.key) && !state.quiz.answered) {
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

  setModeButtons("explore");
  updateProgressUi();
  syncActiveView();
});
