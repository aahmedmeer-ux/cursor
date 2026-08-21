/* eslint-disable camelcase */
import collapsibleFactory from '../theme/common/collapsible';

let resumeStickyHeader;

export function autoExpandCategoryMenu(context) {
    // papathemes-beautify edited
    let $curMenuItem;

    if (context.pageType === 'product') {
        const url = $('.breadcrumbs .breadcrumb.is-active').prev().find('a').attr('href');
        if (url) {
            $curMenuItem = $('#papathemes-verticalCategories-sidebar').find(`a.navPages-action[href='${url}']`);
        }
    } else {
        $curMenuItem = $('[data-current-category]');
    }

    if ($curMenuItem && $curMenuItem.length > 0) {
        const collapsibles = [];

        if ($curMenuItem.attr('data-collapsible')) {
            collapsibles.push($curMenuItem);
        }

        $curMenuItem.parents('.navPage-childList, .navPage-subMenu').prev('[data-collapsible]').each((i, el) => {
            collapsibles.push(el);
        });

        $.each(collapsibleFactory(collapsibles), (i, o) => {
            o.open();
        });

        // scrollToElement('[data-current-category]', { align: 'middle' });
    }
}

export function bindNavPagesCheckRightEdge(mediaQuery) {
    $('.navPages').on('mouseenter', '.navPages-item', event => {
        if (!mediaQuery || !mediaQuery.matches) {
            return;
        }

        // if ($('.navPages').hasClass('_hasMegamenu')) {
        //     return;
        // }

        const $hoverEl = $(event.currentTarget);

        $hoverEl.children('.navPage-subMenu').each((i, submenu) => {
            const $submenu = $(submenu);

            if ($submenu.offset().left + $submenu.outerWidth() > $(window).width()) {
                // if ($('.navPages').hasClass('_hasMegamenu')) {
                //     return;
                // }
                $submenu
                    .addClass('toLeft')
                    // .css('left', `${$hoverEl.position().left + $hoverEl.width() - $submenu.width()}px`);
                    .css('left', `${$(window).width() - $submenu.outerWidth() - $hoverEl.position().left}px`);
                $submenu.closest('.navPages-item').addClass('toLeft'); // papathemes-beautify
            }
        });
    });

    $('.navPages-item--page').on('keydown', '.navPages-action-toggle-desktop', event => {
        if (!mediaQuery || !mediaQuery.matches) {
            return;
        }

        if (event.which === 13) {
            const $tabEl = $(event.currentTarget).closest('.navPages-item');

            $tabEl.children('.navPage-subMenu').each((i, submenu) => {
                const $submenu = $(submenu);

                if ($tabEl.offset().left + $submenu.outerWidth() > $(window).width()) {
                    $submenu
                        .addClass('toLeft')
                        .css('left', `${$(window).width() - $submenu.outerWidth() - $tabEl.position().left}px`);
                    $submenu.closest('.navPages-item').addClass('toLeft'); // papathemes-beautify
                }
            });
        }
    });

    $('.navPages').on('mouseleave', '.navPages-item', event => {
        if (!mediaQuery || !mediaQuery.matches) {
            return;
        }

        const $hoverEl = $(event.currentTarget);

        $hoverEl.children('.navPage-subMenu').each((i, submenu) => {
            const $submenu = $(submenu);

            $submenu
                .removeClass('toLeft')
                .css('left', '');
            $submenu.closest('.navPages-item').removeClass('toLeft'); // papathemes-beautify
        });
    });

    $('.navPages').on('mouseenter', '.navPage-subMenu-item, .navPage-childList-item', event => {
        if (!mediaQuery || !mediaQuery.matches) {
            return;
        }

        const $hoverEl = $(event.currentTarget);

        $hoverEl.children('.navPage-childList').each((i, submenu) => {
            const $submenu = $(submenu);
            const isParentToLeft = $submenu.parent().closest('.navPage-childList, .navPage-subMenu').hasClass('toLeft');
            if (isParentToLeft || $submenu.offset().left + $submenu.outerWidth() > $(window).width()) {
                $submenu.addClass('toLeft');
            }
            if ($submenu.offset().left + $submenu.outerWidth() < 10) {
                $submenu.removeClass('toLeft');
            }
        });
    });

    $('.navPage-subMenu-item').on('keydown', '.navPages-action-toggle-desktop', event => {
        if (!mediaQuery || !mediaQuery.matches) {
            return;
        }

        if (event.which === 13) {
            const $hoverEl = $(event.currentTarget).closest('.navPage-subMenu-item');

            $hoverEl.children('.navPage-childList').each((i, submenu) => {
                const $submenu = $(submenu);
                const isParentToLeft = $submenu.parent().closest('.navPage-childList, .navPage-subMenu').hasClass('toLeft');

                if (isParentToLeft || $hoverEl.offset().left + $submenu.outerWidth() * 2 > $(window).width()) {
                    $submenu.addClass('toLeft');
                }
            });
        }
    });

    $('.navPages').on('mouseleave', '.navPage-subMenu-item, .navPage-childList-item', event => {
        if (!mediaQuery || !mediaQuery.matches) {
            return;
        }

        const $hoverEl = $(event.currentTarget);

        $hoverEl.children('.navPage-childList').each((i, submenu) => {
            const $submenu = $(submenu);

            $submenu.removeClass('toLeft');
        });
    });
}

