import _ from 'lodash';

import db from '../database';
import user from '../user';
import privileges from '../privileges';
import search from '../search';

export = function (Topics) {
    Topics.getSuggestedTopics = async function (
        tid: number,
        uid: number,
        start: number,
        stop: number,
        cutoff: number = 0
    ) {
        let tids: number[];
        tid = parseInt(tid.toString(), 10);
        cutoff = cutoff === 0 ? cutoff : cutoff * 2592000000;
        const [tagTids, searchTids] = await Promise.all([
            getTidsWithSameTags(tid, cutoff, Topics),
            getSearchTids(tid, uid, cutoff, Topics),
        ]);

        tids = _.uniq(tagTids.concat(searchTids));

        let categoryTids: number[] = [];
        if (stop !== -1 && tids.length < stop - start + 1) {
            categoryTids = await getCategoryTids(tid, cutoff, Topics);
        }
        tids = _.shuffle(_.uniq(tids.concat(categoryTids)));
        tids = await Topics.privileges.topics.filterTids('topics:read', tids, uid);

        let topicData = await Topics.getTopicsByTids(tids, uid);
        topicData = topicData.filter((topic: any) => topic && topic.tid !== tid);
        topicData = await Topics.user.blocks.filter(uid, topicData);
        topicData = topicData
            .slice(start, stop !== -1 ? stop + 1 : undefined)
            .sort((t1: any, t2: any) => t2.timestamp - t1.timestamp);
        return topicData;
    };

    async function getTidsWithSameTags(tid: number, cutoff: number, Topics) {
        const tags = await Topics.getTopicTags(tid);
        let tids = cutoff === 0
            ? await Topics.db.getSortedSetRevRange(tags.map((tag: string) => `tag:${tag}:topics`), 0, -1)
            : await Topics.db.getSortedSetRevRangeByScore(
                  tags.map((tag: string) => `tag:${tag}:topics`),
                  0,
                  -1,
                  '+inf',
                  Date.now() - cutoff
              );
        tids = tids.filter((_tid: number) => _tid !== tid); // remove self
        return _.shuffle(_.uniq(tids)).slice(0, 10).map(Number);
    }

    async function getSearchTids(tid: number, uid: number, cutoff: number, Topics) {
        const topicData = await Topics.getTopicFields(tid, ['title', 'cid']);
        const data = await Topics.search.search({
            query: topicData.title,
            searchIn: 'titles',
            matchWords: 'any',
            categories: [topicData.cid],
            uid: uid,
            returnIds: true,
            timeRange: cutoff !== 0 ? cutoff / 1000 : 0,
            timeFilter: 'newer',
        });
        data.tids = data.tids.filter((_tid: number) => _tid !== tid); // remove self
        return _.shuffle(data.tids).slice(0, 10).map(Number);
    }

    async function getCategoryTids(tid: number, cutoff: number, Topics) {
        const cid = await Topics.getTopicField(tid, 'cid');
        const tids = cutoff === 0
            ? await Topics.db.getSortedSetRevRange(`cid:${cid}:tids:lastposttime`, 0, 9)
            : await Topics.db.getSortedSetRevRangeByScore(
                  `cid:${cid}:tids:lastposttime`,
                  0,
                  9,
                  '+inf',
                  Date.now() - cutoff
              );
        return _.shuffle(tids.map(Number).filter((_tid: number) => _tid !== tid));
    };
};
