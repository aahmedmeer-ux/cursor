/**
 * Virtual Try-On — upload a full-body photo and preview the product on you via AI.
 *
 * Modal MUST open with { pending: false, clearContent: false } — the theme Modal
 * helper defaults to pending/clearContent true, which shows an endless spinner
 * and empties the pre-rendered try-on markup.
 */
import $ from 'jquery';
import modalFactory, { ModalEvents } from '../global/modal';

const FAL_DEFAULT_ENDPOINT = 'https://fal.run/fal-ai/image-apps-v2/virtual-try-on';
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function isTruthy(value) {
    return value !== false && value !== 'false' && value !== 0 && value !== '0' && value != null && value !== '';
}

export default class VirtualTryOn {
    constructor(productDetails) {
        if (!productDetails || !productDetails.$scope || !productDetails.context) {
            return;
        }

        this.$scope = productDetails.$scope;
        this.$form = productDetails.$form;
        this.productId = productDetails.productId;
        this.context = productDetails.context;
        this.imageGallery = productDetails.imageGallery;
        this.enabled = isTruthy(this.context.tryonEnable);

        if (!this.enabled) {
            return;
        }

        this.userImageDataUrl = null;
        this.modal = null;
        this.$root = null;
        this.opening = false;
        this.init();
    }

    init() {
        this.ensureButtons();
        this.bindOpeners();
        // Pre-warm modal instance so first click is instant
        this.ensureModal();
    }

    ensureButtons() {
        const label = this.context.tryonButtonLabel || 'Try It';
        const $actions = this.$scope.find('.formView-action._designTools');

        $actions.each((_, el) => {
            const $wrap = $(el);
            if ($wrap.find('[data-virtual-tryon]').length) {
                return;
            }
            const $atc = $wrap.find('.form-action--addToCart').first();
            const $btn = $(`
                <div class="form-action form-action--tryOn">
                    <button type="button" class="button button--tryOn" data-virtual-tryon>
                        ${label}
                    </button>
                </div>
            `);
            if ($atc.length) {
                $atc.before($btn);
            } else {
                $wrap.append($btn);
            }
        });

        const $sticky = this.$scope.find('#form-action-addToCartSticky');
        if ($sticky.length && !$sticky.closest('.productView-qtyAddWrapper, .productView-stickyATC, .formView-action').parent().find('[data-virtual-tryon]').length) {
            $sticky.closest('.form-action--addToCart').before(`
                <div class="form-action form-action--tryOn">
                    <button type="button" class="button button--tryOn" data-virtual-tryon>
                        ${label}
                    </button>
                </div>
            `);
        }
    }

