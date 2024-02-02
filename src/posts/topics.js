'use strict';
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
const topics = __importStar(require("../topics")); // Replace with the actual path to the topics module
const user = __importStar(require("../user")); // Replace with the actual path to the user module
const utils = __importStar(require("../utils")); // Replace with the actual path to the utils module
module.exports = function (Posts) {
    Posts.getPostsFromSet = function (set, start, stop, uid, reverse) {
        return __awaiter(this, void 0, void 0, function* () {
            const pids = yield Posts.getPidsFromSet(set, start, stop, reverse);
            const posts = yield Posts.getPostsByPids(pids, uid);
            return yield user.blocks.filter(uid, posts);
        });
    };
    Posts.isMain = function (pids) {
        return __awaiter(this, void 0, void 0, function* () {
            const isArray = Array.isArray(pids);
            pids = isArray ? pids : [pids];
            const postData = yield Posts.getPostsFields(pids, ['tid']);
            const topicData = yield topics.getTopicsFields(postData.map(t => t.tid), ['mainPid']);
            const result = pids.map((pid, i) => parseInt(pid, 10) === parseInt(topicData[i].mainPid, 10));
            return isArray ? result : result[0];
        });
    };
    Posts.getTopicFields = function (pid, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            const tid = yield Posts.getPostField(pid, 'tid');
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
                topics.getTopicsFields(tids, ['slug']),
            ]);
            const paths = pids.map((pid, index) => {
                const slug = topicData[index] ? topicData[index].slug : null;
                const postIndex = utils.isNumber(indices[index]) ? parseInt(String(indices[index]), 10) + 1 : null;
                if (slug && postIndex) {
                    return `/topic/${slug}/${postIndex}`;
                }
                return null;
            });
            return paths;
        });
    };
};
