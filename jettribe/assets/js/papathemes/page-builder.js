export default function (context) {
    let $button;
    let lastEditMode = false;
    const $productViewPriceSaveContent = $('.productView-price-below-content');

    const setEditMode = ({ editMode }) => {
        if (editMode) {
            if (lastEditMode) {
                $('body').addClass('editing-menu-widgets');
            } else {
                $('body').removeClass('editing-menu-widgets');
            }

            if (!$button) {
                $button = $('<button class="button button--primary editing-menu-widgets-button">Edit Menu Widgets</button>')
                    .css({
                        position: 'fixed',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        boxShadow: '0 5px 20px rgba(0,0,0,0.15)',
                        zIndex: 110,
                        animation: 'editing-menu-button-pulse 1.5s infinite',
                    })
                    .each((i, el) => el.style.setProperty('pointer-events', 'auto', 'important'))
                    .on('click', () => {
                        $('body').toggleClass('editing-menu-widgets');
                        lastEditMode = $('body').hasClass('editing-menu-widgets');
                        // if (lastEditMode) {
                        //     window.postMessage(JSON.stringify({ action: 'toggle-editor-mode', editMode: true, initiator: 'PAGE_BUILDER' }), '*');
                        // }
                    })
                    .appendTo('body');
                $(`<style>
                @keyframes editing-menu-button-pulse {
                    0% {
                        box-shadow: 0 5px 20px 0 rgba(0, 0, 0,0.15);
                    }
                    70% {
                        box-shadow: 0 5px 20px 10px rgba(161, 49, 237, .5);
                    }
                    100% {
                        box-shadow: 0 5px 20px 0 rgba(0, 0, 0,0.15);
                    }
                }
                @media (max-width: 800px) {
                    .editing-menu-widgets-button {
                        display: none;
                    }
                }
                </style>`).appendTo('head');
            } else {
                $button.show();
            }
            if (context.pageType === 'product') {
                $productViewPriceSaveContent.addClass('is-open');
            }
        } else if ($button) {
            $('body').removeClass('editing-menu-widgets');
            $button.hide();
            $productViewPriceSaveContent.removeClass('is-open');
        }
    };

    window.addEventListener('message', event => {
        try {
            const data = JSON.parse(event.data);
            if (data.action === 'toggle-edit-mode' && data.initiator === 'PAGE_BUILDER') {
                setEditMode(data);
            }
        } catch (error) {
            // do nothing
        }
    });

    if (context?.isDevelopment) {
        setEditMode({ editMode: true });
    }
}
