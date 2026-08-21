/**
 * Product Design Tool Module
 * Handle product image fetching and design tool integration
 * @author papathemes-dinosaur
 */

export default class ProductDesignTool {
    /**
     * Constructor
     * @param {Object} productDetails - ProductDetails instance hoặc options object
     * @param {jQuery} productDetails.$scope - Product scope element
     * @param {jQuery} productDetails.$form - Product form element
     * @param {number} productDetails.productId - Product ID
     * @param {Object} productDetails.context - Theme context
     */
    constructor(productDetails) {
        // 🔍 Support cả 2 cách: truyền object options hoặc ProductDetails instance
        if (productDetails && typeof productDetails === 'object') {
            this.$scope = productDetails.$scope;
            this.$form = productDetails.$form;
            this.productId = productDetails.productId;
            this.context = productDetails.context;
        }

        // ✅ Validate required properties
        if (!this.$scope || !this.$form || !this.productId || !this.context) {
            // eslint-disable-next-line no-console
            console.error('❌ ProductDesignTool: Missing required properties');
            return;
        }

        this.init();
    }

    /**
     * Get selected option value IDs from the product form
     * @returns {Array<{optionEntityId: number, valueEntityId: number}>} Selected option values
     */
    getSelectedOptionValueIds() {
        const optionValueIds = [];

        // 🔍 Sử dụng jQuery serializeArray() để lấy tất cả form data đã chọn
        const formData = this.$form.serializeArray();

        formData.forEach(({ name, value }) => {
            // 📝 Extract option ID từ name attribute (e.g., "attribute[123]" -> 123)
            const optionIdMatch = name.match(/attribute\[(\d+)\]/);
            if (optionIdMatch && value) {
                const optionEntityId = parseInt(optionIdMatch[1], 10);
                const valueEntityId = parseInt(value, 10);

                // ✅ Chỉ thêm nếu có giá trị valid và chưa tồn tại
                if (optionEntityId && valueEntityId) {
                    const existingOption = optionValueIds.find(opt => opt.optionEntityId === optionEntityId);
                    if (!existingOption) {
                        optionValueIds.push({
                            optionEntityId,
                            valueEntityId,
                        });
                    }
                }
            }
        });

        return optionValueIds;
    }

