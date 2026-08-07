/**
 * Virtual Try-On — Nano Banana–style multi-image editing.
 *
 * Pipeline:
 *  1. Collect shopper photo + height + product gallery images
 *  2. Build a try-on edit prompt (dress person in exact product, white BG)
 *  3. Send person + product reference images together to:
 *       A) Google Gemini Nano Banana (gemini-*-flash-image) — browser CORS OK
 *       B) fal.ai fal-ai/nano-banana-2/edit
 *       C) optional proxy URL (Cloudflare worker)
 *  4. Show the edited full-body result
 */
import $ from 'jquery';
import modalFactory, { ModalEvents } from '../global/modal';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 1024;
const MAX_PRODUCT_REFS = 6;
const TRYON_TIMEOUT_MS = 180000;
const FAL_MODEL = 'fal-ai/nano-banana-2/edit';
const GEMINI_MODELS = [
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-image-preview',
    'nano-banana-pro-preview',
];
const DEFAULT_HEIGHT_CM = 175;

function isGeminiApiKey(key) {
    const k = String(key || '').trim();
    return /^AIza/i.test(k) || /^AQ\./.test(k);
}

function isFalApiKey(key) {
    const k = String(key || '').trim();
    if (!k || isGeminiApiKey(k)) return false;
    // fal keys are typically uuid:secret
    return k.indexOf(':') !== -1 || /^[0-9a-f-]{8,}:/i.test(k) || k.length > 20;
}

function parseDataUrl(dataUrl) {
    const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('bad_data_url');
    return { mime: m[1], data: m[2] };
}

function isTruthy(v) {
    return v !== false && v !== 'false' && v !== 0 && v !== '0' && v != null && v !== '';
}

function loadImage(src, useCors = true) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (useCors && src && String(src).indexOf('data:') !== 0) img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
            if (useCors) loadImage(src, false).then(resolve).catch(reject);
            else reject(new Error('image_load_failed'));
        };
        img.src = src;
    });
}

function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.88) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob_failed'))), type, quality);
    });
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
    });
}

async function resizeToDataUrl(src, maxEdge = MAX_EDGE) {
    const img = await loadImage(src, String(src).indexOf('data:') !== 0);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    try {
        return blobToDataUrl(await canvasToBlob(canvas));
    } catch (e) {
        // tainted canvas — return original if already data URL
        if (String(src).indexOf('data:') === 0) return src;
        const res = await fetch(src);
        if (!res.ok) throw new Error(`fetch_${res.status}`);
        return blobToDataUrl(await res.blob());
    }
}

function parseHeightCm(raw) {
    const text = String(raw || '').trim().toLowerCase();
    if (!text) return DEFAULT_HEIGHT_CM;
    const ft = text.match(/^(\d)\s*[\'’ft]\s*(\d{1,2})/);
    if (ft) return Math.round((parseInt(ft[1], 10) * 12 + parseInt(ft[2], 10)) * 2.54);
    const cm = text.match(/(\d{2,3})\s*cm/);
    if (cm) return parseInt(cm[1], 10);
    const n = parseInt(text, 10);
    if (n >= 120 && n <= 230) return n;
    if (n >= 48 && n <= 90) return Math.round(n * 2.54);
    return DEFAULT_HEIGHT_CM;
}

function scoreStudio(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    let score = 40;
    const aspect = w / Math.max(1, h);
    if (aspect >= 0.85 && aspect <= 1.15) score += 12;
    if (aspect > 1.35) score -= 20;
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    try {
        ctx.drawImage(img, 0, 0, 40, 40);
        const { data } = ctx.getImageData(0, 0, 40, 40);
        let white = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) white += 1;
        }
        const wr = white / (40 * 40);
        if (wr > 0.28) score += 40;
        else if (wr > 0.15) score += 18;
        else if (wr < 0.08) score -= 18;
    } catch (e) {
        score -= 5;
    }
    return score;
}

