#!/usr/bin/env python3
"""Build a MORPHORA Deep Zoom view from one source photograph."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from deepzoom import generate_deepzoom, sanitize_id


def human_bytes(size: int) -> str:
    value = float(size)
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return f"{value:.1f} {unit}"
        value /= 1024
    return f"{size} B"


def create_starter_json(project_root: Path, result, title: str, orientation: str, alt: str, fallback_path: str | None) -> Path:
    relative_descriptor = result.descriptor_path.relative_to(project_root).as_posix()
    relative_thumbnail = result.thumbnail_path.relative_to(project_root).as_posix() if result.thumbnail_path else None
    relative_fallback = fallback_path or (result.fallback_path.relative_to(project_root).as_posix() if result.fallback_path else None)

    image_data = {
        "type": "dzi",
        "src": relative_descriptor,
        "width": result.width,
        "height": result.height,
        "alt": alt,
    }
    if relative_fallback:
        image_data["fallback"] = relative_fallback
    if relative_thumbnail:
        image_data["thumbnail"] = relative_thumbnail

    data = {
        "schemaVersion": 1,
        "id": result.image_id,
        "title": title,
        "orientation": orientation,
        "image": image_data,
        "labels": [],
    }

    output = project_root / "data" / "views" / f"{result.image_id}.json"
    if output.exists():
        raise FileExistsError(f"View JSON already exists: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return output


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Source JPG, PNG, TIFF, or WebP photograph")
    parser.add_argument("--id", dest="image_id", help="Stable view id; defaults to the source filename")
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--tile-size", type=int, default=256)
    parser.add_argument("--overlap", type=int, default=1)
    parser.add_argument("--format", choices=("jpg", "png", "webp"), default="jpg")
    parser.add_argument("--quality", type=int, default=86)
    parser.add_argument("--thumbnail-width", type=int, default=640)
    parser.add_argument("--no-thumbnail", action="store_true")
    parser.add_argument("--no-fallback", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--create-view-json", action="store_true")
    parser.add_argument("--title", default="Untitled anatomical view")
    parser.add_argument("--orientation", default="unspecified")
    parser.add_argument("--alt", default="Anatomical specimen photograph")
    parser.add_argument("--fallback-path", help="Use an existing fallback path in the generated JSON")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    image_id = sanitize_id(args.image_id or args.source.stem)

    try:
        result = generate_deepzoom(
            args.source,
            args.project_root,
            image_id,
            tile_size=args.tile_size,
            overlap=args.overlap,
            output_format=args.format,
            quality=args.quality,
            thumbnail_width=args.thumbnail_width,
            create_thumbnail=not args.no_thumbnail,
            create_fallback=not args.no_fallback,
            overwrite=args.overwrite,
        )

        view_json = None
        if args.create_view_json:
            view_json = create_starter_json(
                args.project_root.resolve(),
                result,
                args.title,
                args.orientation,
                args.alt,
                args.fallback_path,
            )

        print("MORPHORA Deep Zoom build complete")
        print(f"  View id:        {result.image_id}")
        print(f"  Dimensions:     {result.width} × {result.height}")
        print(f"  Pyramid levels: {result.max_level + 1} (0–{result.max_level})")
        print(f"  Tiles:          {result.tile_count}")
        print(f"  Descriptor:     {result.descriptor_path.relative_to(args.project_root.resolve())}")
        if result.thumbnail_path:
            print(f"  Thumbnail:      {result.thumbnail_path.relative_to(args.project_root.resolve())}")
        if result.fallback_path:
            print(f"  Fallback:       {result.fallback_path.relative_to(args.project_root.resolve())}")
        if view_json:
            print(f"  View JSON:      {view_json.relative_to(args.project_root.resolve())}")
        print(f"  Generated size: {human_bytes(result.total_bytes)}")
        return 0
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
