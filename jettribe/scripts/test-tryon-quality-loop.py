#!/usr/bin/env python3
"""Nano Banana try-on quality loop (fal-ai/nano-banana-2/edit)."""
from __future__ import annotations
import base64, json, os, sys, time
from pathlib import Path
import requests
from PIL import Image
import numpy as np

ROOT = Path('/tmp/vton-loop')
OUT = ROOT / 'out'
HOST_MODEL = 'fal-ai/nano-banana-2/edit'
FAL_KEY = os.environ.get('FAL_KEY', '').strip()

def to_data_url(path: Path, max_edge=1024) -> str:
    im = Image.open(path).convert('RGB')
    im.thumbnail((max_edge, max_edge))
    buf = Path('/tmp/_nb.jpg')
    im.save(buf, quality=88, format='JPEG')
    b64 = base64.b64encode(buf.read_bytes()).decode()
    return f'data:image/jpeg;base64,{b64}'

def main() -> int:
    if not FAL_KEY:
        print('FAL_KEY missing', file=sys.stderr)
        return 2
    OUT.mkdir(parents=True, exist_ok=True)
    person = ROOT / 'person_full.jpg'
    if not person.exists():
        person = ROOT / 'person.jpg'
    garment = ROOT / 'ur20' / 'g1.jpg'
    if not garment.exists():
        print('fixtures missing', file=sys.stderr)
        return 2

    prompt = (
        'You are performing a photorealistic virtual try-on edit. '
        'Image 1 is the shopper (keep exact face and identity). '
        'Image 2 is the product reference: Jettribe UR-20 Circuit Vest aqua blue. '
        'Dress the shopper in that EXACT vest (logos, colors, straps). '
        'Output a complete full-body person on a pure white studio background. '
        'E-commerce catalog quality, no collage.'
    )
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
    for i in range(90):
        time.sleep(1.5)
        st = requests.get(status_url, headers={'Authorization': f'Key {FAL_KEY}'}, timeout=60).json()
        print('status', st.get('status'))
        if st.get('status') == 'COMPLETED':
            data = requests.get(response_url, headers={'Authorization': f'Key {FAL_KEY}'}, timeout=60).json()
            url = data['images'][0]['url']
            img = requests.get(url, timeout=60).content
            out = OUT / 'nano_banana_final.jpg'
            out.write_bytes(img)
            Path('/opt/cursor/artifacts/nano-banana-tryon-final.jpg').write_bytes(img)
            a = np.array(Image.open(out).convert('RGB'))
            blue = float(((a[:,:,2] > a[:,:,0] + 15) & (a[:,:,2] > 70)).mean())
            nonwhite = float(((a[:,:,0] < 235) | (a[:,:,1] < 235) | (a[:,:,2] < 235)).mean())
            print('QUALITY', a.shape, 'blue', blue, 'nonwhite', nonwhite)
            if nonwhite < 0.05:
                return 1
            print('OK', out)
            return 0
        if st.get('status') == 'FAILED':
            print('FAILED', st)
            return 1
    print('timeout')
    return 1

if __name__ == '__main__':
    raise SystemExit(main())
