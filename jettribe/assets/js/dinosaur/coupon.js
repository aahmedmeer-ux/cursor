import utils from '@bigcommerce/stencil-utils';

export function savePromoCodeLocalStorage(couponCode) {
    if (!window.localStorage) {
        return;
    }
    window.localStorage.setItem('COUPON_CODE', JSON.stringify(couponCode));
}

export function showAlertModalCoupons(error = true, message, scope) {
    const alertSuccess = $('.alert-coupons._success', scope);
    const alertError = $('.alert-coupons._error', scope);
    if (error) {
        alertError.find('._desc').text(message);
        alertError.css('display', 'flex');
        setTimeout(() => {
            alertError.hide();
        }, 3000);
    } else {
        alertSuccess.find('._desc').text(message);
        alertSuccess.css('display', 'flex');
        setTimeout(() => {
            alertSuccess.hide();
        }, 3000);
    }
}

export function savePromoCodeTicket(e, couponTicket, $scope, context, couponSelected) {
    try {
        if (!couponSelected) {
            // eslint-disable-next-line no-param-reassign
            couponSelected = JSON.parse(localStorage.getItem('COUPON_CODE'));
        }
    } catch (error) {
        return;
    }
    couponTicket.each((index, item) => {
        $(item).removeClass('active');
        if ($(item).data('papathemes-coupon-code') === couponSelected) {
            $(item).addClass('active');
        }
    });
    couponTicket.removeClass('active');
    e.preventDefault();
    $(e.currentTarget).addClass('active');
    const couponCode = $(e.currentTarget).data('papathemes-coupon-code');

    if (couponCode === couponSelected) {
        return;
    }

    if (!couponCode) {
        return showAlertModalCoupons(true, context.txtCouponEmpty, $scope);
    }

    utils.api.cart.applyCode(couponCode, (err, response) => {
        if (response.data.status === 'success') {
            savePromoCodeLocalStorage(couponCode);
            showAlertModalCoupons(false, context.txtSaveCoupon, $scope);
            $('body').trigger('cart-refresh-content');
        } else {
            showAlertModalCoupons(true, response.data.errors.join('\n'), $scope);
            $(e.currentTarget).removeClass('active');
            couponTicket.each((index, item) => {
                if ($(item).data('papathemes-coupon-code') === couponSelected) {
                    $(item).addClass('active');
                }
            });
        }
    });
}

export function loadPromoTicket(scope) {
    const $couponTicket = $('[data-papathemes-coupon-code]', scope);
    const $wrapperCoupon = $('[data-papathemes-coupon-code-list]', scope);
    let couponSelected;
    try {
        couponSelected = JSON.parse(localStorage.getItem('COUPON_CODE'));
    } catch (error) {
        return;
    }
    $couponTicket.each((index, item) => {
        $(item).removeClass('active');
        if ($(item).data('papathemes-coupon-code') === couponSelected) {
            $(item).addClass('active');
            const scrollLeftPositionActive = $(item).position().left;
            $wrapperCoupon.animate({
                scrollLeft: scrollLeftPositionActive,
            }, 500);
        }
    });
}

export function actionPromoTicket($scope, context, couponSelected) {
    $('[data-papathemes-coupon-code]', $scope).off('click').on('click', (e) => {
        savePromoCodeTicket(e, $('[data-papathemes-coupon-code]'), $scope, context, couponSelected);
    });

    $('[data-papathemes-coupon-code]', $scope).off('keydown').on('keydown', (e) => {
        if (e.keyCode === 32 || e.keyCode === 13) {
            savePromoCodeTicket(e, $('[data-papathemes-coupon-code]'), $scope, context, couponSelected);
        }
    });
}
