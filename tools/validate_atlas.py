#!/usr/bin/env python3
"""Validate MORPHORA catalog, manifests, views, labels, and image assets."""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from xml.etree import ElementTree as ET


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    counts: dict[str, int] = field(default_factory=lambda: {
        "species": 0,
        "collections": 0,
        "views": 0,
        "labels": 0,
        "dzi": 0,
        "images": 0,
    })

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warning(self, message: str) -> None:
        self.warnings.append(message)


def load_json(path: Path, report: Report, label: str) -> dict[str, Any] | None:
    if not path.exists():
        report.error(f"{label}: file not found: {path.as_posix()}")
        return None
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        report.error(f"{label}: invalid JSON at line {error.lineno}, column {error.colno}: {error.msg}")
        return None
    if not isinstance(value, dict):
        report.error(f"{label}: root value must be an object")
        return None
    return value


def is_remote(path: str) -> bool:
    return urlparse(path).scheme in {"http", "https", "data"}


def resolve_asset(root: Path, value: str) -> Path | None:
    if not value or is_remote(value):
        return None
    clean = value.split("?", 1)[0].split("#", 1)[0].lstrip("/")
    return root / clean


def require_string(data: dict[str, Any], key: str, context: str, report: Report) -> str | None:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        report.error(f"{context}: {key} must be a non-empty string")
        return None
    return value.strip()


def check_optional_asset(root: Path, value: Any, context: str, report: Report, *, warning_only: bool = False) -> None:
    if value is None:
        return
    if not isinstance(value, str) or not value.strip():
        report.error(f"{context}: asset path must be a non-empty string")
        return
    path = resolve_asset(root, value)
    if path is not None and not path.exists():
        message = f"{context}: asset not found: {value}"
        (report.warning if warning_only else report.error)(message)


def validate_dzi(root: Path, src: str, image: dict[str, Any], context: str, report: Report, *, warning_only: bool) -> None:
    descriptor = resolve_asset(root, src)
    if descriptor is None:
        report.warning(f"{context}: remote DZI source was not inspected: {src}")
        return
    if not descriptor.exists():
        (report.warning if warning_only else report.error)(f"{context}: DZI descriptor not found: {src}")
        return

    try:
        tree = ET.parse(descriptor)
        root_element = tree.getroot()
        size_element = next((element for element in root_element.iter() if element.tag.endswith("Size")), None)
        tile_size = int(root_element.attrib.get("TileSize", "0"))
        overlap = int(root_element.attrib.get("Overlap", "-1"))
        output_format = root_element.attrib.get("Format", "")
        width = int(size_element.attrib.get("Width", "0")) if size_element is not None else 0
        height = int(size_element.attrib.get("Height", "0")) if size_element is not None else 0
    except (ET.ParseError, ValueError, OSError) as error:
        report.error(f"{context}: invalid DZI descriptor {src}: {error}")
        return

    if tile_size < 64:
        report.error(f"{context}: DZI TileSize must be at least 64")
    if overlap < 0:
        report.error(f"{context}: DZI Overlap cannot be negative")
    if output_format not in {"jpg", "jpeg", "png", "webp"}:
        report.error(f"{context}: unsupported DZI tile format: {output_format or '(missing)'}")
    if width <= 0 or height <= 0:
        report.error(f"{context}: DZI dimensions must be positive")

    declared_width = image.get("width")
    declared_height = image.get("height")
    if isinstance(declared_width, (int, float)) and int(declared_width) != width:
        report.error(f"{context}: image.width {declared_width} does not match DZI width {width}")
    if isinstance(declared_height, (int, float)) and int(declared_height) != height:
        report.error(f"{context}: image.height {declared_height} does not match DZI height {height}")

    tile_directory = descriptor.with_name(f"{descriptor.stem}_files")
    max_level = math.ceil(math.log2(max(width, height))) if width and height else 0
    if not tile_directory.is_dir():
        (report.warning if warning_only else report.error)(
            f"{context}: DZI tile directory not found: {tile_directory.relative_to(root).as_posix()}"
        )
        return

    missing_tiles: list[str] = []
    expected_tile_count = 0
    for level in range(max_level + 1):
        divisor = 2 ** (max_level - level)
        level_width = max(1, math.ceil(width / divisor))
        level_height = max(1, math.ceil(height / divisor))
        columns = math.ceil(level_width / tile_size)
        rows = math.ceil(level_height / tile_size)
        expected_tile_count += columns * rows
        level_directory = tile_directory / str(level)
        for row in range(rows):
            for column in range(columns):
                tile = level_directory / f"{column}_{row}.{output_format}"
                if not tile.is_file() and len(missing_tiles) < 8:
                    missing_tiles.append(tile.relative_to(root).as_posix())

    if missing_tiles:
        message = (
            f"{context}: DZI pyramid is missing tile files: "
            + ", ".join(missing_tiles)
            + (" …" if len(missing_tiles) == 8 else "")
        )
        (report.warning if warning_only else report.error)(message)
        return

    actual_tile_count = sum(
        1 for path in tile_directory.rglob(f"*.{output_format}") if path.is_file()
    )
    if actual_tile_count != expected_tile_count:
        report.warning(
            f"{context}: DZI pyramid contains {actual_tile_count} {output_format} tiles; "
            f"{expected_tile_count} were expected"
        )

    report.counts["dzi"] += 1


