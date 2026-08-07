# Nano Banana Virtual Try-On proxy

The storefront Try It button uses **Nano Banana–style multi-image editing**:

1. Shopper photo (image 1)
2. Product gallery photos (images 2+)
3. Prompt: dress the person in the exact product on a white full-body background

## Options

### A) fal.ai (direct from theme)
Theme Editor → **fal.ai API key** = your key for `fal-ai/nano-banana-2/edit`  
Requires fal credits: https://fal.ai/dashboard/billing

### B) Proxy (recommended — hides keys)
This Cloudflare Worker can use:

- `GEMINI_API_KEY` → Google `gemini-2.5-flash-image` (Nano Banana)
- or `FAL_KEY` → fal Nano Banana 2 Edit

```bash
npm i -g wrangler
wrangler secret put GEMINI_API_KEY
wrangler deploy
```

Then set Theme Editor → **Proxy URL** to the worker URL.

## Removed
Hugging Face IDM-VTON public queues (caused “Free AI queue was busy”).
