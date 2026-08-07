/**
 * Virtual Try-On — generative AI fit (free via Hugging Face IDM-VTON).
 *
 * Improves product fidelity by:
 *  - Loading ALL product gallery images
 *  - Scoring / letting shoppers pick the best garment reference
 *  - Building a style prompt from title + colors across the gallery
 *  - Preparing a cleaned, torso-focused garment reference image
 *
 * Modal MUST open with { pending: false, clearContent: false }.
 */
import $ from 'jquery';
import modalFactory, { ModalEvents } from '../global/modal';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 896;
const TRYON_TIMEOUT_MS = 210000;
const DENOISE_STEPS = 30;

const TRYON_HOSTS = [
    'yisol-idm-vton.hf.space',
];

const BRAND_STYLE_HINTS = [
    'Jettribe',
    'competition race PFD life vest',
    'technical watersports apparel',
    'preserve exact brand lettering logos color panels straps buckles and stitching from the garment photo',
    'fit the vest naturally on the upper body chest and shoulders',
    'do not invent a different vest design',
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

function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.94) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('toBlob_failed'));
        }, type, quality);
    });
}

function rgbToHex(r, g, b) {
    const h = (n) => n.toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
}

function colorNameHint(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 40) return 'black';
    if (min > 220) return 'white';
    if (max - min < 25) return r > 160 ? 'light gray' : 'gray';
    if (b > r + 25 && b > g + 10) return b > 180 && g > 140 ? 'aqua blue' : 'blue';
    if (r > g + 40 && r > b + 40) return 'red';
    if (g > r + 30 && g > b + 20) return 'green';
    if (r > 180 && g > 140 && b < 100) return 'gold';
    if (r > 150 && g > 100 && b < 90) return 'tan';
    return null;
}

/**
 * Sample dominant non-background colors from an image (for style prompt).
 */
function extractPalette(img, limit = 4) {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    try {
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const buckets = new Map();
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Skip near-white / near-black studio extremes lightly
            if ((r > 245 && g > 245 && b > 245) || (r < 12 && g < 12 && b < 12)) continue;
            const key = `${r >> 4},${g >> 4},${b >> 4}`;
            const prev = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
            prev.n += 1;
            prev.r += r;
            prev.g += g;
            prev.b += b;
            buckets.set(key, prev);
        }
        return [...buckets.values()]
            .sort((a, b) => b.n - a.n)
            .slice(0, limit)
            .map((c) => {
                const r = Math.round(c.r / c.n);
                const g = Math.round(c.g / c.n);
                const b = Math.round(c.b / c.n);
                return {
                    hex: rgbToHex(r, g, b),
                    name: colorNameHint(r, g, b),
                    r,
                    g,
                    b,
                    weight: c.n,
                };
            });
    } catch (e) {
        return [];
    }
}

/**
 * Score how suitable an image is as a garment reference for VTON.
 * Prefers torso-centered product shots over wide lifestyle/action scenes.
 */
function scoreGarmentImage(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return { score: 0, palette: [] };

    let score = 50;
    const aspect = w / h;
    // Prefer portrait / near-square product frames
    if (aspect >= 0.65 && aspect <= 1.15) score += 18;
    else if (aspect > 1.4) score -= 18; // wide action shots
    else if (aspect < 0.55) score -= 6;

    const canvas = document.createElement('canvas');
    const sw = 48;
    const sh = 64;
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let palette = [];
    try {
        ctx.drawImage(img, 0, 0, sw, sh);
        const { data } = ctx.getImageData(0, 0, sw, sh);
        palette = extractPalette(img, 5);

        // Corner brightness vs center — studio/product shots often have quieter corners
        const sampleAvg = (x0, y0, x1, y1) => {
            let s = 0;
            let n = 0;
            for (let y = y0; y < y1; y += 1) {
                for (let x = x0; x < x1; x += 1) {
                    const i = (y * sw + x) * 4;
                    s += (data[i] + data[i + 1] + data[i + 2]) / 3;
                    n += 1;
                }
            }
            return n ? s / n : 0;
        };
        const corner = (
            sampleAvg(0, 0, 8, 8)
            + sampleAvg(sw - 8, 0, sw, 8)
            + sampleAvg(0, sh - 8, 8, sh)
            + sampleAvg(sw - 8, sh - 8, sw, sh)
        ) / 4;
        const center = sampleAvg(14, 16, 34, 48);
        if (Math.abs(corner - center) > 35) score += 8;
        // Penalize very busy frames (high variance)
        let sum = 0;
        let sum2 = 0;
        const total = sw * sh;
        for (let i = 0; i < data.length; i += 4) {
            const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
            sum += v;
            sum2 += v * v;
        }
        const mean = sum / total;
        const variance = sum2 / total - mean * mean;
        if (variance > 5500) score -= 10;
        if (variance < 1800) score += 4;
    } catch (e) {
        score -= 5;
    }

    return { score, palette, width: w, height: h };
}

/**
 * Crop toward the torso / center and drop corner badges (e.g. LIMITED STOCK).
 */