function buildNanoBananaPrompt({ title, heightCm, productCount }) {
    const product = String(title || 'Jettribe product').replace(/\s+/g, ' ').trim();
    return [
        'You are performing a photorealistic virtual try-on edit.',
        'Image 1 is the shopper (keep their exact face, skin tone, hair, body identity, and pose).',
        `Images 2${productCount > 2 ? `–${productCount}` : ''} are product reference photos of the SAME item: ${product}.`,
        'Dress the shopper in that EXACT product. Preserve logos, lettering, colors, panels, straps, buckles, and materials from the product references. Do not invent a different design.',
        'Replace only the clothing needed to wear this product (for a vest/PFD: upper torso over existing layers as appropriate).',
        `Output a complete full-body standing person (about ${heightCm} cm tall proportions) centered on a pure white seamless studio background.`,
        'E-commerce catalog quality, natural lighting, sharp details, no text overlays, no watermarks, no collage borders.',
    ].join(' ');
}

/** Google Gemini Nano Banana image edit (direct from browser — CORS enabled) */
async function geminiNanoBananaEdit({ apiKey, imageUrls, prompt, signal, onStatus }) {
    const parts = [{ text: prompt }];
    imageUrls.slice(0, 8).forEach((url) => {
        const { mime, data } = parseDataUrl(url);
        parts.push({ inline_data: { mime_type: mime, data } });
    });
    const body = JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    let lastErr = 'gemini_failed';
    for (let i = 0; i < GEMINI_MODELS.length; i += 1) {
        const model = GEMINI_MODELS[i];
        if (onStatus) onStatus(`Nano Banana (${model}) is editing your try-on…`);
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': apiKey,
                },
                body,
                signal,
            },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = (data.error && data.error.message) || `gemini_${res.status}`;
            lastErr = msg;
            // try next model on quota / not found; hard-fail on auth
            if (res.status === 401 || res.status === 403) throw new Error(`gemini_auth:${msg}`);
            if (/quota|rate|resource_exhausted|429/i.test(msg) || res.status === 429) {
                lastErr = `gemini_quota:${msg}`;
                continue;
            }
            if (/not found|not supported/i.test(msg)) continue;
            throw new Error(`gemini_${res.status}:${String(msg).slice(0, 160)}`);
        }
        const partsOut = (((data.candidates || [])[0] || {}).content || {}).parts || [];
        for (let p = 0; p < partsOut.length; p += 1) {
            const inline = partsOut[p].inlineData || partsOut[p].inline_data;
            if (inline && inline.data) {
                const mime = inline.mimeType || inline.mime_type || 'image/png';
                return `data:${mime};base64,${inline.data}`;
            }
        }
        lastErr = 'gemini_no_image';
    }
    throw new Error(lastErr);
}

