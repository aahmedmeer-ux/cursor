/**
 * Jettribe Customized Gear helpers:
 * - Rename Size options Adult/Youth -> Adult Large / Adult Small
 * - Keep Design Confirmation (A-V) + custom name/number fields in sync
 */
(function () {
    'use strict';

    function renameSizeLabels(root) {
        const scope = root || document;
        const labels = scope.querySelectorAll(
            '[data-product-attribute="set-radio"] .form-label, ' +
            '[data-product-attribute="set-rectangle"] .form-option, ' +
            '[data-product-attribute="set-select"] option'
        );

        labels.forEach((el) => {
            const raw = (el.textContent || '').trim();
            if (!raw) return;

            // Adult (23"... -> Adult Large (23"...
            if (/^Adult\b/i.test(raw) && !/Adult\s+Large/i.test(raw) && !/Adult\s+Small/i.test(raw)) {
                el.textContent = raw.replace(/^Adult\b/i, 'Adult Large');
                return;
            }

            // Youth (... -> Adult Small (...
            if (/^Youth\b/i.test(raw)) {
                el.textContent = raw.replace(/^Youth\b/i, 'Adult Small');
            }
        });
    }

    function enhanceDesignConfirmationLabels(root) {
        const scope = root || document;
        scope.querySelectorAll('.form-label').forEach((label) => {
            const text = (label.textContent || '').trim();
            if (/Design Confirmation \(Select Letter A[–-][YR]\)/i.test(text)) {
                label.textContent = text.replace(/A[–-][YR]/i, 'A–V');
            }
        });
    }

    function init() {
        renameSizeLabels(document);
        enhanceDesignConfirmationLabels(document);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-run after quick-view / option redraws
    document.addEventListener('click', () => {
        window.setTimeout(init, 300);
    });
})();
