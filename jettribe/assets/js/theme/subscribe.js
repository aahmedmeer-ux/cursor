// Supermarket Theme: Implement for newsletter popup

import PageManager from '../page-manager';
import { hideForSubscribed } from '../papathemes/newsletter-popup';

export default class Subscribe extends PageManager {
    loaded(next) {
        if (this.context.nl_popup_show !== '' && this.context.nl_popup_show !== 'hide') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('result') === 'success') {
                hideForSubscribed();
            }
        }
        next();
    }
}
