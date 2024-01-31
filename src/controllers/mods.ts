// eslint-disable-next-line import/no-import-module-exports
import { Request, Response } from 'express';

import user = require('../user');
import posts = require('../posts');
import flags = require('../flags');
import analytics = require('../analytics');
import plugins = require('../plugins');
import pagination = require('../pagination');
import privileges = require('../privileges');
import utils = require('../utils');
import helpers = require('./helpers');

interface BBRequest extends Request {
    loggedIn: boolean;
    uid: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const modsController = module.exports;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
modsController.flags = {};

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
modsController.flags.list = async function (req: BBRequest, res: Response) {
    const validFilters = ['assignee', 'state', 'reporterId', 'type', 'targetUid', 'cid', 'quick', 'page', 'perPage'];
    const validSorts = ['newest', 'oldest', 'reports', 'upvotes', 'downvotes', 'replies'];

    const results = await Promise.all([
        user.isAdminOrGlobalMod(req.uid),
        user.getModeratedCids(req.uid),
        plugins.hooks.fire('filter:flags.validateFilters', { filters: validFilters }),
        plugins.hooks.fire('filter:flags.validateSort', { sorts: validSorts }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [isAdminOrGlobalMod, moderatedCids,, { sorts }] = results;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let [,, { filters }] = results;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!(isAdminOrGlobalMod || !!moderatedCids.length)) {
        return helpers.notAllowed(req, res);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!isAdminOrGlobalMod && moderatedCids.length) {
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        */
        res.locals.cids = moderatedCids.map(cid => String(cid));
    }

    // Parse query string params for filters, eliminate non-valid filters
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    */
    filters = filters.reduce((memo, cur) => {
        if (req.query.hasOwnProperty(cur as PropertyKey)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (typeof req.query[cur] === 'string' && (req.query[cur] as string).trim() !== '') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                memo[cur] = (req.query[cur] as string).trim();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            } else if (Array.isArray(req.query[cur]) && req.query[cur].length) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                memo[cur] = req.query[cur];
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return memo;
    }, {});

    let hasFilter = !!Object.keys(filters as object).length;

    if (res.locals.cids) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!filters.cid) {
            // If mod and no cid filter, add filter for their modded categories
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                @typescript-eslint/no-unsafe-assignment
            */
            filters.cid = res.locals.cids;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        } else if (Array.isArray(filters.cid)) {
            // Remove cids they do not moderate
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call,
                @typescript-eslint/no-unsafe-assignment
            */
            filters.cid = filters.cid.filter(cid => res.locals.cids.includes(String(cid)));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        } else if (!res.locals.cids.includes(String(filters.cid))) {
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                @typescript-eslint/no-unsafe-assignment
            */
            filters.cid = res.locals.cids;
            hasFilter = false;
        }
    }

    // Pagination doesn't count as a filter
    if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        (Object.keys(filters as object).length === 1 && filters.hasOwnProperty('page')) ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        (Object.keys(filters as object).length === 2 && filters.hasOwnProperty('page') && filters.hasOwnProperty('perPage'))
    ) {
        hasFilter = false;
    }

