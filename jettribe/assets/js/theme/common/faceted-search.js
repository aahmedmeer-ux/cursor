import { hooks, api } from '@bigcommerce/stencil-utils';
import _ from 'lodash';
import Url from 'url';
import urlUtils from './utils/url-utils';
import modalFactory from '../global/modal';
import collapsibleFactory, { CollapsibleEvents } from './collapsible'; // papathemes-mooncat mod
import { Validators } from './utils/form-utils';
import nod from './nod';
import actionBarFactory from '../../papathemes/action-bar'; // Papathemes - Supermarket
import initShopByPriceSlider from '../../beautify/shop-by-price-slider';
import mediaQueryListFactory from '../../theme/common/media-query-list';

const mediumMediaQueryList = mediaQueryListFactory('medium');

/**
 * Faceted search view component
 */
class FacetedSearch {
    /**
     * @param {object} requestOptions - Object with options for the ajax requests
     * @param {function} callback - Function to execute after fetching templates
     * @param {object} options - Configurable options
     * @example
     *
     * let requestOptions = {
     *      templates: {
     *          productListing: 'category/product-listing',
     *          sidebar: 'category/sidebar'
     *     }
     * };
     *
     * let templatesDidLoad = function(content) {
     *     $productListingContainer.html(content.productListing);
     *     $facetedSearchContainer.html(content.sidebar);
     * };
     *
     * let facetedSearch = new FacetedSearch(requestOptions, templatesDidLoad);
     */
    constructor(requestOptions, callback, options) {
        const defaultOptions = {
            accordionToggleSelector: '#facetedSearch ._accordion-navigation, #facetedSearch .facetedSearch-toggle, #noFacetedSearch ._accordion-navigation',
            blockerSelector: '#facetedSearch .blocker, #beautify__findGate-sidebar .blocker, #facetedSearch ._accordion-content .blocker-dropdown', // papathemes-beautify edited
            clearFacetSelector: '#facetedSearch .facetedSearch-clearLink',
            componentSelector: '#facetedSearch-navList',
            facetNavListSelector: '#facetedSearch .navList',
            priceRangeErrorSelector: '#facet-range-form .form-inlineMessage',
            priceRangeFieldsetSelector: '#facet-range-form .form-fieldset',
            priceRangeFormSelector: '#facet-range-form',
            priceRangeMaxPriceSelector: '#facet-range-form [name=max_price]',
            priceRangeMinPriceSelector: '#facet-range-form [name=min_price]',
            showMoreToggleSelector: '#facetedSearch ._accordion-content .toggleLink', // papathemes-beautify edited
            facetedSearchFilterItems: '.facetedSearch-filterItems .form-input',
            modal: modalFactory('#modal')[0],
            modalOpen: false,
        };

        // Private properties
        this.requestOptions = requestOptions;
        this.callback = callback;
        this.options = _.extend({}, defaultOptions, options);
        this.collapsedFacets = [];
        this.collapsedFacetItems = [];
        this.load = false;

        // Init collapsibles
        collapsibleFactory();

        // Init price validator
        this.initPriceValidator();

        // papathemes-beautify
        this.initPriceSlider();

        // Show limited items by default
        $(this.options.facetNavListSelector).each((index, navList) => {
            this.collapseFacetItems($(navList));
        });

        // Mark initially collapsed accordions
        $(this.options.accordionToggleSelector).each((index, accordionToggle) => {
            const $accordionToggle = $(accordionToggle);
            const collapsible = $accordionToggle.data('collapsibleInstance');

            if (collapsible.isCollapsed) {
                this.collapsedFacets.push(collapsible.targetId);
            }
        });

        // Collapse all facets if initially hidden
        // NOTE: Need to execute after Collapsible gets bootstrapped
        setTimeout(() => {
            if ($(this.options.componentSelector).is(':hidden')) {
                this.collapseAllFacets();
            }
        });

        // Observe user events
        this.onStateChange = this.onStateChange.bind(this);
        this.onPopState = this.onPopState.bind(this);
        this.onToggleClick = this.onToggleClick.bind(this);
        this.onAccordionToggle = this.onAccordionToggle.bind(this);
        this.onClearFacet = this.onClearFacet.bind(this);
        this.onFacetClick = this.onFacetClick.bind(this);
        this.onRangeSubmit = this.onRangeSubmit.bind(this);
        this.onSortBySubmit = this.onSortBySubmit.bind(this);
        this.filterFacetItems = this.filterFacetItems.bind(this);
        this.onDocumentClickOfHorizontalLayout = this.onDocumentClickOfHorizontalLayout.bind(this);

        this.bindEvents();

        // Supermarket
        $('body').one('beforeload.instantload', () => this.unbindEvents());

        // papathemes-beautify
        this.initFindGate();
    }

