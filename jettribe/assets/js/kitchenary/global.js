import mediaQueryListFactory from '../theme/common/media-query-list';
import { debounce } from 'lodash';

const mediumMediaQueryList = mediaQueryListFactory('medium');
const largeMediaQueryList = mediaQueryListFactory('large');

function initMenuADA() {
    const $menu = $('#menu');
    const $navItems = $('.navPage-subMenu-item', $menu);
    const $navChildItems = $('.navPage-childList-item', $menu);

    $navItems.on('click', (e) => {
        if (!mediumMediaQueryList.matches) {
            if ($(e.target).hasClass('is-open')) {
                $(e.target).prev().removeClass('u-hidden');
            } else {
                $(e.target).prev().addClass('u-hidden');
            }
        }
    });

    $navChildItems.on('click', (e) => {
        if (!mediumMediaQueryList.matches) {
            if ($(e.target).hasClass('is-open')) {
                $(e.target).prev().removeClass('u-hidden');
            } else {
                $(e.target).prev().addClass('u-hidden');
            }
        }
    });

    $('._hideToggleFirst', $menu).on('focus', (e) => {
        if (!mediumMediaQueryList.matches) {
            $(e.target).parent().find('.navPage-childList').first().find('.navPage-childList-item').last().find('.navPage-childList-action').focus();
        }
    });

    $('._hideToggle', $menu).on('focus', (e) => {
        if (!mediumMediaQueryList.matches) {
            $(e.target).parent().parent().find('.navPages-action-toggle.is-open').first().focus();
        }
    });
}

function initCheckedLinkBrand() {
    const $listBrand = $('#brands-navList');
    const $navCheckbox = $('.navList-action--checkbox', $listBrand);
    const currentURL = window.location.href;
    const currentURLlocal = window.location.pathname;
    $navCheckbox.each((index, item) => {
        if ($(item).attr('href') === currentURL || $(item).attr('href') === currentURLlocal) {
            $(item).addClass('is-selected');
        } else {
            $(item).removeClass('is-selected');
        }
    });

    $navCheckbox.on('click', (event) => {
        $navCheckbox.removeClass('is-selected');
        $(event.currentTarget).addClass('is-selected');
    });
}

function initCheckedLinkPrice() {
    const $listPrice = $('#shopByPrice-navList');
    const $navCheckbox = $('.navList-action--checkbox', $listPrice);

    $navCheckbox.on('click', (event) => {
        $navCheckbox.removeClass('is-selected');
        $(event.currentTarget).addClass('is-selected');
    });
}

function initBlazeCarouselBanner(context) {
    if (!context.homepage_show_carousel) {
        return;
    }

    if (!context.hasMainCarousel) {
        return;
    }


    const updatePosition = () => {
        const $slideBanner = $('#papathemes-section1-container');
        const $blazePrev = $('.blaze-prev', $slideBanner);
        const $blazeNext = $('.blaze-next', $slideBanner);
        const $blazePagination = $('.blaze-pagination', $slideBanner);
        const $descMobile = $('.heroCarousel-content._desc-mobile', $slideBanner);
        if (!largeMediaQueryList.matches && $descMobile.length) {
            const blazeHeight = $blazeNext.outerHeight();
            const heightDescMobile = $descMobile.outerHeight();
            const centerDesc = (heightDescMobile - blazeHeight) / 2;
            $blazePagination.css('bottom', `${heightDescMobile + 10}px`);
            $blazeNext.css('bottom', `${centerDesc}px`);
            $blazePrev.css('bottom', `${centerDesc}px`);
            $blazePagination.addClass('_show');
            $blazeNext.addClass('_show');
            $blazePrev.addClass('_show');
        }
    };
    updatePosition();
    $(window).on('resize', debounce(updatePosition, 400));
}

export default function (context) {
    initCheckedLinkBrand();
    initCheckedLinkPrice();
    initMenuADA();
    initBlazeCarouselBanner(context);
}
