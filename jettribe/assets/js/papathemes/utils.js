/* eslint-disable camelcase */
import utils from '@bigcommerce/stencil-utils';

function _formatMoney(_amount, _decimalCount = 2, decimal = '.', thousands = ',') {
    try {
        let decimalCount = Math.abs(_decimalCount);
        decimalCount = Number.isNaN(decimalCount) ? 2 : decimalCount;

        const negativeSign = _amount < 0 ? '-' : '';
        const amount = Math.abs(Number(_amount) || 0).toFixed(decimalCount);

        const i = parseInt(amount, 10).toString();
        const j = (i.length > 3) ? i.length % 3 : 0;

        return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, `$1${thousands}`) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : '');
    } catch (e) {
        return null;
    }
}

export function currencyFormat(value, {
    currency_token = '$',
    currency_location = 'left',
    decimal_token = '.',
    decimal_places = 2,
    thousands_token = ',',
} = {}) {
    const _value = _formatMoney(value, decimal_places, decimal_token, thousands_token);
    return currency_location.toLowerCase() === 'left' ? `${currency_token}${_value}` : `${_value}${currency_token}`;
}

export function extractMoney(price, defaultMoney = {
    currency_token: '$',
    currency_location: 'left',
    decimal_token: '.',
    decimal_places: 2,
    thousands_token: ',',
}) {
    const money = { ...defaultMoney };

    if (!price && price !== 0) {
        return money;
    }

    const m = String(price).trim().match(/^([^0-9]*)([0-9.,]*)([^0-9]*)$/);
    const leftSymbol = String(m[1]).trim();
    const value = String(m[2]);
    const rightSymbol = String(m[3]).trim();
    const commaPosition = value.indexOf(',');
    const commaCount = (value.match(/,/g) || []).length;
    const dotPosition = value.indexOf('.');
    const dotCount = (value.match(/\./g) || []).length;

    if (leftSymbol) {
        money.currency_token = leftSymbol;
        money.currency_location = 'left';
    } else if (rightSymbol) {
        money.currency_token = rightSymbol;
        money.currency_location = 'right';
    }

    if (commaCount.length >= 2) {
        money.thousands_token = ',';
        money.decimal_token = '.';
        money.decimal_places = dotPosition > -1 ? value.length - dotPosition - 1 : 0;
    } else if (dotCount.length >= 2) {
        money.thousands_token = '.';
        money.decimal_token = ',';
        money.decimal_places = commaPosition > -1 ? value.length - commaPosition - 1 : 0;
    } else if (commaPosition > dotPosition && dotPosition > -1) {
        money.thousands_token = '.';
        money.decimal_token = ',';
        money.decimal_places = value.length - commaPosition - 1;
    } else if (dotPosition > commaPosition && commaPosition > -1) {
        money.thousands_token = ',';
        money.decimal_token = '.';
        money.decimal_places = value.length - dotPosition - 1;
    } else if (commaPosition > -1) {
        if ((value.length - commaPosition - 1) % 3 === 0) {
            money.thousands_token = ',';
            money.decimal_token = '.';
            money.decimal_places = 0;
        } else {
            money.thousands_token = '.';
            money.decimal_token = ',';
            money.decimal_places = value.length - commaPosition - 1;
        }
    } else if (dotPosition > -1) {
        if ((value.length - dotPosition - 1) % 3 === 0) {
            money.thousands_token = '.';
            money.decimal_token = ',';
            money.decimal_places = 0;
        } else {
            money.thousands_token = ',';
            money.decimal_token = '.';
            money.decimal_places = value.length - dotPosition - 1;
        }
    } else if (commaPosition === -1 && dotPosition === -1) {
        money.decimal_places = 0;
    }

    return money;
}

export function setCookie(cname, cvalue, sec) {
    const d = new Date();
    d.setTime(d.getTime() + sec * 1000);
    const expires = `expires=${d.toUTCString()}`;
    document.cookie = `${cname}=${cvalue};${expires};path=/`;
}