    bindHorizontalLayoutEvents() {
        if (!$('#faceted-search-container').hasClass('_horizontal')) return;
        $(document).on('click', this.onDocumentClickOfHorizontalLayout);

        $(this.options.accordionToggleSelector).on(CollapsibleEvents.open, event => {
            // Close all other collapsible elements
            $(this.options.accordionToggleSelector).not(event.currentTarget).each((index, accordionToggle) => this.collapseFacet($(accordionToggle)));

            // Correct the dropdown position
            const $content = $(event.currentTarget).data('collapsibleInstance')?.$target;
            const $toggle = $(event.currentTarget).data('collapsibleInstance')?.$toggle;
            if ($content) {
                $content.css('left', $toggle.position().left);
                $content.css('marginLeft', '');
                const right = $content.offset().left + $content.outerWidth() + 10;
                if (right > document.body.clientWidth) {
                    $content.css('marginLeft', -(right - document.body.clientWidth));
                }

                $content.attr('tabindex', 0).focus();
            }
        });

        // Move the dropdown outside the scrolling container
        $(this.options.componentSelector).find('._accordion--navList').each((i, navListEl) => {
            const $navList = $(navListEl);
            const $contents = $navList.find('._accordion-content')
                .insertAfter($navList);

            // Improve accessibility - enable keyboard navigation on dropdown of each faceted item
            if ($contents.length > 0) {
                $contents
                    .insertAfter($navList)
                    .append('<a class="is-srOnly _closeBtn" href="#">Close</a>')
                    .each((j, el) => {
                        const $content = $(el);
                        const collapsible = $('[data-collapsible]').get()
                            .map(el2 => $(el2).data('collapsibleInstance'))
                            .filter(instance => instance.targetId === $content.attr('id'))[0];

                        $content.on('keydown', event => {
                            if (event.key === 'Escape' && collapsible) {
                                collapsible.close();
                                collapsible.$toggle.focus();
                            }
                        });

                        $content.find('a._closeBtn').on('click focus keydown', event => {
                            event.preventDefault();
                            event.stopPropagation();

                            if (collapsible) {
                                collapsible.close();
                                collapsible.$toggle.focus();
                            }
                        });
                    });
            }
        });
    }

    unbindHorizontalLayoutEvents() {
        $(document).off('click', this.onDocumentClickOfHorizontalLayout);
    }

    /**
     * Close all collapsibles when click outside
     * @param {jQuery.Event} event
     */
    onDocumentClickOfHorizontalLayout(event) {
        const collapsibleElements = $(this.options.accordionToggleSelector)
            .get()
            .map(el => $(el).data('collapsibleInstance'))
            .filter(collapsible => collapsible)
            .reduce((_collapsibleElements, collapsible) => [..._collapsibleElements, ...collapsible.$target.get(), ...collapsible.$toggle.get()], []);

        if ($(event.target).closest($(collapsibleElements)).length === 0) {
            this.collapseAllFacets();
        }
    }

    // papathemes-beautify
    initFindGate() {
        const url = Url.parse(urlUtils.getUrl(), true);

        if (url.query._bs_width) {
            const width = Number(url.query._bs_width);
            this.findGate(width);
        }
    }

