# Jettribe BigCommerce Theme

Theme source for [jettribe.com](https://www.jettribe.com/), based on BigCommerce Cornerstone (`qeretail_2022`).

## Custom Gear homepage fix

The homepage **Custom Gear** category tile previously linked to `/custom-gear/` (404).

It now links to:

`/customized-gear-factory/?setCurrencyId=1`

## Upload to BigCommerce (important)

BigCommerce rejects manually nested zips with **TR-600**.

Use the ready-to-upload zip from this PR:

**`qeretail_2022-custom-gear-fix.zip`**

That zip has theme files at the **zip root** (same structure as a theme downloaded from BigCommerce), not inside an extra folder.

1. Download `qeretail_2022-custom-gear-fix.zip`
2. In BigCommerce go to **Storefront → Themes → Upload Theme**
3. Upload that zip and apply/publish it

Do **not** zip the `jettribe-theme` folder itself (that creates `jettribe-theme/templates/...` and triggers TR-600).

## Changed files

- `jettribe-theme/templates/pages/home.html`
- `jettribe-theme/parsed/templates/ec0290bde4a1a1182b8449c119fc3041.json`

## Footer Customization Form

Added a **Customization Form** link under **Rider Support** (below Privacy Policy) linking to the Google Form.

## Customized Gear – Factory updates

Theme now includes:

1. **Contact Us button** on the Customized Gear - Factory category page (`mailto:office@jettribe.com`) with team/bulk quote copy
2. **Size label remap** on product pages: `Adult` → `Adult Large`, `Youth` → `Adult Small`
3. **Design Confirmation** labels normalized to **A–V** when older A–Y / A–R text is present

### BigCommerce admin still required for

- Creating/editing product modifiers themselves (**Size**, **Design Confirmation A–V**, **Enter Custom Name**, **Enter Custom Number**) on the name-plate / custom products
- Uploading the cleaned Name & Number design sheet image (SKU JTG 25400A–V). Please upload the preferred sheet with SKUs in **Products → Images** after cropping white space / annotations in an image editor

