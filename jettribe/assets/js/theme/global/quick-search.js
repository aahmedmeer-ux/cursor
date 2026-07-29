import _ from 'lodash';
import utils from '@bigcommerce/stencil-utils';
import StencilDropDown from './stencil-dropdown';
import mediaQueryListFactory from '../common/media-query-list'; // papathemes-beautify
import { RecentlySearch, PopularSearch } from '../../papathemes/recently-search';
import suggestKeywords from './suggest-keywords';

// papathemes-beautify
const mediumMediaQueryList = mediaQueryListFactory('medium');

export default function (context) {
    const TOP_STYLING = 'top: 49px;';
    const $quickSearchResults = $('.quickSearchResults');
    const $quickSearchDiv = $('#quickSearch');
    const $searchQuery = $('#search_query');
    const $quickSearchBox = $('.beautify__quickSearch'); // mooncat
    const $quickSearchBar = $('[data-quick-search-bar]'); // mooncat
    const enableSuggestKeywords = context && context.suggest_keywords;

    // papathemes-beautify
    const $body = $('body');
    const $header = $('.header');
    const $quickSearchClose = $('[data-quick-search-close]');

    // mooncat
    const recentlySearch = new RecentlySearch(window.PapathemesMooncatRecentlySearchSettings);
    const popularSearch = new PopularSearch(window.PapathemesMooncatPopularSearchSettings);

    const repositionSearchBoxOnMobile = () => {
        if (mediumMediaQueryList.matches) return;
        // console.log('repositionSearchBoxOnMobile');


        if ($header.css('position') === 'fixed') {
            $header
                .css('transitionDuration', '50ms')
                .css('top', `-${$quickSearchBar.offset().top - $header.offset().top}px`);

            setTimeout(() => $header.css('transition', ''), 100);

            setTimeout(() => {
                $quickSearchDiv
                    .css('top', `${window.scrollY + $quickSearchBar.outerHeight()}px`)
                    .css('height', `calc(100vh - ${$quickSearchBar.outerHeight()}px)`)
                    .scrollTop(0);
            }, 100);
        } else {
            setTimeout(() => {
                window.scrollTo({ top: $quickSearchBar.offset().top, behavior: 'auto' });

                $quickSearchDiv
                    .css('top', `${$header.outerHeight() + $header.position().top}px`)
                    .css('height', `calc(100vh - ${$quickSearchBar.outerHeight()}px)`)
                    .scrollTop(0);
            }, 100);
        }
    };

    const resetSearchBoxPosition = () => {
        // console.log('resetSearchBoxPosition');
        if ($header.css('position') === 'fixed') {
            $header.css('top', '0');
        } else {
            $header.css('top', '');
        }

        $quickSearchDiv
            .css('top', '')
            .css('height', '')
            .css('position', '');
    };

    const stencilDropDownExtendables = {
        hide: () => {
            // $searchQuery.trigger('blur'); // mooncat comment out
            if ($body.hasClass('has-quickSearchOpen')) {
                // papathemes-beautify
                $body.removeClass('has-quickSearchOpen');
                $searchQuery.val('');

                // Clear autocomplete overlay within the current dropdown only
                $quickSearchBox.find('.supermarket__quickSearch-autocomplete').empty();

                // papathemes-supermarket: fix issue when selecting the search text from right to left by mouse
                if ($searchQuery.is(':hidden')) {
                    $searchQuery.trigger('blur');
                }

                resetSearchBoxPosition();

                // mooncat: enable other links outside the quick search form and quick search popup
                _.delay(() => {
                    $quickSearchDiv.siblings().not('.header, .modal').prop('inert', false);
                }, 250);
                // $quickSearchBar.siblings().prop('inert', false);

                $searchQuery.trigger('focus', [{ closing: true }]);

                if ($header.css('position') !== 'fixed') {
                    $header.css('background-position-y', '');
                }
            }
        },
        show: (event) => {
            // $searchQuery.trigger('focus'); // mooncat comment out
            if (typeof event !== 'undefined') { // papathemes: fix for showing dropdown results
                event.stopPropagation();
            }

            // papathemes-beautify {{{
            $body.addClass('has-quickSearchOpen');
            if ($header.css('position') !== 'fixed') {
                $header.css('background-position-y', `-${$header.position().top}px`);
            }

            if (mediumMediaQueryList.matches) {
                // mooncat edited
                if ($header.css('position') === 'fixed') {
                    $quickSearchDiv.css('top', `${window.scrollY + $header.outerHeight()}px`);
                } else {
                    $quickSearchDiv.css('top', `${$header.position().top + $header.outerHeight()}px`);
                }
            } else {
                repositionSearchBoxOnMobile();
            }
            // }}}

            // mooncat: disable other links outside the quick search form and quick search popup
            _.delay(() => {
                $quickSearchDiv.siblings().not('.header, .modal').prop('inert', true);

                // fix popular search list aria-hidden
                popularSearch.fixAriaHiddenIfOpen();
            }, 250);
            // $quickSearchBar.siblings().prop('inert', true);
        },
    };
    const stencilDropDown = new StencilDropDown(stencilDropDownExtendables);
    stencilDropDown.bind($('[data-search="quickSearch"]'), $quickSearchDiv, TOP_STYLING);

    stencilDropDownExtendables.onBodyClick = (e, $container) => {
        // If the target element has this data tag or one of it's parents, do not close the search results
        // We have to specify `.modal-background` because of limitations around Foundation Reveal not allowing
        if ($(e.target).closest('[data-prevent-quick-search-close], .modal-background').length === 0) {
            stencilDropDown.hide($container);
        }

        // Papathemes - Supermarket: close popup if click on the overlay
        if ($(e.target).is('.papathemes-overlay')) {
            stencilDropDown.hide($container);
        }
    };

    // papathemes-supermarket: show/hide loading indicator functions
    const $form = $('[data-search-quick]').closest('form');
    const showLoading = () => {
        $form.addClass('_loading');
    };
    const hideLoading = () => {
        $form.removeClass('_loading');
    };

    // stagger searching for 1200ms after last input
    const debounceWaitTime = 1200;
    const doSearch = (searchQuery) => {
        showLoading(); // papathemes-supermarket
        $quickSearchBox.addClass('loading'); // mooncat
        utils.api.search.search(searchQuery, { template: 'search/quick-results' }, (err, response) => {
            hideLoading(); // papathemes-supermarket
            if (err) {
                return false;
            }

            $quickSearchBox.removeClass('loading'); // mooncat
            $quickSearchResults.html(response);
            stencilDropDown.show($quickSearchDiv); // papathemes: show drop-down results after search results retrieved
            $quickSearchResults.foundation();
            $quickSearchDiv.scrollTop(0);

            // mooncat
            recentlySearch.addKeyword(searchQuery);
            recentlySearch.displayKeywords(searchQuery);
        });
    };
    const doSearchDebounced = _.debounce(doSearch, debounceWaitTime);

    // Initialize suggest keywords feature if enabled (both desktop & mobile)
    if (enableSuggestKeywords) {
        suggestKeywords({
            $dropdown: $quickSearchDiv,
            $searchInputs: $('[data-search-quick]'), // Select all search inputs
            stencilDropDown,
            doSearch,
            context, // Pass context for accessing themeSettings
            popularSearch,
        });
    }

    utils.hooks.on('search-quick', (event, currentTarget) => {
        const searchQuery = $(currentTarget).val();

        // server will only perform search with at least 3 characters
        if (searchQuery.length < 2) {
            return;
        }

        doSearchDebounced(searchQuery);
    });

    // mooncat
    utils.hooks.on('search-quick-immediately', (event, currentTarget) => {
        const searchQuery = $(currentTarget).val();
        doSearch(searchQuery);
    });

    // mooncat: display popup when search input is focused
    $searchQuery.on('focus', (event, { closing = false } = {}) => {
        if (!closing) {
            stencilDropDown.show($quickSearchDiv);
        }
    });

    $searchQuery.on('blur', () => {
        if ($body.hasClass('has-quickSearchOpen')) {
            repositionSearchBoxOnMobile();
        }
    });


    // Catch the submission of the quick-search
    // $quickSearchDiv.on('submit', (event) => { // papathemes fix bug don't stop form submit
    $searchQuery.closest('form').on('submit', (event) => {
        const searchQuery = $(event.currentTarget).find('input').val();

        if (searchQuery.length === 0) {
            return event.preventDefault();
        }

        return true;
    });

    // mooncat: improve accessibility
    // Close the dropdown when pressing the escape key in the quick search dropdown
    $quickSearchDiv.on('keydown', (event) => {
        if (event.key === 'Escape') {
            stencilDropDown.hide($quickSearchDiv);
        }
    });

    // Add a hidden close button to close the dropdown when focus
    $quickSearchDiv
        .append('<a href="#" class="_a10yClose is-srOnly">Close</a>')
        .find('._a10yClose').on('click focus keydown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            stencilDropDown.hide($quickSearchDiv);
        });

    // papathemes-beautify
    $quickSearchClose.on('click', () => stencilDropDown.hide($quickSearchDiv));

    // Supermarket: close quick search when InstantLoad finish loading
    $('body').on('loaded.instantload', () => stencilDropDown.hide($quickSearchDiv));

    // close quick search when breakpoint change
    mediumMediaQueryList.addListener(() => {
        if ($body.hasClass('has-quickSearchOpen')) {
            stencilDropDown.hide($quickSearchDiv);
            if ($searchQuery.is(':focus')) {
                $searchQuery.trigger('blur');
            }
        }
    });
}
