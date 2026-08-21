import { currencyFormat, extractMoney } from '../papathemes/utils';

function findMaxRangeQuantity(scopeRange) {
    let max = -Infinity;
    $('[data-bulk-pricing-slider-item]', scopeRange).each((index, item) => {
        const currentIndex = Number($(item).data('min'));
        if (currentIndex > max) {
            max = currentIndex;
        }
    });
    return max;
}

let sliderOnchange = true;

export function listenQuantityBulkPricing(quantity, scopeRange, scopeSlider, minPurchase, maxPurchase) {
    const maxItem = findMaxRangeQuantity(scopeRange);
    let valueRange;
    sliderOnchange = false;
    $('[data-bulk-pricing-slider-item]', scopeRange).each((index, item) => {
        const rangeMin = Number($(item).data('min'));
        const rangeMax = Number($(item).data('max'));
        if (quantity === 1) {
            $(item).hide();
            $('[data-bulk-pricing-slider-input]', scopeSlider).val(0);
            $('[data-range-index="0"]', scopeRange).show();
        }
        if (rangeMin === quantity || rangeMax === quantity) {
            $('[data-bulk-pricing-slider-item]', scopeRange).hide();
            $(item).show();
            valueRange = $(item).data('rangeIndex');
            $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(valueRange));
        } else if (quantity > maxItem) {
            $(item).hide();
            $(`[data-min="${maxItem}"]`, scopeRange).show();
            valueRange = $(`[data-point-min="${ maxItem }"]`, scopeSlider).data('index');
            $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(valueRange));
        }

        if (minPurchase && minPurchase === quantity) {
            $(item).hide();
            $(`[data-min="${ minPurchase }"], [data-max="${ minPurchase }"]`, scopeRange).show();
            const indexValue = $(`[data-min="${ minPurchase }"], [data-max="${ minPurchase }"]`, scopeRange).data('range-index');
            $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(indexValue));
        }

        if (maxPurchase && maxPurchase === quantity) {
            if ($(`[data-max="${ maxPurchase }"]`, scopeRange).length !== 0) {
                $(item).hide();
                $(`[data-max="${ maxPurchase }"]`, scopeRange).show();
                const indexMaxValue = $(`[data-max="${ maxPurchase }"]`, scopeRange).data('range-index');
                $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(indexMaxValue));
            }
        }
    });
}

