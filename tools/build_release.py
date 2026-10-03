#!/usr/bin/env python3
"""Build a validated, deployment-ready MORPHORA static site artifact.

The source repository contains authoring tools, source photographs, reports and
other development-only material. This builder creates a small, explicit `dist/`
folder for GitHub Pages, injects release metadata, and gives every deployment a
unique asset version derived from the validated Git commit.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "dist"
RUNTIME_DIRS = ("assets", "data", "images", "tiles", "studio", "validation", "schemas", "i18n")
RUNTIME_FILES = (
    ".nojekyll",
    "CNAME",
    "index.html",
    "studio.html",
    "dev-tools.html",
    "performance-lab.html",
    "style.css",
    "design-system.css",
    "dev-tools.css",
    "performance-lab.css",
    "app-config.js",
    "release-meta.js",
    "release.json",
    "models.js",
    "storage.js",
    "performance.js",
    "accessibility.js",
    "script.js",
    "study.js",
    "drawing.js",
    "navigation.js",
    "dev-tools.js",
    "performance-lab.js",
    "service-worker.js",
)


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def semantic_version() -> str:
    package_version = read_json(ROOT / "package.json").get("version")
    app_text = (ROOT / "app-config.js").read_text(encoding="utf-8")
    match = re.search(r'version:\s*"([^"]+)"', app_text)
    app_version = match.group(1) if match else None
    if not package_version or package_version != app_version:
        raise SystemExit(f"Version mismatch: package.json={package_version!r}, app-config.js={app_version!r}")
    return str(package_version)


def git_value(*args: str, fallback: str = "") -> str:
    try:
        result = subprocess.run(
            ["git", *args], cwd=ROOT, check=True, capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip() or fallback
    except Exception:
        return fallback


def report_passed(filename: str) -> bool:
    report_path = ROOT / "reports" / filename
    if not report_path.is_file():
        return False
    try:
        report = read_json(report_path)
        return int(report.get("summary", {}).get("errors", 1)) == 0
    except Exception:
        return False


def validation_passed() -> bool:
    if os.getenv("MORPHORA_VALIDATION", "").lower() == "passed":
        return True
    return report_passed("validation-report.json")


def release_candidate_passed() -> bool:
    if os.getenv("MORPHORA_RELEASE_CANDIDATE", "").lower() == "passed":
        return True
    return report_passed("release-candidate-audit.json")


def quality_gate_passed() -> bool:
    return validation_passed() and release_candidate_passed()


def release_metadata(version: str) -> dict[str, Any]:
    commit = os.getenv("MORPHORA_COMMIT") or git_value("rev-parse", "HEAD", fallback="development")
    short_commit = os.getenv("MORPHORA_SHORT_COMMIT") or (
        commit[:8] if commit not in {"", "development"} else git_value("rev-parse", "--short=8", "HEAD", fallback="dev")
    )
    short_commit = (short_commit or "dev")[:12]
    asset_version = f"{version}-{short_commit}"
    return {
        "product": "MORPHORA",
        "version": version,
        "schemaVersion": 2,
        "userDataSchemaVersion": 2,
        "assetVersion": asset_version,
        "commit": commit,
        "shortCommit": short_commit,
        "ref": os.getenv("MORPHORA_REF") or git_value("rev-parse", "--abbrev-ref", "HEAD", fallback="local"),
        "builtAt": datetime.now(timezone.utc).isoformat(),
        "validation": "passed" if validation_passed() else "unverified",
        "releaseCandidate": "passed" if release_candidate_passed() else "unverified",
        "repository": os.getenv("MORPHORA_REPOSITORY", ""),
        "runId": os.getenv("MORPHORA_RUN_ID", ""),
        "buildUrl": os.getenv("MORPHORA_BUILD_URL", ""),
        "deploymentTarget": os.getenv("MORPHORA_DEPLOYMENT_TARGET", "local-build"),
    }


def copy_runtime(output: Path) -> None:
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    for name in RUNTIME_FILES:
        source = ROOT / name
        if source.is_file():
            shutil.copy2(source, output / name)

    for name in RUNTIME_DIRS:
        source = ROOT / name
        if source.is_dir():
            shutil.copytree(source, output / name)

    (output / ".nojekyll").touch()


def write_release_files(output: Path, release: dict[str, Any]) -> None:
    (output / "release.json").write_text(
        json.dumps(release, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    js = (
        "(() => {\n"
        "  \"use strict\";\n"
        "  const root = typeof window !== \"undefined\" ? window : self;\n"
        f"  root.MORPHORA_RELEASE = Object.freeze({json.dumps(release, ensure_ascii=False, separators=(',', ':'))});\n"
        "})();\n"
    )
    (output / "release-meta.js").write_text(js, encoding="utf-8")


def patch_html_asset_versions(output: Path, version: str, asset_version: str) -> None:
    for name in ("index.html", "studio.html", "dev-tools.html", "performance-lab.html"):
        path = output / name
        text = path.read_text(encoding="utf-8")
        text = text.replace(f"?v={version}", f"?v={asset_version}")
        path.write_text(text, encoding="utf-8")


def artifact_stats(output: Path) -> tuple[int, int]:
    count = 0
    size = 0
    for path in output.rglob("*"):
        if path.is_file():
            count += 1
            size += path.stat().st_size
    return count, size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--allow-unverified",
        action="store_true",
        help="Build even when reports/validation-report.json does not confirm zero errors.",
    )
    args = parser.parse_args()

    version = semantic_version()
    if not quality_gate_passed() and not args.allow_unverified:
        raise SystemExit("Release build blocked: run `npm run check` successfully first so project validation and the V4.9.8 release-candidate gate both pass.")

    output = args.output.resolve()
    release = release_metadata(version)
    copy_runtime(output)
    write_release_files(output, release)
    patch_html_asset_versions(output, version, release["assetVersion"])

    file_count, byte_count = artifact_stats(output)
    print(f"MORPHORA V{version} release artifact built")
    print(f"Output: {output}")
    print(f"Asset version: {release['assetVersion']}")
    print(f"Commit: {release['commit']}")
    print(f"Validation: {release['validation']}")
    print(f"Release candidate gate: {release['releaseCandidate']}")
    print(f"Files: {file_count}")
    print(f"Size: {byte_count / (1024 * 1024):.2f} MiB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
