import nod from '../theme/common/nod';
import forms from '../theme/common/models/forms';

const PLUGIN_KEY = 'login-form';

export class LoginForm {
    constructor($form, context) {
        this.context = context;

        if ($form.length) {
            this.registerLoginValidation($form);
        }
    }

    registerLoginValidation($loginForm) {
        const loginModel = forms;

        this.loginValidator = nod({
            submit: $('input[type="text"]', $loginForm),
        });

        this.loginValidator.add([
            {
                selector: $('input[name="login_email"]', $loginForm),
                validate: (cb, val) => {
                    const result = loginModel.email(val);

                    cb(result);
                },
                errorMessage: this.context.useValidEmail,
            },
            {
                selector: $('input[name="login_pass"]', $loginForm),
                validate: (cb, val) => {
                    const result = loginModel.password(val);

                    cb(result);
                },
                errorMessage: this.context.enterPass,
            },
        ]);

        $loginForm.on('submit', event => {
            this.loginValidator.performCheck();

            if (this.loginValidator.areAll('valid')) {
                return;
            }

            event.preventDefault();
        });
    }
}

export default function loginForm(context, selector = `[data-${PLUGIN_KEY}]`, options = {}) {
    const $elements = $(selector, options.$context);
    const instanceKey = `${PLUGIN_KEY}Instance`;

    return $elements.map((index, element) => {
        const $element = $(element);
        const cachedInstance = $element.data(instanceKey);

        if (cachedInstance instanceof LoginForm) {
            return cachedInstance;
        }

        const instance = new LoginForm($element, context);

        $element.data(instanceKey, instance);

        return instance;
    }).toArray();
}
