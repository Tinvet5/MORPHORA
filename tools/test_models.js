"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "models.js"), "utf8");
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "models.js" });
const Models = sandbox.window.MorphoraModels;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const legacyView = {
  schemaVersion: 1,
  id: "dog-test-lateral",
  title: "Test",
  orientation: "lateral",
  image: { src: "images/test.jpg", width: 1000, height: 800, alt: "Test" },
  labels: [{
    id: "test-point",
    name: "Test point",
    description: "",
    position: { x: 0.4, y: 0.5 },
    category: "landmark",
    status: "published",
    quizEligible: true,
    difficulty: "advanced",
    acceptedRadius: 0.03
  }]
};
const view = Models.prepare("view", legacyView, { expectedId: "dog-test-lateral" });
assert(view.schemaVersion === 2, "V1 view did not migrate to V2");
assert(view.labels[0].quiz.difficulty === "advanced", "Quiz metadata was not nested");
assert(view.labels[0].difficulty === "advanced", "Compatibility alias is unavailable");
assert(!Object.keys(view.labels[0]).includes("difficulty"), "Compatibility alias leaked into enumerable canonical fields");
assert(JSON.stringify(view.labels[0]).includes('"quiz"'), "Canonical quiz object missing from JSON");

const legacyCollection = {
  schemaVersion: 1,
  id: "morphora-canine-skull",
  title: "Skull",
  species: { id: "dog" },
  region: { id: "skull" },
  defaultViewId: "dog-test-lateral",
  views: [{ id: "dog-test-lateral", buttonLabel: "Lateral", dataPath: "data/views/dog-test-lateral.json" }]
};
const collection = Models.prepare("collection", legacyCollection);
assert(collection.id === "dog-skull", "Legacy skull collection ID was not normalized");
assert(collection.speciesId === "dog" && collection.collectionId === "skull", "Collection identity fields were not migrated");

const invalid = Models.migrate("view", { ...legacyView, labels: [{ ...legacyView.labels[0], id: "Bad ID" }] });
const invalidResult = Models.validate("view", invalid);
assert(invalidResult.errors.some((item) => item.includes("lowercase")), "Invalid IDs were not rejected");

const userStore = Models.migrateUserStore("drawings", { schemaVersion: 1, drawings: { "dog-test": [] } });
assert(userStore.schemaVersion === 2 && Array.isArray(userStore.views["dog-test"]), "Drawing store migration failed");

console.log("MORPHORA model tests");
console.log("✓ V1 view migration");
console.log("✓ Canonical nested quiz metadata");
console.log("✓ Non-enumerable V1 compatibility aliases");
console.log("✓ Legacy collection migration");
console.log("✓ Central validation rules");
console.log("✓ User-data migration");
