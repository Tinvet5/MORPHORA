#!/usr/bin/env python3
"""Static performance audit for MORPHORA runtime assets.

This complements the browser Performance Lab. It does not predict real-device
speed; it flags unexpectedly large shell assets, thumbnails, fallbacks and Deep
Zoom tiles before they reach production.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "reports"

SHELL_FILES = [
    "index.html", "style.css", "design-system.css", "app-config.js", "models.js", "storage.js", "performance.js",
    "accessibility.js", "script.js", "study.js", "drawing.js", "navigation.js",
]

BUDGETS = {
    "shellBytesWarning": 1_600_000,
    "singleJsBytesWarning": 400_000,
    "thumbnailBytesWarning": 220_000,
    "fallbackImageBytesWarning": 6_000_000,
    "tileBytesWarning": 320_000,
    "tileBytesError": 1_000_000,
}


def size(path: Path) -> int:
    return path.stat().st_size if path.is_file() else 0


def files_under(path: Path, patterns: tuple[str, ...]) -> list[Path]:
    if not path.exists():
        return []
    return [p for p in path.rglob("*") if p.is_file() and p.suffix.lower() in patterns]


def issue(level: str, code: str, message: str, path: str = "") -> dict:
    return {"level": level, "code": code, "message": message, "path": path}


def main() -> int:
    issues: list[dict] = []
    shell = []
    shell_bytes = 0
    for rel in SHELL_FILES:
        path = ROOT / rel
        value = size(path)
        shell.append({"path": rel, "bytes": value})
        shell_bytes += value
        if path.suffix == ".js" and value > BUDGETS["singleJsBytesWarning"]:
            issues.append(issue("warning", "LARGE_JS", f"JavaScript file is {value / 1024:.1f} KiB.", rel))

    if shell_bytes > BUDGETS["shellBytesWarning"]:
        issues.append(issue("warning", "SHELL_BUDGET", f"Core shell is {shell_bytes / 1024 / 1024:.2f} MiB.", "runtime shell"))

    thumbnails = files_under(ROOT / "images" / "thumbnails", (".jpg", ".jpeg", ".png", ".webp"))
    for path in thumbnails:
        value = size(path)
        if value > BUDGETS["thumbnailBytesWarning"]:
            issues.append(issue("warning", "LARGE_THUMBNAIL", f"Thumbnail is {value / 1024:.1f} KiB.", str(path.relative_to(ROOT))))

    fallback_images = [p for p in (ROOT / "images").glob("*") if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}]
    for path in fallback_images:
        value = size(path)
        if value > BUDGETS["fallbackImageBytesWarning"]:
            issues.append(issue("warning", "LARGE_FALLBACK", f"Fallback image is {value / 1024 / 1024:.2f} MiB.", str(path.relative_to(ROOT))))

    tile_files = files_under(ROOT / "tiles", (".jpg", ".jpeg", ".png", ".webp"))
    tile_sizes = [size(path) for path in tile_files]
    for path, value in zip(tile_files, tile_sizes):
        if value > BUDGETS["tileBytesError"]:
            issues.append(issue("error", "OVERSIZE_TILE", f"Deep Zoom tile is {value / 1024:.1f} KiB.", str(path.relative_to(ROOT))))
        elif value > BUDGETS["tileBytesWarning"]:
            issues.append(issue("warning", "LARGE_TILE", f"Deep Zoom tile is {value / 1024:.1f} KiB.", str(path.relative_to(ROOT))))

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "budgets": BUDGETS,
        "summary": {
            "shellBytes": shell_bytes,
            "thumbnailCount": len(thumbnails),
            "thumbnailBytes": sum(size(p) for p in thumbnails),
            "fallbackImageCount": len(fallback_images),
            "fallbackImageBytes": sum(size(p) for p in fallback_images),
            "tileCount": len(tile_files),
            "tileBytes": sum(tile_sizes),
            "largestTileBytes": max(tile_sizes, default=0),
            "averageTileBytes": round(sum(tile_sizes) / len(tile_sizes), 1) if tile_sizes else 0,
            "errors": sum(1 for x in issues if x["level"] == "error"),
            "warnings": sum(1 for x in issues if x["level"] == "warning"),
        },
        "shell": shell,
        "issues": issues,
    }

    REPORT_DIR.mkdir(exist_ok=True)
    (REPORT_DIR / "performance-static.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    lines = [
        "MORPHORA V4.9 static performance audit",
        f"Core shell: {shell_bytes / 1024:.1f} KiB",
        f"Thumbnails: {len(thumbnails)} files / {report['summary']['thumbnailBytes'] / 1024:.1f} KiB",
        f"Fallback images: {len(fallback_images)} files / {report['summary']['fallbackImageBytes'] / 1024 / 1024:.2f} MiB",
        f"Deep Zoom tiles: {len(tile_files)} files / {report['summary']['tileBytes'] / 1024 / 1024:.2f} MiB",
        f"Average tile: {report['summary']['averageTileBytes'] / 1024:.1f} KiB",
        f"Largest tile: {report['summary']['largestTileBytes'] / 1024:.1f} KiB",
        f"Errors: {report['summary']['errors']}",
        f"Warnings: {report['summary']['warnings']}",
    ]
    if issues:
        lines.append("")
        for item in issues[:100]:
            lines.append(f"{item['level'].upper()} {item['code']}: {item['path']} — {item['message']}")
    (REPORT_DIR / "performance-static.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print("\n".join(lines))
    return 1 if report["summary"]["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
