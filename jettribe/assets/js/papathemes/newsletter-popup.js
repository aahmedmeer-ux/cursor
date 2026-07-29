import modalFactory, { ModalEvents } from '../theme/global/modal';
import Cookies from 'js-cookie';

let singletonModal;

/**
 * Create and return Modal object used for showing newsletter
 */
function getModal() {
    if (!singletonModal) {
        singletonModal = modalFactory('#newsletterPopupModal')[0];
        singletonModal.$modal
            .on(ModalEvents.open, () => {
                $('body').addClass('has-activeModal--newsletter').removeClass('has-activeModal');
            })
            .on(ModalEvents.opened, () => {
                singletonModal.$modal.removeAttr('tabindex');
                window.setTimeout(() => singletonModal.$modal.find('.modal-close').focus(), 500);
            })
            .on(ModalEvents.closed, () => {
                $('body').removeClass('has-activeModal--newsletter');
            });

        singletonModal.$content.on('change', 'input[name=hide]', (event) => {
            const $el = $(event.target);
            if ($el.prop('checked')) {
                Cookies.set('NL_POPUP_HIDE', 1, { expires: 1 });
            } else {
                Cookies.remove('NL_POPUP_HIDE');
            }
        });
        singletonModal.$modal.insertBefore($('.body').first());
    }
    return singletonModal;
}

/**
 * Don't show popup for subscribed user within 7 days
 */
export function hideForSubscribed() {
    Cookies.set('NL_POPUP_HIDE', 1, { expires: 7 });
}

/**
 * Check and show newsletter popup if need
 *
 * @param {object} context
 */
export default function (context) {
    if (!Cookies.get('NL_POPUP_HIDE')) {
        let last = parseInt(Cookies.get('NL_POPUP_LAST'), 10);
        if (Number.isNaN(last)) {
            last = 0;
        }

        let hideSec = parseInt(context.nl_popup_hide, 10);
        if (Number.isNaN(hideSec)) {
            hideSec = 0;
        }

        if (last === 0 || hideSec === 0 || last + hideSec * 1000 <= Date.now()) {
            let waitSec = parseInt(context.nl_popup_start, 10);
            if (Number.isNaN(waitSec)) {
                waitSec = 0;
            }

            const showPopup = () => {
                // wait until other popup is closed before showing the newsletter popup
                if ($('body').hasClass('has-activeModal')) {
                    return setTimeout(() => showPopup(), 2000);
                }
                if (!Cookies.get('NL_POPUP_HIDE')) {
                    Cookies.set('NL_POPUP_LAST', Date.now(), { expires: 1 });

                    // Show newsletter popup
                    getModal().open({ size: 'small', pending: false, clearContent: false });
                }
            };

            setTimeout(() => showPopup(), waitSec * 1000);
        }
    }
}
