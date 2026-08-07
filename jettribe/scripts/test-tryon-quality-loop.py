#!/usr/bin/env python3
"""Nano Banana try-on quality loop — Gemini (preferred) or fal-ai/nano-banana-2/edit."""
from __future__ import annotations
import base64, json, os, sys, time
from pathlib import Path
import urllib.request
import ssl
from PIL import Image
import numpy as np

ROOT = Path('/tmp/vton-loop')
OUT = ROOT / 'out'
HOST_MODEL = 'fal-ai/nano-banana-2/edit'
FAL_KEY = os.environ.get('FAL_KEY', '').strip()
GEMINI_KEY = os.environ.get('GEMINI_API_KEY', '').strip()
GEMINI_MODELS = [
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-image-preview',
    'nano-banana-pro-preview',
]
CTX = ssl.create_default_context()


def to_jpeg_bytes(path: Path, max_edge=1024) -> bytes:
    im = Image.open(path).convert('RGB')
    im.thumbnail((max_edge, max_edge))
    buf = Path('/tmp/_nb.jpg')
    im.save(buf, quality=88, format='JPEG')
    return buf.read_bytes()


def to_data_url(path: Path, max_edge=1024) -> str:
    b64 = base64.b64encode(to_jpeg_bytes(path, max_edge)).decode()
    return f'data:image/jpeg;base64,{b64}'


def score(out: Path) -> int:
    a = np.array(Image.open(out).convert('RGB'))
    blue = float(((a[:, :, 2] > a[:, :, 0] + 15) & (a[:, :, 2] > 70)).mean())
    nonwhite = float(((a[:, :, 0] < 235) | (a[:, :, 1] < 235) | (a[:, :, 2] < 235)).mean())
    print('QUALITY', a.shape, 'blue', blue, 'nonwhite', nonwhite)
    if nonwhite < 0.05:
        return 1
    print('OK', out)
    return 0


def run_gemini(person: Path, garment: Path, prompt: str) -> int:
    person_b = to_jpeg_bytes(person)
    garment_b = to_jpeg_bytes(garment)
    parts = [
        {'text': prompt},
        {'inline_data': {'mime_type': 'image/jpeg', 'data': base64.b64encode(person_b).decode()}},
        {'inline_data': {'mime_type': 'image/jpeg', 'data': base64.b64encode(garment_b).decode()}},
    ]
    body = {
        'contents': [{'role': 'user', 'parts': parts}],
        'generationConfig': {'responseModalities': ['TEXT', 'IMAGE']},
    }
    last = ''
    for model in GEMINI_MODELS:
        print('gemini model', model)
        req = urllib.request.Request(
            f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
            data=json.dumps(body).encode(),
            headers={'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_KEY},
            method='POST',
        )
        try:
            with urllib.request.urlopen(req, context=CTX, timeout=180) as resp:
                data = json.loads(resp.read().decode())
        except Exception as e:
            err = e.read().decode() if hasattr(e, 'read') else str(e)
            last = err
            print('FAIL', err[:300])
            if 'quota' in err.lower() or 'RESOURCE_EXHAUSTED' in err:
                continue
            if '401' in err or '403' in err or 'API_KEY' in err:
                return 3
            continue
        parts_out = (((data.get('candidates') or [{}])[0].get('content') or {}).get('parts')) or []
        img = None
        for p in parts_out:
            inline = p.get('inlineData') or p.get('inline_data')
            if inline and inline.get('data'):
                img = base64.b64decode(inline['data'])
                break
        if not img:
            last = 'gemini_no_image'
            continue
        OUT.mkdir(parents=True, exist_ok=True)
        out = OUT / 'nano_banana_final.jpg'
        out.write_bytes(img)
        Path('/opt/cursor/artifacts/nano-banana-tryon-final.jpg').write_bytes(img)
        return score(out)
    print('GEMINI BLOCK', last[:500])
    return 3


def run_fal(person: Path, garment: Path, prompt: str) -> int:
    import requests
    payload = {
        'prompt': prompt,
        'image_urls': [to_data_url(person), to_data_url(garment)],
        'num_images': 1,
        'aspect_ratio': '3:4',
        'resolution': '1K',
        'output_format': 'jpeg',
        'limit_generations': True,
    }
    headers = {'Authorization': f'Key {FAL_KEY}', 'Content-Type': 'application/json'}
    r = requests.post(f'https://queue.fal.run/{HOST_MODEL}', headers=headers, json=payload, timeout=60)
    print('start', r.status_code, r.text[:300])
    if r.status_code in (401, 403):
        print('AUTH/BALANCE BLOCK', r.text)
        return 3
    r.raise_for_status()
    started = r.json()
    status_url, response_url = started['status_url'], started['response_url']
    for _ in range(90):
        time.sleep(1.5)
        st = requests.get(status_url, headers={'Authorization': f'Key {FAL_KEY}'}, timeout=60).json()
        print('status', st.get('status'))
        if st.get('status') == 'COMPLETED':
            data = requests.get(response_url, headers={'Authorization': f'Key {FAL_KEY}'}, timeout=60).json()
            url = data['images'][0]['url']
            img = requests.get(url, timeout=60).content
            OUT.mkdir(parents=True, exist_ok=True)
            out = OUT / 'nano_banana_final.jpg'
            out.write_bytes(img)
            Path('/opt/cursor/artifacts/nano-banana-tryon-final.jpg').write_bytes(img)
            return score(out)
        if st.get('status') in ('FAILED', 'CANCELLED'):
            return 1
    return 1


def main() -> int:
    person = ROOT / 'person_full.jpg'
    if not person.exists():
        person = ROOT / 'person.jpg'
    garment = ROOT / 'ur20' / 'g1.jpg'
    if not garment.exists():
        garment = Path('/tmp/tryon-quality/garment_studio.jpg')
    if not person.exists() or not garment.exists():
        print('fixtures missing', person, garment, file=sys.stderr)
        return 2

    prompt = (
        'You are performing a photorealistic virtual try-on edit. '
        'Image 1 is the shopper (keep exact face and identity). '
        'Image 2 is the product reference: Jettribe UR-20 Circuit Vest aqua blue. '
        'Dress the shopper in that EXACT vest (logos, colors, straps). '
        'Output a complete full-body person on a pure white studio background. '
        'E-commerce catalog quality, no collage.'
    )
    if GEMINI_KEY:
        return run_gemini(person, garment, prompt)
    if FAL_KEY:
        return run_fal(person, garment, prompt)
    print('GEMINI_API_KEY or FAL_KEY missing', file=sys.stderr)
    return 2


if __name__ == '__main__':
    sys.exit(main())
