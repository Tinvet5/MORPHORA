(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Models = root.MorphoraModels || null;
  const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const CONTENT_STATUSES = new Set(["draft", "review", "published", "unpublished"]);
  const DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);
  const ORIENTATIONS = new Set(["lateral", "medial", "dorsal", "ventral", "cranial", "caudal", "rostral", "other", "unspecified"]);
  const SAFE_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._\-/]+$/;
  const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "tif", "tiff"]);

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function issue(severity, code, message, path = "", hint = "") {
    return { severity, code, message, path, hint };
  }

  function dedupe(issues) {
    const seen = new Set();
    return issues.filter((item) => {
      const key = `${item.severity}|${item.code}|${item.path}|${item.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function summarize(issues = []) {
    return issues.reduce((summary, item) => {
      if (item.severity === "error") summary.errors += 1;
      else if (item.severity === "warning") summary.warnings += 1;
      else summary.passes += 1;
      return summary;
    }, { errors: 0, warnings: 0, passes: 0 });
  }

  function validateRepositoryPath(value, path = "path") {
    const issues = [];
    const candidate = text(value);
    if (!candidate) {
      issues.push(issue("error", "PATH_REQUIRED", "Repository path is required.", path));
      return issues;
    }
    if (/^(?:https?:|data:|blob:)/i.test(candidate)) return issues;
    if (!SAFE_PATH_PATTERN.test(candidate) || candidate.includes("\\")) {
      issues.push(issue("error", "PATH_UNSAFE", "Repository path contains unsupported or unsafe characters.", path, "Use a relative path with lowercase-friendly filenames and forward slashes."));
    }
    if (candidate.includes("//")) {
      issues.push(issue("warning", "PATH_DOUBLE_SLASH", "Repository path contains a repeated slash.", path));
    }
    if (/[A-Z\s]/.test(candidate)) {
      issues.push(issue("warning", "PATH_STYLE", "Repository paths are safer when lowercase and space-free.", path, "Prefer lowercase filenames separated with hyphens."));
    }
    return issues;
  }

  function validateId(value, path = "id") {
    const candidate = text(value);
    if (!candidate) return [issue("error", "ID_REQUIRED", "ID is required.", path)];
    if (!ID_PATTERN.test(candidate)) {
      return [issue("error", "ID_FORMAT", "ID must use lowercase letters, numbers and single hyphens.", path, "Example: dog-skull-lateral")];
    }
    return [];
  }

  function validatePoint(value, path) {
    const issues = [];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return [issue("error", "POINT_REQUIRED", "Coordinate must be an object with x and y.", path)];
    }
    ["x", "y"].forEach((axis) => {
      const number = Number(value[axis]);
      if (!Number.isFinite(number) || number < 0 || number > 1) {
        issues.push(issue("error", "POINT_RANGE", `${axis} must be between 0 and 1.`, `${path}.${axis}`));
      }
    });
    return issues;
  }

  function modelIssues(kind, data, context = {}) {
    if (!Models?.validate) return [];
    try {
      const result = Models.validate(kind, data, context);
      return [
        ...(result.errors || []).map((message) => issue("error", "MODEL_VALIDATION", message, kind)),
        ...(result.warnings || []).map((message) => issue("warning", "MODEL_REVIEW", message, kind))
      ];
    } catch (error) {
      return [issue("error", "MODEL_EXCEPTION", error.message || String(error), kind)];
    }
  }

  function validateLabel(label, index, { publishedView = false } = {}) {
    const issues = [];
    const prefix = `labels[${index}]`;
    issues.push(...validateId(label?.id, `${prefix}.id`));
    if (!text(label?.name)) issues.push(issue("error", "LABEL_NAME_REQUIRED", "Label name is required.", `${prefix}.name`));
    issues.push(...validatePoint(label?.position, `${prefix}.position`));
    if (label?.labelPosition !== undefined) issues.push(...validatePoint(label.labelPosition, `${prefix}.labelPosition`));
    if (!CONTENT_STATUSES.has(label?.status)) issues.push(issue("error", "LABEL_STATUS", "Label status is invalid.", `${prefix}.status`));

    const quiz = label?.quiz;
    if (!quiz || typeof quiz !== "object" || Array.isArray(quiz)) {
      issues.push(issue("error", "QUIZ_REQUIRED", "Quiz settings must be an object.", `${prefix}.quiz`));
    } else {
      if (typeof quiz.eligible !== "boolean") issues.push(issue("error", "QUIZ_ELIGIBLE", "quiz.eligible must be true or false.", `${prefix}.quiz.eligible`));
      if (!DIFFICULTIES.has(quiz.difficulty)) issues.push(issue("error", "QUIZ_DIFFICULTY", "Quiz difficulty must be beginner, intermediate or advanced.", `${prefix}.quiz.difficulty`));
      const radius = Number(quiz.acceptedRadius);
      if (!Number.isFinite(radius) || radius < 0.005 || radius > 0.2) {
        issues.push(issue("error", "QUIZ_RADIUS", "Quiz accepted radius must be between 0.005 and 0.2.", `${prefix}.quiz.acceptedRadius`, "Typical values are 0.025–0.075."));
      }
    }

    if (!text(label?.description)) {
      issues.push(issue(publishedView && label?.status === "published" ? "warning" : "warning", "LABEL_DESCRIPTION", "Label has no anatomical description.", `${prefix}.description`));
    }
    if (!text(label?.category)) {
      issues.push(issue("warning", "LABEL_CATEGORY", "Label has no category.", `${prefix}.category`));
    }
    if (publishedView && label?.status !== "published") {
      issues.push(issue("warning", "LABEL_NOT_PUBLISHED", `Label is marked “${label?.status || "draft"}” inside a published view.`, `${prefix}.status`));
    }
    return issues;
  }

  function validateView(raw, context = {}) {
    let data = raw;
    const issues = [];
    try {
      if (Models?.migrate) data = Models.migrate("view", raw);
    } catch (error) {
      issues.push(issue("error", "SCHEMA_MIGRATION", error.message || String(error), "view"));
      return { data: raw, issues: dedupe(issues), summary: summarize(issues) };
    }

    issues.push(...modelIssues("view", data, { expectedId: context.expectedId || null }));
    issues.push(...validateId(data?.id, "id"));
    const publishedView = data?.status === "published";

    if (context.expectedId && data?.id !== context.expectedId) {
      issues.push(issue("error", "VIEW_ID_MISMATCH", `View ID “${data?.id || ""}” does not match manifest ID “${context.expectedId}”.`, "id"));
    }
    if (!CONTENT_STATUSES.has(data?.status)) issues.push(issue("error", "VIEW_STATUS", "View status is invalid.", "status"));
    if (!text(data?.title)) issues.push(issue(publishedView ? "error" : "warning", "VIEW_TITLE", "View title is empty.", "title"));
    if (!text(data?.orientation)) issues.push(issue(publishedView ? "error" : "warning", "VIEW_ORIENTATION", "View orientation is empty.", "orientation"));
    else if (!ORIENTATIONS.has(text(data.orientation).toLowerCase())) issues.push(issue("warning", "VIEW_ORIENTATION_CUSTOM", `Orientation “${data.orientation}” is not a standard MORPHORA orientation.`, "orientation"));

    const image = data?.image;
    if (!image || typeof image !== "object" || Array.isArray(image)) {
      issues.push(issue("error", "IMAGE_REQUIRED", "View image metadata is required.", "image"));
    } else {
      if (!["image", "dzi"].includes(image.type)) issues.push(issue("error", "IMAGE_TYPE", "image.type must be “image” or “dzi”.", "image.type"));
      issues.push(...validateRepositoryPath(image.src, "image.src"));
      if (!text(image.alt)) issues.push(issue(publishedView ? "error" : "warning", "IMAGE_ALT", "Image alternative text is empty.", "image.alt"));
      ["width", "height"].forEach((key) => {
        const number = Number(image[key]);
        if (!Number.isFinite(number) || number <= 0) issues.push(issue("error", "IMAGE_DIMENSION", `${key} must be a positive number.`, `image.${key}`));
      });
      if (image.type === "dzi") {
        if (!text(image.fallback)) issues.push(issue(publishedView ? "error" : "warning", "DZI_FALLBACK", "Deep Zoom view has no fallback image.", "image.fallback"));
        else issues.push(...validateRepositoryPath(image.fallback, "image.fallback"));
      }
      if (!text(image.thumbnail)) {
        if (publishedView) issues.push(issue("error", "VIEW_THUMBNAIL", "Published view has no thumbnail.", "image.thumbnail"));
      } else issues.push(...validateRepositoryPath(image.thumbnail, "image.thumbnail"));
    }

    if (!Array.isArray(data?.labels)) {
      issues.push(issue("error", "LABELS_ARRAY", "labels must be an array.", "labels"));
    } else {
      const ids = new Set();
      data.labels.forEach((label, index) => {
        issues.push(...validateLabel(label, index, { publishedView }));
        if (label?.id) {
          if (ids.has(label.id)) issues.push(issue("error", "DUPLICATE_LABEL_ID", `Duplicate label ID “${label.id}”.`, `labels[${index}].id`));
          ids.add(label.id);
        }
      });
      if (publishedView && data.labels.length === 0) issues.push(issue("warning", "PUBLISHED_VIEW_EMPTY", "Published view has no labels.", "labels"));
    }

    const cleanIssues = dedupe(issues);
    return { data, issues: cleanIssues, summary: summarize(cleanIssues) };
  }

  function toLegacyResult(result) {
    return {
      errors: result.issues.filter((item) => item.severity === "error").map((item) => item.message),
      warnings: result.issues.filter((item) => item.severity === "warning").map((item) => item.message),
      issues: result.issues,
      summary: result.summary,
      data: result.data
    };
  }

  root.MorphoraValidation = Object.freeze({
    version: "1.0.0",
    ID_PATTERN,
    CONTENT_STATUSES,
    IMAGE_EXTENSIONS,
    validateId,
    validatePoint,
    validateRepositoryPath,
    validateView,
    toLegacyResult,
    summarize
  });
})();
