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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unreadTotal = exports.get = void 0;
const nconf_1 = __importDefault(require("nconf"));
const querystring_1 = __importDefault(require("querystring"));
const meta_1 = __importDefault(require("../meta"));
const pagination_1 = __importDefault(require("../pagination"));
const user_1 = __importDefault(require("../user"));
const topics_1 = __importDefault(require("../topics"));
const helpers_1 = __importDefault(require("./helpers"));
const relative_path = nconf_1.default.get('relative_path');
function get(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { cid } = req.query;
        const filter = req.query.filter || '';
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [categoryData, userSettings, isPrivileged] = yield Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            helpers_1.default.getSelectedCategory(cid),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            user_1.default.getSettings(req.uid),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            user_1.default.isPrivileged(req.uid),
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
        const data = yield topics_1.default.getUnreadTopics({
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
            data.title = (meta_1.default.config.homePageTitle || '[[pages:home]]');
        }
        else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            data.title = '[[pages:unread]]';
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            data.breadcrumbs = helpers_1.default.buildBreadcrumbs([{ text: '[[unread:title]]' }]);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.pageCount = Math.max(1, Math.ceil(data.topicCount / userSettings.topicsPerPage));
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.pagination = pagination_1.default.create(page, data.pageCount, req.query);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        helpers_1.default.addLinkTags({ url: 'unread', res: req.res, tags: data.pagination.rel });
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (userSettings.usePagination && (page < 1 || page > data.pageCount)) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            req.query.page = Math.max(1, Math.min(data.pageCount, page));
            return helpers_1.default.redirect(res, `/unread?${querystring_1.default.stringify(req.query)}`);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.showSelect = true;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.showTopicTools = isPrivileged;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.allCategoriesUrl = `${baseUrl}${helpers_1.default.buildQueryString(req.query, 'cid', '')}`;
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
        data.filters = helpers_1.default.buildFilters(baseUrl, filter, req.query);
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
    });
}
exports.get = get;
function unreadTotal(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const filter = req.query.filter || '';
        try {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            const unreadCount = yield (topics_1.default.getTotalUnread(req.uid, filter));
            res.json(unreadCount);
        }
        catch (err) {
            next(err);
        }
    });
}
exports.unreadTotal = unreadTotal;
