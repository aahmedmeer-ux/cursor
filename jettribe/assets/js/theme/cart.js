import PageManager from '../page-manager';
import { bind, debounce } from 'lodash';
import checkIsGiftCertValid from './common/gift-certificate-validator';
import { createTranslationDictionary } from './common/utils/translations-utils';
import utils from '@bigcommerce/stencil-utils';
import ShippingEstimator from './cart/shipping-estimator';
import { defaultModal, showAlertModal } from './global/modal';
import CartItemDetails from './common/cart-item-details';
import swal from './global/sweet-alert';
import { actionPromoTicket, loadPromoTicket } from '../dinosaur/coupon';
// papathemes-kitchenary
const serial = funcs => funcs.reduce((promise, func) => promise.then(result => func().then(Array.prototype.concat.bind(result))), Promise.resolve([]));
export default class Cart extends PageManager {
    /**
     * Inherited classes can set this to true to display widget regions when cart displayed via ajax
     * @type {boolean}
     */
    shouldLoadCartRegions = false;

    onReady() {
        // mooncat
        this.onCartUpdate = this.onCartUpdate.bind(this);

        this.$modal = null;
        this.$cartPageContent = $('[data-cart]');
        this.$cartContent = $('[data-cart-content]');
        this.$cartMessages = $('[data-cart-status]');
        this.$cartTotals = $('[data-cart-totals]');
        this.$cartAdditionalCheckoutBtns = $('[data-cart-additional-checkout-buttons]');
        this.$overlay = $('[data-cart] .loadingOverlay')
            .hide(); // TODO: temporary until roper pulls in his cart components
        this.$activeCartItemId = null;
        this.$activeCartItemBtnAction = null;

        // mooncat
        this.template = {
            content: 'cart/content',
            totals: 'cart/totals',
            pageTitle: 'cart/page-title',
            statusMessages: 'cart/status-messages',
            additionalCheckoutButtons: 'cart/additional-checkout-buttons',
            emptyTemplate: 'cart/empty',
        };

        this.setApplePaySupport();
        this.bindEvents();
    }

    initEditOptions($scope) {
        $('[data-cart-item-action]', $scope).on('click keypress', e => {
            if (e.type === 'keypress') {
                const keyCode = e.keyCode || e.which;
                if (keyCode !== 13 && keyCode !== 32) {
                    return;
                }
            }
            e.preventDefault();
            const $e = $(e.currentTarget);
            const $options = $e.parent().find('[data-cart-item-dropdown]');
            $('[data-cart-item-dropdown].is-open', $scope).not($options).removeClass('is-open');
            $options.toggleClass('is-open');
        });

        const onOptionClick = (event) => {
            const $target = $(event.target);
            if (!$target.closest('[data-cart-item-action]').length) {
                $('[data-cart-item-dropdown]', $scope).removeClass('is-open');
            }
        };

        $(document).off('click', onOptionClick).on('click', onOptionClick);
    }

