#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


def fail(message: str, code: int = 2) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(code)


def fetch(url: str):
    request = urllib.request.Request(url, headers={"User-Agent": "MORPHORA-WSI-Check/0.8.2"})
    return urllib.request.urlopen(request, timeout=20)


def parse_descriptor(payload: bytes) -> tuple[int, int, int, str]:
    root = ET.fromstring(payload)
    attrs = {k.lower(): v for k, v in root.attrib.items()}
    size = next((child for child in root if child.tag.split("}")[-1] == "Size"), None)
    if size is None:
        fail("DZI descriptor has no Size element.")
    sattrs = {k.lower(): v for k, v in size.attrib.items()}
    return int(sattrs["width"]), int(sattrs["height"]), int(attrs["tilesize"]), attrs.get("format", "jpg").lower()


def tile_url(descriptor_url: str, fmt: str) -> str:
    parts = urllib.parse.urlsplit(descriptor_url)
    path = parts.path
    stem = path.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    base_path = path.rsplit("/", 1)[0] + f"/{stem}_files/0/0_0.{fmt}"
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, base_path, "", ""))


def main() -> int:
    parser = argparse.ArgumentParser(description="Check a deployed MORPHORA DZI descriptor and its first tile.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--url", required=True)
    parser.add_argument("--origin", default="https://morphora.cl", help="Browser origin used for CORS validation.")
    parser.add_argument("--require-cors", action="store_true")
    args = parser.parse_args()
    if not args.url.lower().startswith(("https://", "http://127.0.0.1:", "http://localhost:")):
        fail("Use HTTPS for production URLs. HTTP is accepted only for localhost pilot checks.")

    manifest = json.loads(Path(args.manifest).resolve().read_text(encoding="utf-8"))
    with fetch(args.url) as response:
        descriptor = response.read()
        cors = response.headers.get("Access-Control-Allow-Origin", "")
    width, height, tile_size, fmt = parse_descriptor(descriptor)
    expected = manifest["image"]
    if width != int(expected["width"]) or height != int(expected["height"]):
        fail(f"Dimension mismatch: hosted DZI={width} × {height}; MORPHORA={expected['width']} × {expected['height']}")
    if args.require_cors and cors not in {"*", args.origin}:
        fail(f"CORS is not browser-ready. Access-Control-Allow-Origin={cors!r}; expected '*' or {args.origin!r}.")

    first_tile = tile_url(args.url, fmt)
    with fetch(first_tile) as response:
        response.read(1)
        tile_type = response.headers.get("Content-Type", "")
    max_level = math.ceil(math.log2(max(width, height)))
    print(f"HOSTED SOURCE OK: {manifest['id']} · {width:,} × {height:,} px · tile {tile_size} · max level {max_level}")
    print(f"Descriptor: {args.url}")
    print(f"First tile: {first_tile} · {tile_type or 'content-type not reported'}")
    if cors:
        print(f"CORS: {cors}")
    elif not args.require_cors:
        print("CORS: header not observed (use --require-cors for cross-origin production verification)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
