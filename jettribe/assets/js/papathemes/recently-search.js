import { escape } from 'lodash';
import utils from '@bigcommerce/stencil-utils';

export class RecentlySearch {
    constructor({
        limit = 10,
        maxLength = 256,
    } = {}) {
        this.limit = limit;
        this.maxLength = maxLength;

        this.$searchHistory = $('[data-papathemes-search-history]');
        this.$deleteSearchHistory = $('[data-papathemes-delete-search-history]');
        this.$list = $('#quickSearch-recently-list');
        this.$quickSearchInput = $('[data-search-quick]');

        if (this.getKeywords().length === 0) {
            this.$searchHistory.hide();
        } else {
            this.$searchHistory.show();
        }

        this.displayKeywords();

        this.onDeleteSearchHistory = this.onDeleteSearchHistory.bind(this);
        this.onClickKeyword = this.onClickKeyword.bind(this);

        this.bindEvents();
    }

    bindEvents() {
        this.$deleteSearchHistory
            .off('click', this.onDeleteSearchHistory)
            .on('click', this.onDeleteSearchHistory);
        this.$list
            .off('click', 'a', this.onClickKeyword)
            .on('click', 'a', this.onClickKeyword);
    }

    onDeleteSearchHistory() {
        this.clear();
        this.$searchHistory.hide();
    }

    onClickKeyword(event) {
        event.preventDefault();
        const a = event.currentTarget;
        const params = new URLSearchParams(a.href.split('?')[1]);
        const keyword = params.get('search_query');
        this.$quickSearchInput.val(keyword);
        this.$quickSearchInput.each((i, el) => utils.hooks.emit('search-quick-immediately', event, el));
    }

    addKeyword(keyword) {
        let keywords = [];
        try {
            keywords = JSON.parse(window.localStorage.getItem('papathemes_recentlySearchKeywords')) || [];
        } catch (e) {
            keywords = [];
        }

        const _keyword = String(keyword).trim();
        keywords = [_keyword, ...keywords.filter(k => String(k).toLocaleLowerCase().trim() !== _keyword.toLocaleLowerCase())];

        window.localStorage.setItem('papathemes_recentlySearchKeywords', JSON.stringify(keywords));
    }

    getKeywords(limit) {
        const _limit = limit || this.limit;
        try {
            return (JSON.parse(window.localStorage.getItem('papathemes_recentlySearchKeywords')) || []).slice(0, _limit);
        } catch (e) {
            return [];
        }
    }

    clear() {
        window.localStorage.setItem('papathemes_recentlySearchKeywords', JSON.stringify([]));
    }

    displayKeywords() {
        const keywords = this.getKeywords();

        this.$list.empty();
        this.$list.append(keywords.map(keyword => `<li><a href="/search.php?search_query=${encodeURIComponent(keyword)}">${escape(keyword)}</a></li>`));


        if (keywords.length === 0) {
            this.$searchHistory.hide();
        } else {
            this.$searchHistory.show();
        }
    }
}

export class PopularSearch {
    constructor({
        keywords = '',
    } = {}) {
        this.$searchPopular = $('[data-papathemes-search-popular]');
        this.$list = $('#quickSearch-popular-list');
        this.$toggle = $('[data-collapsible="quickSearch-popular-list"]');
        this.$quickSearchInput = $('[data-search-quick]');
        this.keywords = String(keywords || this.$searchPopular.data('papathemesSearchPopular')).split(',').map(s => s.trim()).filter(s => s.length > 0);

        if (this.keywords.length === 0) {
            this.$searchPopular.hide();
        } else {
            this.$searchPopular.show();
        }

        this.$list.empty();
        this.$list.append(this.keywords.map(keyword => `<li><a href="/search.php?search_query=${encodeURIComponent(keyword)}">${escape(keyword)}</a></li>`));

        this.onClickKeyword = this.onClickKeyword.bind(this);

        this.bindEvents();
    }

    bindEvents() {
        this.$list
            .off('click', 'a', this.onClickKeyword)
            .on('click', 'a', this.onClickKeyword);
    }

    onClickKeyword(event) {
        event.preventDefault();
        const a = event.currentTarget;
        const params = new URLSearchParams(a.href.split('?')[1]);
        const keyword = params.get('search_query');
        this.$quickSearchInput.val(keyword);
        this.$quickSearchInput.each((i, el) => utils.hooks.emit('search-quick-immediately', event, el));
    }

    updateKeywords(keywords) {
        this.keywords = keywords;

        if (this.keywords.length === 0) {
            this.$searchPopular.hide();
        } else {
            this.$searchPopular.show();
        }

        this.$list.empty();
        this.$list.append(this.keywords.map(keyword => `<li><a href="/search.php?search_query=${encodeURIComponent(keyword)}">${escape(keyword)}</a></li>`));
    }

    fixAriaHiddenIfOpen() {
        if (this.$list.hasClass('is-open')) {
            this.$list.attr('aria-hidden', 'false');
            this.$toggle.attr('aria-expanded', 'true');
        } else {
            this.$list.attr('aria-hidden', 'true');
            this.$toggle.attr('aria-expanded', 'false');
        }
    }
}
