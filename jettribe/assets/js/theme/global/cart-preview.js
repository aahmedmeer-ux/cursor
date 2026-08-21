import 'foundation-sites/js/foundation/foundation';
import 'foundation-sites/js/foundation/foundation.dropdown';
import utils from '@bigcommerce/stencil-utils';
import { inert, isADA, initCartPopup } from '../../papathemes/utils';
import { loadPromoTicket } from '../../dinosaur/coupon';
import { delay } from 'lodash';

export const CartPreviewEvents = {
    close: 'closed.fndtn.dropdown',
    open: 'opened.fndtn.dropdown',
};

export default function (secureBaseUrl, cartId, context) {
    const loadingClass = 'is-loading';
    const $cart = $('[data-cart-preview]');
    const $cartDropdown = $('#cart-preview-dropdown');
    const $cartLoading = $('<div class="loadingOverlay"></div>');
    const $labelPrice = $('[data-cart-preview-price]');
    const $singleItem = $('._single-item', '[data-cart-preview]');
    const $pluralItem = $('._plural-item', '[data-cart-preview]');

    const $body = $('body');

    if (window.ApplePaySession) {
        $cartDropdown.addClass('apple-pay-supported');
    }

    $body.on('cart-quantity-update', (event, quantity, price, coupons) => {
        $('.cart-quantity')
            .text(quantity)
            .toggleClass('countPill--positive', quantity && quantity > 0);
        $labelPrice.text(price).toggleClass('price--positive', !!price);
        if (!quantity) {
            $('._total-cart', $cart).addClass('_hideInfoCart');
        } else {
            $('._total-cart', $cart).removeClass('_hideInfoCart');
        }
        if (!coupons) {
            localStorage.removeItem('COUPON_CODE');
        } else {
            localStorage.setItem('COUPON_CODE', JSON.stringify(coupons));
        }

        if (utils.tools.storage.localStorageAvailable()) {
            localStorage.setItem('cart-quantity', quantity);
            localStorage.setItem('cart-price', price);
        }
        if (quantity > 1) {
            $singleItem.hide();
            $pluralItem.show();
        } else {
            $pluralItem.hide();
            $singleItem.show();
        }
    });

    $cart.on('click', event => {
        const options = {
            template: 'common/cart-preview',
        };

        // Redirect to full cart page
        //
        // https://developer.mozilla.org/en-US/docs/Browser_detection_using_the_user_agent
        // In summary, we recommend looking for the string 'Mobi' anywhere in the User Agent to detect a mobile device.

        // mooncat: comment out to display cart preview popup on mobile
        // if (/Mobi/i.test(navigator.userAgent)) {
        //     return event.stopPropagation();
        // }

        event.preventDefault();

        // mooncat: stop if cart the click event is closing the cart popup
        if ($cart.hasClass('is-open')) return;

        $cartDropdown
            .html($cartLoading)
            .addClass(loadingClass);
        $cartLoading
            .show();

        utils.api.cart.getContent(options, (err, response) => {
            delay(() => {
                $cartDropdown
                    .removeClass(loadingClass)
                    .html(response);
                $cartLoading
                    .hide();

                delay(() => {
                    $cartDropdown.find('[data-toggle="cart-preview-dropdown"]').get(0).focus();
                }, 200);
                // mooncart: full functionality cart popup
                initCartPopup(context, $cartDropdown);

                $('body').trigger('cartpreviewshown', [$cartDropdown]); // papathemes-mooncat
            }, 250);
        });
    });

    // papathemes-inhealth: close cart preview popup when click outside the cart preview popup or other modal
    $body.on('click', event => {
        if ($cartDropdown.is('.is-open') && $(event.target).closest('[data-cart-preview], #cart-preview-dropdown, [data-reveal]').length === 0) {
            $cartDropdown.find('[data-toggle="cart-preview-dropdown"]').first().trigger('click');
        }
    });

    // papathemes-inhealth {{{
    $cartDropdown.on('open.toggle', (event, $toggle) => {
        $('body').addClass('has-previewCartOpened');
        $cartDropdown.data('lastToggle', $toggle);
        // Accessibility - Make other elements not focusable
        if (isADA()) {
            delay(() => {
                inert($cartDropdown);
            }, 250);
        }
    });

    $cartDropdown.on('close.toggle', () => {
        $('body').removeClass('has-previewCartOpened');
        // Accessibility - Make other elements not focusable
        const $toggle = $cartDropdown.data('lastToggle');
        $cartDropdown.data('lastToggle', null);
        delay(() => {
            loadPromoTicket();
            $cartDropdown.html('');
            inert($cartDropdown, false);
            if ($toggle) {
                $toggle.get(0).focus();
            }
        }, 250);
    });
    // }}}

    let quantity = 0;
    let price = 0;
    let coupons = '';

    if (cartId) {
        // Get existing quantity from localStorage if found
        if (utils.tools.storage.localStorageAvailable()) {
            if (localStorage.getItem('cart-quantity')) {
                quantity = Number(localStorage.getItem('cart-quantity'));
                price = localStorage.getItem('cart-price');
                try {
                    coupons = JSON.parse(localStorage.getItem('COUPON_CODE'));
                } catch (error) {
                    coupons = null;
                }
                $body.trigger('cart-quantity-update', [quantity, price, coupons]);
            }
        }

        // Get updated cart quantity from the Cart API
        const cartQtyPromise = new Promise((resolve) => {
            utils.api.cart.getContent({ baseUrl: secureBaseUrl, cartId, template: 'common/cart-preview' }, (err, response) => {
                let qty = 0;
                let cartPrice = '';
                if (err) {
                    // If this appears to be a 404 for the cart ID, set cart quantity to 0
                    resolve([qty, cartPrice, coupons]);
                }
                qty = $('[data-cart-quantity]', response).data('cart-quantity');
                cartPrice = $('[data-cart-formatted]', response).data('cart-formatted');
                coupons = $('[data-cart-coupons]', response).data('cart-coupons');
                resolve([qty, cartPrice, coupons]);
            });
        });

        // If the Cart API gives us a different quantity number, update it
        cartQtyPromise.then(([qty, cartPrice = '', cartCoupons = '']) => {
            quantity = qty;
            price = cartPrice;
            coupons = cartCoupons;
            $body.trigger('cart-quantity-update', [quantity, price, coupons]);
        });
    } else {
        $body.trigger('cart-quantity-update', quantity);
    }
}