/** fal queue client for Nano Banana 2 Edit */
async function falNanoBananaEdit({ apiKey, imageUrls, prompt, signal, onStatus }) {
    const start = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
        method: 'POST',
        headers: {
            Authorization: `Key ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt,
            image_urls: imageUrls,
            num_images: 1,
            aspect_ratio: '3:4',
            resolution: '1K',
            output_format: 'jpeg',
            limit_generations: true,
            safety_tolerance: '5',
        }),
        signal,
    });

    if (start.status === 401 || start.status === 403) {
        const detail = await start.text();
        if (/exhausted|balance|locked|billing/i.test(detail)) {
            throw new Error('fal_balance');
        }
        throw new Error(`fal_auth_${start.status}`);
    }
    if (!start.ok) {
        const detail = await start.text();
        throw new Error(`fal_start_${start.status}:${detail.slice(0, 160)}`);
    }

    const started = await start.json();
    const statusUrl = started.status_url
        || (started.request_id ? `https://queue.fal.run/${FAL_MODEL}/requests/${started.request_id}/status` : null);
    const responseUrl = started.response_url
        || (started.request_id ? `https://queue.fal.run/${FAL_MODEL}/requests/${started.request_id}` : null);
    if (!statusUrl || !responseUrl) throw new Error('fal_bad_queue');

    const began = Date.now();
    while (Date.now() - began < TRYON_TIMEOUT_MS - 5000) {
        if (signal && signal.aborted) throw new Error('aborted');
        const st = await fetch(statusUrl, {
            headers: { Authorization: `Key ${apiKey}` },
            signal,
        });
        if (!st.ok) throw new Error(`fal_status_${st.status}`);
        const body = await st.json();
        const status = body.status || body.detail || '';
        if (onStatus) {
            if (status === 'IN_QUEUE') onStatus('Nano Banana queued…');
            else if (status === 'IN_PROGRESS') onStatus('Nano Banana is editing your try-on…');
        }
        if (status === 'COMPLETED') {
            const res = await fetch(responseUrl, {
                headers: { Authorization: `Key ${apiKey}` },
                signal,
            });
            if (!res.ok) throw new Error(`fal_result_${res.status}`);
            const data = await res.json();
            const url = (data.images && data.images[0] && data.images[0].url)
                || (data.image && data.image.url)
                || data.url;
            if (!url) throw new Error('fal_empty');
            return url;
        }
        if (status === 'FAILED' || status === 'CANCELLED') {
            throw new Error(`fal_${String(status).toLowerCase()}`);
        }
        await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error('fal_timeout');
}

/** Optional proxy (Cloudflare worker) — Gemini Nano Banana or private fal key */
async function proxyNanoBananaEdit({ proxyUrl, imageUrls, prompt, heightCm, productTitle, signal, onStatus }) {
    if (onStatus) onStatus('Sending to Nano Banana…');
    const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            provider: 'nano-banana',
            prompt,
            image_urls: imageUrls,
            height_cm: heightCm,
            product_title: productTitle,
        }),
        signal,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`proxy_${res.status}:${text.slice(0, 160)}`);
    }
    const data = await res.json();
    const url = data.result_url || data.image_url || data.url
        || (data.images && data.images[0] && (data.images[0].url || data.images[0]));
    if (!url) throw new Error('proxy_empty');
    return url;
}

export default class VirtualTryOn {
    constructor(productDetails) {
        if (!productDetails || !productDetails.$scope || !productDetails.context) return;
        this.$scope = productDetails.$scope;
        this.$form = productDetails.$form;
        this.productId = productDetails.productId;
        this.context = productDetails.context;
        this.imageGallery = productDetails.imageGallery;
        this.enabled = isTruthy(this.context.tryonEnable);
        if (!this.enabled) return;

        this.userImageDataUrl = null;
        this.productImages = [];
        this.selectedGarmentUrl = '';
        this.imageMeta = {};
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

    isConfigured() {
        return !!(
            String(this.context.tryonProxyUrl || '').trim()
            || String(this.context.tryonApiKey || '').trim()
            || String(this.context.tryonGeminiApiKey || '').trim()
        );
    }

    ensureButtons() {
        const label = this.context.tryonButtonLabel || 'Try It';
        this.$scope.find('.formView-action._designTools').each((_, el) => {
            const $wrap = $(el);
            if ($wrap.find('[data-virtual-tryon]').length) return;
            const $atc = $wrap.find('.form-action--addToCart').first();
            const $btn = $(`<div class="form-action form-action--tryOn"><button type="button" class="button button--tryOn" data-virtual-tryon>${label}</button></div>`);
            if ($atc.length) $atc.before($btn); else $wrap.append($btn);
        });
        const $sticky = this.$scope.find('#form-action-addToCartSticky');
        if ($sticky.length && !$sticky.closest('.form-action--addToCart').parent().find('[data-virtual-tryon]').length) {
            $sticky.closest('.form-action--addToCart').before(
                `<div class="form-action form-action--tryOn"><button type="button" class="button button--tryOn" data-virtual-tryon>${label}</button></div>`,
            );
        }
    }

    bindOpeners() {
        this.$scope.on('click', '[data-virtual-tryon]', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.open();
        });
    }

