import utils from '@bigcommerce/stencil-utils';
import BlazeSlider from 'blaze-slider';

class ProductLoadMore {
    constructor($scope, context) {
        this.$scope = $scope;
        this.context = context;
        this.$loading = $scope.find('.loading').hide();
        this.$loadMore = $scope.find('.loadMore').hide();
        this.$collapse = $scope.find('.collapse').hide();
        this.options = {};
        this.options.product_new_count = Number(this.context.product_new_count) || 0;
        this.options.product_featured_count = Number(this.context.product_featured_count) || 0;
        this.options.product_top_count = Number(this.context.product_top_count) || 0;
        this.type = this.$scope.find('[data-product-type]').data('productType');
        this.defaultProductsCount = this.getDefaultProductsCount();

        this.onLoadMore = this.onLoadMore.bind(this);
        this.onCollapse = this.onCollapse.bind(this);

        const $products = $scope.find('.product, .productCarousel-slide');
        if ($products.length >= this.defaultProductsCount) {
            this.$loadMore.show();
        }

        this.bindEvents();
    }

    getDefaultProductsCount() {
        if (this.type === 'new') return this.options.product_new_count;
        if (this.type === 'featured') return this.options.product_featured_count;
        if (this.type === 'top_sellers') return this.options.product_top_count;
        return 0;
    }

    bindEvents() {
        $('body').one('beforeload.instantload', () => this.unbindEvents());
        this.$loadMore.on('click', this.onLoadMore);
        this.$collapse.on('click', this.onCollapse);
    }

    unbindEvents() {
        this.$loadMore.off('click', this.onLoadMore);
        this.$collapse.off('click', this.onCollapse);
    }

    onLoadMore(event) {
        event.preventDefault();

        const $content = this.$scope.find([
            '.productGrid',
            '.productList',
            '.productCarousel:not(.blaze-slider)',
            '.productCarousel.blaze-slider .blaze-track',
        ].join(', '));

        const isSlick = $content.is('[data-slick]');

        if (!this.$scope.data('loadedMore')) {
            this.$scope.data('loadedMore', true);

            const template = 'papathemes/list-product/products';
            const limit = 100;
            const config = {
                products: {
                    featured: {
                        limit: this.type === 'featured' ? limit : 0,
                    },
                    top_sellers: {
                        limit: this.type === 'top_sellers' ? limit : 0,
                    },
                    new: {
                        limit: this.type === 'new' ? limit : 0,
                    },
                },
            };

            this.$loading.show();
            this.$loadMore.attr('disabled', true);
            const $blazeSliderArrow = this.$scope.find('.blaze-prev, .blaze-next');
            $blazeSliderArrow.hide();

            utils.api.getPage(this.context.urls.search, {
                template,
                config,
            }, (err, resp) => {
                this.$loading.hide();
                this.$loadMore.removeAttr('disabled');
                $blazeSliderArrow.css('display', '');

                if (err || !resp) {
                    return;
                }

                const existProductIds = this.$scope
                    .find('.product, .productCarousel-slide')
                    .map((i, el) => $(el).data('productId')).get();

                const $products = $(resp)
                    .find('.product, .productCarousel-slide')
                    .filter((i, el) => existProductIds.indexOf($(el).data('productId')) === -1);

                const $blazeSlider = this.$scope.find('.productCarousel.blaze-slider');
                const isCarouselBlaze = $blazeSlider.length > 0;

                // Append new products
                if ($products.length > 0) {
                    if (isSlick) {
                        $content.slick('unslick');
                    } else if (!isCarouselBlaze) {
                        $products
                            .slice(this.defaultProductsCount)
                            .hide();
                    }

                    $content.append($products);

                    if (isSlick) {
                        $content.slick();
                        $content.slick('slickGoTo', existProductIds.length);
                    } else if (isCarouselBlaze) {
                        const blazeSlider = $blazeSlider.data('blazeSliderInstance');
                        if (blazeSlider) {
                            blazeSlider.totalSlides = $content.children().length;
                            blazeSlider.refresh();
                        } else {
                            $blazeSlider.data('blazeSliderInstance', new BlazeSlider($blazeSlider.get(0), $blazeSlider.data('blazeSlider')));
                        }
                    }
                } else {
                    this.$loadMore.hide();
                    this.$collapse.hide();
                }

                if (!$products.is(':hidden')) {
                    this.$loadMore.hide();
                }

                if ($products.length > 0 && !isSlick && !isCarouselBlaze) {
                    this.$collapse.show();
                }
            });
        } else {
            const $products = this.$scope.find('.product').filter(':hidden');

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

        const $products = this.$scope.find('.product');

        $products.slice(this.defaultProductsCount).hide();

        this.$collapse.hide();

        if ($products.length > this.defaultProductsCount) {
            this.$loadMore.show();
        }

        $('html, body').animate({
            scrollTop: this.$scope.offset().top,
        });
    }
}

export default function init({
    selectors = [
        '.beautify__section--newProducts',
        '.beautify__section--featuredProducts',
        '.beautify__section--topProducts',
    ],
    context,
}) {
    $(selectors.join(', ')).each((i, el) => {
        const $el = $(el);
        if (!$el.data('productLoadMoreInstance')) {
            $el.data('productLoadMoreInstance', new ProductLoadMore($el, context));
        }
    });
}
