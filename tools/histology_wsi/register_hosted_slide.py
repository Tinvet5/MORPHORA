#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Register a hosted DZI descriptor URL in a MORPHORA Histology slide manifest.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--url", required=True, help="Public HTTPS URL ending in .dzi")
    parser.add_argument("--barcode-url", default="")
    parser.add_argument("--mode", choices=["auto", "hosted", "local"], default="auto")
    args = parser.parse_args()
    if not args.url.lower().startswith("https://"):
        raise SystemExit("Hosted production DZI URLs must use https://")
    if ".dzi" not in args.url.lower():
        raise SystemExit("The hosted descriptor URL must point to a .dzi descriptor.")
    path = Path(args.manifest).resolve()
    data = json.loads(path.read_text(encoding="utf-8"))
    data["delivery"] = {
        "mode": args.mode,
        "hosted": {"type": "dzi", "descriptorUrl": args.url, "barcodeUrl": args.barcode_url},
        "fallback": {"type": "pma-start"},
    }
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Registered hosted DZI for {data.get('id', path.stem)}: {args.url}")
    print(f"Delivery mode: {args.mode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