def validate_view(root: Path, view_path: Path, expected_id: str, report: Report, *, warning_only: bool, published: bool) -> None:
    context = f"View {expected_id}"
    data = load_json(view_path, report, context)
    if data is None:
        return

    if data.get("schemaVersion") != 1:
        report.error(f"{context}: schemaVersion must be 1")
    if data.get("id") != expected_id:
        report.error(f"{context}: id {data.get('id')!r} does not match manifest id {expected_id!r}")
    require_string(data, "title", context, report)

    image = data.get("image")
    if not isinstance(image, dict):
        report.error(f"{context}: image must be an object")
        return

    src = require_string(image, "src", f"{context}.image", report)
    image_type = image.get("type")
    if image_type is None and src:
        image_type = "dzi" if src.lower().split("?", 1)[0].endswith(".dzi") else "image"
    if image_type not in {"image", "dzi"}:
        report.error(f"{context}.image: type must be 'image' or 'dzi'")

    for dimension in ("width", "height"):
        value = image.get(dimension)
        if not isinstance(value, (int, float)) or value <= 0:
            report.error(f"{context}.image: {dimension} must be a positive number")
    require_string(image, "alt", f"{context}.image", report)

    if src:
        if image_type == "dzi":
            validate_dzi(root, src, image, context, report, warning_only=warning_only)
            if not image.get("fallback"):
                report.warning(f"{context}: DZI view has no fallback image")
        else:
            check_optional_asset(root, src, f"{context}.image.src", report, warning_only=warning_only)
            report.counts["images"] += 1

    check_optional_asset(root, image.get("fallback"), f"{context}.image.fallback", report, warning_only=warning_only)
    check_optional_asset(root, image.get("thumbnail"), f"{context}.image.thumbnail", report, warning_only=warning_only)

    labels = data.get("labels")
    if not isinstance(labels, list):
        report.error(f"{context}: labels must be an array")
        return

    seen_ids: set[str] = set()
    for index, label in enumerate(labels, start=1):
        label_context = f"{context}, label {index}"
        if not isinstance(label, dict):
            report.error(f"{label_context}: label must be an object")
            continue
        label_id = require_string(label, "id", label_context, report)
        require_string(label, "name", label_context, report)
        if label_id:
            if label_id in seen_ids:
                report.error(f"{context}: duplicate label id: {label_id}")
            seen_ids.add(label_id)

        position = label.get("position")
        if not isinstance(position, dict):
            report.error(f"{label_context}: position must be an object")
        else:
            for axis in ("x", "y"):
                value = position.get(axis)
                if not isinstance(value, (int, float)) or not 0 <= value <= 1:
                    report.error(f"{label_context}: position.{axis} must be between 0 and 1")

        label_position = label.get("labelPosition")
        if label_position is not None:
            if not isinstance(label_position, dict):
                report.error(f"{label_context}: labelPosition must be an object")
            else:
                for axis in ("x", "y"):
                    value = label_position.get(axis)
                    if not isinstance(value, (int, float)) or not 0 <= value <= 1:
                        report.error(f"{label_context}: labelPosition.{axis} must be between 0 and 1")

        quiz_eligible = label.get("quizEligible", True)
        if not isinstance(quiz_eligible, bool):
            report.error(f"{label_context}: quizEligible must be true or false")

        difficulty = label.get("difficulty", "intermediate")
        if difficulty not in {"beginner", "intermediate", "advanced"}:
            report.error(f"{label_context}: difficulty must be beginner, intermediate or advanced")

        accepted_radius = label.get("acceptedRadius", 0.045)
        if not isinstance(accepted_radius, (int, float)) or not 0.005 <= accepted_radius <= 0.2:
            report.error(f"{label_context}: acceptedRadius must be between 0.005 and 0.2")

        if published and label.get("status") in {"draft", "unpublished"}:
            report.warning(f"{label_context}: unpublished label is present in an available collection")

    report.counts["views"] += 1
    report.counts["labels"] += len(labels)


