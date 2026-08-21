/* eslint-disable no-unused-vars */
import mediaQueryListFactory from '../theme/common/media-query-list';
import { inert } from './utils';

const mediumMediaQueryList = mediaQueryListFactory('medium');

export default function initLoginPopup(context) {
    const $loginPopup = $('#login-popup');
    const $elButtonLogin = $('#login-dropdown-navRight, #login-dropdown-navLeft');
    const $elButtonClose = $('#close-popup-login');
    const $body = $('body');
    const onBodyClick = (event) => {
        if (!$(event.target).closest('#login-popup, #login-dropdown-navLeft').length) {
            $elButtonClose.trigger('click');
        }
    };

    const closePopup = () => {
        $('#login_email_popup, #login_pass_popup').val('');
        $('.form-field', $loginPopup).removeClass('form-field--error');
        $('.form-field', $loginPopup).removeClass('form-field--success');
        $('.form-inlineMessage', $loginPopup).hide();
        $elButtonLogin.removeClass('is-open');
        $loginPopup.removeClass('is-open');
        $loginPopup.attr('aria-hidden', $loginPopup.hasClass('is-open'));
        $elButtonClose.attr('aria-expanded', !$loginPopup.hasClass('is-open'));
        if (!mediumMediaQueryList.matches) {
            setTimeout(() => {
                inert($loginPopup, false);
            }, 300);
        }

        $body.off('click', onBodyClick);
    };

    const openPopup = () => {
        if (!mediumMediaQueryList.matches) {
            setTimeout(() => {
                inert($loginPopup);
                $elButtonClose.focus();
            }, 300);
        }

        $body.on('click', onBodyClick);
    };

    let t;

    $loginPopup.find('input[type="button"], a, button').last().on('focusout', () => {
        if (mediumMediaQueryList.matches) {
            t = setTimeout(() => {
                closePopup();
            }, 200);
        }
    });

    $loginPopup.on('focus click', '*', () => {
        clearTimeout(t);
    });

    $loginPopup
        .on('close.toggle', closePopup)
        .on('open.toggle', openPopup)
        .on('keydown', (event) => {
            if (event.key === 'Escape') {
                $elButtonClose.trigger('click');
                setTimeout(() => {
                    $elButtonLogin.focus();
                }, 300);
            }
        });

    const closePopUpMobile = () => {
        if (!mediumMediaQueryList.matches && $loginPopup.hasClass('is-open')) {
            closePopup();
        } else if (mediumMediaQueryList.matches && $loginPopup.hasClass('is-open')) {
            inert($loginPopup, false);
        }
    };

    closePopUpMobile();
    mediumMediaQueryList.addListener(closePopUpMobile);
}