    bindOpeners() {
        this.$scope.on('click', '[data-virtual-tryon]', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.open();
        });
    }

    ensureModal() {
        const $modalEl = $('#virtual-tryon-modal');
        if (!$modalEl.length) {
            return null;
        }

        if (!this.modal) {
            // Match newsletter popup: keep existing markup, no loading overlay lock
            this.modal = modalFactory('#virtual-tryon-modal')[0];
            if (!this.modal) {
                return null;
            }
            this.$root = $modalEl.find('[data-tryon-root]');
            this.bindModalEvents();

            this.modal.$modal.on(ModalEvents.opened, () => {
                this.modal.pending = false;
                this.opening = false;
            });
            this.modal.$modal.on(ModalEvents.closed, () => {
                this.opening = false;
            });
        }

        return this.modal;
    }

    open() {
        if (this.opening) {
            return;
        }
        this.opening = true;

        const modal = this.ensureModal();
        if (!modal || !this.$root || !this.$root.length) {
            this.opening = false;
            // eslint-disable-next-line no-alert
            window.alert('Virtual Try-On is unavailable on this page. Please refresh and try again.');
            return;
        }

        this.resetState();
        // Sync fill from DOM first so UI appears immediately
        this.populateProductPreviewSync();
        // Then refresh from gallery/GraphQL in background
        this.populateProductPreview();

        // CRITICAL: pending/clearContent default to true and break pre-rendered modals
        modal.open({
            size: 'large',
            pending: false,
            clearContent: false,
        });
        modal.pending = false;

        // Safety: if overlay somehow shows, hide within a tick
        window.setTimeout(() => {
            modal.pending = false;
            this.opening = false;
        }, 50);
    }

    bindModalEvents() {
        const $root = this.$root;
        if (!$root || $root.data('tryonBound')) {
            return;
        }
        $root.data('tryonBound', true);

        const $file = $root.find('[data-tryon-file]');
        const $drop = $root.find('[data-tryon-dropzone]');

        $file.on('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        $drop.on('dragover', (e) => {
            e.preventDefault();
            $drop.addClass('is-dragover');
        });
        $drop.on('dragleave drop', (e) => {
            e.preventDefault();
            $drop.removeClass('is-dragover');
            if (e.type === 'drop') {
                const file = e.originalEvent.dataTransfer.files[0];
                if (file) {
                    this.handleFile(file);
                }
            }
        });

        $root.on('click', '[data-tryon-change]', (e) => {
            e.preventDefault();
            $file.trigger('click');
        });

        $root.on('click', '[data-tryon-submit]', (e) => {
            e.preventDefault();
            this.runTryOn();
        });

        $root.on('click', '[data-tryon-retry]', (e) => {
            e.preventDefault();
            this.resetState(false);
            this.populateProductPreviewSync();
            this.populateProductPreview();
        });
    }

    resetState(clearFile = true) {
        this.userImageDataUrl = null;
        const $root = this.$root;
        if (!$root) return;

        $root.find('[data-tryon-user-preview]').addClass('is-hidden');
        $root.find('[data-tryon-dropzone]').removeClass('is-hidden');
        $root.find('[data-tryon-result]').addClass('is-hidden');
        $root.find('[data-tryon-status]').addClass('is-hidden').removeClass('is-error is-loading').empty();
        $root.find('[data-tryon-submit]').prop('disabled', true);
        $root.find('[data-tryon-result-image]').attr('src', '');
        if (clearFile) {
            $root.find('[data-tryon-file]').val('');
            $root.find('[data-tryon-user-image]').attr('src', '');
        }
    }

    populateProductPreviewSync() {
        if (!this.$root) return;
        const title = this.$scope.find('.productView-title').first().text().trim()
            || this.$scope.find('[data-virtual-tryon]').first().attr('data-product-title')
            || '';
        this.$root.find('[data-tryon-product-title]').text(title);

        const imageUrl = this.getGarmentImageUrlSync();
        if (imageUrl) {
            this.$root.find('[data-tryon-product-image]').attr({ src: imageUrl, alt: title });
        }
    }

    async populateProductPreview() {
        if (!this.$root) return;
        try {
            const imageUrl = await this.getGarmentImageUrl();
            const title = this.$root.find('[data-tryon-product-title]').text();
            if (imageUrl) {
                this.$root.find('[data-tryon-product-image]').attr({ src: imageUrl, alt: title });
            }
        } catch (err) {
            // Non-blocking — sync preview already shown
        }
    }

    getGarmentImageUrlSync() {
        if (this.imageGallery && this.imageGallery.currentImage && this.imageGallery.currentImage.mainImageUrl) {
            return this.absoluteUrl(this.imageGallery.currentImage.mainImageUrl);
        }

        const $main = this.$scope.find('[data-image-gallery-main] .slick-current a, [data-image-gallery-main] a').first();
        const fromDom = $main.data('originalImg') || $main.attr('data-original-img') || $main.find('img').attr('src');
        if (fromDom) {
            return this.absoluteUrl(fromDom);
        }

        const fromBtn = this.$scope.find('[data-virtual-tryon]').first().attr('data-product-image')
            || this.$scope.find('[data-virtual-tryon]').first().data('product-image');
        if (fromBtn) {
            return this.absoluteUrl(fromBtn);
        }

        return '';
    }

    async getGarmentImageUrl() {
        const sync = this.getGarmentImageUrlSync();
        if (sync) {
            return sync;
        }

        try {
            const images = await this.fetchProductImages();
            if (images.length) {
                return this.absoluteUrl(images[0]);
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Try-on: could not fetch product images', err);
        }

        return '';
    }

    async fetchProductImages() {
        if (!this.context.graphQLToken || !this.productId) {
            return [];
        }

        const optionValueIds = [];
        (this.$form.serializeArray() || []).forEach(({ name, value }) => {
            const match = name.match(/attribute\[(\d+)\]/);
            if (match && value) {
                optionValueIds.push({
                    optionEntityId: parseInt(match[1], 10),
                    valueEntityId: parseInt(value, 10),
                });
            }
        });

        const response = await $.ajax({
            url: '/graphql',
            method: 'POST',
            data: JSON.stringify({
                query: `query GetProductImages($entityId: Int!, $optionValueIds: [OptionValueId!]) {
                    site {
                        product(entityId: $entityId, optionValueIds: $optionValueIds) {
                            defaultImage { url(width: 1000) }
                            images {
                                edges { node { url(width: 1000) isDefault } }
                            }
                        }
                    }
                }`,
                variables: { entityId: this.productId, optionValueIds },
            }),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.context.graphQLToken}`,
            },
            xhrFields: { withCredentials: true },
        });

        const product = response && response.data && response.data.site && response.data.site.product;
        if (!product) return [];

        const urls = [];
        if (product.defaultImage && product.defaultImage.url) {
            urls.push(product.defaultImage.url);
        }
        ((product.images && product.images.edges) || []).forEach((edge) => {
            if (edge.node && edge.node.url) {
                urls.push(edge.node.url);
            }
        });
        return [...new Set(urls)];
    }

    absoluteUrl(url) {
        if (!url) return '';
        if (/^https?:\/\//i.test(url) || url.indexOf('data:') === 0) {
            return url;
        }
        if (url.indexOf('//') === 0) {
            return `${window.location.protocol}${url}`;
        }
        try {
            return new URL(url, window.location.origin).href;
        } catch (e) {
            return url;
        }
    }

    handleFile(file) {
        if (!file || !file.type || file.type.indexOf('image/') !== 0) {
            this.showStatus(this.context.tryonErrorFileType || 'Please upload a JPG, PNG, or WebP photo.', true);
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            this.showStatus(this.context.tryonErrorFileSize || 'Photo must be under 8MB.', true);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            this.userImageDataUrl = reader.result;
            this.$root.find('[data-tryon-user-image]').attr('src', this.userImageDataUrl);
            this.$root.find('[data-tryon-user-preview]').removeClass('is-hidden');
            this.$root.find('[data-tryon-dropzone]').addClass('is-hidden');
            this.$root.find('[data-tryon-submit]').prop('disabled', false);
            this.$root.find('[data-tryon-status]').addClass('is-hidden');
            this.$root.find('[data-tryon-result]').addClass('is-hidden');
        };
        reader.onerror = () => {
            this.showStatus(this.context.tryonErrorGeneric || 'Could not read that photo. Please try another.', true);
        };
        reader.readAsDataURL(file);
    }

    showStatus(message, isError = false, isLoading = false) {
        const $status = this.$root.find('[data-tryon-status]');
        $status
            .removeClass('is-hidden is-error is-loading')
            .toggleClass('is-error', !!isError)
            .toggleClass('is-loading', !!isLoading)
            .html(isLoading ? `<span class="tryOn-spinner" aria-hidden="true"></span> ${message}` : message);
    }

    isConfigured() {
        return !!(String(this.context.tryonProxyUrl || '').trim() || String(this.context.tryonApiKey || '').trim());
    }

    async runTryOn() {
        if (!this.userImageDataUrl) {
            this.showStatus(this.context.tryonErrorNeedPhoto || 'Upload a full-body photo first.', true);
            return;
        }

        if (!this.isConfigured()) {
            this.showStatus(
                this.context.tryonErrorNotConfigured
                || 'Virtual Try-On needs an AI connection. In Theme Editor → Virtual Try-On, add a Proxy URL (recommended) or fal.ai API key, then Save.',
                true,
            );
            return;
        }

        const garmentUrl = await this.getGarmentImageUrl();
        if (!garmentUrl) {
            this.showStatus(this.context.tryonErrorNoProduct || 'Could not load the product image.', true);
            return;
        }

        const $submit = this.$root.find('[data-tryon-submit]');
        $submit.prop('disabled', true);
        this.showStatus(
            this.context.tryonLoading || 'AI is fitting the product on your photo… usually 15–45 seconds.',
            false,
            true,
        );

        const productTitle = this.$root.find('[data-tryon-product-title]').text().trim();
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = window.setTimeout(() => {
            if (controller) controller.abort();
        }, 90000);

        try {
            const resultUrl = await this.requestTryOn({
                personImage: this.userImageDataUrl,
                garmentImageUrl: garmentUrl,
                description: productTitle || 'apparel',
                productId: this.productId,
                signal: controller && controller.signal,
            });

            if (!resultUrl) {
                throw new Error('empty_result');
            }

            const $resultImg = this.$root.find('[data-tryon-result-image]');
            $resultImg.one('load', () => {
                this.$root.find('[data-tryon-status]').addClass('is-hidden');
            });
            $resultImg.attr('src', resultUrl);
            this.$root.find('[data-tryon-download]').attr({ href: resultUrl, download: 'jettribe-tryon.jpg' });
            this.$root.find('[data-tryon-result]').removeClass('is-hidden');
            this.showStatus('Done — scroll down to see your preview.', false, false);
            window.setTimeout(() => {
                this.$root.find('[data-tryon-status]').addClass('is-hidden');
            }, 2000);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Virtual try-on failed', err);
            const errText = String((err && err.message) || err || '');
            const timedOut = err && (err.name === 'AbortError' || errText.indexOf('abort') !== -1);
            let msg = this.context.tryonErrorGeneric
                || 'Sorry — try-on could not be generated. Please try another photo or check your AI proxy/API key.';
            if (timedOut) {
                msg = 'Try-on timed out. Please try a smaller photo or try again.';
            } else if (/exhausted|balance|billing|locked|402|403/i.test(errText)) {
                msg = 'AI try-on is ready, but the fal.ai account needs credits. Top up at fal.ai/dashboard/billing, then try again.';
            } else if (/401|unauthorized|invalid.*key/i.test(errText)) {
                msg = 'Virtual Try-On API key was rejected. Update Theme Editor → Virtual Try-On → fal.ai API key.';
            }
            this.showStatus(msg, true);
        } finally {
            window.clearTimeout(timeoutId);
            $submit.prop('disabled', !this.userImageDataUrl);
        }
    }

    async requestTryOn({ personImage, garmentImageUrl, description, productId, signal }) {
        const proxyUrl = String(this.context.tryonProxyUrl || '').trim();
        const apiKey = String(this.context.tryonApiKey || '').trim();

        if (proxyUrl) {
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    person_image: personImage,
                    clothing_image_url: garmentImageUrl,
                    description,
                    product_id: productId,
                }),
                signal,
            });
            if (!response.ok) {
                throw new Error(`proxy_${response.status}`);
            }
            const data = await response.json();
            return data.result_url || data.image_url || data.url
                || (data.image && data.image.url)
                || (data.images && data.images[0] && (data.images[0].url || data.images[0]));
        }

        if (apiKey) {
            const endpoint = String(this.context.tryonFalEndpoint || '').trim() || FAL_DEFAULT_ENDPOINT;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Key ${apiKey}`,
                },
                body: JSON.stringify({
                    person_image_url: personImage,
                    clothing_image_url: garmentImageUrl,
                    description,
                }),
                signal,
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`fal_${response.status}:${text.slice(0, 200)}`);
            }
            const data = await response.json();
            return (data.image && data.image.url)
                || data.image_url
                || data.url
                || (data.images && data.images[0] && (data.images[0].url || data.images[0]));
        }

        throw new Error('not_configured');
    }
}