export function getCookie(cname) {
    const name = `${cname}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}

export function loadStyle(url) {
    if (Array.from(document.getElementsByTagName('link')).filter(el => el.href === url).length > 0) {
        return;
    }
    $('<link></link>').attr({ rel: 'stylesheet', href: url }).appendTo('head');
}

/**
 * Check if user using accessibility focus
 * @returns {boolean}
 */
export function isADA() {
    return document.activeElement && document.activeElement.matches(':focus-visible');
}

export function inert($el, inertValue = true) {
    $el.siblings().not('.modal').prop('inert', inertValue);
    const $parent = $el.parent();
    if (!$parent.is('body')) {
        inert($parent, inertValue);
    }
}

// mooncat: full functionality cart popup
export async function initCartPopup(context, $scope) {
    $scope.data('context', context);
    return import('./cart-popup').then(({ default: CartPopup }) => new CartPopup(context, $scope));
}

// papathemes-beautify
/**
 * Open sidebar cart preview
 * @param {String|Array<{id: String, qty: Number, product: ProductDetails}>} cartItemId Added item ID or array of added items
 * @param {Object} context
 */
export function openCartPreview(cartItemId, context) {
    const loadingClass = 'is-loading';
    const $cart = $('[data-cart-preview]');
    const $cartDropdown = $('#cart-preview-dropdown');
    const $cartLoading = $('<div class="loadingOverlay"></div>');
    const options = {
        template: 'common/cart-preview',
    };

    $cart.addClass('is-open');
    $cartDropdown
        .addClass('is-open')
        .addClass(loadingClass)
        .html($cartLoading)
        .trigger('open.toggle');
    $cartLoading
        .show();

    utils.api.cart.getContent(options, (err, response) => {
        $cartDropdown
            .removeClass(loadingClass)
            .html(response);
        $cartLoading
            .hide();

        // Update cart counter
        const $body = $('body');
        const $cartQuantity = $('[data-cart-quantity]', $cartDropdown);
        const $cartPrice = $('[data-cart-price]', $cartDropdown);
        const $cartCoupons = $('[data-cart-coupons]', $cartDropdown);
        const $cartPriceFormatted = $('[data-cart-formatted]', $cartDropdown);
        const quantity = $cartQuantity.data('cartQuantity') || 0;
        const price = $cartPrice.data('cart-price') || 0;
        const coupons = $cartCoupons.data('cart-coupons') || '';
        const priceFormatted = $cartPriceFormatted.data('cart-formatted') || '';
        if (price === 0) {
            $body.trigger('cart-quantity-update', quantity);
        } else {
            $body.trigger('cart-quantity-update', [quantity, priceFormatted, coupons]);
        }

        const animateItem = (itemId) => {
            const $item = $($cartDropdown.find(`[data-cart-itemid="${itemId}"]`)[0]).css('opacity', 0);
            $item.parent().prepend($item);
            const height = $item.outerHeight(false);
            $item.css('height', '0').animate({ height: `${height}px` }, 500, () => $item.css('height', ''));
            $item.animate({ opacity: 1 }, 600);
        };

        // Animate items added by FBT
        if (Array.isArray(cartItemId)) {
            $(cartItemId).each((index, item) => {
                animateItem(item.id);
            });
        }

        // Animate a single item added to cart
        if (cartItemId && !Array.isArray(cartItemId)) {
            animateItem(cartItemId);
        }

        // mooncat: full functionality cart popup
        initCartPopup(context, $cartDropdown);

        // mooncat: init slick slider inside
        $cartDropdown.find('[data-slick]').not('.slick-initialized').slick();

        $('body').trigger('cartpreviewshown', [$cartDropdown]); // papathemes-mooncat
    });
}

// window.testAnimate = (cartItemId) => {
//     const $cartDropdown = $('#cart-preview-dropdown');
//     const $item = $cartDropdown.find(`[data-cart-itemid="${cartItemId}"]`).first().css('opacity', 0);
//     const from = $item.position();
//     const width = $item.width();
//     const height = $item.height();
//     const $clone = $item.clone().addClass('_flying').insertAfter($item);
//     $item.parent().prepend($item);
//     const to = $item.position();
//     $clone.css({
//         position: 'absolute',
//         top: `${from.top}px`,
//         left: `${from.left}px`,
//         width: `${width}px`,
//         height: `${height}px`,
//     }).animate({ opacity: 1 }, 200, () => {
//         $clone.animate({
//             top: `${to.top}px`,
//             left: `${to.left}px`,
//         }, 300, () => {
//             $clone.addClass('_shadowPulse');
//             $clone.one('animationend', () => {
//                 $clone.removeClass('_shadowPulse');
//                 $item.css('opacity', 1);
//             });
//         });
//     });
// }

export function flyToCart(object, fromEl = null, toEl = '[data-cart-preview]') {
    const $object = $(object);
    const $toEl = $(toEl).first();
    const $fromEl = fromEl ? $(fromEl).first() : $object.first();

    if ($toEl.length === 0) {
        return;
    }
    const $el = $object.clone()
        .appendTo('body')
        .css({
            position: 'absolute',
            top: $fromEl.offset().top,
            left: $fromEl.offset().left,
            zIndex: 10000,
            opacity: 0,
        });
    $el.animate({
        top: $toEl.offset().top + $toEl.height() / 2,
        left: $toEl.offset().left + $toEl.width() - $el.width(),
        opacity: 0.5,
    }, 500, () => {
        $el.animate({
            top: $toEl.offset().top + $toEl.height(),
            opacity: 0.2,
        }, 200, () => {
            $el.animate({
                top: $toEl.offset().top,
                opacity: 0,
            }, 100, () => {
                $el.remove();
            });
        });
    });
}


// let uidVal = 0;
// const uid = (returnLastValue = false) => `papathemesuid${returnLastValue ? uidVal - 1 : uidVal++}`;

export class ProductCardsGraphQLQuery {
    constructor({
        graphQLToken = '',
        currencyCode = 'USD',
        restrictToLogin = false,
        showProductRating = false,
        defaultProductImage = '',

        // theme settings & store settings
        card_show_border = false,
        card_show_button = false,
        card_show_qty = false,
        card_show_compare = false,
        card_show_sku = false,
        card_show_brand = false,
        card_custom_fields = '',
        show_product_quick_view = false,
        card_show_swatches = true,
        card_show_countdown = false,
        ajax_add_to_cart = false,
        product_sale_badges = 'label',
        product_sale_label = 'Sale',
        product_custom_badges = true,
        show_rrp = false,
        pdp_retail_price_label = '',
        price_ranges = false,
        pdp_price_label = '',
        pdp_sale_price_label = '',
        pdp_non_sale_price_label = '',
        card_textAlign = 'left',
        // ---

        txtPriceWithoutTax = '',
        txtPriceWithTax = '',
        txtQuickView = 'Quick View',
        txtCompare = 'Compare',
        txtChooseOptions = 'Choose Options',
        txtPreOrder = 'Pre-Order',
        txtAddToCart = 'Add to Cart',
        txtQuantity = 'Quantity',
        txtQuantityDecrease = 'Decrease Quantity of {name}',
        txtQuantityIncrease = 'Increase Quantity of {name}',
        ratingStarHtmlFunc = (isFull = true) => `
            <span class="icon icon--rating${isFull ? 'Full' : 'Empty'}">
                <svg><use href="#icon-star" /></svg>
            </span>
        `,
        customBadgeTemplate = (value) => `
            <div class="sale-flag-side sale-flag-side--custom">
                <span class="sale-text">${value}</span>
            </div>
        `,
        qtyBoxHtmlFunc = (id, min, max, qtyLabel, decLabel, incLabel) => `
            <div class="form-field form-field--increments">
                <div class="form-increment" data-card-quantity-change>
                    <button class="button button--icon" data-action="dec">
                        <span class="is-srOnly">${decLabel}</span>
                        <i class="icon" aria-hidden="true">
                            <svg>
                                <use href="#icon-minus"/>
                            </svg>
                        </i>
                    </button>
                    <input class="form-input form-input--incrementTotal"
                        name="qty_${id}"
                        type="tel"
                        value="${min || 1}"
                        data-quantity-min="${min}"
                        data-quantity-max="${max}"
                        min="${min || 1}"
                        pattern="[0-9]*"
                        aria-label="${qtyLabel}"
                        aria-live="polite">
                    <button class="button button--icon" data-action="inc">
                        <span class="is-srOnly">${incLabel}</span>
                        <i class="icon" aria-hidden="true">
                            <svg>
                                <use href="#icon-add"/>
                            </svg>
                        </i>
                    </button>
                </div>
            </div>
        `,
    } = {}) {
        this.graphQLToken = graphQLToken;
        this.currencyCode = currencyCode;
        this.restrictToLogin = restrictToLogin;
        this.showProductRating = showProductRating;
        this.card_show_border = card_show_border;
        this.card_show_button = card_show_button;
        this.card_show_qty = card_show_qty;
        this.card_show_compare = card_show_compare;
        this.card_show_sku = card_show_sku;
        this.card_show_brand = card_show_brand;
        this.card_custom_fields = card_custom_fields;
        this.show_product_quick_view = show_product_quick_view;
        this.card_show_swatches = card_show_swatches;
        this.card_show_countdown = card_show_countdown;
        this.card_textAlign = card_textAlign;
        this.show_rrp = show_rrp;
        this.price_ranges = price_ranges;
        this.pdp_retail_price_label = pdp_retail_price_label;
        this.pdp_price_label = pdp_price_label;
        this.ajax_add_to_cart = ajax_add_to_cart;
        this.product_sale_badges = product_sale_badges;
        this.product_sale_label = product_sale_label;
        this.product_custom_badges = product_custom_badges;
        this.pdp_sale_price_label = pdp_sale_price_label;
        this.pdp_non_sale_price_label = pdp_non_sale_price_label;
        this.defaultProductImage = defaultProductImage;
        this.txtPriceWithoutTax = txtPriceWithoutTax;
        this.txtPriceWithTax = txtPriceWithTax;
        this.txtQuickView = txtQuickView;
        this.txtCompare = txtCompare;
        this.txtChooseOptions = txtChooseOptions;
        this.txtPreOrder = txtPreOrder;
        this.txtAddToCart = txtAddToCart;
        this.txtQuantity = txtQuantity;
        this.txtQuantityDecrease = txtQuantityDecrease;
        this.txtQuantityIncrease = txtQuantityIncrease;
        this.ratingStarHtmlFunc = ratingStarHtmlFunc;
        this.customBadgeTemplate = customBadgeTemplate;
        this.qtyBoxHtmlFunc = qtyBoxHtmlFunc;
        this.cachedProducts = {};
    }

    formatPrice(pricesObj, currency, tax, show_rrp, retail_price_label, pdp_price_label, pdp_non_sale_price_label, pdp_sale_price_label, price_ranges) {
        const pricesHtml = (prices, incTax = false, abbr = false) => {
            const camel = incTax ? 'withTax' : 'withoutTax';
            const dash = incTax ? 'with-tax' : 'without-tax';
            const abbrHtml = abbr ? `<abbr title="${incTax ? this.txtPriceWithTax : this.txtPriceWithoutTax}">${incTax ? this.txtPriceWithTax : this.txtPriceWithoutTax}</abbr>` : '';
            let html = '';

            //
            // show price range
            //
            if (prices.priceRange.min.value !== prices.priceRange.max.value && price_ranges) {
                // main price range
                html += `
                    <div class="price-section price-section--${camel}">
                        <span class="price-label">${pdp_price_label}</span>
                        <span class="price-now-label" style="display: none;">${pdp_sale_price_label}</span>
                        <span data-product-price-${dash} class="price price--${camel} price--main">${currencyFormat(prices.priceRange.min.value, currency)}  - ${currencyFormat(prices.priceRange.max.value, currency)}</span>
                        ${abbrHtml}
                    </div>
                    ${/* Never display the "non-sales price" if there is a price range to be shown, but we do want the element on the page */ ''}
                    <div class="price-section price-section--${camel} non-sale-price--${camel}" style="display: none;">
                        <span class="price-was-label">${pdp_non_sale_price_label}</span>
                        <span data-product-non-sale-price-${dash} class="price price--non-sale">${currencyFormat(prices.basePrice.value)}</span>
                        ${abbrHtml}
                    </div>`;

                if (show_rrp) {
                    // retail price
                    html += `
                        <div class="price-section price-section--${camel} rrp-price--${camel}" style="display: none;">
                            <span class="price-was-label">${retail_price_label}</span>
                            <span data-product-rrp-price-${dash} class="price price--rrp">${prices.retailPrice ? currencyFormat(prices.retailPrice.value, currency) : ''}</span>
                            ${abbrHtml}
                        </div>`;
                }

                return html;
            }

            //
            // show single price
            //

            const nonSalePrice = prices.basePrice.value !== prices.price.value ? prices.basePrice : null;

            // main price
            html += `
                <div class="price-section price-section--${camel}">
                    <span class="price-label" ${nonSalePrice ? 'style="display: none;"' : ''}>${pdp_price_label}</span>
                    <span class="price-now-label" ${!nonSalePrice ? 'style="display: none;"' : ''}>${pdp_sale_price_label}</span>
                    <span data-product-price-${dash} class="price price--${camel} price--main ${nonSalePrice || prices.retailPrice ? '_hasSale' : ''}">
                        ${currencyFormat(prices.price.value, currency)}
                    </span>
                    ${abbrHtml}
                </div>`;

            // non-sale price
            html += `
                <div class="price-section price-section--${camel} non-sale-price--${camel}" ${!nonSalePrice ? 'style="display: none;"' : ''}>
                    <span class="price-was-label">${pdp_non_sale_price_label}</span>
                    <span data-product-non-sale-price-${dash} class="price price--non-sale">${nonSalePrice ? currencyFormat(nonSalePrice.value, currency) : ''}</span>
                    ${abbrHtml}
                </div>`;

            if (show_rrp) {
                // retail price
                html += `
                    <div class="price-section price-section--${camel} rrp-price--${camel}" ${!prices.retailPrice ? 'style="display: none;"' : ''}>
                        <span class="price-was-label">${retail_price_label}</span>
                        <span data-product-rrp-price-${dash} class="price price--rrp">
                            ${prices.retailPrice ? currencyFormat(prices.retailPrice.value, currency) : ''}
                        </span>
                        ${abbrHtml}
                    </div>`;
            }

            return html;
        };

        if (tax === 'INC') {
            return pricesHtml(pricesObj, true, false);
        } else if (tax === 'EX') {
            return pricesHtml(pricesObj, false, false);
        }

        return `
            ${pricesHtml(pricesObj.priceWithTax, true, true)}
            <div class="_br"></div>
            ${pricesHtml(pricesObj.priceWithoutTax, false, true)}
        `;
    }

    templateCustomFields(arrayCustomFields, card_custom_fields) {
        if (arrayCustomFields.length > 0 && card_custom_fields !== undefined && card_custom_fields !== '' && card_custom_fields !== '*') {
            const arrayCardCustomFields = card_custom_fields.split('|');
            let templateCustomFields = '';
            const arrayFields = arrayCustomFields.map(item => {
                let itemTemplate = '';
                for (let i = 0; i < arrayCardCustomFields.length; i++) {
                    if (item.node.name === arrayCardCustomFields[i]) {
                        itemTemplate = `<div>
                            <span class="card-info-value card-info-value--${(item.node.name).toLowerCase().replace(/\s+/g, '-')}">${item.node.value}</span>
                        </div>`;
                    }
                }
                return itemTemplate;
            });
            arrayFields.forEach(itemArray => {
                if (itemArray !== undefined) {
                    templateCustomFields += itemArray;
                }
            });
            return templateCustomFields;
        } else if (card_custom_fields === '*' && arrayCustomFields.length > 0) {
            let templateCustomFields = '';
            const arrayFields = arrayCustomFields.filter(itemFilter => !(itemFilter.node.name).startsWith('__')).map(item => `<div>
                    <span class="card-info-name card-info-name--${(item.node.name).toLowerCase().replace(/\s+/g, '-')}">${item.node.name}:</span>
                    <span class="card-info-value card-info-value--${(item.node.name).toLowerCase().replace(/\s+/g, '-')}">${item.node.value}</span>
                </div>`);
            arrayFields.forEach(itemArray => {
                templateCustomFields += itemArray;
            });
            return templateCustomFields;
        }
    }

    async load(_productIds) {
        const productIds = _productIds.slice(0, 50);
        const cacheKey = `${this.currencyCode}_${productIds.join(',')}`;

        if (!this.cachedProducts[cacheKey]) {
            this.cachedProducts[cacheKey] = await new Promise(resolve => {
                $.ajax({
                    url: '/graphql',
                    method: 'POST',
                    data: JSON.stringify({
                        query: `
                            query recentlyViewedProducts(
                                $productIds: [Int!]
                                $first: Int
                                $currencyCode: currencyCode!
                            ) {
                                site {
                                    products(entityIds: $productIds, first: $first) {
                                        edges {
                                            node {
                                                entityId
                                                name
                                                sku
                                                path
                                                addToCartUrl
                                                minPurchaseQuantity
                                                maxPurchaseQuantity
                                                pricesWithTax: prices(includeTax: true, currencyCode: $currencyCode) {
                                                    price {
                                                        ...MoneyFields
                                                    }
                                                    basePrice {
                                                        ...MoneyFields
                                                    }
                                                    salePrice {
                                                        ...MoneyFields
                                                    }
                                                    retailPrice {
                                                        ...MoneyFields
                                                    }
                                                    priceRange {
                                                        min {
                                                            ...MoneyFields
                                                        }
                                                        max {
                                                            ...MoneyFields
                                                        }
                                                    }
                                                }
                                                pricesWithoutTax: prices(includeTax: false, currencyCode: $currencyCode) {
                                                    price {
                                                        ...MoneyFields
                                                    }
                                                    basePrice {
                                                        ...MoneyFields
                                                    }
                                                    salePrice {
                                                        ...MoneyFields
                                                    }
                                                    retailPrice {
                                                        ...MoneyFields
                                                    }
                                                    priceRange {
                                                        min {
                                                            ...MoneyFields
                                                        }
                                                        max {
                                                            ...MoneyFields
                                                        }
                                                    }
                                                }
                                                defaultImage {
                                                    ...ImageFields
                                                }
                                                images {
                                                    edges {
                                                      node {
                                                        ...ImageFields
                                                        isDefault
                                                      }
                                                    }
                                                }
                                                brand {
                                                    name
                                                    path
                                                }
                                                reviewSummary {
                                                    averageRating
                                                    numberOfReviews
                                                }
                                                productOptions(first: 1) {
                                                    edges {
                                                        node {
                                                            entityId
                                                        }
                                                    }
                                                }
                                                availabilityV2 {
                                                    status
                                                    ... on ProductUnavailable {
                                                        message
                                                    }
                                                }
                                                inventory {
                                                    isInStock
                                                }
                                                customFields {
                                                    edges {
                                                        node {
                                                            name
                                                            value
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    settings {
                                        tax {
                                            plp
                                        }
                                        inventory {
                                            defaultOutOfStockMessage
                                        }
                                        storefront {
                                            catalog {
                                                productComparisonsEnabled
                                            }
                                        }
                                    }
                                    currency(currencyCode: $currencyCode) {
                                        display {
                                            symbol
                                            symbolPlacement
                                            decimalToken
                                            thousandsToken
                                            decimalPlaces
                                        }
                                    }
                                }
                            }
                            fragment MoneyFields on Money {
                                value
                                currencyCode
                            }
                            fragment ImageFields on Image {
                                url80wide: url(width: 80)
                                url160wide: url(width: 160)
                                url320wide: url(width: 320)
                                url640wide: url(width: 640)
                            }
                        `,
                        variables: {
                            productIds,
                            first: productIds.length,
                            currencyCode: this.currencyCode,
                        },
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.graphQLToken}`,
                    },
                    xhrFields: {
                        withCredentials: true,
                    },
                    success: (resp) => {
                        const currency = {
                            currency_token: resp.data.site.currency.display.symbol,
                            currency_location: String(resp.data.site.currency.display.symbolPlacement).toLowerCase(),
                            decimal_token: resp.data.site.currency.display.decimalToken,
                            decimal_places: resp.data.site.currency.display.decimalPlaces,
                            thousands_token: resp.data.site.currency.display.thousandsToken,
                        };

                        const ratingHtml = (rating) => (!rating ? '' : Array.from(Array(5).keys())
                            .map(i => this.ratingStarHtmlFunc(rating > i))
                            .join(''));

                        const saleBadge = prices => {
                            // return '' if no sale price
                            if (!prices?.salePrice || prices.salePrice.value === prices.basePrice.value) return '';

                            // return 'sale' badge
                            if (this.product_sale_badges === 'label') return this.product_sale_label;

                            // hide salebadge
                            if (this.product_sale_badges === 'hide') return '';

                            // update price discount amount
                            if (this.product_sale_badges === 'price') {
                                let c = 0;

                                if (this.show_rrp && prices.retailPrice) {
                                    if (prices.salePrice) {
                                        c = prices.retailPrice.value - prices.salePrice.value;
                                    } else {
                                        c = prices.retailPrice.value - prices.basePrice.value;
                                    }
                                } else if (prices.salePrice) {
                                    c = prices.basePrice.value - prices.salePrice.value;
                                }

                                const formattedValue = c % 1 === 0 ? currencyFormat(c, { ...currency, decimal_places: 0 }) : currencyFormat(c, currency);

                                if (this.product_sale_label.includes('{percent}')) return c > 0 ? this.product_sale_label.replace('{percent}', formattedValue) : '';

                                const currencyLabel = c > 0 ? `${this.product_sale_label}<span>${formattedValue}</span>` : '';
                                return currencyLabel;
                            }

                            let n = 0;

                            if (this.show_rrp && prices.retailPrice) {
                                if (prices.salePrice) {
                                    n = Math.round((prices.retailPrice.value - prices.salePrice.value) / prices.retailPrice.value * 100);
                                } else {
                                    n = Math.round((prices.retailPrice.value - prices.basePrice.value) / prices.retailPrice.value * 100);
                                }
                            } else if (prices.salePrice) {
                                n = Math.round((prices.basePrice.value - prices.salePrice.value) / prices.basePrice.value * 100);
                            }

                            const percent = n > 0 ? `${n}%` : '';

                            // return 'sale {percent}' badge
                            if (this.product_sale_label.includes('{percent}')) return percent !== '' ? this.product_sale_label.replace('{percent}', percent) : '';

                            // recent 'sale ...%' badge
                            return percent !== '' ? `${this.product_sale_label}<span>${percent}</span>` : '';
                        };

                        const hoverProductImage = images => {
                            try {
                                const image = images.find(img => !img.node.isDefault);
                                return image ? image.node : null;
                            } catch (er) {
                                return null;
                            }
                        };

                        const saleBadgeCustom = (field) => {
                            if (field.length && this.product_custom_badges) {
                                const list = field.filter(item => item.node.name === '__badge');
                                return list.map(i => this.customBadgeTemplate(i.node.value)).join('');
                            }

                            return null;
                        };

                        const productMap = resp.data.site.products.edges.reduce((map, { node }) => {
                            // eslint-disable-next-line no-param-reassign
                            map[node.entityId] = node;
                            return map;
                        }, {});

                        const orderedProducts = productIds
                            .map(id => productMap[id])
                            .filter(Boolean)
                            .map((node, index) => ({
                                index,
                                id: node.entityId,
                                name: node.name,
                                sku: node.sku,
                                url: node.path,
                                minPurchaseQuantity: node.minPurchaseQuantity,
                                maxPurchaseQuantity: node.maxPurchaseQuantity,
                                defaultImage: node.defaultImage,
                                hoverImage: hoverProductImage(node.images.edges),
                                defaultProductImage: this.defaultProductImage,
                                restrictToLogin: this.restrictToLogin,
                                txtPriceWithoutTax: this.txtPriceWithoutTax,
                                txtPriceWithTax: this.txtPriceWithTax,
                                retailPrice: !this.restrictToLogin && node.pricesWithoutTax && node.pricesWithTax ? {
                                    // eslint-disable-next-line no-nested-ternary
                                    value: resp.data.site.settings.tax.plp === 'EX' ? node.pricesWithoutTax.retailPrice : resp.data.site.settings.tax.plp === 'INC' ? node.pricesWithTax.retailPrice : resp.data.site.settings.tax.plp === 'BOTH' ? {
                                        retailPriceWithoutTax: node.pricesWithoutTax.retailPrice,
                                        retailPriceWithTax: node.pricesWithTax.retailPrice,
                                    } : null,
                                } : null,
                                price: !this.restrictToLogin && node.pricesWithoutTax && node.pricesWithTax ? {
                                    // eslint-disable-next-line no-nested-ternary
                                    value: resp.data.site.settings.tax.plp === 'EX' ? {
                                        price: node.pricesWithoutTax.price.value,
                                        price_rrp: node.pricesWithoutTax.retailPrice,
                                    // eslint-disable-next-line no-nested-ternary
                                    } : resp.data.site.settings.tax.plp === 'INC' ? {
                                        price: node.pricesWithTax.price.value,
                                        price_rrp: node.pricesWithTax.retailPrice,
                                    } : resp.data.site.settings.tax.plp === 'BOTH' ? {
                                        priceWithoutTax: node.pricesWithoutTax.price.value,
                                        priceWithTax: node.pricesWithTax.price.value,
                                        price_rrpWithTax: node.pricesWithTax.retailPrice,
                                        price_rrpWithoutTax: node.pricesWithoutTax.retailPrice,
                                    } : null,
                                    // eslint-disable-next-line no-nested-ternary
                                    formatted: this.formatPrice(resp.data.site.settings.tax.plp === 'EX' ? node.pricesWithoutTax : resp.data.site.settings.tax.plp === 'INC' ? node.pricesWithTax : resp.data.site.settings.tax.plp === 'BOTH' ? {
                                        priceWithoutTax: node.pricesWithoutTax,
                                        priceWithTax: node.pricesWithTax,
                                    } : node.pricesWithoutTax, currency, resp.data.site.settings.tax.plp, this.show_rrp, this.pdp_retail_price_label, this.pdp_price_label, this.pdp_non_sale_price_label, this.pdp_sale_price_label, this.price_ranges),
                                } : null,
                                saleBadge: saleBadge(resp.data.site.settings.tax.plp === 'EX' ? node.pricesWithoutTax : node.pricesWithTax),
                                saleBadgeCustom: saleBadgeCustom(node.customFields.edges.length > 0 ? node.customFields.edges : ''),
                                brand: node.brand,
                                customFields: this.templateCustomFields(node.customFields.edges, this.card_custom_fields),
                                ratingHtml: this.showProductRating ? ratingHtml(node.reviewSummary?.averageRating) : '',
                                show_numReviews: this.card_textAlign !== 'center' ? this.card_textAlign : '',
                                numberOfReviews: node.reviewSummary?.numberOfReviews,
                                cardExtraClass: `${this.card_show_border ? '_border' : ''} ${!this.card_show_button ? '_hideBtn' : ''}`,
                                card_show_button: this.card_show_button,
                                card_show_qty: this.card_show_qty,
                                card_show_compare: this.card_show_compare,
                                card_show_sku: this.card_show_sku,
                                card_show_brand: this.card_show_brand,
                                show_product_quick_view: this.show_product_quick_view,
                                card_show_swatches: this.card_show_swatches,
                                card_show_countdown: this.card_show_countdown,
                                ajax_add_to_cart: this.ajax_add_to_cart,
                                product_sale_badges: this.product_sale_badges,
                                product_sale_label: this.product_sale_label,
                                txtQuickView: this.txtQuickView,
                                txtCompare: this.txtCompare,
                                txtChooseOptions: this.txtChooseOptions,
                                txtPreOrder: this.txtPreOrder,
                                txtAddToCart: this.txtAddToCart,
                                txtQuantity: this.txtQuantity,
                                txtQuantityDecrease: this.txtQuantityDecrease.replace('{name}', node.name),
                                txtQuantityIncrease: this.txtQuantityIncrease.replace('{name}', node.name),
                                preOrder: node.availabilityV2.status === 'Preorder',
                                hasOptions: node.availabilityV2.status === 'Available' && node.productOptions.edges.length > 0,
                                preOrderHasOptions: node.availabilityV2.status === 'Preorder' && node.productOptions.edges.length > 0,
                                addToCartUrl: node.availabilityV2.status !== 'Unavailable' && node.productOptions.edges.length === 0 && node.inventory.isInStock ? node.addToCartUrl : '',
                                outOfStockMessage: !node.inventory.isInStock ? resp.data.site.settings.inventory.defaultOutOfStockMessage : '',
                                qtyBoxHtml: this.card_show_qty ? this.qtyBoxHtmlFunc(node.entityId, node.minPurchaseQuantity, node.maxPurchaseQuantity, this.txtQuantity, this.txtQuantityDecrease, this.txtQuantityIncrease) : '',
                                show_compare: this.card_show_compare,
                                callForPrice: node.availabilityV2.message,
                                taxDisplay: resp.data.site.settings.tax.plp,
                            }));
                        resolve(orderedProducts);
                    },
                    error: () => {
                        resolve('');
                    },
                });
            });
        }

        return this.cachedProducts[cacheKey];
    }
}

