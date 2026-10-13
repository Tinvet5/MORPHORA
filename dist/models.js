(() => {
  "use strict";

  const SCHEMA_VERSION = 2;
  const USER_DATA_SCHEMA_VERSION = 2;
  const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);
  const CONTENT_STATUSES = new Set(["draft", "review", "published", "unpublished"]);
  const AVAILABILITY_STATUSES = new Set(["available", "coming-soon"]);

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function deepClone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function text(value, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
  }

  function finite(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, Number(value)));
  }

  function normalizePoint(value, fallback = null) {
    if (!isPlainObject(value)) return fallback;
    const x = finite(value.x);
    const y = finite(value.y);
    if (x === null || y === null) return fallback;
    return { x: clamp(x), y: clamp(y) };
  }

  function normalizeQuiz(raw = {}) {
    const source = isPlainObject(raw.quiz) ? raw.quiz : raw;
    const hasEligible = Object.prototype.hasOwnProperty.call(source, "eligible") ||
      Object.prototype.hasOwnProperty.call(source, "quizEligible");
    const eligibleRaw = Object.prototype.hasOwnProperty.call(source, "eligible")
      ? source.eligible
      : source.quizEligible;
    const difficultyRaw = Object.prototype.hasOwnProperty.call(source, "difficulty")
      ? source.difficulty
      : undefined;
    const radiusRaw = Object.prototype.hasOwnProperty.call(source, "acceptedRadius")
      ? source.acceptedRadius
      : undefined;
    return {
      eligible: hasEligible ? eligibleRaw : true,
      difficulty: difficultyRaw === undefined ? "intermediate" : difficultyRaw,
      acceptedRadius: radiusRaw === undefined ? 0.045 : radiusRaw
    };
  }

  function attachQuizAliases(label) {
    if (!isPlainObject(label)) return label;
    if (!isPlainObject(label.quiz)) label.quiz = normalizeQuiz(label);
    const definitions = {
      quizEligible: {
        get() { return this.quiz?.eligible !== false; },
        set(value) {
          if (!isPlainObject(this.quiz)) this.quiz = normalizeQuiz();
          this.quiz.eligible = Boolean(value);
        }
      },
      difficulty: {
        get() { return this.quiz?.difficulty || "intermediate"; },
        set(value) {
          if (!isPlainObject(this.quiz)) this.quiz = normalizeQuiz();
          this.quiz.difficulty = DIFFICULTIES.has(value) ? value : "intermediate";
        }
      },
      acceptedRadius: {
        get() { return this.quiz?.acceptedRadius ?? 0.045; },
        set(value) {
          if (!isPlainObject(this.quiz)) this.quiz = normalizeQuiz();
          const radius = finite(value, 0.045);
          this.quiz.acceptedRadius = Math.min(0.2, Math.max(0.005, radius));
        }
      }
    };
    Object.entries(definitions).forEach(([key, descriptor]) => {
      try {
        const existing = Object.getOwnPropertyDescriptor(label, key);
        if (!existing || existing.enumerable) {
          delete label[key];
          Object.defineProperty(label, key, {
            configurable: true,
            enumerable: false,
            ...descriptor
          });
        }
      } catch (_) {
        // Non-fatal compatibility layer.
      }
    });
    return label;
  }

  function normalizeLabel(raw = {}) {
    const label = {
      id: text(raw.id),
      name: text(raw.name),
      description: typeof raw.description === "string" ? raw.description.trim() : "",
      position: normalizePoint(raw.position || raw.anchor) || deepClone(raw.position || raw.anchor) || null,
      category: text(raw.category),
      status: raw.status === undefined ? "published" : raw.status,
      quiz: normalizeQuiz(raw)
    };
    const labelPosition = normalizePoint(raw.labelPosition);
    if (labelPosition) label.labelPosition = labelPosition;
    Object.keys(raw).forEach((key) => {
      if (["id", "name", "description", "position", "anchor", "labelPosition", "category", "status", "quiz", "quizEligible", "difficulty", "acceptedRadius"].includes(key)) return;
      label[key] = deepClone(raw[key]);
    });
    return attachQuizAliases(label);
  }

  function migrateView(raw) {
    const source = isPlainObject(raw) ? deepClone(raw) : {};
    const image = isPlainObject(source.image) ? source.image : {};
    const type = text(image.type) || (text(image.src).toLowerCase().split("?", 1)[0].endsWith(".dzi") ? "dzi" : "image");
    const view = {
      schemaVersion: SCHEMA_VERSION,
      id: text(source.id),
      title: text(source.title),
      orientation: text(source.orientation),
      status: source.status === undefined ? "published" : source.status,
      image: {
        type,
        src: text(image.src),
        width: finite(image.width),
        height: finite(image.height),
        alt: typeof image.alt === "string" ? image.alt.trim() : ""
      },
      labels: Array.isArray(source.labels) ? source.labels.map(normalizeLabel) : []
    };
    if (text(image.fallback)) view.image.fallback = text(image.fallback);
    if (text(image.thumbnail)) view.image.thumbnail = text(image.thumbnail);
    Object.keys(source).forEach((key) => {
      if (["schemaVersion", "id", "title", "orientation", "status", "image", "labels"].includes(key)) return;
      view[key] = deepClone(source[key]);
    });
    Object.keys(image).forEach((key) => {
      if (["type", "src", "fallback", "thumbnail", "width", "height", "alt"].includes(key)) return;
      view.image[key] = deepClone(image[key]);
    });
    return view;
  }

  function normalizeViewEntry(entry = {}) {
    const result = {
      id: text(entry.id),
      buttonLabel: text(entry.buttonLabel || entry.title || entry.id),
      dataPath: text(entry.dataPath)
    };
    if (text(entry.thumbnail)) result.thumbnail = text(entry.thumbnail);
    if (text(entry.orientation)) result.orientation = text(entry.orientation);
    if (CONTENT_STATUSES.has(entry.status)) result.status = entry.status;
    Object.keys(entry).forEach((key) => {
      if (["id", "buttonLabel", "dataPath", "thumbnail", "orientation", "status"].includes(key)) return;
      result[key] = deepClone(entry[key]);
    });
    return result;
  }

  function migrateCollection(raw) {
    const source = isPlainObject(raw) ? deepClone(raw) : {};
    const speciesId = text(source.speciesId || source.species?.id);
    const collectionId = text(source.collectionId || source.region?.id || source.id);
    const legacyId = text(source.id || `${speciesId}-${collectionId}`);
    const result = {
      schemaVersion: SCHEMA_VERSION,
      id: legacyId === "morphora-canine-skull" ? "dog-skull" : legacyId,
      title: text(source.title),
      speciesId,
      systemId: text(source.systemId || "skeletal"),
      collectionId,
      defaultViewId: text(source.defaultViewId),
      views: Array.isArray(source.views) ? source.views.map(normalizeViewEntry) : []
    };
    Object.keys(source).forEach((key) => {
      if (["schemaVersion", "id", "title", "species", "region", "speciesId", "systemId", "collectionId", "defaultViewId", "views"].includes(key)) return;
      result[key] = deepClone(source[key]);
    });
    return result;
  }

  function migrateCatalog(raw) {
    const source = isPlainObject(raw) ? deepClone(raw) : {};
    return {
      ...source,
      schemaVersion: SCHEMA_VERSION,
      defaultSpeciesId: text(source.defaultSpeciesId),
      species: Array.isArray(source.species) ? source.species.map((entry) => ({ ...entry, id: text(entry.id), name: text(entry.name) })) : []
    };
  }

  function migrateSpecies(raw) {
    const source = isPlainObject(raw) ? deepClone(raw) : {};
    return {
      ...source,
      schemaVersion: SCHEMA_VERSION,
      id: text(source.id),
      name: text(source.name),
      systems: Array.isArray(source.systems) ? source.systems.map((system) => ({
        ...system,
        id: text(system.id),
        name: text(system.name),
        collections: Array.isArray(system.collections) ? system.collections.map((collection) => ({
          ...collection,
          id: text(collection.id),
          name: text(collection.name)
        })) : []
      })) : []
    };
  }

  function validateId(value, path, errors) {
    if (!text(value)) errors.push(`${path} is required.`);
    else if (!ID_PATTERN.test(text(value))) errors.push(`${path} must use lowercase letters, numbers and hyphens.`);
  }

  function validatePoint(value, path, errors) {
    if (!isPlainObject(value)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    ["x", "y"].forEach((axis) => {
      const number = finite(value[axis]);
      if (number === null || number < 0 || number > 1) errors.push(`${path}.${axis} must be between 0 and 1.`);
    });
  }

  function validateView(data, context = {}) {
    const errors = [];
    const warnings = [];
    if (!isPlainObject(data)) return { errors: ["View must be an object."], warnings };
    if (data.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}.`);
    validateId(data.id, "View id", errors);
    if (context.expectedId && data.id !== context.expectedId) errors.push(`View id “${data.id}” does not match manifest id “${context.expectedId}”.`);
    if (!text(data.title)) warnings.push("View title is empty.");
    if (!text(data.orientation)) warnings.push("View orientation is empty.");
    if (!CONTENT_STATUSES.has(data.status)) errors.push("View status is invalid.");
    if (!isPlainObject(data.image)) errors.push("image must be an object.");
    else {
      if (!["image", "dzi"].includes(data.image.type)) errors.push("image.type must be “image” or “dzi”.");
      if (!text(data.image.src)) errors.push("image.src is required.");
      ["width", "height"].forEach((key) => {
        const number = finite(data.image[key]);
        if (number === null || number <= 0) errors.push(`image.${key} must be a positive number.`);
      });
      if (!text(data.image.alt)) warnings.push("image.alt is empty.");
      if (data.image.type === "dzi" && !text(data.image.fallback)) warnings.push("Deep Zoom view has no fallback image.");
      if (data.image.type === "dzi" && !text(data.image.thumbnail)) warnings.push("Deep Zoom view has no thumbnail.");
    }
    if (!Array.isArray(data.labels)) errors.push("labels must be an array.");
    const ids = new Set();
    (data.labels || []).forEach((label, index) => {
      const prefix = `Label ${index + 1}`;
      validateId(label?.id, `${prefix} id`, errors);
      if (label?.id && ids.has(label.id)) errors.push(`Duplicate label id “${label.id}”.`);
      if (label?.id) ids.add(label.id);
      if (!text(label?.name)) errors.push(`${prefix} name is required.`);
      validatePoint(label?.position, `${prefix}.position`, errors);
      if (label?.labelPosition !== undefined) validatePoint(label.labelPosition, `${prefix}.labelPosition`, errors);
      if (!CONTENT_STATUSES.has(label?.status)) errors.push(`${prefix} status is invalid.`);
      const quiz = label?.quiz;
      if (!isPlainObject(quiz)) errors.push(`${prefix}.quiz must be an object.`);
      else {
        if (typeof quiz.eligible !== "boolean") errors.push(`${prefix}.quiz.eligible must be true or false.`);
        if (!DIFFICULTIES.has(quiz.difficulty)) errors.push(`${prefix}.quiz.difficulty must be beginner, intermediate or advanced.`);
        const radius = finite(quiz.acceptedRadius);
        if (radius === null || radius < 0.005 || radius > 0.2) errors.push(`${prefix}.quiz.acceptedRadius must be between 0.005 and 0.2.`);
      }
      if (!text(label?.description)) warnings.push(`${label?.name || prefix} has no description.`);
      if (!text(label?.category)) warnings.push(`${label?.name || prefix} has no category.`);
      if (label?.status !== "published") warnings.push(`${label?.name || prefix} is marked “${label?.status || "draft"}”.`);
    });
    return { errors, warnings };
  }

  function validateCollection(data) {
    const errors = [];
    const warnings = [];
    if (!isPlainObject(data)) return { errors: ["Collection manifest must be an object."], warnings };
    if (data.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}.`);
    validateId(data.id, "Collection manifest id", errors);
    validateId(data.speciesId, "speciesId", errors);
    validateId(data.systemId, "systemId", errors);
    validateId(data.collectionId, "collectionId", errors);
    if (!text(data.title)) errors.push("Collection title is required.");
    if (!Array.isArray(data.views) || !data.views.length) errors.push("Collection requires at least one view.");
    const ids = new Set();
    (data.views || []).forEach((entry, index) => {
      const prefix = `View entry ${index + 1}`;
      validateId(entry?.id, `${prefix} id`, errors);
      if (entry?.id && ids.has(entry.id)) errors.push(`Duplicate view id “${entry.id}”.`);
      if (entry?.id) ids.add(entry.id);
      if (!text(entry?.buttonLabel)) errors.push(`${prefix} buttonLabel is required.`);
      if (!text(entry?.dataPath)) errors.push(`${prefix} dataPath is required.`);
    });
    if (text(data.defaultViewId) && !ids.has(data.defaultViewId)) errors.push(`defaultViewId “${data.defaultViewId}” is not registered.`);
    return { errors, warnings };
  }

  function validateCatalog(data) {
    const errors = [];
    const warnings = [];
    if (!isPlainObject(data)) return { errors: ["Catalog must be an object."], warnings };
    if (data.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}.`);
    if (!Array.isArray(data.species) || !data.species.length) errors.push("Catalog needs species entries.");
    const ids = new Set();
    (data.species || []).forEach((entry, index) => {
      validateId(entry?.id, `Species ${index + 1} id`, errors);
      if (entry?.id && ids.has(entry.id)) errors.push(`Duplicate species id “${entry.id}”.`);
      if (entry?.id) ids.add(entry.id);
      if (!text(entry?.name)) errors.push(`Species ${index + 1} name is required.`);
      if (!AVAILABILITY_STATUSES.has(entry?.status)) errors.push(`Species ${entry?.id || index + 1} status is invalid.`);
      if (entry?.status === "available" && !text(entry?.dataPath)) errors.push(`Available species ${entry.id} requires dataPath.`);
    });
    return { errors, warnings };
  }

  function validateSpecies(data, context = {}) {
    const errors = [];
    const warnings = [];
    if (!isPlainObject(data)) return { errors: ["Species document must be an object."], warnings };
    if (data.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}.`);
    validateId(data.id, "Species id", errors);
    if (context.expectedId && data.id !== context.expectedId) errors.push(`Species id “${data.id}” does not match catalog id “${context.expectedId}”.`);
    if (!text(data.name)) errors.push("Species name is required.");
    if (!Array.isArray(data.systems)) errors.push("systems must be an array.");
    const systemIds = new Set();
    (data.systems || []).forEach((system, index) => {
      validateId(system?.id, `System ${index + 1} id`, errors);
      if (system?.id && systemIds.has(system.id)) errors.push(`Duplicate system id “${system.id}”.`);
      if (system?.id) systemIds.add(system.id);
      if (!text(system?.name)) errors.push(`System ${index + 1} name is required.`);
      if (!AVAILABILITY_STATUSES.has(system?.status)) errors.push(`System ${system?.id || index + 1} status is invalid.`);
      if (!Array.isArray(system?.collections)) errors.push(`System ${system?.id || index + 1} collections must be an array.`);
      const collectionIds = new Set();
      (system?.collections || []).forEach((collection, collectionIndex) => {
        validateId(collection?.id, `Collection ${collectionIndex + 1} id`, errors);
        if (collection?.id && collectionIds.has(collection.id)) errors.push(`Duplicate collection id “${collection.id}” in system ${system.id}.`);
        if (collection?.id) collectionIds.add(collection.id);
        if (!text(collection?.name)) errors.push(`Collection ${collection?.id || collectionIndex + 1} name is required.`);
        if (!AVAILABILITY_STATUSES.has(collection?.status)) errors.push(`Collection ${collection?.id || collectionIndex + 1} status is invalid.`);
        if (collection?.status === "available" && !text(collection?.manifestPath)) errors.push(`Available collection ${collection.id} requires manifestPath.`);
      });
    });
    return { errors, warnings };
  }

  const migrators = {
    catalog: migrateCatalog,
    species: migrateSpecies,
    collection: migrateCollection,
    view: migrateView
  };
  const validators = {
    catalog: validateCatalog,
    species: validateSpecies,
    collection: validateCollection,
    view: validateView
  };

  function migrate(kind, raw) {
    const migrator = migrators[kind];
    if (!migrator) throw new Error(`Unknown MORPHORA model kind: ${kind}`);
    const sourceVersion = Number(raw?.schemaVersion || 1);
    if (Number.isFinite(sourceVersion) && sourceVersion > SCHEMA_VERSION) {
      throw new Error(`Unsupported ${kind} schema version ${sourceVersion}. This build supports up to ${SCHEMA_VERSION}.`);
    }
    return migrator(raw);
  }

  function validate(kind, raw, context = {}) {
    const validator = validators[kind];
    if (!validator) throw new Error(`Unknown MORPHORA model kind: ${kind}`);
    return validator(raw, context);
  }

  function prepare(kind, raw, context = {}) {
    const data = migrate(kind, raw);
    const result = validate(kind, data, context);
    if (result.errors.length) {
      const error = new Error(result.errors.join("\n"));
      error.validation = result;
      throw error;
    }
    return data;
  }

  function clone(value) {
    const copy = deepClone(value);
    if (isPlainObject(copy) && Array.isArray(copy.labels)) {
      copy.labels = copy.labels.map(normalizeLabel);
    } else if (Array.isArray(copy)) {
      return copy.map((item) => clone(item));
    }
    return copy;
  }

  function createLabel(overrides = {}) {
    return normalizeLabel({
      id: "",
      name: "",
      description: "",
      position: { x: 0.5, y: 0.5 },
      category: "",
      status: "draft",
      quiz: { eligible: true, difficulty: "intermediate", acceptedRadius: 0.045 },
      ...overrides
    });
  }

  function createView(overrides = {}) {
    return migrateView({
      schemaVersion: SCHEMA_VERSION,
      id: "",
      title: "",
      orientation: "",
      status: "draft",
      image: { type: "image", src: "", width: 1, height: 1, alt: "" },
      labels: [],
      ...overrides
    });
  }

  function createCollectionEntry(overrides = {}) {
    return normalizeViewEntry({ id: "", buttonLabel: "", dataPath: "", ...overrides });
  }

  function getQuiz(label) {
    if (!isPlainObject(label)) return normalizeQuiz();
    if (!isPlainObject(label.quiz)) label.quiz = normalizeQuiz(label);
    return label.quiz;
  }

  function migrateUserStore(kind, raw) {
    const source = isPlainObject(raw) ? deepClone(raw) : {};
    const sourceVersion = Number(source.schemaVersion || source.progress?.schemaVersion || 1);
    if (Number.isFinite(sourceVersion) && sourceVersion > USER_DATA_SCHEMA_VERSION) {
      throw new Error(`Unsupported ${kind} user-data schema version ${sourceVersion}. This build supports up to ${USER_DATA_SCHEMA_VERSION}.`);
    }
    if (kind === "annotations") {
      return {
        schemaVersion: USER_DATA_SCHEMA_VERSION,
        updatedAt: source.updatedAt || null,
        views: isPlainObject(source.views || source.annotations) ? (source.views || source.annotations) : {}
      };
    }
    if (kind === "drawings") {
      return {
        schemaVersion: USER_DATA_SCHEMA_VERSION,
        updatedAt: source.updatedAt || null,
        preferences: isPlainObject(source.preferences) ? source.preferences : { visible: true },
        views: isPlainObject(source.views || source.drawings) ? (source.views || source.drawings) : {}
      };
    }
    if (kind === "progress") {
      const progress = isPlainObject(source.progress) ? source.progress : source;
      return {
        schemaVersion: USER_DATA_SCHEMA_VERSION,
        updatedAt: progress.updatedAt || null,
        structures: isPlainObject(progress.structures) ? progress.structures : {},
        sessions: Array.isArray(progress.sessions) ? progress.sessions : []
      };
    }
    throw new Error(`Unknown MORPHORA user-data kind: ${kind}`);
  }

  window.MorphoraModels = Object.freeze({
    SCHEMA_VERSION,
    USER_DATA_SCHEMA_VERSION,
    ID_PATTERN,
    migrate,
    validate,
    prepare,
    clone,
    createLabel,
    createView,
    createCollectionEntry,
    normalizeLabel,
    normalizeQuiz,
    getQuiz,
    migrateUserStore
  });
})();
