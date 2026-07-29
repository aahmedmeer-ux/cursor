import { CollapsibleEvents } from '../common/collapsible';

const PLUGIN_KEY = 'collapsible-group';

/*
 * Manage multiple instances of collapsibles. For example, if a collapsible is
 * about to open and there's one already open, close the latter first.
 * @param {jQuery} $component
 */
export class CollapsibleGroup {
    constructor($component) {
        this.$component = $component;
        this.openCollapsibles = []; // papathemes-inhealth

        // Auto bind
        this.onCollapsibleOpen = this.onCollapsibleOpen.bind(this);
        this.onCollapsibleClose = this.onCollapsibleClose.bind(this);

        // Listen
        this.bindEvents();
    }

    // papathemes-inhealth refactor
    close() {
        this.openCollapsibles.forEach(openCollapsible => {
            if (!openCollapsible.disabled) {
                openCollapsible.close();
            }
        });
    }

    bindEvents() {
        this.$component.on(CollapsibleEvents.open, this.onCollapsibleOpen);
        this.$component.on(CollapsibleEvents.close, this.onCollapsibleClose);
    }

    unbindEvents() {
        this.$component.off(CollapsibleEvents.open, this.onCollapsibleOpen);
        this.$component.off(CollapsibleEvents.close, this.onCollapsibleClose);
    }

    // papathemes-inhealth refactor
    onCollapsibleOpen(event, collapsibleInstance) {
        const openCollapsibles = [];
        this.openCollapsibles.forEach(openCollapsible => {
            if (!openCollapsible.hasCollapsible(collapsibleInstance) && !openCollapsible.disabled) {
                openCollapsible.close();
            } else {
                openCollapsibles.push(openCollapsible);
            }
        });

        openCollapsibles.push(collapsibleInstance);

        this.openCollapsibles = openCollapsibles;
    }

    // papathemes-inhealth refactor
    onCollapsibleClose(event, collapsibleInstance) {
        this.openCollapsibles = this.openCollapsibles.filter(openCollapsible => openCollapsible !== collapsibleInstance && openCollapsible.hasCollapsible(collapsibleInstance));
    }
}

/**
 * Create new CollapsibleGroup instances
 * @param {string} [selector]
 * @param {Object} [options]
 * @param {Object} [options.$context]
 * @return {Array} array of CollapsibleGroup instances
 */
export default function collapsibleGroupFactory(selector = `[data-${PLUGIN_KEY}]`, options = {}) {
    const $groups = $(selector, options.$context);
    const instanceKey = `${PLUGIN_KEY}Instance`;

    return $groups.map((index, element) => {
        const $group = $(element);
        const cachedGroup = $group.data(instanceKey);

        if (cachedGroup instanceof CollapsibleGroup) {
            return cachedGroup;
        }

        const group = new CollapsibleGroup($group);

        $group.data(instanceKey, group);

        return group;
    }).toArray();
}
