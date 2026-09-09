#!/usr/bin/env python3
"""Check MORPHORA HTML references, DOM ids, CSS balance, and shell assets."""

from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path


DYNAMIC_IDS = {"offlineStatus", "retryCatalog", "retrySpeciesData"}


class DocumentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.references: list[str] = []
        self.assets: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.add(values["id"])
        for name in ("aria-controls", "aria-labelledby", "aria-describedby", "for"):
            if values.get(name):
                self.references.extend(values[name].split())
        for name in ("src", "href"):
            value = values.get(name)
            if not value or value.startswith(("#", "http:", "https:", "data:", "mailto:")):
                continue
            self.assets.append(value.split("#", 1)[0].split("?", 1)[0])


def main() -> int:
    project_root = Path(__file__).resolve().parents[1]
    problems: list[str] = []

    documents = [
        ("index.html", ["script.js", "study.js", "navigation.js", "accessibility.js", "performance.js"]),
        ("studio.html", ["studio/studio.js", "accessibility.js", "performance.js"]),
    ]

    for html_name, script_names in documents:
        parser = DocumentParser()
        parser.feed((project_root / html_name).read_text(encoding="utf-8"))

        for reference in sorted(set(parser.references) - parser.ids):
            problems.append(f"{html_name}: missing ARIA/form target #{reference}")

        for asset in sorted(set(parser.assets)):
            if asset and not (project_root / asset).exists():
                problems.append(f"{html_name}: local asset not found: {asset}")

        script_ids: set[str] = set()
        for script_name in script_names:
            text = (project_root / script_name).read_text(encoding="utf-8")
            script_ids.update(re.findall(r"getElementById\([\"']([^\"']+)", text))

        for reference in sorted((script_ids - parser.ids) - DYNAMIC_IDS):
            problems.append(f"{html_name}: JavaScript expects missing element #{reference}")

    for css_name in ("style.css", "studio/studio.css"):
        text = (project_root / css_name).read_text(encoding="utf-8")
        if text.count("{") != text.count("}"):
            problems.append(f"{css_name}: unbalanced braces")

    service_worker = (project_root / "service-worker.js").read_text(encoding="utf-8")
    shell_match = re.search(r"const APP_SHELL = \[(.*?)\];", service_worker, re.S)
    if not shell_match:
        problems.append("service-worker.js: APP_SHELL list not found")
    else:
        for value in re.findall(r'"([^"]+)"', shell_match.group(1)):
            relative = value[2:] if value.startswith("./") else value
            if relative and not (project_root / relative).exists():
                problems.append(f"service-worker.js: shell asset not found: {value}")

    if problems:
        print("MORPHORA static check failed\n")
        for problem in problems:
            print(f"✗ {problem}")
        return 1

    print("MORPHORA static check")
    print("✓ HTML references resolved")
    print("✓ JavaScript DOM ids resolved")
    print("✓ Local HTML assets found")
    print("✓ CSS braces balanced")
    print("✓ Service-worker shell assets found")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
