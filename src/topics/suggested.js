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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const lodash_1 = __importDefault(require("lodash"));
module.exports = function (Topics) {
    Topics.getSuggestedTopics = function (tid, uid, start, stop, cutoff = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            let tids;
            tid = parseInt(tid.toString(), 10);
            cutoff = cutoff === 0 ? cutoff : cutoff * 2592000000;
            const [tagTids, searchTids] = yield Promise.all([
                getTidsWithSameTags(tid, cutoff, Topics),
                getSearchTids(tid, uid, cutoff, Topics),
            ]);
            tids = lodash_1.default.uniq(tagTids.concat(searchTids));
            let categoryTids = [];
            if (stop !== -1 && tids.length < stop - start + 1) {
                categoryTids = yield getCategoryTids(tid, cutoff, Topics);
            }
            tids = lodash_1.default.shuffle(lodash_1.default.uniq(tids.concat(categoryTids)));
            tids = yield Topics.privileges.topics.filterTids('topics:read', tids, uid);
            let topicData = yield Topics.getTopicsByTids(tids, uid);
            topicData = topicData.filter((topic) => topic && topic.tid !== tid);
            topicData = yield Topics.user.blocks.filter(uid, topicData);
            topicData = topicData
                .slice(start, stop !== -1 ? stop + 1 : undefined)
                .sort((t1, t2) => t2.timestamp - t1.timestamp);
            return topicData;
        });
    };
    function getTidsWithSameTags(tid, cutoff, Topics) {
        return __awaiter(this, void 0, void 0, function* () {
            const tags = yield Topics.getTopicTags(tid);
            let tids = cutoff === 0
                ? yield Topics.db.getSortedSetRevRange(tags.map((tag) => `tag:${tag}:topics`), 0, -1)
                : yield Topics.db.getSortedSetRevRangeByScore(tags.map((tag) => `tag:${tag}:topics`), 0, -1, '+inf', Date.now() - cutoff);
            tids = tids.filter((_tid) => _tid !== tid); // remove self
            return lodash_1.default.shuffle(lodash_1.default.uniq(tids)).slice(0, 10).map(Number);
        });
    }
    function getSearchTids(tid, uid, cutoff, Topics) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicData = yield Topics.getTopicFields(tid, ['title', 'cid']);
            const data = yield Topics.search.search({
                query: topicData.title,
                searchIn: 'titles',
                matchWords: 'any',
                categories: [topicData.cid],
                uid: uid,
                returnIds: true,
                timeRange: cutoff !== 0 ? cutoff / 1000 : 0,
                timeFilter: 'newer',
            });
            data.tids = data.tids.filter((_tid) => _tid !== tid); // remove self
            return lodash_1.default.shuffle(data.tids).slice(0, 10).map(Number);
        });
    }
    function getCategoryTids(tid, cutoff, Topics) {
        return __awaiter(this, void 0, void 0, function* () {
            const cid = yield Topics.getTopicField(tid, 'cid');
            const tids = cutoff === 0
                ? yield Topics.db.getSortedSetRevRange(`cid:${cid}:tids:lastposttime`, 0, 9)
                : yield Topics.db.getSortedSetRevRangeByScore(`cid:${cid}:tids:lastposttime`, 0, 9, '+inf', Date.now() - cutoff);
            return lodash_1.default.shuffle(tids.map(Number).filter((_tid) => _tid !== tid));
        });
    }
    ;
};
