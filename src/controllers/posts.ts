
// const querystring = require('querystring');
// const posts = require('../posts');
// const privileges = require('../privileges');
// const helpers = require('./helpers');
import { Response } from 'express';
/*
import querystring = require('querystring');
import posts = require('../posts');
import privileges = require('../privileges');
import helpers = require('./helpers');
*/

import * as querystring from 'querystring';
import * as posts from '../posts';
import * as privileges from '../privileges';
import * as helpers from './helpers';

interface CustomRequest extends Request {
    params?: {
        pid?: string;
        term?: string;
    };
    uid: unknown;
    query: {
        [key: string]: string | undefined;
    };
}
type postsController = {
    getRecentPosts: (req: CustomRequest, res: Response) => Promise<void>;
    redirectToPost: (req: CustomRequest, res: Response, next) => Promise<void>;
}
// const postsController : postsController = module.exports as postsController;


// postsController.redirectToPost = async function (req, res, next) {
export default function (postsController: postsController) {
    postsController.redirectToPost = async function (req: CustomRequest, res: Response, next): Promise<void> {
        const pid = parseInt(req.params.pid, 10);
        if (!pid) {
            return (next() as void);
        }
        type CanReadResult = boolean;
        type PostPathResult = string;
        const [canRead, path]: [CanReadResult, PostPathResult] = await Promise.all([
            privileges.posts.can('topics:read', pid, req.uid),
            posts.generatePostPath(pid, req.uid),
        ]) as [CanReadResult, PostPathResult];
        if (!path) {
            return next() as void;
        }
        if (!canRead) {
            return helpers.notAllowed(req, res) as void;
        }

        const qs = querystring.stringify(req.query);
        helpers.redirect(res, qs ? `${path}?${qs}` : path);
    };

    postsController.getRecentPosts = async function (req: CustomRequest, res: Response) {
        const page = parseInt(req.query.page, 10) || 1;
        const postsPerPage = 20;
        const start = Math.max(0, (page - 1) * postsPerPage);
        const stop = start + postsPerPage - 1;

        try {
            const data = await posts.getRecentPosts(req.uid, start, stop, req.params.term);
            res.json(data);
        } catch (error) {
            // Handle errors appropriately
            console.error('Error:', error);
            // res.status(500).json({ error: 'Internal Server Error' });
        }
        // res.json(data)
    };
}