    // Parse sort from query string
    let sort;
    if (req.query.sort) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        sort = sorts.includes(req.query.sort) ? req.query.sort : null;
    }
    if (sort === 'newest') {
        sort = undefined;
    }
    hasFilter = hasFilter || !!sort;

    const [flagsData, analyticsData, selectData] = await Promise.all([
        flags.list({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            filters: filters,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            sort: sort,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            uid: req.uid,
            query: req.query,
        }),
        analytics.getDailyStatsForSet('analytics:flags', Date.now(), 30),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        helpers.getSelectedCategory(filters.cid),
    ]);

    res.render('flags/list', {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        flags: flagsData.flags,
        analytics: analyticsData,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        selectedCategory: selectData.selectedCategory,
        hasFilter: hasFilter,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        filters: filters,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expanded: !!(filters.assignee || filters.reporterId || filters.targetUid),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        sort: sort || 'newest',
        title: '[[pages:flags]]',
        pagination: pagination.create(flagsData.page, flagsData.pageCount, req.query),
        breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[pages:flags]]' }]),
    });
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
modsController.flags.detail = async function (req: BBRequest, res: Response, next) {
    const results = await utils.promiseParallel({
        isAdminOrGlobalMod: user.isAdminOrGlobalMod(req.uid),
        moderatedCids: user.getModeratedCids(req.uid),
        flagData: flags.get(req.params.flagId),
        assignees: user.getAdminsandGlobalModsandModerators(),
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        */
        privileges: Promise.all(['global', 'admin'].map(async type => await privileges[type].get(req.uid))),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    results.privileges = { ...results.privileges[0], ...results.privileges[1] };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!results.flagData || (!(results.isAdminOrGlobalMod || !!results.moderatedCids.length))) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return next(); // 404
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    results.flagData.history = results.isAdminOrGlobalMod ? (await flags.getHistory(req.params.flagId)) : null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (results.flagData.type === 'user') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        results.flagData.type_path = 'uid';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    } else if (results.flagData.type === 'post') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        results.flagData.type_path = 'post';
    }

    res.render('flags/detail', Object.assign(results.flagData as object, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        assignees: results.assignees,
        type_bool: ['post', 'user', 'empty'].reduce((memo, cur) => {
            if (cur !== 'empty') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                memo[cur] = results.flagData.type === cur && (
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    !results.flagData.target ||
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    !!Object.keys(results.flagData.target as object).length
                );
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                memo[cur] = !Object.keys(results.flagData.target as object).length;
            }

            return memo;
        }, {}),
        states: Object.fromEntries(flags._states),
        title: `[[pages:flag-details, ${req.params.flagId}]]`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        privileges: results.privileges,
        breadcrumbs: helpers.buildBreadcrumbs([
            { text: '[[pages:flags]]', url: '/flags' },
            { text: `[[pages:flag-details, ${req.params.flagId}]]` },
        ]),
    }));
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
modsController.postQueue = async function (req: BBRequest, res: Response, next) {
    if (!req.loggedIn) {
        return next();
    }
    const { id } = req.params;
    const { cid } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const postsPerPage = 20;

    let postData = await posts.getQueuedPosts({ id: id });
    const [isAdmin, isGlobalMod, moderatedCids, categoriesData] = await Promise.all([
        user.isAdministrator(req.uid),
        user.isGlobalModerator(req.uid),
        user.getModeratedCids(req.uid),
        helpers.getSelectedCategory(cid),
    ]);

    postData = postData.filter(p => p &&
        (!categoriesData.selectedCids.length || categoriesData.selectedCids.includes(p.category.cid)) &&
        (isAdmin || isGlobalMod || moderatedCids.includes(Number(p.category.cid)) || req.uid === p.user.uid));

    ({ posts: postData } = await plugins.hooks.fire('filter:post-queue.get', {
        posts: postData,
        req: req,
    }));

    const pageCount = Math.max(1, Math.ceil(postData.length / postsPerPage));
    const start = (page - 1) * postsPerPage;
    const stop = start + postsPerPage - 1;
    postData = postData.slice(start, stop + 1);
    const crumbs = [{ text: '[[pages:post-queue]]', url: id ? '/post-queue' : undefined }];
    if (id && postData.length) {
        const text = postData[0].data.tid ? '[[post-queue:reply]]' : '[[post-queue:topic]]';
        crumbs.push({ text: text, url: id ? '/post-queue' : undefined });
    }
    res.render('post-queue', {
        title: '[[pages:post-queue]]',
        posts: postData,
        isAdmin: isAdmin,
        canAccept: isAdmin || isGlobalMod || !!moderatedCids.length,
        ...categoriesData,
        allCategoriesUrl: `post-queue${helpers.buildQueryString(req.query, 'cid', '')}`,
        pagination: pagination.create(page, pageCount),
        breadcrumbs: helpers.buildBreadcrumbs(crumbs),
        singlePost: !!id,
    });
};
