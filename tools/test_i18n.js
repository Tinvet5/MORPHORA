"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const locales = ["es", "en"];
const dictionaries = Object.fromEntries(locales.map((locale) => [locale, JSON.parse(fs.readFileSync(path.join(root, "i18n", `${locale}.json`), "utf8"))]));
const baseKeys = Object.keys(dictionaries.en).sort();
for (const locale of locales) {
  const keys = Object.keys(dictionaries[locale]).sort();
  const missing = baseKeys.filter((key) => !keys.includes(key));
  if (missing.length) throw new Error(`${locale} dictionary missing keys: ${missing.join(", ")}`);
}
const viewDir = path.join(root, "data", "views");
const skullFiles = fs.readdirSync(viewDir).filter((name) => /^dog-skull-.*\.json$/.test(name));
let labels = 0;
for (const file of skullFiles) {
  const view = JSON.parse(fs.readFileSync(path.join(viewDir, file), "utf8"));
  if (!view.translations?.es?.title || !view.translations?.en?.title) throw new Error(`${file} requires ES/EN view titles.`);
  for (const label of view.labels || []) {
    labels += 1;
    for (const locale of locales) {
      const tr = label.translations?.[locale];
      if (!tr?.name) throw new Error(`${file}:${label.id} missing ${locale} name.`);
      if (!Array.isArray(tr.aliases)) throw new Error(`${file}:${label.id} ${locale} aliases must be an array.`);
    }
  }
}
if (!labels) throw new Error("Expected bilingual skull labels.");

const requiredKeys = [
  "footer.title", "footer.emailAria", "status.loadingSpecies", "viewer.loadingImage",
  "notes.emptyTitle", "drawing.hintDraw", "study.noStructuresAvailable", "quiz.recommendRepeatTitle",
  "studio.saveDraft", "studio.translation", "library.searchTitle",
  "status.offline", "status.connectionRestored", "viewer.compatibleImage", "viewer.fallbackOpened",
  "species.dataUnavailable", "species.libraryUnavailable", "theme.switchDark", "theme.switchLight"
];
for (const key of requiredKeys) {
  for (const locale of locales) {
    if (!dictionaries[locale][key]) throw new Error(`${locale} dictionary missing required V4.9.8 key: ${key}`);
  }
}
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const token of ["ADMIN@MORPHORA.cl", "youtube.com/channel/UC7rGvkF_5lHKdIq9uqSneuw", "instagram.com/morphora.atlas", "tiktok.com/@morphora_atlas", "© 2026 MORPHORA All rights reserved"]) {
  if (!indexHtml.includes(token)) throw new Error(`Brand footer missing expected token: ${token}`);
}
const publicJs = ["navigation.js", "script.js", "study.js", "drawing.js"].map((name) => fs.readFileSync(path.join(root, name), "utf8")).join("\
");
for (const forbidden of [
  'textContent = "No structures available"',
  'textContent = "Browse by system"',
  'textContent = "Edit"',
  'textContent = "Delete"',
  '"Excellent work — no structures need immediate review."'
]) {
  if (publicJs.includes(forbidden)) throw new Error(`Hard-coded public UI string remains: ${forbidden}`);
}

const performanceJs = fs.readFileSync(path.join(root, "performance.js"), "utf8");
const styleCss = fs.readFileSync(path.join(root, "style.css"), "utf8");
for (const [source, forbidden] of [
  [publicJs, '<strong>Species data unavailable</strong>'],
  [publicJs, '<strong>Species library unavailable</strong>'],
  [publicJs, 'A11y.announce("High-resolution tiles were unavailable'],
  [performanceJs, 'element.textContent = offline\n      ? "You are offline.'],
  [styleCss, 'content: "Compatible image"']
]) {
  if (source.includes(forbidden)) throw new Error(`V4.9.8 localization hardening regression: ${forbidden}`);
}

console.log(`i18n checks passed: ${baseKeys.length} UI keys, ${labels} bilingual anatomical labels.`);
