import BlazeSlider from 'blaze-slider';

export default function () {
    document.querySelectorAll('[data-blaze-slider]').forEach((el) => {
        $(el).data('blazeSliderInstance', new BlazeSlider(el, $(el).data('blazeSlider'))); // eslint-disable-line no-new
    });

    // Supermarket theme MOD: doesn't need below script
    // // Alternative image styling for IE, which doesn't support objectfit
    // if (typeof document.documentElement.style.objectFit === 'undefined') {
    //     $('.heroCarousel-slide').each((index, element) => {
    //         const $container = $(element);
    //         const imgUrl = $container.find('img').data('lazy');

    //         if (imgUrl) {
    //             $container.css('backgroundImage', `url(${imgUrl})`).addClass('compat-object-fit');
    //         }
    //     });
    // }
}
