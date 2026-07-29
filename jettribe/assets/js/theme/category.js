import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
// Supermarket Mod
// import compareProducts from './global/compare-products';
import compareProducts from '../papathemes/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';
import actionBarFactory from '../papathemes/action-bar'; // Papathemes - Supermarket
// import { autoExpandCategoryMenu } from '../papathemes/theme-utils'; // Supermarket
import bulkOrderFactory from '../papathemes/bulk-order';
import SearchInCategory from '../papathemes/search-in-category';
import initShopByPriceSlider from '../beautify/shop-by-price-slider';
import { StandardInfiniteScroll, FacetedInfiniteScroll } from '../papathemes/faceted-infinite-scroll'; // Chiara
import mediaQueryListFactory from './common/media-query-list';
import { scrollToTopProducts } from '../papathemes/theme-utils'; // papathemes-kitchenary
import { CollapsibleEvents } from './common/collapsible';

const largeMediaQueryList = mediaQueryListFactory('large');

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    onReady() {
        // Chiara: infinite scroll
        const enableInfiniteScroll = $('#product-listing-container').data('categoryInfiniteScroll');

        // console.log('category onReady');
        // autoExpandCategoryMenu(this.context); // Supermarket

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

        if ($('#facetedSearch').length > 0) {
            // Chiara: init infinite scroll for faceted search
            if (enableInfiniteScroll) {
                this.facetedInfiniteScroll = new FacetedInfiniteScroll(infiniteScrollOptions);
            }

            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);

            if (this.context.categorypage_layout === 'fullwidth') {
                // Click document hide category dropdown
                $(document).on('click', (event) => {
                    const accordionToggleSelector = $('#noFacetedSearch ._accordion-navigation');
                    const collapsibleElements = accordionToggleSelector
                        .get()
                        .map(el => $(el).data('collapsibleInstance'))
                        .filter(collapsible => collapsible)
                        .reduce((_collapsibleElements, collapsible) => [..._collapsibleElements, ...collapsible.$target.get(), ...collapsible.$toggle.get()], []);
                    if ($(event.target).closest($(collapsibleElements)).length === 0) {
                        accordionToggleSelector.each((index, accordionToggle) => {
                            const $accordionToggle = $(accordionToggle);
                            this.collapseFacet($accordionToggle);
                        });
                    }
                });

                const accordionToggleSelector = $('#noFacetedSearch ._accordion-navigation');

                accordionToggleSelector.on(CollapsibleEvents.open, event => {
                    // Close all other collapsible elements
                    accordionToggleSelector.not(event.currentTarget).each((index, accordionToggle) => this.collapseFacet($(accordionToggle)));

                    // Correct the dropdown position
                    const $content = $(event.currentTarget).data('collapsibleInstance')?.$target;
                    const $toggle = $(event.currentTarget).data('collapsibleInstance')?.$toggle;
                    if ($content) {
                        $content.css('left', $toggle.position().left);
                        $content.css('marginLeft', '');
                        if ($toggle.position().left < 0) {
                            $content.css('left', 0);
                        }
                        const right = $content.offset().left + $content.outerWidth() + 2;
                        if (right > document.body.clientWidth) {
                            $content.css('marginLeft', -(right - document.body.clientWidth));
                        }

                        $content.attr('tabindex', 0).focus();
                    }
                });
            }

            // papathemes-beautify
            initShopByPriceSlider();
            if (this.context.categorypage_search === 'show') {
                $('body').on('afterupdate.searchincategory', () => initShopByPriceSlider());
            }

            // Chiara: init infinite scroll for standard category page without faceted filters
            if (enableInfiniteScroll) {
                this.standardInfiniteScroll = new StandardInfiniteScroll({
                    requestOptions: {
                        config: {
                            category: {
                                products: {
                                    limit: this.context.categoryProductsPerPage,
                                },
                            },
                        },
                        template: 'category/product-listing',
                    },
                    isSearchInCategoryEnabled: this.context.categorypage_search === 'show',
                    isCategoryPageFullWidth: this.context.categorypage_layout === 'fullwidth',
                    ...infiniteScrollOptions,
                });
            }
        }

        // Papathemes - Supermarket
        actionBarFactory();

        // Supermarket
        if (this.context.categorypage_search === 'show') {
            this.initSearchInCategory();
        }

        // papathemes-beautify
        $('#categories-navList .navList-action--checkbox').on('click', event => $(event.target).toggleClass('is-selected'));
        $('#subCategories-loadMore').on('click', (e) => {
            const $btn = $(e.target);
            const textShowmore = $btn.data('show-more');
            const textShowLess = $btn.data('show-less');
            if ($btn.hasClass('_showMore-off')) {
                $btn
                    .removeClass('_showMore-off')
                    .text(textShowLess)
                    .attr('aria-label', textShowLess)
                    .siblings('.subCategories-list').toggleClass('_showMore');
            } else {
                $btn
                    .addClass('_showMore-off')
                    .text(textShowmore)
                    .attr('aria-label', textShowmore)
                    .siblings('.subCategories-list').toggleClass('_showMore');
            }
        });
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


    collapseFacet($accordionToggle) {
        const collapsible = $accordionToggle.data('collapsibleInstance');

        collapsible.close();
    }

    // Supermarket
    destroy() {
        if (this.searchInCategory) {
            this.searchInCategory.destroy();
        }
        if (this.facetedSearch) {
            this.facetedSearch.destroy();
        } else {
            hooks.off('sortBy-submitted', this.onSortBySubmit);
        }
    }

    // Supermarket
    initSearchInCategory() {
        this.searchInCategory = new SearchInCategory({
            context: this.context,
            facetedSearch: this.facetedSearch,
            searchCallback: (content, url) => { // papathemes: infinite scroll + search in category compatibility
                if (this.standardInfiniteScroll) {
                    return this.standardInfiniteScroll.refreshView(content, url);
                }

                $('#product-listing-container').html(content.productListing);

                if (this.bulkOrder) {
                    this.bulkOrder.reinit();
                }

                actionBarFactory();

                $('body').triggerHandler('compareReset');

                // kitchenary: scroll to top of product listing
                scrollToTopProducts();
            },
        });
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
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
                shop_by_brand: true,
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content, url) => { // chiara mod
            // Chiara: Infinite Scroll mod
            if (this.facetedInfiniteScroll) {
                return this.facetedInfiniteScroll.refreshView(content, url);
            }

            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            // Papathemes - Bulk Order
            if (this.bulkOrder) {
                this.bulkOrder.reinit();
            }

            $('body').triggerHandler('compareReset');

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
