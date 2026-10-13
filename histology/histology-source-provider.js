(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MorphoraHistologySource = api;
})(typeof window !== "undefined" ? window : (typeof self !== "undefined" ? self : globalThis), function () {
  "use strict";

  const VALID_MODES = new Set(["auto", "hosted", "local"]);

  function normalizeMode(value) {
    const mode = String(value || "auto").toLowerCase();
    return VALID_MODES.has(mode) ? mode : "auto";
  }

  function resolveUrl(value, baseUrl) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try { return new URL(raw, baseUrl || (typeof location !== "undefined" ? location.href : "http://localhost/")).toString(); }
    catch (_) { return raw; }
  }

  function parseAttributes(raw) {
    const attrs = {};
    String(raw || "").replace(/([A-Za-z_:][\w:.-]*)\s*=\s*["']([^"']*)["']/g, (_, key, value) => {
      attrs[key.toLowerCase()] = value;
      return _;
    });
    return attrs;
  }

  function descriptorParts(descriptorUrl) {
    const url = new URL(descriptorUrl, typeof location !== "undefined" ? location.href : "http://localhost/");
    const segments = url.pathname.split("/");
    const file = segments.pop() || "slide.dzi";
    const stem = file.replace(/\.dzi$/i, "") || "slide";
    segments.push(`${stem}_files`, "");
    const filesBase = new URL(url.toString());
    filesBase.pathname = segments.join("/");
    filesBase.search = "";
    filesBase.hash = "";
    return { descriptorUrl:url.toString(), filesBase:filesBase.toString() };
  }

  function parseDziDescriptor(xmlText, descriptorUrl, fallbackImage = {}) {
    const xml = String(xmlText || "");
    const imageMatch = xml.match(/<Image\b([^>]*)>/i);
    const sizeMatch = xml.match(/<Size\b([^>]*)\/?\s*>/i);
    if (!imageMatch || !sizeMatch) throw new Error("Invalid DZI descriptor: Image/Size metadata is missing.");
    const imageAttrs = parseAttributes(imageMatch[1]);
    const sizeAttrs = parseAttributes(sizeMatch[1]);
    const width = Number.parseInt(sizeAttrs.width, 10);
    const height = Number.parseInt(sizeAttrs.height, 10);
    const tileSize = Number.parseInt(imageAttrs.tilesize, 10);
    const overlap = Number.parseInt(imageAttrs.overlap || "0", 10);
    const format = String(imageAttrs.format || "jpg").toLowerCase();
    if (![width, height, tileSize].every(Number.isFinite) || width < 1 || height < 1 || tileSize < 1) throw new Error("Invalid DZI descriptor dimensions or tile size.");
    if (!/^[a-z0-9]+$/i.test(format)) throw new Error("Invalid DZI tile format.");
    const { filesBase, descriptorUrl:resolvedDescriptorUrl } = descriptorParts(resolveUrl(descriptorUrl));
    const maxLevel = Math.ceil(Math.log2(Math.max(width, height)));
    const mppX = Number(fallbackImage.micrometresPerPixelX || fallbackImage.mppX || 0);
    const mppY = Number(fallbackImage.micrometresPerPixelY || fallbackImage.mppY || mppX || 0);
    return {
      provider:"hosted-dzi",
      descriptorUrl:resolvedDescriptorUrl,
      filesBase,
      Width:width,
      Height:height,
      TileSize:tileSize,
      TileOverlap:Number.isFinite(overlap) ? overlap : 0,
      TileFormat:format,
      MaxZoomLevel:maxLevel,
      MicrometresPerPixelX:Number.isFinite(mppX) ? mppX : 0,
      MicrometresPerPixelY:Number.isFinite(mppY) ? mppY : 0,
      FileFormat:`DZI (${format.toUpperCase()})`
    };
  }

  function tileUrl(info, level, x, y) {
    const base = new URL(info.filesBase);
    const path = `${Number(level)}/${Number(x)}_${Number(y)}.${info.TileFormat}`;
    return new URL(path, base).toString();
  }

  function createDziTileSource(info) {
    return {
      width:info.Width,
      height:info.Height,
      tileSize:info.TileSize,
      tileOverlap:info.TileOverlap || 0,
      minLevel:0,
      maxLevel:info.MaxZoomLevel,
      getTileUrl(level, x, y) { return tileUrl(info, level, x, y); }
    };
  }

  function resolveCandidates({ mode="auto", hostedDescriptorUrl="", localAvailable=true } = {}) {
    const normalized = normalizeMode(mode);
    const hostedReady = Boolean(String(hostedDescriptorUrl || "").trim());
    if (normalized === "hosted") return hostedReady ? ["hosted-dzi"] : [];
    if (normalized === "local") return localAvailable ? ["pma-start"] : [];
    const candidates = [];
    if (hostedReady) candidates.push("hosted-dzi");
    if (localAvailable) candidates.push("pma-start");
    return candidates;
  }

  return Object.freeze({ normalizeMode, resolveUrl, parseDziDescriptor, createDziTileSource, tileUrl, resolveCandidates });
});
