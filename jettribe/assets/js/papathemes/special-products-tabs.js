import utils from '@bigcommerce/stencil-utils';
import { throttle } from 'lodash';
import BlazeSlider from 'blaze-slider';

class SpecialProductsTabs {
    constructor($scope, context) {
        this.$scope = $scope;
        this.context = context;
        this.$viewportCheck = $scope.find('[data-viewport-check]');
        this.$loading = $scope.find('.loading').hide();
        this.$loadMore = $scope.find('.loadMore').hide();
        this.$collapse = $scope.find('.collapse').hide();
        this.options = this.$scope.data('specialProductsTabs') || {};
        this.options.lazyCount = Number(this.options.lazyCount) || 0;
        this.options.initCount = Number(this.options.initCount) || 0;
        this.defaultProductsCount = this.options.lazyCount + this.options.initCount;

        this.onCheckViewport = throttle(this.onCheckViewport.bind(this), 100);
        this.onLoadMore = this.onLoadMore.bind(this);
        this.onCollapse = this.onCollapse.bind(this);
        this.onTabToggled = this.onTabToggled.bind(this);

        if (this.options.showMore) {
            this.$loadMore.show();
        }

        this.bindEvents();
    }

    bindEvents() {
        $('body').one('beforeload.instantload', () => this.unbindEvents());

        if (this.$viewportCheck.length > 0) {
            $(window).on('load resize scroll', this.onCheckViewport);
        }

        if (this.options.showMore) {
            this.$loadMore.on('click', this.onLoadMore);
        }

        this.$collapse.on('click', this.onCollapse);

        $('[data-tab]', this.$scope).on('toggled', this.onTabToggled);
    }

    unbindEvents() {
        $(window).off('load resize scroll', this.onCheckViewport);
        this.$loadMore.off('click', this.onLoadMore);
        this.$collapse.off('click', this.onCollapse);
        $('[data-tab]', this.$scope).off('toggled', this.onTabToggled);
    }

    onCheckViewport() {
        const offset = 250;

        this.$viewportCheck.each((i, el) => {
            const $el = $(el);

            if (!$el.is(':visible')) {
                return;
            }

            const elTop = $el.offset().top;
            const elBottom = elTop + $el.outerHeight();
            const winTop = $(window).scrollTop();
            const winBottom = winTop + $(window).innerHeight();

            if (elTop - offset < winBottom && elBottom + offset > winTop) {
                this.loadViewportProducts(
                    $el.data('viewportCheck'),
                    $el.closest('.tab-content').find([
                        '.productGrid',
                        '.productList',
                        '.productCarousel:not(.blaze-slider)',
                        '.productCarousel.blaze-slider .blaze-track',
                    ].join(', ')),
                );

                this.$viewportCheck = this.$viewportCheck.not($el);
                $el.remove();
            }
        });
    }

    onLoadMore(event) {
        event.preventDefault();

        const $tab = this.$scope.find('.tab-content.is-active');
        const $content = $tab.find([
            '.productGrid',
            '.productList',
            '.productCarousel:not(.blaze-slider)',
            '.productCarousel.blaze-slider .blaze-track',
        ].join(', '));
        const isSlick = $content.is('[data-slick]');
        const $blazeCarousel = $tab.find('.productCarousel.blaze-slider');
        const isBlazeCarousel = $blazeCarousel.length > 0;

        if (!$tab.data('loadedMore')) {
            $tab.data('loadedMore', true);

            const template = 'papathemes/special-products-tabs/products';
            const limit = 100;
            const config = {
                products: {
                    featured: {
                        limit: 0,
                    },
                    top: {
                        limit: 0,
                    },
                    new: {
                        limit: 0,
                    },
                },
            };
            const type = $tab.data('productType');

            switch (type) {
            case 'featured':
                config.products.featured = { limit };
                break;
            case 'top':
                config.products.top_sellers = { limit };
                break;
            case 'new':
            default:
                config.products.new = { limit };
                break;
            }

            this.$loading.show();
            this.$loadMore.attr('disabled', true);

            utils.api.getPage(this.context.urls.search, { template, config }, (err, resp) => {
                this.$loading.hide();
                this.$loadMore.removeAttr('disabled');

                if (err || !resp) {
                    return;
                }

                const existProductIds = $tab
                    .find('.product, .productCarousel-slide')
                    .map((i, el) => $(el).data('productId')).get();

                const $products = $(resp)
                    .find('.product, .productCarousel-slide')
                    .filter((i, el) => existProductIds.indexOf($(el).data('productId')) === -1);

                // Append new products and reinit carousel
                if ($products.length > 0) {
                    if (isSlick) {
                        $content.slick('unslick');
                    } else if (!isBlazeCarousel) {
                        $products
                            .slice(this.defaultProductsCount)
                            .hide();
                    }

                    $content.append($products);
                    if (isSlick) {
                        $content.slick();
                        $content.slick('slickGoTo', existProductIds.length);
                    }

                    if (isBlazeCarousel) {
                        const blazeSlider = $blazeCarousel.data('blazeSliderInstance');
                        if (blazeSlider) {
                            blazeSlider.totalSlides = $content.children().length;
                            blazeSlider.refresh();
                        } else {
                            $blazeCarousel.data('blazeSliderInstance', new BlazeSlider($blazeCarousel.get(0), $blazeCarousel.data('blazeSlider')));
                        }
                    }
                }


                if (!$products.is(':hidden')) {
                    this.$loadMore.hide();
                }

                if ($products.length > 0 && !isSlick && !isBlazeCarousel) {
                    this.$collapse.show();
                }
            });
        } else if (!isSlick && !isBlazeCarousel) {
            const $products = $tab.find('.product, .productCarousel-slide').filter(':hidden');

            $products
                .slice(0, this.defaultProductsCount)
                .show();

            if (!$products.is(':hidden')) {
                this.$loadMore.hide();
            }

            this.$collapse.show();
        }
    }

