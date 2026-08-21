import _ from 'lodash';
import mediaQueryListFactory from '../common/media-query-list';
import { CartPreviewEvents } from './cart-preview';
import { isADA } from '../../papathemes/utils';

const PLUGIN_KEY = {
    CAMEL: 'mobileMenuToggle',
    SNAKE: 'mobile-menu-toggle',
};

function optionsFromData($element) {
    const mobileMenuId = $element.data(PLUGIN_KEY.CAMEL);

    return {
        menuSelector: mobileMenuId && `#${mobileMenuId}`,
    };
}

/*
 * Manage the behaviour of a mobile menu
 * @param {jQuery} $toggle
 * @param {Object} [options]
 * @param {Object} [options.headerSelector]
 * @param {Object} [options.menuSelector]
 * @param {Object} [options.scrollViewSelector]
 */
export class MobileMenuToggle {
    constructor($toggle, {
        headerSelector = '.header',
        menuSelector = '#menu',
        scrollViewSelector = '.navPages',
    } = {}) {
        // papathemes-supermarket {{{
        this.menuSelector = menuSelector;
        this.scrollViewSelector = scrollViewSelector;
        // }}}

        this.$body = $('body');
        this.$menu = $(menuSelector);
        this.$containerMenu = $('#bf-fix-menu-mobile', menuSelector);
        this.$navList = $('.navPages-list.navPages-list-depth-max');
        this.$header = $(headerSelector);
        this.$scrollView = $(scrollViewSelector, this.$menu);
        this.$subMenus = this.$navList.find('.navPages-action');
        this.$toggle = $toggle;
        this.mediumMediaQueryList = mediaQueryListFactory('medium');
        this.delayTimer = null;

        // Auto-bind
        this.onToggleClick = this.onToggleClick.bind(this);
        this.onCartPreviewOpen = this.onCartPreviewOpen.bind(this);
        this.onMediumMediaQueryMatch = this.onMediumMediaQueryMatch.bind(this);
        this.onSubMenuClick = this.onSubMenuClick.bind(this);
        this.onBodyClickHideMenu = this.onBodyClickHideMenu.bind(this);
        this.onEscapeCloseMenu = this.onEscapeCloseMenu.bind(this);

        // Listen
        this.bindEvents();

        // Assign DOM attributes
        this.$toggle.attr('aria-controls', this.$menu.attr('id'));

        // Hide by default
        this.hide();
    }

    // papathemes-supermarket
    reInit() {
        this.unbindEvents();

        this.$menu = $(this.menuSelector);
        this.$scrollView = $(this.scrollViewSelector, this.$menu);
        this.$toggle.attr('aria-controls', this.$menu.attr('id'));

        this.bindEvents();
        this.hide();
    }

    get isOpen() {
        return this.$menu.hasClass('is-open');
    }

    bindEvents() {
        this.$toggle.on('click', this.onToggleClick);
        this.$header.on(CartPreviewEvents.open, this.onCartPreviewOpen);
        this.$subMenus.on('click', this.onSubMenuClick);
        this.$toggle.on('keydown', this.onEscapeCloseMenu);
        this.$menu.on('keydown', this.onEscapeCloseMenu);

        if (this.mediumMediaQueryList && this.mediumMediaQueryList.addListener) {
            this.mediumMediaQueryList.addListener(this.onMediumMediaQueryMatch);
        }
    }

    unbindEvents() {
        this.$toggle.off('click', this.onToggleClick);
        this.$header.off(CartPreviewEvents.open, this.onCartPreviewOpen);
        this.$toggle.off('keydown', this.onEscapeCloseMenu);
        this.$menu.off('keydown', this.onEscapeCloseMenu);

        if (this.mediumMediaQueryList && this.mediumMediaQueryList.addListener) {
            this.mediumMediaQueryList.removeListener(this.onMediumMediaQueryMatch);
        }
    }

    toggle() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    onEscapeCloseMenu(event) {
        if (this.isOpen && (event.key === 'Escape')) {
            if (!this.mediumMediaQueryList.matches) {
                this.$toggle.trigger('click');
                _.delay(() => {
                    this.$toggle.focus();
                }, 300);
            }
        }
    }

