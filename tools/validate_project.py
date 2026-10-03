#!/usr/bin/env python3
"""Authoritative MORPHORA V4.9.8 project validator.

Validates schemas, content relationships, repository paths, images, Deep Zoom
pyramids, identifiers, published-content readiness and runtime version consistency.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

from jsonschema import Draft202012Validator
from PIL import Image, ImageOps

from validation_core import (
    AVAILABILITY_STATUSES,
    CONTENT_STATUSES,
    DIFFICULTIES,
    ID_RE,
    VALIDATOR_VERSION,
    ValidationReport,
    id_valid,
    load_json,
    resolve_local,
    safe_repo_path,
)


def rel(root: Path, path: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def validate_schema(root: Path, data: dict[str, Any], schema_name: str, source: Path, report: ValidationReport) -> None:
    schema_path = root / "schemas" / schema_name
    schema = load_json(schema_path, report, code="SCHEMA_INVALID")
    if schema is None:
        return
    validator = Draft202012Validator(schema)
    for error in sorted(validator.iter_errors(data), key=lambda item: list(item.absolute_path)):
        json_path = ".".join(str(part) for part in error.absolute_path)
        report.error(
            "SCHEMA_VIOLATION",
            error.message,
            f"{rel(root, source)}{(' · ' + json_path) if json_path else ''}",
        )


def check_path_style(value: Any, logical_path: str, report: ValidationReport, *, required: bool = True) -> None:
    if not isinstance(value, str) or not value.strip():
        if required:
            report.error("PATH_REQUIRED", "Repository path is required.", logical_path)
        return
    if not safe_repo_path(value):
        report.error("PATH_UNSAFE", "Repository path contains unsupported or unsafe characters.", logical_path)
        return
    if value.startswith(("http://", "https://", "data:", "blob:")):
        return
    if re.search(r"[A-Z\s]", value):
        report.warning("PATH_STYLE", "Repository path contains uppercase letters or spaces; lowercase hyphenated paths are recommended.", logical_path)


def check_asset(root: Path, value: Any, logical_path: str, report: ValidationReport, *, required: bool, missing_severity: str = "error") -> Path | None:
    if value is None or value == "":
        if required:
            report.error("ASSET_REQUIRED", "Required asset path is missing.", logical_path)
        return None
    if not isinstance(value, str):
        report.error("ASSET_PATH_TYPE", "Asset path must be a string.", logical_path)
        return None
    check_path_style(value, logical_path, report)
    path = resolve_local(root, value)
    if path is None:
        report.warning("REMOTE_ASSET", "Remote asset was not inspected by the local validator.", logical_path)
        return None
    report.counts["assetsChecked"] += 1
    if not path.is_file():
        message = f"Asset not found: {value}"
        if missing_severity == "warning":
            report.warning("ASSET_MISSING", message, logical_path)
        else:
            report.error("ASSET_MISSING", message, logical_path)
        return None
    return path


def actual_image_size(path: Path) -> tuple[int, int] | None:
    try:
        with Image.open(path) as source:
            image = ImageOps.exif_transpose(source)
            return image.size
    except Exception:
        return None


def validate_regular_image(root: Path, image: dict[str, Any], view_path: Path, report: ValidationReport, *, required: bool) -> None:
    src = image.get("src")
    path = check_asset(root, src, f"{rel(root, view_path)} · image.src", report, required=True, missing_severity="error" if required else "warning")
    if path is None:
        return
    size = actual_image_size(path)
    if size is None:
        report.error("IMAGE_UNREADABLE", "Image could not be opened by Pillow.", rel(root, path))
        return
    declared = (int(image.get("width", 0) or 0), int(image.get("height", 0) or 0))
    if size != declared:
        report.warning(
            "IMAGE_DIMENSIONS_MISMATCH",
            f"Declared dimensions {declared[0]}×{declared[1]} do not match file dimensions {size[0]}×{size[1]}.",
            rel(root, view_path),
            "Update the view metadata or replace the image with the intended source.",
        )


def validate_dzi(root: Path, image: dict[str, Any], view_path: Path, report: ValidationReport, *, required: bool) -> None:
    src = image.get("src")
    descriptor = check_asset(root, src, f"{rel(root, view_path)} · image.src", report, required=True, missing_severity="error" if required else "warning")
    if descriptor is None:
        return
    try:
        tree = ET.parse(descriptor)
        node = tree.getroot()
        size_node = next((element for element in node.iter() if element.tag.endswith("Size")), None)
        tile_size = int(node.attrib.get("TileSize", "0"))
        overlap = int(node.attrib.get("Overlap", "-1"))
        output_format = node.attrib.get("Format", "")
        width = int(size_node.attrib.get("Width", "0")) if size_node is not None else 0
        height = int(size_node.attrib.get("Height", "0")) if size_node is not None else 0
    except (ET.ParseError, OSError, ValueError) as exc:
        report.error("DZI_INVALID", f"Invalid Deep Zoom descriptor: {exc}", rel(root, descriptor))
        return

    if tile_size < 64 or overlap < 0 or output_format not in {"jpg", "jpeg", "png", "webp"} or width <= 0 or height <= 0:
        report.error("DZI_DESCRIPTOR_VALUES", "Deep Zoom descriptor has invalid tile size, overlap, format or dimensions.", rel(root, descriptor))
        return
    if int(image.get("width", 0) or 0) != width or int(image.get("height", 0) or 0) != height:
        report.error("DZI_DIMENSIONS_MISMATCH", f"View metadata does not match DZI dimensions {width}×{height}.", rel(root, view_path))

    tile_dir = descriptor.with_name(f"{descriptor.stem}_files")
    if not tile_dir.is_dir():
        severity = report.error if required else report.warning
        severity("DZI_TILE_DIR_MISSING", "Deep Zoom tile directory is missing.", rel(root, tile_dir))
        return

    max_level = math.ceil(math.log2(max(width, height)))
    missing: list[str] = []
    expected = 0
    for level in range(max_level + 1):
        divisor = 2 ** (max_level - level)
        lw = max(1, math.ceil(width / divisor))
        lh = max(1, math.ceil(height / divisor))
        columns = math.ceil(lw / tile_size)
        rows = math.ceil(lh / tile_size)
        expected += columns * rows
        level_dir = tile_dir / str(level)
        if not level_dir.is_dir():
            missing.append(rel(root, level_dir))
            continue
        for row in range(rows):
            for column in range(columns):
                tile = level_dir / f"{column}_{row}.{output_format}"
                if not tile.is_file() and len(missing) < 12:
                    missing.append(rel(root, tile))
    if missing:
        message = "Missing Deep Zoom tiles: " + ", ".join(missing[:8]) + (" …" if len(missing) > 8 else "")
        (report.error if required else report.warning)("DZI_TILES_MISSING", message, rel(root, descriptor))
        return
    actual = sum(1 for p in tile_dir.rglob(f"*.{output_format}") if p.is_file())
    if actual != expected:
        report.warning("DZI_TILE_COUNT", f"Deep Zoom pyramid contains {actual} tiles; {expected} are expected.", rel(root, descriptor))
    report.counts["dziViews"] += 1


def validate_label(root: Path, label: Any, index: int, view_path: Path, report: ValidationReport, *, published_view: bool) -> None:
    path = f"{rel(root, view_path)} · labels[{index}]"
    if not isinstance(label, dict):
        report.error("LABEL_TYPE", "Label must be an object.", path)
        return
    if not id_valid(label.get("id")):
        report.error("ID_FORMAT", "Label ID must use lowercase letters, numbers and hyphens.", f"{path}.id")
    if not isinstance(label.get("name"), str) or not label["name"].strip():
        report.error("LABEL_NAME_REQUIRED", "Label name is required.", f"{path}.name")
    point = label.get("position")
    if not isinstance(point, dict) or any(not isinstance(point.get(axis), (int, float)) or not 0 <= point[axis] <= 1 for axis in ("x", "y")):
        report.error("POINT_RANGE", "Label position must contain x and y between 0 and 1.", f"{path}.position")
    if label.get("labelPosition") is not None:
        point = label.get("labelPosition")
        if not isinstance(point, dict) or any(not isinstance(point.get(axis), (int, float)) or not 0 <= point[axis] <= 1 for axis in ("x", "y")):
            report.error("POINT_RANGE", "labelPosition must contain x and y between 0 and 1.", f"{path}.labelPosition")
    status = label.get("status")
    if status not in CONTENT_STATUSES:
        report.error("LABEL_STATUS", "Label status is invalid.", f"{path}.status")
    quiz = label.get("quiz")
    if not isinstance(quiz, dict):
        report.error("QUIZ_REQUIRED", "Quiz settings must be an object.", f"{path}.quiz")
    else:
        if not isinstance(quiz.get("eligible"), bool):
            report.error("QUIZ_ELIGIBLE", "quiz.eligible must be a boolean.", f"{path}.quiz.eligible")
        if quiz.get("difficulty") not in DIFFICULTIES:
            report.error("QUIZ_DIFFICULTY", "Quiz difficulty must be beginner, intermediate or advanced.", f"{path}.quiz.difficulty")
        radius = quiz.get("acceptedRadius")
        if not isinstance(radius, (int, float)) or not 0.005 <= radius <= 0.2:
            report.error("QUIZ_RADIUS", "Quiz accepted radius must be between 0.005 and 0.2.", f"{path}.quiz.acceptedRadius", "Typical values are 0.025–0.075.")
    if published_view and status == "published":
        if not isinstance(label.get("description"), str) or not label["description"].strip():
            report.warning("LABEL_DESCRIPTION", "Published label has no anatomical description.", f"{path}.description")
        if not isinstance(label.get("category"), str) or not label["category"].strip():
            report.warning("LABEL_CATEGORY", "Published label has no category.", f"{path}.category")


def validate_view(root: Path, view_path: Path, entry: dict[str, Any], report: ValidationReport, *, collection_available: bool, manifest_thumbnail: str | None) -> None:
    data = load_json(view_path, report)
    if data is None:
        return
    validate_schema(root, data, "view.schema.json", view_path, report)
    report.counts["views"] += 1
    status = data.get("status")
    if status == "published": report.counts["publishedViews"] += 1
    else: report.counts["draftViews"] += 1
    required = collection_available and status == "published"

    if data.get("id") != entry.get("id"):
        report.error("VIEW_ID_MISMATCH", f"View ID {data.get('id')!r} does not match manifest ID {entry.get('id')!r}.", rel(root, view_path))
    if not id_valid(data.get("id")):
        report.error("ID_FORMAT", "View ID must use lowercase letters, numbers and hyphens.", rel(root, view_path))
    if status not in CONTENT_STATUSES:
        report.error("VIEW_STATUS", "View status is invalid.", rel(root, view_path))
    if required and (not isinstance(data.get("title"), str) or not data["title"].strip()):
        report.error("VIEW_TITLE_REQUIRED", "Published view requires a title.", rel(root, view_path))
    if required and (not isinstance(data.get("orientation"), str) or not data["orientation"].strip()):
        report.error("VIEW_ORIENTATION_REQUIRED", "Published view requires an orientation.", rel(root, view_path))

    image = data.get("image") if isinstance(data.get("image"), dict) else {}
    if required and (not isinstance(image.get("alt"), str) or not image["alt"].strip()):
        report.error("IMAGE_ALT_REQUIRED", "Published view requires useful alternative text.", rel(root, view_path))

    image_type = image.get("type")
    if image_type == "dzi":
        validate_dzi(root, image, view_path, report, required=required)
        check_asset(root, image.get("fallback"), f"{rel(root, view_path)} · image.fallback", report, required=required, missing_severity="error" if required else "warning")
    elif image_type == "image":
        report.counts["imageViews"] += 1
        validate_regular_image(root, image, view_path, report, required=required)
    else:
        report.error("IMAGE_TYPE", "image.type must be image or dzi.", rel(root, view_path))

    thumbnail = image.get("thumbnail") or manifest_thumbnail
    if required:
        check_asset(root, thumbnail, f"{rel(root, view_path)} · thumbnail", report, required=True, missing_severity="error")
    elif thumbnail:
        check_asset(root, thumbnail, f"{rel(root, view_path)} · thumbnail", report, required=False, missing_severity="warning")

    labels = data.get("labels")
    if not isinstance(labels, list):
        return
    report.counts["labels"] += len(labels)
    ids: set[str] = set()
    for index, label in enumerate(labels):
        validate_label(root, label, index, view_path, report, published_view=required)
        label_id = label.get("id") if isinstance(label, dict) else None
        if label_id in ids:
            report.error("DUPLICATE_LABEL_ID", f"Duplicate label ID “{label_id}”.", f"{rel(root, view_path)} · labels[{index}].id")
        if label_id:
            ids.add(label_id)


def validate_collection(root: Path, manifest_path: Path, collection_entry: dict[str, Any], species_id: str, system_id: str, report: ValidationReport, global_view_ids: dict[str, str], global_data_paths: dict[str, str]) -> None:
    manifest = load_json(manifest_path, report)
    if manifest is None:
        return
    validate_schema(root, manifest, "collection.schema.json", manifest_path, report)
    report.counts["collections"] += 1
    collection_available = collection_entry.get("status") == "available"

    expected_manifest_id = f"{species_id}-{collection_entry.get('id')}"
    if manifest.get("id") != expected_manifest_id:
        report.warning("COLLECTION_ID_CONVENTION", f"Collection manifest ID is “{manifest.get('id')}”; convention expects “{expected_manifest_id}”.", rel(root, manifest_path))
    if manifest.get("speciesId") != species_id:
        report.error("COLLECTION_SPECIES_MISMATCH", "Collection speciesId does not match species document.", rel(root, manifest_path))
    if manifest.get("systemId") != system_id:
        report.error("COLLECTION_SYSTEM_MISMATCH", "Collection systemId does not match parent system.", rel(root, manifest_path))
    if manifest.get("collectionId") != collection_entry.get("id"):
        report.error("COLLECTION_ID_MISMATCH", "collectionId does not match species collection entry.", rel(root, manifest_path))

    local_ids: set[str] = set()
    local_paths: set[str] = set()
    entries = manifest.get("views") if isinstance(manifest.get("views"), list) else []
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            report.error("VIEW_ENTRY_TYPE", "Collection view entry must be an object.", f"{rel(root, manifest_path)} · views[{index}]")
            continue
        view_id = entry.get("id")
        data_path = entry.get("dataPath")
        if not id_valid(view_id):
            report.error("ID_FORMAT", "View entry ID must use lowercase letters, numbers and hyphens.", f"{rel(root, manifest_path)} · views[{index}].id")
        if view_id in local_ids:
            report.error("DUPLICATE_VIEW_ID", f"Duplicate view ID “{view_id}” in collection.", rel(root, manifest_path))
        local_ids.add(view_id)
        if view_id in global_view_ids and global_view_ids[view_id] != rel(root, manifest_path):
            report.error("DUPLICATE_VIEW_ID_GLOBAL", f"View ID “{view_id}” is registered by more than one collection.", rel(root, manifest_path))
        elif view_id:
            global_view_ids[view_id] = rel(root, manifest_path)
        check_path_style(data_path, f"{rel(root, manifest_path)} · views[{index}].dataPath", report)
        if data_path in local_paths:
            report.error("DUPLICATE_VIEW_PATH", f"Duplicate view dataPath “{data_path}” in collection.", rel(root, manifest_path))
        local_paths.add(data_path)
        if data_path in global_data_paths and global_data_paths[data_path] != view_id:
            report.error("DUPLICATE_VIEW_PATH_GLOBAL", f"View dataPath “{data_path}” is shared by multiple view IDs.", rel(root, manifest_path))
        elif data_path:
            global_data_paths[data_path] = view_id
        view_path = resolve_local(root, data_path) if isinstance(data_path, str) else None
        if view_path is None:
            continue
        if not view_path.is_file():
            (report.error if collection_available else report.warning)("VIEW_FILE_MISSING", f"View JSON does not exist: {data_path}", rel(root, manifest_path))
            continue
        validate_view(root, view_path, entry, report, collection_available=collection_available, manifest_thumbnail=entry.get("thumbnail"))

    default_id = manifest.get("defaultViewId")
    if default_id and default_id not in local_ids:
        report.error("DEFAULT_VIEW_MISSING", f"defaultViewId “{default_id}” is not registered in the collection.", rel(root, manifest_path))


def validate_versions(root: Path, report: ValidationReport) -> None:
    app_config = (root / "app-config.js").read_text(encoding="utf-8")
    match = re.search(r'version:\s*"([^"]+)"', app_config)
    app_version = match.group(1) if match else None
    if app_version != VALIDATOR_VERSION:
        report.error("VERSION_CONFIG", f"app-config.js version is {app_version!r}; expected {VALIDATOR_VERSION}.", "app-config.js")
    if "assetVersion:" not in app_config or "MORPHORA_RELEASE" not in app_config:
        report.error("VERSION_ASSET_CONFIG", "app-config.js must derive assetVersion from release metadata.", "app-config.js")

    package = load_json(root / "package.json", report)
    if package and package.get("version") != VALIDATOR_VERSION:
        report.error("VERSION_PACKAGE", f"package.json version is {package.get('version')!r}; expected {VALIDATOR_VERSION}.", "package.json")

    release_json = load_json(root / "release.json", report)
    if release_json and release_json.get("version") != VALIDATOR_VERSION:
        report.error("VERSION_RELEASE_JSON", f"release.json version is {release_json.get('version')!r}; expected {VALIDATOR_VERSION}.", "release.json")
    release_meta_path = root / "release-meta.js"
    if not release_meta_path.is_file():
        report.error("RELEASE_META_MISSING", "release-meta.js is required for release-aware caching.", "release-meta.js")
    else:
        release_meta = release_meta_path.read_text(encoding="utf-8")
        if VALIDATOR_VERSION not in release_meta:
            report.error("VERSION_RELEASE_META", "release-meta.js development metadata is not current.", "release-meta.js")

    for html_name in ("index.html", "studio.html", "dev-tools.html"):
        path = root / html_name
        if not path.is_file():
            report.error("VERSION_PAGE_MISSING", "Expected application page is missing.", html_name)
            continue
        text = path.read_text(encoding="utf-8")
        stale = sorted(set(re.findall(r"\?v=(\d+(?:\.\d+){2,3})", text)) - {VALIDATOR_VERSION})
        if stale:
            report.error("VERSION_ASSET_STALE", f"Page contains stale cache versions: {', '.join(stale)}.", html_name)
        release_pos = text.find("release-meta.js")
        config_pos = text.find("app-config.js")
        if release_pos < 0 or config_pos < 0 or release_pos > config_pos:
            report.error("RELEASE_META_ORDER", "release-meta.js must load before app-config.js.", html_name)

    sw = (root / "service-worker.js").read_text(encoding="utf-8")
    if VALIDATOR_VERSION not in sw:
        report.error("VERSION_SERVICE_WORKER", "Service worker fallback version is not current.", "service-worker.js")
    if 'importScripts("./release-meta.js", "./app-config.js")' not in sw:
        report.error("RELEASE_SW_META", "Service worker must import release-meta.js before app-config.js.", "service-worker.js")

    deploy_workflow = root / ".github" / "workflows" / "deploy-pages.yml"
    if not deploy_workflow.is_file():
        report.error("DEPLOY_WORKFLOW_MISSING", "Validated GitHub Pages deployment workflow is missing.", ".github/workflows/deploy-pages.yml")
    else:
        workflow = deploy_workflow.read_text(encoding="utf-8")
        for token, code, message in (
            ("npm run check", "DEPLOY_GATE_MISSING", "Deployment workflow must run the authoritative validation gate."),
            ("npm run release:verify", "DEPLOY_BUILD_MISSING", "Deployment workflow must build and verify the release artifact."),
            ("actions/upload-pages-artifact", "DEPLOY_ARTIFACT_MISSING", "Deployment workflow must upload a GitHub Pages artifact."),
            ("actions/deploy-pages", "DEPLOY_ACTION_MISSING", "Deployment workflow must deploy through GitHub Pages Actions."),
        ):
            if token not in workflow:
                report.error(code, message, ".github/workflows/deploy-pages.yml")


def validate_project(root: Path, *, write_report: bool = True) -> ValidationReport:
    report = ValidationReport(project_root=root.as_posix())
    validate_versions(root, report)

    catalog_path = root / "data" / "catalog.json"
    catalog = load_json(catalog_path, report)
    if catalog is None:
        if write_report: report.write(root / "reports")
        return report
    validate_schema(root, catalog, "catalog.schema.json", catalog_path, report)

    species_ids: set[str] = set()
    global_collection_manifest_paths: set[str] = set()
    global_collection_ids: dict[str, str] = {}
    global_view_ids: dict[str, str] = {}
    global_data_paths: dict[str, str] = {}

    for index, species_entry in enumerate(catalog.get("species", [])):
        if not isinstance(species_entry, dict):
            report.error("SPECIES_ENTRY_TYPE", "Catalog species entry must be an object.", f"data/catalog.json · species[{index}]")
            continue
        species_id = species_entry.get("id")
        if not id_valid(species_id):
            report.error("ID_FORMAT", "Species ID must use lowercase letters, numbers and hyphens.", f"data/catalog.json · species[{index}].id")
        if species_id in species_ids:
            report.error("DUPLICATE_SPECIES_ID", f"Duplicate species ID “{species_id}”.", "data/catalog.json")
        species_ids.add(species_id)
        if species_entry.get("status") not in AVAILABILITY_STATUSES:
            report.error("SPECIES_STATUS", "Species status must be available or coming-soon.", f"data/catalog.json · species[{index}].status")
        if species_entry.get("coverImage"):
            check_asset(root, species_entry.get("coverImage"), f"data/catalog.json · species[{index}].coverImage", report, required=False, missing_severity="warning")
        if species_entry.get("status") != "available":
            continue
        data_path = species_entry.get("dataPath")
        check_path_style(data_path, f"data/catalog.json · species[{index}].dataPath", report)
        species_path = resolve_local(root, data_path) if isinstance(data_path, str) else None
        if species_path is None or not species_path.is_file():
            report.error("SPECIES_FILE_MISSING", f"Available species file not found: {data_path}", "data/catalog.json")
            continue
        species = load_json(species_path, report)
        if species is None:
            continue
        report.counts["species"] += 1
        validate_schema(root, species, "species.schema.json", species_path, report)
        if species.get("id") != species_id:
            report.error("SPECIES_ID_MISMATCH", "Species document ID does not match catalog entry.", rel(root, species_path))
        if species.get("coverImage"):
            check_asset(root, species.get("coverImage"), f"{rel(root, species_path)} · coverImage", report, required=False, missing_severity="warning")

        system_ids: set[str] = set()
        for system_index, system in enumerate(species.get("systems", [])):
            if not isinstance(system, dict):
                continue
            system_id = system.get("id")
            if system_id in system_ids:
                report.error("DUPLICATE_SYSTEM_ID", f"Duplicate system ID “{system_id}”.", rel(root, species_path))
            system_ids.add(system_id)
            collection_ids: set[str] = set()
            for collection_index, collection in enumerate(system.get("collections", [])):
                if not isinstance(collection, dict):
                    continue
                collection_id = collection.get("id")
                if collection.get("status") == "available":
                    check_asset(root, collection.get("thumbnail"), f"{rel(root, species_path)} · collection {collection_id} thumbnail", report, required=True, missing_severity="error")
                elif collection.get("thumbnail"):
                    check_asset(root, collection.get("thumbnail"), f"{rel(root, species_path)} · collection {collection_id} thumbnail", report, required=False, missing_severity="warning")
                if collection_id in collection_ids:
                    report.error("DUPLICATE_COLLECTION_ID", f"Duplicate collection ID “{collection_id}” in system “{system_id}”.", rel(root, species_path))
                collection_ids.add(collection_id)
                global_key = f"{species_id}/{system_id}/{collection_id}"
                if global_key in global_collection_ids:
                    report.error("DUPLICATE_COLLECTION_GLOBAL", f"Duplicate collection key “{global_key}”.", rel(root, species_path))
                global_collection_ids[global_key] = rel(root, species_path)
                manifest_path_value = collection.get("manifestPath")
                if not manifest_path_value:
                    if collection.get("status") == "available":
                        report.error("COLLECTION_MANIFEST_REQUIRED", "Available collection requires manifestPath.", f"{rel(root, species_path)} · systems[{system_index}].collections[{collection_index}]")
                    continue
                check_path_style(manifest_path_value, f"{rel(root, species_path)} · collection manifestPath", report)
                if manifest_path_value in global_collection_manifest_paths:
                    report.error("DUPLICATE_MANIFEST_PATH", f"Collection manifest path is registered more than once: {manifest_path_value}", rel(root, species_path))
                global_collection_manifest_paths.add(manifest_path_value)
                manifest_path = resolve_local(root, manifest_path_value)
                if manifest_path is None or not manifest_path.is_file():
                    (report.error if collection.get("status") == "available" else report.warning)("COLLECTION_MANIFEST_MISSING", f"Collection manifest not found: {manifest_path_value}", rel(root, species_path))
                    continue
                validate_collection(root, manifest_path, collection, species_id, system_id, report, global_view_ids, global_data_paths)

    validate_question_banks(root, report, global_view_ids)

    report.passed("PROJECT_GRAPH", f"Traversed {report.counts['species']} species, {report.counts['collections']} collection manifests and {report.counts['views']} views.")
    report.passed("SCHEMA_VERSION", "Canonical schema version 2 is enforced by repository schemas.")
    report.passed("VERSION_CONSISTENCY", f"Runtime, release metadata and package version checked against {VALIDATOR_VERSION}.")
    report.passed("DEPLOYMENT_GATE", "GitHub Pages deployment workflow is validation-gated and artifact-based.")
    if write_report:
        report.write(root / "reports")
    return report



def validate_question_banks(root: Path, report: ValidationReport, global_view_ids: dict[str, str]) -> None:
    question_dir = root / "data" / "questions"
    if not question_dir.is_dir():
        report.warning("QUESTION_BANK_DIR_MISSING", "No custom question-bank directory is present.", "data/questions")
        return
    for path in sorted(question_dir.glob("*.json")):
        if path.name.upper().startswith("QUESTION-BANK-TEMPLATE"):
            continue
        data = load_json(path, report)
        if data is None:
            continue
        report.counts["questionBanks"] += 1
        validate_schema(root, data, "question-bank.schema.json", path, report)
        expected_collection = path.stem
        if data.get("collectionId") != expected_collection:
            report.error("QUESTION_BANK_COLLECTION", f"Question bank collectionId must match filename “{expected_collection}”.", rel(root, path))
        seen: set[str] = set()
        for index, question in enumerate(data.get("questions", [])):
            logical = f"{rel(root, path)} · questions[{index}]"
            if not isinstance(question, dict):
                report.error("QUESTION_TYPE", "Question must be an object.", logical)
                continue
            question_id = question.get("id")
            if question_id in seen:
                report.error("DUPLICATE_QUESTION_ID", f"Duplicate custom question ID “{question_id}”.", logical)
            seen.add(question_id)
            report.counts["customQuestions"] += 1
            options = question.get("options") if isinstance(question.get("options"), list) else []
            correct_index = question.get("correctIndex")
            if not isinstance(correct_index, int) or correct_index < 0 or correct_index >= len(options):
                report.error("QUESTION_CORRECT_INDEX", "correctIndex must point to an existing option.", f"{logical}.correctIndex")
            if len(set(options)) != len(options):
                report.warning("QUESTION_DUPLICATE_OPTIONS", "Question contains duplicate answer options.", logical)
            for view_id in question.get("viewIds", []) or []:
                if view_id not in global_view_ids:
                    report.error("QUESTION_VIEW_REFERENCE", f"Question references unknown view ID “{view_id}”.", logical)
            label_id = question.get("labelId")
            if label_id is not None and not id_valid(label_id):
                report.error("QUESTION_LABEL_ID", "labelId must be null or a valid MORPHORA identifier.", f"{logical}.labelId")
    report.passed("QUESTION_BANKS", f"Validated {report.counts['questionBanks']} custom question bank(s) and {report.counts['customQuestions']} authored question(s).")

def print_report(report: ValidationReport) -> None:
    summary = report.summary
    print("MORPHORA project validation")
    print(f"Version: V{VALIDATOR_VERSION}")
    print(f"Species: {report.counts['species']} · Collections: {report.counts['collections']} · Views: {report.counts['views']} · Labels: {report.counts['labels']} · Custom questions: {report.counts.get('customQuestions', 0)}")
    print()
    for severity, symbol in (("error", "✗"), ("warning", "!")):
        for item in (i for i in report.issues if i.severity == severity):
            location = f" [{item.path}]" if item.path else ""
            print(f"{symbol} {item.code}{location}: {item.message}")
            if item.hint:
                print(f"  → {item.hint}")
    if not summary["errors"] and not summary["warnings"]:
        print("✓ No validation issues found.")
    print()
    print(f"Result: {summary['errors']} error(s), {summary['warnings']} warning(s), {summary['passes']} pass record(s)")
    print("Reports: reports/validation-report.json · reports/validation-report.txt")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--no-report", action="store_true", help="Do not write reports/validation-report.*")
    parser.add_argument("--warnings-as-errors", action="store_true")
    args = parser.parse_args()
    root = args.project_root.resolve()
    report = validate_project(root, write_report=not args.no_report)
    print_report(report)
    if report.summary["errors"]:
        return 1
    if args.warnings_as_errors and report.summary["warnings"]:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
