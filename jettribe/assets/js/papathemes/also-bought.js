import utils from '@bigcommerce/stencil-utils';
import { currencyFormat, extractMoney, openCartPreview, ProductCardsGraphQLQuery, productCardTemplate as defaultProductCartTemplate } from './utils';
import { defaultModal } from '../theme/global/modal';
import Swal from 'sweetalert2';
import Mustache from 'mustache';
import { openQuickView } from '../theme/global/quick-view';
//
// https://javascript.info/task/delay-promise
//
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function reportFormValidity(form) {
    let valid = true;
    if (form && form.checkValidity) {
        valid = form.checkValidity();
        if (!valid) {
            if (form.reportValidity) {
                form.reportValidity();
            } else {
                valid = true;
            }
        }
    }
    return valid;
}

export default class AlsoBought {
    constructor(parentProductDetails, {
        productCardTemplate,
        productCardActionsTemplate = `
            <div class="card-actions">
                {{^restrictToLogin}}
                    ${/* ---------- quantity box ---------- */ ''}
                    {{^isParentProduct}}
                        {{#card_show_qty}}
                            {{#hasOptions}}
                                <div class="_qtyAdd _qtyOnly">
                                    {{&qtyBoxHtml}}
                                </div>
                            {{/hasOptions}}
                            {{#preOrder}}
                                <div class="_qtyAdd _qtyOnly">
                                    {{&qtyBoxHtml}}
                                </div>
                            {{/preOrder}}
                            {{^preOrder}}
                                {{#addToCartUrl}}
                                    <div class="_qtyAdd _qtyOnly">
                                        {{&qtyBoxHtml}}
                                    </div>
                                {{/addToCartUrl}}
                            {{/preOrder}}
                            <input
                                type="checkbox"
                                id="productView-alsoBought-item-checkbox-{{id}}"
                                value="{{id}}"
                                {{#checked}}checked{{/checked}}
                                data-also-bought-checkbox
                                style="display:none">
                        {{/card_show_qty}}
                    {{/isParentProduct}}

                    ${/* ---------- select / choose options button ---------- */ ''}
                    {{#isParentProduct}}
                        <div class="productView-alsoBought-item-check">
                            <div class="form-field">
                                <input
                                    class="form-checkbox"
                                    type="checkbox"
                                    name="productView-alsoBought-item-checkbox"
                                    id="productView-alsoBought-item-checkbox-{{id}}"
                                    value="{{id}}"
                                    {{#checked}}checked{{/checked}}
                                    data-also-bought-checkbox>
                                <label class="form-label {{#checked}}is-checked{{/checked}}" for="productView-alsoBought-item-checkbox-{{id}}">
                                    {{name}}
                                </label>
                            </div>
                        </div>
                    {{/isParentProduct}}
                    {{^isParentProduct}}
                        {{^card_show_qty}}
                            {{^outOfStockMessage}}
                                <div class="productView-alsoBought-item-check">
                                    <div class="form-field">
                                        <input
                                            class="form-checkbox"
                                            type="checkbox"
                                            name="productView-alsoBought-item-checkbox"
                                            id="productView-alsoBought-item-checkbox-{{id}}"
                                            value="{{id}}"
                                            {{#checked}}checked{{/checked}}
                                            data-also-bought-checkbox>
                                        <label class="form-label {{#checked}}is-checked{{/checked}}" for="productView-alsoBought-item-checkbox-{{id}}">
                                            {{#hasOptions}}{{txtChooseOptions}}{{/hasOptions}}
                                            {{#preOrder}}{{txtPreOrder}}{{/preOrder}}
                                            {{#addToCartUrl}}{{txtAddToCart}}{{/addToCartUrl}}
                                        </label>
                                    </div>
                                </div>
                            {{/outOfStockMessage}}
                        {{/card_show_qty}}
                    {{/isParentProduct}}

                    ${/* ---------- add to cart button ---------- */ ''}
                    {{^isParentProduct}}
                        {{#hasOptions}}
                            <div class="_qtyAdd">
                                <a href="{{url}}" target="_blank" title="{{txtChooseOptions}}" data-event-type="product-click" class="button button--primary card-figcaption-button{{#show_product_quick_view}}{{#ajax_add_to_cart}} quickview-alt{{/ajax_add_to_cart}}{{/show_product_quick_view}}" data-product-id="{{id}}">
                                    <span>{{txtChooseOptions}}</span>
                                    <i><svg class="icon"><use href="#icon-cart-add"></use></svg></i>
                                </a>
                            </div>
                        {{/hasOptions}}
                        {{#preOrder}}
                            <div class="_qtyAdd">
                                <a href="{{url}}" title="{{txtPreOrder}}" data-event-type="product-click" class="button button--primary card-figcaption-button">
                                    <span>{{txtPreOrder}}</span>
                                    <i><svg class="icon"><use href="#icon-cart-add"></use></svg></i>
                                </a>
                            </div>
                        {{/preOrder}}
                        {{#addToCartUrl}}
                            <div class="_qtyAdd">
                                <a href="{{addToCartUrl}}" title="{{txtAddToCart}}"{{^ajax_add_to_cart}} data-event-type="product-click"{{/ajax_add_to_cart}} class="button button--primary card-figcaption-button"{{#ajax_add_to_cart}} data-papathemes-cart-item-add{{/ajax_add_to_cart}}>
                                    <span>{{txtAddToCart}}</span>
                                    <i><svg class="icon"><use href="#icon-cart-add"></use></svg></i>
                                </a>
                            </div>
                        {{/addToCartUrl}}
                        {{#outOfStockMessage}}
                            <a href="{{url}}" data-event-type="product-click" class="button button--outstock card-figcaption-button" data-product-id="{{id}}">
                                <span>{{outOfStockMessage}}</span>
                            </a>
                        {{/outOfStockMessage}}
                    {{/isParentProduct}}

                    ${/* ---------- quick view and compare ---------- */ ''}
                    {{^isParentProduct}}
                        <div class="_quickViewAndCompare">
                            {{#show_compare}}
                                <a href="#" class="button button--primary card-figcaption-button compare"
                                    title="{{txtCompare}}"
                                    data-compare-id="{{id}}"
                                    data-compare-image="{{#defaultImage}}{{url320wide}}{{/defaultImage}}"
                                    data-compare-title="{{name}}"
                                    data-compare-url="{{url}}">
                                    <span class="btn-icon">
                                        <svg class="icon"><use href="#icon-compare"></use></svg>
                                    </span>
                                </a>
                            {{/show_compare}}
                            {{#show_product_quick_view}}
                                <a href="#"
                                    title="{{txtQuickView}}"
                                    class="button card-figcaption-button quickview"
                                    tabindex="0"
                                    data-event-type="product-click"
                                    data-product-id="{{id}}">
                                        <span class="btn-icon">
                                            <svg class="icon"><use href="#icon-eye-open"></use></svg>
                                        </span>
                                </a>
                            {{/show_product_quick_view}}
                        </div>
                    {{/isParentProduct}}

                    {{#hasOptions}}
                        <div class="_selectedOptions" data-bulkorder-options></div>
                    {{/hasOptions}}
                    {{#preOrderHasOptions}}
                        <div class="_selectedOptions" data-bulkorder-options></div>
                    {{/preOrderHasOptions}}
                {{/restrictToLogin}}
            </div>
        `,
        errorAlertTemplate = `
            <div class="alertBox alertBox--error" data-added-to-cart-message>
                <div class="alertBox-column alertBox-icon">
                    <icon glyph="ic-error" class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg></icon>
                </div>
                <p class="alertBox-column alertBox-message">
                    <span>{{&message}}</span>
                </p>
            </div>`,
        successAlertTemplate = `
            <div class="alertBox alertBox--success" data-added-to-cart-message>
                <div class="alertBox-column alertBox-icon">
                    <icon glyph="ic-success" class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg></icon>
                </div>
                <p class="alertBox-column alertBox-message">
                    <span>{{&message}}</span>
                </p>
            </div>`,
    } = {}) {
        this.parentProductDetails = parentProductDetails;
        this.productCardTemplate = productCardTemplate || defaultProductCartTemplate;
        this.productCardActionsTemplate = productCardActionsTemplate;
        this.errorAlertTemplate = errorAlertTemplate;
        this.successAlertTemplate = successAlertTemplate;
        this.context = this.parentProductDetails.context;
        this.numberTexts = this.context.txtAlsoBoughtNumberArray.split(',');
        this.allNumberTexts = this.context.txtAlsoBoughtAllNumberArray.split(',');
        this.$alsoBoughtEl = $('[data-also-bought]', parentProductDetails.$productViewScope);
        this.config = this.$alsoBoughtEl.data('alsoBought') || {};
        this.moneyWithTax = this.config.samplePriceWithTax ? extractMoney(this.config.samplePriceWithTax, this.context.money) : null;
        this.moneyWithoutTax = this.config.samplePriceWithoutTax ? extractMoney(this.config.samplePriceWithoutTax, this.context.money) : null;
        this.context = this.parentProductDetails.context;
        this.restrictToLogin = !this.context.customerId && this.context.hidePriceFromGuests;

        // try to guess any price on the page
        this.moneyFallback = this.moneyWithTax || this.moneyWithoutTax
            // is default currency?
            || (this.context.activeCurrencyCode && this.context.activeCurrencyCode === this.context.defaultCurrencyCode ? this.context.money : null)
            // any price on the page
            || $('[data-product-price-without-tax], [data-product-price-with-tax]').get()
                .reduce((_money, el) => _money || extractMoney($(el).text()), null)
            // use currency code
            || (this.context.activeCurrencyCode ? { ...this.context.money, currency_token: ` ${this.context.activeCurrencyCode} ` } : this.context.money);

        this.productNodes = [];
        this.onQuantityChange = this.onQuantityChange.bind(this);
        this.onParentProductChange = this.onParentProductChange.bind(this);
        this.onAlsoBoughtCheckboxChange = this.onAlsoBoughtCheckboxChange.bind(this);
        this.onAddAllButtonClick = this.onAddAllButtonClick.bind(this);
        this.onAddSelectedButtonClick = this.onAddSelectedButtonClick.bind(this);

        const thumbSize = this.context.alsobought_thumbnail_size.split('x');

        this.thumbnailWidth = Number(thumbSize[0]) || 100;
        this.thumbnailHeight = Number(thumbSize[1]) || 100;

        this.retrieveAlsoBoughtProducts();

        $('[data-add-all]', this.$alsoBoughtEl).on('click', this.onAddAllButtonClick);
        $('[data-add-selected]', this.$alsoBoughtEl).on('click', this.onAddSelectedButtonClick);
    }

