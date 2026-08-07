/**
 * Virtual Try-On — free Hugging Face IDM-VTON (Gradio Space)
 *
 * Flow:
 *  1. User clicks "Try it On AI" near Add to Cart
 *  2. Uploads a photo (FileReader preview)
 *  3. We send person + product image to the free IDM-VTON Space
 *  4. Show the generated result (or a friendly free-tier error)
 *
 * Note: yisol/IDM-VTON is not a simple Inference API model. The free public
 * endpoint is the Gradio Space queue API (same model, free ZeroGPU).
 * Optional: Theme Editor → Hugging Face token for better rate limits.
 */
import $ from 'jquery';
import modalFactory, { ModalEvents } from '../global/modal';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 768;
const TRYON_TIMEOUT_MS = 180000;
/** Free IDM-VTON Gradio Space (ZeroGPU). Not a simple Inference API model. */
const HF_SPACE = 'https://yisol-idm-vton.hf.space';
const HF_FN_INDEX = 2; // /tryon

function isTruthy(v) {
    return v !== false && v !== 'false' && v !== 0 && v !== '0' && v != null && v !== '';
}

function randomSessionHash() {
    return `jt${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function dataUrlToBlob(dataUrl) {
    const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('bad_data_url');
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: m[1] || 'image/jpeg' });
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
        if (String(src).indexOf('data:') === 0) return src;
        const res = await fetch(src);
        if (!res.ok) throw new Error(`fetch_${res.status}`);
        return blobToDataUrl(await res.blob());
    }
}

function scoreStudio(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    let score = 40;
    const aspect = w / Math.max(1, h);
    if (aspect >= 0.85 && aspect <= 1.15) score += 12;
    if (aspect > 1.35) score -= 20;
    const c = document.createElement('canvas');
    c.width = 40;
    c.height = 40;
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

/** Upload a data-URL image to the Gradio Space; returns server filepath. */
async function hfUploadDataUrl(dataUrl, filename, hfToken, signal) {
    const blob = dataUrlToBlob(dataUrl);
    const form = new FormData();
    form.append('files', blob, filename);
    const headers = {};
    if (hfToken) headers.Authorization = `Bearer ${hfToken}`;
    const res = await fetch(`${HF_SPACE}/upload`, {
        method: 'POST',
        headers,
        body: form,
        signal,
    });
    if (res.status === 401 || res.status === 403) throw new Error('hf_auth');
    if (res.status === 429) throw new Error('hf_rate_limit');
    if (!res.ok) {
        const text = await res.text();
        if (/busy|gpu|quota|overload|503|529/i.test(text)) throw new Error('hf_busy');
        throw new Error(`hf_upload_${res.status}`);
    }
    const json = await res.json();
    const path = Array.isArray(json) ? json[0] : json;
    if (!path) throw new Error('hf_upload_empty');
    return path;
}

function resolveSpaceFileUrl(fileRef) {
    if (!fileRef) return '';
    if (typeof fileRef === 'string') {
        if (/^https?:\/\//i.test(fileRef) || fileRef.indexOf('data:') === 0) return fileRef;
        if (fileRef.indexOf('/tmp/') === 0 || fileRef.indexOf('tmp/') === 0) {
            return `${HF_SPACE}/file=${fileRef}`;
        }
        return fileRef;
    }
    if (fileRef.url) return resolveSpaceFileUrl(fileRef.url);
    if (fileRef.path) return resolveSpaceFileUrl(fileRef.path);
    return '';
}

/**
 * Free Hugging Face IDM-VTON via Gradio Space queue (upload + queue/join).
 * This is the working free path for yisol/IDM-VTON (not api-inference.huggingface.co).
 */
async function hfIdmVtonTryOn({
    hfToken,
    personDataUrl,
    garmentDataUrl,
    garmentDes,
    signal,
    onStatus,
}) {
    if (onStatus) onStatus('AI is working its magic… (uploading photos)');
    const personPath = await hfUploadDataUrl(personDataUrl, 'person.jpg', hfToken, signal);
    const garmentPath = await hfUploadDataUrl(garmentDataUrl, 'garment.jpg', hfToken, signal);

    // ImageEditor: background filepath, empty layers, no composite
    const human = { background: personPath, layers: [], composite: null };
    const payload = {
        data: [
            human,
            garmentPath,
            String(garmentDes || 'product').slice(0, 120),
            true, // auto-masking
            true, // auto-crop
            30,
            42,
        ],
        fn_index: HF_FN_INDEX,
        session_hash: randomSessionHash(),
    };

    if (onStatus) onStatus('AI is working its magic… (queueing free GPU)');

    const headers = { 'Content-Type': 'application/json' };
    if (hfToken) headers.Authorization = `Bearer ${hfToken}`;

    const join = await fetch(`${HF_SPACE}/queue/join`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
    });
    if (join.status === 401 || join.status === 403) throw new Error('hf_auth');
    if (join.status === 429) throw new Error('hf_rate_limit');
    if (!join.ok) {
        const text = await join.text();
        if (/busy|gpu|quota|overload|503|529/i.test(text)) throw new Error('hf_busy');
        throw new Error(`hf_join_${join.status}:${text.slice(0, 120)}`);
    }

    const streamHeaders = {};
    if (hfToken) streamHeaders.Authorization = `Bearer ${hfToken}`;
    const stream = await fetch(
        `${HF_SPACE}/queue/data?session_hash=${encodeURIComponent(payload.session_hash)}`,
        { headers: streamHeaders, signal },
    );
    if (stream.status === 429) throw new Error('hf_rate_limit');
    if (!stream.ok) throw new Error(`hf_stream_${stream.status}`);

    const reader = stream.body && stream.body.getReader
        ? stream.body.getReader()
        : null;
    const decoder = new TextDecoder();
    let buffer = '';
    const began = Date.now();

    const handlePayload = (msgObj) => {
        const msg = msgObj && msgObj.msg;
        if (msg === 'estimation' && onStatus) {
            const eta = msgObj.rank_eta ? ` ~${Math.round(msgObj.rank_eta)}s` : '';
            onStatus(`AI is working its magic… (in free queue${eta})`);
        }
        if (msg === 'process_starts' && onStatus) {
            onStatus('AI is working its magic…');
        }
        if (msg === 'process_completed') {
            if (!msgObj.success) {
                const err = (msgObj.output && msgObj.output.error) || 'hf_failed';
                if (/busy|gpu|quota|ZeroGPU|queue/i.test(String(err))) throw new Error('hf_busy');
                throw new Error(`hf_error:${String(err).slice(0, 160)}`);
            }
            const dataOut = (msgObj.output && msgObj.output.data) || [];
            const url = resolveSpaceFileUrl(dataOut[0]);
            if (!url) throw new Error('hf_empty');
            return url;
        }
        return null;
    };

    if (!reader) {
        // Fallback for older browsers: read full text
        const raw = await stream.text();
        const lines = raw.split('\n');
        for (let i = 0; i < lines.length; i += 1) {
            if (lines[i].indexOf('data:') !== 0) continue;
            const result = handlePayload(JSON.parse(lines[i].slice(5).trim()));
            if (result) return result;
        }
        throw new Error('hf_empty');
    }

    while (Date.now() - began < TRYON_TIMEOUT_MS - 3000) {
        if (signal && signal.aborted) throw new Error('aborted');
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';
        for (let i = 0; i < parts.length; i += 1) {
            const line = parts[i].trim();
            if (line.indexOf('data:') !== 0) continue;
            let msgObj;
            try {
                msgObj = JSON.parse(line.slice(5).trim());
            } catch (e) {
                continue;
            }
            const result = handlePayload(msgObj);
            if (result) {
                try { reader.cancel(); } catch (e) { /* ignore */ }
                return result;
            }
        }
    }
    throw new Error('hf_timeout');
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

    /** Free HF path works with or without a token; token improves rate limits */
    isConfigured() {
        return true;
    }

    hfToken() {
        return String(
            this.context.tryonHfToken
            || this.context.tryonApiKey
            || '',
        ).trim();
    }

    ensureButtons() {
        const label = this.context.tryonButtonLabel || 'Try it On AI';
        this.$scope.find('.formView-action._designTools').each((_, el) => {
            const $wrap = $(el);
            if ($wrap.find('[data-virtual-tryon]').length) return;
            const $atc = $wrap.find('.form-action--addToCart').first();
            const $btn = $(`<div class="form-action form-action--tryOn"><button type="button" class="button button--tryOn" data-virtual-tryon>${label}</button></div>`);
            if ($atc.length) $atc.before($btn);
            else $wrap.append($btn);
        });
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

    absoluteUrl(url) {
        if (!url) return '';
        if (/^https?:\/\//i.test(url) || String(url).indexOf('data:') === 0) return url;
        if (String(url).indexOf('//') === 0) return `${window.location.protocol}${url}`;
        try { return new URL(url, window.location.origin).href; } catch (e) { return url; }
    }

    populateProductPreviewSync() {
        if (!this.$root) return;
        const title = this.getProductTitle();
        this.$root.find('[data-tryon-product-title]').text(title);
        const imageUrl = this.getGarmentImageUrlSync();
        if (imageUrl) {
            this.selectedGarmentUrl = imageUrl;
            this.$root.find('[data-tryon-product-image]').attr({ src: imageUrl, alt: title });
            this.$root.find('[data-tryon-product-url]').val(imageUrl);
        }
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
        this.$root.find('[data-tryon-style-note]').text('Loading product photos…');
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
                ? 'Studio product photo selected (best for exact logos/colors).'
                : 'Select the clearest product photo (studio/mannequin preferred).',
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
        this.$root.find('[data-tryon-product-url]').val(url);
        this.$root.find('[data-tryon-garment-thumb]').each((_, el) => {
            el.classList.toggle('is-selected', el.getAttribute('data-url') === url);
        });
    }

    getGarmentImageUrlSync() {
        if (this.selectedGarmentUrl) return this.selectedGarmentUrl;
        const hidden = this.$root && this.$root.find('[data-tryon-product-url]').val();
        if (hidden) return this.absoluteUrl(hidden);
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
        if (!file || !file.type || !/^image\/(jpeg|png|jpg)/i.test(file.type)) {
            this.showStatus(this.context.tryonErrorFileType || 'Please upload a JPG or PNG photo.', true);
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

    async runTryOn() {
        if (!this.userImageDataUrl) {
            this.showStatus(this.context.tryonErrorNeedPhoto || 'Upload a photo first.', true);
            return;
        }

        const $submit = this.$root.find('[data-tryon-submit]');
        $submit.prop('disabled', true);
        this.showStatus(this.context.tryonLoading || 'AI is working its magic…', false, true);

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = window.setTimeout(() => { if (controller) controller.abort(); }, TRYON_TIMEOUT_MS);

        try {
            const title = [this.graphBrandName, this.graphProductName || this.getProductTitle()].filter(Boolean).join(' ');
            const garmentUrl = this.selectedGarmentUrl || this.getGarmentImageUrlSync();
            if (!garmentUrl) throw new Error('no_product');

            this.showStatus('Preparing photos…', false, true);
            const personUrl = await resizeToDataUrl(this.userImageDataUrl);
            const garmentDataUrl = await resizeToDataUrl(garmentUrl);

            const resultUrl = await hfIdmVtonTryOn({
                hfToken: this.hfToken(),
                personDataUrl: personUrl,
                garmentDataUrl,
                garmentDes: title || 'Jettribe product',
                signal: controller && controller.signal,
                onStatus: (m) => this.showStatus(m, false, true),
            });

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
            this.showStatus('Done — your try-on is ready.', false, false);
            window.setTimeout(() => this.$root.find('[data-tryon-status]').addClass('is-hidden'), 2000);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Virtual try-on failed', err);
            const msgText = String((err && err.message) || err || '');
            let msg = this.context.tryonErrorGeneric
                || 'Sorry — try-on could not be generated. Please try another photo.';
            if ((err && err.name === 'AbortError') || /abort|timeout|hf_timeout/i.test(msgText)) {
                msg = 'The free AI took too long. Please try again in a minute.';
            } else if (/hf_busy|queue|ZeroGPU|gpu/i.test(msgText)) {
                msg = 'Free AI queue is busy right now. Wait a minute and try again — or add a free Hugging Face token in Theme Editor for better limits.';
            } else if (/hf_rate_limit|429/i.test(msgText)) {
                msg = 'Free AI rate limit hit. Wait a bit, or add your free Hugging Face token in Theme Editor → Virtual Try-On.';
            } else if (/hf_auth|401|403/i.test(msgText)) {
                msg = 'Hugging Face token was rejected. Create a free token at huggingface.co/settings/tokens and paste it in Theme Editor.';
            } else if (/no_product/i.test(msgText)) {
                msg = this.context.tryonErrorNoProduct || 'Could not load the product image.';
            }
            this.showStatus(msg, true);
        } finally {
            window.clearTimeout(timeoutId);
            $submit.prop('disabled', !this.userImageDataUrl);
        }
    }
}
