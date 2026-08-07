/**
 * Virtual Try-On — generative fit via free Hugging Face IDM-VTON.
 *
 * Quality rules (tested):
 *  - Prefer studio/mannequin product photos (white bg) over lifestyle shots
 *  - NEVER send a multi-image collage as the garment (causes wrong designs)
 *  - Put shopper on white canvas (scaled by height) before AI
 *  - Return full person on white background after AI
 *  - Retry when the free GPU queue errors
 */
import $ from 'jquery';
import modalFactory, { ModalEvents } from '../global/modal';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 896;
const TRYON_TIMEOUT_MS = 210000;
const DENOISE_STEPS = 28;
const DEFAULT_HEIGHT_CM = 175;
const TRYON_HOSTS = ['yisol-idm-vton.hf.space'];
const IMGLY_REMBG = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.8/+esm';

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

function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.94) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('toBlob_failed'));
        }, type, quality);
    });
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

let rembgPromise = null;
async function removeBackground(blobOrUrl) {
    if (!rembgPromise) {
        rembgPromise = import(/* webpackIgnore: true */ IMGLY_REMBG)
            .then((mod) => mod.removeBackground || mod.default)
            .catch((err) => {
                rembgPromise = null;
                throw err;
            });
    }
    const removeBackgroundFn = await rembgPromise;
    return removeBackgroundFn(blobOrUrl, {
        model: 'small',
        output: { format: 'image/png', quality: 0.9 },
    });
}

async function imageToCanvas(src) {
    const img = await loadImage(typeof src === 'string' ? src : await blobToDataUrl(src), true);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return { canvas, img };
}

/**
 * Score garment suitability. Studio / mannequin / white-bg wins over lifestyle.
 */
function scoreGarmentImage(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return { score: -999, whiteRatio: 0, isStudio: false };

    let score = 40;
    const aspect = w / h;
    if (aspect >= 0.85 && aspect <= 1.15) score += 12; // product square
    if (aspect > 1.35) score -= 20; // wide lifestyle

    const sw = 48;
    const sh = 48;
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    let whiteRatio = 0;
    let isStudio = false;
    try {
        ctx.drawImage(img, 0, 0, sw, sh);
        const { data } = ctx.getImageData(0, 0, sw, sh);
        let white = 0;
        let dark = 0;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 235 && g > 235 && b > 235) white += 1;
            if (r < 35 && g < 35 && b < 35) dark += 1;
        }
        const total = sw * sh;
        whiteRatio = white / total;
        const darkRatio = dark / total;
        // Mannequin-on-white / flat-lay product shots
        if (whiteRatio > 0.28) {
            score += 35;
            isStudio = true;
        } else if (whiteRatio > 0.15) {
            score += 15;
            isStudio = true;
        }
        // Black mannequin + garment often has moderate dark ratio with white bg
        if (isStudio && darkRatio > 0.05 && darkRatio < 0.45) score += 10;
        // Busy outdoor scenes: lower white, higher mid variance
        if (whiteRatio < 0.08) score -= 18;
    } catch (e) {
        score -= 8;
    }

    return { score, whiteRatio, isStudio, width: w, height: h };
}

