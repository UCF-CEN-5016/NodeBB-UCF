import nconf from 'nconf';
import querystring, { ParsedUrlQueryInput } from 'querystring';
import { Request, Response, NextFunction } from 'express';

import meta from '../meta';
import pagination from '../pagination';
import user from '../user';
import topics from '../topics';
import helpers from './helpers';

const relative_path: string = nconf.get('relative_path') as string;

interface CustomRequest extends Request {
    uid: string;
}

interface Pagnation {
    prev: {
        page: number,
        active: boolean
    },
    next: {
        page: number,
        active: boolean
    },
    first: {
        page: number,
        active: boolean
    },
    last: {
        page: number,
        active: boolean
    },
    rel: [],
    pages: [],
    currentPage: number,
    pageCount: number,
}

interface UnreadTopics {
    showSelect: boolean,
    nextStart: number,
    topics: [],
    topicCount: number,
    title: string,
    breadcrumbs:[{
        text: string,
        url: string,
    }],
    pageCount: number,
    pagination: Pagnation,
    showTopicTools: boolean,
    allCategoriesUrl: string,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedCategory: any,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedCids: any,
    selectCategoryLabel: string,
    selectCategoryIcon: string,
    showCategorySelectLabel: boolean,
    filters: [{
        name: string,
        url: string,
        selected: boolean,
        filter: string,
        icon: string,
    }],
    selectedFilter: {
        name: string,
        url: string,
        selected: boolean,
        filter: string,
        icon: string,
    },
}

export async function get(req: CustomRequest, res: Response) {
    const { cid } = req.query;
    const filter = req.query.filter || '';

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [categoryData, userSettings, isPrivileged] = await Promise.all([
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        helpers.getSelectedCategory(cid),
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        user.getSettings(req.uid),
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        user.isPrivileged(req.uid) as boolean,
    ]);

    let page = 1;
    if (typeof req.query.page === 'string' && !Number.isNaN(parseInt(req.query.page, 10))) {
        page = parseInt(req.query.page, 10);
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const start = Math.max(0, (page - 1) * userSettings.topicsPerPage);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-plus-operands
    const stop = start + userSettings.topicsPerPage - 1;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const data: UnreadTopics = await topics.getUnreadTopics({
        cid: cid,
        uid: req.uid,
        start: start,
        stop: stop,
        filter: filter,
        query: req.query,
    }) as UnreadTopics;

    const isDisplayedAsHome = !(req.originalUrl.startsWith(`${relative_path}/api/unread`) ||
    req.originalUrl.startsWith(`${relative_path}/unread`));
    const baseUrl = isDisplayedAsHome ? '' : 'unread';

    if (isDisplayedAsHome) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.title = (meta.config.homePageTitle || '[[pages:home]]') as string;
    } else {
        data.title = '[[pages:unread]]';
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.breadcrumbs = helpers.buildBreadcrumbs([{ text: '[[unread:title]]' }]);
    }

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    data.pageCount = Math.max(1, Math.ceil(data.topicCount / userSettings.topicsPerPage));
    data.pagination = pagination.create(page, data.pageCount, req.query);
    helpers.addLinkTags({ url: 'unread', res: req.res, tags: data.pagination.rel });

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (userSettings.usePagination && (page < 1 || page > data.pageCount)) {
        (req.query.page as unknown as number) = Math.max(1, Math.min(data.pageCount, page));
        return helpers.redirect(res, `/unread?${querystring.stringify(req.query as ParsedUrlQueryInput)}`);
    }
    data.showSelect = true;
    data.showTopicTools = isPrivileged;
    data.allCategoriesUrl = `${baseUrl}${helpers.buildQueryString(req.query, 'cid', '')}`;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    data.selectedCategory = categoryData.selectedCategory;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    data.selectedCids = categoryData.selectedCids;
    data.selectCategoryLabel = '[[unread:mark_as_read]]';
    data.selectCategoryIcon = 'fa-inbox';
    data.showCategorySelectLabel = true;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    data.filters = helpers.buildFilters(baseUrl, filter, req.query);
    data.selectedFilter = data.filters.find(filter => filter && filter.selected);

    res.render('unread', data);
}

export async function unreadTotal(req: CustomRequest, res: Response, next: NextFunction) {
    const filter = req.query.filter || '';
    try {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const unreadCount: number = await (topics.getTotalUnread(req.uid, filter)) as number;
        res.json(unreadCount);
    } catch (err) {
        next(err);
    }
}
