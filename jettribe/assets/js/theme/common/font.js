const WebFont = require('webfontloader');

const linkEl = document.querySelector('link[href*="https://fonts.googleapis.com/css"]');
const fontUrl = linkEl.getAttribute('href');
const regexFontsCollection = /family=([^&]*)/gm;

try {
    const families = regexFontsCollection.exec(fontUrl)[1].replace(/\+/gm, ' ').split('|');

    WebFont.load({
        custom: {
            families,
        },
        classes: false,
    });
} catch (e) {
    // eslint-disable-next-line no-console
    console.warn('No Google font loaded! The "webfont-body-font" may be missing the "google_" prefix.');
}
