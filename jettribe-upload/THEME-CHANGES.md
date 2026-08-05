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

## Done in this theme package

1. **Popup** — Heading: `VIP Promotions Sign-Up`; image: Jettribe action photo (`nl-popup-jettribe.jpg`).
2. **Top menu** — Content pages (Customization Form, Returns, VIP Deals, etc.) hidden from primary nav (`hide_content_navigation`).
3. **Utility bar** — Returns, Wishlists, Gift Certificates added next to Account.
4. **Footer** — Columns ordered like current site: Categories → Rider Support → Rider Resources → Contact Us → VIP List Sign-Up. Payment icons: Mastercard, Visa, Amex, PayPal, Google Pay, Amazon Pay.
5. **Category / listing** — Product gallery size is **square** (`600x600`). RRP removed. Price ranges disabled. Size option text forced to **black**.
6. **Frequently Bought Together** — Inherits price-range / RRP fixes.
7. **Homepage wording** — Auto-replaces “UNIQUE SPORTS-INSPIRED FASHION” with **QUALITY PWC GEAR AND APPAREL SINCE 1996**.
8–9. **Featured / top-categories backgrounds** — Replaced with Jettribe action banners.
13. **Filters** — Country / flag facets hidden.

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
