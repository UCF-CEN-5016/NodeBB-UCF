"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const user = require("../user");
const posts = require("../posts");
const flags = require("../flags");
const analytics = require("../analytics");
const plugins = require("../plugins");
const pagination = require("../pagination");
const privileges = require("../privileges");
const utils = require("../utils");
const helpers = require("./helpers");
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const modsController = module.exports;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
modsController.flags = {};
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
modsController.flags.list = function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const validFilters = ['assignee', 'state', 'reporterId', 'type', 'targetUid', 'cid', 'quick', 'page', 'perPage'];
        const validSorts = ['newest', 'oldest', 'reports', 'upvotes', 'downvotes', 'replies'];
        const results = yield Promise.all([
            user.isAdminOrGlobalMod(req.uid),
            user.getModeratedCids(req.uid),
            plugins.hooks.fire('filter:flags.validateFilters', { filters: validFilters }),
            plugins.hooks.fire('filter:flags.validateSort', { sorts: validSorts }),
        ]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [isAdminOrGlobalMod, moderatedCids, , { sorts }] = results;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        let [, , { filters }] = results;
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
            if (req.query.hasOwnProperty(cur)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (typeof req.query[cur] === 'string' && req.query[cur].trim() !== '') {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    memo[cur] = req.query[cur].trim();
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                }
                else if (Array.isArray(req.query[cur]) && req.query[cur].length) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    memo[cur] = req.query[cur];
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return memo;
        }, {});
        let hasFilter = !!Object.keys(filters).length;
        if (res.locals.cids) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (!filters.cid) {
                // If mod and no cid filter, add filter for their modded categories
                /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                    @typescript-eslint/no-unsafe-assignment
                */
                filters.cid = res.locals.cids;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            }
            else if (Array.isArray(filters.cid)) {
                // Remove cids they do not moderate
                /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                    @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call,
                    @typescript-eslint/no-unsafe-assignment
                */
                filters.cid = filters.cid.filter(cid => res.locals.cids.includes(String(cid)));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            }
            else if (!res.locals.cids.includes(String(filters.cid))) {
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
        (Object.keys(filters).length === 1 && filters.hasOwnProperty('page')) ||
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            (Object.keys(filters).length === 2 && filters.hasOwnProperty('page') && filters.hasOwnProperty('perPage'))) {
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
        const [flagsData, analyticsData, selectData] = yield Promise.all([
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
    });
};
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
modsController.flags.detail = function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = yield utils.promiseParallel({
            isAdminOrGlobalMod: user.isAdminOrGlobalMod(req.uid),
            moderatedCids: user.getModeratedCids(req.uid),
            flagData: flags.get(req.params.flagId),
            assignees: user.getAdminsandGlobalModsandModerators(),
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
            */
            privileges: Promise.all(['global', 'admin'].map((type) => __awaiter(this, void 0, void 0, function* () { return yield privileges[type].get(req.uid); }))),
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        results.privileges = Object.assign(Object.assign({}, results.privileges[0]), results.privileges[1]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!results.flagData || (!(results.isAdminOrGlobalMod || !!results.moderatedCids.length))) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
            return next(); // 404
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        results.flagData.history = results.isAdminOrGlobalMod ? (yield flags.getHistory(req.params.flagId)) : null;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (results.flagData.type === 'user') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            results.flagData.type_path = 'uid';
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        }
        else if (results.flagData.type === 'post') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            results.flagData.type_path = 'post';
        }
        res.render('flags/detail', Object.assign(results.flagData, {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            assignees: results.assignees,
            type_bool: ['post', 'user', 'empty'].reduce((memo, cur) => {
                if (cur !== 'empty') {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    memo[cur] = results.flagData.type === cur && (
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    !results.flagData.target ||
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        !!Object.keys(results.flagData.target).length);
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    memo[cur] = !Object.keys(results.flagData.target).length;
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
    });
};
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
modsController.postQueue = function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.loggedIn) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
            return next();
        }
        const { id } = req.params;
        const { cid } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const postsPerPage = 20;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        let postData = yield posts.getQueuedPosts({ id: id });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [isAdmin, isGlobalMod, moderatedCids, categoriesData] = yield Promise.all([
            user.isAdministrator(req.uid),
            user.isGlobalModerator(req.uid),
            user.getModeratedCids(req.uid),
            helpers.getSelectedCategory(cid),
        ]);
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment,
            @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        */
        postData = postData.filter(p => p &&
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            (!categoriesData.selectedCids.length || categoriesData.selectedCids.includes(p.category.cid)) &&
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            (isAdmin || isGlobalMod || moderatedCids.includes(Number(p.category.cid)) || req.uid === p.user.uid));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ({ posts: postData } = yield plugins.hooks.fire('filter:post-queue.get', {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            posts: postData,
            req: req,
        }));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const pageCount = Math.max(1, Math.ceil(postData.length / postsPerPage));
        const start = (page - 1) * postsPerPage;
        const stop = start + postsPerPage - 1;
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment,
            @typescript-eslint/no-unsafe-call
        */
        postData = postData.slice(start, stop + 1);
        const crumbs = [{ text: '[[pages:post-queue]]', url: id ? '/post-queue' : undefined }];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (id && postData.length) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const text = postData[0].data.tid ? '[[post-queue:reply]]' : '[[post-queue:topic]]';
            crumbs.push({ text: text, url: id ? '/post-queue' : undefined });
        }
        res.render('post-queue', Object.assign(Object.assign({ title: '[[pages:post-queue]]', 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            posts: postData, 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            isAdmin: isAdmin, 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
            canAccept: isAdmin || isGlobalMod || !!moderatedCids.length }, categoriesData), { allCategoriesUrl: `post-queue${helpers.buildQueryString(req.query, 'cid', '')}`, pagination: pagination.create(page, pageCount), breadcrumbs: helpers.buildBreadcrumbs(crumbs), singlePost: !!id }));
    });
};
