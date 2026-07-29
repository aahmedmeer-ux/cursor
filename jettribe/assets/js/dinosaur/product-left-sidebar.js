import utils from '@bigcommerce/stencil-utils';
import mediaQueryListFactory from '../theme/common/media-query-list';

const mediumMediaQueryList = mediaQueryListFactory('medium');

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

        const $products = $scope.find('.product');
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

    updateScrollPosition($products, $content) {
        if (!mediumMediaQueryList.matches) {
            const childPosition = $products.first().offset().left;
            const parentPosition = $content.offset().left;
            const distanceToScroll = childPosition + parentPosition;

            $content.animate({
                scrollLeft: $content.scrollLeft() + distanceToScroll,
            }, 500);
        }
    }

    onLoadMore(event) {
        event.preventDefault();
        const $content = this.$scope.find([
            '.productGrid',
        ].join(', '));

        if (!this.$scope.data('loadedMore')) {
            this.$scope.data('loadedMore', true);

            const template = 'dinosaur/left-sidebar/products';
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

            utils.api.getPage(this.context.urls.search, {
                template,
                config,
            }, (err, resp) => {
                this.$loading.hide();
                this.$loadMore.removeAttr('disabled');

                if (err || !resp) {
                    return;
                }

                const existProductIds = this.$scope
                    .find('.product')
                    .map((i, el) => $(el).data('productId')).get();

                const $products = $(resp)
                    .find('.product')
                    .filter((i, el) => existProductIds.indexOf($(el).data('productId')) === -1);

                // Append new products
                if ($products.length > 0) {
                    $products
                        .slice(this.defaultProductsCount)
                        .hide();

                    $content.append($products);

                    this.updateScrollPosition($products, $content);
                } else {
                    this.$loadMore.hide();
                    this.$collapse.hide();
                }

                if (!$products.is(':hidden')) {
                    this.$loadMore.hide();
                }

                if ($products.length > 0) {
                    this.$collapse.show();
                }
            });
        } else {
            const $products = this.$scope.find('.product').filter(':hidden');

            $products
                .slice(0, this.defaultProductsCount)
                .show();

            this.updateScrollPosition($products, $content);

            if (!$products.is(':hidden')) {
                this.$loadMore.hide();
            }

            this.$collapse.show();
        }
    }

    onCollapse(event) {
        event.preventDefault();

        const $products = this.$scope.find('.product');

        $products.parent().animate({
            scrollLeft: 0,
        }, 500);

        $products.slice(this.defaultProductsCount).hide();

        this.$collapse.hide();

        if ($products.length > this.defaultProductsCount) {
            this.$loadMore.show();
        }

        if (mediumMediaQueryList.matches) {
            const heightOfStickyHeader = $('[data-sticky-header]').outerHeight();
            $('html, body').animate({
                scrollTop: this.$scope.offset().top - heightOfStickyHeader,
            }, 500);
        }
    }
}

export default function init({
    selectors = [
        '.dinosaur-left-sidebar',
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
