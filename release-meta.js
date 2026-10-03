(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : self;
  root.MORPHORA_RELEASE = Object.freeze({
    product: "MORPHORA",
    version: "4.9.8",
    schemaVersion: 2,
    userDataSchemaVersion: 2,
    assetVersion: "4.9.8-dev",
    commit: "development",
    shortCommit: "dev",
    ref: "local",
    builtAt: null,
    validation: "local",
    repository: "",
    runId: "",
    buildUrl: "",
    deploymentTarget: "local"
  });
})();
