/**
 * Virtual Try-On — generative AI fit (free via Hugging Face IDM-VTON Space).
 *
 * Uploads the shopper photo + product image to the public IDM-VTON demo
 * (ZeroGPU, no API key / no paid credits) and shows the real try-on result.
 * This is NOT a simple image overlay.
 *
 * Modal MUST open with { pending: false, clearContent: false }.
 */
import $ from 'jquery';
import modalFactory, { ModalEvents } from '../global/modal';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 768;
const TRYON_TIMEOUT_MS = 180000;

/** Free public Gradio Spaces that implement IDM-VTON-compatible /tryon */
const TRYON_HOSTS = [
    'yisol-idm-vton.hf.space',
];

function isTruthy(value) {
    return value !== false && value !== 'false' && value !== 0 && value !== '0' && value != null && value !== '';
}

function loadImage(src, useCors = true) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (useCors && src && src.indexOf('data:') !== 0) {
            img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => {
            if (useCors) {
                loadImage(src, false).then(resolve).catch(reject);
                return;
            }
            reject(new Error('image_load_failed'));
        };
        img.src = src;
    });
}

function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.92) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('toBlob_failed'));
        }, type, quality);
    });
}

/** Downscale large photos so free GPU demos finish faster. */
async function imageSourceToJpegBlob(src, maxEdge = MAX_EDGE) {
    const img = await loadImage(src, src.indexOf('data:') !== 0);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    try {
        return await canvasToBlob(canvas);
    } catch (e) {
        // Tainted canvas — fall back to fetch for http(s) URLs
        if (typeof src === 'string' && /^https?:/i.test(src)) {
            const res = await fetch(src);
            if (!res.ok) throw new Error(`garment_fetch_${res.status}`);
            return res.blob();
        }
        if (typeof src === 'string' && src.indexOf('data:') === 0) {
            const res = await fetch(src);
            return res.blob();
        }
        throw e;
    }
}

async function uploadToSpace(host, blob, filename) {
    const form = new FormData();
    form.append('files', blob, filename);
    const res = await fetch(`https://${host}/upload`, {
        method: 'POST',
        body: form,
    });
    if (!res.ok) {
        throw new Error(`upload_${res.status}`);
    }
    const json = await res.json();
    const path = Array.isArray(json) ? json[0] : json;
    if (!path) {
        throw new Error('upload_empty');
    }
    return path;
}

function parseSseComplete(text) {
    const blocks = String(text || '').split(/\n\n+/);
    for (let i = blocks.length - 1; i >= 0; i -= 1) {
        const block = blocks[i];
        if (!block || block.indexOf('data:') === -1) continue;
        if (block.indexOf('event: error') !== -1) {
            const errLine = block.split('\n').find((l) => l.indexOf('data:') === 0);
            throw new Error(`provider_error:${(errLine || '').slice(5).trim().slice(0, 200)}`);
        }
        if (block.indexOf('event: complete') === -1 && i !== blocks.length - 1) {
            // Prefer explicit complete; last data block as fallback
            continue;
        }
        const dataLine = block.split('\n').filter((l) => l.indexOf('data:') === 0).pop();
        if (!dataLine) continue;
        const raw = dataLine.slice(5).trim();
        if (!raw || raw === 'null') continue;
        let payload;
        try {
            payload = JSON.parse(raw);
        } catch (e) {
            continue;
        }
        if (Array.isArray(payload) && payload[0]) {
            const first = payload[0];
            if (typeof first === 'string' && /^https?:/i.test(first)) return first;
            if (first && first.url) return first.url;
            if (first && first.path && typeof first.path === 'string') {
                // Relative gradio path — caller will absolutize
                return first.url || first.path;
            }
        }
        if (payload && payload.url) return payload.url;
    }
    // Fallback: any data array with url
    for (let i = blocks.length - 1; i >= 0; i -= 1) {
        const dataLine = (blocks[i] || '').split('\n').filter((l) => l.indexOf('data:') === 0).pop();
        if (!dataLine) continue;
        try {
            const payload = JSON.parse(dataLine.slice(5).trim());
            if (Array.isArray(payload) && payload[0] && payload[0].url) {
                return payload[0].url;
            }
        } catch (e) {
            // continue
        }
    }
    return null;
}