    currencyFormat(value) {
        return currencyFormat(value, (this.config.includeTax ? this.moneyWithTax : this.moneyWithoutTax) || this.moneyFallback);
    }

    async retrieveAlsoBoughtProducts() {
        const $productEls = $('[data-product-id]', this.$alsoBoughtEl);
        /** @type {number[]} */
        const productIds = $productEls.get().map(el => $(el).data('productId'));

        if ($productEls.length > 0) {
            // this.$alsoBoughtEl.removeClass('u-hiddenVisually');
            const checked = this.context.alsobought_checked;
            const query = new ProductCardsGraphQLQuery({
                ...this.context,
                restrictToLogin: this.restrictToLogin,
            });
            const productNodes = await query.load(productIds);

            this.productNodes.push(...productNodes);

            productNodes.forEach(product => {
                const $productEl = $productEls.filter((_i, el) => $(el).data('productId') === product.id);
                const isParentProduct = $productEl.is('[data-parent-product]');
                const cardBodyBottomHtml = Mustache.render(this.productCardActionsTemplate, { ...product, checked, isParentProduct });
                const productCardHtml = Mustache.render(this.productCardTemplate, { ...product, cardBodyBottomHtml });

                $productEl.html(productCardHtml);

                const $check = $productEl.find('[data-also-bought-checkbox]');
                const $qty = $productEl.find('[data-card-quantity-change] input');

                // bind change event to checkbox of selecting item to add to cart
                $check.on('change', this.onAlsoBoughtCheckboxChange);

                // allow change quantity to 0
                $qty.attr('min', '0');

                // set quantity to 0 if also bought not select by default
                if (!checked) {
                    $qty.val('0');
                }

                // bind change event to quantity input to update checkbox, total price & add selected to cart button
                $qty.on('change', this.onQuantityChange);
            });

            // sync the parent product from main view to card item
            // and update total price & add selected to cart button
            this.onParentProductChange();

            // listen parent product price/quantity change.
            // use first() to avoid multiple callbacks.
            this.parentProductDetails.$scope.first().on('price-change quantity-change', this.onParentProductChange);
        }
    }


