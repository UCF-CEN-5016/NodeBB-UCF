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
exports.tagsController = void 0;
const validator_1 = __importDefault(require("validator"));
const nconf_1 = __importDefault(require("nconf"));
const meta_1 = __importDefault(require("../meta"));
const user_1 = __importDefault(require("../user"));
const categories_1 = __importDefault(require("../categories"));
const topics_1 = __importDefault(require("../topics"));
const privileges_1 = __importDefault(require("../privileges"));
const pagination_1 = __importDefault(require("../pagination"));
const utils_1 = __importDefault(require("../utils"));
const helpers_1 = __importDefault(require("./helpers"));
exports.tagsController = {};
exports.tagsController.getTag = function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const tag = validator_1.default.escape(utils_1.default.cleanUpTag(req.params.tag, meta_1.default.config.maximumTagLength));
        const page = (req.query.page, 10) || 1;
        const cid = Array.isArray(req.query.cid) ? req.query.cid : req.query.cid ? [req.query.cid] : undefined;
        const templateData = {
            topics: [],
            tag: tag,
            breadcrumbs: helpers_1.default.buildBreadcrumbs([{ text: '[[tags:tags]]', url: '/tags' }, { text: tag }]),
            title: `[[pages:tag, ${tag}]]`,
        };
        const [settings, cids, categoryData, isPrivileged] = yield Promise.all([
            user_1.default.getSettings(req.uid),
            cid || categories_1.default.getCidsByPrivilege('categories:cid', req.uid, 'topics:read'),
            helpers_1.default.getSelectedCategory(cid),
            user_1.default.isPrivileged(req.uid),
        ]);
        const start = Math.max(0, (page - 1) * settings.topicsPerPage);
        const stop = start + settings.topicsPerPage - 1;
        const [topicCount, tids] = yield Promise.all([
            topics_1.default.getTagTopicCount(tag, cids),
            topics_1.default.getTagTidsByCids(tag, cids, start, stop),
        ]);
        templateData.topics = yield topics_1.default.getTopics(tids, req.uid);
        templateData.showSelect = isPrivileged;
        templateData.showTopicTools = isPrivileged;
        templateData.allCategoriesUrl = `tags/${tag}${helpers_1.default.buildQueryString(req.query, 'cid', '')}`;
        templateData.selectedCategory = categoryData.selectedCategory;
        templateData.selectedCids = categoryData.selectedCids;
        topics_1.default.calculateTopicIndices(templateData.topics, start);
        res.locals.metaTags = [
            {
                name: 'title',
                content: tag,
            },
            {
                property: 'og:title',
                content: tag,
            },
        ];
        const pageCount = Math.max(1, Math.ceil(topicCount / settings.topicsPerPage));
        templateData.pagination = pagination_1.default.create(page, pageCount, req.query);
        helpers_1.default.addLinkTags({ url: `tags/${tag}`, res: req.res, tags: templateData.pagination.rel });
        templateData['feeds:disableRSS'] = meta_1.default.config['feeds:disableRSS'];
        templateData.rssFeedUrl = `${nconf_1.default.get('relative_path')}/tags/${tag}.rss`;
        res.render('tag', templateData);
    });
};
exports.tagsController.getTags = function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const cids = yield categories_1.default.getCidsByPrivilege('categories:cid', req.uid, 'topics:read');
        const [canSearch, tags] = yield Promise.all([
            privileges_1.default.global.can('search:tags', req.uid),
            topics_1.default.getCategoryTagsData(cids, 0, 99),
        ]);
        res.render('tags', {
            tags: tags.filter(Boolean),
            displayTagSearch: canSearch,
            nextStart: 100,
            breadcrumbs: helpers_1.default.buildBreadcrumbs([{ text: '[[tags:tags]]' }]),
            title: '[[pages:tags]]',
        });
    });
};