    findGate(width) {
        const url = Url.parse(urlUtils.getUrl(), true);

        delete url.query._bs_width;
        delete url.query['Minimum Gate Width'];
        delete url.query['Minimum Gate Width[]'];
        delete url.query['Maximum Gate Width'];
        delete url.query['Maximum Gate Width[]'];

        if (width) {
            const showMoreUrl = Url.format({ pathname: url.pathname, search: urlUtils.buildQueryString(url.query) });

            const minWidthPromise = new Promise(resolve => {
                const findMinWidthValues = $scope => $scope.find('[data-faceted-search-facet]').get().map(el => {
                    const _url = Url.parse($(el).attr('href'), true);
                    return Number(_url.query['Minimum Gate Width']);
                });
                const $minWidth = $('#facetedSearch [data-facet="Minimum Gate Width"]');
                if ($minWidth.data('hasMoreResults')) {
                    api.getPage(showMoreUrl, {
                        template: this.requestOptions.showMore,
                        params: {
                            list_all: 'Minimum Gate Width',
                        },
                    }, (err, resp) => {
                        resolve(findMinWidthValues($(resp)));
                    });
                } else {
                    resolve(findMinWidthValues($minWidth));
                }
            });

            const maxWidthPromise = new Promise(resolve => {
                const findMaxWidthValues = $scope => $scope.find('[data-faceted-search-facet]').get().map(el => {
                    const _url = Url.parse($(el).attr('href'), true);
                    return Number(_url.query['Maximum Gate Width']);
                });
                const $maxWidth = $('#facetedSearch [data-facet="Maximum Gate Width"]');
                if ($maxWidth.data('hasMoreResults')) {
                    api.getPage(showMoreUrl, {
                        template: this.requestOptions.showMore,
                        params: {
                            list_all: 'Maximum Gate Width',
                        },
                    }, (err, resp) => {
                        resolve(findMaxWidthValues($(resp)));
                    });
                } else {
                    resolve(findMaxWidthValues($maxWidth));
                }
            });

            Promise.all([minWidthPromise, maxWidthPromise]).then(([minWidthArr, maxWidthArr]) => {
                url.query._bs_width = width;
                url.query['Minimum Gate Width[]'] = minWidthArr.filter(val => val <= width);
                url.query['Maximum Gate Width[]'] = maxWidthArr.filter(val => val >= width);

                if (url.query['Minimum Gate Width[]'].length === minWidthArr.length) {
                    delete url.query['Minimum Gate Width[]'];
                }

                if (url.query['Maximum Gate Width[]'].length === maxWidthArr.length) {
                    delete url.query['Maximum Gate Width[]'];
                }

                urlUtils.goToUrl(Url.format({ pathname: url.pathname, search: urlUtils.buildQueryString(url.query) }));
            });
        } else {
            urlUtils.goToUrl(Url.format({ pathname: url.pathname, search: urlUtils.buildQueryString(url.query) }));
        }
    }


    // Supermarket
    destroy() {
        this.unbindEvents();
    }

    // Public methods
    refreshView(content, url) { // papathemes: faceted-infinite-scroll mod
        if (content) {
            this.callback(content, url); // papathemes: faceted-infinite-scroll mod
        }

        actionBarFactory(); // Papathemes - Supermarket

        // Init collapsibles
        collapsibleFactory();

        // Init price validator
        this.initPriceValidator();

        // papathemes-beautify
        this.initPriceSlider();

        // Restore view state
        this.restoreCollapsedFacets();
        this.restoreCollapsedFacetItems();

        if ($('#faceted-search-container').hasClass('_horizontal')) {
            const dropdownId = $('._accordion-content.is-open', '#facetedSearch').attr('id');
            $('._accordion-navigation', '#facetedSearch').each((index, item) => {
                if (dropdownId === $(item).attr('aria-controls')) {
                    $('._accordion-content.is-open', '#facetedSearch').css('left', $(item).position().left);
                }
            });
        }

        // Bind events
        this.bindEvents();
    }

