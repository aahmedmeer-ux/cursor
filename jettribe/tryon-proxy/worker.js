/**
 * Jettribe Virtual Try-On proxy (Cloudflare Worker example)
 *
 * Why a proxy?
 * Calling fal.ai from the browser would expose your API key in page source.
 * Deploy this worker, set FAL_KEY as a secret, then paste the worker URL into
 * Theme Editor → Virtual Try-On → Proxy URL.
 *
 * Deploy:
 *   1. npm i -g wrangler
 *   2. wrangler secret put FAL_KEY
 *   3. wrangler deploy
 *   4. Theme Editor → tryon_proxy_url = https://YOUR_WORKER.workers.dev
 *
 * Request body (JSON):
 *   {
 *     "person_image": "data:image/jpeg;base64,...",
 *     "clothing_image_url": "https://cdn.../vest.jpg",
 *     "description": "Jettribe UR-20 Vest"
 *   }
 *
 * Response:
 *   { "result_url": "https://..." }
 */

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }

    if (request.method !== 'POST') {
      return cors(json({ error: 'Method not allowed' }, 405));
    }

    if (!env.FAL_KEY) {
      return cors(json({ error: 'FAL_KEY not configured on worker' }, 500));
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return cors(json({ error: 'Invalid JSON body' }, 400));
    }

    const person = body.person_image || body.person_image_url;
    const clothing = body.clothing_image_url || body.garment_image_url;
    const description = body.description || 'apparel';

    if (!person || !clothing) {
      return cors(json({ error: 'person_image and clothing_image_url are required' }, 400));
    }

    const endpoint = env.FAL_ENDPOINT || 'https://fal.run/fal-ai/image-apps-v2/virtual-try-on';

    const falRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Key ${env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        person_image_url: person,
        clothing_image_url: clothing,
        description,
      }),
    });

    const text = await falRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return cors(json({ error: 'Upstream returned non-JSON', detail: text.slice(0, 300) }, 502));
    }

    if (!falRes.ok) {
      return cors(json({ error: 'Try-on provider failed', detail: data }, falRes.status));
    }

    const resultUrl =
      (data.image && data.image.url) ||
      data.image_url ||
      data.url ||
      (data.images && data.images[0] && (data.images[0].url || data.images[0]));

    if (!resultUrl) {
      return cors(json({ error: 'No image in provider response', detail: data }, 502));
    }

    return cors(json({ result_url: resultUrl }));
  },
};

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
