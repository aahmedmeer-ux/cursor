import PageManager from '../page-manager';
import nod from '../theme/common/nod';
import forms from '../theme/common/models/forms';

export default class AskQuestion extends PageManager {
    onReady() {
        this.registerContactFormValidation();
        this.populateProductDetails();
    }

    registerContactFormValidation() {
        const formSelector = 'form[data-ask-question-form]';
        const askQuestionValidator = nod({
            submit: `${formSelector} input[type="submit"]`,
        });
        const $contactForm = $(formSelector);

        const pack = $contactForm.data('translationPack');

        askQuestionValidator.add([
            {
                selector: `${formSelector} input[name="contact_email"]`,
                validate: (cb, val) => {
                    const result = forms.email(val);

                    cb(result);
                },
                errorMessage: pack?.translations['forms.validate.contact.email_address'] || this.context.contactEmail || 'Please enter a valid email address',
            },
            {
                selector: `${formSelector} textarea[name="contact_question"]`,
                validate: (cb, val) => {
                    const result = forms.notEmpty(val);

                    cb(result);
                },
                errorMessage: pack?.translations['forms.validate.contact.question'] || this.context.contactQuestion || 'Please enter a question',
            },
        ]);

        $contactForm.off('submit').on('submit', event => {
            askQuestionValidator.performCheck();

            if (askQuestionValidator.areAll('valid')) {
                return;
            }

            event.preventDefault();
        });
    }

    populateProductDetails() {
        const $form = $('form[data-ask-question-form]');

        if ($form.length === 0) return;

        const $productOptions = $('.productView').find('[data-product-option-change]').first();

        const selections = $productOptions.find('[data-product-attribute]').get()
            .map(el => {
                const $el = $(el);
                const attr = $el.data('productAttribute');
                let label = $el.find('.form-label').first().text();
                let value = '';

                if (attr === 'swatch') {
                    value = $el.find('input:checked').data('productAttributeLabel');
                } else if (attr === 'set-rectangle' || attr === 'set-radio' || attr === 'product-list' || attr === 'input-checkbox') {
                    const id = $el.find('input:checked').attr('id');
                    if (id) {
                        value = $el.find(`label[for="${id}"]`).text();
                    }
                } else if (attr === 'set-select') {
                    value = $el.find('select option[value!=""]:selected').text();
                } else if (attr === 'input-text' || attr === 'input-number') {
                    value = $el.find('input').val();
                } else if (attr === 'input-date') {
                    value = $el.find('select option:selected').get().map(option => option.value).join(' ');
                } else if (attr === 'textarea') {
                    value = $el.find('textarea').val();
                }

                // regex remove all line breaks and multiple spaces
                label = label.replace(/(\r\n|\n|\r)/gm, '').replace(/\s+/g, ' ').replace(/\:\s\*\s\w+/, '').replace(/\:/, '').trim();
                value = (value || '').replace(/(\r\n|\n|\r)/gm, '').replace(/\s+/g, ' ').trim();


                return { label, value };
            })
            .filter(({ value }) => value);

        let content = '\n\n';

        content += '----------------------------------------\n';
        content += `Product name: ${$('.productView-title').text().trim()}\n`;
        content += `Product link: ${this.context.productUrl}\n`;

        if (selections.length > 0) {
            content += 'Product options:\n';
            content += selections.map(({ label, value }) => `- ${label}: ${value}`).join('\n').concat('\n');
        }

        $form.find('[name="contact_question"]').val(content);
    }
}
