/* eslint-disable no-console */
/* eslint-disable no-unused-expressions */
import { debounce, throttle } from 'lodash';
import { api } from '@bigcommerce/stencil-utils';
import collapsibleFactory, { CollapsibleEvents } from '../theme/common/collapsible';
import actionBarFactory from './action-bar';

const DEBUG = false;

const isTopInViewport = (elem) => {
    const distance = elem.getBoundingClientRect();
    return (
        distance.top >= 0 &&
        distance.top <= (window.innerHeight || document.documentElement.clientHeight)
    );
};

/**
 * Check if 2 urls are the same except 'page' query param
 * @param {string} url Current URL string
 * @param {string} prevUrl Previous URL string
 * @param {boolean} ignoreSortParam Ignore 'sort' query param, this should be set to true if the link is from pagination element
 * @returns Boolean
 */
function isPagingUrl(url, prevUrl, ignoreSortParam = false) {
    const oUrl = new URL(url, window.location.origin);
    const oPrevUrl = new URL(prevUrl, window.location.origin);

    // remove the last /
    oUrl.pathname = oUrl.pathname.replace(/\/$/, '');
    oPrevUrl.pathname = oPrevUrl.pathname.replace(/\/$/, '');

    // path is different
    if (oUrl.pathname !== oPrevUrl.pathname) {
        return false;
    }

    // no 'page' param in both urls
    if (!oUrl.searchParams.get('page') && !oPrevUrl.searchParams.get('page')) {
        return false;
    }

    // previous url has 'sort' param and different from 'sort' param of the current url
    // => assume sort by is changed
    if (!ignoreSortParam && oPrevUrl.searchParams.get('sort') && oUrl.searchParams.get('sort') !== oPrevUrl.searchParams.get('sort')) {
        return false;
    }

    // current url has 'sort' param but not have 'page' param
    // => assume sort by is changed
    if (oUrl.searchParams.get('sort') && !oUrl.searchParams.get('page')) {
        return false;
    }

    // delete 'page', 'limit', 'sort' params from both urls
    oUrl.searchParams.delete('page');
    oUrl.searchParams.delete('limit');
    oUrl.searchParams.delete('sort');
    oUrl.searchParams.delete('_bc_fsnf');
    oUrl.hash = '';
    oPrevUrl.searchParams.delete('page');
    oPrevUrl.searchParams.delete('limit');
    oPrevUrl.searchParams.delete('sort');
    oPrevUrl.searchParams.delete('_bc_fsnf');
    oPrevUrl.hash = '';

    const sUrl = oUrl.toString().replace(/%5B[0-9]+%5D/g, '%5B%5D').replace(/\[[0-9]+\]/g, '[]');
    const sPrevUrl = oUrl.toString().replace(/%5B[0-9]+%5D/g, '%5B%5D').replace(/\[[0-9]+\]/g, '[]');

    // compare urls
    return sUrl === sPrevUrl;

    // const diffKeys = [
    //     ...oUrl.searchParams.keys().reduce((_diffKeys, key) => (oUrl.searchParams.get(key) !== oPrevUrl.searchParams.get(key) ? [..._diffKeys, key] : _diffKeys), []),
    //     ...oPrevUrl.searchParams.keys().reduce((_diffKeys, key) => (oUrl.searchParams.get(key) !== oPrevUrl.searchParams.get(key) ? [..._diffKeys, key] : _diffKeys), []),
    // ];
}

function getPageFromUrl(url, defaultValue = 1) {
    const oUrl = new URL(url, window.location.origin);
    return Number(oUrl.searchParams.get('page')) || defaultValue;
}

