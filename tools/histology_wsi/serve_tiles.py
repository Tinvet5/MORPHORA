#!/usr/bin/env python3
from __future__ import annotations

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class CorsHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "public, max-age=60")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve generated DZI slides locally with CORS for MORPHORA hosted-source testing.")
    parser.add_argument("--root", default="hosted-slides")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8008)
    args = parser.parse_args()
    root = Path(args.root).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    handler = lambda *a, **kw: CorsHandler(*a, directory=str(root), **kw)
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Serving {root}")
    print(f"DZI base: http://{args.host}:{args.port}/<slide-id>/slide.dzi")
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
