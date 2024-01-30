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
const topics = require("../topics");
const user = require("../user");
const utils = require("../utils");
module.exports = function (Posts) {
    Posts.getPostsFromSet = function (set, start, stop, uid, reverse) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const pids = yield Posts.getPidsFromSet(set, start, stop, reverse);
            const posts = yield Posts.getPostsByPids(pids, uid);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return yield user.blocks.filter(uid, posts);
        });
    };
    Posts.isMain = function (pids) {
        return __awaiter(this, void 0, void 0, function* () {
            const isArray = Array.isArray(pids);
            const pidsArray = isArray ? (pids) : [pids];
            const postData = yield Posts.getPostsFields(pidsArray, ['tid']);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const topicData = yield topics.getTopicsFields(postData.map(t => t.tid), ['mainPid']);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const result = pidsArray.map((pid, i) => pid === topicData[i].mainPid);
            return isArray ? result : result[0];
        });
    };
    Posts.getTopicFields = function (pid, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            const tid = yield Posts.getPostField(pid, 'tid');
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return yield topics.getTopicFields(tid, fields);
        });
    };
    Posts.generatePostPath = function (pid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            const paths = yield Posts.generatePostPaths([pid], uid);
            return Array.isArray(paths) && paths.length ? paths[0] : null;
        });
    };
    Posts.generatePostPaths = function (pids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            const postData = yield Posts.getPostsFields(pids, ['pid', 'tid']);
            const tids = postData.map(post => post && post.tid);
            const [indices, topicData] = yield Promise.all([
                Posts.getPostIndices(postData, uid),
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                topics.getTopicsFields(tids, ['slug']),
            ]);
            const paths = pids.map((pid, index) => {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                const slug = (topicData[index] ? topicData[index].slug : null);
                const postIndex = utils.isNumber(indices[index]) ? indices[index] + 1 : null;
                if (slug && postIndex) {
                    return `/topic/${slug}/${postIndex}`;
                }
                return null;
            });
            return paths;
        });
    };
};
