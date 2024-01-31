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
const meta = __importStar(require("../../meta"));
const user = __importStar(require("../../user"));
const topics = __importStar(require("../../topics"));
const categories = __importStar(require("../../categories"));
const privileges = __importStar(require("../../privileges"));
const utils = __importStar(require("../../utils"));
module.exports = function (SocketTopics) {
    SocketTopics.isTagAllowed = function (socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !utils.isNumber(data.cid) || !data.tag) {
                throw new Error('[[error:invalid-data]]');
            }
            const systemTags = (meta.config.systemTags || '').split(',');
            const [tagWhitelist, isPrivileged] = yield Promise.all([
                categories.getTagWhitelist([data.cid]),
                user.isPrivileged(socket.uid),
            ]);
            return isPrivileged ||
                (!systemTags.includes(data.tag) &&
                    (!tagWhitelist[0].length || tagWhitelist[0].includes(data.tag)));
        });
    };
    SocketTopics.canRemoveTag = function (socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.tag) {
                throw new Error('[[error:invalid-data]]');
            }
            const systemTags = (meta.config.systemTags || '').split(',');
            const isPrivileged = yield user.isPrivileged(socket.uid);
            return isPrivileged || !systemTags.includes(String(data.tag).trim());
        });
    };
    SocketTopics.autocompleteTags = function (socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data.cid) {
                const canRead = yield privileges.categories.can('topics:read', data.cid, socket.uid);
                if (!canRead) {
                    throw new Error('[[error:no-privileges]]');
                }
            }
            data.cids = yield categories.getCidsByPrivilege('categories:cid', socket.uid, 'topics:read');
            const result = yield topics.autocompleteTags(data);
            return result.map((tag) => tag.value);
        });
    };
    SocketTopics.searchTags = function (socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield searchTags(socket.uid, topics.searchTags, data);
            return result.map((tag) => tag.value);
        });
    };
    SocketTopics.searchAndLoadTags = function (socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield searchTags(socket.uid, topics.searchAndLoadTags, data);
        });
    };
    function searchTags(uid, method, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const allowed = yield privileges.global.can('search:tags', uid);
            if (!allowed) {
                throw new Error('[[error:no-privileges]]');
            }
            if (data.cid) {
                const canRead = yield privileges.categories.can('topics:read', data.cid, uid);
                if (!canRead) {
                    throw new Error('[[error:no-privileges]]');
                }
            }
            data.cids = yield categories.getCidsByPrivilege('categories:cid', uid, 'topics:read');
            return yield method(data);
        });
    }
    SocketTopics.loadMoreTags = function (socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !utils.isNumber(data.after)) {
                throw new Error('[[error:invalid-data]]');
            }
            const start = parseInt(data.after, 10);
            const stop = start + 99;
            const cids = yield categories.getCidsByPrivilege('categories:cid', socket.uid, 'topics:read');
            const tags = yield topics.getCategoryTagsData(cids, start, stop);
            return { tags: tags.filter(Boolean), nextStart: stop + 1 };
        });
    };
};
