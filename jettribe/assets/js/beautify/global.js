import { throttle, debounce } from 'lodash';
import utils from '@bigcommerce/stencil-utils';
import mobileMenuToggleFactory from '../theme/global/mobile-menu-toggle';
import mediaQueryListFactory from '../theme/common/media-query-list';
import { inert } from '../papathemes/utils';
import initPopularBrands from '../kitchenary/featured-brands';

const isTopInViewport = (elem) => {
    const distance = elem.getBoundingClientRect();
    return (
        distance.top >= 0 &&
        distance.top <= (window.innerHeight || document.documentElement.clientHeight)
    );
};

const mediumMediaQueryList = mediaQueryListFactory('medium');

function inhealth() {
    const animateMarquee = el => {
        const $el = $(el);
        if (el.scrollWidth <= Math.round($el.outerWidth()) + 5) {
            return;
        }
        const speed = (el.scrollWidth - $el.scrollLeft() - Math.round($el.outerWidth())) / el.scrollWidth * 8000;
        $el.stop().animate({
            opacity: 1,
        }, 1000, () => {
            $el.animate({
                scrollLeft: el.scrollWidth - Math.round($el.outerWidth()),
            }, speed, 'linear', () => {
                $el.animate({
                    opacity: 0,
                }, 1000, () => {
                    $el.scrollLeft(0);
                    $el.animate({
                        opacity: 1,
                    }, 500, () => {
                        animateMarquee(el);
                    });
                });
            });
        });
    };
    $(window).on('resize load', debounce(() => {
        $('[data-marquee]').get().filter(el => isTopInViewport(el)).forEach(el => animateMarquee(el));
    }, 500));
    $('body').on('touchstart', () => {
        $('[data-marquee]').stop();
    });
    $('body').on('touchend', () => {
        $('[data-marquee]').get().filter(el => isTopInViewport(el)).forEach(el => animateMarquee(el));
    });
}

function initSidebar() {
    const $sidebarTop = $('#sidebar-top');
    const $sidebarTopToggle = $('[data-toggle="sidebar-top"]');
    const $body = $('body');

    const onBodyClick = (event) => {
        if ($(event.target).closest('#sidebar-top, [data-toggle="sidebar-top"]').length === 0) {
            $sidebarTopToggle.filter(':visible').first().trigger('click');
        }
    };

    const onOpenSidebar = (event, $toggle) => {
        $('body').addClass('has-sidebarTopOpened');
        setTimeout(() => {
            // papathemes-inhealth: Accessibility - Make other elements not focusable
            inert($sidebarTop);
            $sidebarTop.data('lastToggle', $toggle);
            $sidebarTop.find('a,button[tabindex!="-1"]').first().each((i, el) => el.focus());
            $sidebarTop.prop('inert', false);
            $sidebarTop.prev().prop('inert', false);
            $('._close', $sidebarTop).focus();
        }, 300);

        $body.on('click', onBodyClick);
    };

    const onCloseSidebar = () => {
        $('body').removeClass('has-sidebarTopOpened');
        setTimeout(() => {
            // papathemes-inhealth: Accessibility - Make other elements not focusable
            inert($sidebarTop, false);
            const $toggle = $sidebarTop.data('lastToggle');
            if ($toggle) {
                $toggle.get(0).focus();
                $sidebarTop.data('lastToggle', null);
            }
            $sidebarTop.prop('inert', true);
        }, 300);

        $body.off('click', onBodyClick);
    };

    const closeSidebarOnDesktop = () => {
        if (mediumMediaQueryList.matches) {
            if ($sidebarTop.hasClass('is-open')) {
                $sidebarTopToggle.first().trigger('click');
            }
            setTimeout(() => {
                $sidebarTop.prop('inert', false);
            }, 300);
        }
    };

    const lockSidebar = () => {
        if (!mediumMediaQueryList.matches) {
            $sidebarTop.prop('inert', true);
        }
    };

    $sidebarTop
        .on('open.toggle', onOpenSidebar)
        .on('close.toggle', onCloseSidebar)
        .on('keydown', (event) => {
            if (event.key === 'Escape') {
                $sidebarTopToggle.filter(':visible').first().trigger('click');
                setTimeout(() => {
                    $sidebarTopToggle.filter(':visible').focus();
                }, 300);
            }
        });

    lockSidebar();
    mediumMediaQueryList.addListener(closeSidebarOnDesktop);
}