    /**
     * Fetch product images and default image based on selected options using GraphQL
     * @returns {Promise<Array<string>>} Array of image URLs (bao gồm images + defaultImage)
     */
    async fetchImages() {
        try {
            // 🖼️ Lấy product ID và selected option values
            const productId = this.productId;
            const optionValueIds = this.getSelectedOptionValueIds();

            const response = await $.ajax({
                url: '/graphql',
                method: 'POST',
                data: JSON.stringify({
                    query: `query GetProductImages($entityId: Int!, $optionValueIds: [OptionValueId!]) {
                        site {
                            product(entityId: $entityId, optionValueIds: $optionValueIds) {
                                images {
                                    edges {
                                        node {
                                            url(width: 1000)
                                            urlTemplate
                                            isDefault
                                        }
                                    }
                                }
                                defaultImage {
                                    url(width: 1000)
                                    isDefault
                                }
                            }
                        }
                    }`,
                    variables: {
                        entityId: productId,
                        optionValueIds,
                    },
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.context.graphQLToken}`,
                },
                xhrFields: { withCredentials: true },
            });

            // ✅ Validate response structure trước khi truy cập data
            if (!response || typeof response !== 'object') {
                throw new Error('Invalid response structure from GraphQL');
            }

            const data = response.data;
            if (!data) {
                throw new Error('No data property in GraphQL response');
            }

            // 📸 Extract image URLs from response
            const product = data?.site?.product;
            const images = product?.images?.edges || [];
            const defaultImage = product?.defaultImage;

            // 🖼️ Collect all image URLs
            const imageUrls = images.map(edge => edge.node.url);

            // 🔄 Replace image có isDefault = true bằng defaultImage
            if (defaultImage && defaultImage.url) {
                const defaultImageUrl = defaultImage.url;

                // 🔍 Tìm index của image có isDefault = true
                const defaultImageIndex = images.findIndex(edge => edge.node.isDefault);

                if (defaultImageIndex !== -1) {
                    // 🔄 Thay thế image có isDefault = true bằng defaultImage
                    imageUrls[defaultImageIndex] = defaultImageUrl;
                } else {
                    // 📌 Nếu không có image nào có isDefault = true, add defaultImage vào đầu
                    imageUrls.unshift(defaultImageUrl);
                }
            }

            return imageUrls;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('❌ Failed to fetch images:', error);
            return [];
        }
    }

    /**
     * Set loading state for design tool button
     * @param {jQuery} $button - Button element
     * @param {boolean} isLoading - Loading state
     */
    setButtonLoadingState($button, isLoading) {
        if (isLoading) {
            // 💫 Save original state và set loading
            $button.data('original-text', $button.html());
            $button.data('original-disabled', $button.prop('disabled'));

            // 🔄 Thêm spinner và dấu ... vào cuối text gốc
            const originalText = $button.html();
            $button
                .prop('disabled', true)
                .addClass('is-loading')
                .html(`${originalText}...`);
        } else {
            // 🔄 Restore original state
            const originalText = $button.data('original-text');
            const originalDisabled = $button.data('original-disabled');

            $button
                .prop('disabled', originalDisabled || false)
                .removeClass('is-loading')
                .html(originalText || $button.html());

            // 🧹 Clean up data attributes
            $button.removeData('original-text original-disabled');
        }
    }

    /**
     * Get zip content or URL from the design file input
     * @returns {Promise<Object|null>} Zip data object hoặc null nếu không có
     */
    async getZipData() {
        try {
            // 🔍 Tìm file input có data-pd-option-name = context.pd_modifier_name
            const $fileInput = this.$form.find(`input[type="file"][data-pd-option-name="${this.context.pd_modifier_name}"]`);

            if (!$fileInput.length) {
                return null;
            }

            // 🗃️ Check nếu có file được upload
            if ($fileInput[0].files.length > 0) {
                const file = $fileInput[0].files[0];

                // ✅ Check xem có phải file zip không
                if (!file.type.includes('zip') && !file.name.toLowerCase().endsWith('.zip')) {
                    // eslint-disable-next-line no-console
                    console.warn('📁 File is not a zip file:', file.name, 'Type:', file.type);
                    return null;
                }

                // 📖 Tạo object với file content
                const zipData = {
                    type: 'file',
                    zipContent: {
                        file, // File object gốc
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        // 📱 Thêm ArrayBuffer content
                        arrayBuffer: await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = (e) => resolve(e.target.result);
                            reader.onerror = (e) => reject(e);
                            reader.readAsArrayBuffer(file);
                        }),
                    },
                };

                return zipData;
            }

            // 🌐 Check nếu có URL trong data-pd-file-url
            const fileUrl = $fileInput.attr('data-pd-file-url');
            if (fileUrl && fileUrl.trim()) {
                return {
                    type: 'url',
                    zipUrl: fileUrl.trim(),
                };
            }

            return null;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('❌ Error reading zip data:', error);
            return null;
        }
    }

    /**
     * Wait for PapaProductDesign to be available on window object
     * @param {number} timeout - Maximum time to wait in milliseconds (default: 10000)
     * @param {number} interval - Check interval in milliseconds (default: 100)
     * @returns {Promise<void>} Resolves when PapaProductDesign is available
     */
    async waitForPapaProductDesign(timeout = 10000, interval = 100) {
        return new Promise((resolve, reject) => {
            // ✅ Nếu đã có sẵn thì return ngay
            if (window.PapaProductDesign) {
                resolve();
                return;
            }

            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (window.PapaProductDesign) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    const error = new Error(`❌ Timeout waiting for PapaProductDesign (${timeout}ms)`);
                    // eslint-disable-next-line no-console
                    console.error(error.message);
                    reject(error);
                }
            }, interval);
        });
    }

    /**
     * Initialize product design tool
     * Setup click handlers and integrate with PapaProductDesign
     */
    init() {
        this.$scope.find('[data-design-tool]').on('click', async (event) => {
            event.preventDefault();

            const $button = $(event.currentTarget);

            // 🚫 Prevent multiple clicks khi đang loading
            if ($button.hasClass('is-loading')) {
                return;
            }

            try {
                // 💫 Set loading state
                this.setButtonLoadingState($button, true);

                // 🖼️ Fetch images và zip data song song
                const [images, zipData] = await Promise.all([
                    this.fetchImages(),
                    this.getZipData(),
                ]);

                // 🎨 Launch design tool - wait for PapaProductDesign to be available
                await this.waitForPapaProductDesign();
                const config = {
                    appUrl: this.context.pd_base_url,
                    slides: images,
                    saveCallback: this.saveCallback.bind(this),
                    addToCartCallback: this.addToCartCallback.bind(this),
                    layers: [],
                };

                // 📁 Thêm zip data nếu có
                if (zipData) {
                    if (zipData.type === 'file') {
                        // 🗃️ File content
                        config.zipContent = zipData.zipContent.file;
                    } else if (zipData.type === 'url') {
                        // 🌐 URL content
                        config.zipUrl = zipData.zipUrl;
                    }
                }

                try {
                    window.PapaProductDesign.renderDialog(config);
                } catch (designToolError) {
                    // eslint-disable-next-line no-console
                    console.error('❌ Design tool launch error:', designToolError);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('❌ Design tool error:', error);
            } finally {
                // 🔄 Always restore button state
                this.setButtonLoadingState($button, false);
            }
        });
    }

    /**
     * Save callback for design tool
     * Lưu zip file content vào file input có data-pd-option-name
     * @param {Blob|ArrayBuffer|Uint8Array} zipFileContent - Zip file content từ design tool
     */
    saveCallback(zipFileContent) {
        try {
            // 🔍 Tìm file input có data-pd-option-name = context.pd_modifier_name
            const $fileInput = this.$form.find(`input[type="file"][data-pd-option-name="${this.context.pd_modifier_name}"]`);

            if (!$fileInput.length) {
                // eslint-disable-next-line no-console
                console.warn('⚠️ No file input found in form');
                return;
            }

            // 📁 Tạo File object từ zip content
            let file;
            if (zipFileContent instanceof File) {
                file = zipFileContent;
            } else {
                // 🔄 Convert ArrayBuffer/Uint8Array/Blob thành File
                const blob = zipFileContent instanceof Blob
                    ? zipFileContent
                    : new Blob([zipFileContent], { type: 'application/zip' });

                file = new File([blob], 'design.zip', {
                    type: 'application/zip',
                    lastModified: Date.now(),
                });
            }

            // 📝 Create new FileList với file mới
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            // 💾 Set file vào input
            $fileInput[0].files = dataTransfer.files;

            // 🔔 Trigger change event để form biết có file mới
            $fileInput.trigger('change');

            // ✅ Update UI nếu có filename display
            const $filename = $fileInput.closest('[data-product-attribute="input-file"]').find('._filename');
            if ($filename.length) {
                $filename.text(file.name);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('❌ Error saving design file:', error);
        }
    }

    /**
     * Add to cart callback for design tool
     * @param {Blob|ArrayBuffer|Uint8Array} zipFileContent - Zip file content từ design tool
     */
    addToCartCallback(zipFileContent) {
        try {
            // 💾 Save design file first
            this.saveCallback(zipFileContent);

            // ✅ Use native browser validation
            const form = this.$form[0];
            if (form.checkValidity()) {
                // 🛒 Submit form if valid
                this.$form.trigger('submit');
            } else {
                // 📝 Show validation errors
                form.reportValidity();
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('❌ Error in addToCartCallback:', error);
        }
    }
}