    /**
     * Check whether product has options but not selected yet
     *
     * @param {jQuery<HTMLElement>} $productEl [data-product-id] element
     * @returns {boolean} true if product has options but not selected yet
     */
    isSelectedProductOptions($productEl) {
        const $options = $productEl.find('[data-bulkorder-options]');
        const $form = $options.find('form');

        return $options.length === 0 || $form.length > 0;
    }

    /**
     * Open quick view for a product item to select options
     *
     * @param {jQuery<HTMLElement} $productEl [data-product-id] element
     */
    openQuickView($productEl) {
        const $checkbox = $productEl.find('[data-also-bought-checkbox]');
        const $options = $productEl.find('[data-bulkorder-options]');
        const $qty = $productEl.find('[data-card-quantity-change] input');

        openQuickView({
            currentTarget: $checkbox.get(0),
            productId: $productEl.data('productId'),
            size: 'purchaseOptions',
            template: 'products/quick-view-alt',
            context: this.context,
            closeCallback: () => {
                // uncheck the product & set qty to 0
                // if no option selected when quick view closed
                if ($options.find('form').length === 0) {
                    $qty.val('0').trigger('change');
                    $checkbox.prop('checked', false).trigger('change');
                }
            },
        });
    }

    updateTotalPrice() {
        // stop showing total price if require login
        if (this.restrictToLogin) {
            return;
        }

        const $checkboxes = $('[data-also-bought-checkbox]:checked', this.$alsoBoughtEl);
        const $productEls = $checkboxes.closest('[data-product-id]');

        let totalWithTax = 0;
        let totalWithoutTax = 0;

        $productEls.each((i, productEl) => {
            const $productEl = $(productEl);
            const productId = $productEl.data('productId');
            const productNode = this.productNodes.find(node => node.id === productId);
            let priceWithTax = $productEl.find('[data-product-price-with-tax]').data('priceValue');
            let priceWithoutTax = $productEl.find('[data-product-price-without-tax]').data('priceValue');

            if (!priceWithTax) {
                if (productNode?.taxDisplay === 'BOTH') {
                    priceWithTax = productNode?.price?.value?.priceWithTax;
                } else if (productNode?.taxDisplay === 'INC') {
                    priceWithTax = productNode?.price?.value?.price;
                }
            }

            if (!priceWithoutTax) {
                if (productNode?.taxDisplay === 'BOTH') {
                    priceWithoutTax = productNode?.price?.value?.priceWithoutTax;
                } else if (productNode?.taxDisplay === 'EX') {
                    priceWithoutTax = productNode?.price?.value?.price;
                }
            }

            const $qty = $productEl.find('[data-card-quantity-change] input');
            let qty = parseInt($qty.val(), 10) || productNode?.minimumQuantity || 1;

            if ($productEl.is('[data-parent-product]')) {
                qty = this.parentProductDetails.qty;
            }

            totalWithTax += priceWithTax * qty;
            totalWithoutTax += priceWithoutTax * qty;
        });

        const $withTax = $('[data-total-with-tax]', this.$alsoBoughtEl);
        const $withoutTax = $('[data-total-without-tax]', this.$alsoBoughtEl);

        if (totalWithTax) {
            $('[data-price]', $withTax).html(this.currencyFormat(totalWithTax));
            $withTax.show();
            if (totalWithoutTax) {
                $('[data-tax-label]', $withTax).show();
            } else {
                $('[data-tax-label]', $withTax).hide();
            }
        } else {
            $withTax.hide();
        }

        if (totalWithoutTax) {
            $('[data-price]', $withoutTax).html(this.currencyFormat(totalWithoutTax));
            $withoutTax.show();
            if (totalWithTax) {
                $('[data-tax-label]', $withoutTax).show();
            } else {
                $('[data-tax-label]', $withoutTax).hide();
            }
        } else {
            $withoutTax.hide();
        }
    }

