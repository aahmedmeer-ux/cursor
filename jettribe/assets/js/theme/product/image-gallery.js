// ============================================================================
// PAPATHEMES SARAHMARKET CUSTOMIZATION:
// - Using slick carousel for image thumbnails.
// - Using baguetteBox for image lightbox.
// ============================================================================

import $ from 'jquery';
import _ from 'lodash';
import 'slick-carousel';
// eslint-disable-next-line import/no-unresolved
import baguetteBox from 'baguettebox';
import mediaQueryListFactory from '../common/media-query-list';

const smallMediaQuery = mediaQueryListFactory('small'); // papathemes-beautify

function fixADA($slick) {
    $slick.on('init afterChange', (_e, slick) => {
        const $slide = slick.$list.find('.slick-slide');
        $slide.not('.slick-active').find('a, button').attr('tabindex', '-1');
        $slide.filter('.slick-active').find('a, button').attr('tabindex', '0');
    });

    $slick.on('init', (_e, slick) => {
        slick.$list.on('keydown', event => {
            if (event.keyCode === 37 || event.keyCode === 39) {
                window.setTimeout(() => slick.$slides.filter('.slick-current').focus(), 100);
            }
            if (event.keyCode === 13) {
                slick.$slides.filter('.slick-current').find('a, button').get(0).dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
            }
        });
    });
}

export default class ImageGallery {
    constructor($gallery) {
        this.$gallery = $gallery;
        this.$mainCarousel = $gallery.find('[data-image-gallery-main]');
        this.$navCarousel = $gallery.find('[data-image-gallery-nav]').not('[data-image-gallery-nav-disable-slider]');
        this.$navDisableCarousel = $gallery.find('[data-image-gallery-nav][data-image-gallery-nav-disable-slider]');
        this.$videoPlayer = $gallery.find('[data-video-player]');

        const $defSlide = this.$mainCarousel.find('.slick-current');
        const defSlideIdx = $defSlide.parent().children().index($defSlide);

        this.defaultSlideIndex = defSlideIdx > -1 ? defSlideIdx : 0;

        const uid = _.uniqueId('');

        if (this.$mainCarousel.attr('id') === '') {
            this.$mainCarousel.attr('id', `imageGalleryMainCarousel${uid}`);
        }

        if (this.$navCarousel.attr('id') === '') {
            this.$navCarousel.attr('id', `imageGalleryNavCarousel${uid}`);
        }

        this.navRows = parseInt(this.$navCarousel.data('image-gallery-nav-rows'), 10) || 1;
        this.playVideoInline = this.$navDisableCarousel.length === 0 && this.navRows === 1;

        this.baguetteBoxOptions = {
            onChange: (currentIndex) => {
                this.stopVideo();
                this.$videoPlayer.removeClass('_bb');
                this.$gallery.removeClass('_bb');

                const playVideo = (url) => {
                    this.$gallery.addClass('_bb');
                    this.$videoPlayer.addClass('_bb');
                    this.showVideo(url);
                };

                const slick = this.$mainCarousel.slick('getSlick');
                const $a = $(slick.$slides[currentIndex]).find('[data-video-id]')
                    .clone(false)
                    .on('click', event => {
                        event.preventDefault();
                        playVideo($(event.currentTarget).data('videoUrl'));
                    });

                if ($a.length > 0) {
                    const $figure = $('#baguetteBox-slider').children().eq(currentIndex).children('figure');
                    $figure.html('').append($a);
                    playVideo($a.data('videoUrl'));
                }
            },
            afterHide: () => {
                this.stopVideo();
                this.$videoPlayer.removeClass('_bb');
                this.$gallery.removeClass('_bb');
            },
            removeVideoClickEvent: () => {
                if (this.playVideoInline) {
                    this.$mainCarousel.find('[data-video-id]').each((i, el) => {
                        const $el = $(el);
                        const $clone = $el.clone(false);
                        $el.after($clone).remove();
                    });
                }
            },
        };
    }

    stopVideo() {
        const $iframe = this.$videoPlayer.find('iframe');
        $iframe.replaceWith($iframe.clone().attr('src', ''));
        this.$videoPlayer.addClass('hide');
    }

    showVideo(src) {
        this.$videoPlayer.removeClass('hide');
        const $iframe = this.$videoPlayer.find('iframe');
        $iframe.replaceWith($iframe.clone().attr('src', src));
    }

    init() {
        this.bindEvents();
    }

    setMainImage(imgObj) {
        this.currentImage = _.clone(imgObj);

        this.swapMainImage();
    }

    setAlternateImage(imgObj) {
        if (!this.savedImage) {
            this.savedImage = _.clone(this.currentImage);
        }
        this.setMainImage(imgObj);
    }

    restoreImage() {
        if (this.savedImage) {
            this.setMainImage(this.savedImage);
            delete this.savedImage;
        }
    }

