import mediaQueryListFactory from '../theme/common/media-query-list';
import initProductLoadMore from './product-left-sidebar';

const mediumMediaQueryList = mediaQueryListFactory('medium');

/**
 * Corrects the focus order for ADA compliance in the header section when the logo is centered or left.
 * The function ensures that focusable elements in the header are navigated in a logical,
 * top-to-bottom, left-to-right order. It dynamically adds hidden links for screen readers
 * and keyboard users to navigate between the logo and the search bar.
 *
 * @param {Object} context - The context object containing configuration information.
 * @param {string} context.logo_position - Specifies the position of the logo. If set to 'center',
 *                                         the function will adjust focus and tab index behavior
 *                                         for proper navigation order.
 *
 * @example
 * const context = {
 *     logo_position: 'center',
 * };
 * fixADAHeaderTabIndex(context);
 *
 * @returns {void}
 */
function fixADAHeaderTabIndex(context) {
    if (context.logo_position === 'center') {
        const $searchBar = $('[data-quick-search-bar]');
        const $quickSearchSubmitBtn = $searchBar.find('button[type="submit"]');
        const $quickSearchInput = $('#search_query');
        const $goToLogo = $('<a href="#" class="is-srOnly u-hideMobile u-hideTablet u-hideWhenQuickSearchOpened">Go to logo</a>').insertAfter($quickSearchSubmitBtn);
        const $header = $('#dinosaur_header');
        const $headerLogoLink = $header.find('.header-logo a');
        const $goToSearch = $('<a href="#" class="is-srOnly u-hideMobile u-hideTablet u-hideWhenQuickSearchOpened">Go to search</a>').prependTo($searchBar.parent());
        const $ignoreSearch = $('<a href="#" class="is-srOnly u-hideMobile u-hideTablet u-hideWhenQuickSearchOpened">Ignore search</a>').insertBefore($searchBar);

        // Focus the logo link when 'Go to logo' is focused
        $goToLogo.on('focus', () => {
            $headerLogoLink.trigger('focus');
        });

        // Focus the search input when 'Go to search' is focused
        $goToSearch.on('focus', () => {
            $quickSearchInput.trigger('focus');
        });

        // Temporarily disable the search bar when 'Ignore search' is focused,
        // allowing the user to skip over it and focus on the next element in the focus order
        $ignoreSearch
            .on('focus', () => {
                $searchBar.attr('inert', 'true');
            })
            .on('blur', () => {
                $searchBar.removeAttr('inert');
            });
    } else if (context.logo_position === 'left') {
        const $navUser1 = $('#dinosaur_nav_user_1');
        const $navUser2 = $('#dinosaur_nav_user_2');
        const $searchBar = $('[data-quick-search-bar]');
        const $quickSearchSubmitBtn = $searchBar.find('button[type="submit"]');
        const $quickSearchInput = $('#search_query');
        const $goToSearch = $('<a href="#" class="is-srOnly u-hideMobile u-hideTablet u-hideWhenQuickSearchOpened">Go to search</a>').insertAfter($navUser1);
        const $goToNavUser2 = $('<a href="#" class="is-srOnly u-hideMobile u-hideTablet u-hideWhenQuickSearchOpened">Go to user 2</a>').insertAfter($quickSearchSubmitBtn);
        const $ignoreSearch = $('<a href="#" class="is-srOnly u-hideMobile u-hideTablet u-hideWhenQuickSearchOpened">Ignore search</a>').insertBefore($searchBar);

        // Focus the quick search input when 'Go to search' is focused
        $goToSearch.on('focus', () => {
            $quickSearchInput.trigger('focus');
        });

        // Focus the first element of the second navUser when 'Go to user 2' is focused
        $goToNavUser2.on('focus', () => {
            $navUser2.find('a, button').filter(':visible').first().trigger('focus');
        });

        // Temporarily disable the search bar when 'Ignore search' is focused,
        // allowing the user to skip over it and focus on the next element in the focus order
        $ignoreSearch
            .on('focus', () => {
                $searchBar.attr('inert', 'true');
            })
            .on('blur', () => {
                $searchBar.removeAttr('inert');
            });
    }
}