    /**
     * On product item's quantity change:
     * - Update parent product's quantity
     * - Check/uncheck item to add to cart according to quantity
     * - Update total price & add selected to cart button via checkbox change event trigger
     *
     * @param {Event} event
     */
    onQuantityChange(event) {
        const $productEl = $(event.target).closest('[data-product-id]');
        const qty = parseInt($(event.target).val(), 10);
        const productId = $productEl.data('productId');
        const $checkbox = $productEl.find('[data-also-bought-checkbox]');

        // update parent product's quantity if > 0
        if (productId === this.parentProductDetails.productId && qty > 0) {
            const { $input, $text } = this.parentProductDetails.getViewModel().quantity;
            const parentProductQty = parseInt($input.val(), 10);

            if (parentProductQty !== qty) {
                $input.val(qty).trigger('change');
                $text.text(qty);
            }
        }

        // check/uncheck item to add to cart according to quantity
        // update total price & add selected to cart button
        $checkbox.prop('checked', qty > 0).trigger('change');
    }

    onParentProductChange() {
        const $parentProduct = this.$alsoBoughtEl.find('[data-parent-product]');
        const $cardViewModel = this.parentProductDetails.getViewModel($parentProduct);
        const { price, qty } = this.parentProductDetails;

        // update price on product card of parent product
        if (price) {
            this.parentProductDetails.updatePriceView($cardViewModel, price);
        }

        // update quantity on product card of parent product
        const $qty = $parentProduct.find('[data-card-quantity-change] input');
        const prevQty = parseInt($qty.val(), 10);
        if (prevQty !== qty) {
            $qty.val(qty).trigger('change');
        }

        this.updateTotalPrice();
        this.updateAddSelectedToCartButton();
    }

