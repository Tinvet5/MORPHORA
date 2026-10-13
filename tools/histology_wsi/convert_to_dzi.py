#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def fail(message: str, code: int = 2) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(code)


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert a WSI readable by libvips/OpenSlide into a Deep Zoom Image pyramid for MORPHORA.")
    parser.add_argument("--input", required=True, help="Input WSI (SVS, pyramidal TIFF, OME-TIFF, NDPI, or another format readable by libvips).")
    parser.add_argument("--output-root", default="hosted-slides", help="Directory that will receive <slide-id>/slide.dzi and slide_files/.")
    parser.add_argument("--slide-id", required=True, help="MORPHORA slide id, e.g. hueso-4 or 48515-2.")
    parser.add_argument("--tile-size", type=int, default=512)
    parser.add_argument("--overlap", type=int, default=0)
    parser.add_argument("--quality", type=int, default=88)
    parser.add_argument("--suffix", default=".jpg", choices=[".jpg", ".jpeg", ".png", ".webp"])
    parser.add_argument("--force", action="store_true", help="Remove an existing DZI output for this slide before conversion.")
    args = parser.parse_args()

    source = Path(args.input).expanduser().resolve()
    if not source.is_file():
        fail(f"Input file does not exist: {source}")
    if not (128 <= args.tile_size <= 2048):
        fail("--tile-size must be between 128 and 2048.")
    if not (0 <= args.overlap <= 64):
        fail("--overlap must be between 0 and 64.")
    if not (40 <= args.quality <= 100):
        fail("--quality must be between 40 and 100.")

    vips = shutil.which("vips")
    if not vips:
        fail("libvips was not found on PATH. Install libvips with OpenSlide support, then rerun this command.")

    probe = run([vips, "header", str(source)])
    if probe.returncode != 0:
        ext = source.suffix.lower()
        extra = ""
        if ext in {".mdsx", ".mds"}:
            extra = (" Motic MDSX containers are not universally readable by OpenSlide/libvips. "
                     "Export the slide first to a compatible pyramidal master (for example pyramidal TIFF/OME-TIFF/SVS) "
                     "using Pathomation/Motic-compatible software, then run this tool on that exported master.")
        fail(f"libvips cannot read this slide.{extra}\n\nlibvips output:\n{probe.stdout.strip()}")

    slide_dir = Path(args.output_root).expanduser().resolve() / args.slide_id
    base = slide_dir / "slide"
    descriptor = base.with_suffix(".dzi")
    tile_root = slide_dir / "slide_files"
    if descriptor.exists() or tile_root.exists():
        if not args.force:
            fail(f"Output already exists for {args.slide_id}. Use --force to replace it.")
        if descriptor.exists(): descriptor.unlink()
        if tile_root.exists(): shutil.rmtree(tile_root)
    slide_dir.mkdir(parents=True, exist_ok=True)

    suffix = args.suffix
    if suffix in {".jpg", ".jpeg"}:
        suffix = f".jpg[Q={args.quality},strip]"
    elif suffix == ".webp":
        suffix = f".webp[Q={args.quality},strip]"

    cmd = [vips, "dzsave", str(source), str(base),
           "--layout", "dz",
           "--tile-size", str(args.tile_size),
           "--overlap", str(args.overlap),
           "--suffix", suffix,
           "--depth", "onepixel"]
    print("Converting WSI to DZI…")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        fail("libvips dzsave failed.", result.returncode)
    if not descriptor.is_file() or not tile_root.is_dir():
        fail("Conversion finished without the expected slide.dzi + slide_files output.")

    print(f"READY: {descriptor}")
    print(f"TILES: {tile_root}")
    print("Next: validate the DZI against the MORPHORA manifest, then upload this slide directory to object storage/CDN.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