export class FacetedInfiniteScroll {
    constructor({
        productListingContainerSelector = '#product-listing-container',
        facetedSearchSelectorContainer = '#faceted-search-container',
        paginationSelector = '.pagination',
        productGridSelector = '.productGrid',
        productSelector = '.productGrid .product',
        paginationItemNextSelector = '.pagination-item--next',
        paginationItemPrevSelector = '.pagination-item--previous',
        bulkOrder = null,
        enableInfiniteScroll = 'scroll', // false | 'scroll' | 'button'
        txtLoadMore = 'Load More',
        // eslint-disable-next-line no-unused-vars
        insertTopPaginationFunc = ($pagination, $productListingContainer) => {},
        // eslint-disable-next-line no-unused-vars
        insertBottomPaginationFunc = ($pagination, $productListingContainer) => {},
    } = {}) {
        this.onScroll = throttle(this.onScroll.bind(this), 200);
        this.replaceStateLastUrlDebounced = debounce(() => window.history.replaceState({}, document.title, this.lastUrl), 500);

        this.productListingContainerSelector = productListingContainerSelector;
        this.facetedSearchSelectorContainer = facetedSearchSelectorContainer;
        this.paginationSelector = paginationSelector;
        this.productGridSelector = productGridSelector;
        this.productSelector = productSelector;
        this.paginationItemNextSelector = paginationItemNextSelector;
        this.paginationItemPrevSelector = paginationItemPrevSelector;
        this.bulkOrder = bulkOrder;
        this.enableInfiniteScroll = enableInfiniteScroll;
        this.txtLoadMore = txtLoadMore;
        this.insertTopPaginationFunc = insertTopPaginationFunc.bind(this);
        this.insertBottomPaginationFunc = insertBottomPaginationFunc.bind(this);

        $(window).on('scroll', this.onScroll);

        const $productListingContainer = $(this.productListingContainerSelector);

        //  Clone the pagination and prepend to the product listing container
        const $bottomPagination = $productListingContainer.find(this.paginationSelector).addClass('_bottom');
        const $topPagination = $productListingContainer.find(this.paginationSelector).filter('._bottom').first().clone()
            .removeClass('_bottom').addClass('_top')
            .prependTo($productListingContainer);

        // Update the position of the top pagination and bottom pagination
        this.insertTopPaginationFunc($topPagination, $productListingContainer);
        this.insertBottomPaginationFunc($bottomPagination, $productListingContainer);

        // Add data-page to .product elements
        $productListingContainer.find(this.productSelector).attr('data-page', getPageFromUrl(window.location.href));

        // Go to the last scroll position
        this.scrollTo();

        // The last URL
        this.lastUrl = window.location.href;

        // Observe the pagination or load more button
        this.observePagination();
    }

    /**
     * Observe the pagination in viewport to load more products
     * or listen the load more button event
     */
    observePagination() {
        const $productListingContainer = $(this.productListingContainerSelector);
        const $topPagination = $productListingContainer.find(this.paginationSelector).filter('._top');
        const $bottomPagination = $productListingContainer.find(this.paginationSelector).filter('._bottom');

        if (this.enableInfiniteScroll === 'scroll') {
            if (!this.ob) {
                // Check the pagination is in viewport
                this.ob = new IntersectionObserver((entries) => {
                    const href = entries
                        .filter(entry => entry.isIntersecting)
                        .map(entry => entry.target.querySelector('a')?.getAttribute('href'))
                        .filter(_href => _href && isPagingUrl(_href, window.location.href, true))[0];

                    if (href) {
                        DEBUG && console.log('Pagination link is in viewport. href = ', href);

                        // display loading indicator
                        $productListingContainer.find(this.paginationSelector).addClass('is-loading');

                        // update the URL in browser address bar
                        window.history.replaceState({}, document.title, href);
                        $(window).trigger('statechange');
                    }
                });
            }

            // Watch the next, previous pagination in viewport
            $topPagination.find(this.paginationItemPrevSelector).first().each((i, el) => this.ob.observe(el));
            $bottomPagination.find(this.paginationItemNextSelector).first().each((i, el) => this.ob.observe(el));
            //
        } else if (this.enableInfiniteScroll === 'button') {
            const prevLink = $topPagination.find(this.paginationItemPrevSelector).find('a').attr('href');
            const nextLink = $bottomPagination.find(this.paginationItemNextSelector).find('a').attr('href');

            if (this.$loadPrevButton) {
                this.$loadPrevButton.parent('.infiniteScroll-loadMoreWrapper').remove();
                this.$loadPrevButton.off('click').remove();
            }

            if (this.$loadNextButton) {
                this.$loadNextButton.parent('.infiniteScroll-loadMoreWrapper').remove();
                this.$loadNextButton.off('click').remove();
            }

            const onClick = (event) => {
                const $button = $(event.currentTarget);
                const href = $button.data('href');

                if (href) {
                    // display loading indicator
                    $productListingContainer.find(this.paginationSelector).addClass('is-loading');

                    // update the URL in browser address bar
                    window.history.replaceState({}, document.title, href);
                    $(window).trigger('statechange');
                }
            };

            if (prevLink) {
                this.$loadPrevButton = $(`<button type="button" class="button button--primary button--small button--prev">${this.txtLoadMore}</button>`).insertAfter($topPagination).wrap('<div class="infiniteScroll-loadMoreWrapper _top"></div>');
                this.$loadPrevButton.data('href', prevLink);
                this.$loadPrevButton.on('click', onClick);
            }

            if (nextLink) {
                this.$loadNextButton = $(`<button type="button" class="button button--primary button--small button--next">${this.txtLoadMore}</button>`).insertAfter($bottomPagination).wrap('<div class="infiniteScroll-loadMoreWrapper _bottom"></div>');
                this.$loadNextButton.data('href', nextLink);
                this.$loadNextButton.on('click', onClick);
            }
        }
    }