    onAddAllButtonClick(e) {
        e.preventDefault();

        $('[data-also-bought-checkbox]', this.$alsoBoughtEl)
            .prop('checked', true)
            .trigger('change');
    }

    onAddSelectedButtonClick(e) {
        e.preventDefault();
        this.addSelectedProductsToCart();
    }

    /**
     * On product item's checkbox change:
     * - Open quick view if product has options but not selected yet
     * - Update total price & add selected to cart button
     *
     * @param {Event} event
     */
    onAlsoBoughtCheckboxChange(event) {
        const $checkbox = $(event.currentTarget);
        const $productEl = $checkbox.closest('[data-product-id]');
        const isParentProduct = $productEl.is('[data-parent-product]');

        if (!isParentProduct && $checkbox.prop('checked') && !this.isSelectedProductOptions($productEl)) {
            // open quick view when product has options but not selected yet
            this.openQuickView($productEl);
        }

        this.updateTotalPrice();
        this.updateAddSelectedToCartButton();
    }

    updateAddSelectedToCartButton() {
        const $all = $('[data-also-bought-checkbox]', this.$alsoBoughtEl);
        const $checked = $all.filter(':checked');
        const $btns = $('[data-buttons]', this.$alsoBoughtEl);

        if ($checked.length > 0) {
            let str;
            if ($checked.length === $all.length) {
                str = $checked.length <= this.allNumberTexts.length ? this.allNumberTexts[$checked.length - 1] : $checked.length;
            } else {
                str = $checked.length <= this.numberTexts.length ? this.numberTexts[$checked.length - 1] : $checked.length;
            }
            const $btn = $('[data-add-selected]', this.$alsoBoughtEl);
            const text = String($btn.data('originalText') || $btn.html());
            $btn.data('originalText', text).html(text.replace('%str%', str));
            $btns.addClass('show');
        } else {
            $btns.removeClass('show');
        }
    }

