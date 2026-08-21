# Jettribe Theme Changes — Upload Notes

## Upload (use the raw download link)

**Jettribe package (with UI fixes):**  
https://github.com/aahmedmeer-ux/cursor/raw/cursor/remove-home-reviews-268c/jettribe-bigcommerce-upload.zip

**Original Drive theme baseline (no UI edits, for A/B upload test):**  
https://github.com/aahmedmeer-ux/cursor/raw/cursor/remove-home-reviews-268c/jettribe-upload/original-drive-theme-baseline.zip

Download the **raw** file (not the GitHub HTML/blob page) → Storefront → Themes → Upload Theme.

### Cross-match vs original Google Drive folder
Compared against the original theme from the Drive link (also snapshotted in git commit `905d8d0`):

| Check | Result |
|------|--------|
| Templates (`.html`) | **314 / 314 — none missing** |
| Critical root files (`config.json`, `schema.json`, `package.json`, `meta/*`, `lang/*`, stencil conf) | **All present** |
| Extra vs Drive source | Expected: full `parsed/templates` (314) from `stencil bundle` (Drive only had a partial leftover `parsed/` with 50 files), plus Jettribe images |
| Removed from upload zip | Demo assets `mickey.png`, `logo-discover.svg` (moved to `assets/cdn/` so Stencil excludes them); `parsed/stencilContext.json` (not in original package) |

The Drive folder is **source**, not a ready Control Panel zip. It must be packaged with `stencil bundle` (this repo’s prepare script).

### If you still see “A server error occurred”
1. Try the **original baseline** zip above. If that also fails, the store is likely at the **20 custom theme limit** or hitting a transient TR-100 — delete old custom themes in My Themes, then retry.
2. In the browser Network tab, check the failed theme job for a `TR-####` code and share it.
3. Rebuild locally: `cd jettribe && python3 scripts/prepare-bc-upload-zip.py`

Both zips ship with **`schema.json` minified under 64 KB** (Stencil pretty-prints it to ~106 KB, which BigCommerce rejects).

## Virtual Try-On (Try It)

On product pages, a **Try It** button appears next to **Add to Cart**.

1. Shopper clicks **Try It**
2. Uploads a full-body photo
3. AI returns a preview of the product on them

### Enable / configure (Theme Editor → Virtual Try-On)
- **Enable Try It button** — on by default
- **Proxy URL (recommended)** — Cloudflare Worker URL that holds your fal.ai key
- **fal.ai API key** — optional shortcut (key is visible in storefront HTML; use only for testing)

### Deploy the proxy (recommended)
```bash
cd jettribe/tryon-proxy
npm i -g wrangler
wrangler secret put FAL_KEY   # paste your fal.ai key
wrangler deploy
```
Paste the worker URL into **Proxy URL**, save theme, and re-apply if needed.

Get a fal.ai key at https://fal.ai (model used: `fal-ai/image-apps-v2/virtual-try-on`).

## Done in this theme package

1. **Popup** — Heading: `VIP Promotions Sign-Up`; image: Jettribe action photo (`nl-popup-jettribe.jpg`).
2. **Top menu** — Content pages hidden from primary nav; **Home** nav link forced to same URL as logo (`urls.home`).
3. **Utility bar** — Returns, Wishlists, Gift Certificates added next to Account.
4. **Footer** — Matches live Jettribe layout:
   - CATEGORIES: single Home → store home (no duplicate), then category links
   - RIDER SUPPORT: Order Status, Shipping, Returns, Warranty, Financing, Privacy
   - RIDER RESOURCES: Culture, Careers, Blog, Gift Certificates, Legal, Logo Download, Reseller Dropshipping (not all web pages)
   - CONTACT US + VIP LIST SIGN-UP (duplicate enroll text removed)
5. **Category / listing** — Square gallery, no RRP, no price ranges, black size labels; **Flags/Country filters removed**.
6. **Homepage wording** — `UNIQUE SPORT(S)-INSPIRED FASHION` → **QUALITY PWC GEAR AND APPAREL SINCE 1996**.
7. **Featured / top-categories backgrounds** — Jettribe action banners.

## Needs BigCommerce Admin / Page Builder (store content)

These cannot be fully fixed by theme files alone:

| Item | Where to update |
|------|-----------------|
| **Category box product photos** (wrong shoes/vest/bag) | Products → Categories → each category → Category Image |
| **Collage / banner widget images & remaining copy** | Page Builder on Homepage → edit each widget/region |
| **Rider Support footer links** (if URLs differ) | Page Builder region `footer_cs1--global`, or edit paths in `footer.html` |
| **Returns page URL** | Theme links to `/returns/` — ensure that page exists |
| **Country filter definition** | Settings → Products → Product Filters → disable Country (theme also hides it) |

### Updating collage / homepage widgets (item 11)
Open **Page Builder → Homepage**, edit the collage/banner widget, replace images/text, then **Save & Publish**.

## After upload checklist
1. Apply the new theme.
2. Page Builder: delete Customer Reviews widget if still present; update collage images/copy.
3. Admin: replace incorrect category images with real Jettribe products.
4. Confirm gift certificates & wishlists are enabled in store settings.