    /**
     * Scroll the page to the position specified by window.location.hash
     */
    scrollTo() {
        if (window.location.hash) {
            const m = window.location.hash.replace(/^#/, '').match(/y=(-?\d+)/);
            if (m && m[1]) {
                const $productListingContainer = $(this.productListingContainerSelector);
                const y = Number(m[1]);
                const page = getPageFromUrl(window.location.href);
                const $el = $productListingContainer.find(this.productSelector).filter(`[data-page="${page}"]`).first();
                window.scrollTo(0, $el.offset().top - y);
            }
        }
    }

    onScroll() {
        this.updateScrollingUrl();
    }

    /**
     * Update the address bar URL to store the current scroll position
     */
    updateScrollingUrl() {
        // the first product element in viewport
        const $products = $(this.productListingContainerSelector).find(this.productSelector);
        const $el = $products
            .filter((i, el) => {
                const { top, bottom } = el.getBoundingClientRect();
                return top >= 0 && top <= window.innerHeight || bottom >= 0 && bottom <= window.innerHeight;
            })
            .first();

        // update the 'page' parameter of the current url in relation to the product element in viewport
        // store the top position of the first element of the current page to the URL's hash
        if ($el.length > 0) {
            const url = new URL(window.location.href, window.origin);
            const page = Number($el.data('page')) || 1;

            if (page > 1) {
                url.searchParams.set('page', page);
            } else {
                url.searchParams.delete('page');
            }

            const pageFirstEl = $products.filter(`[data-page="${page}"]`).get(0);
            const { top } = pageFirstEl.getBoundingClientRect();

            url.hash = `#y=${Math.round(top)}`;

            // Store the last URL
            this.lastUrl = url.toString();

            DEBUG && console.log('Stored the lastUrl ', this.lastUrl);

            // replaceState by the last URL
            // window.history.replaceState({}, document.title, this.lastUrl);
            this.replaceStateLastUrlDebounced();

            // Disable the browser's scroll restoration when go back
            window.history.scrollRestoration = 'manual';
        }
    }

    /**
     * Append or refresh the product listing.
     * This function should be called inside the callback of faceted filter.
     * @param {string|object<{sidebar: string, productListing: string}>} content HTML content
     * @param {string} url the request URL that returns the content
     */
    refreshView(content, url = window.location.href, context = '') {
        const $productListingContainer = $(this.productListingContainerSelector);
        const $facetedSearchContainer = $(this.facetedSearchSelectorContainer);
        const page = getPageFromUrl(url);
        let shouldScrollToTop = false;

        const sidebar = typeof content === 'object' && typeof content.sidebar !== 'undefined' ? content.sidebar : null;
        const productListing = typeof content === 'object' && typeof content.productListing !== 'undefined' ? content.productListing : content;

        // Update the sidebar
        if (sidebar !== null) {
            $facetedSearchContainer.html(sidebar);
        }

        if (isPagingUrl(url, this.lastUrl)) {
            // Remove the loading indicator
            $productListingContainer.find(this.paginationSelector).removeClass('is-loading');

            // Append new products if not exist
            if ($productListingContainer.find(this.productSelector).filter(`[data-page="${page}"]`).length === 0) {
                const $productListing = $(`<div>${productListing}</div>`);

                // The first element that has data-page > current page
                const $nextPageEl = $productListingContainer.find(this.productSelector).filter((i, el) => (Number($(el).attr('data-page')) || 1) > page).first();

                if ($nextPageEl.length > 0) {
                    // if the next page is already loaded,
                    // then insert the new products before the first element of the next page
                    $nextPageEl.before($productListing.find(this.productGridSelector).html());
                } else {
                    // otherwise, append the new products to the end
                    $productListingContainer.find(this.productGridSelector).append($productListing.find(this.productGridSelector).html());
                }

                const curNextPage = getPageFromUrl($productListingContainer.find(this.paginationSelector).filter('._bottom').find(this.paginationItemNextSelector).find('a').attr('href'), 0);
                const curPrevPage = getPageFromUrl($productListingContainer.find(this.paginationSelector).filter('._top').find(this.paginationItemPrevSelector).find('a').attr('href'), 0);
                const nextPage = getPageFromUrl($productListing.find(this.paginationSelector).find(this.paginationItemNextSelector).find('a').attr('href'), 0);
                const prevPage = getPageFromUrl($productListing.find(this.paginationSelector).find(this.paginationItemPrevSelector).find('a').attr('href'), 0);

                // Update the bottom pagination if required
                if (curNextPage > 0 && (!nextPage || nextPage > curNextPage)) {
                    $productListingContainer.find(this.paginationSelector).filter('._bottom').html($productListing.find(this.paginationSelector).html());
                }

                // Update the top pagination if required
                if (prevPage < curPrevPage) {
                    $productListingContainer.find(this.paginationSelector).filter('._top').html($productListing.find(this.paginationSelector).html());
                }
            }

            // Scroll to the position specified by the window.location.hash
            // or the last scroll position
            if (window.location.hash) {
                this.scrollTo();
            } else if (this.lastUrl) {
                if (this.lastUrl.includes('#')) {
                    DEBUG && console.log('restore the lastUrl and scroll to ', this.lastUrl);
                    window.history.replaceState({}, document.title, this.lastUrl);
                    this.scrollTo();
                }
            }
        } else {
            // Replace the product listing by the new products
            $productListingContainer.html(productListing);

            if (context) {
                $productListingContainer.find('img[data-no-img]').attr('src', `${context.defaultProductImage}`);
            }

            // Update the bottom pagination
            const $bottomPagination = $productListingContainer.find(this.paginationSelector).addClass('_bottom');

            // Clone the pagination and prepend to the top of product listing
            const $topPagination = $productListingContainer.find(this.paginationSelector).first().clone()
                .removeClass('_bottom').addClass('_top')
                .prependTo($productListingContainer);

            // Update the position of the top pagination and bottom pagination
            this.insertTopPaginationFunc($topPagination, $productListingContainer);
            this.insertBottomPaginationFunc($bottomPagination, $productListingContainer);

            if ($productListingContainer.length > 0 && !isTopInViewport($productListingContainer.get(0))) {
                shouldScrollToTop = true;
            }

            // Store the last URL
            this.lastUrl = url;

            DEBUG && console.log('Update the lastUrl due to the new URL is not pagination link', this.lastUrl);
        }

        // Add data-page to .product elements
        $productListingContainer.find(this.productSelector).not('[data-page]').attr('data-page', page);

        // Papathemes - Bulk Order
        if (this.bulkOrder) {
            this.bulkOrder.reinit();
        }

        if (shouldScrollToTop) {
            $('#product-listing-container').get(0).scrollIntoView();
            setTimeout(() => this.observePagination(), 200);
            // $('#product-listing-container').animate({
            //     scrollTop: 0,
            // }, 100, null, () => this.observePagination());
        } else {
            this.observePagination();
        }
    }
}

export class StandardInfiniteScroll {
    constructor({
        requestOptions = {
            config: {
                category: {
                    products: {
                        limit: 12,
                    },
                },
            },
            template: 'category/product-listing',
        },
        isSearchInCategoryEnabled = false,
        isCategoryPageFullWidth = false,
        ...options
    } = {}) {
        this.onStateChange = this.onStateChange.bind(this);
        this.onPopState = this.onPopState.bind(this);

        this.requestOptions = requestOptions;
        this.isSearchInCategoryEnabled = isSearchInCategoryEnabled;
        this.isCategoryPageFullWidth = isCategoryPageFullWidth;
        this.infiniteScroll = new FacetedInfiniteScroll(options);

        this.bindEvents();
    }

