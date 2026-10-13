#!/usr/bin/env python3
"""Convert a folder of photographs into MORPHORA Deep Zoom starter views.

The command never edits an existing collection manifest. It writes a reviewable
batch-manifest-draft.json so an editor can deliberately register the new views.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from build_deepzoom import create_starter_json, human_bytes
from deepzoom import generate_deepzoom, sanitize_id


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_directory", type=Path)
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--prefix", default="", help="Optional id prefix, for example dog-cervical-")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--no-view-json", action="store_true")
    args = parser.parse_args()

    source_directory = args.source_directory.resolve()
    project_root = args.project_root.resolve()
    if not source_directory.is_dir():
        print(f"ERROR: Folder not found: {source_directory}", file=sys.stderr)
        return 1

    sources = sorted(path for path in source_directory.iterdir() if path.suffix.lower() in IMAGE_SUFFIXES)
    if not sources:
        print("ERROR: No supported photographs were found.", file=sys.stderr)
        return 1

    draft_entries = []
    total_tiles = 0
    total_size = 0

    for source in sources:
        image_id = sanitize_id(f"{args.prefix}{source.stem}")
        try:
            result = generate_deepzoom(
                source,
                project_root,
                image_id,
                overwrite=args.overwrite,
            )
            if not args.no_view_json:
                create_starter_json(
                    project_root,
                    result,
                    title=image_id.replace("-", " ").title(),
                    orientation="unspecified",
                    alt=f"Anatomical photograph for {image_id.replace('-', ' ')}",
                    fallback_path=None,
                )
            draft_entries.append(
                {
                    "id": image_id,
                    "buttonLabel": image_id.replace("-", " ").title(),
                    "dataPath": f"data/views/{image_id}.json",
                }
            )
            total_tiles += result.tile_count
            total_size += result.total_bytes
            print(f"✓ {source.name} → {image_id} ({result.tile_count} tiles)")
        except Exception as error:
            print(f"✗ {source.name}: {error}", file=sys.stderr)
            return 1

    draft_path = source_directory / "batch-manifest-draft.json"
    draft_path.write_text(json.dumps({"views": draft_entries}, indent=2) + "\n", encoding="utf-8")

    print("\nBatch conversion complete")
    print(f"  Photographs: {len(sources)}")
    print(f"  Tiles:       {total_tiles}")
    print(f"  Size:        {human_bytes(total_size)}")
    print(f"  Draft:       {draft_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