    updateView() {
        // Supermarket
        if (this.updateViewCallback) {
            return this.updateViewCallback();
        }

        $(this.options.blockerSelector).show();

        const url = urlUtils.getUrl(); // papathemes: faceted-infinite-scroll mod

        api.getPage(url, this.requestOptions, (err, content) => {
            $(this.options.blockerSelector).hide();

            if (err) {
                throw new Error(err);
            }

            // Refresh view with new content
            this.refreshView(content, url); // papathemes: faceted-infinite-scroll mod

            // kitchenary mod
            hooks.emit('facetedSearch-updateViewComplete', this);
        });
    }

    expandFacetItems($navList) {
        const id = $navList.attr('id');

        // Remove
        this.collapsedFacetItems = _.without(this.collapsedFacetItems, id);
    }

    collapseFacetItems($navList) {
        const id = $navList.attr('id');
        const hasMoreResults = $navList.data('hasMoreResults');

        if (hasMoreResults) {
            this.collapsedFacetItems = _.union(this.collapsedFacetItems, [id]);
        } else {
            this.collapsedFacetItems = _.without(this.collapsedFacetItems, id);
        }
    }

    toggleFacetItems($navList) {
        const id = $navList.attr('id');

        // Toggle depending on `collapsed` flag
        if (this.collapsedFacetItems.includes(id)) {
            this.getMoreFacetResults($navList);
            return true;
        }

        this.collapseFacetItems($navList);

        return false;
    }

    getMoreFacetResults($navList) {
        const facet = $navList.data('facet');
        const facetUrl = urlUtils.getUrl();
        const navListHeight = $navList.height();

        if (this.requestOptions.showMore && $navList.data('loadResult') !== 'on') {
            $(this.options.blockerSelector).show();
            $(this.options.blockerSelector).addClass('loading');
            api.getPage(facetUrl, {
                template: this.requestOptions.showMore,
                params: {
                    list_all: facet,
                },
            }, (err, response) => {
                if (err) {
                    throw new Error(err);
                }

                $navList.html(response);
                if ($('#faceted-search-container').hasClass('_horizontal')) {
                    $navList.css({
                        height: `${navListHeight}px`,
                        marginBottom: '4px',
                    });
                } else {
                    $navList.css({
                        height: `${navListHeight}px`,
                        marginBottom: '50px',
                    });
                }
                $navList.parent().find('.toggleLink').hide();
                $navList.removeAttr('data-count-item');
                $(this.options.blockerSelector).removeClass('loading');
                $(this.options.blockerSelector).hide();
            });
        }

        this.collapseFacetItems($navList);

        return false;
    }


    filterFacetItems(event) {
        const $navList = $(event.currentTarget).parent().next();
        const query = $(event.currentTarget).val().toLowerCase();
        const facet = $navList.data('facet');
        const facetUrl = urlUtils.getUrl();
        const navListHeight = $navList.height();
        if (this.requestOptions.showMore && $navList.data('loadResult') === 'off' && query.length > 0 && !$navList.next().is(':hidden') && !this.load && $navList.next('.toggleLink').length > 0) {
            this.load = true;
            $(this.options.blockerSelector).show();
            api.getPage(facetUrl, {
                template: this.requestOptions.showMore,
                params: {
                    list_all: facet,
                },
            }, (err, response) => {
                if (err) {
                    // eslint-disable-next-line no-console
                    console.error(err);
                    return;
                }
                $navList.html(response);
                if ($('#faceted-search-container').hasClass('_horizontal')) {
                    $navList.css({
                        height: `${navListHeight}px`,
                        marginBottom: '4px',
                    });
                } else {
                    $navList.css({
                        height: `${navListHeight}px`,
                        marginBottom: '50px',
                    });
                }
                $navList.data('loadResult', 'on');
                $(this.options.blockerSelector).hide();
                const $items = $('.navList-item', $navList);
                this.load = false;
                $navList.next().hide();
                $items.each((index, element) => {
                    const text = $(element).text().toLocaleLowerCase();
                    if (text.indexOf(query) !== -1) {
                        $(element).show();
                    } else {
                        $(element).hide();
                    }
                });
            });
        }

        if ($navList.data('loadResult') === 'on' || $navList.next().is(':hidden') || $navList.next('.toggleLink').length === 0) {
            const $items = $('.navList-item', $navList);
            $navList.css('height', `${navListHeight}px`);
            $items.each((index, element) => {
                const text = $(element).text().toLocaleLowerCase();
                if (text.indexOf(query) !== -1) {
                    $(element).show();
                } else {
                    $(element).hide();
                }
            });

            if (query.length <= 0 && $navList.is('[data-count-item]')) {
                $navList.next().show();
                $navList.css({
                    overflowY: 'hidden',
                    marginBottom: '0px',
                });
            } else {
                $navList.next().hide();
                if ($navList.parent().find('.toggleLink').length === 0) {
                    $navList.css('margin-bottom', '0px');
                } else if ($('#faceted-search-container').hasClass('_horizontal')) {
                    $navList.css('margin-bottom', '16px');
                } else {
                    $navList.css('margin-bottom', '50px');
                }
            }
        }
    }

