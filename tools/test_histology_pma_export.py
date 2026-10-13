from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORTER = ROOT / "tools" / "histology_wsi" / "export_from_pma.py"
JPEG = b"\xff\xd8\xff\xe0" + b"MORPHORA" * 8 + b"\xff\xd9"


class State:
    image_requests = 0


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        if parsed.path.endswith("/api/json/GetVersionInfo"):
            return self.json({"d": {"Version": "fake-pma-0.8.2"}})
        if parsed.path.endswith("/api/json/GetImageInfo"):
            return self.json({"d": {"Width": 1025, "Height": 769, "TileSize": 256, "MaxZoomLevel": 2, "MicrometresPerPixelX": 0.5, "MicrometresPerPixelY": 0.5}})
        if parsed.path.endswith("/tile") or parsed.path.endswith("/region") or parsed.path.endswith("/thumbnail") or parsed.path.endswith("/barcode"):
            State.image_requests += 1
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Content-Length", str(len(JPEG)))
            self.end_headers()
            self.wfile.write(JPEG)
            return
        self.send_error(404)

    def json(self, value):
        data = json.dumps(value).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def run(args: list[str], cwd: Path):
    return subprocess.run([sys.executable, str(EXPORTER), *args], cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def main() -> int:
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    try:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = root / "mini.json"
            manifest.write_text(json.dumps({
                "id": "mini",
                "source": {"serverUrl": f"http://127.0.0.1:{port}/", "slidePath": "C:/fake/mini.mdsx", "sessionId": "SDK.Python"},
                "image": {"width": 1025, "height": 769, "tileSize": 256, "maxZoomLevel": 2, "micrometresPerPixelX": 0.5, "micrometresPerPixelY": 0.5}
            }), encoding="utf-8")
            output = root / "hosted"
            common = ["--slide-id", "mini", "--manifest", str(manifest), "--output-root", str(output), "--workers", "3", "--timeout", "5", "--retries", "0"]

            plan = run(common + ["--plan"], ROOT)
            assert plan.returncode == 0, plan.stdout
            assert "PLAN OK" in plan.stdout and "PMA levels: 0–2" in plan.stdout, plan.stdout
            assert not (output / "mini" / "slide.dzi").exists()

            State.image_requests = 0
            first = run(common, ROOT)
            assert first.returncode == 0, first.stdout
            assert "EXPORT COMPLETE" in first.stdout, first.stdout
            assert (output / "mini" / "slide.dzi").is_file()
            assert (output / "mini" / ".morphora-export.json").is_file()
            assert State.image_requests > 0
            first_image_requests = State.image_requests

            State.image_requests = 0
            second = run(common, ROOT)
            assert second.returncode == 0, second.stdout
            assert "Resume:" in second.stdout, second.stdout
            # Only optional associated images may be requested; completed DZI tiles must not be fetched again.
            assert State.image_requests <= 2, (State.image_requests, second.stdout)
            assert first_image_requests > State.image_requests

            bad_manifest = root / "bad.json"
            bad_manifest.write_text(json.dumps({
                "id": "mini",
                "source": {"serverUrl": f"http://127.0.0.1:{port}/", "slidePath": "C:/fake/mini.mdsx", "sessionId": "SDK.Python"},
                "image": {"width": 1026, "height": 769, "tileSize": 256, "maxZoomLevel": 2}
            }), encoding="utf-8")
            bad = run(["--slide-id", "mini", "--manifest", str(bad_manifest), "--output-root", str(root / "bad-output"), "--timeout", "5", "--retries", "0"], ROOT)
            assert bad.returncode != 0, bad.stdout
            assert "Geometry mismatch" in bad.stdout, bad.stdout
            assert not (root / "bad-output" / "mini" / "slide.dzi").exists()

        print("Histology v0.8.2 PMA → DZI exporter checks passed.")
        return 0
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    raise SystemExit(main())
