#!/usr/bin/env python3
"""MORPHORA V4.9.8 release-candidate audit.

This gate checks production invariants that are easy to regress while iterating:
semantic landmarks, duplicate ids, basic accessible wiring, external-link safety,
localization parity, runtime version/cache consistency, public-link hygiene, and
service-worker shell integrity. It intentionally complements (rather than
replaces) the schema/content validator and performance audit.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = ("index.html", "studio.html", "dev-tools.html", "performance-lab.html")
CSS_FILES = ("style.css", "design-system.css", "studio/studio.css", "dev-tools.css", "performance-lab.css")
LOCALES = ("en", "es")


@dataclass
class Audit:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    passes: list[str] = field(default_factory=list)

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warning(self, message: str) -> None:
        self.warnings.append(message)

    def passed(self, message: str) -> None:
        self.passes.append(message)


class HtmlAuditParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.references: list[tuple[str, str]] = []
        self.target_blank: list[tuple[str, str]] = []
        self.images_without_alt: list[str] = []
        self.buttons_without_type: int = 0
        self.main_count = 0
        self.html_lang = ""
        self.local_versioned_assets: list[tuple[str, str]] = []
        self.meta_names: set[str] = set()
        self.meta_properties: set[str] = set()
        self.has_title = False

    def handle_starttag(self, tag: str, attrs) -> None:
        values = dict(attrs)
        if tag == "html":
            self.html_lang = values.get("lang", "")
        if tag == "title":
            self.has_title = True
        if tag == "main":
            self.main_count += 1
        if values.get("id"):
            self.ids.append(values["id"])
        for attribute in ("aria-controls", "aria-labelledby", "aria-describedby", "for"):
            if values.get(attribute):
                for target in values[attribute].split():
                    self.references.append((attribute, target))
        if tag == "img" and "alt" not in values:
            self.images_without_alt.append(values.get("src", "<inline image>"))
        if tag == "button" and "type" not in values:
            self.buttons_without_type += 1
        if tag == "a" and values.get("target") == "_blank":
            self.target_blank.append((values.get("href", ""), values.get("rel", "")))
        if tag == "meta":
            if values.get("name"):
                self.meta_names.add(values["name"].lower())
            if values.get("property"):
                self.meta_properties.add(values["property"].lower())
        for attribute in ("src", "href"):
            value = values.get(attribute, "")
            if not value or value.startswith(("http://", "https://", "mailto:", "data:", "blob:", "#")):
                continue
            match = re.search(r"[?&]v=([^&#]+)", value)
            if match:
                self.local_versioned_assets.append((value, match.group(1)))


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def find_js_version(text: str, pattern: str) -> str | None:
    match = re.search(pattern, text)
    return match.group(1) if match else None


def audit_html(audit: Audit, version: str) -> None:
    for name in HTML_FILES:
        path = ROOT / name
        parser = HtmlAuditParser()
        parser.feed(path.read_text(encoding="utf-8"))
        ids = Counter(parser.ids)
        duplicates = sorted(key for key, count in ids.items() if count > 1)
        if duplicates:
            audit.error(f"{name}: duplicate id(s): {', '.join(duplicates)}")
        unresolved = sorted({target for _, target in parser.references if target not in ids})
        if unresolved:
            audit.error(f"{name}: unresolved ARIA/form target(s): {', '.join(unresolved)}")
        if parser.images_without_alt:
            audit.error(f"{name}: image(s) missing alt attribute: {', '.join(parser.images_without_alt[:8])}")
        if parser.buttons_without_type:
            audit.error(f"{name}: {parser.buttons_without_type} button(s) omit explicit type=button/submit")
        unsafe = [href for href, rel in parser.target_blank if not {"noopener", "noreferrer"}.issubset(set(rel.split()))]
        if unsafe:
            audit.error(f"{name}: target=_blank link(s) missing rel=noopener noreferrer: {', '.join(unsafe[:8])}")
        if parser.main_count != 1:
            audit.error(f"{name}: expected exactly one <main> landmark; found {parser.main_count}")
        if parser.html_lang not in LOCALES:
            audit.error(f"{name}: <html lang> must be a supported locale; found {parser.html_lang!r}")
        if not parser.has_title:
            audit.error(f"{name}: missing <title>")
        for asset, asset_version in parser.local_versioned_assets:
            if asset_version != version:
                audit.error(f"{name}: local asset version drift: {asset} (expected {version})")

    index_parser = HtmlAuditParser()
    index_parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    for required in ("viewport", "description", "theme-color"):
        if required not in index_parser.meta_names:
            audit.error(f"index.html: missing meta name={required!r}")
    for required in ("og:title", "og:description", "og:type", "og:url"):
        if required not in index_parser.meta_properties:
            audit.warning(f"index.html: missing social metadata property={required!r}")

    if not audit.errors:
        audit.passed("HTML landmarks, ids, form/ARIA references, image alts, button types, and external-link safety checked")


def audit_versions(audit: Audit, version: str) -> None:
    checks = {
        "app-config.js": (r'version:\s*"([^"]+)"',),
        "release-meta.js": (r'version:\s*"([^"]+)"',),
        "service-worker.js": (r'const VERSION = .*?\|\|\s*"([^"]+)"',),
        "tools/validation_core.py": (r'VALIDATOR_VERSION\s*=\s*"([^"]+)"',),
    }
    for name, patterns in checks.items():
        text = (ROOT / name).read_text(encoding="utf-8")
        found = next((find_js_version(text, pattern) for pattern in patterns if find_js_version(text, pattern)), None)
        if found != version:
            audit.error(f"{name}: runtime version is {found!r}; expected {version!r}")

    release = read_json(ROOT / "release.json")
    if release.get("version") != version:
        audit.error(f"release.json: version {release.get('version')!r} != {version!r}")
    if not str(release.get("assetVersion", "")).startswith(f"{version}-"):
        audit.error("release.json: assetVersion must be namespaced by semantic version")

    for rel in ("navigation.js", "performance.js", "study.js", "dev-tools.js", "studio/studio.js", "i18n/language-manager.js"):
        text = (ROOT / rel).read_text(encoding="utf-8")
        stale = sorted(set(re.findall(r'4\.9\.\d+(?:\.\d+)?(?:-dev)?', text)) - {version, f"{version}-dev"})
        if stale:
            audit.error(f"{rel}: stale runtime version literal(s): {', '.join(stale)}")

    if not any("version" in item.lower() for item in audit.errors):
        audit.passed(f"Runtime, release metadata, validator, and HTML cache-busters aligned to V{version}")


def audit_i18n(audit: Audit) -> None:
    dictionaries = {locale: read_json(ROOT / "i18n" / f"{locale}.json") for locale in LOCALES}
    keys = set(dictionaries["en"])
    for locale, dictionary in dictionaries.items():
        missing = sorted(keys - set(dictionary))
        extra = sorted(set(dictionary) - keys)
        empty = sorted(key for key, value in dictionary.items() if not isinstance(value, str) or not value.strip())
        if missing:
            audit.error(f"i18n/{locale}.json: missing {len(missing)} key(s): {', '.join(missing[:12])}")
        if extra:
            audit.error(f"i18n/{locale}.json: extra key(s) not shared by EN: {', '.join(extra[:12])}")
        if empty:
            audit.error(f"i18n/{locale}.json: empty/non-string value(s): {', '.join(empty[:12])}")

    required = {
        "status.offline", "status.connectionRestored", "viewer.compatibleImage", "viewer.fallbackOpened",
        "species.dataUnavailable", "species.libraryUnavailable", "theme.switchDark", "theme.switchLight",
    }
    for key in sorted(required):
        for locale in LOCALES:
            if not dictionaries[locale].get(key):
                audit.error(f"i18n/{locale}.json: missing V4.9.8 runtime key {key}")

    manager = (ROOT / "i18n/language-manager.js").read_text(encoding="utf-8")
    if 'event.key === "ArrowDown"' not in manager or 'event.key === "Home"' not in manager:
        audit.error("language-manager.js: language menu keyboard navigation gate not present")
    if not any("i18n/" in item for item in audit.errors):
        audit.passed(f"Localization parity checked across {len(keys)} UI keys in EN/ES, including keyboard language selection")


def audit_service_worker(audit: Audit) -> None:
    text = (ROOT / "service-worker.js").read_text(encoding="utf-8")
    match = re.search(r"const APP_SHELL = \[(.*?)\];", text, re.S)
    if not match:
        audit.error("service-worker.js: APP_SHELL not found")
        return
    entries = re.findall(r'"([^"]+)"', match.group(1))
    duplicates = sorted(key for key, count in Counter(entries).items() if count > 1)
    if duplicates:
        audit.error(f"service-worker.js: duplicate APP_SHELL entries: {', '.join(duplicates)}")
    for value in entries:
        relative = value[2:] if value.startswith("./") else value
        target = ROOT / ("index.html" if relative in {"", "."} else relative)
        if not target.exists():
            audit.error(f"service-worker.js: APP_SHELL asset missing: {value}")
    required = {
        "./index.html", "./app-config.js", "./release-meta.js", "./i18n/language-manager.js",
        "./i18n/en.json", "./i18n/es.json", "./accessibility.js", "./performance.js", "./style.css",
    }
    missing = sorted(required - set(entries))
    if missing:
        audit.error(f"service-worker.js: critical shell entry/entries missing: {', '.join(missing)}")
    if not any("service-worker" in item for item in audit.errors):
        audit.passed(f"Service-worker shell verified ({len(entries)} versioned runtime assets)")


def audit_css_and_links(audit: Audit) -> None:
    for name in CSS_FILES:
        text = (ROOT / name).read_text(encoding="utf-8")
        if "\\n" in text:
            audit.error(f"{name}: contains literal \\n sequence; possible malformed appended CSS")
    style = (ROOT / "style.css").read_text(encoding="utf-8")
    if 'content: attr(data-fallback-label);' not in style:
        audit.error("style.css: fallback-image badge is not runtime-localizable")
    if "@media (prefers-reduced-motion: reduce)" not in style:
        audit.error("style.css: reduced-motion safeguard missing")
    if "env(safe-area-inset-bottom)" not in style:
        audit.error("style.css: mobile safe-area handling missing")

    config = (ROOT / "app-config.js").read_text(encoding="utf-8")
    if re.search(r'publicLinks:.*?http://', config, re.S):
        audit.error("app-config.js: insecure HTTP public link detected")
    for expected in ("mailto:ADMIN@MORPHORA.cl", "youtube.com", "instagram.com", "tiktok.com"):
        if expected not in config:
            audit.error(f"app-config.js: public contact/social target missing: {expected}")

    if not any(name in item for item in audit.errors for name in CSS_FILES):
        audit.passed("CSS corruption sentinel, reduced-motion, safe-area, and localized fallback badge checked")
    if not any("public" in item.lower() for item in audit.errors):
        audit.passed("Public contact/social endpoints checked for expected secure destinations")


def write_report(audit: Audit, version: str) -> None:
    report = {
        "product": "MORPHORA",
        "version": version,
        "gate": "release-candidate",
        "summary": {"errors": len(audit.errors), "warnings": len(audit.warnings), "passes": len(audit.passes)},
        "errors": audit.errors,
        "warnings": audit.warnings,
        "passes": audit.passes,
    }
    reports = ROOT / "reports"
    reports.mkdir(exist_ok=True)
    (reports / "release-candidate-audit.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = [
        f"MORPHORA V{version} — Release Candidate Audit",
        "",
        f"Result: {len(audit.errors)} error(s), {len(audit.warnings)} warning(s), {len(audit.passes)} pass record(s)",
        "",
    ]
    lines += [f"✓ {item}" for item in audit.passes]
    lines += [f"! {item}" for item in audit.warnings]
    lines += [f"✗ {item}" for item in audit.errors]
    (reports / "release-candidate-audit.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    audit = Audit()
    package = read_json(ROOT / "package.json")
    version = str(package.get("version") or "")
    if version != "4.9.8":
        audit.error(f"package.json: V4.9.8 gate expected version 4.9.8; found {version!r}")

    audit_html(audit, version)
    audit_versions(audit, version)
    audit_i18n(audit)
    audit_service_worker(audit)
    audit_css_and_links(audit)
    write_report(audit, version)

    print(f"MORPHORA V{version} release-candidate audit")
    for item in audit.passes:
        print(f"✓ {item}")
    for item in audit.warnings:
        print(f"! {item}")
    for item in audit.errors:
        print(f"✗ {item}")
    print(f"Result: {len(audit.errors)} error(s), {len(audit.warnings)} warning(s), {len(audit.passes)} pass record(s)")
    return 1 if audit.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