    onCollapse(event) {
        event.preventDefault();

        const $tab = this.$scope.find('.tab-content.is-active');
        const $products = $tab.find('.product, .productCarousel-slide');

        $products.slice(this.defaultProductsCount).hide();

        this.$collapse.hide();

        if ($products.length > this.defaultProductsCount) {
            this.$loadMore.show();
        }

        $('html, body').animate({
            scrollTop: $tab.offset().top,
        });
    }

    onTabToggled(event, tab) {
        const $tabContent = $($('a', tab).attr('href'));
        const isSlick = $tabContent.find([
            '.productGrid',
            '.productList',
            '.productCarousel:not(.blaze-slider)',
            '.productCarousel.blaze-slider .blaze-track',
        ].join(', ')).is('[data-slick]');

        $('[data-slick]', $tabContent).slick('setPosition');

        const $blazeCarousel = $tabContent.find('.productCarousel.blaze-slider');
        const isBlazeCarousel = $blazeCarousel.length > 0;

        if (this.$viewportCheck.length > 0) {
            this.onCheckViewport();
        }

        const $products = $tabContent.find('.product, .productCarousel-slide');
        const visible = $products.filter(':visible').length;

        if (this.options.showMore) {
            if (!$tabContent.data('loadedMore') || $products.is(':hidden')) {
                this.$loadMore.show();
            } else {
                this.$loadMore.hide();
            }

            if (!isSlick && !isBlazeCarousel) {
                if (visible > this.defaultProductsCount) {
                    this.$collapse.show();
                } else {
                    this.$collapse.hide();
                }
            }
        }
    }

    loadViewportProducts(type, $container) {
        const template = 'papathemes/special-products-tabs/products';
        const limit = this.defaultProductsCount;
        const config = {
            products: {
                featured: {
                    limit: 0,
                },
                top: {
                    limit: 0,
                },
                new: {
                    limit: 0,
                },
            },
        };

        switch (type) {
        case 'featured':
            config.products.featured = { limit };
            break;
        case 'top_sellers':
            config.products.top_sellers = { limit };
            break;
        case 'new':
        default:
            config.products.new = { limit };
            break;
        }

        const isSlick = $container.is('[data-slick]');
        const $blazeCarousel = this.$scope.find(`.productCarousel.blaze-slider[data-product-type="${type}"]`);
        const isBlazeCarousel = $blazeCarousel.length > 0;

        this.$loading.show();
        this.$loadMore.attr('disabled', true);

        utils.api.getPage('/', { template, config }, (err, resp) => {
            this.$loading.hide();
            this.$loadMore.removeAttr('disabled');

            if (err || !resp) {
                return;
            }

            const $products = $(resp).find('.product, .productCarousel-slide');
            if (isSlick) $container.slick('unslick');

            $container.empty().append($products);

            if (isSlick) $container.slick();
            else if (isBlazeCarousel) {
                const blazeSlider = $blazeCarousel.data('blazeSliderInstance');
                if (blazeSlider) {
                    blazeSlider.totalSlides = $container.children().length;
                    blazeSlider.refresh();
                } else {
                    $blazeCarousel.data('blazeSliderInstance', new BlazeSlider($blazeCarousel.get(0), $blazeCarousel.data('blazeSlider')));
                }
            }
        });
    }
}

export default function init({ selector = '[data-special-products-tabs]', context }) {
    $(selector).each((i, el) => {
        const $el = $(el);
        if (!$el.data('specialProductsTabsInstance')) {
            $el.data('specialProductsTabsInstance', new SpecialProductsTabs($el, context));
        }
    });
}
