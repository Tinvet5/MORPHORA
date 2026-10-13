#!/usr/bin/env python3
from __future__ import annotations

import argparse
import concurrent.futures
import json
import math
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

USER_AGENT = "MORPHORA-PMA-DZI/0.8.2"
DZI_NS = "http://schemas.microsoft.com/deepzoom/2008"


class ExportError(RuntimeError):
    pass


@dataclass(frozen=True)
class SlideInfo:
    width: int
    height: int
    tile_size: int
    pma_max_level: int
    mpp_x: float
    mpp_y: float


@dataclass(frozen=True)
class TileJob:
    dzi_level: int
    x: int
    y: int
    url: str
    destination: Path
    source_kind: str


def fail(message: str) -> None:
    raise ExportError(message)


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def normalize_server(url: str) -> str:
    value = str(url or "").strip()
    if not value:
        value = "http://127.0.0.1:54001/"
    if not value.lower().startswith(("http://", "https://")):
        value = "http://" + value
    if not value.endswith("/"):
        value += "/"
    return value


def api_url(server: str, method: str, params: dict[str, Any] | None = None) -> str:
    base = urllib.parse.urljoin(server, f"api/json/{method}")
    if not params:
        return base
    return base + "?" + urllib.parse.urlencode({k: str(v) for k, v in params.items() if v is not None})


def image_url(server: str, endpoint: str, params: dict[str, Any]) -> str:
    base = urllib.parse.urljoin(server, endpoint)
    return base + "?" + urllib.parse.urlencode({k: str(v) for k, v in params.items() if v is not None})


def request_bytes(url: str, timeout: float, retries: int) -> tuple[bytes, str]:
    last: Exception | None = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=timeout) as response:
                data = response.read()
                content_type = response.headers.get("Content-Type", "")
                if not data:
                    raise ExportError("PMA.start returned an empty response.")
                return data, content_type
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, ExportError) as exc:
            last = exc
            if attempt >= retries:
                break
            time.sleep(min(2.5, 0.25 * (2**attempt)))
    raise ExportError(f"Request failed after {retries + 1} attempts: {url}\n{last}")


def request_json(url: str, timeout: float, retries: int) -> Any:
    raw, _ = request_bytes(url, timeout, retries)
    try:
        value = json.loads(raw.decode("utf-8-sig"))
    except Exception as exc:
        raise ExportError(f"PMA.start returned non-JSON data for {url}: {exc}") from exc
    if isinstance(value, dict) and "d" in value:
        value = value["d"]
    if isinstance(value, dict) and (value.get("Code") or value.get("Message")) and not value.get("Width"):
        raise ExportError(str(value.get("Message") or value.get("Code")))
    return value


def valid_image_bytes(data: bytes, content_type: str = "") -> bool:
    if data.startswith(b"\xff\xd8\xff"):
        return True
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    return content_type.lower().startswith("image/") and len(data) > 32


def valid_existing_image(path: Path) -> bool:
    try:
        if path.stat().st_size < 4:
            return False
        with path.open("rb") as handle:
            head = handle.read(16)
        return head.startswith(b"\xff\xd8\xff") or head.startswith(b"\x89PNG\r\n\x1a\n")
    except OSError:
        return False


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".part")
    with temp.open("wb") as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp, path)


def atomic_write_text(path: Path, text: str) -> None:
    atomic_write(path, text.encode("utf-8"))


def parse_slide_info(remote: dict[str, Any], manifest: dict[str, Any]) -> SlideInfo:
    image = manifest["image"]
    width = int(remote.get("Width") or image["width"])
    height = int(remote.get("Height") or image["height"])
    tile_size = int(remote.get("TileSize") or image.get("tileSize") or 512)
    pma_max = remote.get("MaxZoomLevel")
    if pma_max is None:
        pma_max = remote.get("NumberOfZoomLevels")
    if pma_max is None:
        pma_max = image.get("maxZoomLevel")
    pma_max = int(pma_max)
    mpp_x = float(remote.get("MicrometresPerPixelX") or remote.get("MicrometersPerPixelX") or image.get("micrometresPerPixelX") or 1)
    mpp_y = float(remote.get("MicrometresPerPixelY") or remote.get("MicrometersPerPixelY") or image.get("micrometresPerPixelY") or 1)
    if min(width, height, tile_size) < 1 or pma_max < 0:
        fail("PMA.start returned invalid slide geometry.")
    return SlideInfo(width, height, tile_size, pma_max, mpp_x, mpp_y)


def dzi_max_level(width: int, height: int) -> int:
    return int(math.ceil(math.log2(max(width, height)))) if max(width, height) > 1 else 0