    setActiveThumb() {
        const i = this.$navCarousel.slick('slickCurrentSlide');
        this.$mainCarousel.find('.slick-slide').removeClass('slick-current slick-active').eq(i).addClass('slick-current slick-active');
    }

    swapMainImage({
        ignoreBaguetteBox = false,
    } = {}) {
        /*
        try {
            this.$mainCarousel.slick('slickGoTo', this.currentSlideIndex);
        } catch (e) {
            // ignore
        }
        */
        this.$mainCarousel.find('.slick-slide').eq(this.defaultSlideIndex).find('img').attr('src', this.currentImage.mainImageUrl);
        this.$mainCarousel.find('.slick-slide').eq(this.defaultSlideIndex).find('img').attr('srcset', this.currentImage.mainImageSrcset);
        this.$mainCarousel.find('.slick-slide').eq(this.defaultSlideIndex).find('a').attr('href', this.currentImage.zoomImageUrl);
        this.$mainCarousel.slick('slickGoTo', this.defaultSlideIndex);

        if (!ignoreBaguetteBox) {
            // empty lightbox contents of current galley so that it will be created again
            $('#baguetteBox-slider').html('');
            this.initBaguetteBox();
        }
    }

    bindEvents() {
        fixADA(this.$mainCarousel);

        this.$mainCarousel
            .on('init', () => {
                const $img = $(`[data-slick-index="${this.defaultSlideIndex}"] img`, this.$mainCarousel);
                const $a = $img.closest('a');

                this.currentImage = {
                    mainImageUrl: $a.data('originalImg') || $img.attr('src'),
                    zoomImageUrl: $a.data('originalZoom'),
                    mainImageSrcset: $a.data('originalSrcset'),
                    $selectedThumb: null,
                };
            })
            .on('beforeChange', (event, slick) => {
                // eslint-disable-next-line no-use-before-define
                onNavCarouselSetPosition(event, slick);
            })
            .on('afterChange', (event, slick) => {
                this.setActiveThumb();
                this.stopVideo();
                // eslint-disable-next-line no-use-before-define
                onNavCarouselSetPosition(event, slick);
            })
            .slick({
                slidesToShow: 1,
                slidesToScroll: 1,
                infinite: false,
                initialSlide: this.defaultSlideIndex,
                asNavFor: this.$navCarousel.length > 0 && this.navRows === 1 ? `#${this.$navCarousel.attr('id')}` : null,
                swipe: false,
                arrows: true,
                dots: false,
                responsive: [
                    {
                        breakpoint: 800,
                        settings: {
                            swipe: true,
                            swipeToSlide: false,
                        },
                    },
                    {
                        breakpoint: 550,
                        settings: {
                            arrows: false,
                            swipe: true,
                        },
                    },
                ],
            });

        const onNavCarouselSetPosition = (event, slick) => {
            if (!slick) return;
            try {
                if (slick.options.slidesToShow >= slick.slideCount) {
                    this.$navCarousel.find('.slick-track').css('transform', 'none');
                // eslint-disable-next-line no-use-before-define
                } else if (slick.slideCount <= slidesToShowDesktop) {
                    this.$navCarousel.find('.slick-track').css('transform', 'none');
                }
            } catch (e) {
                // ignore
            }
        };

        const onNavCarouselInit = () => {
            // papathemes: fix ADA
            this.$navCarousel.attr('role', 'none');
            this.$navCarousel.find('li').attr('role', 'none');

            this.$navCarousel.find('.slick-slide').on('keypress', event => {
                const keyCode = event.keyCode || event.which;
                if (keyCode === 13 || keyCode === 32) {
                    event.preventDefault();
                    this.$mainCarousel.slick('slickGoTo', $(event.target).data('slickIndex'));
                }
            });
        };

        const onNavCarouselSwipe = (_event, slick, direction) => {
            if (direction === 'right' && slick.currentSlide <= slick.options.slidesToShow) {
                slick.slickGoTo(0);
            }
        };

        fixADA(this.$navCarousel);

        this.$navCarouselClone = this.$navCarousel.clone(false);

        const navCol = parseInt(this.$navCarousel.data('image-gallery-nav-slides'), 10);

        const slidesToShowDesktop = Math.min(
            navCol,
            this.$navCarousel.children().length,
        );

        const slidesToShowMobile = Math.min(
            navCol * this.navRows,
            this.$navCarousel.children().length,
        );

        const initNavCarousel = (desktop = true) => {
            if (this.$navCarousel.is('.slick-initialized')) {
                this.$navCarousel.slick('unslick');
            }
            this.$navCarousel.before(this.$navCarouselClone);
            this.$navCarousel.remove();
            this.$navCarousel = this.$navCarouselClone;
            this.$navCarousel.on('setPosition', onNavCarouselSetPosition);
            this.$navCarousel.on('init', onNavCarouselInit);
            this.$navCarousel.on('swipe', onNavCarouselSwipe);
            this.$navCarouselClone = this.$navCarousel.clone(false);

            if (this.$navCarousel.is('[data-image-gallery-nav-horizontal]')) {
                this.fixNavCLS();

                if (desktop) {
                    this.$navCarousel
                        .slick({
                            slidesToShow: slidesToShowDesktop,
                            slidesToScroll: (this.$navCarousel.children().length > navCol && this.navRows === 1) ? 1 : slidesToShowDesktop,
                            infinite: false,
                            initialSlide: this.defaultSlideIndex,
                            asNavFor: this.navRows === 1 ? `#${this.$mainCarousel.attr('id')}` : null,
                            arrows: this.navRows !== 0,
                            dots: false,
                            focusOnSelect: true,
                            centerPadding: 0,
                            rows: this.$navCarousel.children().length > navCol ? this.navRows : 1,
                            adaptiveHeight: true,
                            // variableWidth: true,
                            lazyLoad: 'progressive',
                        });
                } else {
                    this.$navCarousel
                        .slick({
                            slidesToShow: slidesToShowMobile,
                            slidesToScroll: 1,
                            infinite: false,
                            initialSlide: this.defaultSlideIndex,
                            asNavFor: this.navRows === 1 ? `#${this.$mainCarousel.attr('id')}` : null,
                            arrows: true,
                            dots: false,
                            focusOnSelect: true,
                            centerPadding: 0,
                            adaptiveHeight: true,
                            // variableWidth: true,
                            lazyLoad: 'progressive',
                        });
                }
            } else {
                // eslint-disable-next-line no-lonely-if
                if (desktop) {
                    this.$navCarousel
                        .slick({
                            slidesToShow: slidesToShowDesktop,
                            slidesToScroll: (this.$navCarousel.children().length > navCol && this.navRows === 1) ? 1 : slidesToShowDesktop,
                            infinite: false,
                            initialSlide: this.defaultSlideIndex,
                            asNavFor: this.navRows === 1 ? `#${this.$mainCarousel.attr('id')}` : null,
                            arrows: this.navRows !== 0,
                            dots: false,
                            vertical: this.navRows === 1,
                            verticalSwiping: this.navRows === 1,
                            focusOnSelect: this.navRows === 1,
                            centerPadding: 0,
                            rows: this.$navCarousel.children().length > navCol ? this.navRows : 1,
                            adaptiveHeight: true,
                            lazyLoad: 'progressive',
                        });
                } else {
                    this.$navCarousel
                        .slick({
                            slidesToShow: slidesToShowMobile,
                            slidesToScroll: 1,
                            infinite: false,
                            initialSlide: this.defaultSlideIndex,
                            asNavFor: this.navRows === 1 ? `#${this.$mainCarousel.attr('id')}` : null,
                            arrows: this.navRows !== 0,
                            vertical: true,
                            verticalSwiping: true,
                            focusOnSelect: this.navRows === 1,
                            centerPadding: 0,
                            adaptiveHeight: true,
                            lazyLoad: 'progressive',
                        });
                }
            }

            this.$navCarousel.each((i, el) => baguetteBox.run(`#${el.id}`, { ...this.baguetteBoxOptions }));
        };

        initNavCarousel(smallMediaQuery.matches);

        smallMediaQuery.addListener(() => {
            initNavCarousel(smallMediaQuery.matches);
        });

        this.initBaguetteBox();

        //
        // play video inline if not disable nav carousel is enabled and nav rows = 1
        //
        if (this.playVideoInline) {
            const onVideoClick = (event) => {
                event.preventDefault();
                this.showVideo($(event.currentTarget).data('videoUrl'));
            };
            this.$mainCarousel.on('click', '[data-video-id]', onVideoClick);
        }
    }

    initBaguetteBox() {
        baguetteBox.run(`#${this.$mainCarousel.attr('id')}`, { ...this.baguetteBoxOptions });
        this.$navDisableCarousel.each((i, el) => baguetteBox.run(`#${el.id}`, { ...this.baguetteBoxOptions }));

        if (this.navRows > 1) {
            this.$navCarousel.each((i, el) => baguetteBox.run(`#${el.id}`, { ...this.baguetteBoxOptions }));
        }

        this.baguetteBoxOptions.removeVideoClickEvent();
    }

    // Fix CLS issue for nav carousel
    fixNavCLS() {
        this.$navCarousel.css('height', this.$navCarousel.outerHeight());
        $(window).one('resize', () => this.$navCarousel.css('height', ''));

        if (!this.fixedNavHeightFirstLoad) {
            this.$navCarousel.css('height', this.$navCarousel.outerHeight());
            this.fixedNavHeightFirstLoad = true;
        }
    }
}
