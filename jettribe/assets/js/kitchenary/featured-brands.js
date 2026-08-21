export default function initPopularBrands(context) {
    // Get all brands with limited array
    // eslint-disable-next-line no-shadow
    async function fetchPopularBrands(context, brandWidth, brandHeight, arrLimited) {
        let arrResultBrand = [];
        if (arrLimited.length > 0) {
            for (let i = 0; i < arrLimited.length; i++) {
                if (arrLimited[i].length > 0) {
                    let hasNextPageBrand = false;
                    let cursorBrand = '';
                    let resultBrand = [];
                    let pageInfoBrand = [];
                    do {
                        const respond = await $.ajax({
                            url: '/graphql',
                            method: 'POST',
                            data: JSON.stringify({
                                query: `
                                query ($imgWidth: Int!, $imgHeight: Int!, $cursorBrand: String) {
                                    site {
                                        brands (first: 50, after: $cursorBrand, entityIds: [${arrLimited[i].join(',')}]) {
                                            edges {
                                                node {
                                                    entityId,
                                                    defaultImage {
                                                        url (width: $imgWidth, height: $imgHeight)
                                                    }
                                                }
                                            },
                                            pageInfo {
                                                endCursor,
                                                hasNextPage
                                            }
                                        }
                                    }
                                }
                                `,
                                variables: {
                                    imgWidth: brandWidth,
                                    imgHeight: brandHeight,
                                    cursorBrand: cursorBrand && cursorBrand !== '' ? cursorBrand : '',
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
                        pageInfoBrand = respond?.data?.site?.brands?.pageInfo || [];
                        hasNextPageBrand = pageInfoBrand.hasNextPage;
                        cursorBrand = pageInfoBrand.endCursor;
                        resultBrand = [...resultBrand, ...respond?.data?.site?.brands?.edges] || [];
                    } while (hasNextPageBrand === true);
                    arrResultBrand = [...arrResultBrand, ...resultBrand];
                }
            }
        }
        return arrResultBrand;
    }
    // Split Array Limit
    function addToLimitedArr(arr, limit) {
        const result = arr.reduce((arrResult, item, index) => {
            const chuckIndex = Math.floor(index / limit);
            if (!arrResult[chuckIndex]) {
                // eslint-disable-next-line no-param-reassign
                arrResult[chuckIndex] = [];
            }
            arrResult[chuckIndex].push(item);
            return arrResult;
        }, []);

        return result;
    }

    const $brandScope = $('#dinosaur__featuredBrands');
    const brandId = $('._brand-img-wrapper', $brandScope);
    const arrBrandId = [];
    brandId.map((index, item) => arrBrandId.push($(item).data('brand-id')));
    const arrLimited = addToLimitedArr(arrBrandId, 50);
    const brandSize = context.brand_size.split('x');
    const brandWidth = Number(brandSize[0]) || 223;
    const brandHeight = Number(brandSize[1]) || 100;
    fetchPopularBrands(context, brandWidth, brandHeight, arrLimited).then(data => {
        const infoBrand = brandId.toArray();
        data.forEach(item => {
            infoBrand.forEach(element => {
                const idBrand = element.dataset.brandId;
                const idBrandNumber = parseInt(idBrand, 10);
                const itemImage = item.node.defaultImage;
                if (itemImage !== null) {
                    const itemLink = item.node.entityId;
                    if (itemLink === idBrandNumber) {
                        const getItemImage = itemImage.url;
                        $(element).find('._brand-logo').attr('src', getItemImage).css('display', 'block');
                        $(element).find('._brand-text').css('display', 'none');
                    }
                }
            });
        });
    });
}