    // papathemes-dinoaur
    bindWishlistEvents(wishList) {
        const $loadingOverlay = $('.loadingOverlay');
        const hasWishList = wishList && wishList.length > 0;
        $('[data-cart-save]', this.$cartContent).on('click', async event => {
            const $target = $(event.currentTarget);
            $loadingOverlay.show();
            const product_id = $target.data('productId');
            if (hasWishList) {
                const { name: wishListName, entityId: wishListId } = wishList[0] || {};
                await utils.api.wishlist.itemAdd(wishListId, product_id, {}, () => {});
                const itemId = $target.closest('[data-cart-item-dropdown]').find('[data-cart-remove]').data('cartItemid');
                const cartRemoveItem = bind(debounce((_itemId, _wishListName) => {
                    this.cartRemoveItem(_itemId, _wishListName);
                }, 400), this);
                await cartRemoveItem(itemId, wishListName);
                $loadingOverlay.hide();
            } else {
                const url = `/wishlist.php?action=addwishlist&product_id=${product_id}`;
                window.location.href = url;
            }
        });

        $('[data-cart-save-later]', this.$cartContent).on('click', async event => {
            event.preventDefault();
            const productIds = [];
            $('[data-item-row], [data-previewCart-item]', this.$cartContent).each((_i, e) => {
                const $e = $(e);
                const isChecked = $e.find('[data-cart-item-checkbox]').is(':checked');
                if (isChecked) {
                    const productId = $e.find('[data-product-id]').data('productId');
                    productIds.push(productId);
                }
            });
            const itemIds = this.$cartContent.find('[data-cart-item-checkbox]').filter(':checked').get().map(el => $(el).val());

            if (hasWishList) {
                const { name: wishListName, entityId: wishListId } = wishList[0] || {};
                productIds.forEach(async (productId, index) => {
                    if (index === 0) {
                        $loadingOverlay.show();
                    }
                    await utils.api.wishlist.itemAdd(wishListId, productId, {}, () => {});
                });
                const funcs = itemIds.map(itemId => () => new Promise((resolve) => {
                    utils.api.cart.itemRemove(itemId, () => {
                        resolve();
                    });
                }));
                serial(funcs).then(() => {
                    this.refreshContent(true, wishListName);
                });
            } else {
                const url = '/wishlist.php?action=addwishlist';
                window.location.href = url;
            }
        });
    }

    // papathemes-dinoaur
    initCartRegions(cartRegions) {
        if (cartRegions.length === 0) return;

        cartRegions.forEach(({ name, html }) => {
            this.$cartPageContent.find(`[data-content-region="${name}"]`).html(html);
        });

        // re-bind coupon widget events when the region is updated
        this.bindPromoCodeTicket();
    }

