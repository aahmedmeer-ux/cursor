import { throttle } from 'lodash';
import utils from '@bigcommerce/stencil-utils';
import foundation from '../theme/global/foundation';

class ProductsByCategory {
    constructor({
        id,
        index = 0,
        sort = '',
        limit = '',
        $parent,
    }) {
        this.onLoadMore = this.onLoadMore.bind(this);
        this.onCollapse = this.onCollapse.bind(this);

        this.id = id;
        this.currentCategoryId = id;
        this.index = index;
        this.sort = sort;
        this.limit = limit;
        this.page = 1;
        this.$parent = $parent;
        this.$scope = $('<div class="papathemes-pbcst-loading"></div>');
        this.$shopBtn = $();
        this.$loadMore = $();
        this.$collapse = $();
        this.$loader = $();

        this.$parent.append(this.$scope);

        this.init();
    }

    init() {
        const limitQuery = this.limit ? `&limit=${this.limit}` : '';
        const sortQuery = this.sort ? `&sort=${this.sort}` : '';
        const template = 'papathemes/pbcst/section';

        utils.api.getPage(`/categories.php?category=${this.currentCategoryId}${limitQuery}${sortQuery}`, { template }, (err, resp) => {
            if (err || !resp || resp.error) {
                this.$scope.remove();
                return;
            }

            const $resp = $(resp);
            this.$scope.replaceWith($resp);
            this.$scope = $resp;
            this.$content = this.$scope.find('[data-pbcst-products-placement]');
            this.$loader = this.$scope.find('.loader');

            this.initTabs();
            this.initSlick();
            this.initWidgetRegion();
            this.initButtons();
        });
    }

    loadProducts(callback) {
        const categoryId = this.currentCategoryId || this.id;
        const limitQuery = this.limit ? `&limit=${this.limit}` : '';
        const sortQuery = this.sort ? `&sort=${this.sort}` : '';
        const pageQuery = this.page ? `&page=${this.page}` : '';
        const template = 'papathemes/pbcst/products';

        this.$loader.addClass('loading');

        utils.api.getPage(`/categories.php?category=${categoryId}${limitQuery}${sortQuery}${pageQuery}`, { template }, (err, resp) => {
            this.$loader.removeClass('loading');

            if (err || !resp) {
                return;
            }

            const $resp = $(resp);
            const $currentPage = this.$content.find('[data-current-page]');

            if ($currentPage.length > 0) {
                $currentPage.data({
                    currentPage: $resp.data('currentPage'),
                    hasNextPage: Boolean($resp.data('hasNextPage')),
                });
                $currentPage.find('.productGrid').append($resp.find('.productGrid').children());
            } else {
                this.$content.html(resp);
            }

            this.$content.find('.product._hideOnTabletWhenNoBanner').removeClass('_hideOnTabletWhenNoBanner');

            this.initSlick();

            if ($resp.data('hasNextPage')) {
                this.$loadMore.show();
            } else {
                this.$loadMore.hide();
            }

            if ($resp.data('currentPage') > 1) {
                this.$collapse.show();
            } else {
                this.$collapse.hide();
            }

            // Update the Shop Category button and link to match the current category
            this.$shopBtn.get().map(el => $(el)).forEach($el => $el.text($el.data('text').replace('{name}', $resp.data('categoryName'))));
            this.$shopBtn.attr('href', $resp.data('categoryUrl'));

            if (typeof callback === 'function') {
                callback();
            }
        });
    }

    initTabs() {
        foundation(this.$scope);

        $('[data-tab]', this.$scope).on('toggled', (event, $tab) => {
            const $a = $tab.find('a');
            const sort = $a.data('pbcstSort') || this.sort;
            let subcategoryId = $a.data('pbcstSubcategoryId');

            // Click the same subcategory tab will deactivate it and display the parent category products
            if (subcategoryId && subcategoryId === this.currentCategoryId) {
                $tab.removeClass('is-active');
                $tab.find('.tab-title').prop('aria-selected', false);
                subcategoryId = this.id;
            }

            const id = subcategoryId || this.currentCategoryId;

            // Stop if no tab changed
            if (sort === this.sort && id === this.currentCategoryId) {
                return;
            }

            this.sort = sort;
            this.currentCategoryId = id;
            this.page = 1;
            this.$content.html('');
            this.$loadMore.hide();
            this.$collapse.hide();

            this.loadProducts();
        });
    }

