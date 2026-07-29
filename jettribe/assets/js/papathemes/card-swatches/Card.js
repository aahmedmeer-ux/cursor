import Mustache from 'mustache';
import SaleCountdown, { parseCountdownDate } from '../sale-countdown';
import { currencyFormat, extractMoney } from '../utils';

class Card {
    /**
     * @param {Object} options
     * @param {jQuery} options.$scope
     * @param {jQuery} options.$attributesContainer
     * @param {Number} options.productId
     * @param {String} options.productViewFile
     * @param {String} options.attributesTemplate
     * @param {jQuery} options.$countdown
     * @param {String} options.countdownCustomField
     * @param {Object} options.templateCustomTags
     * @param {String} options.addToCartFormSelector
     * @param {jQuery} options.$cardImage
     * @param {jQuery} options.$cardPriceContainer
     * @param {String} options.imageSize
     * @param {Function} options.inputFinderFunc
     * @param {Number} options.swatchesLimit
     * @param {Function} options.imageReplacerFunc
     * @param {Array} options.includeOptions
     * @param {Boolean} options.displayInStockOnly
     * @param {Boolean} options.autoSelectOptionValues
     * @param {Boolean} options.autoInit
     * @param {Object} options.graphQLNode
     * @param {Boolean} options.showSwatches
     * @param {Boolean} options.shouldUpdateMinMaxQty
     * @param {String} options.variantImageUrlTemplate
     * @param {Array} options.arrayAttributeSelect
     * @param {Boolean} options.showCountdown
     * @param {Boolean} options.showPriceCall
     * @param {String} options.productSaleBadges
     * @param {Object} options.currency
     * @param {Boolean} options.showRRP
     * @param {String} options.productSaleLabel
     * @constructor
     */
    constructor({
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
        autoInit = true,
        graphQLNode,
        showSwatches,
        shouldUpdateMinMaxQty,
        variantImageUrlTemplate,
        arrayAttributeSelect,
        showCountdown,
        showPriceCall,
        productSaleBadges,
        currency,
        showRrp,
        productSaleLabel,
    }) {
        this.$scope = $scope;
        this.productId = productId;
        this.$attributesContainer = $attributesContainer;
        this.productViewFile = productViewFile;
        this.attributesTemplate = attributesTemplate;
        this.$countdown = $countdown;
        this.countdownCustomField = countdownCustomField;
        this.templateCustomTags = templateCustomTags;
        this.addToCartFormSelector = addToCartFormSelector;
        this.$cardImage = $cardImage;
        this.$cardPriceContainer = $cardPriceContainer;
        this.imageSize = imageSize;
        this.inputFinderFunc = inputFinderFunc;
        this.swatchesLimit = swatchesLimit;
        this.imageReplacerFunc = imageReplacerFunc;
        this.includeOptions = includeOptions;
        this.displayInStockOnly = displayInStockOnly;
        this.autoSelectOptionValues = autoSelectOptionValues;
        this.autoInit = autoInit;
        this.graphQLNode = graphQLNode;
        this.showSwatches = showSwatches;
        this.shouldUpdateMinMaxQty = shouldUpdateMinMaxQty;
        this.variantImageUrlTemplate = variantImageUrlTemplate;
        this.arrayAttributeSelect = arrayAttributeSelect;
        this.showCountdown = showCountdown;
        this.showPriceCall = showPriceCall;
        this.productSaleBadges = productSaleBadges;
        this.currency = currency;
        this.showRrp = showRrp;
        this.productSaleLabel = productSaleLabel;

        if (this.autoInit) {
            this.init();
        }
    }