function toggleFooterInfo() {
    const $handlers = $('[data-dinosaur-footer-collapsible-handler]');
    const $contents = $('[data-dinosaur-footer-collapsible-content]');

    $handlers.on('click keydown', event => {
        if (event.type === 'click') {
            event.preventDefault();
        }

        if (!mediumMediaQueryList.matches) {
            if (event.type === 'keydown' && event.code !== 'Enter') {
                return;
            }

            event.preventDefault();
            const $target = $(event.target);
            const $parent = $target.closest('[data-dinosaur-footer-collapsible]');
            const $close = $parent.find('[data-close]');
            const $open = $parent.find('[data-open]');
            const $footerInfo = $parent.find('[data-dinosaur-footer-collapsible-content]');

            const isOpen = $footerInfo.hasClass('is-open');

            $close.toggleClass('is-open', !isOpen);
            $open.toggleClass('is-open', isOpen);

            if (isOpen) {
                $footerInfo.slideUp(200, () => {
                    $footerInfo.removeClass('is-open').attr('aria-hidden', 'true').css('display', '');
                    $target.attr('aria-expanded', 'false');
                });
            } else {
                $footerInfo.slideDown(200, () => {
                    $footerInfo.addClass('is-open').attr('aria-hidden', 'false').css('display', '');
                    $target.attr('aria-expanded', 'true');
                });
            }
        }
    });

    const check = () => {
        if (mediumMediaQueryList.matches) {
            $handlers.removeAttr('href').removeAttr('aria-expanded');
            $handlers.find('[data-open]').removeClass('is-open');
            $handlers.find('[data-close]').addClass('is-open');
            $contents.removeAttr('aria-hidden').addClass('is-open');
        } else {
            $handlers.attr('href', '#').attr('aria-expanded', 'false');
            $handlers.find('[data-open]').addClass('is-open');
            $handlers.find('[data-close]').removeClass('is-open');
            $contents.attr('aria-hidden', 'true').removeClass('is-open');
        }
    };

    mediumMediaQueryList.addListener(check);
    check();
}

function toggleCategoryDropdown() {
    const $dropdownButton = $('[data-dinosaur-category-collapsible]');
    const $body = $('body');

    const closeDropdown = () => {
        $('[data-dinosaur-category-list].is-open').removeClass('is-open');
    };

    // Event handler for dropdown button clicks and keydowns
    const handleDropdownToggle = e => {
        // Allow anchor tags to function as expected
        if (e.target.tagName === 'A') return;

        // Only process Enter key in keydown event
        if (e.type === 'keydown' && e.key !== 'Enter') return;

        e.preventDefault();
        const $target = $(e.currentTarget);
        const $nav = $target.find('[data-dinosaur-category-list]');

        // Close other open dropdowns
        closeDropdown();

        // Toggle the clicked dropdown
        $nav.toggleClass('is-open');
    };

    $dropdownButton.on('click keydown', handleDropdownToggle);

    // Close dropdown if clicking outside
    $body.on('click.toggleDropdown', e => {
        if (!$(e.target).closest('[data-dinosaur-category-collapsible]').length) {
            closeDropdown();
        }
    });

    $dropdownButton.on('keydown', e => {
        if (e.key === 'Escape') {
            closeDropdown();
        }
    });

    $('[data-dinosaur-category-list]').on('focusout', function handleFocusOut(event) {
        const $this = $(this);
        const relatedTarget = event.relatedTarget;
        if (relatedTarget && !$this.has(relatedTarget).length) {
            closeDropdown();
        }
    });
}

export default function (context) {
    fixADAHeaderTabIndex(context);
    toggleFooterInfo();

    if (context.enableHomePageSidebar) {
        toggleCategoryDropdown();
        initProductLoadMore({
            context,
        });
    }
}
