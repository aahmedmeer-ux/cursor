/**
 * This file is added by Supermarket theme.
 */

import PageManager from '../page-manager';
import { debounce } from 'lodash';
import initProductsByCategories from '../papathemes/products-by-category';
import initSpecialProductsTabs from '../papathemes/special-products-tabs';
import initProductLoadMore from '../papathemes/product-loadmore';

export default class Home extends PageManager {
    onReady() {
        this.initProductsByCategorySection();
        this.initSpecialProductsTabsSection();
        this.initProductLoadMore();
        this.fixHomeBrandsCarousel();
    }

    initProductsByCategorySection() {
        if (this.context.haspbcst) {
            initProductsByCategories();
        }
    }

    initSpecialProductsTabsSection() {
        // Refresh products carousel when tab is open
        if (this.context.hasSpecialProductsTabs) {
            initSpecialProductsTabs({ context: this.context });
        }
    }

    initProductLoadMore() {
        if (this.context.hasFeaturedProducts ||
            this.context.hasNewProducts ||
            this.context.hasTopProducts) {
            initProductLoadMore({
                context: this.context,
            });
        }
    }

    fixHomeBrandsCarousel() {
        const $slick = $('[data-home-brands-slick]');

        if ($slick.length === 0) {
            return;
        }

        const { responsive, ...data } = $slick.data('homeBrandsSlick');
        const breakpoints = responsive.map(r => ({
            ...data,
            breakpoint: r.breakpoint,
            ...r.settings,
        }));

        const getBreakpoint = () => {
            const width = $(window).innerWidth();
            return breakpoints.reduce((prev, current) => (current.breakpoint >= width ? current : prev), data);
        };

        let { breakpoint: currentBreakpoint, ...currentData } = getBreakpoint();

        $slick.slick(currentData);

        $(window).on('resize', debounce(() => {
            const { breakpoint: newBreakpoint, ...newData } = getBreakpoint();
            if (newBreakpoint !== currentBreakpoint) {
                currentBreakpoint = newBreakpoint;
                currentData = newData;
                $slick.slick('unslick').slick(currentData);
            }
        }, 500));
    }
}
