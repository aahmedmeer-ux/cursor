import 'foundation-sites/js/foundation/foundation';
import 'foundation-sites/js/foundation/foundation.dropdown';
import utils from '@bigcommerce/stencil-utils';
import ProductDetails from '../common/product-details';
import { defaultModal, ModalEvents } from './modal';
import 'slick-carousel';

/**
 * Prepare quick-view hook and context for Bulk Order layout
 *
 * @param {HTMLElement} currentTarget current target clicked element
 * @param {Modal} modal Quick view modal instance
 * @param {object} context Context object
 * @returns {object} New content object
 */
export function initBulkOrderQuickView(currentTarget, modal, context) {
    const $card = $(currentTarget).closest('.card');
    const $qty = $card.find('[data-quantity-change] input, [data-card-quantity-change] input');
    const qty = Number($qty.val()) || Number($qty.data('quantityMin'));
    const showAddToCartLater = $(currentTarget).closest('.card-bulkOrder, [data-also-bought], .card-bulkOrder-options').length > 0;
    const $cardBulkOrderOptions = $card.find('[data-bulkorder-options]');
    const $productView = modal.$content.find('.productView');
    const newContext = { ...context };

    // Update qty from product card's qty input
    if (qty && qty > 0) {
        const $quickViewQty = $productView.find('[data-quantity-change] input[name="qty[]"]');
        const minQty = Number($quickViewQty.data('quantityMin')) || 1;
        const maxQty = Number($quickViewQty.data('quantityMax')) || 0;
        if (qty >= minQty && (maxQty === 0 || qty <= maxQty)) {
            $quickViewQty.val(qty);
        }
    }

    // Show Add to Cart Later button for Bulk Order layout
    if (showAddToCartLater) {
        $productView.find('#form-action-addToCartLater').show();
        newContext.showAddToCartLater = true;
        newContext.closeQuickView = () => modal.close();
    }

    // Insert the source $cart element initialize the quick view
    if ($card.length > 0) {
        newContext.$card = $card;
    }

    // Populate the quick view product form with the selected options from previous selection
    if ($cardBulkOrderOptions.length > 0) {
        newContext.$cardBulkOrderOptions = $cardBulkOrderOptions;
        const $form = $cardBulkOrderOptions.find('form');

        if ($form.length > 0) {
            const formData = new FormData($form[0]);
            const $newForm = $productView.find('form[data-cart-item-add]');

            formData.entries().forEach(([key, value]) => {
                if (key.match(/attribute/)) {
                    const $el = $newForm.find(`[name="${key}"][type!="hidden"]`);

                    if ($el.attr('type') === 'radio' || $el.attr('type') === 'checkbox') {
                        $el.filter(`[value="${value}"]`).prop('checked', true);
                        newContext.forceUpdateView = true;
                    } else if ($el.attr('type') === 'file') {
                        if (value instanceof File && value.size > 0) {
                            const dt = new DataTransfer();
                            dt.items.add(value);
                            $el[0].files = dt.files;

                            // For Safari
                            if ($el[0].webkitEntries?.length) {
                                $el[0].dataset.file = `${dt.files[0].name}`;
                            }

                            $el.closest('[data-product-attribute]').find('._filename').text(value.name);

                            newContext.forceUpdateView = true;
                        }
                    } else {
                        $el.val(value);
                        newContext.forceUpdateView = true;
                    }
                }
            });
        }
    }

    return newContext;
}

/**
 * Opens a quick view modal for a product.
 *
 * @param {Object} options - The options for opening the quick view.
 * @param {HTMLElement} options.currentTarget - The target element that triggered the quick view.
 * @param {number} options.productId - The ID of the product to display.
 * @param {string} [options.size='large'] - The size of the quick view modal. Can be any string value, with 'large' and 'purchaseOptions' being common choices.
 * @param {string} [options.template='products/quick-view'] - The template to use for the quick view. Can be any string value, with 'products/quick-view' and 'products/quick-view-alt' being common choices.
 * @param {Object} [options.context={}] - Additional context data to pass to the quick view.
 * @param {Function} [options.closeCallback] - A callback function to call when the quick view is closed.
 */