    expandFacet($accordionToggle) {
        const collapsible = $accordionToggle.data('collapsibleInstance');

        collapsible.open();
    }

    collapseFacet($accordionToggle) {
        const collapsible = $accordionToggle.data('collapsibleInstance');

        collapsible.close();
    }

    collapseAllFacets() {
        const $accordionToggles = $(this.options.accordionToggleSelector);

        $accordionToggles.each((index, accordionToggle) => {
            const $accordionToggle = $(accordionToggle);

            this.collapseFacet($accordionToggle);
        });
    }

    expandAllFacets() {
        const $accordionToggles = $(this.options.accordionToggleSelector);

        $accordionToggles.each((index, accordionToggle) => {
            const $accordionToggle = $(accordionToggle);

            this.expandFacet($accordionToggle);
        });
    }

    // Private methods
    initPriceValidator() {
        if ($(this.options.priceRangeFormSelector).length === 0) {
            return;
        }

        const validator = nod();
        const selectors = {
            errorSelector: this.options.priceRangeErrorSelector,
            fieldsetSelector: this.options.priceRangeFieldsetSelector,
            formSelector: this.options.priceRangeFormSelector,
            maxPriceSelector: this.options.priceRangeMaxPriceSelector,
            minPriceSelector: this.options.priceRangeMinPriceSelector,
        };

        Validators.setMinMaxPriceValidation(validator, selectors, this.options.validationErrorMessages);

        this.priceRangeValidator = validator;
    }

    restoreCollapsedFacetItems() {
        const $navLists = $(this.options.facetNavListSelector);

        // Restore collapsed state for each facet
        $navLists.each((index, navList) => {
            const $navList = $(navList);
            const id = $navList.attr('id');
            const shouldCollapse = this.collapsedFacetItems.includes(id);

            if (shouldCollapse) {
                this.collapseFacetItems($navList);
            } else {
                this.expandFacetItems($navList);
            }
        });
    }

    restoreCollapsedFacets() {
        const $accordionToggles = $(this.options.accordionToggleSelector);

        $accordionToggles.each((index, accordionToggle) => {
            const $accordionToggle = $(accordionToggle);
            const collapsible = $accordionToggle.data('collapsibleInstance');
            const id = collapsible.targetId;
            const shouldCollapse = this.collapsedFacets.includes(id);

            if (shouldCollapse) {
                this.collapseFacet($accordionToggle);
            } else {
                this.expandFacet($accordionToggle);
            }
        });
    }

