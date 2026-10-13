#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from dzi_utils import expected_tile_root, parse_dzi


def fail(message: str, code: int = 2) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(code)


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def run_checked(cmd: list[str]) -> None:
    print("+", " ".join(f'"{part}"' if " " in part else part for part in cmd))
    result = subprocess.run(cmd)
    if result.returncode:
        raise SystemExit(result.returncode)


def validate(manifest_path: Path, dzi_path: Path) -> None:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    info = parse_dzi(dzi_path)
    expected = manifest.get("image", {})
    width = int(expected.get("width", 0))
    height = int(expected.get("height", 0))
    errors: list[str] = []
    if info.width != width:
        errors.append(f"width mismatch: DZI={info.width}, MORPHORA={width}")
    if info.height != height:
        errors.append(f"height mismatch: DZI={info.height}, MORPHORA={height}")
    tile_root = expected_tile_root(dzi_path)
    if not tile_root.is_dir():
        errors.append(f"missing tile directory: {tile_root}")
    first_tile = tile_root / "0" / f"0_0.{info.format}"
    if not first_tile.is_file():
        errors.append(f"missing first DZI tile: {first_tile}")
    if errors:
        fail("Pilot DZI failed integrity checks:\n- " + "\n- ".join(errors))
    print(f"INTEGRITY OK: {manifest.get('id')} · {info.width:,} × {info.height:,} px · tile {info.tile_size} · max level {info.max_level}")


def main() -> int:
    root = project_root()
    parser = argparse.ArgumentParser(
        description="Prepare and optionally serve a MORPHORA Histology DZI pilot. Defaults to Hueso-4."
    )
    parser.add_argument("--slide-id", default="hueso-4", help="MORPHORA Histology slide id (default: hueso-4).")
    parser.add_argument("--input", help="Optional compatible WSI export to convert before validation.")
    parser.add_argument("--output-root", default=str(root / "hosted-slides"), help="DZI output root.")
    parser.add_argument("--port", type=int, default=8008)
    parser.add_argument("--serve", action="store_true", help="Start the local CORS tile server after validation.")
    parser.add_argument("--force", action="store_true", help="Replace existing DZI output when converting.")
    args = parser.parse_args()

    manifest_path = root / "histology" / "slides" / f"{args.slide_id}.json"
    if not manifest_path.is_file():
        fail(f"Unknown slide id or missing manifest: {manifest_path}")

    output_root = Path(args.output_root).expanduser().resolve()
    dzi_path = output_root / args.slide_id / "slide.dzi"

    if args.input:
        converter = Path(__file__).with_name("convert_to_dzi.py")
        cmd = [
            sys.executable, str(converter),
            "--input", str(Path(args.input).expanduser()),
            "--output-root", str(output_root),
            "--slide-id", args.slide_id,
            "--tile-size", "512",
        ]
        if args.force:
            cmd.append("--force")
        run_checked(cmd)

    if not dzi_path.is_file():
        fail(
            f"No pilot DZI found at {dzi_path}.\n"
            "Export the MDSX slide to a libvips/OpenSlide-readable pyramidal file if necessary, then run:\n"
            f"  python tools/histology_wsi/pilot_slide.py --slide-id {args.slide_id} --input <exported-wsi> --serve"
        )

    validate(manifest_path, dzi_path)
    local_url = f"http://127.0.0.1:{args.port}/{args.slide_id}/slide.dzi"
    print("\nPILOT READY")
    print(f"Descriptor: {local_url}")
    print("In MORPHORA: Histology Setup → Use local DZI pilot.")
    print("The viewer switches to Hosted DZI only, so a successful open proves PMA.start is not serving the slide.")

    if args.serve:
        server = Path(__file__).with_name("serve_tiles.py")
        run_checked([sys.executable, str(server), "--root", str(output_root), "--port", str(args.port)])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