    fetchGraphQL() {
        const queryName = this.shouldLoadCartRegions ? 'customerWishlistsAndCartRegions' : 'customerWishlists';
        const cartRegionsFragment = this.shouldLoadCartRegions ? `
            site {
                content {
                    renderedRegionsByPageType(pageType: CART) {
                        regions {
                            name
                            html
                        }
                    }
                }
            }` : '';

        return $.ajax({
            url: '/graphql',
            method: 'POST',
            data: JSON.stringify({
                query: `
                    query ${queryName} {
                        ${cartRegionsFragment}
                        customer {
                            wishlists(first: 10) {
                                edges {
                                    node {
                                        name
                                        entityId
                                        items {
                                            edges {
                                                node {
                                                    variantEntityId
                                                    productEntityId
                                                    entityId
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
            }),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.context.graphQLToken}`,
            },
            xhrFields: {
                withCredentials: true,
            },
        });
    }

    setApplePaySupport() {
        if (window.ApplePaySession) {
            this.$cartPageContent.addClass('apple-pay-supported');
        }
    }

    cartUpdate($target) {
        const itemId = $target.data('cartItemid');
        this.$activeCartItemId = itemId;
        this.$activeCartItemBtnAction = $target.data('action');

        const $el = this.$cartPageContent.find(`input[name="qty-${itemId}"]`); // mooncat edited
        const oldQty = parseInt($el.val(), 10);
        const maxQty = parseInt($el.data('quantityMax'), 10);
        const minQty = parseInt($el.data('quantityMin'), 10);
        const minError = $el.data('quantityMinError');
        const maxError = $el.data('quantityMaxError');
        const newQty = $target.data('action') === 'inc' ? oldQty + 1 : oldQty - 1;
        // Does not quality for min/max quantity
        if (newQty < minQty) {
            return showAlertModal(minError);
        } else if (maxQty > 0 && newQty > maxQty) {
            return showAlertModal(maxError);
        }

        this.$overlay.show();

        utils.api.cart.itemUpdate(itemId, newQty, (err, response) => {
            this.$overlay.hide();

            if (response.data.status === 'succeed') {
                // if the quantity is changed "1" from "0", we have to remove the row.
                const remove = (newQty === 0);

                this.refreshContent(remove);
            } else {
                $el.val(oldQty);
                showAlertModal(response.data.errors.join('\n'));
            }
        });
    }

    cartUpdateQtyTextChange($target, preVal = null) {
        const itemId = $target.data('cartItemid');
        const $el = this.$cartPageContent.find(`input[name="qty-${itemId}"]`); // mooncat edited
        const maxQty = parseInt($el.data('quantityMax'), 10);
        const minQty = parseInt($el.data('quantityMin'), 10);
        const oldQty = preVal !== null ? preVal : minQty;
        const minError = $el.data('quantityMinError');
        const maxError = $el.data('quantityMaxError');
        const newQty = parseInt(Number($el.val()), 10);
        let invalidEntry;

        // Does not quality for min/max quantity
        if (!Number.isInteger(newQty)) {
            invalidEntry = $el.val();
            $el.val(oldQty);
            return showAlertModal(this.context.invalidEntryMessage.replace('[ENTRY]', invalidEntry));
        } else if (newQty < minQty) {
            $el.val(oldQty);
            return showAlertModal(minError);
        } else if (maxQty > 0 && newQty > maxQty) {
            $el.val(oldQty);
            return showAlertModal(maxError);
        }

        this.$overlay.show();
        utils.api.cart.itemUpdate(itemId, newQty, (err, response) => {
            this.$overlay.hide();

            if (response.data.status === 'succeed') {
                // if the quantity is changed "1" from "0", we have to remove the row.
                const remove = (newQty === 0);

                this.refreshContent(remove);
            } else {
                $el.val(oldQty);

                return showAlertModal(response.data.errors.join('\n'));
            }
        });
    }

    cartRemoveItem(itemId, wishListName = null) {
        this.$overlay.show();
        utils.api.cart.itemRemove(itemId, (err, response) => {
            if (response.data.status === 'succeed') {
                this.refreshContent(true, wishListName);
            } else {
                this.$overlay.hide();
                showAlertModal(response.data.errors.join('\n'));
            }
        });
    }

    cartEditOptions(itemId, productId) {
        const context = { productForChangeId: productId, ...this.context };
        const modal = defaultModal();

        if (!this.$modal) {
            this.$modal = $('#modal');
        }

        const options = {
            template: 'cart/modals/configure-product',
        };

        modal.open();
        this.$modal.find('.modal-content').addClass('hide-content');

        utils.api.productAttributes.configureInCart(itemId, options, (err, response) => {
            modal.updateContent(response.content);

            const modalForm = this.$modal.find('form');
            const refreshContent = () => this.refreshContent();
            async function onSubmit(event) {
                event.preventDefault();
                utils.api.cart.postFormData(new FormData(this), () => {
                    modal.close();
                    refreshContent();
                });
            }
            modalForm.on('submit', onSubmit);

            this.productDetails = new CartItemDetails(this.$modal, context);

            this.bindGiftWrappingForm();
        });

        utils.hooks.on('product-option-change', (event, currentTarget) => {
            const $changedOption = $(currentTarget); // papathemes-supermarket fix Cornerstone bug
            const $form = $(currentTarget).find('form');
            const $submit = $('input.button', $form);
            const $messageBox = $('.alertMessageBox');

            // Supermarket: display selected swatch title
            if ($changedOption.data('productAttributeLabel')) {
                $changedOption
                    .closest('[data-product-attribute]')
                    .find('[data-option-value]')
                    .html($changedOption.data('productAttributeLabel'));
            }

            utils.api.productAttributes.optionChange(productId, $form.serialize(), (err, result) => {
                const data = result.data || {};

                if (err) {
                    showAlertModal(err);
                    return false;
                }

                if (data.purchasing_message) {
                    $('.alertBox-message', $messageBox).text(data.purchasing_message);
                    $submit.prop('disabled', true);
                    $messageBox.show();
                } else {
                    $submit.prop('disabled', false);
                    $messageBox.hide();
                }

                if (!data.purchasable || !data.instock) {
                    $submit.prop('disabled', true);
                } else {
                    $submit.prop('disabled', false);
                }
            });
        });
    }

    refreshContent(remove, wishListName = null) {
        // const $cartItemsRows = $('[data-item-row]', this.$cartContent);
        const $cartPageTitle = this.$cartPageContent.find('[data-cart-page-title]');
        // mooncat edited
        const options = {
            template: this.template,
        };

        this.$overlay.show();

        // Remove last item from cart? Reload
        // if (remove && $cartItemsRows.length === 1) {
        //     return window.location.reload();
        // }

        utils.api.cart.getContent(options, (err, response) => {
            this.$cartContent.html(response.content);
            this.$cartTotals.html(response.totals);
            this.$cartMessages.html(response.statusMessages);
            // Status wishlist
            if (wishListName) {
                // Create wishlist message
                const wishlistMessage = `
                    <div class="alertBox alertBox--info">
                        <div class="alertBox-column alertBox-message">
                            <i class="icon statusMsg-icon"><svg><use href="#icon-star-sharp" /></svg></i>
                            ${this.context.txtSavedWishlist.replace('%WISHLIST%', wishListName)}
                        </div>
                    </div>
                `;
                // Append wishlist message to statusMessages
                const $statusElements = this.$cartMessages.find('[data-cart-status-message]');
                if ($statusElements.length) {
                    $statusElements.append(wishlistMessage);
                } else {
                    this.$cartMessages.append(`<div class="cart-status" data-cart-status-message>${wishlistMessage}</div>`);
                }
            }

            this.$cartAdditionalCheckoutBtns.html(response.additionalCheckoutButtons);

            $cartPageTitle.replaceWith(response.pageTitle);

            const quantity = $('[data-cart-quantity]', this.$cartContent).data('cartQuantity') || 0;

            if (!quantity) {
                const $cart = this.$cartContent.closest('[data-cart-container-wrapper]');
                $cart.html(response.emptyTemplate);
                this.$cartContent.html(response.emptyTemplate);
                // return window.location.reload();
            }

            this.bindEvents();
            this.$overlay.hide();

            const price = $('[data-cart-price]', this.$cartContent).data('cart-price') || 0;
            const priceFormatted = $('[data-cart-formatted]', this.$cartContent).data('cart-formatted') || '';
            const coupons = $('[data-cart-coupons]', this.$cartContent).data('cart-coupons') || '';
            $('.previewCartAction ._quantity').text(quantity);
            $('.previewCartAction ._price').text(priceFormatted);
            if (price === 0) {
                $('body').trigger('cart-quantity-update', quantity);
            } else {
                $('body').trigger('cart-quantity-update', [quantity, priceFormatted, coupons]);
            }

            loadPromoTicket(this.$cartPageContent);
        });
    }

    bindCartEvents() {
        const debounceTimeout = 400;
        const cartUpdate = bind(debounce(this.cartUpdate, debounceTimeout), this);
        const cartUpdateQtyTextChange = bind(debounce(this.cartUpdateQtyTextChange, debounceTimeout), this);
        const cartRemoveItem = bind(debounce(this.cartRemoveItem, debounceTimeout), this);
        let preVal;

        // cart update
        $('[data-cart-update]', this.$cartContent).on('click', event => {
            const $target = $(event.currentTarget);

            event.preventDefault();

            // update cart quantity
            cartUpdate($target);
        });

        // cart qty manually updates
        $('.cart-item-qty-input', this.$cartContent).on('focus', function onQtyFocus() {
            preVal = this.value;
        }).change(event => {
            const $target = $(event.currentTarget);
            event.preventDefault();

            // update cart quantity
            cartUpdateQtyTextChange($target, preVal);
        });

        $('.cart-remove', this.$cartContent).on('click', event => {
            const itemId = $(event.currentTarget).data('cartItemid');
            const string = $(event.currentTarget).data('confirmDelete');
            swal.fire({
                text: string,
                icon: 'warning',
                showCancelButton: true,
                cancelButtonText: this.context.cancelButtonText,
            }).then((result) => {
                if (result.value) {
                    // remove item from cart
                    cartRemoveItem(itemId);
                }
            });
            event.preventDefault();
        });

        $('[data-item-edit]', this.$cartContent).on('click', event => {
            const itemId = $(event.currentTarget).data('itemEdit');
            const productId = $(event.currentTarget).data('productId');
            event.preventDefault();
            // edit item in cart
            this.cartEditOptions(itemId, productId);
        });
        // }}}

        // papathemes-kitchenary {{{
        // Select and remove item cart checked
        const $delete = this.$cartContent.find('[data-cart-delete]').on('click', event => {
            event.preventDefault();
            $delete.prop('disabled', true);
            this.$overlay.show();
            const itemIds = this.$cartContent.find('[data-cart-item-checkbox]').filter(':checked').get().map(el => $(el).val());
            const funcs = itemIds.map(itemId => () => new Promise((resolve) => {
                utils.api.cart.itemRemove(itemId, () => {
                    resolve();
                });
            }));
            serial(funcs).then(() => {
                this.refreshContent(true);
            });
        });

        const $select = this.$cartContent.find('[data-cart-select]').on('change', () => {
            if ($select.is(':checked')) {
                $('[data-cart-item-checkbox]', this.$cartContent).prop('checked', true).trigger('change');
            } else {
                $('[data-cart-item-checkbox]', this.$cartContent).prop('checked', false).trigger('change');
            }
        });

        const $save = this.$cartContent.find('[data-cart-save-later]');

        $('[data-cart-item-checkbox]', this.$cartContent).on('change', () => {
            if (this.$cartContent.find('[data-cart-item-checkbox]').filter(':checked').length > 0) {
                $delete.prop('disabled', false);
                $save.prop('disabled', false);
            } else {
                $delete.prop('disabled', true);
                $save.prop('disabled', true);
            }
            if ($('[data-cart-item-checkbox]:checked', this.$cartContent).length === $('[data-cart-item-checkbox]', this.$cartContent).length) {
                $select.prop('checked', true);
            } else {
                $select.prop('checked', false);
            }
        });
        // }}}

        // mooncat: attach 'cart-update' event to refresh the cart
        utils.hooks.on('cart-update', this.onCartUpdate);

        this.initEditOptions(this.$cartContent);
    }

    // mooncat
    onCartUpdate() {
        this.refreshContent();
    }

    bindPromoCodeEvents() {
        // mooncat edited
        const $couponForm = this.$cartPageContent.find('.coupon-form');
        const $codeInput = $('[name="couponcode"]', $couponForm);
        const $couponContainer = this.$cartPageContent.find('.coupon-code');

        this.$cartPageContent.find('.coupon-code-add').on('click', event => {
            event.preventDefault();

            $(event.currentTarget).hide();
            $couponContainer.show();
            this.$cartPageContent.find('.coupon-code-cancel').show().focus(); // papathemes-beautify mod
            $codeInput.trigger('focus');
        });

        this.$cartPageContent.find('.coupon-code-cancel').on('click', event => {
            event.preventDefault();

            $couponContainer.hide();
            this.$cartPageContent.find('.coupon-code-cancel').hide();
            this.$cartPageContent.find('.coupon-code-add').show().focus(); // papathemes-beautify mod
        });

        $couponForm.on('submit', event => {
            const code = $codeInput.val();

            event.preventDefault();

            // Empty code
            if (!code) {
                return showAlertModal($codeInput.data('error'));
            }

            utils.api.cart.applyCode(code, (err, response) => {
                if (response.data.status === 'success') {
                    this.refreshContent();
                } else {
                    showAlertModal(response.data.errors.join('\n'));
                }
            });
        });
    }

    bindPromoCodeTicket() {
        const couponSelected = $('[data-cart-coupons]', this.$cartPageContent).data('cartCoupons');
        $('.remove-coupon', this.$cartPageContent).off('click').on('click', () => {
            localStorage.removeItem('COUPON_CODE');
        });
        loadPromoTicket(this.$cartPageContent);
        actionPromoTicket(this.$cartPageContent, this.context, couponSelected);
    }

    bindGiftCertificateEvents() {
        // mooncat edited
        const $certContainer = this.$cartPageContent.find('.gift-certificate-code');
        const $certForm = this.$cartPageContent.find('.cart-gift-certificate-form');
        const $certInput = $('[name="certcode"]', $certForm);

        this.$cartPageContent.find('.gift-certificate-add').on('click', event => {
            event.preventDefault();
            $(event.currentTarget).toggle();
            $certContainer.toggle();
            this.$cartPageContent.find('.gift-certificate-cancel').toggle();
            this.$cartPageContent.find('.gift-certificate-cancel:visible').focus(); // papathemes-beautify
        });

        $('.gift-certificate-cancel').on('click', event => {
            event.preventDefault();
            $certContainer.toggle();
            this.$cartPageContent.find('.gift-certificate-add').toggle();
            this.$cartPageContent.find('.gift-certificate-cancel').toggle();
            this.$cartPageContent.find('.gift-certificate-add:visible').focus(); // papathemes-beautify
        });

        $certForm.on('submit', event => {
            const code = $certInput.val();

            event.preventDefault();

            if (!checkIsGiftCertValid(code)) {
                const validationDictionary = createTranslationDictionary(this.context);
                return showAlertModal(validationDictionary.invalid_gift_certificate);
            }

            utils.api.cart.applyGiftCertificate(code, (err, resp) => {
                if (resp.data.status === 'success') {
                    this.refreshContent();
                } else {
                    showAlertModal(resp.data.errors.join('\n'));
                }
            });
        });
    }

    bindGiftWrappingEvents() {
        const modal = defaultModal();

        this.$cartContent.find('[data-item-giftwrap]').on('click', event => { // mooncat edited
            const itemId = $(event.currentTarget).data('itemGiftwrap');
            const options = {
                template: 'cart/modals/gift-wrapping-form',
            };

            event.preventDefault();

            modal.open();

            utils.api.cart.getItemGiftWrappingOptions(itemId, options, (err, response) => {
                modal.updateContent(response.content);

                this.bindGiftWrappingForm();
            });
        });
    }

    bindGiftWrappingForm() {
        $('.giftWrapping-select').on('change', event => {
            const $select = $(event.currentTarget);
            const id = $select.val();
            const index = $select.data('index');

            if (!id) {
                return;
            }

            const allowMessage = $select.find(`option[value=${id}]`).data('allowMessage');

            $(`.giftWrapping-image-${index}`).hide();
            $(`#giftWrapping-image-${index}-${id}`).show();

            if (allowMessage) {
                $(`#giftWrapping-message-${index}`).show();
            } else {
                $(`#giftWrapping-message-${index}`).hide();
            }
        });

        $('.giftWrapping-select').trigger('change');

        function toggleViews() {
            const value = $('input:radio[name ="giftwraptype"]:checked').val();
            const $singleForm = $('.giftWrapping-single');
            const $multiForm = $('.giftWrapping-multiple');

            if (value === 'same') {
                $singleForm.show();
                $multiForm.hide();
            } else {
                $singleForm.hide();
                $multiForm.show();
            }
        }

        $('[name="giftwraptype"]').on('click', toggleViews);

        toggleViews();
    }

    bindEvents() {
        this.bindCartEvents();
        this.bindPromoCodeEvents();
        this.bindGiftWrappingEvents();
        this.bindGiftCertificateEvents();
        this.bindPromoCodeTicket();
        $('body').off('cart-refresh-content');
        $('body').on('cart-refresh-content', () => {
            this.refreshContent();
        });

        // initiate shipping estimator module
        const shippingErrorMessages = {
            country: this.context.shippingCountryErrorMessage,
            province: this.context.shippingProvinceErrorMessage,
        };
        this.shippingEstimator = new ShippingEstimator(this.$cartPageContent.find('[data-shipping-estimator]'), shippingErrorMessages); // mooncat edited

        // papathemes-dinoaur
        this.fetchGraphQL().then(resp => {
            const wishList = resp?.data?.customer ? resp.data.customer.wishlists?.edges.map(({ node }) => node) : [];
            this.bindWishlistEvents(wishList);

            const listRegions = resp?.data?.site?.content?.renderedRegionsByPageType?.regions || [];
            const cartRegions = listRegions.filter(({ name }) => name === 'cart-coupons--global');
            this.initCartRegions(cartRegions);
        });
    }
}