function fixMobileMenuShiftedWhenClickCollapsible() {
    const $el = $('#bf-fix-menu-mobile');
    // eslint-disable-next-line no-unused-vars
    const el = $el.get(0);
    let openEl;
    // eslint-disable-next-line no-unused-vars
    let openElTop;

    $el.on('open.collapsible', '.navPages-item > .navPages-action-toggle', (event) => {
        openEl = event.target;
        openElTop = $(openEl).offset().top;
    });

    $el.on('close.collapsible', '.navPages-item > .navPages-action-toggle', () => {
        if (mediumMediaQueryList.matches || !openEl) {
            return;
        }
        const relY = $(openEl).offset().top - $el.offset().top + el.scrollTop;
        const scrollTop = relY - openElTop + $el.offset().top;
        el.scrollTop = Math.max(0, scrollTop);
    });
}

export default function (context) {
    const $body = $('body');
    const $menuToggle = $('[data-mobile-menu-toggle]');
    const $searchToggle = $('[data-mobile-search-toggle]');
    const $quickSearch = $('.papathemes-quickSearch');
    const mobileMenu = mobileMenuToggleFactory();

    initPopularBrands(context);

    // Init Card Color Swatches & Card Quantity Box
    const showSwatches = context.card_show_swatches;
    const shouldUpdateMinMaxQty = context.show_cart_action && context.card_show_qty;
    if ((showSwatches || shouldUpdateMinMaxQty || context.card_show_countdown || context.card_show_variantImg || context.card_show_priceCall || context.product_sale_badges) && context.graphQLToken) {
        import('../papathemes/card-swatches/ProductSwatches').then(({ default: ProductSwatches }) => new ProductSwatches({
            showSwatches,
            shouldUpdateMinMaxQty,
            graphQLToken: context.graphQLToken,
            imageSize: context.productgallery_size,
            includeOptions: context.card_swatch_name.split(',').map(s => s.trim()).filter(s => s !== ''),
            showCountdown: context.card_show_countdown,
            enableVariantImages: context.card_show_variantImg,
            showPriceCall: context.card_show_priceCall,
            txtSaleCountdownJSON: context.txtSaleCountdownJSON,
            productSaleBadges: context.product_sale_badges,
            currencyCode: context.currencyCode,
            showRrp: context.show_rrp,
            productSaleLabel: context.product_sale_label,
        }));
    }

    const stickyHeader = () => {
        const threshold = 100;

        $('[data-sticky-header]').not('.sticky-header-loaded').each((i, el) => {
            const $el = $(el).addClass('sticky-header-loaded', true);
            const $placeholder = $('<div class="stickyHeader-placeholder"></div>').show().css('height', $el.outerHeight()).insertAfter($el);
            let lastScrollTop = 0;

            const onScroll = throttle((_event) => {
                // Stop if body's overflow is hidden to prevent scroll event body's height is changed
                if ($body.css('overflow') === 'hidden') return;

                const st = window.pageYOffset || document.documentElement.scrollTop; // Credits: "https://github.com/qeremy/so/blob/master/so.dom.js#L426"
                const headerHeight = $el.outerHeight();
                const placeholderTop = $placeholder.offset().top;
                let ignoreUpdateLastScrollTop = false;

                if (st > lastScrollTop) {
                    // scroll down
                    if (st > placeholderTop + headerHeight + threshold) {
                        if (!$el.hasClass('_scrollDown')) {
                            $('#login-popup, #login-dropdown-navLeft, login-dropdown-navRight, #popup-overlay', $el).removeClass('is-open');
                            $el.removeClass('_scrollUp').addClass('_scrollDown');
                            $el.one('transitionend', () => {
                                // still scroll down?
                                if ($el.hasClass('_scrollDown')) {
                                    $el.addClass('_shadow');
                                    $el.css({
                                        top: -$el.outerHeight(),
                                        position: 'absolute',
                                        transition: 'none',
                                        width: '100%',
                                    });
                                    $el.stop().animate({}, 10, () => {
                                        $el.css({
                                            transition: '',
                                        });
                                    });
                                }
                            }).css({
                                top: -$el.outerHeight(),
                            });
                        }
                    }
                } else if (!$body.hasClass('_skipCheckScrollUpStickyHeader')) {
                    // scroll up
                    // eslint-disable-next-line no-lonely-if
                    if (st > placeholderTop + headerHeight && lastScrollTop - st > threshold) {
                        $el.removeClass('_scrollDown').addClass('_shadow');
                        if (!$el.hasClass('_scrollUp')) {
                            $el.addClass('_scrollUp');
                            $el.css({
                                top: -$el.outerHeight(),
                                position: '',
                                transition: 'none',
                                'background-position-y': `-${placeholderTop}px`,
                            });
                            $el.stop().animate({}, 10, () => {
                                $el.css({
                                    top: 0,
                                    transition: '',
                                    width: '',
                                });
                            });
                        }
                    } else if (st <= placeholderTop) {
                        $el.removeClass('_shadow _scrollDown').css({
                            top: '',
                            position: '',
                            width: '',
                        });
                    } else if ($el.hasClass('_shadow') && $el.offset().top < 0) {
                        $el.removeClass('_shadow _scrollDown').css({
                            top: '',
                            position: '',
                            width: '',
                        });
                    } else {
                        ignoreUpdateLastScrollTop = true;
                    }
                }


                if (!ignoreUpdateLastScrollTop) {
                    lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
                }
            }, 100, { leading: false });

            const onResize = throttle(() => {
                const headerHeight = $el.outerHeight();
                $placeholder.css('height', headerHeight);
                $el.css('background-position-y', `-${$placeholder.offset().top}px`);
            }, 300, { leading: false });

            $(window).on('scroll', onScroll);
            $(window).on('resize', onResize);
        });
    };

    $menuToggle.on('click', (event) => {
        event.preventDefault();
        $searchToggle.removeClass('is-open');
        $quickSearch.removeClass('is-open');
    });

    $searchToggle.on('click', (event) => {
        event.preventDefault();
        if (mobileMenu.isOpen) {
            mobileMenu.hide();
        }
        $searchToggle.toggleClass('is-open');
        $quickSearch.toggleClass('is-open');
    });

    stickyHeader();

    $('body').on('click', '[data-toggle]', (event) => {
        event.preventDefault();

        const $el = $(event.currentTarget);
        const id = $el.data('toggle');
        const $otherEls = $(`[data-toggle=${id}]`).not($el);
        const $target = $(`#${id}`);

        $el.toggleClass('is-open');

        if ($el.hasClass('is-open')) {
            $el.attr('aria-expanded', true);
            $target.addClass('is-open').attr('aria-hidden', false);
            $otherEls.addClass('is-open').attr('aria-expanded', true);
            $target.trigger('open.toggle', [$el]);
        } else {
            $el.attr('aria-expanded', false);
            $target.removeClass('is-open').attr('aria-hidden', true);
            $otherEls.removeClass('is-open').attr('aria-expanded', false);
            $target.trigger('close.toggle', [$el]);
        }

        if ($el.is('[data-toggle-anchor]')) {
            $('html, body').animate({
                scrollTop: $target.offset().top,
            });
        }
    });

    initSidebar();

    fixMobileMenuShiftedWhenClickCollapsible();

    // --------------------------------------------------------------------------------------------
    // Product Card quantity input changes
    // --------------------------------------------------------------------------------------------
    $('body').on('click', '[data-card-quantity-change] button', event => {
        event.preventDefault();
        const $target = $(event.currentTarget);
        const $input = $target.closest('[data-card-quantity-change]').find('input');
        const name = $input.attr('name');
        const lastVal = $input.val();
        const quantityMin = parseInt($input.data('quantityMin'), 10) || 1;
        const quantityMax = parseInt($input.data('quantityMax'), 10) || Infinity;
        const minmax = _qty => Math.max(Math.min(_qty, quantityMax), quantityMin);
        const allowZero = $input.attr('min') === '0';

        let qty = parseInt(lastVal, 10);
        if (Number.isNaN(qty)) {
            qty = quantityMin || 1;
        }

        if ($target.data('action') === 'inc') { // If action is incrementing
            qty = minmax(qty + 1);
        } else if ($target.data('action') === 'dec') { // if action is decrementing
            if (qty - 1 < quantityMin) {
                if (allowZero) {
                    qty = 0;
                } else {
                    qty = quantityMin;
                }
            } else {
                qty = minmax(qty - 1);
            }
        }

        $input.val(String(qty));

        // also update other inputs if same name
        if (name) $('[data-card-quantity-change] input').filter((_i, el) => el.name === name).val(String(qty));

        if ($input.val() !== lastVal) {
            $input.trigger('change');
        }
    });

    // Limit quantity input to min and max values
    $('body').on('change', '[data-card-quantity-change] input', event => {
        const $input = $(event.currentTarget);
        const name = $input.attr('name');
        const lastVal = $input.val();
        const qty = parseInt(lastVal, 10);
        const quantityMin = parseInt($input.data('quantityMin'), 10) || 1;
        const quantityMax = parseInt($input.data('quantityMax'), 10) || Infinity;
        const minmax = _qty => Math.max(Math.min(_qty, quantityMax), quantityMin);
        const allowZero = $input.attr('min') === '0';
        const newQty = String(qty < quantityMin && allowZero ? 0 : minmax(qty));

        $input.val(newQty);

        // also update other inputs if same name
        if (name) $('[data-card-quantity-change] input').filter((_i, el) => el.name === name).val(newQty);

        if ($input.val() !== lastVal) {
            $input.trigger('change');
        }
    });

    // --------------------------------------------------------------------------------------------
    // Product Cart cart-footer focus visibility
    // --------------------------------------------------------------------------------------------
    function checkCardFooterFocus(event) {
        let $cardFooter = $(event.target).filter('.card-footer, .card-figure--button');
        if ($cardFooter.length === 0) {
            $cardFooter = $(event.target).closest('.card-footer, .card-figure--button');
        }
        if ($cardFooter.length > 0) {
            if (event.type === 'focusin') {
                $cardFooter.addClass('_focus');
            } else {
                $cardFooter.removeClass('_focus');
            }
        }
    }
    $('body').attr('tabindex', 0).on('focus blur', '*', checkCardFooterFocus);
    $('body').on('init reInit', '[data-slick]', (_event, slick) => {
        slick.$slides.on('focus blur', '*', checkCardFooterFocus);
    });
    $('[data-slick] .slick-slide').on('focus blur', '*', checkCardFooterFocus);


    // --------------------------------------------------------------------------------------------
    // brand quick view
    // --------------------------------------------------------------------------------------------
    $('body').on('click', '[data-brand-quick-view]', (event) => {
        const $button = $(event.currentTarget);
        const $brand = $button.closest('.brand');
        $button.toggleClass('is-open');
        const isOpen = $button.hasClass('is-open');
        if (isOpen) {
            $brand.addClass('is-open');
            utils.api.getPage($button.data('brandQuickView'), { template: 'beautify/bottom-banner' }, (err, resp) => {
                $brand.find('[data-brand-quick-view-body]').html(resp);
            });
        } else {
            $brand.removeClass('is-open');
        }
        $('[data-brand-quick-view].is-open').not(event.currentTarget).each((i, el) => {
            $(el).removeClass('is-open');
            $(el).closest('.brand').removeClass('is-open');
        });
    });

    inhealth();
}