export function bulkPricingInfo(dataPriceProduct, scopeRange, scopeSlider, $input, quantity = null) {
    const minPurchase = scopeSlider.data('min-purchase');
    const maxPurchase = scopeSlider.data('max-purchase');
    const priceFormatted = scopeRange.data('product-detail-price-formatted');
    if (dataPriceProduct === undefined) {
        // eslint-disable-next-line no-param-reassign
        dataPriceProduct = scopeRange.data('product-detail-price');
    }
    if (priceFormatted === undefined) {
        return;
    }

    const money = extractMoney(priceFormatted);
    $('[data-bulk-pricing-slider-input]', scopeSlider).on('input', (e) => {
        sliderOnchange = false;
        $('[data-range-index]', scopeRange).each((index, item) => {
            const $item = $(item);
            $item.hide();

            if (Number($item.data('rangeIndex')) === Number(e.target.value)) {
                $item.show();
                if (!minPurchase || !maxPurchase) {
                    $input.val(Number($item.data('min')));
                    if (Number(e.target.value) === 0) {
                        $input.val(1);
                    }
                }
                if ($item.data('min') < minPurchase && ($item.data('max') < minPurchase && $item.data('max') !== 0)) {
                    const indexMinValue = $(`[data-point-min="${ minPurchase }"]`, scopeSlider).data('index');
                    $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(indexMinValue));
                    $item.hide();
                }
                if ($item.data('min') < minPurchase && ($item.data('max') === minPurchase && $item.data('max') !== 0)) {
                    const indexMinValue = $(`[data-point-max="${ minPurchase }"]`, scopeSlider).data('index');
                    $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(indexMinValue));
                    $item.hide();
                }
                if ($item.data('min') === minPurchase) {
                    $input.val(Number($item.data('min')));
                } else if ($item.data('max') === minPurchase) {
                    const indexMaxValue = $(`[data-point-max="${ minPurchase }"]`, scopeSlider).data('index');
                    $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(indexMaxValue));
                    $input.val(Number($item.data('max')));
                    $item.show();
                } else if ($item.data('min') === maxPurchase || $item.data('max') === maxPurchase) {
                    $input.val(Number($item.data('min')));
                } else if ($item.data('min') < maxPurchase && $item.data('max') < maxPurchase) {
                    $input.val(Number($item.data('min')));
                } else if ($item.data('min') > maxPurchase) {
                    const $prevMaxPurchase = $(`[data-range-index="${ Number(e.target.value) - 1 }"]`, scopeRange);
                    $prevMaxPurchase.show();
                    const prevMaxPurchaseValue = $prevMaxPurchase.data('min');
                    $input.val(prevMaxPurchaseValue);
                    $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(e.target.value) - 1);
                    $item.hide();
                }
            }
        });
    });
    $('[data-bulk-pricing-slider-point]', scopeSlider).each((index, item) => {
        $(item).css('left', `${(index * 100) / (Number(scopeSlider.data('bulk-pricing-length')))}%`);
        if (sliderOnchange) {
            const pointMin = $(item).data('point-min');
            const pointMax = $(item).data('point-max');
            if (minPurchase && (minPurchase === pointMin || minPurchase === pointMax)) {
                const minValue = $(item).data('index');
                $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(minValue));
            }
        }
    });
    $('[data-bulk-pricing-slider-item]', scopeRange).each((index, item) => {
        const min = $(item).data('min');
        const max = $(item).data('max');
        if ($(item).data('bulk-pricing-type') === 'percent') {
            const $bulkDiscount = $(item).find('[data-bulk-pricing-slider-discount]');
            const discountValue = $(item).data('discount');
            if (min === max || max > min || max === 0) {
                const valuePriceBulk = (dataPriceProduct - ((dataPriceProduct * discountValue) / 100)).toFixed(2);
                const priceBulkFormat = currencyFormat(valuePriceBulk, money);
                $bulkDiscount.text(priceBulkFormat);
            }
            if (discountValue === 0 && max === 0) {
                const valuePriceBulk = (dataPriceProduct).toFixed(2);
                const priceBulkFormat = currencyFormat(valuePriceBulk, money);
                $bulkDiscount.text(priceBulkFormat);
            }
        }

        if ($(item).data('bulk-pricing-type') === 'fixed') {
            const $discountPrice = $(item).find('[data-fixed-discount]');
            const discountValue = $(item).data('discount');
            if (min === max || max === 0 || max > min) {
                const valuePercentDiscount = ((dataPriceProduct - discountValue) * 100) / dataPriceProduct;
                const priceBulkFormat = currencyFormat(discountValue, money);
                $discountPrice.text(`${priceBulkFormat} (-${Number.isInteger(valuePercentDiscount) ? valuePercentDiscount : parseFloat(valuePercentDiscount.toFixed(2))}%)`);
            }
        }

        if ($(item).data('bulk-pricing-type') === 'price') {
            const $bulkDiscount = $(item).find('[data-bulk-pricing-slider-discount]');
            const $discountPrice = $(item).find('[data-price-discount]');
            const discountValue = $(item).data('discount');
            if (min === max || max === 0 || max > min) {
                const valuePriceBulk = (dataPriceProduct - discountValue).toFixed(2);
                const valuePercentDiscount = (discountValue * 100) / dataPriceProduct;
                const priceBulkFormat = currencyFormat(valuePriceBulk, money);
                $discountPrice.text(`(-${Number.isInteger(valuePercentDiscount) ? valuePercentDiscount : parseFloat(valuePercentDiscount.toFixed(2))}%)`);
                $bulkDiscount.text(priceBulkFormat);
            }
        }

        if (quantity === min) {
            const indexMinValue = $(`[data-point-min="${ quantity }"]`, scopeSlider).data('index');
            $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(indexMinValue));
            $('[data-range-index]').hide();
            $(`[data-range-index="${indexMinValue}"]`).show();
        } else if (quantity === max) {
            const indexMaxValue = $(`[data-point-max="${ quantity }"]`, scopeSlider).data('index');
            $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(indexMaxValue));
            $('[data-range-index]').hide();
            $(`[data-range-index="${indexMaxValue}"]`).show();
        } else if (quantity > min && max === 0) {
            const indexValue = $(`[data-point-min="${ min }"]`, scopeSlider).data('index');
            $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(quantity));
            $('[data-range-index]').hide();
            $(`[data-range-index="${indexValue}"]`).show();
        } else if (quantity > min && quantity < max) {
            const indexValue = $(`[data-point-max="${ max }"]`, scopeSlider).data('index');
            $('[data-bulk-pricing-slider-input]', scopeSlider).val(Number(indexValue));
            $('[data-range-index]').hide();
            $(`[data-range-index="${indexValue}"]`).show();
        }

        if (sliderOnchange) {
            if (minPurchase) {
                $(item).hide();
                if (minPurchase === min || minPurchase === max) {
                    $(item).show();
                }
            }
        }
    });

    scopeSlider.css({
        opacity: 1,
        visibility: 'visible',
    });
}
