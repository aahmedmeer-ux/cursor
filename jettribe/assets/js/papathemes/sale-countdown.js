/**
 * Parses an ISO date-time string and extracts the components.
 *
 * @param {string} str - The date-time string to parse.
 * @returns {Object|null} An object containing the extracted components, or `null` if the format is invalid.
 */
export function parseDateTimeString(str) {
    const regex = /^\s*(?:(?:(\d{4})-(\d{2})-(\d{2}))|(?:(\d{2})-(\d{2})))?(?:[T\s])?(?:(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?|(\d{2}):(\d{2})|(\d{2}))?\s*(?:Z|([+-])(\d{1,2})(?::?(\d{2}))?)?\s*$/;

    const match = str.trim().match(regex);
    if (!match) {
        return null; // Invalid format
    }

    const [
        ,
        year, month, day, // [1], [2], [3]
        shortMonth, shortDay, // [4], [5]
        hour, minute, second, // [6], [7], [8]
        shortHour, shortMinute, // [9], [10]
        singleTimeComponent, // [11]
        tzSign, tzHourOffset, tzMinuteOffset, // [12], [13], [14]
    ] = match;

    const result = {};

    // Date components
    if (year && month && day) {
        result.year = parseInt(year, 10);
        result.month = parseInt(month, 10);
        result.day = parseInt(day, 10);
    } else if (shortMonth && shortDay) {
        result.month = parseInt(shortMonth, 10);
        result.day = parseInt(shortDay, 10);
    }

    // Time components
    if (hour !== undefined && minute !== undefined) {
        result.hour = parseInt(hour, 10);
        result.minute = parseInt(minute, 10);
        if (second !== undefined) {
            result.second = parseInt(second, 10);
        }
    } else if (shortHour !== undefined && shortMinute !== undefined) {
        result.hour = parseInt(shortHour, 10);
        result.minute = parseInt(shortMinute, 10);
    } else if (singleTimeComponent !== undefined) {
        result.hour = parseInt(singleTimeComponent, 10);
    }

    // Timezone
    if (tzSign && tzHourOffset) {
        const sign = tzSign === '+' ? 1 : -1;
        const tzHour = parseInt(tzHourOffset, 10);
        const tzMinute = tzMinuteOffset ? parseInt(tzMinuteOffset, 10) : 0;
        result.timezone = sign * (tzHour + tzMinute / 60);
    } else if (str.includes('Z')) {
        result.timezone = 0;
    }

    return result;
}

/**
 * Converts a date-time string into a Date object adjusted for countdown purposes.
 *
 * - If the date-time string does not include a year, month, or day, it is treated as a daily countdown.
 *   The function will set the date to today or roll over to the next day if the time has already passed.
 * - If the date-time string does not include an hour, minute, or second, they default to 0.
 * - The function adjusts for the specified timezone offset.
 *
 * @param {string} str - The date-time string to parse.
 * @returns {Date|undefined} A Date object used for the countdown, or `undefined` if parsing fails.
 */
export function parseCountdownDate(str) {
    const parsedDate = parseDateTimeString(str);
    if (!parsedDate) return;

    // eslint-disable-next-line object-curly-newline
    const { year, month, day, hour, minute, second, timezone } = parsedDate;

    const date = new Date();

    if (year) date.setFullYear(year);
    if (month) date.setMonth(month - 1);
    if (day) date.setDate(day);
    date.setHours(hour || 0);
    date.setMinutes(minute || 0);
    date.setSeconds(second || 0);

    // change timezone to UTC
    date.setHours(date.getHours() - date.getTimezoneOffset() / 60);

    // Adjust for timezone
    if (timezone) {
        date.setHours(date.getHours() - timezone);
    }

    if (!year && !month && !day) {
        // for daily countdown, add 1 day if date is in the past
        if (date < new Date()) {
            date.setDate(date.getDate() + 1);
        }
    }

    return date;
}

/**
 * **SaleCountdown Singleton Object**
 *
 * Manages countdown timers for sales or promotional events on your website.
 * It handles multiple countdown elements, updates them in real-time, and manages visibility based on the viewport.
 *
 * ---
 *
 * **Usage:**
 *
 * **1. Configure the Countdown (Optional):**
 *
 * ```javascript
 * SaleCountdown.configure({
 *   // Optional settings
 *   dateDataName: 'saleCountdownDate',       // Data attribute for countdown date
 *   inViewportDataName: 'saleCountdownInViewport', // Data attribute for viewport visibility
 *   selectors: { ... },
 *   template: '...',                         // Custom HTML template for the countdown
 *   hideClass: '_hide',                      // Class to hide elements
 *   saleEndClass: '_saleEnded',              // Class when sale ends
 *   activeClass: '_active',                  // Class when countdown is active
 *   translations: {
 *     end_in: 'Ends in',
 *     day: 'Day',
 *     days: 'Days',
 *     hour: 'Hour',
 *     hours: 'Hours',
 *     minute: 'Minute',
 *     minutes: 'Minutes',
 *     second: 'Second',
 *     seconds: 'Seconds',
 *   },
 *   txtSaleCountdownJSON: '{ "translations": { ... } }', // JSON string for translations
 * });
 * ```
 *
 * **2. Add Countdown Elements:**
 *
 * - **Option 1:** Directly specify the date when adding the element.
 *
 *   ```javascript
 *   const $el = $('#countdown-element');
 *   const date = new Date('2023-12-31T23:59:59');
 *   SaleCountdown.add($el, date);
 *   ```
 *
 * - **Option 2:** Set data attributes on the element and add it.
 *
 *   ```javascript
 *   const $el = $('#countdown-element');
 *   $el.data('saleCountdownDate', '2023-12-31T23:59:59');
 *   $el.data('saleCountdownTranslations', { end_in: 'Ends in', ... });
 *   SaleCountdown.add($el);
 *   ```
 *
 * ---
 *
 * **Notes:**
 *
 * - The countdown automatically updates visible elements in the viewport.
 * - Supports customization through configuration and data attributes.
 * - Handles automatic stopping when no elements remain.
 *
 * ---
 *
 * **Example:**
 *
 * ```javascript
 * // Initialize and configure
 * SaleCountdown.configure({
 *   translations: {
 *     end_in: 'Sale ends in',
 *     // Other translations...
 *   },
 * });
 *
 * // Add countdown element
 * const $countdown = $('#countdown');
 * const endDate = new Date('2023-12-31T23:59:59');
 * SaleCountdown.add($countdown, endDate);
 * ```
 */

const SaleCountdown = {
    /**
     * Collection of countdown elements
     * @type {Set<Element>}
     * @private
     */
    elements: new Set(),

    /**
     * Timer interval ID
     * @type {number|null}
     * @private
     */
    timer: null,

    /**
     * IntersectionObserver instance
     * @type {IntersectionObserver|null}
     * @private
     */
    observer: null,

    /**
    * Data attribute name for countdown date
    * @type {string}
    * @private
    */
    dateDataName: 'saleCountdownDate',

    /**
     * Data attribute name for in viewport visibility
     * @type {string}
     * @private
     */
    inViewportDataName: 'saleCountdownInViewport',

    /**
     * Data attribute name for translations JSON
     * @type {string}
     * @private
     */
    translationsDataName: 'saleCountdownTranslations',

    /**
     * Selectors for countdown elements
     * @type {{endLabel: string, day: string, dayValue: string, dayLabel: string, hour: string, hourValue: string, hourLabel: string, minute: string, minuteValue: string, minuteLabel: string, second: string, secondValue: string, secondLabel: string}}
     */
    selectors: {
        endLabel: '[data-sale-countdown-end-label]',
        day: '[data-sale-countdown-day]',
        dayValue: '[data-sale-countdown-day-value]',
        dayLabel: '[data-sale-countdown-day-label]',
        hour: '[data-sale-countdown-hour]',
        hourValue: '[data-sale-countdown-hour-value]',
        hourLabel: '[data-sale-countdown-hour-label]',
        minute: '[data-sale-countdown-minute]',
        minuteValue: '[data-sale-countdown-minute-value]',
        minuteLabel: '[data-sale-countdown-minute-label]',
        second: '[data-sale-countdown-second]',
        secondValue: '[data-sale-countdown-second-value]',
        secondLabel: '[data-sale-countdown-second-label]',
    },

    /**
     * Template for countdown elements
     * @type {string}
     * @private
     */
    template: `
        <svg class="icon"><use href="#icon-flash"></use></svg>
        <span class="_end" data-sale-countdown-end-label></span>
        <span class="_day" data-sale-countdown-day><span class="_value" data-sale-countdown-day-value></span><span class="_label" data-sale-countdown-day-label></span></span>
        <span class="_hour" data-sale-countdown-hour><span class="_value" data-sale-countdown-hour-value></span><span class="_label" data-sale-countdown-hour-label></span></span>
        <span class="_minute" data-sale-countdown-minute><span class="_value" data-sale-countdown-minute-value></span><span class="_label" data-sale-countdown-minute-label></span></span>
        <span class="_second" data-sale-countdown-second><span class="_value" data-sale-countdown-second-value></span><span class="_label" data-sale-countdown-second-label></span></span>
    `,

    /**
     * Class name to hide elements
     * @type {string}
     * @private
     */
    hideClass: '_hide',

    /**
     * Class name to indicate sale has ended
     * @type {string}
     * @private
     */
    saleEndClass: '_saleEnded',

    /**
     * Class name to indicate active countdown
     * @type {string}
     * @private
     */
    activeClass: '_active',

    /**
     * Translations for countdown labels
     * @type {{end_in: string, day: string, days: string, hour: string, hours: string, minute: string, minutes: string, second: string, seconds: string}}
     * @private
     */
    translations: {
        end_in: 'End in',
        day: 'Day',
        days: 'Days',
        hour: 'Hour',
        hours: 'Hours',
        minute: 'Minute',
        minutes: 'Minutes',
        second: 'Second',
        seconds: 'Seconds',
    },

    /**
     * Configure the countdown settings
     * @public
     * @param {Object} options
     * @param {string} options.dateDataName - Data attribute name for countdown date
     * @param {string} options.inViewportDataName - Data attribute name for in viewport visibility
     * @param {Object} options.selectors - Selectors for countdown elements
     * @param {string} options.selectors.endLabel
     * @param {string} options.selectors.day
     * @param {string} options.selectors.dayValue
     * @param {string} options.selectors.dayLabel
     * @param {string} options.selectors.hour
     * @param {string} options.selectors.hourValue
     * @param {string} options.selectors.hourLabel
     * @param {string} options.selectors.minute
     * @param {string} options.selectors.minuteValue
     * @param {string} options.selectors.minuteLabel
     * @param {string} options.selectors.second
     * @param {string} options.selectors.secondValue
     * @param {string} options.selectors.secondLabel
     * @param {string} options.template - Template for countdown elements
     * @param {string} options.hideClass - Class name to hide elements
     * @param {string} options.saleEndClass - Class name to indicate sale has ended
     * @param {string} options.activeClass - Class name to indicate active countdown
     * @param {Object} options.translations - Translations for countdown labels
     * @param {string} options.translations.end_in
     * @param {string} options.translations.day
     * @param {string} options.translations.days
     * @param {string} options.translations.hour
     * @param {string} options.translations.hours
     * @param {string} options.translations.minute
     * @param {string} options.translations.minutes
     * @param {string} options.translations.second
     * @param {string} options.translations.seconds
     * @param {string} options.txtSaleCountdownJSON - JSON string for translations
     */
    configure({
        dateDataName,
        inViewportDataName,
        selectors,
        template,
        hideClass,
        saleEndClass,
        activeClass,
        translations,
        txtSaleCountdownJSON,
    } = {}) {
        if (dateDataName) {
            this.dateDataName = dateDataName;
        }

        if (inViewportDataName) {
            this.inViewportDataName = inViewportDataName;
        }

        if (selectors) {
            this.selectors = { ...this.selectors, ...selectors };
        }

        if (template) {
            this.template = template;
        }

        if (hideClass) {
            this.hideClass = hideClass;
        }

        if (saleEndClass) {
            this.saleEndClass = saleEndClass;
        }

        if (activeClass) {
            this.activeClass = activeClass;
        }

        if (translations) {
            this.translations = { ...this.translations, ...translations };
        }

        if (txtSaleCountdownJSON) {
            try {
                const json = JSON.parse(txtSaleCountdownJSON);
                const trans = Object.keys(json.translations).reduce((_trans, key) => {
                    const shortKey = key.split('.').pop();
                    // eslint-disable-next-line no-param-reassign
                    _trans[shortKey] = json.translations[key];
                    return _trans;
                }, {});

                this.translations = { ...this.translations, ...trans };
            } catch (error) {
                // do nothing
            }
        }
    },

    /**
     * Add the element & corresponding date to the countdown collection
     * @public
     * @param {jQuery} $el
     * @param {Date|null} date - The countdown date. If not provided, it will be extracted from the data attribute `data-sale-countdown-date`
     */
    add($el, date = null) {
        let validDate = date || $el.data(this.dateDataName);
        if (validDate && typeof validDate === 'string') validDate = parseCountdownDate(validDate);
        if (!validDate) return;
        $el.data(this.dateDataName, validDate).html(this.template)
            .get().forEach(el => this.elements.add(el));
        this.observe($el);
        this.start();
    },

    /**
     * Observe the element for in viewport visibility check
     * @param {jQuery} $el
     * @private
     */
    observe($el) {
        if (!window.IntersectionObserver) {
            // assume element is in viewport if IntersectionObserver is not supported
            $el.data(this.inViewportDataName, true);
            return;
        } else if (!this.observer) {
            // create IntersectionObserver instance if not already created
            this.observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    $(entry.target).data(this.inViewportDataName, entry.isIntersecting);
                    // console.log('isIntersecting', entry.target, entry.isIntersecting);
                });
            }, {
                root: null, // Defaults to viewport
                threshold: 0, // Callback is triggered when any part of the element is visible
            });
        }

        $el.get().forEach(el => this.observer.observe(el));
    },

    /**
     * Stop observing the element
     * @param {Element} el
     * @private
     */
    unobserve(el) {
        if (this.observer) {
            this.observer.unobserve(el);
            // console.log('unobserve', el);
        }
    },

    /**
     * Check if the element is in viewport and visible
     * @param {jQuery} $el
     * @returns {boolean}
     * @private
     */
    isVisibleInViewport($el) {
        return $el.data(this.inViewportDataName) && $el.is(':visible');
    },

    /**
     * start running countdown every second
     * @public
     */
    start() {
        if (!this.timer && this.elements.size > 0) {
            this.run();
            this.timer = setInterval(() => this.run(), 1000);
        }
    },

    /**
     * stop countdown
     * @public
     */
    stop() {
        clearInterval(this.timer);
        this.timer = null;
        this.observer.disconnect();
        this.observer = null;
        // console.log('stop countdown');
    },

    /**
     * running countdown process
     * @private
     */
    run() {
        this.elements.forEach(el => {
            // check and stop if element no longer exists in DOM
            if (!document.body.contains(el)) {
                this.elements.delete(el);
                this.unobserve(el);
                return;
            }

            const $el = $(el);
            const date = $el.data(this.dateDataName);

            // stop countdown if element is not in viewport or not visible
            if (!date || !this.isVisibleInViewport($el)) {
                return;
            }

            const now = new Date();

            if (date <= now) {
                // Count down date has passed
                $el.addClass(this.saleEndClass);
                this.elements.delete(el);
                this.unobserve(el);
                return;
            }

            // Calculate the remaining time (days, hours, minutes, seconds)
            const diff = date - now;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const $endLabel = $el.find(this.selectors.endLabel);
            const $day = $el.find(this.selectors.day);
            const $dayValue = $el.find(this.selectors.dayValue);
            const $dayLabel = $el.find(this.selectors.dayLabel);
            const $hour = $el.find(this.selectors.hour);
            const $hourValue = $el.find(this.selectors.hourValue);
            const $hourLabel = $el.find(this.selectors.hourLabel);
            const $minute = $el.find(this.selectors.minute);
            const $minuteValue = $el.find(this.selectors.minuteValue);
            const $minuteLabel = $el.find(this.selectors.minuteLabel);
            const $second = $el.find(this.selectors.second);
            const $secondValue = $el.find(this.selectors.secondValue);
            const $secondLabel = $el.find(this.selectors.secondLabel);

            const translations = { ...this.translations, ...$el.data(this.translationsDataName) };

            $el.addClass(this.activeClass);
            $endLabel.html(translations.end_in);
            $dayValue.text(days);
            $dayLabel.html(days === 1 ? translations.day : translations.days);
            $day.toggleClass(this.hideClass, days === 0);
            $hourValue.text(hours);
            $hourLabel.html(hours === 1 ? translations.hour : translations.hours);
            $hour.toggleClass(this.hideClass, days === 0 && hours === 0);
            $minuteValue.text(minutes);
            $minuteLabel.html(minutes === 1 ? translations.minute : translations.minutes);
            $minute.toggleClass(this.hideClass, days === 0 && hours === 0 && minutes === 0);
            $secondValue.text(seconds);
            $secondLabel.html(seconds === 1 ? translations.second : translations.seconds);
            $second.toggleClass(this.hideClass, days === 0 && hours === 0 && minutes === 0 && seconds === 0);
        });

        if (this.elements.size === 0) {
            this.stop();
        }
    },
};

export default SaleCountdown;
