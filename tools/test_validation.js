"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.resolve(__dirname, "..");
const sandbox = { window: {}, console, URLSearchParams, self: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "models.js"), "utf8"), sandbox, { filename: "models.js" });
sandbox.window.MorphoraModels = sandbox.window.MorphoraModels || sandbox.MorphoraModels;
vm.runInContext(fs.readFileSync(path.join(root, "validation", "rules.js"), "utf8"), sandbox, { filename: "validation/rules.js" });
const Validation = sandbox.window.MorphoraValidation;
if (!Validation) throw new Error("MorphoraValidation did not initialize");

function assert(condition, message) { if (!condition) throw new Error(message); }

const good = {
  schemaVersion: 2,
  id: "dog-test-lateral",
  title: "Dog test lateral",
  orientation: "lateral",
  status: "published",
  image: { type: "image", src: "images/test.jpg", thumbnail: "images/test.webp", width: 1000, height: 800, alt: "Lateral dog test" },
  labels: [{
    id: "test-point", name: "Test point", description: "Description", category: "landmark", status: "published",
    position: { x: 0.5, y: 0.4 }, quiz: { eligible: true, difficulty: "intermediate", acceptedRadius: 0.045 }
  }]
};
const goodResult = Validation.validateView(good, { expectedId: good.id });
assert(goodResult.summary.errors === 0, `Expected no errors, got ${JSON.stringify(goodResult.issues)}`);

const bad = JSON.parse(JSON.stringify(good));
bad.labels[0].quiz.acceptedRadius = 0.5;
bad.labels.push(JSON.parse(JSON.stringify(bad.labels[0])));
const badResult = Validation.validateView(bad, { expectedId: bad.id });
assert(badResult.issues.some((item) => item.code === "QUIZ_RADIUS"), "Expected QUIZ_RADIUS error");
assert(badResult.issues.some((item) => item.code === "DUPLICATE_LABEL_ID"), "Expected duplicate label error");
assert(Validation.validateRepositoryPath("../../secret.jpg").some((item) => item.severity === "error"), "Expected unsafe path error");
console.log("MORPHORA validation rule tests passed");
