/**
 * Clone the category tree into the navPages so that the menu can function on mobile
 * @returns {void}
 */
export default function initMenuFromSidebar() {
    const $categoryTree = $('#categoryTree');

    if ($categoryTree.length === 0) return;

    const $items = $categoryTree.find('.navPages-list').clone().children().addClass('u-hideDesktop');
    const $navPagesList = $('header .navPages').first().find('.navPages-list').not('.navPages-list--user').first();

    //
    // remove all suffix '-categoryTree' from the cloned category tree
    $items.find('[data-collapsible]').each((i, el) => {
        const $el = $(el);
        const attr = $el.attr('data-collapsible').replace('-categoryTree', '');
        $el.attr('data-collapsible', attr);
    });
    $items.find('[aria-controls]').each((i, el) => {
        const $el = $(el);
        const attr = $el.attr('aria-controls').replace('-categoryTree', '');
        $el.attr('aria-controls', attr);
    });
    $items.find('[id]').each((i, el) => {
        const $el = $(el);
        const attr = $el.attr('id').replace('-categoryTree', '');
        $el.attr('id', attr);
    });

    $navPagesList.prepend($items);
    const pageTitle = window.location.pathname;
    $categoryTree.find("a[class*='-action']").each((i, el) => {
        const $el = $(el);
        if (pageTitle.toLowerCase().indexOf($el.attr('href').toLowerCase()) !== -1 && $el.attr('href')) {
            $el.addClass('active');
            $el.next().addClass('is-open');
            $el.next().next().addClass('is-open');
        }
    });
}