def validate_collection(root: Path, manifest_path: Path, report: Report, *, warning_only: bool, published: bool) -> set[Path]:
    data = load_json(manifest_path, report, f"Collection {manifest_path.name}")
    referenced_views: set[Path] = set()
    if data is None:
        return referenced_views

    report.counts["collections"] += 1
    if data.get("schemaVersion") != 1:
        report.error(f"Collection {manifest_path.name}: schemaVersion must be 1")
    default_view_id = require_string(data, "defaultViewId", f"Collection {manifest_path.name}", report)
    views = data.get("views")
    if not isinstance(views, list) or not views:
        report.error(f"Collection {manifest_path.name}: views must be a non-empty array")
        return referenced_views

    seen_ids: set[str] = set()
    for index, entry in enumerate(views, start=1):
        context = f"Collection {manifest_path.name}, view entry {index}"
        if not isinstance(entry, dict):
            report.error(f"{context}: entry must be an object")
            continue
        view_id = require_string(entry, "id", context, report)
        require_string(entry, "buttonLabel", context, report)
        data_path = require_string(entry, "dataPath", context, report)
        if view_id:
            if view_id in seen_ids:
                report.error(f"Collection {manifest_path.name}: duplicate view id: {view_id}")
            seen_ids.add(view_id)
        if view_id and data_path:
            resolved = resolve_asset(root, data_path)
            if resolved is not None:
                referenced_views.add(resolved.resolve())
                if resolved.exists():
                    validate_view(root, resolved, view_id, report, warning_only=warning_only, published=published)
                else:
                    (report.warning if warning_only else report.error)(f"{context}: view JSON not found: {data_path}")

    if default_view_id and default_view_id not in seen_ids:
        report.error(f"Collection {manifest_path.name}: defaultViewId {default_view_id!r} is not registered")
    return referenced_views


