/**
 * Add remove item button on Mini Cart Popup
 *
 * Copyright 2018 papathemes.com
 */

import $ from 'jquery';
import utils from '@bigcommerce/stencil-utils';
import { initCartPopup } from './utils'; // mooncart: full functionality cart popup

const loadingClass = 'is-loading';

function cartPreviewDropdown() {
    return $('#cart-preview-dropdown');
}

function showLoading() {
    const $cartDropdown = cartPreviewDropdown();
    const $cartLoading = $('<div class="loadingOverlay"></div>');

    if ($cartDropdown.hasClass(loadingClass)) {
        return;
    }

    $cartDropdown
        .addClass(loadingClass)
        .html($cartLoading);
    $cartLoading
        .show();
}

function refreshContent() {
    showLoading();

    utils.api.cart.getContent({ template: 'common/cart-preview' }, (err, response) => {
        const $cartDropdown = cartPreviewDropdown();

        $cartDropdown
            .removeClass(loadingClass)
            .html(response);

        // mooncart: full functionality cart popup
        initCartPopup($cartDropdown.data('context'), $cartDropdown);

        // mooncat: init slick slider inside
        $cartDropdown.find('[data-slick]').not('.slick-initialized').slick();

        const quantity = $('[data-cart-quantity]', $cartDropdown).data('cart-quantity') || 0;
        const price = $('[data-cart-price]', $cartDropdown).data('cart-price') || 0;
        const priceFormatted = $('[data-cart-formatted]', $cartDropdown).data('cart-formatted') || '';
        const coupons = $('[data-cart-coupons]', $cartDropdown).data('cart-coupons') || '';
        if (price === 0) {
            $('body').trigger('cart-quantity-update', quantity);
        } else {
            $('body').trigger('cart-quantity-update', [quantity, priceFormatted, coupons]);
        }
        $('body').trigger('cartpreviewshown', [$cartDropdown]); // papathemes-mooncat
    });
}

function cartRemoveItem(itemId) {
    showLoading();

    utils.api.cart.itemRemove(itemId, (err, response) => {
        if (response.data.status === 'succeed') {
            refreshContent(true);
        } else {
            alert(response.data.errors.join('\n'));
        }
    });
}

export default function () {
    cartPreviewDropdown()
        .attr('aria-autoclose', 'false') // prevent close popup when click on inside
        .on('click', '[data-cart-remove]', (event) => {
            const itemId = $(event.currentTarget).data('cart-itemid');
            const openTime = new Date();
            // const result = confirm($(event.currentTarget).data('confirm-delete'));
            const result = true;
            const delta = new Date() - openTime;

            event.preventDefault();
            event.stopPropagation();

            // Delta workaround for Chrome's "prevent popup"
            if (!result && delta > 10) {
                return;
            }

            // remove item from cart
            cartRemoveItem(itemId);
        });
}
