import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
// Supermarket Mod
// import compareProducts from './global/compare-products';
import compareProducts from '../papathemes/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';
import actionBarFactory from '../papathemes/action-bar'; // Papathemes - Supermarket
import bulkOrderFactory from '../papathemes/bulk-order';
import { StandardInfiniteScroll, FacetedInfiniteScroll } from '../papathemes/faceted-infinite-scroll'; // Chiara
import mediaQueryListFactory from './common/media-query-list';
import { scrollToTopProducts } from '../papathemes/theme-utils'; // papathemes-kitchenary

const largeMediaQueryList = mediaQueryListFactory('large');
export default class Brand extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    onReady() {
        // Chiara: infinite scroll
        const enableInfiniteScroll = $('#product-listing-container').data('brandInfiniteScroll');

        // Papathemes - Bulk Order
        if (this.context && (this.context.show_bulk_order_mode || this.context.useBulkOrder)) {
            this.bulkOrder = bulkOrderFactory(this.context);
        }

        // Supermarket Mod
        // compareProducts(this.context.urls);
        compareProducts(this.context);

        // Papathemes: infinite scroll
        const infiniteScrollOptions = {
            bulkOrder: this.bulkOrder,
            enableInfiniteScroll,
            txtLoadMore: this.context.txtLoadMore,
            insertTopPaginationFunc: ($pagination, $productListingContainer) => $productListingContainer.find('.productGrid').before($pagination),
            insertBottomPaginationFunc: ($pagination, $productListingContainer) => $productListingContainer.find('.productGrid').after($pagination),
        };

        actionBarFactory(); // Papathemes - Supermarket
        if ($('#facetedSearch').length > 0) {
            // Chiara: init infinite scroll for faceted search
            if (enableInfiniteScroll) {
                this.facetedInfiniteScroll = new FacetedInfiniteScroll(infiniteScrollOptions);
            }

            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);

            // Chiara: init infinite scroll for standard category page without faceted filters
            if (enableInfiniteScroll) {
                this.standardInfiniteScroll = new StandardInfiniteScroll({
                    requestOptions: {
                        config: {
                            brand: {
                                products: {
                                    limit: this.context.brandProductsPerPage,
                                },
                            },
                        },
                        template: 'brand/product-listing',
                    },
                    isCategoryPageFullWidth: this.context.categorypage_layout === 'fullwidth',
                    ...infiniteScrollOptions,
                });
            }
        }

        const hideActionNotChecked = () => {
            const $productFilter = $('#papathemes-productsFilter-form');
            if (!largeMediaQueryList.matches) {
                $('.form-radio', $productFilter).each((index, checkbox) => {
                    if ($(checkbox).prop('checked')) {
                        if ($(checkbox).attr('id') === 'mode_1_main' || $(checkbox).attr('id') === 'mode_2_main' || $(checkbox).attr('id') === 'mode_bo_main') {
                            $('.form-radio[value="2"]', $productFilter).css('display', 'inline-block');
                            $('.form-radio[value="2"] + label.form-option', $productFilter).css('display', 'inline-flex');
                        } else {
                            $('.form-radio[value="2"]', $productFilter).css('display', 'none');
                            $('.form-radio[value="2"] + label.form-option', $productFilter).css('display', 'none');
                        }
                    }
                });
                $('.form-radio', $productFilter).on('change', (e) => {
                    const itemChecked = $(e.target);
                    if (itemChecked.attr('id') === 'mode_1_main' || itemChecked.attr('id') === 'mode_2_main' || itemChecked.attr('id') === 'mode_bo_main') {
                        $('.form-radio[value="2"]', $productFilter).css('display', 'inline-block');
                        $('.form-radio[value="2"] + label.form-option', $productFilter).css('display', 'inline-flex');
                    }
                });
            } else {
                $('.form-radio[value="2"]', $productFilter).css('display', 'inline-block');
                $('.form-radio[value="2"] + label.form-option', $productFilter).css('display', 'inline-flex');
            }
        };

        hideActionNotChecked();
        largeMediaQueryList.addListener(hideActionNotChecked);
    }

    // Supermarket
    destroy() {
        if (this.facetedSearch) {
            this.facetedSearch.destroy();
        } else {
            hooks.off('sortBy-submitted', this.onSortBySubmit);
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.brandProductsPerPage;
        const requestOptions = {
            template: {
                productListing: 'brand/product-listing',
                sidebar: 'brand/sidebar',
            },
            config: {
                shop_by_brand: true,
                brand: {
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            showMore: 'brand/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content, url) => {
            // Chiara: Infinite Scroll mod
            if (this.facetedInfiniteScroll) {
                return this.facetedInfiniteScroll.refreshView(content, url);
            }

            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            // Papathemes - Bulk Order
            if (this.bulkOrder) {
                this.bulkOrder.reinit();
            }

            // kitchenary: scroll to top of product listing
            scrollToTopProducts();
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
