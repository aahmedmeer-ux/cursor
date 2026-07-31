# Jettribe Theme Changes — Upload Notes

## Upload
Use `jettribe-theme-no-reviews.zip` (Stencil-bundled).  
Storefront → Themes → Upload Theme → Apply.

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
Not hard: open **Page Builder → Homepage**, click the collage/banner widget, replace images and edit text, then **Save & Publish**. No theme rebuild needed for that.

## After upload checklist
1. Apply the new theme.
2. Page Builder: delete Customer Reviews widget if still present; update collage images/copy.
3. Admin: replace incorrect category images with real Jettribe products.
4. Confirm gift certificates & wishlists are enabled in store settings.
