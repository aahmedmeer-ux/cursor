import utils from '@bigcommerce/stencil-utils';
import modalFactory from '../theme/global/modal';
import AskQuestion from './ask-question';

export default function initPopupLink(context) {
    $('body').on('click', '[data-papathemes-popup]', (event) => {
        event.preventDefault();
        const $el = $(event.currentTarget);
        const url = $el.prop('href');
        const template = $el.data('template') || 'papathemes/page/popup';
        const modal = modalFactory('#popupModal')[0];
        const $targetProductUrl = $el.data('product-url');
        modal.open();
        utils.api.getPage(url, { template }, (err, resp) => {
            modal.updateContent(resp, true);
            // Init reCaptcha
            if (modal.$content.find('.g-recaptcha').length > 0) {
                if (window.grecaptcha) {
                    modal.$content.find('.g-recaptcha').each((i, el) => {
                        window.grecaptcha.render(el);
                    });
                } else {
                    $('head').append(`<script src="https://www.google.com/recaptcha/api.js" async defer nonce="${window.__webpack_nonce__}"></script>`);
                }
            }

            if (modal.$content.find('[data-ask-question-form]').length > 0) {
                const askQuestion = new AskQuestion({
                    ...context,
                    productUrl: $targetProductUrl,
                });
                askQuestion.onReady();
            }
        });
    });
}