function prepareGarmentCanvas(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    // Trim outer 8% to drop corner banners; keep upper-mid bias for vests
    const x0 = Math.floor(w * 0.08);
    const x1 = Math.floor(w * 0.92);
    const y0 = Math.floor(h * 0.04);
    const y1 = Math.floor(h * 0.88);
    const cw = Math.max(1, x1 - x0);
    const ch = Math.max(1, y1 - y0);

    const scale = Math.min(1, MAX_EDGE / Math.max(cw, ch));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cw * scale));
    canvas.height = Math.max(1, Math.round(ch * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, x0, y0, cw, ch, 0, 0, canvas.width, canvas.height);
    return canvas;
}

/**
 * Build a multi-view style reference: large primary garment + 2–3 secondary
 * product views. Helps the model lock onto Jettribe color/logo trends.
 */
async function buildStyleMatchedGarmentBlob(primaryImg, secondaryImgs) {
    const primary = prepareGarmentCanvas(primaryImg);
    const extras = [];
    for (let i = 0; i < secondaryImgs.length && extras.length < 3; i += 1) {
        try {
            extras.push(prepareGarmentCanvas(secondaryImgs[i]));
        } catch (e) {
            // skip
        }
    }

    if (!extras.length) {
        return canvasToBlob(primary);
    }

    const stripH = Math.round(primary.height * 0.28);
    const canvas = document.createElement('canvas');
    canvas.width = primary.width;
    canvas.height = primary.height + stripH + 4;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(primary, 0, 0);

    const gap = 4;
    const cellW = Math.floor((canvas.width - gap * (extras.length - 1)) / extras.length);
    extras.forEach((ex, idx) => {
        const dx = idx * (cellW + gap);
        const dy = primary.height + 4;
        // cover-fit each secondary into its cell
        const scale = Math.max(cellW / ex.width, stripH / ex.height);
        const dw = ex.width * scale;
        const dh = ex.height * scale;
        const sx = (dw - cellW) / 2;
        const sy = (dh - stripH) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(dx, dy, cellW, stripH);
        ctx.clip();
        ctx.drawImage(ex, dx - sx, dy - sy, dw, dh);
        ctx.restore();
    });

    return canvasToBlob(canvas);
}

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

function buildGarmentDescription(title, palettes) {
    const parts = [];
    const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim();
    if (cleanTitle) {
        parts.push(`exact product: ${cleanTitle}`);
    }

    const names = [];
    const hexes = [];
    (palettes || []).forEach((p) => {
        (p || []).forEach((c) => {
            if (c.name && names.indexOf(c.name) === -1) names.push(c.name);
            if (c.hex && hexes.indexOf(c.hex) === -1) hexes.push(c.hex);
        });
    });
    if (names.length) {
        parts.push(`product colors: ${names.slice(0, 5).join(', ')}`);
    }
    if (hexes.length) {
        parts.push(`palette ${hexes.slice(0, 5).join(' ')}`);
    }

    parts.push(...BRAND_STYLE_HINTS);

    // IDM-VTON description field is a short text prompt — keep under ~400 chars
    return parts.join('. ').slice(0, 420);
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
                return first.url || first.path;
            }
        }
        if (payload && payload.url) return payload.url;
    }
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
                description || 'Jettribe apparel',
                true, // auto-masking
                true, // crop person for better upper-body fit
                DENOISE_STEPS,
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
    if (resultUrl.indexOf('/file=') === 0 || resultUrl.indexOf('/tmp/') === 0) {
        return `https://${host}/file=${resultUrl.replace(/^\/file=/, '')}`;
    }
    return `https://${host}/file=${resultUrl}`;
}