    // close menu popup when click outside the menu popup or other modal
    onBodyClickHideMenu(event) {
        if (this.isOpen && $(event.target).closest('#menu, [data-reveal], [data-mobile-menu-toggle]').length === 0) {
            this.hide();
        }
    }

    delay(func, wait = 400) {
        clearTimeout(this.delayTimer);
        this.delayTimer = setTimeout(func, wait);
    }

    show() {
        this.$body.addClass('has-activeNavPages');

        // papathemes-inhealth: update menu position
        // this.$menu.css('top', `${$('header').first().outerHeight()}px`);
        // papathemes-inhealth: Accessibility - Make other elements not focusable
        if (isADA()) {
            // only set 'inert' if customer using accessibility focus (tab key)
            // to improve performance INP score
            this.delay(() => {
                this.$body.children().not('header, #quickSearch, .modal').prop('inert', true);
            });
        }
        this.$toggle.siblings().prop('inert', true);

        this.$toggle
            .addClass('is-open')
            .attr('aria-expanded', true);

        this.$menu
            .addClass('is-open');

        this.$header.addClass('is-open');
        this.$scrollView.scrollTop(0);
        this.$containerMenu.scrollTop(0);

        this.$body.off('click', this.onBodyClickHideMenu);
        this.$body.on('click', this.onBodyClickHideMenu);

        this.resetSubMenus();
    }

    hide() {
        this.$body.removeClass('has-activeNavPages');

        // papathemes-inhealth: Accessibility - Restore other elements focusable
        this.delay(() => {
            this.$body.children().not('header, #quickSearch, .modal').prop('inert', false);
        });
        this.$toggle.siblings().prop('inert', false);
        // this.$toggle.get(0).focus(); // papathemes-inhealth: no need for this theme

        this.$toggle
            .removeClass('is-open')
            .attr('aria-expanded', false);

        this.$menu
            .removeClass('is-open');

        this.$header.removeClass('is-open');
        this.$body.off('click', this.onBodyClickHideMenu);

        this.resetSubMenus();
    }

    // Private
    onToggleClick(event) {
        event.preventDefault();

        this.toggle();
    }

    onCartPreviewOpen() {
        if (this.isOpen) {
            this.hide();
        }
    }

    onMediumMediaQueryMatch(media) {
        if (!media.matches) {
            return;
        }

        this.hide();
    }

    onSubMenuClick(event) {
        const $closestAction = $(event.target).closest('.navPages-action');
        const $parentSiblings = $closestAction.parent().siblings();
        const $parentAction = $closestAction.closest('.navPage-subMenu-horizontal').siblings('.navPages-action');

        if (this.$subMenus.hasClass('is-open')) {
            this.$navList.addClass('subMenu-is-open');
        } else {
            this.$navList.removeClass('subMenu-is-open');
        }

        if ($(event.target).hasClass('is-open')) {
            $parentSiblings.addClass('is-hidden');
            $parentAction.addClass('is-hidden');
        } else {
            $parentSiblings.removeClass('is-hidden');
            $parentAction.removeClass('is-hidden');
        }
    }

    resetSubMenus() {
        this.$navList.find('.is-hidden').removeClass('is-hidden');
        this.$navList.removeClass('subMenu-is-open');
    }
}

/*
 * Create a new MobileMenuToggle instance
 * @param {string} [selector]
 * @param {Object} [options]
 * @param {Object} [options.headerSelector]
 * @param {Object} [options.menuSelector]
 * @param {Object} [options.scrollViewSelector]
 * @return {MobileMenuToggle}
 */
export default function mobileMenuToggleFactory(selector = `[data-${PLUGIN_KEY.SNAKE}]`, overrideOptions = {}) {
    const $toggle = $(selector); // papathemes-beautify
    const instanceKey = `${PLUGIN_KEY.CAMEL}Instance`;
    const cachedMobileMenu = $toggle.data(instanceKey);

    if (cachedMobileMenu instanceof MobileMenuToggle) {
        return cachedMobileMenu;
    }

    const options = _.extend(optionsFromData($toggle), overrideOptions);
    const mobileMenu = new MobileMenuToggle($toggle, options);

    $toggle.data(instanceKey, mobileMenu);

    return mobileMenu;
}