def validate_project(root: Path) -> Report:
    report = Report()
    catalog_path = root / "data" / "catalog.json"
    catalog = load_json(catalog_path, report, "Catalog")
    if catalog is None:
        return report
    if catalog.get("schemaVersion") != 1:
        report.error("Catalog: schemaVersion must be 1")

    species_entries = catalog.get("species")
    if not isinstance(species_entries, list) or not species_entries:
        report.error("Catalog: species must be a non-empty array")
        return report

    referenced_views: set[Path] = set()
    seen_species: set[str] = set()

    for species_entry in species_entries:
        if not isinstance(species_entry, dict):
            report.error("Catalog: each species entry must be an object")
            continue
        species_id = require_string(species_entry, "id", "Catalog species", report)
        status = species_entry.get("status", "coming-soon")
        if species_id:
            if species_id in seen_species:
                report.error(f"Catalog: duplicate species id: {species_id}")
            seen_species.add(species_id)
        check_optional_asset(root, species_entry.get("coverImage"), f"Species {species_id or '?'} coverImage", report, warning_only=status != "available")

        data_path = species_entry.get("dataPath")
        if status != "available" and not data_path:
            continue
        if not isinstance(data_path, str) or not data_path.strip():
            report.error(f"Species {species_id or '?'}: available species requires dataPath")
            continue
        species_path = resolve_asset(root, data_path)
        if species_path is None:
            report.warning(f"Species {species_id or '?'}: remote species data was not inspected")
            continue
        species_data = load_json(species_path, report, f"Species {species_id or '?'}")
        if species_data is None:
            continue
        report.counts["species"] += 1
        if species_data.get("id") != species_id:
            report.error(f"Species {species_id}: data id does not match catalog")
        check_optional_asset(root, species_data.get("coverImage"), f"Species {species_id} coverImage", report, warning_only=status != "available")

        systems = species_data.get("systems")
        if not isinstance(systems, list):
            report.error(f"Species {species_id}: systems must be an array")
            continue
        for system in systems:
            if not isinstance(system, dict):
                report.error(f"Species {species_id}: system entry must be an object")
                continue
            collections = system.get("collections", [])
            if not isinstance(collections, list):
                report.error(f"Species {species_id}, system {system.get('id', '?')}: collections must be an array")
                continue
            for collection in collections:
                if not isinstance(collection, dict):
                    report.error(f"Species {species_id}: collection entry must be an object")
                    continue
                collection_id = collection.get("id", "?")
                collection_status = collection.get("status", "coming-soon")
                check_optional_asset(
                    root,
                    collection.get("thumbnail"),
                    f"Collection {species_id}/{collection_id} thumbnail",
                    report,
                    warning_only=collection_status != "available",
                )
                manifest_value = collection.get("manifestPath")
                if not manifest_value:
                    if collection_status == "available":
                        report.error(f"Collection {species_id}/{collection_id}: available collection requires manifestPath")
                    continue
                if not isinstance(manifest_value, str):
                    report.error(f"Collection {species_id}/{collection_id}: manifestPath must be a string")
                    continue
                manifest_path = resolve_asset(root, manifest_value)
                if manifest_path is None:
                    report.warning(f"Collection {species_id}/{collection_id}: remote manifest was not inspected")
                    continue
                if not manifest_path.exists():
                    (report.warning if collection_status != "available" else report.error)(
                        f"Collection {species_id}/{collection_id}: manifest not found: {manifest_value}"
                    )
                    continue
                referenced_views.update(
                    validate_collection(
                        root,
                        manifest_path,
                        report,
                        warning_only=collection_status != "available",
                        published=collection_status == "available",
                    )
                )

    all_view_files = {path.resolve() for path in (root / "data" / "views").glob("*.json") if path.name != "VIEW-TEMPLATE.json"}
    for unreferenced in sorted(all_view_files - referenced_views):
        report.warning(f"Unreferenced view JSON: {unreferenced.relative_to(root).as_posix()}")

    return report


def print_report(report: Report) -> None:
    print("MORPHORA atlas validation\n")
    print(f"{'✓' if not report.errors else '✗'} Catalog and manifest traversal complete")
    print(f"  Species checked:    {report.counts['species']}")
    print(f"  Collections checked:{report.counts['collections']:>5}")
    print(f"  Views checked:      {report.counts['views']:>5}")
    print(f"  Labels checked:     {report.counts['labels']:>5}")
    print(f"  Deep Zoom views:    {report.counts['dzi']:>5}")
    print(f"  Standard images:    {report.counts['images']:>5}")

    if report.errors:
        print("\nErrors:")
        for message in report.errors:
            print(f"  ✗ {message}")
    if report.warnings:
        print("\nWarnings:")
        for message in report.warnings:
            print(f"  ! {message}")

    print(f"\nValidation completed with {len(report.errors)} error(s) and {len(report.warnings)} warning(s).")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--strict", action="store_true", help="Return a failure code when warnings exist")
    parser.add_argument("--json", action="store_true", dest="json_output")
    args = parser.parse_args()

    root = args.project_root.resolve()
    report = validate_project(root)
    if args.json_output:
        print(json.dumps({"counts": report.counts, "errors": report.errors, "warnings": report.warnings}, indent=2))
    else:
        print_report(report)

    return 1 if report.errors or (args.strict and report.warnings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
