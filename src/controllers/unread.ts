import nconf from 'nconf';
import querystring, { ParsedUrlQueryInput } from 'querystring';
import { Request, Response, NextFunction } from "express";

import meta from '../meta';
import pagination from '../pagination';
import user from '../user';
import topics from '../topics';
import helpers from './helpers';

interface CustomRequest extends Request {
    uid?: number;
}

const relative_path: string = nconf.get('relative_path');

export async function get (req: CustomRequest, res: Response): Promise<void> {
    const { cid } = req.query;
    const filter = req.query.filter || '';

    const [categoryData, userSettings, isPrivileged] = await Promise.all([
        helpers.getSelectedCategory(cid),
        user.getSettings(req.uid),
        user.isPrivileged(req.uid),
    ]);

    let page = 1;
    if (typeof req.query.page === "string" && !Number.isNaN(parseInt(req.query.page, 10))) {
        page = parseInt(req.query.page, 10);
    } 
    const start = Math.max(0, (page - 1) * userSettings.topicsPerPage);
    const stop = start + userSettings.topicsPerPage - 1;
    const data = await topics.getUnreadTopics({
        cid: cid,
        uid: req.uid,
        start: start,
        stop: stop,
        filter: filter,
        query: req.query,
    });

    const isDisplayedAsHome = !(req.originalUrl.startsWith(`${relative_path}/api/unread`) || req.originalUrl.startsWith(`${relative_path}/unread`));
    const baseUrl = isDisplayedAsHome ? '' : 'unread';

    if (isDisplayedAsHome) {
        data.title = meta.config.homePageTitle || '[[pages:home]]';
    } else {
        data.title = '[[pages:unread]]';
        data.breadcrumbs = helpers.buildBreadcrumbs([{ text: '[[unread:title]]' }]);
    }

    data.pageCount = Math.max(1, Math.ceil(data.topicCount / userSettings.topicsPerPage));
    data.pagination = pagination.create(page, data.pageCount, req.query);
    helpers.addLinkTags({ url: 'unread', res: req.res, tags: data.pagination.rel });

    if (userSettings.usePagination && (page < 1 || page > data.pageCount)) {
        (req.query.page as unknown as number)= Math.max(1, Math.min(data.pageCount, page));
        return helpers.redirect(res, `/unread?${querystring.stringify(req.query as ParsedUrlQueryInput)}`);
    }
    data.showSelect = true;
    data.showTopicTools = isPrivileged;
    data.allCategoriesUrl = `${baseUrl}${helpers.buildQueryString(req.query, 'cid', '')}`;
    data.selectedCategory = categoryData.selectedCategory;
    data.selectedCids = categoryData.selectedCids;
    data.selectCategoryLabel = '[[unread:mark_as_read]]';
    data.selectCategoryIcon = 'fa-inbox';
    data.showCategorySelectLabel = true;
    data.filters = helpers.buildFilters(baseUrl, filter, req.query);
    data.selectedFilter = data.filters.find(filter => filter && filter.selected);

    res.render('unread', data);
};

export async function unreadTotal (req: CustomRequest, res: Response, next: NextFunction): Promise<void> {
    const filter = req.query.filter || '';
    try {
        const unreadCount = await topics.getTotalUnread(req.uid, filter);
        res.json(unreadCount);
    } catch (err) {
        next(err);
    }
};


/*
'use strict';

const nconf = require('nconf');
const querystring = require('querystring');

const meta = require('../meta');
const pagination = require('../pagination');
const user = require('../user');
const topics = require('../topics');
const helpers = require('./helpers');

const unreadController = module.exports;
const relative_path = nconf.get('relative_path');

unreadController.get = async function (req, res) {
    const { cid } = req.query;
    const filter = req.query.filter || '';

    const [categoryData, userSettings, isPrivileged] = await Promise.all([
        helpers.getSelectedCategory(cid),
        user.getSettings(req.uid),
        user.isPrivileged(req.uid),
    ]);

    const page = parseInt(req.query.page, 10) || 1;
    const start = Math.max(0, (page - 1) * userSettings.topicsPerPage);
    const stop = start + userSettings.topicsPerPage - 1;
    const data = await topics.getUnreadTopics({
        cid: cid,
        uid: req.uid,
        start: start,
        stop: stop,
        filter: filter,
        query: req.query,
    });

    const isDisplayedAsHome = !(req.originalUrl.startsWith(`${relative_path}/api/unread`) || req.originalUrl.startsWith(`${relative_path}/unread`));
    const baseUrl = isDisplayedAsHome ? '' : 'unread';

    if (isDisplayedAsHome) {
        data.title = meta.config.homePageTitle || '[[pages:home]]';
    } else {
        data.title = '[[pages:unread]]';
        data.breadcrumbs = helpers.buildBreadcrumbs([{ text: '[[unread:title]]' }]);
    }

    data.pageCount = Math.max(1, Math.ceil(data.topicCount / userSettings.topicsPerPage));
    data.pagination = pagination.create(page, data.pageCount, req.query);
    helpers.addLinkTags({ url: 'unread', res: req.res, tags: data.pagination.rel });

    if (userSettings.usePagination && (page < 1 || page > data.pageCount)) {
        req.query.page = Math.max(1, Math.min(data.pageCount, page));
        return helpers.redirect(res, `/unread?${querystring.stringify(req.query)}`);
    }
    data.showSelect = true;
    data.showTopicTools = isPrivileged;
    data.allCategoriesUrl = `${baseUrl}${helpers.buildQueryString(req.query, 'cid', '')}`;
    data.selectedCategory = categoryData.selectedCategory;
    data.selectedCids = categoryData.selectedCids;
    data.selectCategoryLabel = '[[unread:mark_as_read]]';
    data.selectCategoryIcon = 'fa-inbox';
    data.showCategorySelectLabel = true;
    data.filters = helpers.buildFilters(baseUrl, filter, req.query);
    data.selectedFilter = data.filters.find(filter => filter && filter.selected);

    res.render('unread', data);
};

unreadController.unreadTotal = async function (req, res, next) {
    const filter = req.query.filter || '';
    try {
        const unreadCount = await topics.getTotalUnread(req.uid, filter);
        res.json(unreadCount);
    } catch (err) {
        next(err);
    }
};
*/