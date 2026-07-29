import collapsibleFactory from '../common/collapsible';
import collapsibleGroupFactory from '../common/collapsible-group';
import mediaQueryListFactory from '../common/media-query-list'; // papathemes-beautify

const PLUGIN_KEY = 'menu';

const mediumMediaQueryList = mediaQueryListFactory('medium'); // papathemes-beautify

/*
 * Manage the behaviour of a menu
 * @param {jQuery} $menu
 */
class Menu {
    constructor($menu) {
        this.$menu = $menu;
        this.$body = $('body');
        this.hasMaxMenuDisplayDepth = this.$body.find('.navPages-list').hasClass('navPages-list-depth-max');

        // Init collapsible
        this.collapsibles = collapsibleFactory('[data-collapsible]', { $context: this.$menu });
        this.defaultCollapsibles = collapsibleFactory('.is-default[data-collapsible]', { $context: this.$menu }); // papathemes-beautify
        this.collapsibleGroups = collapsibleGroupFactory($menu);

        // papathemes-beautify: fix not collapse others if an element has is-open class at init.
        this.collapsibleGroups.forEach(group => {
            const _arr = collapsibleFactory($('.is-open[data-collapsible]', group.$component).first());
            if (_arr.length > 0) {
                // eslint-disable-next-line no-param-reassign
                group.openCollapsibles.push(_arr[0]);
            }
        });

        // Auto-bind
        this.onMenuClick = this.onMenuClick.bind(this);
        this.onDocumentClick = this.onDocumentClick.bind(this);
        this.onCollapsibleOpen = this.onCollapsibleOpen.bind(this); // papathemes-inhealth
        this.onCollapsibleClose = this.onCollapsibleClose.bind(this); // papathemes-inhealth
        this.onMediumMediaQueryMatch = this.onMediumMediaQueryMatch.bind(this); // papathemes-beautify

        // Listen
        this.bindEvents();
    }

    collapseAll() {
        this.disableSubAnimation = true; // papathemes-inhealth
        this.collapsibles.forEach(collapsible => collapsible.close()); // papathemes - supermarket: fix issue when click body dropdown menu being hidden
        this.collapsibleGroups.forEach(group => group.close());
        this.disableSubAnimation = false; // papathemes-inhealth

        // papathemes-beautify
        // Re-open the firt menu item
        if (mediumMediaQueryList.matches) {
            this.defaultCollapsibles.forEach(group => group.open());
        }
    }

    collapseNeighbors($neighbors) {
        const $collapsibles = collapsibleFactory('[data-collapsible]', { $context: $neighbors });

        $collapsibles.forEach($collapsible => $collapsible.close());
    }

    bindEvents() {
        this.$menu.on('click', this.onMenuClick);
        this.$body.on('click', this.onDocumentClick);

        // papathemes-inhealth
        this.$menu.find('.navPage-subMenu-list .navPages-action-toggle[data-collapsible]').on('open.collapsible', this.onCollapsibleOpen);
        this.$menu.find('.navPage-subMenu-list .navPages-action-toggle[data-collapsible]').on('close.collapsible', this.onCollapsibleClose);

        // papathemes-beautify: collapse menu when switching to desktop
        mediumMediaQueryList.addListener(this.onMediumMediaQueryMatch);
    }

    unbindEvents() {
        this.$menu.off('click', this.onMenuClick);
        this.$body.off('click', this.onDocumentClick);

        // papathemes-inhealth
        this.$menu.find('.navPage-subMenu-list .navPages-action-toggle[data-collapsible]').off('open.collapsible', this.onCollapsibleOpen);
        this.$menu.find('.navPage-subMenu-list .navPages-action-toggle[data-collapsible]').off('open.collapsible', this.onCollapsibleClose);

        // papathemes-beautify: collapse menu when switching to desktop
        mediumMediaQueryList.removeListener(this.onMediumMediaQueryMatch);
    }

    // papathemes-inhealth
    onCollapsibleOpen(event, collapsibleInstance) {
        // Stop if not mobile
        if (mediumMediaQueryList.matches) {
            return;
        }

        const $item = collapsibleInstance.$target.parent();

        if (!$item.is('.navPage-subMenu-item, .navPage-childList-item')) {
            return;
        }


        const $clonedItem = $item.clone().addClass('is-clone').insertBefore($item);

        $item
            .data('clone', $clonedItem)
            .addClass('is-opening')
            .css({
                position: 'fixed',
                left: '-100%',
                right: 0,
                top: this.$menu.position().top,
                bottom: 0,
            }).animate({
                left: this.$menu.position().left,
            }, 200, () => {
                $item.removeClass('is-opening').addClass('is-open');
            });
    }

    // papathemes-inhealth
    onCollapsibleClose(event, collapsibleInstance) {
        const $item = collapsibleInstance.$target.parent();

        if (!$item.is('.navPage-subMenu-item, .navPage-childList-item')) {
            return;
        }

        const resetCss = {
            position: '',
            left: '',
            right: '',
            top: '',
            bottom: '',
        };

        if (mediumMediaQueryList.matches) {
            $item.css(resetCss).removeClass('is-open');
            if ($item.data('clone')) {
                $item.data('clone').remove();
            }
            return;
        }

        const $clonedItem = $item.data('clone') || $item.clone().css(resetCss).insertBefore($item).removeClass('is-open').addClass('is-clone');

        if (!this.disableSubAnimation) {
            $item.animate({
                top: this.$menu.position().top,
                bottom: 0,
                left: '-100%',
            }, 200, () => {
                $clonedItem.remove();
                $item.css(resetCss).removeClass('is-open');
            });
        } else {
            $clonedItem.remove();
            $item.css(resetCss).removeClass('is-open');
        }
    }

    // papathemes-beautify
    onMediumMediaQueryMatch(media) {
        if (media.matches) {
            this.collapseAll();
        }
    }

    onMenuClick(event) {
        // papathemes-supermarket - Fix to allow [data-cart-currency-switch-url] works in menu
        if ($(event.target).is('[data-cart-currency-switch-url]') || $(event.target).closest('[data-cart-currency-switch-url]').length > 0) {
            return;
        }

        // mooncat: ignore clicks on widget regions
        if ($(event.target).closest('[data-content-region]').length > 0) {
            return;
        }

        // papathemes-beautify edited to fix cart dropdown not show
        if ($(event.target).closest('[data-dropdown]').length === 0) {
            event.stopPropagation();
        }

        event.stopPropagation();

        if (this.hasMaxMenuDisplayDepth) {
            const $neighbors = $(event.target).parent().siblings();

            this.collapseNeighbors($neighbors);
        }
    }

    onDocumentClick() {
        this.collapseAll();
        $('._hideToggleFirst', this.$menu).addClass('u-hidden');
    }
}

/*
 * Create a new Menu instance
 * @param {string} [selector]
 * @return {Menu}
 */
export default function menuFactory(selector = `[data-${PLUGIN_KEY}]`) {
    const $menu = $(selector).eq(0);
    const instanceKey = `${PLUGIN_KEY}Instance`;
    const cachedMenu = $menu.data(instanceKey);

    if (cachedMenu instanceof Menu) {
        return cachedMenu;
    }

    const menu = new Menu($menu);

    $menu.data(instanceKey, menu);

    return menu;
}
