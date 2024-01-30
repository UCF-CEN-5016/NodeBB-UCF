import validator from 'validator';
import nconf from 'nconf';
import { Request, Response } from 'express';

import meta from '../meta';
import user from '../user';
import categories from '../categories';
import topics from '../topics';
import privileges from '../privileges';
import pagination from '../pagination';
import utils from '../utils';
import helpers from './helpers';

interface TemplateData {
    topics: any[];
    tag: string;
    breadcrumbs: any[];
    title: string;
    showSelect?: boolean;
    showTopicTools?: boolean;
    allCategoriesUrl?: string;
    selectedCategory?: any;
    selectedCids?: any[];
    pagination?: any;
    rssFeedUrl?: string;
    'feeds:disableRSS'?: boolean;
}

interface CategoryData {
    selectedCategory: any;
    selectedCids: any[];
}

interface Settings {
    topicsPerPage: number;
}

export const tagsController = {
    getTag: async function (req: Request, res: Response): Promise<void> {
        const tag: string = validator.escape(utils.cleanUpTag(req.params.tag, meta.config.maximumTagLength));
        const page: number = parseInt(req.query.page as string, 10) || 1;
        const cid: string | string[] = Array.isArray(req.query.cid) ? req.query.cid : req.query.cid ? [req.query.cid as string] : [];

        const templateData: TemplateData = {
            topics: [],
            tag: tag,
            breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[tags:tags]]', url: '/tags' }, { text: tag }]),
            title: `[[pages:tag, ${tag}]]`,
        };

        const [settings, cids, categoryData, isPrivileged] = await Promise.all([
            user.getSettings(req.uid as number),
            cid.length > 0 ? Promise.resolve(cid) : categories.getCidsByPrivilege('categories:cid', req.uid as number, 'topics:read'),
            helpers.getSelectedCategory(cid),
            user.isPrivileged(req.uid as number),
        ]) as [Settings, string[], CategoryData, boolean];

        const start: number = Math.max(0, (page - 1) * settings.topicsPerPage);
        const stop: number = start + settings.topicsPerPage - 1;

        const [topicCount, tids] = await Promise.all([
            topics.getTagTopicCount(tag, cids),
            topics.getTagTidsByCids(tag, cids, start, stop),
        ]) as [number, number[]];

        templateData.topics = await topics.getTopics(tids, req.uid as number);
        templateData.showSelect = isPrivileged;
        templateData.showTopicTools = isPrivileged;
        templateData.allCategoriesUrl = `tags/${tag}${helpers.buildQueryString(req.query, 'cid', '')}`;
        templateData.selectedCategory = categoryData.selectedCategory;
        templateData.selectedCids = categoryData.selectedCids;
        topics.calculateTopicIndices(templateData.topics, start);

        const pageCount: number = Math.max(1, Math.ceil(topicCount / settings.topicsPerPage));
        templateData.pagination = pagination.create(page, pageCount, req.query);

        templateData['feeds:disableRSS'] = meta.config['feeds:disableRSS'];
        templateData.rssFeedUrl = `${nconf.get('relative_path')}/tags/${tag}.rss`;
        res.render('tag', templateData);
    },

    getTags: async function (req: Request, res: Response): Promise<void> {
        const cids: string[] = await categories.getCidsByPrivilege('categories:cid', req.uid as number, 'topics:read');
        const [canSearch, tags] = await Promise.all([
            privileges.global.can('search:tags', req.uid as number),
            topics.getCategoryTagsData(cids, 0, 99),
        ]) as [boolean, any[]];

        res.render('tags', {
            tags: tags.filter(Boolean),
            displayTagSearch: canSearch,
            nextStart: 100,
            breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[tags:tags]]' }]),
            title: '[[pages:tags]]',
        });
    }
};
