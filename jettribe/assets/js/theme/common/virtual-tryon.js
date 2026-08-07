/**
 * Virtual Try-On (100% free, runs in the shopper's browser).
 *
 * Uses Google MediaPipe Pose Landmarker (CDN) to find shoulders/hips, then
 * composites the product image onto the shopper photo with canvas.
 * No fal.ai, no proxy, no API keys, no paid credits.
 *
 * Modal MUST open with { pending: false, clearContent: false }.
 */
import $ from 'jquery';
import modalFactory, { ModalEvents } from '../global/modal';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MEDIAPIPE_VERSION = '0.10.18';
const MEDIAPIPE_ESM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/+esm`;
const MEDIAPIPE_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

// MediaPipe landmark indices
const LS = 11; // left shoulder
const RS = 12; // right shoulder
const LH = 23; // left hip
const RH = 24; // right hip

let poseLandmarkerPromise = null;

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
                // Retry without CORS (may limit soft-key / export edge cases)
                loadImage(src, false).then(resolve).catch(reject);
                return;
            }
            reject(new Error('image_load_failed'));
        };
        img.src = src;
    });
}

async function getPoseLandmarker() {
    if (!poseLandmarkerPromise) {
        poseLandmarkerPromise = (async () => {
            // webpackIgnore keeps this off the theme bundle (loaded free from CDN)
            const vision = await import(/* webpackIgnore: true */ MEDIAPIPE_ESM);
            const { FilesetResolver, PoseLandmarker } = vision;
            const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
            try {
                return await PoseLandmarker.createFromOptions(fileset, {
                    baseOptions: {
                        modelAssetPath: POSE_MODEL,
                        delegate: 'GPU',
                    },
                    runningMode: 'IMAGE',
                    numPoses: 1,
                });
            } catch (gpuErr) {
                // Some devices reject GPU delegate — fall back to CPU
                return PoseLandmarker.createFromOptions(fileset, {
                    baseOptions: {
                        modelAssetPath: POSE_MODEL,
                        delegate: 'CPU',
                    },
                    runningMode: 'IMAGE',
                    numPoses: 1,
                });
            }
        })().catch((err) => {
            poseLandmarkerPromise = null;
            throw err;
        });
    }
    return poseLandmarkerPromise;
}

/**
 * Soft-key near-white / corner-sampled studio backgrounds from product shots.
 */
function softKeyGarment(img) {
    const canvas = document.createElement('canvas');
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    let imageData;
    try {
        imageData = ctx.getImageData(0, 0, w, h);
    } catch (e) {
        // Tainted canvas (CORS) — return unkeyed image
        return canvas;
    }

    const { data } = imageData;
    const sample = (x, y) => {
        const i = (Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4;
        return [data[i], data[i + 1], data[i + 2]];
    };

    const corners = [
        sample(2, 2),
        sample(w - 3, 2),
        sample(2, h - 3),
        sample(w - 3, h - 3),
        sample(Math.floor(w / 2), 2),
        sample(2, Math.floor(h / 2)),
    ];
    const avg = corners.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0])
        .map((v) => v / corners.length);

    const threshold = 42;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = Math.abs(r - avg[0]) + Math.abs(g - avg[1]) + Math.abs(b - avg[2]);
        const nearWhite = r > 235 && g > 235 && b > 235;
        const nearBg = dist < threshold;
        if (nearWhite || nearBg) {
            const t = nearWhite ? (255 - Math.min(r, g, b)) / 20 : dist / threshold;
            data[i + 3] = Math.max(0, Math.min(255, Math.floor(t * 255)));
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

function landmarkPoint(landmarks, index, width, height) {
    const p = landmarks[index];
    if (!p) return null;
    return { x: p.x * width, y: p.y * height, vis: p.visibility == null ? 1 : p.visibility };
}

function compositeTryOn(personImg, garmentCanvas, landmarks) {
    const width = personImg.naturalWidth || personImg.width;
    const height = personImg.naturalHeight || personImg.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(personImg, 0, 0, width, height);

    const gW = garmentCanvas.width;
    const gH = garmentCanvas.height;
    const aspect = gW / Math.max(1, gH);

    const leftS = landmarks && landmarkPoint(landmarks, LS, width, height);
    const rightS = landmarks && landmarkPoint(landmarks, RS, width, height);
    const leftH = landmarks && landmarkPoint(landmarks, LH, width, height);
    const rightH = landmarks && landmarkPoint(landmarks, RH, width, height);

    const shouldersOk = leftS && rightS && (leftS.vis > 0.35 || rightS.vis > 0.35);

    if (shouldersOk) {
        const midSx = (leftS.x + rightS.x) / 2;
        const midSy = (leftS.y + rightS.y) / 2;
        const shoulderW = Math.hypot(rightS.x - leftS.x, rightS.y - leftS.y);
        const angle = Math.atan2(rightS.y - leftS.y, rightS.x - leftS.x);

        let torsoH = shoulderW * 1.35;
        if (leftH && rightH) {
            const midHx = (leftH.x + rightH.x) / 2;
            const midHy = (leftH.y + rightH.y) / 2;
            torsoH = Math.max(torsoH, Math.hypot(midHx - midSx, midHy - midSy));
        }

        let drawW = Math.max(shoulderW * 1.8, width * 0.18);
        let drawH = drawW / aspect;
        if (drawH < torsoH * 1.25) {
            drawH = torsoH * 1.25;
            drawW = drawH * aspect;
        }
        // Cap so we don't cover the whole frame on close-ups
        drawW = Math.min(drawW, width * 0.72);
        drawH = drawW / aspect;

        ctx.save();
        ctx.translate(midSx, midSy + drawH * 0.12);
        ctx.rotate(angle);
        ctx.globalAlpha = 0.94;
        ctx.drawImage(garmentCanvas, -drawW / 2, -drawH * 0.12, drawW, drawH);
        ctx.restore();
    } else {
        // Heuristic: upper-torso centered overlay when pose is missing
        let drawW = width * 0.4;
        let drawH = drawW / aspect;
        if (drawH > height * 0.45) {
            drawH = height * 0.45;
            drawW = drawH * aspect;
        }
        ctx.globalAlpha = 0.92;
        ctx.drawImage(garmentCanvas, (width - drawW) / 2, height * 0.2, drawW, drawH);
        ctx.globalAlpha = 1;
    }

    return canvas.toDataURL('image/jpeg', 0.92);
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
        // Warm MediaPipe in the background so first Try Now feels snappy
        getPoseLandmarker().catch(() => {});
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
            this.context.tryonLoading || 'Fitting the product on your photo…',
            false,
            true,
        );

        try {
            const [personImg, garmentImg] = await Promise.all([
                loadImage(this.userImageDataUrl, false),
                loadImage(garmentUrl, true),
            ]);

            const garmentCanvas = softKeyGarment(garmentImg);

            let landmarks = null;
            try {
                const landmarker = await getPoseLandmarker();
                const detection = landmarker.detect(personImg);
                if (detection && detection.landmarks && detection.landmarks[0]) {
                    landmarks = detection.landmarks[0];
                }
            } catch (poseErr) {
                // eslint-disable-next-line no-console
                console.warn('Try-on: pose detection unavailable, using fallback placement', poseErr);
            }

            const resultUrl = compositeTryOn(personImg, garmentCanvas, landmarks);
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
            this.showStatus(
                this.context.tryonErrorGeneric
                || 'Sorry — try-on could not be generated. Please try another full-body photo.',
                true,
            );
        } finally {
            $submit.prop('disabled', !this.userImageDataUrl);
        }
    }
}
