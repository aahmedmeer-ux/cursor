# Jettribe BigCommerce Theme

Theme source for [jettribe.com](https://www.jettribe.com/).

## Included fixes

1. **Homepage Custom Gear tile** → `/customized-gear-factory/?setCurrencyId=1`
2. **Footer Customization Form** link (Rider Support) → Google Form
3. **Back Deflector Custom Factory** (`/back-deflector-custom-factory-production-art-included/`, SKU `JTG 25453`)
   - Size labels: Adult → **Adult Large**, Youth → **Adult Small**
   - Name & Number helpers: Design Confirmation (A–V), Enter Custom Name, Enter Custom Number
   - Contact Us CTA (`mailto:office@jettribe.com`) for team/bulk quotes
   - Featured on **Customized Gear – Factory** and **Back Deflector** category pages

Does **not** apply to the blank product `JTG 25453-1`.

## Catalog notes (BigCommerce admin)

Theme can relabel options and show CTAs. To fully enable Name & Number checkout fields, ensure this product has modifiers:

- Design Confirmation (Select Letter A–V)
- Enter Custom Name
- Enter Custom Number

Publish/visibility for the custom product must be set in admin (the preview URL 404s when the product is hidden).

Design-sheet image crop/cleanup requires uploading cleaned images in Products → Images (source files were not available in theme zip).

## Upload

Use **`qeretail_2022-custom-gear-fix.zip`** (files at zip root).

Do **not** zip the `jettribe-theme` folder itself (causes TR-600).
