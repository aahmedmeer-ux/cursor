import utils from '@bigcommerce/stencil-utils';
import { debounce } from 'lodash';
import MicroModal from 'micromodal';

export default function initBlogPostModal(context) {
    // Fetch list widget by Blog ID
    async function fetchWidgetByBlogId(blogId) {
        if (!blogId) return [];
        const resp = await $.ajax({
            url: '/graphql',
            method: 'POST',
            data: JSON.stringify({
                query: `
                    query {
                        site {
                            content {
                                renderedRegionsByPageTypeAndEntityId(entityPageType: BLOG_POST, entityId: ${blogId}) {
                                    regions {
                                        name
                                        html
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    blogId,
                },
            }),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${context.graphQLToken}`,
            },
            xhrFields: {
                withCredentials: true,
            },
        });
        const listRegion = resp?.data?.site?.content?.renderedRegionsByPageTypeAndEntityId?.regions;

        const blogRegion = [];

        $.each(listRegion, (i, el) => {
            if (el.name === 'blog_post_content--global'
              || el.name === 'blog_post_content'
              || el.name === 'blog_post_body'
              || el.name === 'blog_post_content_right') {
                blogRegion.push(el);
            }
        });
        return blogRegion;
    }

    MicroModal.init({
        disableScroll: true,
        openTrigger: 'data-micromodal-trigger',
        closeTrigger: 'data-micromodal-close',
    });

    // Handle create, load content Modal
    $('body').on('click', '.kitchenary__shoppingGuideBlog [data-micromodal-trigger]', (event) => {
        event.preventDefault();
        const $el = $(event.currentTarget);
        const url = $el.data('link');
        const template = $el.data('template');
        const $modal = $('#blogPostModal');
        const $modalContent = $modal.find('.modal__body');
        $modal.addClass('_loading');

        utils.api.getPage(url, { template }, (err, resp) => {
            $modalContent.html(resp);
            const blogId = $('.modal-blogPost').data('blog-id');
            const fetchWidget = fetchWidgetByBlogId(blogId);

            fetchWidget.then(data => {
                $.each(data, (i, el) => {
                    $(`[data-content-region="${el.name}"]`).html(el.html);
                });
                $modal.removeClass('_loading');
            });
        });
    });

    // Handle show more button
    function domChanged() {
        $('#blogPostModal .blog-post-body .blog-post').not('._hideReadMore').addClass('_hideReadMore').each((i, el) => {
            const $el = $(el);
            const text = $el.find('.blog-post-summary');
            const button = $el.find('.blog-post-more');
            const content = text.text();
            const html = text.html();
            const shortContent = `${content.substring(0, 400)}...`;

            if (content.length > 400) {
                text.html(shortContent);
                button.show();
            } else {
                button.hide();
            }

            button.on('click', () => {
                if (button.text() === 'Show more') {
                    text.html(html);
                    button.text('Show less');
                } else {
                    text.html(shortContent);
                    button.text('Show more');
                }
            });
        });
    }

    const mo = new MutationObserver(debounce(() => domChanged(), 300));
    mo.observe(document.body, { childList: true, subtree: true });
    domChanged();
}
