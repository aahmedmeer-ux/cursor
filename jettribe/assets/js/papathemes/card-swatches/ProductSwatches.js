import { debounce } from 'lodash';
import Card from './Card';
import SaleCountdown from '../sale-countdown';

function strEqual(str1, str2) {
    return str1.toLowerCase() === str2.toLowerCase();
}

class ProductSwatches {
    constructor({
        showSwatches = true,
        shouldUpdateMinMaxQty = false,
        cardSelector = '.product .card, .productCarousel-slide .card',
        productIdSelector = '[data-product-id]',
        findProductIdByImg = false,
        swatchesContainerSelector = '.card-text--colorswatches',
        cardImageSelector = '.card-image',
        cardTextPriceSelector = '.card-text--price',
        addToCartFormSelector = 'form[data-cart-item-add]',
        productViewFile = 'products/product-view',
        attributesTemplate = `
            <div class="productSwatches-attributes">
                {{#attributes}}
                    <div class="productSwatches-swatches" data-swatches="{{0.attributeName}}">
                        {{#.}}
                            <a href="#" class="productSwatches-swatches-item productSwatches-swatches-item--{{type}}" title="{{label}}"
                                data-attribute-id="{{attributeId}}"
                                data-attribute-value="{{attributeValue}}">{{&content}}</a>
                        {{/.}}
                        <button type="button" class="productSwatches-swatches-more" data-more>+ More</button>
                        <button type="button" class="productSwatches-swatches-less" data-less>- Less</button>
                    </div>
                {{/attributes}}
            </div>
        `,
        countdownSelector = '.card-countdown',
        countdownCustomField = '__countdown_date',
        templateCustomTags = null,
        imageSize = '590x590',
        inputFinderFunc = null,
        swatchesLimit = 4,
        imageReplacerFunc = null,
        includeOptions = [],
        displayInStockOnly = false,
        autoSelectOptionValues = true,
        graphQLToken = '',
        enableVariantImages = false,
        showCountdown = true,
        showPriceCall = true,
        txtSaleCountdownJSON,
        productSaleBadges,
        currencyCode = 'USD',
        showRrp = true,
        productSaleLabel = '',
    } = {}) {
        this.config = {
            showSwatches,
            shouldUpdateMinMaxQty,
            cardSelector,
            productIdSelector,
            findProductIdByImg,
            swatchesContainerSelector,
            cardImageSelector,
            cardTextPriceSelector,
            addToCartFormSelector,
            productViewFile,
            attributesTemplate,
            countdownSelector,
            countdownCustomField,
            templateCustomTags,
            imageSize,
            inputFinderFunc,
            swatchesLimit,
            imageReplacerFunc,
            includeOptions: includeOptions.map(s => String(s).trim().toLocaleUpperCase()),
            displayInStockOnly,
            autoSelectOptionValues,
            graphQLToken,
            enableVariantImages,
            showCountdown,
            showPriceCall,
            productSaleBadges,
            currencyCode,
            showRrp,
            productSaleLabel,
        };

        SaleCountdown.configure({
            txtSaleCountdownJSON,
        });

        this.bindEvents();
    }

    bindEvents() {
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        if (MutationObserver) {
            this.mutationObserver = new MutationObserver(debounce(() => {
                this.onWindowScroll();
            }, 200));
            this.mutationObserver.observe(document.documentElement, {
                childList: true,
                subtree: true,
            });
        }
    }