    init() {
        if (this.variantImageUrlTemplate) {
            this.updateCardImage(this.variantImageUrlTemplate);
        }

        if (this.displayInStockOnly && this.showSwatches) {
            this.requestInStockAttributes();
        } else if (this.graphQLNode && this.showSwatches) {
            this.buildProductOptions();
        } else if (this.showSwatches) {
            this.requestProductOptions();
        }
        if (this.graphQLNode && this.showCountdown) {
            this.initCountdown();
        }
        if (this.graphQLNode && this.showPriceCall) {
            this.updateCardPriceMess();
        }

        // this.updateAttributeSelect(this.arrayAttributeSelect);

        if (this.shouldUpdateMinMaxQty && this.graphQLNode) {
            this.updateMinMaxQty();
        }

        if (this.productSaleBadges === 'price') this.updatePriceAmount(this.currency);
    }

    updatePriceAmount(currency) {
        const $saleBadgePrice = $('[data-price-currency-value]', this.$scope);
        const priceCurrencyValue = $saleBadgePrice.data('price-currency-value');
        const priceSaleBadge = parseFloat(priceCurrencyValue).toFixed(currency.decimal_places);
        const priceSaleBadgeFormatted = priceSaleBadge % 1 === 0 ? currencyFormat(priceSaleBadge, { ...currency, decimal_places: 0 }) : currencyFormat(priceSaleBadge, currency);
        $saleBadgePrice.text(priceSaleBadgeFormatted);
    }

    updateMinMaxQty() {
        const {
            minPurchaseQuantity,
            maxPurchaseQuantity,
        } = this.graphQLNode;

        const $input = this.$scope.find('[data-card-quantity-change] input');
        const $boInput = this.$scope.find('input[data-bulkorder-qty-id]');
        const qty = Number($input.val()) || 1;

        if (minPurchaseQuantity) {
            $input.attr('min', minPurchaseQuantity).attr('data-quantity-min', minPurchaseQuantity);
            if (qty < minPurchaseQuantity) {
                $input.val(minPurchaseQuantity);
            }
            $boInput.attr('data-quantity-min', minPurchaseQuantity);
        }

        if (maxPurchaseQuantity) {
            $input.attr('max', maxPurchaseQuantity).attr('data-quantity-max', maxPurchaseQuantity);
            if (qty > maxPurchaseQuantity) {
                $input.val(maxPurchaseQuantity);
            }
            $boInput.attr('data-quantity-max', maxPurchaseQuantity);
        }
    }

    requestInStockAttributes() {
        $.ajax({
            url: `/remote/v1/product-attributes/${this.productId}`,
            method: 'POST',
            data: {
                action: 'add',
                product_id: this.productId,
            },
            headers: {
                'stencil-config': '{}',
                'stencil-options': '{}',
                'x-xsrf-token': window.BCData && window.BCData.csrf_token ? window.BCData.csrf_token : '',
            },
            xhrFields: {
                withCredentials: true,
            },
            success: (resp) => {
                const attributesData = resp.data || {};
                if (typeof attributesData.in_stock_attributes === 'object' || attributesData.instock) {
                    if (this.graphQLNode) {
                        this.buildProductOptions(attributesData);
                    } else {
                        this.requestProductOptions(attributesData);
                    }
                }
            },
        });
    }

    requestProductOptions(attributesData) {
        $.ajax({
            url: `/products.php?productId=${this.productId}`,
            method: 'GET',
            headers: {
                'stencil-config': '{}',
                'stencil-options': `{"render_with":"${this.productViewFile}"}`,
                'x-xsrf-token': window.BCData && window.BCData.csrf_token ? window.BCData.csrf_token : '',
            },
            xhrFields: {
                withCredentials: true,
            },
            success: (resp) => {
                this.buildProductOptions(attributesData, resp);
            },
        });
    }

