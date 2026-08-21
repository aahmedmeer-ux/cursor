import PageManager from '../page-manager';
import { StandardInfiniteScroll } from '../papathemes/faceted-infinite-scroll'; // Chiara

export default class Brands extends PageManager {
    onReady() {
        // Chiara: infinite scroll
        const enableInfiniteScroll = $('[data-brands-infinite-scroll]').data('brandsInfiniteScroll');

        // Chiara: init infinite scroll for standard category page without faceted filters
        if (enableInfiniteScroll) {
            this.standardInfiniteScroll = new StandardInfiniteScroll({
                requestOptions: {
                    config: {
                        brands: {
                            limit: this.context.brandsPerPage,
                        },
                    },
                    template: 'brand/brand-listing',
                },
                productListingContainerSelector: '[data-brands-infinite-scroll]',
                productSelector: '.brandGrid .brand',
                productGridSelector: '.brandGrid',
                enableInfiniteScroll,
                txtLoadMore: this.context.txtLoadMore,
                insertTopPaginationFunc: ($pagination, $productListingContainer) => $productListingContainer.find('.brandGrid').before($pagination),
                insertBottomPaginationFunc: ($pagination, $productListingContainer) => $productListingContainer.find('.brandGrid').after($pagination),
            });
        }
    }
}
