#!/usr/bin/env python3
"""Migrate MORPHORA atlas JSON documents from schema V1 to canonical V2."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path}: root must be an object")
    return value


def migrate_label(label: dict[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in label.items() if k not in {"quizEligible", "difficulty", "acceptedRadius", "quiz", "anchor"}}
    if "position" not in out and isinstance(label.get("anchor"), dict):
        out["position"] = label["anchor"]
    quiz = label.get("quiz") if isinstance(label.get("quiz"), dict) else {}
    out["quiz"] = {
        "eligible": bool(quiz.get("eligible", label.get("quizEligible", True))),
        "difficulty": quiz.get("difficulty", label.get("difficulty", "intermediate")),
        "acceptedRadius": quiz.get("acceptedRadius", label.get("acceptedRadius", 0.045)),
    }
    out.setdefault("status", "published")
    out.setdefault("category", "")
    out.setdefault("description", "")
    return out


def migrate_view(data: dict[str, Any]) -> dict[str, Any]:
    out = dict(data)
    out["schemaVersion"] = 2
    out.setdefault("status", "published")
    out["labels"] = [migrate_label(x) for x in data.get("labels", []) if isinstance(x, dict)]
    image = out.get("image") if isinstance(out.get("image"), dict) else {}
    if not image.get("type"):
        image["type"] = "dzi" if str(image.get("src", "")).lower().split("?", 1)[0].endswith(".dzi") else "image"
    out["image"] = image
    return out


def migrate_collection(data: dict[str, Any]) -> dict[str, Any]:
    species_id = data.get("speciesId") or (data.get("species") or {}).get("id") or "dog"
    collection_id = data.get("collectionId") or (data.get("region") or {}).get("id") or data.get("id", "collection")
    old_id = data.get("id") or f"{species_id}-{collection_id}"
    if old_id == "morphora-canine-skull":
        old_id = "dog-skull"
    out = {
        "schemaVersion": 2,
        "id": old_id,
        "title": data.get("title", ""),
        "speciesId": species_id,
        "systemId": data.get("systemId") or "skeletal",
        "collectionId": collection_id,
        "defaultViewId": data.get("defaultViewId", ""),
        "views": data.get("views", []),
    }
    for key, value in data.items():
        if key not in {"schemaVersion", "id", "title", "species", "region", "speciesId", "systemId", "collectionId", "defaultViewId", "views"}:
            out[key] = value
    return out


def migrate_simple(data: dict[str, Any]) -> dict[str, Any]:
    out = dict(data)
    out["schemaVersion"] = 2
    return out


def infer_kind(path: Path) -> str:
    if path.name == "catalog.json":
        return "catalog"
    if path.parent.name == "species":
        return "species"
    if path.parent.name == "collections":
        return "collection"
    if path.parent.name == "views":
        return "view"
    raise ValueError(f"Cannot infer MORPHORA document kind for {path}")


def migrate(kind: str, data: dict[str, Any]) -> dict[str, Any]:
    if kind == "view":
        return migrate_view(data)
    if kind == "collection":
        return migrate_collection(data)
    return migrate_simple(data)


def files(root: Path):
    yield root / "data" / "catalog.json"
    yield from sorted((root / "data" / "species").glob("*.json"))
    yield from sorted((root / "data" / "collections").glob("*.json"))
    yield from sorted((root / "data" / "views").glob("*.json"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="Report files that would change")
    mode.add_argument("--write", action="store_true", help="Rewrite supported files as schema V2")
    parser.add_argument("--project-root", type=Path, default=ROOT)
    args = parser.parse_args()
    root = args.project_root.resolve()

    changes: list[tuple[Path, dict[str, Any]]] = []
    for path in files(root):
        if not path.exists():
            continue
        original = load(path)
        migrated = migrate(infer_kind(path), original)
        if original != migrated:
            changes.append((path, migrated))
            print(f"→ {path.relative_to(root)}: schema {original.get('schemaVersion', '?')} → 2")

    if not changes:
        print("MORPHORA schema migration: all atlas JSON is already canonical V2.")
        return 0
    if args.check:
        print(f"\n{len(changes)} file(s) would be migrated. No files were changed.")
        return 2

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_root = root / ".morphora-backups" / f"schema-migration-{stamp}"
    for path, migrated in changes:
        relative = path.relative_to(root)
        backup = backup_root / relative
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, backup)
        path.write_text(json.dumps(migrated, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nMigrated {len(changes)} file(s). Backup: {backup_root.relative_to(root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
