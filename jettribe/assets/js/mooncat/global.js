import BlazeSlider from 'blaze-slider';
import initPageBuilder from '../papathemes/page-builder';
import mediaQueryListFactory from '../theme/common/media-query-list';
import { debounce } from 'lodash';

const mediumMediaQueryList = mediaQueryListFactory('medium');

export default function (context) {
    if ($('.navPages._hasWidgets').length > 0) {
        initPageBuilder(context);
    }

    const menuColumnScreenChange = () => {
        if (mediumMediaQueryList.matches) {
            $('.navPages > ul > li.navPages-item--column').each((_i, el) => {
                const $subMenuUl = $(el).find('ul');
                let maxHeight = 0;
                $subMenuUl.each((_j, ul) => {
                    maxHeight = maxHeight > $(ul).height() ? maxHeight : $(ul).height();
                });
                $subMenuUl.height(maxHeight);
            });
        } else {
            $('.navPages > ul > li.navPages-item--column').each((_i, el) => {
                const $subMenuUl = $(el).find('ul');
                $subMenuUl.css('height', 'auto');
            });
        }
    };

    const updatePositionProductFilter = () => {
        const layout = context.categorypage_layout;
        if (layout === 'fullwidth') {
            const update = () => {
                const labelSearch = $('.inlineList--labels', '#facetedSearch');
                const productFilter = $('.papathemes-productsFilter--faceted');
                if (labelSearch) {
                    const heightLabelSearch = $('.inlineList--labels', '#facetedSearch').outerHeight();
                    productFilter.css('margin-top', `${heightLabelSearch + 35}px`);
                    if ($(window).innerWidth() < 800) {
                        productFilter.css('margin-top', `${heightLabelSearch + 24}px`);
                    }
                }
            };
            update();
            $(window).on('resize', debounce(update, 400));
        }
    };

    const $navItems = $('.navPages._hasWidgets._hasMegamenu > ul > li.navPages-item');
    const $navChildList = $navItems.find('.navPage-subMenu-list:has(.navPage-childList) .navPage-subMenu-item > .navPage-childList');
    const initBannerMegaMenu = () => {
        if (!mediumMediaQueryList.matches && $('.navPages._hasWidgets._hasMegamenu').length > 0) {
            if ($navItems.find('.navPage-subMenu-item .navPage-childList').length > 0) {
                $navChildList.each((index, listItem) => {
                    const dataWidgetBanner = $(listItem).next();
                    dataWidgetBanner.appendTo($(listItem));
                    $($(listItem).children('._hideToggle')[0]).insertAfter(dataWidgetBanner);
                });
            }
        } else {
            $navChildList.each((index, listItem) => {
                const listItemParent = $(listItem).parent();
                const dataWidgetBanner = $(listItem).find('[data-content-region]');
                dataWidgetBanner.appendTo(listItemParent);
            });
        }
    };

    initBannerMegaMenu();
    updatePositionProductFilter();
    menuColumnScreenChange();


    const initBlazeSlider = ($scope, template, $widget, $children) => {
        $widget.append(template);
        $children.appendTo($('.blaze-track', $scope));
        $('.blaze-button', $scope).toggle($children.length > 1);

        const $el = $scope.find('.blaze-slider');
        if ($el.length) {
            new BlazeSlider($el.get(0), {
                all: {
                    enableAutoplay: true,
                    autoplayInterval: 5000,
                    transitionDuration: 3,
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    loop: true,
                    slideGap: '100px',
                },
            }).refresh();
        }
    };

    $('#banners-carousel, #banners-carousel-center').each((index, el) => {
        const $scopeSlider = $(el);
        const $widgetSlider = $('[data-widget-id]', $scopeSlider);
        const $childWidgetSlider = $widgetSlider.children();
        if ($childWidgetSlider.length > 0) {
            const templateSlider = `
                <div class="banners blaze-slider" data-banner-location="top">
                    <div class="blaze-container">
                        <button class="blaze-button blaze-prev" aria-label="Previous"></button>
                        <button class="blaze-button blaze-next" aria-label="Next"></button>
                        <div class="blaze-track-container">
                            <div class="blaze-track"></div>
                        </div>
                    </div>
                </div>`;
            initBlazeSlider($scopeSlider, templateSlider, $widgetSlider, $childWidgetSlider);
        }
    });

    $('.banners-close', '.banners-wrapper').on('click', (e) => {
        $(e.target).closest('.banners-wrapper').remove();
        $('.stickyHeader-placeholder').css('height', $('[data-sticky-header]').outerHeight());
    });

    mediumMediaQueryList.addListener(menuColumnScreenChange);
    mediumMediaQueryList.addListener(initBannerMegaMenu);
}