    bindEvents() {
        // Clean-up
        this.unbindEvents();

        // DOM events
        $(window).on('statechange', this.onStateChange);
        $(window).on('popstate', this.onPopState);
        $(document).on('click', this.options.showMoreToggleSelector, this.onToggleClick);
        $(document).on('toggle.collapsible', this.options.accordionToggleSelector, this.onAccordionToggle);
        $(document).on('keyup', this.options.facetedSearchFilterItems, this.filterFacetItems);
        $(this.options.clearFacetSelector).on('click', this.onClearFacet);

        this.bindHorizontalLayoutEvents();

        // papathemes-beautify {{{
        const $minMaxFacets = $('#facetedSearch-navList--maximum-gate-width, #facetedSearch-content--minimum-gate-width');
        if ($minMaxFacets.length > 0) {
            $('.sidebarBlock--findGate').show();
            $minMaxFacets.closest('._accordion-block').hide();
        } else {
            $('.sidebarBlock--findGate').hide();
        }

        const url = Url.parse(urlUtils.getUrl(), true);
        if (url.query._bs_width) {
            const width = Number(url.query._bs_width);
            $('#beautify__findGate-sidebar form [name=_bs_width]').val(width);
        }
        $('#beautify__findGate-sidebar form').off('submit').on('submit', (event) => {
            event.preventDefault();
            this.findGate($(event.target).find('[name=_bs_width]').val());
        });
        // }}}

        // Hooks
        hooks.on('facetedSearch-facet-clicked', this.onFacetClick);
        hooks.on('facetedSearch-range-submitted', this.onRangeSubmit);
        hooks.on('sortBy-submitted', this.onSortBySubmit);
    }

    unbindEvents() {
        // DOM events
        $(window).off('statechange', this.onStateChange);
        $(window).off('popstate', this.onPopState);
        $(document).off('click', this.options.showMoreToggleSelector, this.onToggleClick);
        $(document).off('toggle.collapsible', this.options.accordionToggleSelector, this.onAccordionToggle);
        $(document).off('keyup', this.options.facetedSearchFilterItems, this.filterFacetItems);
        $(this.options.clearFacetSelector).off('click', this.onClearFacet);

        this.unbindHorizontalLayoutEvents();

        // Hooks
        hooks.off('facetedSearch-facet-clicked', this.onFacetClick);
        hooks.off('facetedSearch-range-submitted', this.onRangeSubmit);
        hooks.off('sortBy-submitted', this.onSortBySubmit);
    }

    onClearFacet(event) {
        const $link = $(event.currentTarget);
        const url = $link.attr('href');

        event.preventDefault();
        event.stopPropagation();

        // kitchenary mod {{{

        // Close sidebar callback function
        // only call once
        if (!mediumMediaQueryList.matches && $('._accordion-block', '#facetedSearch').has(event.target).length === 0) {
            const closeSidebar = _.once(() => {
                $('[data-toggle="sidebar-top"]').first().trigger('click');
            });

            // // close the sidebar after 1s timeout
            _.delay(closeSidebar, 2000);

            // Callback function when faceted search view is updated
            const callback = () => {
                closeSidebar();
                hooks.off('facetedSearch-updateViewComplete', callback);
            };

            hooks.on('facetedSearch-updateViewComplete', callback);
        }

        // }}}

        // event.preventDefault();
        // event.stopPropagation();

        // Update URL
        /* MOD by papathemes - supermarket
        ---
        urlUtils.goToUrl(url);
        ---
        */
        const winUrl = Url.parse(window.location.href, true);
        const facetUrl = Url.parse(url, true);
        if (winUrl.query.mode) {
            facetUrl.query.mode = winUrl.query.mode;
        }
        if (winUrl.query.limit) {
            facetUrl.query.limit = winUrl.query.limit;
        }
        urlUtils.goToUrl(Url.format({ pathname: facetUrl.pathname, search: urlUtils.buildQueryString(facetUrl.query) }));
        /* END MOD */
    }

    onToggleClick(event) {
        const $toggle = $(event.currentTarget);
        const $navList = $($toggle.attr('href'));

        // Prevent default
        event.preventDefault();

        // Toggle visible items
        if ($navList.data('loadResult') !== 'on') {
            this.toggleFacetItems($navList);
            $navList.attr('data-load-result', 'on');
        } else {
            $toggle.hide();
            $('.navList-item', $navList).show();
            if ($('#faceted-search-container').hasClass('_horizontal')) {
                $navList.css({
                    overflowY: 'auto',
                    marginBottom: '4px',
                });
            } else {
                $navList.css({
                    overflowY: 'auto',
                    marginBottom: '50px',
                });
            }
            $navList.removeAttr('data-count-item');
        }
    }

