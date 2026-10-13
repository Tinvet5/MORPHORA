document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const Perf = window.MorphoraPerformance;
  const Config = window.MORPHORA_CONFIG || {};
  if (!Perf) return;

  const el = (id) => document.getElementById(id);
  const elements = {
    refresh: el("refreshMetrics"), export: el("exportMetrics"), clear: el("clearHistory"),
    profileName: el("profileName"), profileReason: el("profileReason"), networkType: el("networkType"), networkDetail: el("networkDetail"),
    hardwareSummary: el("hardwareSummary"), hardwareDetail: el("hardwareDetail"), lcpValue: el("lcpValue"), lcpStatus: el("lcpStatus"),
    clsValue: el("clsValue"), clsStatus: el("clsStatus"), longTaskCount: el("longTaskCount"), longTaskDetail: el("longTaskDetail"),
    storageUsage: el("storageUsage"), storageDetail: el("storageDetail"), viewMetricsBody: el("viewMetricsBody"), viewHealthBadge: el("viewHealthBadge"),
    viewerImmediate: el("viewerImmediate"), viewerLoaderLimit: el("viewerLoaderLimit"), viewerCacheCount: el("viewerCacheCount"), viewerPixelRatio: el("viewerPixelRatio"),
    requestCount: el("requestCount"), transferBytes: el("transferBytes"), tileRequestCount: el("tileRequestCount"), jsonRequestCount: el("jsonRequestCount"),
    cacheList: el("cacheList"), targetList: el("targetList"), historyList: el("historyList")
  };

  function formatMs(value) {
    return Number.isFinite(value) ? `${Math.round(value)} ms` : "—";
  }

  function formatBytes(value) {
    if (!Number.isFinite(value)) return "—";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  function targetState(value, target, lowerIsBetter = true) {
    if (!Number.isFinite(value) || !Number.isFinite(target)) return "unknown";
    const pass = lowerIsBetter ? value <= target : value >= target;
    return pass ? "pass" : "warning";
  }

  function lastViews(snapshot) {
    const all = [];
    for (const item of snapshot.history || []) {
      for (const view of item.views || []) all.push(view);
    }
    for (const view of snapshot.current?.views || []) all.push(view);
    const unique = new Map();
    for (const view of all) unique.set(view.id || `${view.viewId}-${view.startedAt}`, view);
    return Array.from(unique.values()).sort((a, b) => String(b.startedAt || "").localeCompare(String(a.startedAt || ""))).slice(0, 12);
  }

  function renderViews(snapshot) {
    const views = lastViews(snapshot);
    const target = snapshot.targets?.firstTileMs || 2000;
    if (!views.length) {
      elements.viewMetricsBody.innerHTML = '<tr><td colspan="6" class="empty-cell">No view measurements recorded yet. Open a few atlas views and return here.</td></tr>';
      elements.viewHealthBadge.className = "badge";
      elements.viewHealthBadge.textContent = "No data";
      return;
    }
    let warnings = 0;
    elements.viewMetricsBody.innerHTML = views.map((view) => {
      const firstTile = view.stages?.firstTile ?? view.durations?.firstTileMs ?? view.totalMs;
      const level = targetState(firstTile, target);
      if (level === "warning") warnings += 1;
      return `<tr>
        <td><strong>${escapeHtml(view.viewId || "Unknown")}</strong>${view.fromDataCache ? '<br><small>data cached</small>' : ""}</td>
        <td>${formatMs(view.stages?.dataReady)}</td>
        <td>${formatMs(view.stages?.viewerOpen)}</td>
        <td>${formatMs(firstTile)}</td>
        <td>${formatMs(view.totalMs)}</td>
        <td class="${level === "pass" ? "good" : "warning-text"}">${level === "pass" ? "Target" : "Review"}</td>
      </tr>`;
    }).join("");
    elements.viewHealthBadge.className = `badge ${warnings ? "warning" : "pass"}`;
    elements.viewHealthBadge.textContent = warnings ? `${warnings} to review` : "Within target";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function renderTargets(snapshot) {
    const t = snapshot.targets || {};
    const current = snapshot.current || {};
    const rows = [
      ["Largest contentful paint", current.vitals?.largestContentfulPaintMs, t.lcpMs, "ms"],
      ["Layout shift", current.vitals?.cumulativeLayoutShift, t.cls, "score"],
      ["First atlas tile", lastViews(snapshot)[0]?.stages?.firstTile, t.firstTileMs, "ms"]
    ];
    elements.targetList.innerHTML = rows.map(([label, value, target, unit]) => {
      const state = targetState(value, target);
      const shown = unit === "score" ? (Number.isFinite(value) ? value.toFixed(3) : "—") : formatMs(value);
      const targetShown = unit === "score" ? `≤ ${target}` : `≤ ${target} ms`;
      return `<div class="target-row"><span>${label}<br><small>Target ${targetShown}</small></span><strong data-level="${state}">${shown}</strong></div>`;
    }).join("");
  }

  function renderHistory(snapshot) {
    const history = [...(snapshot.history || [])].reverse().slice(0, 10);
    if (!history.length) {
      elements.historyList.innerHTML = '<div class="empty-state">No stored sessions yet.</div>';
      return;
    }
    elements.historyList.innerHTML = history.map((item) => {
      const date = item.startedAt ? new Date(item.startedAt).toLocaleString() : "Unknown time";
      const views = item.views?.length || 0;
      const profile = item.profile?.label || item.profile?.id || "Unknown profile";
      return `<div class="history-row"><div><strong>${escapeHtml(item.page || "/")}</strong><small>${escapeHtml(date)} · ${views} measured view${views === 1 ? "" : "s"}</small></div><span>${escapeHtml(profile)}</span></div>`;
    }).join("");
  }

  async function render() {
    const snapshot = await Perf.getSnapshot();
    const current = snapshot.current || {};
    const profile = current.profile || Perf.profile || {};
    const connection = current.connection || {};
    const hardware = current.hardware || {};
    const viewerOptions = snapshot.viewerOptions || {};

    elements.profileName.textContent = profile.label || profile.id || "Balanced";
    elements.profileReason.textContent = profile.reason || "Default runtime profile";
    elements.networkType.textContent = connection.effectiveType || (navigator.onLine ? "Online" : "Offline");
    elements.networkDetail.textContent = [
      Number.isFinite(connection.downlinkMbps) ? `${connection.downlinkMbps} Mbps` : null,
      Number.isFinite(connection.rttMs) ? `${connection.rttMs} ms RTT` : null,
      connection.saveData ? "Data Saver" : null
    ].filter(Boolean).join(" · ") || "Browser did not expose connection estimates";
    elements.hardwareSummary.textContent = Number.isFinite(hardware.deviceMemoryGb) ? `${hardware.deviceMemoryGb} GB hint` : "Browser-managed";
    elements.hardwareDetail.textContent = `${hardware.hardwareConcurrency || "?"} logical processors · ${hardware.coarsePointer ? "touch/coarse" : "fine pointer"}`;

    const lcp = current.vitals?.largestContentfulPaintMs;
    const cls = current.vitals?.cumulativeLayoutShift;
    elements.lcpValue.textContent = formatMs(lcp);
    elements.lcpStatus.textContent = Number.isFinite(lcp) && lcp <= (snapshot.targets?.lcpMs || 2500) ? "Within target" : "Largest contentful paint";
    elements.clsValue.textContent = Number.isFinite(cls) ? cls.toFixed(3) : "—";
    elements.clsStatus.textContent = Number.isFinite(cls) && cls <= (snapshot.targets?.cls || .1) ? "Stable" : "Layout stability";
    elements.longTaskCount.textContent = current.longTasks?.length ?? 0;
    const longest = Math.max(0, ...(current.longTasks || []).map((x) => x.durationMs || 0));
    elements.longTaskDetail.textContent = longest ? `Longest ${Math.round(longest)} ms` : "No long tasks recorded";

    const storage = current.storage;
    elements.storageUsage.textContent = storage ? formatBytes(storage.usageBytes) : "—";
    elements.storageDetail.textContent = storage ? `${formatBytes(storage.quotaBytes)} quota · ${storage.usageRatio ? Math.round(storage.usageRatio * 100) : 0}% used` : "Storage estimate unavailable";

    elements.viewerImmediate.textContent = viewerOptions.immediateRender ? "On" : "Off";
    elements.viewerLoaderLimit.textContent = viewerOptions.imageLoaderLimit ?? "Browser default";
    elements.viewerCacheCount.textContent = viewerOptions.maxImageCacheCount ?? "—";
    elements.viewerPixelRatio.textContent = viewerOptions.minPixelRatio ?? "—";

    elements.requestCount.textContent = current.resources?.requests ?? 0;
    elements.transferBytes.textContent = formatBytes(current.resources?.transferBytes || 0);
    elements.tileRequestCount.textContent = current.resources?.tileRequests ?? 0;
    elements.jsonRequestCount.textContent = current.resources?.jsonRequests ?? 0;

    const caches = current.caches || [];
    elements.cacheList.innerHTML = caches.length
      ? caches.map((cache) => `<div class="cache-row"><span>${escapeHtml(cache.name)}</span><strong>${cache.entries} entries</strong></div>`).join("")
      : '<div class="empty-state">No MORPHORA service-worker caches detected yet.</div>';

    renderViews(snapshot);
    renderTargets(snapshot);
    renderHistory(snapshot);
  }

  elements.refresh.addEventListener("click", render);
  elements.export.addEventListener("click", () => Perf.exportReport());
  elements.clear.addEventListener("click", () => {
    if (!confirm("Clear locally stored MORPHORA performance history on this browser?")) return;
    Perf.clearHistory();
    render();
  });

  document.addEventListener("morphora:performance-view-complete", render);
  window.setTimeout(render, 120);
});