    bindEvents() {
        this.unbindEvents();

        // DOM events
        $(window).on('statechange', this.onStateChange);
        $(window).on('popstate', this.onPopState);
    }

    unbindEvents() {
        // DOM events
        $(window).off('statechange', this.onStateChange);
        $(window).off('popstate', this.onPopState);
    }

    onStateChange() {
        this.updateView();
    }

    onPopState() {
        this.updateView();
    }

    updateView() {
        // stop if search-in-category is enabled as update view is handled by search-in-category
        if (this.isSearchInCategoryEnabled) return;

        const url = window.location.href;

        api.getPage(url, this.requestOptions, (err, content) => {
            if (err) {
                throw new Error(err);
            }

            // Refresh view with new content
            this.refreshView(content, url);
        });
    }

    refreshView(content, url) {
        this.infiniteScroll.refreshView(content, url);
        actionBarFactory();
        this.reInitCollapsible();
    }

    reInitCollapsible() {
        collapsibleFactory();

        if (this.isCategoryPageFullWidth) {
            const accordionToggleSelector = $('#noFacetedSearch ._accordion-navigation');

            accordionToggleSelector.on(CollapsibleEvents.open, event => {
                // Close all other collapsible elements
                accordionToggleSelector.not(event.currentTarget).each((_index, accordionToggle) => $(accordionToggle).data('collapsibleInstance')?.close());

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
    }
}
