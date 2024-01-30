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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const data = await topics.getUnreadTopics({
        cid: cid,
        uid: req.uid,
        start: start,
        stop: stop,
        filter: filter,
        query: req.query,
    });

    const isDisplayedAsHome = !(req.originalUrl.startsWith(`${relative_path}/api/unread`) ||
    req.originalUrl.startsWith(`${relative_path}/unread`));
    const baseUrl = isDisplayedAsHome ? '' : 'unread';

    if (isDisplayedAsHome) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.title = (meta.config.homePageTitle || '[[pages:home]]') as string;
    } else {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.title = '[[pages:unread]]';
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.breadcrumbs = helpers.buildBreadcrumbs([{ text: '[[unread:title]]' }]);
    }

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    data.pageCount = Math.max(1, Math.ceil(data.topicCount / userSettings.topicsPerPage));
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    data.pagination = pagination.create(page, data.pageCount, req.query);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    helpers.addLinkTags({ url: 'unread', res: req.res, tags: data.pagination.rel });

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (userSettings.usePagination && (page < 1 || page > data.pageCount)) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        req.query.page = (Math.max(1, Math.min(data.pageCount, page))).toString();
        return helpers.redirect(res, `/unread?${querystring.stringify(req.query as ParsedUrlQueryInput)}`);
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    data.showSelect = true;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    data.showTopicTools = isPrivileged;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    data.allCategoriesUrl = `${baseUrl}${helpers.buildQueryString(req.query, 'cid', '')}`;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    data.selectedCategory = categoryData.selectedCategory;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    data.selectedCids = categoryData.selectedCids;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    data.selectCategoryLabel = '[[unread:mark_as_read]]';
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    data.selectCategoryIcon = 'fa-inbox';
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    data.showCategorySelectLabel = true;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    data.filters = helpers.buildFilters(baseUrl, filter, req.query);
    // The next line calls a function in a module that has not been updated to TS yet
    /* eslint-disable-next-line
        @typescript-eslint/no-unsafe-assignment,
        @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-return */
    data.selectedFilter = data.filters.find(filter => filter && filter.selected);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