async function runGenerativeTryOn({
    personDataUrl,
    garmentBlob,
    description,
    signal,
    onStatus,
}) {
    if (onStatus) onStatus('Preparing photos for exact product match…');
    const personBlob = await imageSourceToJpegBlob(personDataUrl);

    let lastError;
    for (let i = 0; i < TRYON_HOSTS.length; i += 1) {
        const host = TRYON_HOSTS[i];
        try {
            if (onStatus) onStatus('Uploading product style + your photo…');
            const [personPath, garmentPath] = await Promise.all([
                uploadToSpace(host, personBlob, 'person.jpg'),
                uploadToSpace(host, garmentBlob, 'garment.jpg'),
            ]);
            if (onStatus) {
                onStatus('AI is fitting this exact Jettribe product on you… usually 20–60 seconds.');
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
        this.productImages = [];
        this.selectedGarmentUrl = '';
        this.imageMeta = {}; // url -> { score, palette }
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
        this.loadProductStyleLibrary();

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

        $root.on('click', '[data-tryon-garment-thumb]', (e) => {
            e.preventDefault();
            const url = $(e.currentTarget).attr('data-url');
            if (url) {
                this.selectGarment(url);
            }
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
                push(img.mainImageUrl || img.data && (img.data.zoomImageUrl || img.data.mainImageUrl));
            });
        }
        if (this.imageGallery && this.imageGallery.currentImage) {
            push(this.imageGallery.currentImage.mainImageUrl);
        }

        this.$scope.find('[data-image-gallery-main] a, [data-image-gallery-item] a, .productView-thumbnail a').each((_, el) => {
            const $a = $(el);
            push($a.data('originalImg') || $a.attr('data-original-img') || $a.attr('href') || $a.find('img').attr('src'));
        });

        const fromBtn = this.$scope.find('[data-virtual-tryon]').first().attr('data-product-image');
        push(fromBtn);

        return urls;
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
                            name
                            brand { name }
                            defaultImage { url(width: 1200) }
                            images {
                                edges { node { url(width: 1200) urlOriginal isDefault altText } }
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

        if (product.name) {
            this.graphProductName = product.name;
        }
        if (product.brand && product.brand.name) {
            this.graphBrandName = product.brand.name;
        }

        const urls = [];
        if (product.defaultImage && product.defaultImage.url) {
            urls.push(product.defaultImage.url);
        }
        ((product.images && product.images.edges) || []).forEach((edge) => {
            if (edge.node) {
                if (edge.node.url) urls.push(edge.node.url);
                if (edge.node.urlOriginal) urls.push(edge.node.urlOriginal);
            }
        });
        return [...new Set(urls.map((u) => this.absoluteUrl(u)).filter(Boolean))];
    }

    async loadProductStyleLibrary() {
        if (!this.$root) return;
        this.$root.find('[data-tryon-style-note]').text('Reading all product photos for exact style match…');

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

        // Score images in parallel (best-effort)
        const metas = await Promise.all(this.productImages.map(async (url) => {
            try {
                const img = await loadImage(url, true);
                const meta = scoreGarmentImage(img);
                return { url, ...meta, img };
            } catch (e) {
                return { url, score: 0, palette: [], img: null };
            }
        }));

        this.imageMeta = {};
        metas.forEach((m) => {
            this.imageMeta[m.url] = m;
        });

        metas.sort((a, b) => b.score - a.score);
        if (metas.length && metas[0].score > 0) {
            this.selectGarment(metas[0].url);
        } else if (this.productImages[0]) {
            this.selectGarment(this.productImages[0]);
        }

        this.renderGarmentThumbs();
        const n = this.productImages.length;
        const note = n > 1
            ? `Using ${n} product photos to match Jettribe colors, logos & panel layout. Pick the clearest front vest shot.`
            : 'Tip: a clear front-facing product photo gives the best exact match.';
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

        const html = this.productImages.map((url) => {
            const selected = url === this.selectedGarmentUrl ? ' is-selected' : '';
            return `<button type="button" class="tryOn-garmentThumb${selected}" data-tryon-garment-thumb data-url="${url}">
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
        this.$root.find(`[data-tryon-garment-thumb][data-url="${url}"]`).addClass('is-selected');
    }

    getGarmentImageUrlSync() {
        if (this.selectedGarmentUrl) {
            return this.selectedGarmentUrl;
        }
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

    async prepareExactGarmentBlob() {
        const primaryUrl = this.selectedGarmentUrl || this.getGarmentImageUrlSync();
        if (!primaryUrl) {
            throw new Error('no_garment');
        }

        // Rank others by score for secondary style strip
        const ranked = this.productImages
            .map((url) => ({ url, score: (this.imageMeta[url] && this.imageMeta[url].score) || 0 }))
            .sort((a, b) => b.score - a.score)
            .map((x) => x.url);

        const secondaryUrls = ranked.filter((u) => u !== primaryUrl).slice(0, 3);
        const primaryImg = await loadImage(primaryUrl, true);
        const secondaryImgs = [];
        await Promise.all(secondaryUrls.map(async (url) => {
            try {
                secondaryImgs.push(await loadImage(url, true));
            } catch (e) {
                // skip
            }
        }));

        return buildStyleMatchedGarmentBlob(primaryImg, secondaryImgs);
    }

    buildDescription() {
        const title = [this.graphBrandName, this.graphProductName || this.getProductTitle()]
            .filter(Boolean)
            .join(' ');
        const palettes = this.productImages.map((url) => (this.imageMeta[url] && this.imageMeta[url].palette) || []);
        return buildGarmentDescription(title, palettes);
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

        const $submit = this.$root.find('[data-tryon-submit]');
        $submit.prop('disabled', true);
        this.showStatus(
            this.context.tryonLoading || 'Matching Jettribe product style, then fitting on you…',
            false,
            true,
        );

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = window.setTimeout(() => {
            if (controller) controller.abort();
        }, TRYON_TIMEOUT_MS);

        try {
            const [garmentBlob, description] = await Promise.all([
                this.prepareExactGarmentBlob(),
                Promise.resolve(this.buildDescription()),
            ]);

            const resultUrl = await runGenerativeTryOn({
                personDataUrl: this.userImageDataUrl,
                garmentBlob,
                description,
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
                || 'Sorry — try-on could not be generated. Try another photo, or pick a clearer front product shot, then try again.';
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
