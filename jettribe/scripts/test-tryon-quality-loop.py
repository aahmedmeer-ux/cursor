#!/usr/bin/env python3
"""End-to-end Virtual Try-On quality loop (free IDM-VTON).

Mirrors the theme pipeline:
  studio garment preference → person on white (height) → AI try-on → white result

Exit 0 only when a result with vest-like blue signal is produced.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import requests
from PIL import Image
from rembg import remove

ROOT = Path("/tmp/vton-loop")
OUT = ROOT / "out"
HOST = "yisol-idm-vton.hf.space"
HEIGHT_CM = 180


def score_studio(path: Path) -> float:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    score = 40.0
    aspect = w / max(1, h)
    if 0.85 <= aspect <= 1.15:
        score += 12
    if aspect > 1.35:
        score -= 20
    a = np.array(im.resize((48, 48)))
    white = float(((a[:, :, 0] > 235) & (a[:, :, 1] > 235) & (a[:, :, 2] > 235)).mean())
    dark = float(((a[:, :, 0] < 35) & (a[:, :, 1] < 35) & (a[:, :, 2] < 35)).mean())
    if white > 0.28:
        score += 35
        if 0.05 < dark < 0.45:
            score += 10
    elif white > 0.15:
        score += 15
    if white < 0.08:
        score -= 18
    return score


def person_on_white(src: Path, dest: Path, height_cm: int = HEIGHT_CM) -> None:
    cut = remove(Image.open(src).convert("RGBA"))
    bbox = cut.getbbox()
    if bbox:
        cut = cut.crop(bbox)
    aspect = max(1.3, min(2.05, height_cm / 95))
    th, tw = 1400, int(1400 / aspect)
    canvas = Image.new("RGBA", (tw, th), (255, 255, 255, 255))
    cut.thumbnail((int(tw * 0.88), int(th * 0.94)), Image.Resampling.LANCZOS)
    x = (tw - cut.width) // 2
    y = th - cut.height - int(th * 0.02)
    canvas.alpha_composite(cut, (x, y))
    canvas.convert("RGB").save(dest, quality=95)


def upload(path: Path) -> str:
    with path.open("rb") as f:
        r = requests.post(
            f"https://{HOST}/upload",
            files={"files": (path.name, f, "image/jpeg")},
            timeout=90,
        )
    r.raise_for_status()
    return r.json()[0]


def call_tryon(person: Path, garment: Path, desc: str) -> str:
    p = upload(person)
    g = upload(garment)
    payload = {
        "data": [
            {
                "background": {"path": p, "meta": {"_type": "gradio.FileData"}},
                "layers": [],
                "composite": None,
            },
            {"path": g, "meta": {"_type": "gradio.FileData"}},
            desc,
            True,
            True,
            28,
            42,
        ]
    }
    r = requests.post(f"https://{HOST}/call/tryon", json=payload, timeout=60)
    r.raise_for_status()
    eid = r.json()["event_id"]
    r = requests.get(f"https://{HOST}/call/tryon/{eid}", timeout=240)
    text = r.text
    if "event: error" in text:
        raise RuntimeError("provider_error")
    for block in reversed(text.split("\n\n")):
        for line in reversed(block.split("\n")):
            if line.startswith("data:"):
                raw = line[5:].strip()
                if not raw or raw == "null":
                    continue
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if (
                    isinstance(payload, list)
                    and payload
                    and isinstance(payload[0], dict)
                    and payload[0].get("url")
                ):
                    return payload[0]["url"]
    raise RuntimeError("empty_result")


def to_white_result(url: str, dest: Path) -> None:
    raw_path = OUT / "loop_raw.png"
    resp = requests.get(url, timeout=60, headers={"Accept": "image/*,*/*"})
    resp.raise_for_status()
    ctype = (resp.headers.get("content-type") or "").lower()
    if "image" not in ctype and not resp.content.startswith(b"\x89PNG"):
        raise RuntimeError(f"not_image:{ctype}:{resp.content[:80]!r}")
    raw_path.write_bytes(resp.content)
    cut = remove(Image.open(raw_path).convert("RGBA"))
    bbox = cut.getbbox()
    if bbox:
        cut = cut.crop(bbox)
    tw, th = 900, 1400
    canvas = Image.new("RGBA", (tw, th), (255, 255, 255, 255))
    cut.thumbnail((int(tw * 0.9), int(th * 0.95)), Image.Resampling.LANCZOS)
    x = (tw - cut.width) // 2
    y = th - cut.height - 25
    canvas.alpha_composite(cut, (x, y))
    canvas.convert("RGB").save(dest, quality=95)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    garments = sorted((ROOT / "ur20").glob("g*.jpg"))
    if not garments:
        print("missing ur20 fixtures", file=sys.stderr)
        return 2
    best = max(garments, key=score_studio)
    print("best garment", best.name, "score", score_studio(best))
    person_src = ROOT / "person_full.jpg"
    if not person_src.exists():
        person_src = ROOT / "person.jpg"
    person_white = OUT / "loop_person.jpg"
    garment_studio = OUT / "loop_garment.jpg"
    person_on_white(person_src, person_white)
    Image.open(best).convert("RGB").save(garment_studio, quality=95)

    url = None
    last = None
    for attempt in range(1, 5):
        try:
            print(f"attempt {attempt}")
            url = call_tryon(
                person_white,
                garment_studio,
                "Jettribe UR-20 aqua blue black competition life vest with vertical JETTRIBE lettering",
            )
            break
        except Exception as exc:  # noqa: BLE001
            last = exc
            print("fail", exc)
            time.sleep(2 * attempt)
    if not url:
        print("FAILED", last, file=sys.stderr)
        return 1

    final = OUT / "loop_final.jpg"
    to_white_result(url, final)
    art = Path("/opt/cursor/artifacts/tryon-loop-final.jpg")
    art.write_bytes(final.read_bytes())
    a = np.array(Image.open(final))
    blue = float(((a[:, :, 2] > a[:, :, 0] + 15) & (a[:, :, 2] > 70)).mean())
    nonwhite = float(((a[:, :, 0] < 235) | (a[:, :, 1] < 235) | (a[:, :, 2] < 235)).mean())
    print("final", a.shape, "blue", blue, "nonwhite", nonwhite, "->", art)
    if blue < 0.01 or nonwhite < 0.05:
        print("quality gate failed", file=sys.stderr)
        return 1
    print("QUALITY OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
