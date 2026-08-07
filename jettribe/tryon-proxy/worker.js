/**
 * Jettribe Nano Banana Try-On proxy (Cloudflare Worker)
 *
 * Why?
 * - Keeps GEMINI_API_KEY / FAL_KEY off the storefront
 * - Gemini Nano Banana (gemini-2.5-flash-image) is the same family as Nano Banana
 *
 * Deploy:
 *   wrangler secret put GEMINI_API_KEY   # preferred (Google AI Studio)
 *   # OR
 *   wrangler secret put FAL_KEY
 *   wrangler deploy
 *   Theme Editor → tryon_proxy_url = https://YOUR_WORKER.workers.dev
 *
 * Note: Gemini image models need billing enabled (free-tier image quota is often 0).
 *
 * POST JSON:
 *   { prompt, image_urls: [personDataUrl, product1, ...] }
 * Response:
 *   { result_url }
 */
const GEMINI_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image',
  'gemini-3.1-flash-image-preview',
  'nano-banana-pro-preview',
];

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }
    if (request.method !== 'POST') {
      return cors(json({ error: 'Method not allowed' }, 405));
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return cors(json({ error: 'Invalid JSON' }, 400));
    }

    const prompt = body.prompt || '';
    const imageUrls = body.image_urls || [];
    if (!prompt || !imageUrls.length) {
      return cors(json({ error: 'prompt and image_urls required' }, 400));
    }

    try {
      if (env.GEMINI_API_KEY) {
        const resultUrl = await geminiNanoBanana(env.GEMINI_API_KEY, prompt, imageUrls);
        return cors(json({ result_url: resultUrl }));
      }
      if (env.FAL_KEY) {
        const resultUrl = await falNanoBanana(env.FAL_KEY, prompt, imageUrls);
        return cors(json({ result_url: resultUrl }));
      }
      return cors(json({ error: 'Set GEMINI_API_KEY or FAL_KEY on the worker' }, 500));
    } catch (e) {
      return cors(json({ error: String(e && e.message || e) }, 502));
    }
  },
};

async function geminiNanoBanana(apiKey, prompt, imageUrls) {
  const parts = [{ text: prompt }];
  for (const url of imageUrls.slice(0, 8)) {
    const { mime, data } = await toInline(url);
    parts.push({ inline_data: { mime_type: mime, data } });
  }

  let lastErr = 'gemini_no_image';
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      const msg = (data.error && data.error.message) || `gemini_${res.status}`;
      lastErr = msg;
      if (res.status === 401 || res.status === 403) throw new Error(msg);
      if (/quota|rate|RESOURCE_EXHAUSTED|429/i.test(msg) || res.status === 429) continue;
      if (/not found|not supported/i.test(msg)) continue;
      throw new Error(msg);
    }
    const partsOut = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    for (const p of partsOut) {
      const inline = p.inlineData || p.inline_data;
      if (inline && inline.data) {
        const mime = inline.mimeType || inline.mime_type || 'image/png';
        return `data:${mime};base64,${inline.data}`;
      }
    }
  }
  throw new Error(lastErr);
}

async function falNanoBanana(apiKey, prompt, imageUrls) {
  const start = await fetch('https://queue.fal.run/fal-ai/nano-banana-2/edit', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_urls: imageUrls,
      num_images: 1,
      aspect_ratio: '3:4',
      resolution: '1K',
      output_format: 'jpeg',
      limit_generations: true,
    }),
  });
  const started = await start.json();
  if (!start.ok) throw new Error(started.detail || `fal_${start.status}`);
  const statusUrl = started.status_url;
  const responseUrl = started.response_url;
  for (let i = 0; i < 90; i += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    const st = await fetch(statusUrl, { headers: { Authorization: `Key ${apiKey}` } });
    const body = await st.json();
    if (body.status === 'COMPLETED') {
      const res = await fetch(responseUrl, { headers: { Authorization: `Key ${apiKey}` } });
      const data = await res.json();
      const url = data.images && data.images[0] && data.images[0].url;
      if (!url) throw new Error('fal_empty');
      return url;
    }
    if (body.status === 'FAILED') throw new Error('fal_failed');
  }
  throw new Error('fal_timeout');
}

async function toInline(url) {
  if (String(url).startsWith('data:')) {
    const m = String(url).match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('bad_data_url');
    return { mime: m[1], data: m[2] };
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch_${res.status}`);
  const buf = await res.arrayBuffer();
  const mime = res.headers.get('content-type') || 'image/jpeg';
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return { mime, data: btoa(binary) };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function cors(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(response.body, { status: response.status, headers });
}