    initSlick() {
        // init products carousel
        $('[data-slick]', this.$scope)
            .on('init', e => setTimeout(() => {
                // init nested carousel
                $('[data-slick-nested]', e.target).each((i, el) => {
                    $(el).slick($(el).data('slickNested'));
                });
            }, 200))
            .on('breakpoint', e => setTimeout(() => {
                $('[data-slick-nested]', e.target).slick('setPosition');
            }, 200))
            .slick();
    }

    initWidgetRegion() {
        const $widgetRegion = this.$parent.find(`[data-pbcst-widget-region="${this.index}"]`);
        const $widgetRegionBelow = this.$parent.find(`[data-pbcst-widget-region="below_${this.index}"]`);
        const $placement = this.$scope.find('[data-pbcst-widget-region-placement=""]');
        const $placementBelow = this.$scope.find('[data-pbcst-widget-region-placement="below"]');
        $placement.append($widgetRegion);
        $placementBelow.append($widgetRegionBelow);
    }

    initButtons() {
        this.$shopBtn = this.$scope.find('._shopBtn');
        this.$loadMore = this.$scope.find('.loadMore').hide();
        this.$collapse = this.$scope.find('.collapse').hide();

        if (this.$content.find('[data-current-page]').data('hasNextPage')) {
            this.$loadMore.show();
        }

        this.$loadMore.on('click', this.onLoadMore);
        this.$collapse.on('click', this.onCollapse);
    }

    onLoadMore(event) {
        event.preventDefault();

        const $currentPage = this.$content.find('[data-current-page]');
        const $hide = this.$content.find('.product.hide');

        if ($hide.length > 0) {
            $hide.show().removeClass('hide');
            this.$collapse.show();

            if (!$currentPage.data('hasNextPage')) {
                this.$loadMore.hide();
            }
            return;
        }

        if ($currentPage.data('hasNextPage')) {
            this.page++;
            this.loadProducts();
        } else {
            this.$loadMore.hide();
        }
    }

    onCollapse(event) {
        event.preventDefault();

        if (this.limit) {
            const $hide = this.$content.find('.product').slice(this.limit).hide().addClass('hide');

            if ($hide.length > 0) {
                this.$loadMore.show();
            }

            $('html, body').animate({
                scrollTop: this.$content.offset().top,
            }, 500);
        }

        this.$collapse.hide();
    }
}

class ProductsByCategories {
    constructor($scope) {
        this.$scope = $scope;
        this.lazy = this.$scope.is('[data-lazy]');
        this.lazyOffset = window.supermarketThemeExtraConfig?.pbcLazyOffset || 300;
        this.loaded = false;

        this.onCheckViewport = throttle(this.onCheckViewport.bind(this), 100);

        this.bindEvents();

        if (!this.lazy) {
            this.load();
        }
    }

    load() {
        this.loaded = true;

        const sort = this.$scope.data('sort');
        const limit = this.$scope.data('limit');

        String(this.$scope.data('pbcstGroup')).split(',').map((idStr, index) => new ProductsByCategory({
            id: idStr.trim(),
            index,
            sort,
            limit,
            $parent: this.$scope,
        }));
    }

    bindEvents() {
        $('body').one('beforeload.instantload', () => this.unbindEvents());

        if (this.lazy) {
            $(window).on('load resize scroll', this.onCheckViewport);
        }
    }

    unbindEvents() {
        $(window).off('load resize scroll', this.onCheckViewport);
    }

    onCheckViewport() {
        if (this.loaded) {
            $(window).off('load resize scroll', this.onCheckViewport);
            return;
        }

        if (!this.$scope.is(':visible')) {
            return;
        }

        const offset = this.lazyOffset;
        const elTop = this.$scope.offset().top;
        const elBottom = elTop + this.$scope.outerHeight();
        const winTop = $(window).scrollTop();
        const winBottom = winTop + $(window).innerHeight();

        if (elTop - offset < winBottom && elBottom + offset > winTop) {
            this.load();
        }
    }
}

export default function init(selector = '[data-pbcst-group]') {
    $(selector).each((i, el) => new ProductsByCategories($(el)));
}
