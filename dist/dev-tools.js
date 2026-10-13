(() => {
  "use strict";

  const Config = window.MORPHORA_CONFIG || {};
  const Validation = window.MorphoraValidation;
  const Models = window.MorphoraModels;
  const Storage = window.MorphoraStorage;
  const elements = {
    rerun: document.getElementById("rerunButton"),
    version: document.getElementById("versionPill"),
    status: document.getElementById("overallStatus"),
    runtimeBadge: document.getElementById("runtimeBadge"),
    progressBar: document.getElementById("progressBar"),
    progressText: document.getElementById("progressText"),
    issueList: document.getElementById("issueList"),
    cliReport: document.getElementById("cliReport"),
    species: document.getElementById("speciesCount"),
    collections: document.getElementById("collectionCount"),
    views: document.getElementById("viewCount"),
    labels: document.getElementById("labelCount"),
    errors: document.getElementById("errorCount"),
    warnings: document.getElementById("warningCount"),
    releaseBadge: document.getElementById("releaseBadge"),
    runtimeReleaseVersion: document.getElementById("runtimeReleaseVersion"),
    runtimeReleaseCommit: document.getElementById("runtimeReleaseCommit"),
    artifactReleaseVersion: document.getElementById("artifactReleaseVersion"),
    artifactReleaseCommit: document.getElementById("artifactReleaseCommit"),
    releaseBuiltAt: document.getElementById("releaseBuiltAt"),
    releaseBuildLink: document.getElementById("releaseBuildLink"),
    storageBadge: document.getElementById("storageBadge"),
    storageBackendStatus: document.getElementById("storageBackendStatus"),
    storageQuotaStatus: document.getElementById("storageQuotaStatus"),
    storagePersistenceStatus: document.getElementById("storagePersistenceStatus"),
    storageRecoveryCount: document.getElementById("storageRecoveryCount"),
    requestPersistence: document.getElementById("requestPersistenceButton"),
    exportPersonalBackup: document.getElementById("exportPersonalBackupButton"),
    importPersonalBackup: document.getElementById("importPersonalBackupButton"),
    personalBackupImportInput: document.getElementById("personalBackupImportInput")
  };

  const state = { issues: [], counts: { species: 0, collections: 0, views: 0, labels: 0 } };

  function issue(severity, code, message, path = "") {
    state.issues.push({ severity, code, message, path });
  }

  async function fetchJson(path, label) {
    const response = await fetch(`${path}${path.includes("?") ? "&" : "?"}v=${encodeURIComponent(Config.assetVersion || Config.version || "4.9.8-dev")}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${label}: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return data;
  }

  async function assetExists(path) {
    if (!path || /^(?:https?:|data:|blob:)/i.test(path)) return true;
    try {
      const response = await fetch(path, { method: "HEAD", cache: "no-store" });
      if (response.ok) return true;
      if (response.status === 405) {
        const fallback = await fetch(path, { cache: "no-store" });
        return fallback.ok;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  function setProgress(done, total, text) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    elements.progressBar.style.width = `${pct}%`;
    elements.progressText.textContent = text;
  }

  function render() {
    const errors = state.issues.filter((item) => item.severity === "error");
    const warnings = state.issues.filter((item) => item.severity === "warning");
    elements.species.textContent = state.counts.species;
    elements.collections.textContent = state.counts.collections;
    elements.views.textContent = state.counts.views;
    elements.labels.textContent = state.counts.labels;
    elements.errors.textContent = errors.length;
    elements.warnings.textContent = warnings.length;

    const level = errors.length ? "error" : warnings.length ? "warning" : "pass";
    elements.status.dataset.level = level;
    const strong = elements.status.querySelector("strong");
    const small = elements.status.querySelector("small");
    strong.textContent = errors.length ? "Validation errors found" : warnings.length ? "Healthy with review items" : "Project graph healthy";
    small.textContent = errors.length ? `${errors.length} error${errors.length === 1 ? "" : "s"} require attention.` : warnings.length ? `${warnings.length} warning${warnings.length === 1 ? "" : "s"} to review.` : "No browser-detectable content problems found.";
    elements.runtimeBadge.className = `badge ${level}`;
    elements.runtimeBadge.textContent = level === "pass" ? "Pass" : level === "warning" ? "Review" : "Errors";

    elements.issueList.replaceChildren();
    const visible = state.issues.filter((item) => item.severity !== "pass");
    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "✓ No browser-detectable errors or warnings.";
      elements.issueList.appendChild(empty);
      return;
    }
    visible.slice(0, 100).forEach((item) => {
      const row = document.createElement("div");
      row.className = "issue";
      row.dataset.severity = item.severity;
      const symbol = document.createElement("div");
      symbol.className = "issue-symbol";
      symbol.textContent = item.severity === "error" ? "×" : "!";
      const copy = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = item.code || (item.severity === "error" ? "Error" : "Warning");
      const text = document.createElement("p");
      text.textContent = item.path ? `${item.path} — ${item.message}` : item.message;
      copy.append(heading, text);
      row.append(symbol, copy);
      elements.issueList.appendChild(row);
    });
  }

  async function runDiagnostics() {
    state.issues = [];
    state.counts = { species: 0, collections: 0, views: 0, labels: 0 };
    elements.rerun.disabled = true;
    elements.runtimeBadge.className = "badge";
    elements.runtimeBadge.textContent = "Running";
    setProgress(0, 1, "Loading catalog…");

    try {
      const catalog = Models?.migrate ? Models.migrate("catalog", await fetchJson("data/catalog.json", "Catalog")) : await fetchJson("data/catalog.json", "Catalog");
      const catalogResult = Models?.validate?.("catalog", catalog) || { errors: [], warnings: [] };
      catalogResult.errors.forEach((message) => issue("error", "CATALOG_MODEL", message, "data/catalog.json"));
      catalogResult.warnings.forEach((message) => issue("warning", "CATALOG_REVIEW", message, "data/catalog.json"));
      const availableSpecies = (catalog.species || []).filter((entry) => entry.status === "available" && entry.dataPath);
      state.counts.species = availableSpecies.length;

      const tasks = [];
      for (const speciesEntry of availableSpecies) {
        tasks.push({ type: "species", speciesEntry });
      }
      let completed = 0;
      const dynamicTasks = [...tasks];
      while (dynamicTasks.length) {
        const task = dynamicTasks.shift();
        if (task.type === "species") {
          try {
            const species = Models?.migrate ? Models.migrate("species", await fetchJson(task.speciesEntry.dataPath, `Species ${task.speciesEntry.id}`)) : await fetchJson(task.speciesEntry.dataPath, `Species ${task.speciesEntry.id}`);
            const result = Models?.validate?.("species", species, { expectedId: task.speciesEntry.id }) || { errors: [], warnings: [] };
            result.errors.forEach((message) => issue("error", "SPECIES_MODEL", message, task.speciesEntry.dataPath));
            result.warnings.forEach((message) => issue("warning", "SPECIES_REVIEW", message, task.speciesEntry.dataPath));
            (species.systems || []).forEach((system) => {
              (system.collections || []).filter((entry) => entry.manifestPath).forEach((collection) => {
                dynamicTasks.push({ type: "collection", species, system, collection });
              });
            });
          } catch (error) {
            issue("error", "SPECIES_LOAD", error.message, task.speciesEntry.dataPath);
          }
        } else if (task.type === "collection") {
          state.counts.collections += 1;
          try {
            const manifest = Models?.migrate ? Models.migrate("collection", await fetchJson(task.collection.manifestPath, `Collection ${task.collection.id}`)) : await fetchJson(task.collection.manifestPath, `Collection ${task.collection.id}`);
            const result = Models?.validate?.("collection", manifest) || { errors: [], warnings: [] };
            result.errors.forEach((message) => issue("error", "COLLECTION_MODEL", message, task.collection.manifestPath));
            result.warnings.forEach((message) => issue("warning", "COLLECTION_REVIEW", message, task.collection.manifestPath));
            (manifest.views || []).forEach((viewEntry) => dynamicTasks.push({ type: "view", collection: task.collection, manifest, viewEntry }));
          } catch (error) {
            issue(task.collection.status === "available" ? "error" : "warning", "COLLECTION_LOAD", error.message, task.collection.manifestPath);
          }
        } else if (task.type === "view") {
          state.counts.views += 1;
          try {
            const raw = await fetchJson(task.viewEntry.dataPath, `View ${task.viewEntry.id}`);
            const result = Validation?.validateView ? Validation.validateView(raw, { expectedId: task.viewEntry.id }) : { data: raw, issues: [] };
            state.counts.labels += Array.isArray(result.data?.labels) ? result.data.labels.length : 0;
            (result.issues || []).forEach((item) => issue(item.severity, item.code, item.message, `${task.viewEntry.dataPath}${item.path ? ` · ${item.path}` : ""}`));

            const required = result.data?.status === "published" && task.collection.status === "available";
            const assets = [
              [result.data?.image?.src, "IMAGE_SOURCE"],
              [result.data?.image?.thumbnail || task.viewEntry.thumbnail, "THUMBNAIL"],
              [result.data?.image?.type === "dzi" ? result.data?.image?.fallback : null, "DZI_FALLBACK"]
            ].filter(([path]) => path);
            for (const [asset, code] of assets) {
              const exists = await assetExists(asset);
              if (!exists) issue(required ? "error" : "warning", code, `Asset could not be fetched: ${asset}`, task.viewEntry.dataPath);
            }
          } catch (error) {
            issue(task.collection.status === "available" ? "error" : "warning", "VIEW_LOAD", error.message, task.viewEntry.dataPath);
          }
        }
        completed += 1;
        setProgress(completed, Math.max(completed + dynamicTasks.length, 1), `Checking project graph… ${completed}`);
      }
    } catch (error) {
      issue("error", "CATALOG_LOAD", error.message, "data/catalog.json");
    } finally {
      setProgress(1, 1, "Runtime scan complete.");
      render();
      elements.rerun.disabled = false;
    }
  }


  async function loadReleaseStatus() {
    const runtime = window.MORPHORA_RELEASE || {};
    elements.runtimeReleaseVersion.textContent = runtime.version ? `V${runtime.version}` : "Unknown";
    elements.runtimeReleaseCommit.textContent = runtime.shortCommit || runtime.commit || "local";

    try {
      const response = await fetch(`release.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`release.json returned ${response.status}`);
      const artifact = await response.json();
      elements.artifactReleaseVersion.textContent = artifact.version ? `V${artifact.version}` : "Unknown";
      elements.artifactReleaseCommit.textContent = artifact.shortCommit || artifact.commit || "unknown";
      const matches = runtime.version === artifact.version && runtime.assetVersion === artifact.assetVersion;
      elements.releaseBadge.className = `badge ${matches ? "pass" : "warning"}`;
      elements.releaseBadge.textContent = matches ? "Matched" : "Review";
      const built = artifact.builtAt ? new Date(artifact.builtAt).toLocaleString() : "local development metadata";
      elements.releaseBuiltAt.textContent = `${artifact.deploymentTarget || "local"} · ${artifact.validation || "unknown"} · ${built}`;
      if (artifact.buildUrl) {
        elements.releaseBuildLink.href = artifact.buildUrl;
        elements.releaseBuildLink.hidden = false;
      } else {
        elements.releaseBuildLink.hidden = true;
      }
    } catch (error) {
      elements.artifactReleaseVersion.textContent = "Unavailable";
      elements.artifactReleaseCommit.textContent = "—";
      elements.releaseBadge.className = "badge warning";
      elements.releaseBadge.textContent = "Local";
      elements.releaseBuiltAt.textContent = "No built release.json found. Run npm run release:verify for a deployment artifact.";
      elements.releaseBuildLink.hidden = true;
    }
  }


  function formatBytes(value) {
    if (!Number.isFinite(value)) return "Unknown";
    if (value < 1024) return `${value} B`;
    const units = ["KiB", "MiB", "GiB"];
    let size = value / 1024;
    let unit = units[0];
    for (let index = 1; index < units.length && size >= 1024; index += 1) {
      size /= 1024;
      unit = units[index];
    }
    return `${size >= 100 ? size.toFixed(0) : size >= 10 ? size.toFixed(1) : size.toFixed(2)} ${unit}`;
  }

  async function loadStorageStatus() {
    if (!Storage?.health) {
      elements.storageBadge.className = "badge error";
      elements.storageBadge.textContent = "Unavailable";
      elements.storageBackendStatus.textContent = "Storage layer missing";
      elements.storageQuotaStatus.textContent = "—";
      elements.storagePersistenceStatus.textContent = "—";
      elements.storageRecoveryCount.textContent = "—";
      return;
    }
    const health = await Storage.health();
    const ratio = Number.isFinite(health.usageRatio) ? health.usageRatio : null;
    const warningRatio = Number(Config.storageWarningRatio || 0.85);
    const level = !health.localAvailable ? "error" : ratio !== null && ratio >= warningRatio ? "warning" : "pass";
    elements.storageBadge.className = `badge ${level}`;
    elements.storageBadge.textContent = level === "pass" ? "Healthy" : level === "warning" ? "Quota review" : "Unavailable";
    elements.storageBackendStatus.textContent = health.localAvailable
      ? health.memoryFallbackKeys.length ? `Browser + ${health.memoryFallbackKeys.length} session fallback` : "Browser persistent store"
      : "Session memory fallback only";
    elements.storageQuotaStatus.textContent = health.usage != null && health.quota
      ? `${formatBytes(health.usage)} / ${formatBytes(health.quota)} (${Math.round((health.usage / health.quota) * 100)}%)`
      : "Estimate unavailable";
    elements.storagePersistenceStatus.textContent = health.persisted === true ? "Granted" : health.persisted === false ? "Best effort" : "Unknown";
    elements.storageRecoveryCount.textContent = String(health.recoverySnapshots || 0);
  }

  async function requestPersistentStorage() {
    if (!Storage?.requestPersistence) return;
    elements.requestPersistence.disabled = true;
    const granted = await Storage.requestPersistence();
    elements.requestPersistence.textContent = granted ? "Persistence granted" : "Persistence not granted";
    await loadStorageStatus();
    window.setTimeout(() => {
      elements.requestPersistence.disabled = false;
      elements.requestPersistence.textContent = "Request persistence";
    }, 1800);
  }

  function exportPersonalBackup() {
    if (!Storage?.createBackup) return;
    const payload = Storage.createBackup({ includePreferences: true, includeStudioDrafts: false });
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `morphora-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importPersonalBackup(file) {
    if (!file || !Storage?.importBackup) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.kind !== "personal-data-bundle" || !parsed.stores) {
        throw new Error("This is not a MORPHORA personal-data bundle.");
      }
      const storeNames = ["annotations", "drawings", "learningProgress"].filter((name) => parsed.stores[name]);
      const confirmed = window.confirm(`Restore this MORPHORA backup? It will replace ${storeNames.join(", ") || "personal data"} on this browser. An automatic recovery snapshot will be created first.`);
      if (!confirmed) return;
      const results = Storage.importBackup(parsed, { includePreferences: true, includeStudioDrafts: false });
      const failed = results.filter((result) => !result.ok);
      if (failed.length) throw new Error("Some personal data could not be written permanently. Browser storage may be full.");
      elements.importPersonalBackup.textContent = "Backup restored";
      await loadStorageStatus();
      window.setTimeout(() => { elements.importPersonalBackup.textContent = "Import personal backup"; }, 1800);
    } catch (error) {
      console.error("Could not import MORPHORA personal backup.", error);
      window.alert(error.message || "The MORPHORA backup could not be imported.");
    } finally {
      elements.personalBackupImportInput.value = "";
    }
  }

  async function loadCliReport() {
    try {
      const response = await fetch(`reports/validation-report.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("No generated report found");
      const report = await response.json();
      elements.cliReport.innerHTML = `
        <div class="cli-summary">
          <span><strong>${report.summary?.errors ?? 0}</strong>Errors</span>
          <span><strong>${report.summary?.warnings ?? 0}</strong>Warnings</span>
          <span><strong>${report.summary?.passes ?? 0}</strong>Passes</span>
        </div>
        <p class="muted">Generated ${report.generatedAt ? new Date(report.generatedAt).toLocaleString() : "locally"} · validator ${report.validatorVersion || "unknown"}</p>`;
    } catch (_) {
      elements.cliReport.innerHTML = '<div class="empty-state">Run <code>npm run check</code>, then refresh this page to load the local CLI report.</div>';
    }
  }

  elements.version.textContent = `V${Config.version || "4.9.8"}`;
  elements.rerun.addEventListener("click", () => { runDiagnostics(); loadStorageStatus(); });
  elements.requestPersistence.addEventListener("click", requestPersistentStorage);
  elements.exportPersonalBackup.addEventListener("click", exportPersonalBackup);
  elements.importPersonalBackup.addEventListener("click", () => elements.personalBackupImportInput.click());
  elements.personalBackupImportInput.addEventListener("change", () => importPersonalBackup(elements.personalBackupImportInput.files?.[0]));
  loadCliReport();
  loadReleaseStatus();
  loadStorageStatus();
  runDiagnostics();
})();