export const productCardTemplate = `
    <article class="card {{cardExtraClass}}"
        data-event-type="list"
        data-entity-id="{{id}}"
        data-position="{{index}}"
        data-name="{{name}}"
        data-product-price="{{price.value.priceWithoutTax}}{{price.value.price}}">
        <div class="card-wrapper-figure">
            <figure class="card-figure">
                {{#saleBadge}}
                    <div class="sale-flag-side {{#product_sale_badges}}_percent{{/product_sale_badges}}">
                        <span class="sale-text">{{&saleBadge}}</span>
                        {{#card_show_countdown}}
                            <span class="card-countdown"></span>
                        {{/card_show_countdown}}
                    </div>
                {{/saleBadge}}
                {{&saleBadgeCustom}}
                <a class="card-img-container" href="{{url}}">
                    <img
                        {{#defaultImage}}
                            src="{{url320wide}}"
                            srcset="{{url80wide}} 80w, {{url160wide}} 160w, {{url320wide}} 320w, {{url640wide}} 640w"
                        {{/defaultImage}}
                        {{^defaultImage}}
                            src="{{defaultProductImage}}"
                        {{/defaultImage}}
                        data-sizes="auto"
                        class="card-image lazyload"
                        alt="{{name}}"
                        title="{{name}}">
                    {{#hoverImage}}
                        <img
                            src="{{url320wide}}"
                            srcset="{{url80wide}} 80w, {{url160wide}} 160w, {{url320wide}} 320w, {{url640wide}} 640w"
                            data-sizes="auto"
                            class="card-image lazyload"
                            alt="{{name}}"
                            title="{{name}}">
                    {{/hoverImage}}
                </a>
                {{^card_show_button}}
                    <div class="card-figure--button">
                        {{^restrictToLogin}}
                            {{#hasOptions}}
                                <div class="_qtyAdd">
                                    {{&qtyBoxHtml}}
                                    <a href="{{url}}" target="_blank" title="{{txtChooseOptions}}" data-event-type="product-click" class="button button--primary card-figcaption-button{{#show_product_quick_view}}{{#ajax_add_to_cart}} quickview-alt{{/ajax_add_to_cart}}{{/show_product_quick_view}}" data-product-id="{{id}}">
                                        <span>{{txtChooseOptions}}</span>
                                        <i>
                                            <svg class="icon"><use href="#icon-cart-add"></use></svg>
                                        </i>
                                    </a>
                                </div>
                            {{/hasOptions}}
                            {{#preOrder}}
                                <div class="_qtyAdd">
                                    {{&qtyBoxHtml}}
                                    <a href="{{url}}" title="{{txtPreOrder}}" data-event-type="product-click" class="button button--primary card-figcaption-button">
                                        <span>{{txtPreOrder}}</span>
                                        <i>
                                            <svg class="icon"><use href="#icon-cart-add"></use></svg>
                                        </i>
                                    </a>
                                </div>
                            {{/preOrder}}
                            {{#addToCartUrl}}
                                <div class="_qtyAdd">
                                    {{&qtyBoxHtml}}
                                    <a href="{{addToCartUrl}}" title="{{txtAddToCart}}"{{^ajax_add_to_cart}} data-event-type="product-click"{{/ajax_add_to_cart}} class="button button--primary card-figcaption-button"{{#ajax_add_to_cart}} data-papathemes-cart-item-add{{/ajax_add_to_cart}}>
                                        <span>{{txtAddToCart}}</span>
                                        <i>
                                            <svg class="icon"><use href="#icon-cart-add"></use></svg>
                                        </i>
                                    </a>
                                </div>
                            {{/addToCartUrl}}
                            {{#outOfStockMessage}}
                                <a href="{{url}}" data-event-type="product-click" class="button button--outstock card-figcaption-button" data-product-id="{{id}}">
                                    <span>{{outOfStockMessage}}</span>
                                </a>
                            {{/outOfStockMessage}}
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
                        {{/restrictToLogin}}
                    </div>
                {{/card_show_button}}
            </figure>
        </div>
        <div class="card-body">
            <div class="card-badges">
                {{#saleBadge}}
                    <div class="sale-flag-side {{#product_sale_badges}}_percent{{/product_sale_badges}}">
                        <span class="sale-text">{{&saleBadge}}</span>
                        {{#card_show_countdown}}
                            <span class="card-countdown"></span>
                        {{/card_show_countdown}}
                    </div>
                {{/saleBadge}}
            </div>
            <h3 class="card-title">
                <a href="{{url}}" data-event-type="product-click">{{name}}</a>
            </h3>
            {{#ratingHtml}}
                <p class="card-text card-text--rating" data-test-info-type="productRating">
                    <span class="rating--small">
                        {{&ratingHtml}}
                    </span>
                    {{#show_numReviews}}
                        <span class="rating--number">({{&numberOfReviews}})</span>
                    {{/show_numReviews}}
                </p>
            {{/ratingHtml}}
            {{#card_show_sku}}
                {{#sku}}
                    <div class="card-text card-text--sku" data-test-info-type="sku">
                        {{sku}}
                    </div>
                {{/sku}}
            {{/card_show_sku}}
            {{#card_show_brand}}
                {{#brand}}
                    <div class="card-text card-text--brand" data-test-info-type="brandName">
                        <a href="{{brand.path}}" alt="{{brand.name}}">{{brand.name}}</a>
                    </div>
                {{/brand}}
            {{/card_show_brand}}
            {{#customFields}}
                <div class="card-text card-text--info">
                    {{&customFields}}
                </div>
            {{/customFields}}
            {{#card_show_swatches}}
                <div class="card-text card-text--colorswatches"></div>
            {{/card_show_swatches}}
            {{#callForPrice}}
                <div class="card-text--price">
                    <span class="price--call">{{&callForPrice}}</span>
                </div>
            {{/callForPrice}}
            {{#price}}
                <div class="card-text--price card-text">
                    {{&price.formatted}}
                </div>
            {{/price}}

            {{&cardBodyBottomHtml}}
        </div>
        <div class="card-footer{{#card_show_button}} _show{{/card_show_button}}">
            <div class="card-buttons">
                {{^restrictToLogin}}
                    {{#hasOptions}}
                        <div class="_qtyAdd">
                            {{&qtyBoxHtml}}
                            <a href="{{url}}" target="_blank" title="{{txtChooseOptions}}" data-event-type="product-click" class="button button--primary card-figcaption-button{{#show_product_quick_view}}{{#ajax_add_to_cart}} quickview-alt{{/ajax_add_to_cart}}{{/show_product_quick_view}}" data-product-id="{{id}}">
                                <span>{{txtChooseOptions}}</span>
                                <i>
                                    <svg class="icon"><use href="#icon-cart-add"></use></svg>
                                </i>
                            </a>
                        </div>
                    {{/hasOptions}}
                    {{#preOrder}}
                        <div class="_qtyAdd">
                            {{&qtyBoxHtml}}
                            <a href="{{url}}" title="{{txtPreOrder}}" data-event-type="product-click" class="button button--primary card-figcaption-button">
                                <span>{{txtPreOrder}}</span>
                                <i>
                                    <svg class="icon"><use href="#icon-cart-add"></use></svg>
                                </i>
                            </a>
                        </div>
                    {{/preOrder}}
                    {{#addToCartUrl}}
                        <div class="_qtyAdd">
                            {{&qtyBoxHtml}}
                            <a href="{{addToCartUrl}}" title="{{txtAddToCart}}"{{^ajax_add_to_cart}} data-event-type="product-click"{{/ajax_add_to_cart}} class="button button--primary card-figcaption-button"{{#ajax_add_to_cart}} data-papathemes-cart-item-add{{/ajax_add_to_cart}}>
                                <span>{{txtAddToCart}}</span>
                                <i>
                                    <svg class="icon"><use href="#icon-cart-add"></use></svg>
                                </i>
                            </a>
                        </div>
                    {{/addToCartUrl}}
                    {{#outOfStockMessage}}
                        <a href="{{url}}" data-event-type="product-click" class="button button--outstock card-figcaption-button" data-product-id="{{id}}">
                            <span>{{outOfStockMessage}}</span>
                        </a>
                    {{/outOfStockMessage}}
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
                {{/restrictToLogin}}
            </div>
        </div>
    </article>
`;

export function parseJSON(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

export function fixFormElementUniqueIds($scope, ignoreIds = [
    'form-action-addToCart',
    'form-action-addToCart2',
    'form-action-addToCartLater',
    'form-action-addToCartSticky',
    'CartEditProductFieldsForm',
    'modal-review-form',
]) {
    const renameUnique = (el, separator = '', suffix = '') => {
        if (ignoreIds.includes(el.id) || $(el).attr('data-ignore-unique-id')) {
            return;
        }

        if ($(`[id="${el.id}${separator}${suffix}"]`).length > 1) {
            renameUnique(el, '-', suffix ? suffix + 1 : 1);
        } else if (suffix) {
            const id = el.id;
            // eslint-disable-next-line no-param-reassign
            el.id = `${el.id}${separator}${suffix}`;
            $scope.find(`[for="${id}"]`).attr('for', el.id);
            $scope.find(`[data-toggle="${id}"]`).attr('data-toggle', el.id);
            $scope.find(`[aria-controls="${id}"]`).attr('aria-controls', el.id);
            $scope.find(`[aria-labelledby="${id}"]`).attr('aria-labelledby', el.id);
        }
    };

    $scope.find('[id]').each((_i, el) => renameUnique(el));
}

export default {};
