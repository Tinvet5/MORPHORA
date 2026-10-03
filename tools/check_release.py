#!/usr/bin/env python3
"""Validate the generated MORPHORA `dist/` deployment artifact."""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
ESSENTIAL = {
    "index.html", "studio.html", "dev-tools.html", "performance-lab.html", "app-config.js", "release-meta.js",
    "release.json", "models.js", "storage.js", "i18n/language-manager.js", "i18n/es.json", "i18n/en.json", "style.css", "script.js", "study.js", "drawing.js",
    "navigation.js", "performance.js", "performance-lab.js", "performance-lab.css", "accessibility.js", "service-worker.js",
    "data/catalog.json", "studio/studio.js", "studio/studio.css", "validation/rules.js",
    ".nojekyll",
}
FORBIDDEN_TOP_LEVEL = {"tools", "source-images", "reports", ".github", ".git", ".morphora-backups", "node_modules"}


class AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.assets: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        values = dict(attrs)
        for key in ("src", "href"):
            value = values.get(key)
            if value:
                self.assets.append(value)


def local_path(value: str) -> str | None:
    if value.startswith(("#", "data:", "mailto:", "tel:", "javascript:")):
        return None
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return None
    path = parsed.path.lstrip("/")
    return path or None


def main() -> int:
    problems: list[str] = []
    if not DIST.is_dir():
        print("Release check failed: dist/ does not exist. Run `npm run build:release` first.")
        return 1

    missing = sorted(path for path in ESSENTIAL if not (DIST / path).exists())
    problems.extend(f"Missing release file: {path}" for path in missing)
    problems.extend(f"Development-only directory leaked into dist/: {name}" for name in sorted(FORBIDDEN_TOP_LEVEL) if (DIST / name).exists())

    try:
        release = json.loads((DIST / "release.json").read_text(encoding="utf-8"))
    except Exception as exc:
        release = {}
        problems.append(f"release.json could not be parsed: {exc}")

    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    version = package.get("version")
    if release.get("version") != version:
        problems.append(f"release.json version {release.get('version')!r} does not match package.json {version!r}")
    asset_version = release.get("assetVersion")
    if not isinstance(asset_version, str) or not asset_version.startswith(f"{version}-"):
        problems.append(f"Invalid release assetVersion: {asset_version!r}")
    if release.get("validation") != "passed":
        problems.append("Release metadata does not record validation=passed")
    if release.get("releaseCandidate") != "passed":
        problems.append("Release metadata does not record releaseCandidate=passed")

    for html_name in ("index.html", "studio.html", "dev-tools.html", "performance-lab.html"):
        html_path = DIST / html_name
        if not html_path.is_file():
            continue
        text = html_path.read_text(encoding="utf-8")
        if asset_version and f"?v={asset_version}" not in text:
            problems.append(f"{html_name}: deployment asset version was not injected")
        parser = AssetParser()
        parser.feed(text)
        for asset in parser.assets:
            rel = local_path(asset)
            if rel and not (DIST / rel).exists():
                problems.append(f"{html_name}: local deployment asset missing: {rel}")

    sw = (DIST / "service-worker.js").read_text(encoding="utf-8") if (DIST / "service-worker.js").is_file() else ""
    if 'importScripts("./release-meta.js", "./app-config.js")' not in sw:
        problems.append("service-worker.js does not load deployment release metadata before app-config.js")
    release_meta = (DIST / "release-meta.js").read_text(encoding="utf-8") if (DIST / "release-meta.js").is_file() else ""
    if asset_version and asset_version not in release_meta:
        problems.append("release-meta.js does not contain the deployment asset version")

    if problems:
        print("MORPHORA release artifact check failed\n")
        for problem in problems:
            print(f"✗ {problem}")
        return 1

    print("MORPHORA release artifact check")
    print(f"✓ Version: {version}")
    print(f"✓ Asset version: {asset_version}")
    print("✓ Validation status: passed")
    print("✓ Release candidate gate: passed")
    print("✓ Development-only directories excluded")
    print("✓ HTML deployment assets resolved")
    print("✓ Release-aware service worker configured")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