    async addSelectedProductsToCart() {
        const $checkboxes = this.$alsoBoughtEl.find('[data-also-bought-checkbox]:checked');
        const $productEls = $checkboxes.closest('[data-product-id]');
        const $parentProductEl = $productEls.filter('[data-parent-product]');
        const responses = [];

        // Add parent product to cart first
        if ($parentProductEl.length > 0) {
            if (reportFormValidity(this.parentProductDetails.$form.get(0))) {
                const [err, resp] = await this.parentProductDetails.addProductToCartAsync();
                const errorMsg = err || resp.data.error;

                if (errorMsg) {
                    await Swal.fire({
                        text: errorMsg,
                        type: 'error',
                    });
                    return;
                }

                responses.push(resp);

                $parentProductEl.find('[data-card-quantity-change] input').val('0');
                $parentProductEl.find('[data-also-bought-checkbox]')
                    .prop('checked', false)
                    .trigger('change');
            } else {
                const optionChangeEl = this.parentProductDetails.$scope.find('[data-product-option-change]')[0];
                if (optionChangeEl && optionChangeEl.scrollIntoView) {
                    optionChangeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }
        }

        const childProductEls = $productEls.not($parentProductEl).get();
        let scrolled = false;
        let error = false;

        /**
         * One-time listen to quantity change or option change to clear alert message
         * @param {jQuery<HTMLElement} $productEl [data-product-id] element
         */
        const bindClearAlert = ($productEl) => {
            const clearAlert = () => $productEl.find('[data-added-to-cart-message]').remove();
            $productEl.find('[data-card-quantity-change] input').one('change', clearAlert);
            $productEl.find('[data-also-bought-checkbox]').one('change', clearAlert);
        };

        // Add selected also-bought products to cart
        for (let i = 0; i < childProductEls.length; i++) {
            const $productEl = $(childProductEls[i]);
            const productId = $productEl.data('productId');

            if (!productId || productId === this.parentProductDetails.productId) {
                continue;
            }

            // Stop add to cart if product has options but not selected yet
            // and show error message under the product card
            if (!this.isSelectedProductOptions($productEl)) {
                const msg = Mustache.render(this.errorAlertTemplate, { message: this.context.bulkOrderChooseOptions });
                const $options = $productEl.find('[data-bulkorder-options]').html(msg);
                const optionsEl = $options.get(0);

                if (optionsEl && optionsEl.scrollIntoView && !scrolled) {
                    optionsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    scrolled = true;
                }

                // Clear alert message on quantity change or checkbox change at the first time
                bindClearAlert($productEl);
                error = true;
                continue;
            }

            // Add product to cart now
            const [errorMsg, resp] = await this.addProductToCart($productEl);

            if (errorMsg) {
                await Swal.fire({
                    text: errorMsg,
                    type: 'error',
                });
                return;
            }

            responses.push(resp);

            // Show added to cart success message under the product card
            const msg = Mustache.render(this.successAlertTemplate, { message: this.context.txtAddedToCart });
            const $options = $productEl.find('[data-bulkorder-options]').html(msg);
            const $checkbox = $productEl.find('[data-also-bought-checkbox]');

            if ($options.length === 0) {
                $checkbox.parent().append(msg);
            }

            // Clear quantity input & uncheck the product
            $productEl.find('[data-card-quantity-change] input').val('0');
            $checkbox.prop('checked', false).trigger('change');

            // Clear alert message on quantity change or checkbox change at the first time
            bindClearAlert($productEl);

            // Delay before adding next product to cart to avoid rate limit
            if (i < childProductEls.length - 1) {
                await delay(200);
            }
        }

        if (!error && responses.length > 0) {
            if (this.parentProductDetails.previewModal) {
                const modal = defaultModal();
                modal.close();

                if (this.context.add_to_cart_popup === 'cart') {
                    const addedItemIds = responses.map(resp => resp.data.cart_item.id);
                    return openCartPreview(addedItemIds, this.context);
                }

                if (this.context.add_to_cart_popup !== 'hide') {
                    this.parentProductDetails.previewModal.open();
                }

                this.parentProductDetails.updateCartContent(this.parentProductDetails.previewModal, responses[0].data.cart_item.id);
            } else {
                // if no modal, redirect to the cart page
                this.redirectTo(responses[0].data.cart_item.cart_url || this.context.urls.cart);
            }
        }
    }

    /**
     * Add a also-bought product to cart
     *
     * @param {jQuery<HTMLElement>} $productEl [data-product-id] element
     * @returns {Promise<[string, any]>} error message and response
     */
    addProductToCart($productEl) {
        // Do not do AJAX if browser doesn't support FormData
        if (window.FormData === undefined) {
            return;
        }

        const $options = $productEl.find('[data-bulkorder-options]');
        const $form = $options.find('form');
        const $qty = $productEl.find('[data-card-quantity-change] input');
        const productId = $productEl.data('productId');
        const qty = Number($qty.val()) || 1;
        const formData = new FormData($form.get(0) || undefined);
        formData.set('product_id', productId);
        formData.set('qty[]', qty);

        const promise = new Promise((resolve) => {
            utils.api.cart.itemAdd(formData, (err, response) => {
                let errorMessage = err || response.data.error;

                if (response?.data?.error?.minqty) {
                    errorMessage = this.context.txtMinQty.replace('%qty%', response.data.error.minqty);
                }

                if (response?.data?.error?.maxqty) {
                    errorMessage = this.context.txtMaxQty.replace('%qty%', response.data.error.maxqty);
                }

                resolve([errorMessage, response]);
            });
        });

        return promise;
    }
}
