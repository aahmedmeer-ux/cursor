import { once } from 'lodash';
import './global/jquery-migrate';
import './common/select-option-plugin';
import PageManager from '../page-manager';
import quickSearch from './global/quick-search';
import currencySelector from './global/currency-selector';
import mobileMenuToggle from './global/mobile-menu-toggle';
import menu from './global/menu';
import foundation from './global/foundation';
import cartPreview from './global/cart-preview';
import carousel from './common/carousel';
import svgInjector from './global/svg-injector';

// papathemes added
import papathemes from '../papathemes/theme';
import beautify from '../beautify/global';
import mooncat from '../mooncat/global';
import kitchenary from '../kitchenary/global';
import initMenuFromSidebar from '../mooncat/menu';
import loginForm from '../dinosaur/login-form';
import dinosaur from '../dinosaur/global';

function quickView(context) {
    const load = once(() => {
        import('./global/quick-view').then(module => {
            module.default(context);
        });
    });

    $(window).one('scroll', load);
    $(document).one('touchstart mouseenter', load);
    setTimeout(load, window.supermarketThemeExtraConfig.delayJS);
}

async function async(func, ...args) {
    func(...args);
}

export default class Global extends PageManager {
    onReady() {
        const {
            cartId,
        } = this.context;
        cartPreview(this.context.secureBaseUrl, this.context.cartId, this.context); // mooncat edited
        if (this.context.show_quick_search) {
            quickSearch(this.context);
        }
        currencySelector(cartId);
        foundation($(document));
        quickView(this.context);
        carousel();
        initMenuFromSidebar(); // mooncat added
        menu();
        mobileMenuToggle();
        papathemes(this.context); // papathemes added
        svgInjector();
        beautify(this.context);
        mooncat(this.context);
        kitchenary(this.context); // kitchenary added
        dinosaur(this.context); // dinosaur added
        async(loginForm, this.context);
    }
}