    ensureModal() {
        const $modalEl = $('#virtual-tryon-modal');
        if (!$modalEl.length) return null;
        if (!this.modal) {
            this.modal = modalFactory('#virtual-tryon-modal')[0];
            if (!this.modal) return null;
            this.$root = $modalEl.find('[data-tryon-root]');
            this.bindModalEvents();
            this.modal.$modal.on(ModalEvents.opened, () => { this.modal.pending = false; this.opening = false; });
            this.modal.$modal.on(ModalEvents.closed, () => { this.opening = false; });
        }
        return this.modal;
    }

    open() {
        if (this.opening) return;
        this.opening = true;
        const modal = this.ensureModal();
        if (!modal || !this.$root || !this.$root.length) {
            this.opening = false;
            window.alert('Virtual Try-On is unavailable on this page. Please refresh and try again.');
            return;
        }
        this.resetState();
        this.populateProductPreviewSync();
        this.loadProductLibrary();
        modal.open({ size: 'large', pending: false, clearContent: false });
        modal.pending = false;
        window.setTimeout(() => { modal.pending = false; this.opening = false; }, 50);
    }

    bindModalEvents() {
        const $root = this.$root;
        if (!$root || $root.data('tryonBound')) return;
        $root.data('tryonBound', true);
        const $file = $root.find('[data-tryon-file]');
        const $drop = $root.find('[data-tryon-dropzone]');

        $file.on('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) this.handleFile(file);
        });
        $drop.on('dragover', (e) => { e.preventDefault(); $drop.addClass('is-dragover'); });
        $drop.on('dragleave drop', (e) => {
            e.preventDefault();
            $drop.removeClass('is-dragover');
            if (e.type === 'drop') {
                const file = e.originalEvent.dataTransfer.files[0];
                if (file) this.handleFile(file);
            }
        });
        $root.on('click', '[data-tryon-change]', (e) => { e.preventDefault(); $file.trigger('click'); });
        $root.on('click', '[data-tryon-garment-thumb]', (e) => {
            e.preventDefault();
            const url = e.currentTarget.getAttribute('data-url');
            if (url) this.selectGarment(url);
        });
        $root.on('input change', '[data-tryon-height]', () => this.updateHeightHint());
        $root.on('click', '[data-tryon-submit]', (e) => { e.preventDefault(); this.runTryOn(); });
        $root.on('click', '[data-tryon-retry]', (e) => {
            e.preventDefault();
            this.resetState(false);
            this.populateProductPreviewSync();
            this.renderGarmentThumbs();
        });
    }

    resetState(clearFile = true) {
        this.userImageDataUrl = null;
        if (!this.$root) return;
        this.$root.find('[data-tryon-user-preview]').addClass('is-hidden');
        this.$root.find('[data-tryon-dropzone]').removeClass('is-hidden');
        this.$root.find('[data-tryon-result]').addClass('is-hidden');
        this.$root.find('[data-tryon-status]').addClass('is-hidden').removeClass('is-error is-loading').empty();
        this.$root.find('[data-tryon-submit]').prop('disabled', true);
        this.$root.find('[data-tryon-result-image]').attr('src', '');
        this.$root.find('[data-tryon-height-wrap]').addClass('is-hidden');
        if (clearFile) {
            this.$root.find('[data-tryon-file]').val('');
            this.$root.find('[data-tryon-user-image]').attr('src', '');
        }
    }

    getProductTitle() {
        return this.$scope.find('.productView-title').first().text().trim()
            || this.$scope.find('[data-virtual-tryon]').first().attr('data-product-title')
            || '';
    }

    getHeightCm() {
        return parseHeightCm(this.$root && this.$root.find('[data-tryon-height]').val());
    }

    updateHeightHint() {
        if (!this.$root) return;
        this.$root.find('[data-tryon-height-hint]').text(
            `Using ${this.getHeightCm()} cm for full-body proportions on a white background.`,
        );
    }

    populateProductPreviewSync() {
        if (!this.$root) return;
        const title = this.getProductTitle();
        this.$root.find('[data-tryon-product-title]').text(title);
        const imageUrl = this.getGarmentImageUrlSync();
        if (imageUrl) {
            this.selectedGarmentUrl = imageUrl;
            this.$root.find('[data-tryon-product-image]').attr({ src: imageUrl, alt: title });
        }
    }

    absoluteUrl(url) {
        if (!url) return '';
        if (/^https?:\/\//i.test(url) || String(url).indexOf('data:') === 0) return url;
        if (String(url).indexOf('//') === 0) return `${window.location.protocol}${url}`;
        try { return new URL(url, window.location.origin).href; } catch (e) { return url; }
    }

    collectDomGalleryUrls() {
        const urls = [];
        const push = (u) => {
            const abs = this.absoluteUrl(u);
            if (abs && urls.indexOf(abs) === -1) urls.push(abs);
        };
        if (this.imageGallery && Array.isArray(this.imageGallery.images)) {
            this.imageGallery.images.forEach((img) => {
                push(img.mainImageUrl || (img.data && (img.data.zoomImageUrl || img.data.mainImageUrl)));
            });
        }
        if (this.imageGallery && this.imageGallery.currentImage) push(this.imageGallery.currentImage.mainImageUrl);
        this.$scope.find('[data-image-gallery-main] a, [data-image-gallery-item] a, .productView-thumbnail a').each((_, el) => {
            const $a = $(el);
            push($a.data('originalImg') || $a.attr('data-original-img') || $a.attr('href') || $a.find('img').attr('src'));
        });
        push(this.$scope.find('[data-virtual-tryon]').first().attr('data-product-image'));
        return urls;
    }

    async fetchProductImages() {
        if (!this.context.graphQLToken || !this.productId) return [];
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
                            name
                            brand { name }
                            defaultImage { url(width: 1200) }
                            images { edges { node { url(width: 1200) urlOriginal } } }
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
        if (product.name) this.graphProductName = product.name;
        if (product.brand && product.brand.name) this.graphBrandName = product.brand.name;
        const urls = [];
        if (product.defaultImage && product.defaultImage.url) urls.push(product.defaultImage.url);
        ((product.images && product.images.edges) || []).forEach((edge) => {
            if (edge.node && edge.node.url) urls.push(edge.node.url);
            if (edge.node && edge.node.urlOriginal) urls.push(edge.node.urlOriginal);
        });
        return [...new Set(urls.map((u) => this.absoluteUrl(u)).filter(Boolean))];
    }

    async loadProductLibrary() {
        if (!this.$root) return;
        this.$root.find('[data-tryon-style-note]').text('Loading product photos for Nano Banana references…');
        const domUrls = this.collectDomGalleryUrls();
        let gqlUrls = [];
        try { gqlUrls = await this.fetchProductImages(); } catch (e) { /* ignore */ }
        const merged = [];
        [...domUrls, ...gqlUrls].forEach((u) => { if (u && merged.indexOf(u) === -1) merged.push(u); });
        this.productImages = merged.slice(0, 12);

        const metas = await Promise.all(this.productImages.map(async (url) => {
            try {
                const img = await loadImage(url, true);
                return { url, score: scoreStudio(img) };
            } catch (e) {
                return { url, score: -999 };
            }
        }));
        this.imageMeta = {};
        metas.forEach((m) => { this.imageMeta[m.url] = m; });
        metas.sort((a, b) => b.score - a.score);
        if (metas[0]) this.selectGarment(metas[0].url);
        this.renderGarmentThumbs();
        this.$root.find('[data-tryon-style-note]').text(
            metas[0] && metas[0].score > 60
                ? 'Studio product photo selected as primary Nano Banana reference. Extra gallery photos are also sent for exact logos/colors.'
                : 'Select the clearest product photo (studio/mannequin preferred). All gallery photos help Nano Banana match the exact product.',
        );
    }

    renderGarmentThumbs() {
        const $strip = this.$root && this.$root.find('[data-tryon-garment-strip]');
        if (!$strip || !$strip.length) return;
        if (this.productImages.length < 2) {
            $strip.addClass('is-hidden').empty();
            return;
        }
        const ordered = this.productImages.slice().sort((a, b) => ((this.imageMeta[b] && this.imageMeta[b].score) || 0) - ((this.imageMeta[a] && this.imageMeta[a].score) || 0));
        $strip.removeClass('is-hidden').html(ordered.map((url) => {
            const selected = url === this.selectedGarmentUrl ? ' is-selected' : '';
            return `<button type="button" class="tryOn-garmentThumb${selected}" data-tryon-garment-thumb data-url="${url}"><img src="${url}" alt=""></button>`;
        }).join(''));
    }

    selectGarment(url) {
        this.selectedGarmentUrl = url;
        this.$root.find('[data-tryon-product-image]').attr({ src: url, alt: this.getProductTitle() });
        this.$root.find('[data-tryon-garment-thumb]').each((_, el) => {
            el.classList.toggle('is-selected', el.getAttribute('data-url') === url);
        });
    }

    getGarmentImageUrlSync() {
        if (this.selectedGarmentUrl) return this.selectedGarmentUrl;
        if (this.imageGallery && this.imageGallery.currentImage && this.imageGallery.currentImage.mainImageUrl) {
            return this.absoluteUrl(this.imageGallery.currentImage.mainImageUrl);
        }
        const $main = this.$scope.find('[data-image-gallery-main] .slick-current a, [data-image-gallery-main] a').first();
        const fromDom = $main.data('originalImg') || $main.attr('data-original-img') || $main.find('img').attr('src');
        if (fromDom) return this.absoluteUrl(fromDom);
        const fromBtn = this.$scope.find('[data-virtual-tryon]').first().attr('data-product-image');
        return fromBtn ? this.absoluteUrl(fromBtn) : '';
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
            this.$root.find('[data-tryon-height-wrap]').removeClass('is-hidden');
            if (!this.$root.find('[data-tryon-height]').val()) {
                this.$root.find('[data-tryon-height]').val(String(DEFAULT_HEIGHT_CM));
            }
            this.updateHeightHint();
        };
        reader.onerror = () => {
            this.showStatus(this.context.tryonErrorGeneric || 'Could not read that photo.', true);
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

    async buildReferenceUrls() {
        const primary = this.selectedGarmentUrl || this.getGarmentImageUrlSync();
        const ranked = this.productImages
            .slice()
            .sort((a, b) => ((this.imageMeta[b] && this.imageMeta[b].score) || 0) - ((this.imageMeta[a] && this.imageMeta[a].score) || 0));
        const refs = [];
        if (primary) refs.push(primary);
        ranked.forEach((u) => {
            if (refs.indexOf(u) === -1) refs.push(u);
        });
        return refs.slice(0, MAX_PRODUCT_REFS);
    }

    async runTryOn() {
        if (!this.userImageDataUrl) {
            this.showStatus(this.context.tryonErrorNeedPhoto || 'Upload a photo first.', true);
            return;
        }
        if (!this.isConfigured()) {
            this.showStatus(
                this.context.tryonErrorNotConfigured
                || 'Virtual Try-On needs a Nano Banana connection. Add a Gemini API key, fal.ai API key, or proxy URL in Theme Editor → Virtual Try-On.',
                true,
            );
            return;
        }

        const heightCm = this.getHeightCm();
        const $submit = this.$root.find('[data-tryon-submit]');
        $submit.prop('disabled', true);
        this.showStatus(this.context.tryonLoading || 'Preparing Nano Banana try-on…', false, true);

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = window.setTimeout(() => { if (controller) controller.abort(); }, TRYON_TIMEOUT_MS);

        try {
            const title = [this.graphBrandName, this.graphProductName || this.getProductTitle()].filter(Boolean).join(' ');
            const productRefs = await this.buildReferenceUrls();
            if (!productRefs.length) throw new Error('no_product');

            this.showStatus('Encoding photos for Nano Banana…', false, true);
            const personUrl = await resizeToDataUrl(this.userImageDataUrl);
            const productDataUrls = [];
            for (let i = 0; i < productRefs.length; i += 1) {
                try {
                    productDataUrls.push(await resizeToDataUrl(productRefs[i]));
                } catch (e) {
                    // skip bad ref
                }
            }
            if (!productDataUrls.length) throw new Error('no_product');

            const imageUrls = [personUrl, ...productDataUrls];
            const prompt = buildNanoBananaPrompt({
                title,
                heightCm,
                productCount: imageUrls.length,
            });

            const proxyUrl = String(this.context.tryonProxyUrl || '').trim();
            const apiKey = String(this.context.tryonApiKey || this.context.tryonGeminiApiKey || '').trim();
            let resultUrl;

            if (proxyUrl) {
                resultUrl = await proxyNanoBananaEdit({
                    proxyUrl,
                    imageUrls,
                    prompt,
                    heightCm,
                    productTitle: title,
                    signal: controller && controller.signal,
                    onStatus: (m) => this.showStatus(m, false, true),
                });
            } else if (isGeminiApiKey(apiKey)) {
                resultUrl = await geminiNanoBananaEdit({
                    apiKey,
                    imageUrls,
                    prompt,
                    signal: controller && controller.signal,
                    onStatus: (m) => this.showStatus(m, false, true),
                });
            } else if (isFalApiKey(apiKey) || apiKey) {
                resultUrl = await falNanoBananaEdit({
                    apiKey,
                    imageUrls,
                    prompt,
                    signal: controller && controller.signal,
                    onStatus: (m) => this.showStatus(m, false, true),
                });
            } else {
                throw new Error('not_configured');
            }

            const $resultImg = this.$root.find('[data-tryon-result-image]');
            $resultImg.one('load', () => this.$root.find('[data-tryon-status]').addClass('is-hidden'));
            $resultImg.attr('src', resultUrl);
            this.$root.find('[data-tryon-download]').attr({
                href: resultUrl,
                download: 'jettribe-tryon.jpg',
                target: '_blank',
                rel: 'noopener',
            });
            this.$root.find('[data-tryon-result]').removeClass('is-hidden');
            this.showStatus('Done — Nano Banana try-on ready.', false, false);
            window.setTimeout(() => this.$root.find('[data-tryon-status]').addClass('is-hidden'), 2000);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Nano Banana try-on failed', err);
            const msgText = String((err && err.message) || err || '');
            let msg = this.context.tryonErrorGeneric
                || 'Sorry — try-on could not be generated. Please try another photo.';
            if (err && err.name === 'AbortError' || /abort|timeout/i.test(msgText)) {
                msg = 'Try-on timed out. Please try again.';
            } else if (/gemini_quota|quota|RESOURCE_EXHAUSTED/i.test(msgText)) {
                msg = 'Gemini image quota is exhausted. In Google AI Studio, enable billing for this API key’s project, then try again.';
            } else if (/gemini_auth/i.test(msgText)) {
                msg = 'Gemini API key was rejected. Update Theme Editor → Virtual Try-On → API key.';
            } else if (/fal_balance|exhausted|billing|locked/i.test(msgText)) {
                msg = 'Nano Banana needs fal.ai credits (or a Gemini API key with billing). Top up at fal.ai/dashboard/billing, then try again.';
            } else if (/fal_auth|401|403/i.test(msgText)) {
                msg = 'API key was rejected. Update Theme Editor → Virtual Try-On → API key (Gemini or fal.ai).';
            } else if (/not_configured/i.test(msgText)) {
                msg = 'Add a Gemini API key, fal.ai API key, or proxy URL in Theme Editor → Virtual Try-On.';
            }
            this.showStatus(msg, true);
        } finally {
            window.clearTimeout(timeoutId);
            $submit.prop('disabled', !this.userImageDataUrl);
        }
    }
}
