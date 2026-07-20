#!/usr/bin/env python3
"""ChronoGlobe local server with cached live satellite tiles."""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import tempfile
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import ClassVar

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".tile-cache"
TILE_RE = re.compile(r"^/tiles/(\d+)/(\d+)/(\d+)\.(?:jpg|jpeg|png)$")
REMOTE_TEMPLATES = (
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
)


def looks_like_image(data: bytes) -> bool:
    return (
        data.startswith(b"\xff\xd8\xff")
        or data.startswith(b"\x89PNG\r\n\x1a\n")
        or (data.startswith(b"RIFF") and b"WEBP" in data[:16])
    ) and len(data) > 100


class Handler(SimpleHTTPRequestHandler):
    server_version = "ChronoGlobe/7"
    extensions_map: ClassVar[dict[str, str]] = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        match = TILE_RE.match(path)
        if match:
            self.serve_tile(*(int(v) for v in match.groups()))
            return
        if path == "/tile-health":
            body = b'{"ok":true,"base":"bundled","live":"on-demand","cache":"disk"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def serve_tile(self, z: int, x: int, y: int) -> None:
        if z < 0 or z > 19 or x < 0 or y < 0 or x >= 2**z or y >= 2**z:
            self.send_error(400, "Invalid tile coordinates")
            return

        cache_path = CACHE / str(z) / str(x) / f"{y}.jpg"
        if cache_path.exists() and cache_path.stat().st_size > 100:
            self.send_file(cache_path, "image/jpeg", 60 * 60 * 24 * 30)
            return

        cache_path.parent.mkdir(parents=True, exist_ok=True)
        last_error: Exception | str | None = None
        for template in REMOTE_TEMPLATES:
            url = template.format(z=z, x=x, y=y)
            for fetcher in (self.fetch_with_curl, self.fetch_with_urllib):
                try:
                    data = fetcher(url)
                    if not looks_like_image(data):
                        raise ValueError(f"Unexpected response ({len(data)} bytes)")
                    self.cache_and_send(cache_path, data)
                    return
                except Exception as exc:
                    last_error = exc

        self.log_error("Live tile failed z=%s x=%s y=%s: %s", z, x, y, last_error)
        self.send_error(502, "Live imagery unavailable; bundled imagery remains active")

    def fetch_with_curl(self, url: str) -> bytes:
        curl = shutil.which("curl")
        if not curl:
            raise RuntimeError("curl is unavailable")
        result = subprocess.run(
            [
                curl, "--fail", "--location", "--silent", "--show-error",
                "--connect-timeout", "4", "--max-time", "10", "--retry", "1",
                "--user-agent", "Mozilla/5.0 ChronoGlobe/7", url,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=13,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode("utf-8", "replace").strip() or f"curl exit {result.returncode}")
        return result.stdout

    def fetch_with_urllib(self, url: str) -> bytes:
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 ChronoGlobe/7",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
        )
        with urllib.request.urlopen(request, timeout=7) as response:
            return response.read()

    def cache_and_send(self, cache_path: Path, data: bytes) -> None:
        fd, temp_name = tempfile.mkstemp(prefix="tile-", suffix=".tmp", dir=cache_path.parent)
        try:
            with os.fdopen(fd, "wb") as output:
                output.write(data)
            os.replace(temp_name, cache_path)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)
        content_type = "image/png" if data.startswith(b"\x89PNG") else "image/jpeg"
        self.send_bytes(data, content_type, 60 * 60 * 24 * 30)

    def send_file(self, path: Path, content_type: str, cache_seconds: int) -> None:
        size = path.stat().st_size
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", f"public, max-age={cache_seconds}, immutable")
        self.end_headers()
        with path.open("rb") as source:
            shutil.copyfileobj(source, self.wfile)

    def send_bytes(self, data: bytes, content_type: str, cache_seconds: int) -> None:
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", f"public, max-age={cache_seconds}, immutable")
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ChronoGlobe")
    parser.add_argument("port", nargs="?", type=int, default=8080)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"ChronoGlobe running at http://localhost:{args.port}", flush=True)
    print("Bundled Earth imagery is immediate; live tiles load after zooming in.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping ChronoGlobe.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