    buildProductOptions(attributesData = {}, resp) {
        const data = {
            attributes: [],
        };


        if (this.graphQLNode) {
            // load attributes from graphQL
            data.attributes = this.graphQLNode.productOptions.edges.reduce((_options, { node: optionNode }) => {
                if (this.includeOptions.length > 0 && !this.includeOptions.includes(String(optionNode.displayName).toLocaleUpperCase())) {
                    return _options;
                }

                // only display swatch or rectangle options if includeOptions is empty
                if ((!this.includeOptions || this.includeOptions.length === 0) && optionNode.displayStyle !== 'Swatch' && optionNode.displayStyle !== 'RectangleBoxes') {
                    return _options;
                }

                if (optionNode.values) {
                    const values = optionNode.values.edges.reduce((_values, { node: valueNode }) => {
                        if (typeof attributesData.in_stock_attributes !== 'object' || attributesData.in_stock_attributes.indexOf(valueNode.entityId) > -1) {
                            if (valueNode.imageUrl || valueNode.hexColors || valueNode.label) {
                                _values.push({
                                    content: valueNode.imageUrl // eslint-disable-line no-nested-ternary
                                        ? `<span class="form-option-variant form-option-variant--pattern" title="${valueNode.label}" style="background-image: url('${valueNode.imageUrl}');"></span>`
                                        : (valueNode.hexColors
                                            ? valueNode.hexColors.map(color => `<span class='form-option-variant form-option-variant--color' title="${valueNode.label}" style="background-color: ${color}"></span>`).join('')
                                            : `<span class="form-option-variant">${valueNode.label}</span>`),
                                    label: valueNode.label,
                                    type: valueNode.imageUrl || valueNode.hexColors ? 'swatch' : 'rectangle',
                                    attributeId: optionNode.entityId,
                                    attributeName: optionNode.displayName,
                                    attributeValue: valueNode.entityId,
                                });
                            }
                        }
                        return _values;
                    }, []);
                    if (values.length > 0) {
                        _options.push(values);
                    }
                }
                return _options;
            }, []);
        } else {
            // load attributes from AJAX request
            $(resp).find('[data-product-attribute="swatch"]').each((i, el) => {
                const $swatches = $(el);
                const swatches = [];

                $swatches.find('[data-product-attribute-value]').each((_i, labelEl) => {
                    const $label = $(labelEl);
                    const $input = this.inputFinderFunc ? this.inputFinderFunc($swatches, $label) : $swatches.find(`[id="${$label.attr('for')}"]`);
                    const attributeValue = Number($input.attr('value'));
                    const attributeId = Number($input.attr('name').replace(/attribute\[([0-9]+)\]/, '$1'));

                    if (typeof attributesData.in_stock_attributes !== 'object' || attributesData.in_stock_attributes.indexOf(attributeValue) > -1) {
                        swatches.push({
                            content: $label.html(),
                            label: $input.data('productAttributeLabel'),
                            attributeId,
                            attributeValue,
                        });
                    }
                });

                if (swatches.length > 0) {
                    data.attributes.push(swatches);
                }
            });
        }

        if (data.attributes.length === 0 || !this.attributesTemplate) {
            return;
        }

        const html = Mustache.render(this.attributesTemplate, data, null, this.templateCustomTags);
        this.$attributesContainer.append(html);

        let $form;

        if (this.graphQLNode) {
            // build Form from graphQL
            $form = $('<form class="productSwatches-hiddenForm"></form>').hide();
            $form.append('<input type="hidden" name="action" value="add">');
            $form.append(`<input type="hidden" name="product_id" value="${this.productId}">`);
            $form.append(`<input type="hidden" name="qty[]" value="${this.graphQLNode.minPurchaseQuantity || 1}">`);
            this.graphQLNode.productOptions.edges.forEach(({ node: optionNode }) => {
                let defaultValue = '';
                if (optionNode.values) {
                    defaultValue = this.autoSelectOptionValues && optionNode.values.edges.length > 0 ? optionNode.values.edges[0].node.entityId : '';
                    defaultValue = optionNode.values.edges.reduce((_defaultValue, { node: valueNode }) => (valueNode.isDefault ? valueNode.entityId : _defaultValue), defaultValue);
                    if (!defaultValue && attributesData && attributesData.in_stock_attributes) {
                        defaultValue = optionNode.values.edges.reduce((_defaultValue, { node: valueNode }) => _defaultValue || (attributesData.in_stock_attributes.indexOf(valueNode.entityId) > -1 ? valueNode.entityId : ''), '');
                    }
                } else if (optionNode.checkedByDefault) {
                    defaultValue = 1;
                }
                $form.append(`<input type="hidden" name="attribute[${optionNode.entityId}]" value="${defaultValue}">`);
            });

            const $cardOption = $('.productSwatches-swatches-item', this.$attributesContainer);
            this.updateAttributeSelect(this.arrayAttributeSelect, $cardOption);
        } else {
            // build Form from AJAX request
            const $form2 = $('<div></div>').append(resp).find(this.addToCartFormSelector)
                .addClass('productSwatches-hiddenForm')
                .hide();

            // Remove all 'id' to avoid duplicated label.for in quick-view
            $form2.find('[id]').prop('id', null);
        }

        this.$attributesContainer.append($form);

        this.$attributesContainer.on('click', '[data-attribute-id]', (event) => {
            event.preventDefault();

            const $a = $(event.currentTarget);
            const id = $a.data('attributeId');
            const value = $a.data('attributeValue');

            this.$attributesContainer
                .find(`[data-attribute-id=${id}]`).removeClass('is-active')
                .find('input').prop('checked', false);
            $a.addClass('is-active')
                .find('input').prop('checked', true);

            $form.find(`[name="attribute[${id}]"]`).val([value]);

            this.requestAttributesChange($form);
        });

        if (this.swatchesLimit) {
            this.$attributesContainer.find('[data-more]').each((i, moreEl) => {
                const $more = $(moreEl);
                const $list = $more.closest('[data-swatches]');
                const $less = $list.find('[data-less]');
                const $items = $list.find('[data-attribute-id]');

                if ($items.length > this.swatchesLimit) {
                    const $hiddenItems = $items.filter(j => j >= this.swatchesLimit).hide();
                    const txtMore = `+ ${$items.length - this.swatchesLimit}`;
                    $more.text(txtMore);
                    $more.on('click', () => {
                        $hiddenItems.show();
                        $more.hide();
                        $less.show();
                    });
                    $less.on('click', () => {
                        $hiddenItems.hide();
                        $less.hide();
                        $more.show();
                    });
                } else {
                    $more.hide();
                }

                $less.hide();
            });
        } else {
            this.$attributesContainer.find('[data-more], [data-less]').hide();
        }
    }

