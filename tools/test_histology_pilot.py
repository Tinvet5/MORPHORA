from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PILOT = ROOT / "tools" / "histology_wsi" / "pilot_slide.py"
FIXTURE_ROOT = ROOT / "tools" / "fixtures" / "histology_pilot"


def run(*args: str):
    return subprocess.run([sys.executable, str(PILOT), *args], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def main() -> int:
    good = run("--slide-id", "hueso-4", "--output-root", str(FIXTURE_ROOT))
    assert good.returncode == 0, good.stdout
    assert "INTEGRITY OK" in good.stdout and "PILOT READY" in good.stdout, good.stdout
    assert "http://127.0.0.1:8008/hueso-4/slide.dzi" in good.stdout, good.stdout

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        shutil.copytree(FIXTURE_ROOT / "hueso-4", root / "hueso-4")
        descriptor = root / "hueso-4" / "slide.dzi"
        descriptor.write_text(descriptor.read_text(encoding="utf-8").replace('Width="21959"', 'Width="21960"'), encoding="utf-8")
        bad = run("--slide-id", "hueso-4", "--output-root", str(root))
        assert bad.returncode != 0, bad.stdout
        assert "width mismatch" in bad.stdout.lower(), bad.stdout

    print("Histology hosted-pilot workflow checks passed (v0.8.2 baseline).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