    onFacetClick(event, currentTarget) {
        const $link = $(currentTarget);
        const url = $link.attr('href');

        event.preventDefault();

        $link.toggleClass('is-selected');

        // Update URL
        /* MOD by papathemes - supermarket
        ---
        urlUtils.goToUrl(url);
        ---
        */
        const winUrl = Url.parse(window.location.href, true);
        const facetUrl = Url.parse(url, true);
        if (winUrl.query.mode) {
            facetUrl.query.mode = winUrl.query.mode;
        }
        if (winUrl.query.limit) {
            facetUrl.query.limit = winUrl.query.limit;
        }

        urlUtils.goToUrl(Url.format({ pathname: facetUrl.pathname, search: urlUtils.buildQueryString(facetUrl.query) }));
        /* END MOD */

        if (this.options.modalOpen) {
            this.options.modal.close();
        }
    }

    onSortBySubmit(event, currentTarget) {
        const url = Url.parse(window.location.href, true);
        /* MOD by papathemes - supermarket
        ---
        const queryParams = $(currentTarget).serialize().split('=');

        url.query[queryParams[0]] = queryParams[1];
        ---
        */
        const queryParams = $(currentTarget).serializeArray();
        queryParams.forEach(param => {
            url.query[param.name] = param.value;
        });
        /* END MOD */
        delete url.query.page;

        event.preventDefault();
        // eslint-disable-next-line no-param-reassign
        event.isDefaultPrevented = true; // papathemes-supermarket: quick-fixed stencil-utils for sorting ajax request

        urlUtils.goToUrl(Url.format({ pathname: url.pathname, search: urlUtils.buildQueryString(url.query) }));
    }

    onRangeSubmit(event, currentTarget) {
        event.preventDefault();

        if (!this.priceRangeValidator.areAll(nod.constants.VALID)) {
            return;
        }

        /* MOD by papathemes - supermarket
        ---
        const url = Url.parse(window.location.href);
        const queryParams = decodeURI($(currentTarget).serialize());
        ---
        */
        const url = Url.parse(window.location.href, true);
        const queryParamsArray = $(currentTarget).serializeArray();
        queryParamsArray.forEach(param => {
            url.query[param.name] = param.value;
        });
        const queryParams = urlUtils.buildQueryString(url.query);
        /* END MOD */

        urlUtils.goToUrl(Url.format({ pathname: url.pathname, search: `?${queryParams}` }));
    }

    onStateChange() {
        this.updateView();
    }

    onAccordionToggle(event) {
        const $accordionToggle = $(event.currentTarget);
        const collapsible = $accordionToggle.data('collapsibleInstance');
        if (!collapsible) return; // papathemes-supermarket: fix issue when adding disabled-breakpoint to #facetedSearch-navList
        const id = collapsible.targetId;

        if (collapsible.isCollapsed) {
            this.collapsedFacets = _.union(this.collapsedFacets, [id]);
        } else {
            this.collapsedFacets = _.without(this.collapsedFacets, id);
        }
    }

    onPopState() {
        const searchParams = new URLSearchParams(window.location.search);
        // If searchParams does not contain a page value then modify url query string to have page=1
        if (!searchParams.has('page')) {
            const linkUrl = $('.pagination-link').attr('href');
            if (linkUrl) { // Supermarket Fix undefined
                const re = /page=[0-9]+/i;
                const updatedLinkUrl = linkUrl.replace(re, 'page=1');
                window.history.replaceState({}, document.title, updatedLinkUrl);
            }
        }
        $(window).trigger('statechange');
    }

    // papathemes-beautify
    initPriceSlider() {
        $('#facetedSearch[data-beautify-faceted-shop-by-price]').get().map(el => $(el))
            .forEach($facetedSearch => {
                const $shopByPrice = $facetedSearch.find('#facetedSearch-content--price');
                $shopByPrice.data('beautifyShopByPrice', $facetedSearch.data('beautifyFacetedShopByPrice'));
                initShopByPriceSlider($shopByPrice);
            });
    }
}

export default FacetedSearch;