    requestAttributesChange($form) {
        if (!window.FormData) {
            return;
        }

        const data = this.filterEmptyFilesFromForm(new FormData($form.get(0)));

        $.ajax({
            url: `/remote/v1/product-attributes/${this.productId}`,
            method: 'POST',
            contentType: false,
            processData: false,
            data,
            headers: {
                'stencil-config': '{}',
                'stencil-options': '{}',
                'x-xsrf-token': window.BCData && window.BCData.csrf_token ? window.BCData.csrf_token : '',
            },
            xhrFields: {
                withCredentials: true,
            },
            success: (resp) => {
                const { image, price } = resp.data;

                this.updateCardImage(image?.data);

                if (price) {
                    const viewModel = this.getViewModel(this.$scope);
                    this.updatePriceView(viewModel, price);
                }
            },
        });
    }

    updateCardPriceMess() {
        if (this.graphQLNode.availabilityV2.message) {
            const messPurchase = this.graphQLNode.availabilityV2.message;
            this.$cardPriceContainer.html(`<span class="price--call">${messPurchase}</span>`);
        }
    }

    updateCardImage(urlTemplate) {
        if (this.imageReplacerFunc) {
            const img = urlTemplate ? urlTemplate.data.replace('{:size}', this.imageSize) : null;
            this.imageReplacerFunc(this.$cardImage, img);
        } else if (urlTemplate) {
            const img = urlTemplate.replace('{:size}', this.imageSize);
            if (!this.$cardImage.data('originalSrc')) {
                this.$cardImage
                    .data('originalSrc', this.$cardImage.attr('src'))
                    .data('originalSrcset', this.$cardImage.attr('srcset'));
            }
            this.$cardImage
                .attr('src', img)
                .attr('srcset', '')
                .attr('data-srcset', '')
                .addClass('productSwatches-image-optionChanged');
        } else if (this.$cardImage.data('originalSrc')) {
            this.$cardImage
                .attr('src', this.$cardImage.data('originalSrc'))
                .attr('srcset', this.$cardImage.data('originalSrcset'))
                .attr('data-srcset', this.$cardImage.data('originalSrcset'))
                .data('originalSrc', null)
                .data('originalSrcset', null)
                .removeClass('productSwatches-image-optionChanged');
        }
    }

