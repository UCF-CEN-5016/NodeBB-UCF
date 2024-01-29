import qs from 'querystring';
import _ from 'lodash';

const pagination = module.exports;

pagination.create = function (currentPage: number, pageCount: number, queryObj: qs.ParsedUrlQueryInput) {
    if (pageCount <= 1) {
        return {
            prev: { page: 1, active: currentPage > 1 },
            next: { page: 1, active: currentPage < pageCount },
            first: { page: 1, active: currentPage === 1 },
            last: { page: 1, active: currentPage === pageCount },
            rel: [],
            pages: [],
            currentPage: 1,
            pageCount: 1,
        };
    }
    pageCount = parseInt(pageCount.toString(), 10);
    let pagesToShow = [1, 2, pageCount - 1, pageCount];

    currentPage = parseInt(currentPage.toString(), 10) || 1;
    const previous = Math.max(1, currentPage - 1);
    const next = Math.min(pageCount, currentPage + 1);

    let startPage = Math.max(1, currentPage - 2);
    if (startPage > pageCount - 5) {
        startPage -= 2 - (pageCount - currentPage);
    }
    let i: number;
    for (i = 0; i < 5; i += 1) {
        pagesToShow.push(startPage + i);
    }

    pagesToShow = _.uniq(pagesToShow).filter(page => page > 0 && page <= pageCount).sort((a, b) => a - b);

    queryObj = { ...(queryObj || {}) };

    delete queryObj._;

    const pages : {
        page: number;
        active: boolean;
        qs: string;
        separator?: boolean;
    }[] = pagesToShow.map((page) => {
        queryObj.page = page;
        return { page: page, active: page === currentPage, qs: qs.stringify(queryObj), separator: false };
    });

    for (i = pages.length - 1; i > 0; i -= 1) {
        if (pages[i].page - 2 === pages[i - 1].page) {
            pages.splice(
                i,
                0,
                { page: pages[i].page - 1, active: false, qs: qs.stringify(queryObj), separator: false }
            );
        } else if (pages[i].page - 1 !== pages[i - 1].page) {
            pages.splice(i, 0, {
                separator: true,
                page: pages[i].page,
                active: pages[i].active,
                qs: pages[i].qs,
            });
        }
    }

    const data: {
        rel: any[];
        prev: {
            page: number;
            active: boolean;
            qs: string;
            separator?: boolean;
        };
        next: {
            page: number;
            active: boolean;
            qs: string;
            separator?: boolean;
        }
        first: {
            page: number;
            active: boolean;
            qs: string;
            separator?: boolean;
        }
        last: {
            page: number;
            active: boolean;
            qs: string;
            separator?: boolean;
        }
        pages: {
            page: number;
            active: boolean;
            qs: string;
            separator?: boolean;
        }[];
        currentPage: number;
        pageCount: number;
    } = {
        rel: [],
        pages: pages,
        currentPage: currentPage,
        pageCount: pageCount,
        prev: {
            page: 0,
            active: false,
            qs: '',
            separator: false,
        },
        next: {
            page: 0,
            active: false,
            qs: '',
            separator: false,
        },
        first: {
            page: 0,
            active: false,
            qs: '',
            separator: false,
        },
        last: {
            page: 0,
            active: false,
            qs: '',
            separator: false,
        },
    };
    queryObj.page = previous;
    data.prev = { page: previous, active: currentPage > 1, qs: qs.stringify(queryObj) };
    queryObj.page = next;
    data.next = { page: next, active: currentPage < pageCount, qs: qs.stringify(queryObj) };

    queryObj.page = 1;
    data.first = { page: 1, active: currentPage === 1, qs: qs.stringify(queryObj) };
    queryObj.page = pageCount;
    data.last = { page: pageCount, active: currentPage === pageCount, qs: qs.stringify(queryObj) };

    if (currentPage < pageCount) {
        data.rel.push({
            rel: 'next',
            href: `?${qs.stringify({ ...queryObj, page: next })}`,
        });
    }

    if (currentPage > 1) {
        data.rel.push({
            rel: 'prev',
            href: `?${qs.stringify({ ...queryObj, page: previous })}`,
        });
    }
    return data;
};