function parseHeightCm(raw) {
    const text = String(raw || '').trim().toLowerCase();
    if (!text) return DEFAULT_HEIGHT_CM;
    // 5'11" or 5 11
    const ft = text.match(/^(\d)\s*[\'’ft]\s*(\d{1,2})/);
    if (ft) {
        return Math.round((parseInt(ft[1], 10) * 12 + parseInt(ft[2], 10)) * 2.54);
    }
    const cm = text.match(/(\d{2,3})\s*cm/);
    if (cm) return parseInt(cm[1], 10);
    const n = parseInt(text, 10);
    if (n >= 120 && n <= 230) return n; // cm
    if (n >= 48 && n <= 90) return Math.round(n * 2.54); // inches
    return DEFAULT_HEIGHT_CM;
}

/**
 * Place cutout (or image) on a full-body white canvas sized by height.
 */
async function placeOnWhiteCanvas(source, heightCm = DEFAULT_HEIGHT_CM, fullBodyBias = true) {
    let img;
    if (source instanceof HTMLCanvasElement) {
        img = source;
    } else if (typeof source === 'string' || source instanceof Blob) {
        const loaded = await imageToCanvas(source);
        img = loaded.canvas;
    } else {
        throw new Error('bad_source');
    }

    const aspect = Math.max(1.3, Math.min(2.05, heightCm / 95));
    const targetH = 1400;
    const targetW = Math.round(targetH / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);

    const maxW = Math.round(targetW * 0.88);
    const maxH = Math.round(targetH * (fullBodyBias ? 0.94 : 0.72));
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const dw = Math.round(img.width * scale);
    const dh = Math.round(img.height * scale);
    const dx = Math.round((targetW - dw) / 2);
    const dy = fullBodyBias
        ? Math.round(targetH - dh - targetH * 0.02)
        : Math.round((targetH - dh) / 2);
    ctx.drawImage(img, dx, dy, dw, dh);
    return canvasToBlob(canvas);
}

async function preparePersonBlob(dataUrl, heightCm) {
    // Detect crop: very short images are bust shots
    const { img } = await imageToCanvas(dataUrl);
    const aspect = (img.naturalHeight || img.height) / Math.max(1, img.naturalWidth || img.width);
    const looksFullBody = aspect >= 1.25;

    let cutBlob = null;
    try {
        cutBlob = await removeBackground(dataUrl);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Try-on: background removal unavailable for person', e);
    }

    const source = cutBlob || dataUrl;
    return {
        blob: await placeOnWhiteCanvas(source, heightCm, true),
        looksFullBody,
    };
}

async function prepareGarmentBlob(url) {
    const { img } = await imageToCanvas(url);
    // Mild center crop to drop corner badges (LIMITED STOCK)
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const x0 = Math.floor(w * 0.06);
    const y0 = Math.floor(h * 0.02);
    const cw = Math.floor(w * 0.88);
    const ch = Math.floor(h * 0.96);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, MAX_EDGE / Math.max(cw, ch));
    canvas.width = Math.max(1, Math.round(cw * scale));
    canvas.height = Math.max(1, Math.round(ch * scale));
    canvas.getContext('2d').drawImage(img, x0, y0, cw, ch, 0, 0, canvas.width, canvas.height);

    // Keep RGB on white — do NOT rembg studio mannequin shots (hurts identity)
    // Only rembg when background is busy (low white ratio)
    const meta = scoreGarmentImage(img);
    if (!meta.isStudio) {
        try {
            const blob = await canvasToBlob(canvas);
            const cut = await removeBackground(blob);
            const cutCanvas = (await imageToCanvas(cut)).canvas;
            // Composite cutout onto white
            const white = document.createElement('canvas');
            white.width = cutCanvas.width;
            white.height = cutCanvas.height;
            const ctx = white.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, white.width, white.height);
            ctx.drawImage(cutCanvas, 0, 0);
            return canvasToBlob(white);
        } catch (e) {
            // fall through
        }
    }
    return canvasToBlob(canvas);
}

function buildGarmentDescription(title) {
    const clean = String(title || '').replace(/\s+/g, ' ').trim();
    const parts = [];
    if (clean) parts.push(clean);
    parts.push(
        'Jettribe competition race PFD life vest',
        'preserve exact brand lettering logos color panels straps and buckles from the garment photo',
        'do not invent a different vest design',
        'fit naturally on the upper body',
    );
    return parts.join('. ').slice(0, 380);
}