    updateAttributeSelect(arraySelect, cardOption) {
        if (!arraySelect) {
            // eslint-disable-next-line no-useless-return
            return;
        }

        arraySelect.forEach((itemSelect) => {
            const idSelect = itemSelect.node.entityId;
            const idValue = itemSelect.node.values?.edges[0].node.entityId;
            cardOption.each((index, item) => {
                const idItem = $(item).data('attributeId');
                const valueItem = $(item).data('attributeValue');

                if (idItem === idSelect && idValue === valueItem) {
                    $(item).addClass('is-active');
                }
            });
        });
    }

    /**
     * https://stackoverflow.com/questions/49672992/ajax-request-fails-when-sending-formdata-including-empty-file-input-in-safari
     * Safari browser with jquery 3.3.1 has an issue uploading empty file parameters. This function removes any empty files from the form params
     * @param formData: FormData object
     * @returns FormData object
     */
    filterEmptyFilesFromForm(formData) {
        try {
            for (const [key, val] of formData) {
                if (val instanceof File && !val.name && !val.size) {
                    formData.delete(key);
                }
            }
        } catch (e) {
            console.error(e); // eslint-disable-line no-console
        }
        return formData;
    }

    /**
     * Since $productView can be dynamically inserted using render_with,
     * We have to retrieve the respective elements
     *
     * @param $scope
     */
    getViewModel($scope) {
        return {
            $priceWithTax: $('[data-product-price-with-tax]', $scope),
            $priceWithoutTax: $('[data-product-price-without-tax]', $scope),
            rrpWithTax: {
                $div: $('.rrp-price--withTax', $scope),
                $span: $('[data-product-rrp-price-with-tax]', $scope),
            },
            rrpWithoutTax: {
                $div: $('.rrp-price--withoutTax', $scope),
                $span: $('[data-product-rrp-price-without-tax]', $scope),
            },
            nonSaleWithTax: {
                $div: $('.non-sale-price--withTax', $scope),
                $span: $('[data-product-non-sale-price-with-tax]', $scope),
            },
            nonSaleWithoutTax: {
                $div: $('.non-sale-price--withoutTax', $scope),
                $span: $('[data-product-non-sale-price-without-tax]', $scope),
            },
            priceSaved: {
                $div: $('.price-section--saving', $scope),
                $span: $('[data-product-price-saved]', $scope),
            },
            priceNowLabel: {
                $span: $('.price-now-label', $scope),
            },
            priceLabel: {
                $span: $('.price-label', $scope),
            },
            saleLabel: {
                $div: $('.sale-flag-side._percent', $scope),
                $span: $('.sale-flag-side._percent', $scope).find('.sale-text'),
            },
        };
    }

    /**
     * Hide the pricing elements that will show up only when the price exists in API
     * @param viewModel
     */
    clearPricingNotFound(viewModel) {
        viewModel.rrpWithTax.$div.hide();
        viewModel.rrpWithoutTax.$div.hide();
        viewModel.nonSaleWithTax.$div.hide();
        viewModel.nonSaleWithoutTax.$div.hide();
        viewModel.priceSaved.$div.hide();
        viewModel.priceNowLabel.$span.hide();
        viewModel.priceLabel.$span.hide();
    }

