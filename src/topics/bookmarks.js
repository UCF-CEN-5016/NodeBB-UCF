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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
          @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment,
          @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-misused-promises
          , @typescript-eslint/no-unsafe-argument */
const async = __importStar(require("async"));
const database_1 = __importDefault(require("../database"));
const user_1 = __importDefault(require("../user"));
const posts_1 = __importDefault(require("../posts"));
const Topics = {
    getUserBookmark: function (tid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (parseInt(uid, 10) <= 0) {
                return null;
            }
            return yield database_1.default.sortedSetScore(`tid:${tid}:bookmarks`, uid);
        });
    },
    getUserBookmarks: function (tids, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (parseInt(uid, 10) <= 0) {
                return tids.map(() => null);
            }
            return yield database_1.default.sortedSetsScore(tids.map(tid => `tid:${tid}:bookmarks`), uid);
        });
    },
    setUserBookmark: function (tid, uid, index) {
        return __awaiter(this, void 0, void 0, function* () {
            yield database_1.default.sortedSetAdd(`tid:${tid}:bookmarks`, index, uid);
        });
    },
    getTopicBookmarks: function (tid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield database_1.default.getSortedSetRangeWithScores(`tid:${tid}:bookmarks`, 0, -1);
        });
    },
    updateTopicBookmarks: function (tid, pids) {
        return __awaiter(this, void 0, void 0, function* () {
            const maxIndex = yield posts_1.default.getPostCount(tid);
            const indices = yield database_1.default.sortedSetRanks(`tid:${tid}:posts`, pids);
            const postIndices = indices.map(i => (i === null ? 0 : i + 1));
            const minIndex = Math.min(...postIndices);
            const bookmarks = yield Topics.getTopicBookmarks(tid);
            const uidData = bookmarks.map(b => ({ uid: String(b.value), bookmark: parseInt(b.score, 10) }))
                .filter(data => data.bookmark >= minIndex);
            yield async.eachLimit(uidData, 50, (data) => __awaiter(this, void 0, void 0, function* () {
                let bookmark = Math.min(data.bookmark, maxIndex);
                postIndices.forEach((i) => {
                    if (i < data.bookmark) {
                        bookmark -= 1;
                    }
                });
                // make sure the bookmark is valid if we removed the last post
                bookmark = Math.min(bookmark, maxIndex - pids.length);
                if (bookmark === data.bookmark) {
                    return;
                }
                const settings = yield user_1.default.getSettings(data.uid);
                if (settings.topicPostSort === 'most_votes') {
                    return;
                }
                yield Topics.setUserBookmark(tid, data.uid, bookmark);
            }));
        });
    },
};
exports.default = Topics;
