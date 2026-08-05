#!/usr/bin/env python3
"""Bundle theme and write BigCommerce upload zip with schema.json <= 64KB.

BigCommerce rejects themes when schema.json exceeds 64KB (often as a generic
"A server error occurred"). stencil bundle pretty-prints schema.json, so we
must minify it inside the zip after bundling.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

LIMIT = 65536
ROOT = Path(__file__).resolve().parents[1]


def minify(path: Path) -> bytes:
    data = json.loads(path.read_text(encoding="utf-8"))
    return json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def rewrite_zip(src: Path, dest: Path, schema_bytes: bytes, config_bytes: bytes) -> None:
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        with zipfile.ZipFile(src, "r") as zin:
            zin.extractall(td_path)
        (td_path / "schema.json").write_bytes(schema_bytes + b"\n")
        (td_path / "config.json").write_bytes(config_bytes + b"\n")
        tmp = td_path / "out.zip"
        with zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for root, _dirs, files in os.walk(td_path):
                for name in files:
                    if name == "out.zip":
                        continue
                    full = Path(root) / name
                    zout.write(full, full.relative_to(td_path).as_posix())
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(tmp, dest)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=ROOT.parent / "jettribe-bigcommerce-upload.zip",
    )
    parser.add_argument("--skip-bundle", action="store_true")
    args = parser.parse_args()

    os.chdir(ROOT)
    raw_bundle = ROOT / "Dinosaur-1.3.0.raw.zip"
    if not args.skip_bundle:
        raw_bundle.unlink(missing_ok=True)
        # stencil appends .zip to -n if missing; use basename without .zip carefully
        cmd = ["npx", "stencil", "bundle", "-n", "Dinosaur-1.3.0.raw", "-t", "120"]
        print("Running:", " ".join(cmd), flush=True)
        subprocess.check_call(cmd)
        # stencil may write Dinosaur-1.3.0.raw.zip
        if not raw_bundle.exists():
            alt = ROOT / "Dinosaur-1.3.0.raw.zip.zip"
            if alt.exists():
                alt.rename(raw_bundle)
            else:
                matches = list(ROOT.glob("Dinosaur-1.3.0.raw*.zip*"))
                raise SystemExit(f"bundle zip not found; saw {matches}")

    schema_b = minify(ROOT / "schema.json")
    config_b = minify(ROOT / "config.json")
    print(f"schema.json minified: {len(schema_b)} / {LIMIT}")
    print(f"config.json minified: {len(config_b)} / {LIMIT}")
    if len(schema_b) > LIMIT:
        raise SystemExit("schema.json exceeds 64KB after minify — trim Theme Editor settings")
    if len(config_b) > LIMIT:
        raise SystemExit("config.json exceeds 64KB after minify")

    rewrite_zip(raw_bundle, args.output, schema_b, config_b)
    also = [
        ROOT / "Dinosaur-1.3.0.zip",
        ROOT.parent / "jettribe-upload" / "jettribe-theme-no-reviews.zip",
    ]
    for path in also:
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(args.output, path)
        print("wrote", path, path.stat().st_size)

    with zipfile.ZipFile(args.output) as z:
        s = len(z.read("schema.json"))
        c = len(z.read("config.json"))
    print(f"OK {args.output} schema={s} config={c}")
    raw_bundle.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
