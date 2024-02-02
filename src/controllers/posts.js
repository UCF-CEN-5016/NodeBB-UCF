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
// @eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-cal
// const querystring = require('querystring');
// const posts = require('../posts');
// const privileges = require('../privileges');
// const helpers = require('./helpers');
const querystring = require("querystring");
const posts = require("../posts");
const privileges = require("../privileges");
const helpers = require("./helpers");
const postsController = module.exports;
// postsController.redirectToPost = async function (req, res, next) {
postsController.redirectToPost = function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const pid = parseInt(req.params.pid, 10);
        if (!pid) {
            return next();
        }
        const [canRead, path] = yield Promise.all([
            privileges.posts.can('topics:read', pid, req.uid),
            posts.generatePostPath(pid, req.uid),
        ]);
        if (!path) {
            return next();
        }
        if (!canRead) {
            return helpers.notAllowed(req, res);
        }
        const qs = querystring.stringify(req.query);
        helpers.redirect(res, qs ? `${path}?${qs}` : path);
    });
};
postsController.getRecentPosts = function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = parseInt(req.query.page, 10) || 1;
        const postsPerPage = 20;
        const start = Math.max(0, (page - 1) * postsPerPage);
        const stop = start + postsPerPage - 1;
        /*
        const data = await posts.getRecentPosts(req.uid, start, stop, req.params.term);
        res.json(); */
        try {
            const data = yield posts.getRecentPosts(req.uid, start, stop, req.params.term);
            //  res.json(data);
            //  res.json(data as Promise<void>);
            console.log(data);
        }
        catch (error) {
            // Handle errors appropriately
            console.error('Error:', error);
            // res.status(500).json({ error: 'Internal Server Error' });
        }
        // res.json(data)
    });
};