    /**
     * Update the view of price, messages, SKU and stock options when a product option changes
     * @param  {Object} data Product attribute data
     */
    updatePriceView(viewModel, price) {
        this.clearPricingNotFound(viewModel);

        if (price.with_tax) {
            viewModel.priceLabel.$span.show();
            viewModel.$priceWithTax.html(price.with_tax.formatted);

            // Update sale badge
            const comparePrice = (price.rrp_with_tax && this.showRrp) ? price.rrp_with_tax : price.non_sale_price_with_tax;
            if (!comparePrice) return;

            const currency = extractMoney(price.with_tax.formatted);
            let displayValue = '';

            if (this.productSaleBadges === 'percent') {
                const percent = Math.round((1 - price.with_tax.value / comparePrice.value) * 100);
                displayValue = `${percent}%`;
            } else if (this.productSaleBadges === 'price') {
                const amount = (comparePrice.value - price.with_tax.value).toFixed(currency.decimal_places);
                displayValue = amount % 1 === 0
                    ? currencyFormat(Math.floor(amount), { ...currency, decimal_places: 0 })
                    : currencyFormat(amount, currency);
            }

            if (displayValue) {
                viewModel.saleLabel.$span.text(this.productSaleLabel.includes('{percent}')
                    ? this.productSaleLabel.replace('{percent}', displayValue)
                    : `${this.productSaleLabel}${displayValue}`);
            }
        }

        if (price.without_tax) {
            viewModel.priceLabel.$span.show();
            viewModel.$priceWithoutTax.html(price.without_tax.formatted);

            // Update sale badge
            const comparePrice = (price.rrp_without_tax && this.showRrp) ? price.rrp_without_tax : price.non_sale_price_without_tax;
            if (!comparePrice) return;

            const currency = extractMoney(price.without_tax.formatted);
            let displayValue = '';

            if (this.productSaleBadges === 'percent') {
                const percent = Math.round((1 - price.without_tax.value / comparePrice.value) * 100);
                displayValue = `${percent}%`;
            } else if (this.productSaleBadges === 'price') {
                const amount = (comparePrice.value - price.without_tax.value).toFixed(currency.decimal_places);
                displayValue = amount % 1 === 0
                    ? currencyFormat(Math.floor(amount), { ...currency, decimal_places: 0 })
                    : currencyFormat(amount, currency);
            }

            if (displayValue) {
                viewModel.saleLabel.$span.text(this.productSaleLabel.includes('{percent}')
                    ? this.productSaleLabel.replace('{percent}', displayValue)
                    : `${this.productSaleLabel}${displayValue}`);
            }
        }

        if (price.rrp_with_tax) {
            viewModel.rrpWithTax.$div.show();
            viewModel.rrpWithTax.$span.html(price.rrp_with_tax.formatted);
        }

        if (price.rrp_without_tax) {
            viewModel.rrpWithoutTax.$div.show();
            viewModel.rrpWithoutTax.$span.html(price.rrp_without_tax.formatted);
        }

        if (price.saved) {
            viewModel.priceSaved.$div.show();
            viewModel.priceSaved.$span.html(price.saved.formatted);
        }

        if (price.non_sale_price_with_tax) {
            viewModel.priceLabel.$span.hide();
            viewModel.nonSaleWithTax.$div.show();
            viewModel.priceNowLabel.$span.show();
            viewModel.nonSaleWithTax.$span.html(price.non_sale_price_with_tax.formatted);
        }

        if (price.non_sale_price_without_tax) {
            viewModel.priceLabel.$span.hide();
            viewModel.nonSaleWithoutTax.$div.show();
            viewModel.priceNowLabel.$span.show();
            viewModel.nonSaleWithoutTax.$span.html(price.non_sale_price_without_tax.formatted);
        }
    }

    initCountdown() {
        if (this.$countdown.length === 0) return;

        const strEndDate = this.graphQLNode.customFields?.edges?.find(({ node }) => node.name === this.countdownCustomField)?.node?.value;
        if (!strEndDate) return;

        const date = parseCountdownDate(strEndDate);
        if (!date) return;

        SaleCountdown.add(this.$countdown, date);
    }
}

export default Card;