async function uploadToSpace(host, blob, filename) {
    const form = new FormData();
    form.append('files', blob, filename);
    const res = await fetch(`https://${host}/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`upload_${res.status}`);
    const json = await res.json();
    const path = Array.isArray(json) ? json[0] : json;
    if (!path) throw new Error('upload_empty');
    return path;
}

function parseSseComplete(text) {
    const blocks = String(text || '').split(/\n\n+/);
    for (let i = blocks.length - 1; i >= 0; i -= 1) {
        const block = blocks[i];
        if (!block || block.indexOf('data:') === -1) continue;
        if (block.indexOf('event: error') !== -1) {
            throw new Error('provider_error');
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
        if (Array.isArray(payload) && payload[0] && payload[0].url) {
            return payload[0].url;
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
                description || 'Jettribe apparel',
                true,
                true,
                DENOISE_STEPS,
                Math.floor(Math.random() * 1e9),
            ],
        }),
        signal,
    });
    if (!joinRes.ok) throw new Error(`tryon_join_${joinRes.status}`);
    const { event_id: eventId } = await joinRes.json();
    if (!eventId) throw new Error('tryon_no_event');

    const streamRes = await fetch(`https://${host}/call/tryon/${eventId}`, { signal });
    if (!streamRes.ok) throw new Error(`tryon_stream_${streamRes.status}`);
    const text = await streamRes.text();
    if (text.indexOf('event: error') !== -1) throw new Error('provider_error');
    const resultUrl = parseSseComplete(text);
    if (!resultUrl) throw new Error('tryon_empty_result');
    if (resultUrl.indexOf('http') === 0) return resultUrl;
    return `https://${host}/file=${String(resultUrl).replace(/^\/file=/, '')}`;
}

async function finalizeWhiteResult(resultUrl, heightCm) {
    // Download result, rembg, place on white full-body canvas
    let blob;
    try {
        const res = await fetch(resultUrl);
        if (!res.ok) throw new Error('result_fetch');
        blob = await res.blob();
    } catch (e) {
        // CORS fallback — return remote URL
        return resultUrl;
    }

    try {
        const cut = await removeBackground(blob);
        const outBlob = await placeOnWhiteCanvas(cut, heightCm, true);
        return blobToDataUrl(outBlob);
    } catch (e) {
        // If rembg fails, still pad onto white
        try {
            return blobToDataUrl(await placeOnWhiteCanvas(blob, heightCm, true));
        } catch (e2) {
            return resultUrl;
        }
    }
}

async function runGenerativeTryOn({
    personBlob,
    garmentBlob,
    description,
    heightCm,
    signal,
    onStatus,
}) {
    let lastError;
    for (let hostIdx = 0; hostIdx < TRYON_HOSTS.length; hostIdx += 1) {
        const host = TRYON_HOSTS[hostIdx];
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                if (onStatus) {
                    onStatus(attempt === 1
                        ? 'Uploading photos to free AI…'
                        : `Free AI queue busy — retry ${attempt}/3…`);
                }
                const [personPath, garmentPath] = await Promise.all([
                    uploadToSpace(host, personBlob, 'person.jpg'),
                    uploadToSpace(host, garmentBlob, 'garment.jpg'),
                ]);
                if (onStatus) {
                    onStatus('AI is fitting the exact product on you… usually 20–60 seconds.');
                }
                const resultUrl = await callIdmVton(host, personPath, garmentPath, description, signal);
                if (onStatus) onStatus('Finishing white-background full-body image…');
                return finalizeWhiteResult(resultUrl, heightCm);
            } catch (err) {
                lastError = err;
                // eslint-disable-next-line no-console
                console.warn('Try-on attempt failed', host, attempt, err);
                if (signal && signal.aborted) throw err;
                await new Promise((r) => setTimeout(r, 1200 * attempt));
            }
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

    ensureButtons() {
        const label = this.context.tryonButtonLabel || 'Try It';
        const $actions = this.$scope.find('.formView-action._designTools');

        $actions.each((_, el) => {
            const $wrap = $(el);
            if ($wrap.find('[data-virtual-tryon]').length) return;
            const $atc = $wrap.find('.form-action--addToCart').first();
            const $btn = $(`
                <div class="form-action form-action--tryOn">
                    <button type="button" class="button button--tryOn" data-virtual-tryon>${label}</button>
                </div>
            `);
            if ($atc.length) $atc.before($btn);
            else $wrap.append($btn);
        });

        const $sticky = this.$scope.find('#form-action-addToCartSticky');
        if ($sticky.length && !$sticky.closest('.form-action--addToCart').parent().find('[data-virtual-tryon]').length) {
            $sticky.closest('.form-action--addToCart').before(`
                <div class="form-action form-action--tryOn">
                    <button type="button" class="button button--tryOn" data-virtual-tryon>${label}</button>
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
        if (!$modalEl.length) return null;

        if (!this.modal) {
            this.modal = modalFactory('#virtual-tryon-modal')[0];
            if (!this.modal) return null;
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
        this.loadProductStyleLibrary();

        modal.open({ size: 'large', pending: false, clearContent: false });
        modal.pending = false;
        window.setTimeout(() => {
            modal.pending = false;
            this.opening = false;
        }, 50);
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

        $drop.on('dragover', (e) => {
            e.preventDefault();
            $drop.addClass('is-dragover');
        });
        $drop.on('dragleave drop', (e) => {
            e.preventDefault();
            $drop.removeClass('is-dragover');
            if (e.type === 'drop') {
                const file = e.originalEvent.dataTransfer.files[0];
                if (file) this.handleFile(file);
            }
        });

        $root.on('click', '[data-tryon-change]', (e) => {
            e.preventDefault();
            $file.trigger('click');
        });

        $root.on('click', '[data-tryon-garment-thumb]', (e) => {
            e.preventDefault();
            const url = $(e.currentTarget).attr('data-url');
            if (url) this.selectGarment(url);
        });

        $root.on('input change', '[data-tryon-height]', () => {
            this.updateHeightHint();
        });

        $root.on('click', '[data-tryon-submit]', (e) => {
            e.preventDefault();
            this.runTryOn();
        });

        $root.on('click', '[data-tryon-retry]', (e) => {
            e.preventDefault();
            this.resetState(false);
            this.populateProductPreviewSync();
            this.renderGarmentThumbs();
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
        $root.find('[data-tryon-height-wrap]').addClass('is-hidden');
        if (clearFile) {
            $root.find('[data-tryon-file]').val('');
            $root.find('[data-tryon-user-image]').attr('src', '');
        }
    }

    getProductTitle() {
        return this.$scope.find('.productView-title').first().text().trim()
            || this.$scope.find('[data-virtual-tryon]').first().attr('data-product-title')
            || '';
    }

    getHeightCm() {
        const raw = this.$root && this.$root.find('[data-tryon-height]').val();
        return parseHeightCm(raw);
    }

    updateHeightHint() {
        if (!this.$root) return;
        const cm = this.getHeightCm();
        this.$root.find('[data-tryon-height-hint]').text(
            `Using ${cm} cm to scale a full-body white-background result.`,
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
        if (this.imageGallery && this.imageGallery.currentImage) {
            push(this.imageGallery.currentImage.mainImageUrl);
        }
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
                            images { edges { node { url(width: 1200) urlOriginal isDefault } } }
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

    async loadProductStyleLibrary() {
        if (!this.$root) return;
        this.$root.find('[data-tryon-style-note]').text('Finding the clearest studio product photo…');

        const domUrls = this.collectDomGalleryUrls();
        let gqlUrls = [];
        try {
            gqlUrls = await this.fetchProductImages();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Try-on: GraphQL images unavailable', err);
        }

        const merged = [];
        [...domUrls, ...gqlUrls].forEach((u) => {
            if (u && merged.indexOf(u) === -1) merged.push(u);
        });
        this.productImages = merged.slice(0, 12);

        const metas = await Promise.all(this.productImages.map(async (url) => {
            try {
                const img = await loadImage(url, true);
                return { url, ...scoreGarmentImage(img) };
            } catch (e) {
                return { url, score: -999, whiteRatio: 0, isStudio: false };
            }
        }));
        this.imageMeta = {};
        metas.forEach((m) => { this.imageMeta[m.url] = m; });
        metas.sort((a, b) => b.score - a.score);

        if (metas.length && metas[0].score > -100) {
            this.selectGarment(metas[0].url);
        } else if (this.productImages[0]) {
            this.selectGarment(this.productImages[0]);
        }

        this.renderGarmentThumbs();
        const best = metas[0];
        const note = best && best.isStudio
            ? 'Using a studio/mannequin product photo for exact vest match. You can pick another below.'
            : 'Tip: pick a studio/mannequin product photo (white background) for the most exact vest match.';
        this.$root.find('[data-tryon-style-note]').text(note);
    }

    renderGarmentThumbs() {
        if (!this.$root) return;
        const $strip = this.$root.find('[data-tryon-garment-strip]');
        if (!$strip.length) return;
        if (this.productImages.length < 2) {
            $strip.addClass('is-hidden').empty();
            return;
        }
        // Sort thumbs: studio first
        const ordered = this.productImages.slice().sort((a, b) => {
            const sa = (this.imageMeta[a] && this.imageMeta[a].score) || 0;
            const sb = (this.imageMeta[b] && this.imageMeta[b].score) || 0;
            return sb - sa;
        });
        const html = ordered.map((url) => {
            const selected = url === this.selectedGarmentUrl ? ' is-selected' : '';
            const studio = this.imageMeta[url] && this.imageMeta[url].isStudio ? ' is-studio' : '';
            return `<button type="button" class="tryOn-garmentThumb${selected}${studio}" data-tryon-garment-thumb data-url="${url}">
                <img src="${url}" alt="">
            </button>`;
        }).join('');
        $strip.removeClass('is-hidden').html(html);
    }

    selectGarment(url) {
        this.selectedGarmentUrl = url;
        const title = this.getProductTitle();
        this.$root.find('[data-tryon-product-image]').attr({ src: url, alt: title });
        this.$root.find('[data-tryon-garment-thumb]').removeClass('is-selected');
        this.$root.find(`[data-tryon-garment-thumb][data-url="${CSS.escape ? CSS.escape(url) : url}"]`).addClass('is-selected');
        // Fallback if CSS.escape attribute selector fails on special chars
        this.$root.find('[data-tryon-garment-thumb]').each((_, el) => {
            if (el.getAttribute('data-url') === url) el.classList.add('is-selected');
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

    absoluteUrl(url) {
        if (!url) return '';
        if (/^https?:\/\//i.test(url) || url.indexOf('data:') === 0) return url;
        if (url.indexOf('//') === 0) return `${window.location.protocol}${url}`;
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
        reader.onload = async () => {
            this.userImageDataUrl = reader.result;
            this.$root.find('[data-tryon-user-image]').attr('src', this.userImageDataUrl);
            this.$root.find('[data-tryon-user-preview]').removeClass('is-hidden');
            this.$root.find('[data-tryon-dropzone]').addClass('is-hidden');
            this.$root.find('[data-tryon-submit]').prop('disabled', false);
            this.$root.find('[data-tryon-status]').addClass('is-hidden');
            this.$root.find('[data-tryon-result]').addClass('is-hidden');

            // Always show height — critical when photo crop ≠ product framing
            this.$root.find('[data-tryon-height-wrap]').removeClass('is-hidden');
            if (!this.$root.find('[data-tryon-height]').val()) {
                this.$root.find('[data-tryon-height]').val(String(DEFAULT_HEIGHT_CM));
            }
            this.updateHeightHint();

            try {
                const { img } = await imageToCanvas(this.userImageDataUrl);
                const aspect = (img.naturalHeight || img.height) / Math.max(1, img.naturalWidth || img.width);
                if (aspect < 1.25) {
                    this.showStatus(
                        'Your photo looks cropped (not full-body). Enter your height below so we can build a complete person on a white background. A standing full-body photo gives the best fit.',
                        false,
                        false,
                    );
                }
            } catch (e) {
                // ignore
            }
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
        if (!this.selectedGarmentUrl && !this.getGarmentImageUrlSync()) {
            this.showStatus(this.context.tryonErrorNoProduct || 'Could not load the product image.', true);
            return;
        }

        const heightCm = this.getHeightCm();
        if (!heightCm || heightCm < 120 || heightCm > 230) {
            this.$root.find('[data-tryon-height-wrap]').removeClass('is-hidden');
            this.showStatus('Please enter your height (cm) so we can scale a complete full-body result.', true);
            return;
        }

        const $submit = this.$root.find('[data-tryon-submit]');
        $submit.prop('disabled', true);
        this.showStatus('Preparing white-background photos for exact product fit…', false, true);

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = window.setTimeout(() => {
            if (controller) controller.abort();
        }, TRYON_TIMEOUT_MS);

        try {
            const title = [this.graphBrandName, this.graphProductName || this.getProductTitle()].filter(Boolean).join(' ');
            const description = buildGarmentDescription(title);
            const garmentUrl = this.selectedGarmentUrl || this.getGarmentImageUrlSync();

            const [personPrep, garmentBlob] = await Promise.all([
                preparePersonBlob(this.userImageDataUrl, heightCm),
                prepareGarmentBlob(garmentUrl),
            ]);

            if (!personPrep.looksFullBody) {
                this.showStatus(
                    `Cropped photo detected — using height ${heightCm} cm for full-body framing. Fitting product…`,
                    false,
                    true,
                );
            }

            const resultUrl = await runGenerativeTryOn({
                personBlob: personPrep.blob,
                garmentBlob,
                description,
                heightCm,
                signal: controller && controller.signal,
                onStatus: (msg) => this.showStatus(msg, false, true),
            });

            if (!resultUrl) throw new Error('empty_result');

            const $resultImg = this.$root.find('[data-tryon-result-image]');
            $resultImg.one('load', () => {
                this.$root.find('[data-tryon-status]').addClass('is-hidden');
            });
            $resultImg.attr('src', resultUrl);
            this.$root.find('[data-tryon-download]').attr({
                href: resultUrl,
                download: 'jettribe-tryon.jpg',
                target: '_blank',
                rel: 'noopener',
            });
            this.$root.find('[data-tryon-result]').removeClass('is-hidden');
            this.showStatus('Done — full person on white background with your product.', false, false);
            window.setTimeout(() => {
                this.$root.find('[data-tryon-status]').addClass('is-hidden');
            }, 2500);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Virtual try-on failed', err);
            const errText = String((err && err.message) || err || '');
            const timedOut = err && (err.name === 'AbortError' || /abort/i.test(errText));
            let msg = this.context.tryonErrorGeneric
                || 'Sorry — try-on could not be generated. Pick a studio product photo, enter height, and try again in a minute.';
            if (timedOut) msg = 'Try-on timed out on the free AI queue. Please try again in a minute.';
            if (/provider_error/i.test(errText)) {
                msg = 'Free AI queue was busy. Please tap Try Now again in a few seconds.';
            }
            this.showStatus(msg, true);
        } finally {
            window.clearTimeout(timeoutId);
            $submit.prop('disabled', !this.userImageDataUrl);
        }
    }
}
