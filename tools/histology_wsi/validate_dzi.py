#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

from dzi_utils import expected_tile_root, parse_dzi


def level_dimensions(width: int, height: int, max_level: int, level: int) -> tuple[int, int]:
    divisor = 2 ** max(0, max_level - level)
    return math.ceil(width / divisor), math.ceil(height / divisor)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a generated DZI pyramid against a MORPHORA Histology manifest.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--dzi", required=True)
    parser.add_argument("--full", action="store_true", help="Check that every expected DZI tile exists, not only the descriptor and first tile.")
    args = parser.parse_args()

    manifest_path = Path(args.manifest).resolve()
    dzi_path = Path(args.dzi).resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    info = parse_dzi(dzi_path)
    expected = manifest["image"]
    errors: list[str] = []
    if info.width != int(expected["width"]): errors.append(f"width mismatch: DZI={info.width}, manifest={expected['width']}")
    if info.height != int(expected["height"]): errors.append(f"height mismatch: DZI={info.height}, manifest={expected['height']}")
    if info.tile_size != int(expected.get("tileSize") or info.tile_size): errors.append(f"tile-size mismatch: DZI={info.tile_size}, manifest={expected.get('tileSize')}")
    tile_root = expected_tile_root(dzi_path)
    if not tile_root.is_dir(): errors.append(f"tile directory missing: {tile_root}")
    low_tile = tile_root / "0" / f"0_0.{info.format}"
    if not low_tile.is_file(): errors.append(f"level-0 tile missing: {low_tile}")

    expected_tiles = 0
    missing_tiles = 0
    if args.full and tile_root.is_dir():
        for level in range(info.max_level + 1):
            level_w, level_h = level_dimensions(info.width, info.height, info.max_level, level)
            tiles_x = math.ceil(level_w / info.tile_size)
            tiles_y = math.ceil(level_h / info.tile_size)
            expected_tiles += tiles_x * tiles_y
            for y in range(tiles_y):
                for x in range(tiles_x):
                    path = tile_root / str(level) / f"{x}_{y}.{info.format}"
                    if not path.is_file() or path.stat().st_size < 4:
                        missing_tiles += 1
                        if len(errors) < 25:
                            errors.append(f"missing tile: {path}")
        if missing_tiles and len(errors) >= 25:
            errors.append(f"… plus {max(0, missing_tiles - 24):,} additional missing tiles")

    if errors:
        print("DZI validation failed:", file=sys.stderr)
        for error in errors: print(f"- {error}", file=sys.stderr)
        return 1
    suffix = f" · {expected_tiles:,} tiles complete" if args.full else ""
    print(f"DZI valid: {manifest['id']} · {info.width:,} × {info.height:,} px · tile {info.tile_size} · max level {info.max_level}{suffix}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
