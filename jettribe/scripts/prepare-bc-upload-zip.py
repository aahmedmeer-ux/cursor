#!/usr/bin/env python3
"""Bundle theme and write a BigCommerce-safe upload zip.

BigCommerce custom-theme upload rejects packages when schema.json exceeds
64 KB (often as a generic "A server error occurred"). stencil bundle always
pretty-prints schema.json (~100KB+ for PapaThemes Dinosaur), so this script:

1. Runs `stencil bundle`
2. Rewrites the zip with minified schema.json / config.json
3. Drops parsed/stencilContext.json (not present in the original Drive package)
4. Verifies size limits and required root files
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

LIMIT_SCHEMA = 65536
LIMIT_ZIP = 50 * 1024 * 1024
ROOT = Path(__file__).resolve().parents[1]


def minify_bytes(path: Path) -> bytes:
    data = json.loads(path.read_text(encoding="utf-8"))
    return json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def rewrite_zip(src: Path, dest: Path, replacements: dict[str, bytes], drop: set[str]) -> None:
    """Copy stencil zip entry-by-entry, replacing/dropping selected files."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".tmp")
    with zipfile.ZipFile(src, "r") as zin, zipfile.ZipFile(
        tmp, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9
    ) as zout:
        for info in zin.infolist():
            name = info.filename
            if name in drop or name.endswith("/"):
                continue
            data = replacements[name] if name in replacements else zin.read(name)
            out = zipfile.ZipInfo(filename=name, date_time=info.date_time)
            out.compress_type = zipfile.ZIP_DEFLATED
            out.external_attr = info.external_attr
            out.create_system = info.create_system
            zout.writestr(out, data)
    tmp.replace(dest)


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
    raw_bundle = ROOT / "_stencil-raw-bundle.zip"

    if not args.skip_bundle:
        raw_bundle.unlink(missing_ok=True)
        # Clean maps/report so they cannot slip into assets/**
        dist = ROOT / "assets" / "dist"
        if dist.exists():
            for p in dist.glob("*.map"):
                p.unlink()
            report = dist / "report.html"
            if report.exists():
                report.unlink()
        cmd = ["npx", "stencil", "bundle", "-n", "_stencil-raw-bundle", "-t", "180"]
        print("Running:", " ".join(cmd), flush=True)
        subprocess.check_call(cmd)
        # stencil may write name.zip or name.zip.zip depending on version
        if not raw_bundle.exists():
            candidates = sorted(ROOT.glob("_stencil-raw-bundle*.zip*"))
            if not candidates:
                raise SystemExit("stencil bundle did not produce a zip")
            candidates[0].rename(raw_bundle)

    schema_b = minify_bytes(ROOT / "schema.json")
    config_b = minify_bytes(ROOT / "config.json")
    print(f"schema.json minified: {len(schema_b)} / {LIMIT_SCHEMA}")
    print(f"config.json minified: {len(config_b)} / {LIMIT_SCHEMA}")
    if len(schema_b) > LIMIT_SCHEMA:
        raise SystemExit("schema.json still exceeds 64KB — trim Theme Editor tabs")
    if len(config_b) > LIMIT_SCHEMA:
        raise SystemExit("config.json exceeds 64KB")

    drop = {"parsed/stencilContext.json"}
    rewrite_zip(
        raw_bundle,
        args.output,
        {"schema.json": schema_b + b"\n", "config.json": config_b + b"\n"},
        drop,
    )

    also = [
        ROOT / "Dinosaur-1.3.0.zip",
        ROOT.parent / "jettribe-upload" / "jettribe-theme-no-reviews.zip",
    ]
    for path in also:
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(args.output, path)
        print("wrote", path, path.stat().st_size)

    # Verify
    size = args.output.stat().st_size
    with zipfile.ZipFile(args.output) as z:
        names = set(z.namelist())
        s = len(z.read("schema.json"))
        c = len(z.read("config.json"))
        assert "config.json" in names and "schema.json" in names
        assert "parsed/stencilContext.json" not in names
        assert not any(n.startswith("jettribe/") for n in names)
        assert any(n.startswith("parsed/templates/") for n in names)
        empty = [n for n in names if z.getinfo(n).file_size == 0]
        over5 = [n for n in names if z.getinfo(n).file_size > 5 * 1024 * 1024]
        print(f"OK {args.output}")
        print(f"  zip={size} schema={s} config={c} files={len(names)}")
        print(f"  empty={len(empty)} over5MB={over5}")
        if size > LIMIT_ZIP:
            raise SystemExit("zip exceeds 50MB")
        if empty:
            raise SystemExit(f"empty files in zip: {empty[:10]}")
        if over5:
            raise SystemExit(f"files over 5MB: {over5}")
        z.testzip()

    raw_bundle.unlink(missing_ok=True)
    artifact = Path("/opt/cursor/artifacts/jettribe-bigcommerce-upload.zip")
    artifact.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(args.output, artifact)
    print("wrote", artifact)
    return 0


if __name__ == "__main__":
    sys.exit(main())