def level_dimensions(width: int, height: int, max_level: int, level: int) -> tuple[int, int]:
    divisor = 2 ** max(0, max_level - level)
    return int(math.ceil(width / divisor)), int(math.ceil(height / divisor))


def tile_grid(width: int, height: int, tile_size: int) -> tuple[int, int]:
    return int(math.ceil(width / tile_size)), int(math.ceil(height / tile_size))


def create_jobs(
    info: SlideInfo,
    server: str,
    session_id: str,
    slide_path: str,
    tile_root: Path,
    quality: int,
) -> tuple[list[TileJob], int, int]:
    max_dzi = dzi_max_level(info.width, info.height)
    offset = max_dzi - info.pma_max_level
    if offset < 0:
        fail(f"PMA MaxZoomLevel {info.pma_max_level} exceeds DZI max level {max_dzi}; cannot preserve standard 2× pyramid mapping.")

    common = {
        "sessionID": session_id,
        "pathOrUid": slide_path,
        "timeframe": 0,
        "layer": 0,
        "channels": 0,
        "cache": "true",
        "format": "jpg",
        "quality": quality,
    }
    jobs: list[TileJob] = []

    # DZI levels that are smaller than PMA's lowest exposed tile level are
    # rendered as regions directly by PMA.start. This keeps the exporter free
    # of image-processing dependencies such as Pillow/libvips.
    for level in range(offset):
        level_w, level_h = level_dimensions(info.width, info.height, max_dzi, level)
        tiles_x, tiles_y = tile_grid(level_w, level_h, info.tile_size)
        fullres_factor = 2 ** (max_dzi - level)
        scale = 1.0 / fullres_factor
        for y in range(tiles_y):
            for x in range(tiles_x):
                src_x = x * info.tile_size * fullres_factor
                src_y = y * info.tile_size * fullres_factor
                src_w = min(info.tile_size * fullres_factor, info.width - src_x)
                src_h = min(info.tile_size * fullres_factor, info.height - src_y)
                params = {
                    "sessionID": session_id,
                    "pathOrUid": slide_path,
                    "timeframe": 0,
                    "layer": 0,
                    "channels": 0,
                    "x": src_x,
                    "y": src_y,
                    "width": src_w,
                    "height": src_h,
                    "scale": f"{scale:.12g}",
                    "format": "jpg",
                    "quality": quality,
                }
                jobs.append(TileJob(level, x, y, image_url(server, "region", params), tile_root / str(level) / f"{x}_{y}.jpg", "region"))

    # PMA levels map 1:1 onto the upper DZI levels after applying the offset.
    for pma_level in range(info.pma_max_level + 1):
        level = offset + pma_level
        level_w, level_h = level_dimensions(info.width, info.height, max_dzi, level)
        tiles_x, tiles_y = tile_grid(level_w, level_h, info.tile_size)
        for y in range(tiles_y):
            for x in range(tiles_x):
                params = dict(common)
                params.update({"x": x, "y": y, "z": pma_level})
                jobs.append(TileJob(level, x, y, image_url(server, "tile", params), tile_root / str(level) / f"{x}_{y}.jpg", "tile"))
    return jobs, offset, max_dzi


def write_dzi(path: Path, info: SlideInfo) -> None:
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<Image xmlns="{DZI_NS}" TileSize="{info.tile_size}" Overlap="0" Format="jpg">\n'
        f'  <Size Width="{info.width}" Height="{info.height}"/>\n'
        '</Image>\n'
    )
    atomic_write_text(path, xml)


def export_associated(server: str, session_id: str, slide_path: str, slide_dir: Path, timeout: float, retries: int) -> None:
    for endpoint, filename, w, h in (("thumbnail", "thumbnail.jpg", 1200, 1200), ("barcode", "barcode.jpg", 1200, 500)):
        target = slide_dir / filename
        if valid_existing_image(target):
            continue
        url = image_url(server, endpoint, {"SessionID": session_id, "pathOrUid": slide_path, "w": w, "h": h})
        try:
            data, content_type = request_bytes(url, timeout, retries)
            if valid_image_bytes(data, content_type):
                atomic_write(target, data)
        except ExportError:
            # Associated images are useful but not required for the DZI derivative.
            pass


