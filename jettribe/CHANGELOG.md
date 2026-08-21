# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Draft

## 1.3.0 (12-12-2025)
- feat(quick-search): add keyword suggestion feature (#298)

## 1.2.3 (11-14-2025)
- fix(infinite-scroll): horizontal filter not working when infinite loading enabled and faceted filters disabled

## 1.2.2 (10-03-2025)
- fix(pdp): js error when product has bulk pricing and shows price with tax

## 1.2.1 (09-12-2025)
- [CORNERSTONE]Add a section to display the payment promotion widget in the drop-down of the cart preview. ([#2523](https://github.com/bigcommerce/cornerstone/pull/2523))
- fix(designer-tool): export all slides correctly and skip empty slides

## 1.2.0 (08-01-2025)
- [CORNERTSONE] PAYPAL-5000 Quick pay buttons are seen on PDP before 'required' option selection (#290)
- [CORNERTSONE] Update to support multiple date fields and remove blank space (#291)
- New Feature: Product Designer Tool (#295)
- Fix definitionList-value inline in preview cart item (#297)
- Update Node.js version in devcontainer and GitHub Actions workflow to 20.x

## 1.1.3 (04-18-2025)
- Add option show sale badge discount amount (#281)
- Add schema config show/hide compare button of product card (#285)
- Fix z-index of sale badges on PDP. Position slick button of product feed widget (#288)

## 1.1.2 (03-28-2025)
- remove hide condition of product_sale_label in theme editor
- fix PLP product grid columns respect theme settings (#282)

## 1.1.1 (03-07-2025)

## 1.1.1 (03-07-2025)
- fixes #279: you save text not display if product has no default option
- fix js error when card_show_swatches = false and card_show_variantImg = true
- fix saved price calculation

## 1.1.0 (01-24-2025)
- [CORNERSTONE] Add nonce to scripts in checkout and account pages [#2525](https://github.com/bigcommerce/cornerstone/pull/2525)
- [CORNERSTONE] Use fetch when updating variants in cart ([#2521](https://github.com/bigcommerce/cornerstone/pull/2521))

## 1.0.3 (01-10-2025)
- Add theme option to display product description full width (#275)

## 1.0.2 (12-13-2024)
- Show quick payment buttons on PDP
- Display custom badges on recently viewed products (#271)
- Fix top banner carousel (#273)
- Fix duplicated qty box of simple pre-order products of FBT
- Improve performance of open menu on mobile and preview cart popup

## 1.0.1 (11-15-2024)
- Hide custom field name display in product cards (#264)
- Fix undefined 'input-font-color' in add payment methods account page
- Add slider to the center widget region in the header #265 #266 (#267)
- Create file stencil.conf.cjs for Node 20 compatibility
- Fix color of coupon saved popup message

## 1.0.0 (10-31-2024)
- Initial release.
