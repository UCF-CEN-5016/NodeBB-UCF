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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
          @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment,
          @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-misused-promises
          , @typescript-eslint/no-unsafe-argument */
var async = require("async");
var db = require("../database");
var user = require("../user");
var posts = require("../posts");
module.exports = function (Topics) {
    Topics.getUserBookmark = function (tid, uid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (parseInt(uid, 10) <= 0) {
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, db.sortedSetScore("tid:".concat(tid, ":bookmarks"), uid)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Topics.getUserBookmarks = function (tids, uid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (parseInt(uid, 10) <= 0) {
                            return [2 /*return*/, tids.map(function () { return null; })];
                        }
                        return [4 /*yield*/, db.sortedSetsScore(tids.map(function (tid) { return "tid:".concat(tid, ":bookmarks"); }), uid)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Topics.setUserBookmark = function (tid, uid, index) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.sortedSetAdd("tid:".concat(tid, ":bookmarks"), index, uid)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Topics.getTopicBookmarks = function (tid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.getSortedSetRangeWithScores("tid:".concat(tid, ":bookmarks"), 0, -1)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Topics.updateTopicBookmarks = function (tid, pids) {
        return __awaiter(this, void 0, void 0, function () {
            var maxIndex, indices, postIndices, minIndex, bookmarks, uidData;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, posts.getPostCount(tid)];
                    case 1:
                        maxIndex = _a.sent();
                        return [4 /*yield*/, db.sortedSetRanks("tid:".concat(tid, ":posts"), pids)];
                    case 2:
                        indices = _a.sent();
                        postIndices = indices.map(function (i) { return (i === null ? 0 : i + 1); });
                        minIndex = Math.min.apply(Math, postIndices);
                        return [4 /*yield*/, Topics.getTopicBookmarks(tid)];
                    case 3:
                        bookmarks = _a.sent();
                        uidData = bookmarks.map(function (b) { return ({ uid: String(b.value), bookmark: parseInt(b.score, 10) }); })
                            .filter(function (data) { return data.bookmark >= minIndex; });
                        return [4 /*yield*/, async.eachLimit(uidData, 50, function (data) { return __awaiter(_this, void 0, void 0, function () {
                                var bookmark, settings;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            bookmark = Math.min(data.bookmark, maxIndex);
                                            postIndices.forEach(function (i) {
                                                if (i < data.bookmark) {
                                                    bookmark -= 1;
                                                }
                                            });
                                            // make sure the bookmark is valid if we removed the last post
                                            bookmark = Math.min(bookmark, maxIndex - pids.length);
                                            if (bookmark === data.bookmark) {
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, user.getSettings(data.uid)];
                                        case 1:
                                            settings = _a.sent();
                                            if (settings.topicPostSort === 'most_votes') {
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, Topics.setUserBookmark(tid, data.uid, bookmark)];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
};

