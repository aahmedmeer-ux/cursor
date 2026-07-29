import $ from 'jquery';
import { debounce } from 'lodash';
import ajaxAddToCart from './ajax-addtocart';
import collapsibleFactory from '../theme/common/collapsible';
import { bindNavPagesCheckRightEdge } from './theme-utils';
import mediaQueryListFactory from '../theme/common/media-query-list';
import newsletterPopup from './newsletter-popup';
import cartPopupRemove from './cart-popup-remove';
import utils from '@bigcommerce/stencil-utils';
import { initRecentlyViewedProductsSection, initRecentlyViewedProductsDropdown } from './recently-viewed-products';
import initCartSuggestedProducts from './cart-suggested-products';
import initPopupLink from './popup';
import initBlogPostModal from './blog-post-modal';
import initLoginPopup from './login-popup';

export default function (context) {
    const mq = mediaQueryListFactory('medium');

    ajaxAddToCart(context);

    // ------------------------------------------------------------------------
    // Recently Viewed Products Section
    // ------------------------------------------------------------------------
    if (document.querySelector('[data-recently-viewed-products-section]')) {
        initRecentlyViewedProductsSection(context);
    }

    // ------------------------------------------------------------------------
    // Sticky header
    // ------------------------------------------------------------------------

    const $stickyMenus = $('[data-stickymenu]');
    if ($stickyMenus.length > 0) {
        $stickyMenus.each((i, el) => {
            $(el).data('papathemesOriginalTop', $(el).offset().top)
                .after('<div class="papathemes-stickymenu-placeholder"></div>')
                .next().height($(el).outerHeight());
        });

        $(window)
            .on('scroll', debounce(() => {
                if (!mq || !mq.matches) {
                    $stickyMenus.removeClass('is-sticky');
                    return;
                }

                $stickyMenus.each((i, el) => {
                    if ($(window).scrollTop() > $(el).data('papathemesOriginalTop')) {
                        $(el).addClass('is-sticky');
                    } else {
                        $(el).removeClass('is-sticky');
                    }
                });
            }, 10))

            .on('resize', debounce(() => {
                $stickyMenus.each((i, el) => {
                    $(el).removeClass('is-sticky');

                    $(el).data('papathemesOriginalTop', $(el).offset().top);
                });
            }, 100));
    }

    // ------------------------------------------------------------------------
    // Enable data-collapsible globally
    // ------------------------------------------------------------------------

    collapsibleFactory();

    // ------------------------------------------------------------------------
    // Fix stencil-utils SortByHook calls native form.submit() when '[data-sort-by] select' changed
    // ------------------------------------------------------------------------

    utils.hooks.on('sortBy-select-changed', (event, target) => {
        if (!event.isDefaultPrevented) {
            $(target).closest('form').each((i, form) => {
                utils.hooks.emit('sortBy-submitted', event, form);
            });
        }
    });

    // ------------------------------------------------------------------------
    // Instant Load Pages
    // ------------------------------------------------------------------------
    if (context.instantload && !window.previewSdk) {
        import('./instant-load').then(module => {
            module.default(context);
        });
    }

    // ------------------------------------------------------------------------
    // Cart Suggested Products
    // ------------------------------------------------------------------------
    if (document.querySelector('[data-cart-suggested-products]')) {
        initCartSuggestedProducts(context);
    }

    // ------------------------------------------------------------------------
    // Scroll to Top button
    // ------------------------------------------------------------------------
    const $scrollToTopFloatingButton = $('#scrollToTopFloatingButton');
    let scrollToTopFloatingButtonShowing = false;

    if ($scrollToTopFloatingButton.length > 0) {
        $(window).one('scroll', () => {
            import('scroll-to-element').then(module => {
                $scrollToTopFloatingButton.on('click', () => {
                    module.default($scrollToTopFloatingButton.attr('href'), {
                        duration: 300,
                    });
                });
            });
        });

        $(window).on('scroll', debounce(() => {
            if (!mq || !mq.matches) {
                if (scrollToTopFloatingButtonShowing) {
                    $scrollToTopFloatingButton.addClass('u-hiddenVisually');
                    scrollToTopFloatingButtonShowing = false;
                }
                return;
            }

            if (!scrollToTopFloatingButtonShowing && $(window).scrollTop() > 500) {
                $scrollToTopFloatingButton.removeClass('u-hiddenVisually');
                scrollToTopFloatingButtonShowing = true;
            } else if (scrollToTopFloatingButtonShowing && $(window).scrollTop() <= 500) {
                $scrollToTopFloatingButton.addClass('u-hiddenVisually');
                scrollToTopFloatingButtonShowing = false;
            }
        }, 500));
    }

    // ------------------------------------------------------------------------
    // Main Menu UI improvement
    // ------------------------------------------------------------------------
    if (context.navPages_animation !== '' && context.navPages_animation !== 'no') {
        bindNavPagesCheckRightEdge(mq);
    }

    // ------------------------------------------------------------------------
    // Init Newsletter Popup
    // ------------------------------------------------------------------------
    if ($('#newsletterPopupModal').length > 0) {
        newsletterPopup(context);
    }

    // ------------------------------------------------------------------------
    // Init Popup Links
    // ------------------------------------------------------------------------
    initPopupLink(context);

    // ------------------------------------------------------------------------
    // Init Shopping Modal
    // ------------------------------------------------------------------------
    initBlogPostModal(context);

    // ------------------------------------------------------------------------
    // Init Login Popup
    // ------------------------------------------------------------------------
    initLoginPopup(context);

    // ------------------------------------------------------------------------
    // Init Cart Popup remove item button
    // ------------------------------------------------------------------------
    cartPopupRemove();

    // ------------------------------------------------------------------------
    // Init Recently Viewed Products Dropdown
    // ------------------------------------------------------------------------
    initRecentlyViewedProductsDropdown(context);

    // ------------------------------------------------------------------------
    // Init Recently Viewed Products & Cart Suggested Products in the Preview Cart popup
    // ------------------------------------------------------------------------
    $('body').on('cartpreviewshown', (event, $dropdown) => {
        const $rvp = $dropdown.find('[data-recently-viewed-products-section]');
        if ($rvp.length > 0) {
            initRecentlyViewedProductsSection(context, $rvp);
        }
        const $csp = $dropdown.find('[data-cart-suggested-products]');
        if ($csp.length > 0) {
            initCartSuggestedProducts(context, $csp);
        }
    });
}
