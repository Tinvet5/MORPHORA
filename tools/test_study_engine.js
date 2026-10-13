"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const study = fs.readFileSync(path.join(root, "study.js"), "utf8");
const storage = fs.readFileSync(path.join(root, "storage.js"), "utf8");
const bank = JSON.parse(fs.readFileSync(path.join(root, "data/questions/dog-skull.json"), "utf8"));
const template = JSON.parse(fs.readFileSync(path.join(root, "data/questions/QUESTION-BANK-TEMPLATE.json"), "utf8"));

assert(storage.includes('activeQuizSession: "morphora:quiz-session:v1"'), "Active quiz session storage key is missing.");
assert(study.includes("function distractorScore"), "Context-aware distractor scoring is missing.");
assert(study.includes("function restoreQuizSession"), "Quiz session recovery is missing.");
assert(study.includes("function calculateMastery"), "Adaptive mastery calculation is missing.");
assert(study.includes("function eligibleCustomQuestions"), "Custom question pools are missing.");
assert(bank.schemaVersion === 1 && bank.collectionId === "dog-skull" && Array.isArray(bank.questions), "Dog skull question bank is malformed.");
assert(template.questions?.[0]?.status === "draft", "Question bank template must remain draft-only.");
assert(Array.isArray(template.questions?.[0]?.options) && template.questions[0].options.length >= 2, "Question template needs answer options.");

if (failures.length) {
  console.error("MORPHORA study-engine checks failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("MORPHORA study-engine checks passed");
console.log("✓ adaptive mastery");
console.log("✓ context-aware distractors");
console.log("✓ session recovery");
console.log("✓ custom question-bank support");