export function checkTouchDevice() {
    const prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
    const mq = (query) => window.matchMedia(query).matches;

    if (('ontouchstart' in window) || window.DocumentTouch && document instanceof window.DocumentTouch) {
        return true;
    }

    // include the 'heartz' as a way to have a non matching MQ to help terminate the join
    // https://git.io/vznFH
    const query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
    return mq(query);
}

export function scrollTop(top, ms = 300) {
    if (navigator.userAgent.match(/(iPod|iPhone|iPad|Android)/i)) {
        window.scrollTo(0, top); // first value for left offset, second value for top offset
    } else {
        $('html, body').animate({
            scrollTop: top,
        }, ms, () => $('html, body').clearQueue());
    }
}

export function scrollToTopProducts() {
    const $body = $('body');
    const $productListingContainer = $('#product-listing-container');
    const $facetedSearchContainer = $('#faceted-search-container');
    const y = $productListingContainer.find('.product').first().offset().top;

    // check if the first product scrolls over the viewport, then scroll to top of product listing
    if (y < window.scrollY) {
        const top = $facetedSearchContainer.length > 0 && $facetedSearchContainer.offset().left >= 0 && $facetedSearchContainer.offset().top < $productListingContainer.offset().top // filter is not hidden and its top < product listing's top
            ? $facetedSearchContainer.offset().top
            : $productListingContainer.offset().top;

        $('html, body').animate({
            scrollTop: top,
        }, {
            duration: 100,
            // skip sticky header while scrolling to top of product listing
            start: () => {
                clearTimeout(resumeStickyHeader);
                $body.addClass('_skipCheckScrollUpStickyHeader');
            },
            complete: () => $('html, body').clearQueue(),
            always: () => {
                clearTimeout(resumeStickyHeader);
                resumeStickyHeader = setTimeout(() => $body.removeClass('_skipCheckScrollUpStickyHeader'), 100);
            },
        });
    }
}

function _formatMoney(_amount, _decimalCount = 2, decimal = '.', thousands = ',') {
    try {
        let decimalCount = Math.abs(_decimalCount);
        decimalCount = Number.isNaN(decimalCount) ? 2 : decimalCount;

        const negativeSign = _amount < 0 ? '-' : '';
        const amount = Math.abs(Number(_amount) || 0).toFixed(decimalCount);

        const i = parseInt(amount, 10).toString();
        const j = (i.length > 3) ? i.length % 3 : 0;

        return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, `$1${thousands}`) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : '');
    } catch (e) {
        return null;
    }
}

export function currencyFormat(value, {
    currency_token = '$',
    currency_location = 'left',
    decimal_token = '.',
    decimal_places = 2,
    thousands_token = ',',
} = {}) {
    const _value = _formatMoney(value, decimal_places, decimal_token, thousands_token);
    return currency_location.toLowerCase() === 'left' ? `${currency_token}${_value}` : `${_value}${currency_token}`;
}

export function extractMoney(price, defaultMoney = {
    currency_token: '$',
    currency_location: 'left',
    decimal_token: '.',
    decimal_places: 2,
    thousands_token: ',',
}) {
    const money = { ...defaultMoney };

    if (!price && price !== 0) {
        return money;
    }

    const m = String(price).trim().match(/^([^0-9]*)([0-9.,]*)([^0-9]*)$/);
    const leftSymbol = String(m[1]).trim();
    const value = String(m[2]);
    const rightSymbol = String(m[3]).trim();
    const commaPosition = value.indexOf(',');
    const commaCount = (value.match(/,/g) || []).length;
    const dotPosition = value.indexOf('.');
    const dotCount = (value.match(/\./g) || []).length;

    if (leftSymbol) {
        money.currency_token = leftSymbol;
        money.currency_location = 'left';
    } else if (rightSymbol) {
        money.currency_token = rightSymbol;
        money.currency_location = 'right';
    }

    if (commaCount.length >= 2) {
        money.thousands_token = ',';
        money.decimal_token = '.';
        money.decimal_places = dotPosition > -1 ? value.length - dotPosition - 1 : 0;
    } else if (dotCount.length >= 2) {
        money.thousands_token = '.';
        money.decimal_token = ',';
        money.decimal_places = commaPosition > -1 ? value.length - commaPosition - 1 : 0;
    } else if (commaPosition > dotPosition && dotPosition > -1) {
        money.thousands_token = '.';
        money.decimal_token = ',';
        money.decimal_places = value.length - commaPosition - 1;
    } else if (dotPosition > commaPosition && commaPosition > -1) {
        money.thousands_token = ',';
        money.decimal_token = '.';
        money.decimal_places = value.length - dotPosition - 1;
    } else if (commaPosition > -1) {
        if ((value.length - commaPosition - 1) % 3 === 0) {
            money.thousands_token = ',';
            money.decimal_token = '.';
            money.decimal_places = 0;
        } else {
            money.thousands_token = '.';
            money.decimal_token = ',';
            money.decimal_places = value.length - commaPosition - 1;
        }
    } else if (dotPosition > -1) {
        if ((value.length - dotPosition - 1) % 3 === 0) {
            money.thousands_token = '.';
            money.decimal_token = ',';
            money.decimal_places = 0;
        } else {
            money.thousands_token = ',';
            money.decimal_token = '.';
            money.decimal_places = value.length - dotPosition - 1;
        }
    } else if (commaPosition === -1 && dotPosition === -1) {
        money.decimal_places = 0;
    }

    return money;
}

export default {
    autoExpandCategoryMenu,
    bindNavPagesCheckRightEdge,
    checkTouchDevice,
    scrollTop,
    scrollToTopProducts,
    currencyFormat,
    extractMoney,
};
