"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
/*
import querystring = require('querystring');
import posts = require('../posts');
import privileges = require('../privileges');
import helpers = require('./helpers');
*/
const querystring = __importStar(require("querystring"));
const posts = __importStar(require("../posts"));
const privileges = __importStar(require("../privileges"));
const helpers = __importStar(require("./helpers"));
// const postsController : postsController = module.exports as postsController;
// postsController.redirectToPost = async function (req, res, next) {
function default_1(postsController) {
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
            try {
                const data = yield posts.getRecentPosts(req.uid, start, stop, req.params.term);
                res.json(data);
            }
            catch (error) {
                // Handle errors appropriately
                console.error('Error:', error);
                // res.status(500).json({ error: 'Internal Server Error' });
            }
            // res.json(data)
        });
    };
}
exports.default = default_1;