    unbindEvents() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
    }

    onWindowScroll($body = null) {
        /**
         * @type {Card[]}
         */
        const cards = [];

        $(this.config.cardSelector, $body).not('.productSwatchesLoaded').each((i, el) => {
            const $scope = $(el).addClass('productSwatchesLoaded');
            if ($scope.data('productSwatchesCard')) {
                return;
            }

            let productId = Number($scope.data('productId') || $scope.find(this.config.productIdSelector).data('productId'));
            if (!productId) {
                // try to find product ID by img src
                if (!this.config.findProductIdByImg) {
                    return;
                }
                productId = $scope.find('img').get().reduce((id, img) => {
                    if (id) {
                        return id;
                    }
                    const m = String(img.src).match(/products\/([0-9]+)\//);
                    return m ? Number(m[1]) : id;
                }, null);
                if (!productId) {
                    return;
                }
            }

            const $attributesContainer = $scope.find(this.config.swatchesContainerSelector);
            const $countdown = $scope.find(this.config.countdownSelector);
            const $cardPriceContainer = $scope.find(this.config.cardTextPriceSelector);
            const hasPriceCall = $scope.find('[data-price-call-placeholder]').length > 0;

            if (!this.config.showCountdown && !this.config.showSwatches && (!this.config.showPriceCall || !hasPriceCall)) {
                return;
            }


            const {
                productViewFile,
                attributesTemplate,
                countdownCustomField,
                templateCustomTags,
                addToCartFormSelector,
                imageSize,
                inputFinderFunc,
                swatchesLimit,
                imageReplacerFunc,
                includeOptions,
                displayInStockOnly,
                autoSelectOptionValues,
                graphQLToken,
                showSwatches,
                shouldUpdateMinMaxQty,
                showCountdown,
                showPriceCall,
                productSaleBadges,
                showRrp,
                productSaleLabel,
            } = this.config;

            const $cardImage = $scope.find(this.config.cardImageSelector).first();

            const card = new Card({
                $scope,
                $attributesContainer,
                productId,
                productViewFile,
                attributesTemplate,
                $countdown,
                countdownCustomField,
                templateCustomTags,
                addToCartFormSelector,
                $cardImage,
                $cardPriceContainer,
                imageSize,
                inputFinderFunc,
                swatchesLimit,
                imageReplacerFunc,
                includeOptions,
                displayInStockOnly,
                autoSelectOptionValues,
                autoInit: !graphQLToken,
                showSwatches,
                shouldUpdateMinMaxQty,
                showCountdown,
                showPriceCall,
                productSaleBadges,
                showRrp,
                productSaleLabel,
            });
            cards.push(card);

            $scope.data('productSwatchesCard', card);
        });

        if (this.config.graphQLToken && cards.length > 0) {
            const ids = Array.from(new Set(cards.map(card => card.productId)));
            // this.fetchGraphQLProducts(ids).then(edges => {
            //     edges.forEach(edge => {
            //         cards.filter(card => card.productId === edge.node.entityId).forEach(card => {
            //             card.graphQLNode = edge.node; // eslint-disable-line no-param-reassign
            //             card.init();
            //         });
            //     });
            // });

            this.fetchGraphQLProducts(ids).then(async ({ edges, currency }) => {
                const variantImages = this.config.enableVariantImages ? await this.fetchGraphQLVariantImages(this.createGraphQLParamsForVariantImages(edges.map(({ node }) => node))) : [];
                edges.forEach(edge => {
                    cards.filter(card => card.productId === edge.node.entityId).forEach(card => {
                        // eslint-disable-next-line no-param-reassign
                        card.currency = currency;
                        // eslint-disable-next-line no-param-reassign
                        card.graphQLNode = edge.node;
                        // eslint-disable-next-line no-param-reassign
                        card.variantImageUrlTemplate = variantImages.find(v => v.productId === card.productId)?.imageUrlTemplate;
                        // eslint-disable-next-line no-param-reassign
                        card.arrayAttributeSelect = variantImages.find(v => v.productId === card.productId)?.arrayAttributeIdSelect;
                        card.init();
                    });
                });
            });
        }
    }

    async fetchGraphQLProducts(ids) {
        let edges = [];
        let currency = {};
        for (let i = 0; i < ids.length; i += 50) {
            const _ids = ids.slice(i, i + 50);
            const resp = await $.ajax({
                url: '/graphql',
                method: 'POST',
                data: JSON.stringify({
                    query: `
                        query ($entityIds: [Int!], $currencyCode: currencyCode!) {
                            site {
                                products (entityIds: $entityIds, first: 50) {
                                    edges {
                                        node {
                                            entityId
                                            minPurchaseQuantity
                                            maxPurchaseQuantity
                                            ${this.config.showSwatches || this.config.enableVariantImages ? `
                                                productOptions {
                                                    edges {
                                                        node {
                                                            entityId
                                                            displayName
                                                            ... on CheckboxOption {
                                                                checkedByDefault
                                                            }
                                                            ... on MultipleChoiceOption {
                                                                displayStyle
                                                                values {
                                                                    edges {
                                                                        node {
                                                                            entityId
                                                                            isDefault
                                                                            ... on SwatchOptionValue {
                                                                                label
                                                                                hexColors
                                                                                imageUrl(width: 100)
                                                                            }
                                                                            ... on MultipleChoiceOptionValue {
                                                                                label
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            ` : ''}
                                            ${this.config.showCountdown ? `
                                                customFields(names: ["${this.config.countdownCustomField}"]) {
                                                    edges {
                                                    node {
                                                        name
                                                        value
                                                        }
                                                    }
                                                }
                                            ` : ''}
                                            availabilityV2 {
                                                ... on ProductUnavailable {
                                                message
                                                }
                                            }
                                        }
                                    }
                                }
                                currency(currencyCode: $currencyCode) {
                                    display {
                                        decimalPlaces
                                        decimalToken
                                        symbol
                                        symbolPlacement
                                        thousandsToken
                                    }
                                }
                            }
                        }
                    `,
                    variables: {
                        entityIds: _ids,
                        currencyCode: this.config.currencyCode,
                    },
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.graphQLToken}`,
                },
                xhrFields: {
                    withCredentials: true,
                },
            });
            edges = edges.concat(resp.data.site.products.edges);
            currency = {
                currency_token: resp.data.site.currency.display.symbol,
                currency_location: String(resp.data.site.currency.display.symbolPlacement).toLowerCase(),
                decimal_token: resp.data.site.currency.display.decimalToken,
                decimal_places: resp.data.site.currency.display.decimalPlaces,
                thousands_token: resp.data.site.currency.display.thousandsToken,
            };
        }
        return { edges, currency };
    }

    /**
     * Create GraphQL params for fetching variant images
     * @param {Product} products
     * @returns {[{ entityId: number, optionValueIds: [{ optionEntityId: number, valueEntityId: number }]}]}
     */
    createGraphQLParamsForVariantImages(products) {
        const searchParams = new URLSearchParams(window.location.search);
        const filters = searchParams.get('_bc_fsnf') ? Array.from(searchParams.entries()).map(([name, value]) => ({ name: name.replace('[]', ''), value })).filter(({ name }) => name !== '_bc_fsnf') : [];
        const gqlParams = [];

        products.forEach(node => {
            const optionValueIds = [];

            node.productOptions.edges.forEach(({ node: optionNode }) => {
                if (Array.isArray(optionNode.values?.edges)) {
                    optionNode.values.edges.forEach(({ node: valueNode }) => {
                        filters.forEach(({ name, value }) => {
                            if (strEqual(name, optionNode.displayName) && strEqual(value, valueNode.label)) {
                                if (!optionValueIds.find(({ optionEntityId }) => optionEntityId === optionNode.entityId)) {
                                    optionValueIds.push({
                                        optionEntityId: optionNode.entityId,
                                        valueEntityId: valueNode.entityId,
                                    });
                                }
                            }
                        });
                    });
                }
            });

            if (optionValueIds.length > 0) {
                gqlParams.push({
                    entityId: node.entityId,
                    optionValueIds,
                });
            }
        });

        return gqlParams;
    }

    /**
     * Fetch variant images via GraphQL
     * @param {[{ entityId: number, optionValueIds: [{ optionEntityId: number, valueEntityId: number }]}]} gqlParams GraphQL variables
     * @returns {[{ productId: number, variantId: number, imageUrlTemplate: string }]}
     */

    async fetchGraphQLVariantImages(gqlParams) {
        let products = [];
        for (let i = 0; i < gqlParams.length; i += 6) {
            const _gqlParams = gqlParams.slice(i, i + 6);
            const resp = await $.ajax({
                url: '/graphql',
                method: 'POST',
                data: JSON.stringify({
                    query: `
                        query(
                            ${_gqlParams.map(({ entityId }) => `$optionValueIds${entityId}: [OptionValueId!]`).join(',\n')}
                        ) {
                            site {
                                ${_gqlParams.map(({ entityId }) => `
                                    product${entityId}: product(entityId: ${entityId}) {
                                        entityId
                                        variants(optionValueIds: $optionValueIds${entityId}, first: 1) {
                                            edges {
                                                node {
                                                    entityId
                                                    defaultImage {
                                                        urlTemplate
                                                    }
                                                    productOptions {
                                                        edges {
                                                            node {
                                                                entityId
                                                                displayName
                                                                ... on CheckboxOption {
                                                                    checkedByDefault
                                                                }
                                                                ... on MultipleChoiceOption {
                                                                    displayStyle
                                                                    values {
                                                                        edges {
                                                                            node {
                                                                                entityId
                                                                                isDefault
                                                                                ... on MultipleChoiceOptionValue {
                                                                                    label
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                `).join('\n')}
                            }
                        }
                    `,
                    variables: _gqlParams.reduce((acc, { entityId, optionValueIds }) => ({ ...acc, [`optionValueIds${entityId}`]: optionValueIds }), {}),
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.graphQLToken}`,
                },
                xhrFields: {
                    withCredentials: true,
                },
            });
            products = products.concat(_gqlParams.map(({ entityId }) => resp.data.site[`product${entityId}`]).filter(p => p));
        }
        const productImages = products.map(product => ({
            productId: product.entityId,
            variantId: product.variants.edges[0]?.node.entityId,
            imageUrlTemplate: product.variants.edges[0]?.node.defaultImage?.urlTemplate,
            arrayAttributeIdSelect: product.variants.edges[0]?.node.productOptions?.edges,
        }));
        return productImages;
    }
}

export default ProductSwatches;