def human_bytes(value: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    amount = float(value)
    for unit in units:
        if amount < 1024 or unit == units[-1]:
            return f"{amount:.1f} {unit}" if unit != "B" else f"{int(amount)} B"
        amount /= 1024
    return f"{value} B"


def print_plan(slide_id: str, info: SlideInfo, jobs: list[TileJob], offset: int, max_dzi: int, output: Path) -> None:
    region_jobs = sum(1 for job in jobs if job.source_kind == "region")
    tile_jobs = len(jobs) - region_jobs
    print(f"MORPHORA Histology v0.8.2 · PMA → DZI export plan")
    print(f"Slide: {slide_id}")
    print(f"Geometry: {info.width:,} × {info.height:,} px · PMA tile {info.tile_size} px")
    print(f"PMA levels: 0–{info.pma_max_level} → DZI levels {offset}–{max_dzi}")
    print(f"Generated overview levels: DZI 0–{max(0, offset - 1)} ({region_jobs:,} rendered region request{'s' if region_jobs != 1 else ''})")
    print(f"Mirrored PMA tiles: {tile_jobs:,}")
    print(f"Total DZI tiles: {len(jobs):,}")
    print(f"Output: {output}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Export a PMA.start-readable slide into a standalone static DZI pyramid for MORPHORA Histology.")
    parser.add_argument("--slide-id", required=True, help="MORPHORA Histology slide id, e.g. hueso-4")
    parser.add_argument("--manifest", help="Optional explicit manifest path; defaults to histology/slides/<slide-id>.json")
    parser.add_argument("--server", help="Override PMA.start server URL")
    parser.add_argument("--slide-path", help="Override PMA pathOrUid")
    parser.add_argument("--session-id", help="Override PMA session id")
    parser.add_argument("--output-root", default="hosted-slides", help="Directory containing per-slide DZI folders")
    parser.add_argument("--workers", type=int, default=6, help="Concurrent PMA image requests (default: 6)")
    parser.add_argument("--quality", type=int, default=90, help="JPEG quality requested from PMA.start (default: 90)")
    parser.add_argument("--timeout", type=float, default=45.0, help="Per-request timeout in seconds")
    parser.add_argument("--retries", type=int, default=4, help="Retries per failed PMA request")
    parser.add_argument("--plan", action="store_true", help="Validate PMA metadata and print the export plan without downloading tiles")
    parser.add_argument("--force", action="store_true", help="Delete the existing derivative and rebuild it from zero")
    parser.add_argument("--no-associated", action="store_true", help="Skip thumbnail/barcode export")
    parser.add_argument("--serve", action="store_true", help="Serve hosted-slides on port 8008 after a successful export")
    args = parser.parse_args()

    if args.workers < 1 or args.workers > 32:
        print("ERROR: --workers must be between 1 and 32.", file=sys.stderr)
        return 2
    if args.quality < 40 or args.quality > 100:
        print("ERROR: --quality must be between 40 and 100.", file=sys.stderr)
        return 2

    root = project_root()
    manifest_path = Path(args.manifest).expanduser().resolve() if args.manifest else root / "histology" / "slides" / f"{args.slide_id}.json"
    output_root = Path(args.output_root).expanduser()
    if not output_root.is_absolute():
        output_root = (root / output_root).resolve()
    slide_dir = output_root / args.slide_id
    tile_root = slide_dir / "slide_files"
    descriptor = slide_dir / "slide.dzi"

    try:
        if not manifest_path.is_file():
            fail(f"Manifest not found: {manifest_path}")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        source = manifest.get("source") or {}
        server = normalize_server(args.server or source.get("serverUrl") or "http://127.0.0.1:54001/")
        slide_path = str(args.slide_path or source.get("slidePath") or "").strip()
        session_id = str(args.session_id or source.get("sessionId") or "SDK.Python").strip()
        if not slide_path:
            fail("The slide manifest has no PMA slidePath and --slide-path was not provided.")

        # Explicitly verify PMA.start before touching the output derivative.
        version = request_json(api_url(server, "GetVersionInfo"), args.timeout, args.retries)
        remote = request_json(api_url(server, "GetImageInfo", {"SessionID": session_id, "pathOrUid": slide_path}), args.timeout, args.retries)
        if not isinstance(remote, dict):
            fail("PMA.start GetImageInfo did not return an object.")
        info = parse_slide_info(remote, manifest)
        expected = manifest["image"]
        if info.width != int(expected["width"]) or info.height != int(expected["height"]):
            fail(
                "Geometry mismatch — export aborted before producing a usable derivative. "
                f"PMA={info.width:,} × {info.height:,} px; MORPHORA={int(expected['width']):,} × {int(expected['height']):,} px."
            )
        if info.tile_size != int(expected.get("tileSize") or info.tile_size):
            fail(f"Tile-size mismatch — PMA={info.tile_size}, MORPHORA={expected.get('tileSize')}. Update the manifest only after verifying the source slide.")

        jobs, offset, max_dzi = create_jobs(info, server, session_id, slide_path, tile_root, args.quality)
        print_plan(args.slide_id, info, jobs, offset, max_dzi, slide_dir)
        if isinstance(version, dict):
            label = version.get("Version") or version.get("ProductVersion") or version.get("Name")
            if label:
                print(f"PMA.start: {label}")
        if args.plan:
            print("PLAN OK: no tiles were written.")
            return 0

        if args.force and slide_dir.exists():
            shutil.rmtree(slide_dir)
        tile_root.mkdir(parents=True, exist_ok=True)

        completed = 0
        downloaded = 0
        downloaded_bytes = 0
        lock = threading.Lock()
        started = time.monotonic()
        last_print = [0.0]

        # Resume: only a recognizable image file counts as completed.
        pending: list[TileJob] = []
        for job in jobs:
            if valid_existing_image(job.destination):
                completed += 1
            else:
                try:
                    job.destination.with_name(job.destination.name + ".part").unlink(missing_ok=True)
                except OSError:
                    pass
                pending.append(job)

        if completed:
            print(f"Resume: {completed:,}/{len(jobs):,} tiles already complete; {len(pending):,} remaining.")

        def fetch_job(job: TileJob) -> tuple[int, int]:
            data, content_type = request_bytes(job.url, args.timeout, args.retries)
            if not valid_image_bytes(data, content_type):
                raise ExportError(f"PMA.start returned non-image data for DZI {job.dzi_level}/{job.x}_{job.y}: {content_type or 'unknown content type'}")
            atomic_write(job.destination, data)
            return 1, len(data)

        if pending:
            with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers, thread_name_prefix="pma-dzi") as pool:
                futures = {pool.submit(fetch_job, job): job for job in pending}
                for future in concurrent.futures.as_completed(futures):
                    job = futures[future]
                    try:
                        count, size = future.result()
                    except Exception as exc:
                        for other in futures:
                            other.cancel()
                        raise ExportError(f"Failed at DZI {job.dzi_level}/{job.x}_{job.y} ({job.source_kind}): {exc}") from exc
                    with lock:
                        downloaded += count
                        downloaded_bytes += size
                        done = completed + downloaded
                        now = time.monotonic()
                        if done == len(jobs) or now - last_print[0] >= 2.0 or downloaded % 100 == 0:
                            elapsed = max(0.01, now - started)
                            rate = downloaded / elapsed
                            print(f"Progress: {done:,}/{len(jobs):,} tiles ({done/len(jobs)*100:5.1f}%) · new {human_bytes(downloaded_bytes)} · {rate:.1f} tiles/s", flush=True)
                            last_print[0] = now

        # A complete derivative gets its descriptor only after every expected tile exists.
        missing = [str(job.destination) for job in jobs if not valid_existing_image(job.destination)]
        if missing:
            fail(f"Export ended with {len(missing):,} missing/invalid tiles. Rerun the same command to resume. First missing: {missing[0]}")

        write_dzi(descriptor, info)
        if not args.no_associated:
            export_associated(server, session_id, slide_path, slide_dir, args.timeout, args.retries)

        report = {
            "schemaVersion": 1,
            "morphoraRelease": "histology-v0.8.2",
            "slideId": args.slide_id,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "source": {"provider": "pma-start", "server": server, "slidePath": slide_path},
            "geometry": {"width": info.width, "height": info.height, "tileSize": info.tile_size},
            "pyramid": {"pmaMaxLevel": info.pma_max_level, "dziMaxLevel": max_dzi, "dziOffset": offset, "tileCount": len(jobs)},
            "jpegQuality": args.quality,
        }
        atomic_write_text(slide_dir / ".morphora-export.json", json.dumps(report, indent=2, ensure_ascii=False) + "\n")

        validator = Path(__file__).with_name("validate_dzi.py")
        check = subprocess.run([sys.executable, str(validator), "--manifest", str(manifest_path), "--dzi", str(descriptor), "--full"], cwd=root)
        if check.returncode != 0:
            fail("The generated DZI failed MORPHORA integrity validation.")

        print(f"EXPORT COMPLETE: {descriptor}")
        print(f"PMA-FREE PILOT URL: http://127.0.0.1:8008/{urllib.parse.quote(args.slide_id)}/slide.dzi")
        print("You can now serve this derivative and switch MORPHORA to Hosted DZI only. PMA.start is no longer needed for playback.")

        if args.serve:
            server_script = Path(__file__).with_name("serve_tiles.py")
            return subprocess.call([sys.executable, str(server_script), "--root", str(output_root), "--host", "127.0.0.1", "--port", "8008"], cwd=root)
        return 0
    except KeyboardInterrupt:
        print("\nExport interrupted. Completed tiles were kept; rerun the same command to resume.", file=sys.stderr)
        return 130
    except ExportError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"ERROR: unexpected exporter failure: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