async function callIdmVton(host, personPath, garmentPath, description, signal) {
    const joinRes = await fetch(`https://${host}/call/tryon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            data: [
                {
                    background: { path: personPath, meta: { _type: 'gradio.FileData' } },
                    layers: [],
                    composite: null,
                },
                { path: garmentPath, meta: { _type: 'gradio.FileData' } },
                description || 'apparel',
                true, // auto-masking
                false, // crop
                20, // denoise steps (faster on free GPU)
                Math.floor(Math.random() * 1e9),
            ],
        }),
        signal,
    });
    if (!joinRes.ok) {
        throw new Error(`tryon_join_${joinRes.status}`);
    }
    const joinJson = await joinRes.json();
    const eventId = joinJson.event_id;
    if (!eventId) {
        throw new Error('tryon_no_event');
    }

    const streamRes = await fetch(`https://${host}/call/tryon/${eventId}`, { signal });
    if (!streamRes.ok) {
        throw new Error(`tryon_stream_${streamRes.status}`);
    }
    const text = await streamRes.text();
    const resultUrl = parseSseComplete(text);
    if (!resultUrl) {
        throw new Error('tryon_empty_result');
    }
    if (resultUrl.indexOf('http') === 0) {
        return resultUrl;
    }
    // Absolute file URL on the space
    if (resultUrl.indexOf('/file=') === 0 || resultUrl.indexOf('/tmp/') === 0) {
        return `https://${host}/file=${resultUrl.replace(/^\/file=/, '')}`;
    }
    return `https://${host}/file=${resultUrl}`;
}

async function runGenerativeTryOn({ personDataUrl, garmentUrl, description, signal, onStatus }) {
    if (onStatus) onStatus('Preparing photos…');
    const [personBlob, garmentBlob] = await Promise.all([
        imageSourceToJpegBlob(personDataUrl),
        imageSourceToJpegBlob(garmentUrl),
    ]);

    let lastError;
    for (let i = 0; i < TRYON_HOSTS.length; i += 1) {
        const host = TRYON_HOSTS[i];
        try {
            if (onStatus) onStatus('Uploading to free AI try-on…');
            const [personPath, garmentPath] = await Promise.all([
                uploadToSpace(host, personBlob, 'person.jpg'),
                uploadToSpace(host, garmentBlob, 'garment.jpg'),
            ]);
            if (onStatus) {
                onStatus('AI is fitting the product on you… usually 20–60 seconds (free).');
            }
            return await callIdmVton(host, personPath, garmentPath, description, signal);
        } catch (err) {
            lastError = err;
            // eslint-disable-next-line no-console
            console.warn('Try-on host failed', host, err);
        }
    }
    throw lastError || new Error('tryon_failed');
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
        if ($sticky.length && !$sticky.closest('.form-action--addToCart').parent().find('[data-virtual-tryon]').length) {
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
        this.populateProductPreviewSync();
        this.populateProductPreview();

        modal.open({
            size: 'large',
            pending: false,
            clearContent: false,
        });
        modal.pending = false;

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
            // Non-blocking
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

    async runTryOn() {
        if (!this.userImageDataUrl) {
            this.showStatus(this.context.tryonErrorNeedPhoto || 'Upload a full-body photo first.', true);
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
            this.context.tryonLoading || 'AI is fitting the product on you… usually 20–60 seconds.',
            false,
            true,
        );

        const productTitle = this.$root.find('[data-tryon-product-title]').text().trim();
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = window.setTimeout(() => {
            if (controller) controller.abort();
        }, TRYON_TIMEOUT_MS);

        try {
            const resultUrl = await runGenerativeTryOn({
                personDataUrl: this.userImageDataUrl,
                garmentUrl,
                description: productTitle || 'Jettribe apparel',
                signal: controller && controller.signal,
                onStatus: (msg) => this.showStatus(msg, false, true),
            });

            if (!resultUrl) {
                throw new Error('empty_result');
            }

            const $resultImg = this.$root.find('[data-tryon-result-image]');
            $resultImg.one('load', () => {
                this.$root.find('[data-tryon-status]').addClass('is-hidden');
            });
            $resultImg.attr('src', resultUrl);
            this.$root.find('[data-tryon-download]').attr({ href: resultUrl, download: 'jettribe-tryon.jpg', target: '_blank', rel: 'noopener' });
            this.$root.find('[data-tryon-result]').removeClass('is-hidden');
            this.showStatus('Done — scroll down to see your try-on.', false, false);
            window.setTimeout(() => {
                this.$root.find('[data-tryon-status]').addClass('is-hidden');
            }, 2500);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Virtual try-on failed', err);
            const errText = String((err && err.message) || err || '');
            const timedOut = err && (err.name === 'AbortError' || /abort/i.test(errText));
            let msg = this.context.tryonErrorGeneric
                || 'Sorry — try-on could not be generated. Please try another full-body photo, or try again in a minute (free AI queue may be busy).';
            if (timedOut) {
                msg = 'Try-on timed out waiting on the free AI queue. Please try again in a minute.';
            }
            this.showStatus(msg, true);
        } finally {
            window.clearTimeout(timeoutId);
            $submit.prop('disabled', !this.userImageDataUrl);
        }
    }
}