export function openQuickView({
    currentTarget,
    productId,
    size = 'large',
    template = 'products/quick-view',
    context = {},
    closeCallback,
}) {
    const modal = defaultModal();

    if (typeof closeCallback === 'function') {
        modal.$modal.one(ModalEvents.close, closeCallback);
    }

    // Fetch widget region by Product ID
    const fetchWidget = async () => {
        if (!productId) return [];
        const resp = await $.ajax({
            url: '/graphql',
            method: 'POST',
            data: JSON.stringify({
                query: `
                    query {
                        site {
                            content {
                                renderedRegionsByPageTypeAndEntityId(entityPageType: PRODUCT, entityId: ${productId}){
                                    regions {
                                        name
                                        html
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    productId,
                },
            }),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${context.graphQLToken}`,
            },
            xhrFields: {
                withCredentials: true,
            },
        });
        const listRegion = resp?.data?.site?.content?.renderedRegionsByPageTypeAndEntityId?.regions;

        const productRegion = [];

        $.each(listRegion, (i, el) => {
            if (el.name === 'product_description_tab_content--global' ||
                el.name === 'product_description_tab_content' ||
                el.name === 'price_below_content' ||
                el.name === 'price_below_content_1' ||
                el.name === 'price_below_content--global' ||
                el.name === 'product_below_image-gallery' ||
                el.name === 'product_below_image-gallery--global' ||
                el.name === 'product_above_options' ||
                el.name === 'product_above_options--global' ||
                el.name === 'product_below_alsoBought' ||
                el.name === 'product_below_alsoBought--global' ||
                el.name === 'product_below_addtocart' ||
                el.name === 'product_below_addtocart--global' ||
                el.name === 'product_below_share' ||
                el.name === 'product_below_share--global' ||
                el.name === 'cart-coupons--global'
            ) {
                productRegion.push(el);
            }
        });

        return productRegion;
    };

    modal.open({ size });

    // papathemes-beautify
    const config = {
        product: {
            videos: context.productpage_videos_count,
            reviews: context.productpage_reviews_count,
            related_products: {
                limit: context.productpage_related_products_count,
            },
        },
    };

    const fetchWidgetPromise = fetchWidget();

    utils.api.product.getById(productId, { template, config }, (err, response) => {
        modal.updateContent(response);

        modal.$content.find('.productView').addClass('productView--quickView');

        modal.$content.find('[data-slick]').slick();

        // papathemes: inject features for bulk order layout
        const newContext = initBulkOrderQuickView(currentTarget, modal, context);

        // Papathemes Also Bought MOD {{{
        const $quickView = modal.$content.find('.quickView');
        let product;
        if ($('[data-also-bought] .productView-alsoBought-item', $quickView).length > 0) {
            product = new ProductDetails($quickView, { ...newContext, enableAlsoBought: true });
        } else {
            product = new ProductDetails($quickView, newContext);
        }

        $('body').trigger('loaded.quickview', [product]);

        // Supermarket: Track recently viewed products
        $('body').trigger('productviewed', [Number($quickView.find('input[name="product_id"]').val())]);

        // Get widget region by Product ID
        const $scope = modal.$content.find('.productView--quickView');

        fetchWidgetPromise.then(data => {
            $.each(data, (i, el) => {
                $(`[data-content-region="${el.name}"]`, $scope).html(el.html);
            });
        });

        return product;
        // }}}
    });
}

export default function (context) {
    // Supermarket - Instantload feature
    if (context.instantload) {
        return;
    }

    // supermarket add .quickview-alt to support Choose Options show quickview
    $('body').on('click', '.quickview, .quickview-alt', event => {
        event.preventDefault();
        const currentTarget = event.currentTarget;
        const productId = $(currentTarget).data('productId');
        const size = $(event.target).hasClass('quickview-alt') ? 'purchaseOptions' : 'large';
        const template = $(event.target).hasClass('quickview-alt') ? 'products/quick-view-alt' : 'products/quick-view';

        openQuickView({
            currentTarget,
            productId,
            size,
            template,
            context,
        });
    });
}
