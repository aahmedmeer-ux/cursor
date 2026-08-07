# Virtual Try-On (free Hugging Face)

## What it uses
Free **IDM-VTON** via the public Gradio Space `yisol-idm-vton.hf.space` (ZeroGPU).  
This is the working free path — the model is not a simple `api-inference.huggingface.co` endpoint.

## Theme files
| File | Role |
|------|------|
| `templates/components/products/try-on-button.html` | Button near Add to Cart |
| `templates/components/products/try-on-modal.html` | Modal UI |
| `templates/components/products/product-view-actions.html` | Includes the button |
| `templates/components/products/product-view.html` | Sticky ATC also includes the button |
| `templates/components/common/body.html` | Includes the modal once |
| `assets/js/theme/common/virtual-tryon.js` | Logic + HF Gradio `fetch` |
| `assets/scss/beautify/_tryon.scss` | Styles |

## Product image (Handlebars)
On the button:
```handlebars
data-product-image="{{getImage product.main_image 'original' (cdn theme_settings.default_image_product)}}"
```
JS also syncs the live gallery image and prefers studio/mannequin shots.

## Setup (Theme Editor)
1. Upload the theme zip (or `stencil push`).
2. **Storefront → Themes → Customize → Virtual Try-On**
3. Enable **Try it On AI**
4. (Recommended) Paste a **free** HF token from https://huggingface.co/settings/tokens  
   → field **Hugging Face token**
5. Save & publish

## Limits
Free ZeroGPU queues get busy. Errors show a friendly message to retry or add an HF token.
