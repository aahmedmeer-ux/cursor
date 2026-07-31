# Jettribe BigCommerce Theme

Theme source for [jettribe.com](https://www.jettribe.com/), based on BigCommerce Cornerstone.

## Custom Gear homepage fix

The homepage **Custom Gear** category tile previously linked to `/custom-gear/`, which returns 404.

It now links to the live Customized Vests category:

`/customized-vests-usa/`

Updated files:

- `jettribe-theme/templates/pages/home.html`
- `jettribe-theme/parsed/templates/ec0290bde4a1a1182b8449c119fc3041.json`

Upload the `jettribe-theme` folder (or a zip of it) via BigCommerce **Storefront → Themes** to apply the change.
