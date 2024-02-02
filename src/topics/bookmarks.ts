/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
          @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment,
          @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-misused-promises
          , @typescript-eslint/no-unsafe-argument */
import async = require('async');
import db = require('../database');
import user = require('../user');

interface Topic {
    getUserBookmark: (tid: number, uid: string) => Promise<number | null>;
    getUserBookmarks: (tids: number[], uid: string) => Promise<(number | null)[]>;
    setUserBookmark: (tid: number, uid: string, index: number) => Promise<void>;
    getPostCount: (tid: number) => number | PromiseLike<number>;
    getTopicBookmarks: (tid: number) => Promise<{
        score: string;
        value: number;
        uid: number;
        bookmark: number;
    }[]>;
    updateTopicBookmarks: (tid: number, pids: number[]) => Promise<void>;
}

module.exports = function (Topics: Topic) {
    Topics.getUserBookmark = async function (tid, uid) : Promise<number | null> {
        if (parseInt(uid, 10) <= 0) {
            return null;
        }
        return await db.sortedSetScore(`tid:${tid}:bookmarks`, uid) as number;
    };

    Topics.getUserBookmarks = async function (tids, uid) {
        if (parseInt(uid, 10) <= 0) {
            return tids.map(() => null);
        }
        return await db.sortedSetsScore(tids.map(tid => `tid:${tid}:bookmarks`), uid);
    };

    Topics.setUserBookmark = async function (tid, uid, index) {
        await db.sortedSetAdd(`tid:${tid}:bookmarks`, index, uid);
    };

    Topics.getTopicBookmarks = async function (tid) {
        return await db.getSortedSetRangeWithScores(`tid:${tid}:bookmarks`, 0, -1);
    };

    Topics.updateTopicBookmarks = async function (tid, pids) {
        const maxIndex = await Topics.getPostCount(tid);
        const indices = await db.sortedSetRanks(`tid:${tid}:posts`, pids);
        const postIndices = indices.map(i => (i === null ? 0 : i + 1));
        const minIndex = Math.min(...postIndices);

        const bookmarks = await Topics.getTopicBookmarks(tid);

        const uidData = bookmarks.map(b => ({ uid: String(b.value), bookmark: parseInt(b.score, 10) }))
            .filter(data => data.bookmark >= minIndex);

        await async.eachLimit(uidData, 50, async (data) => {
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

            const settings = await user.getSettings(data.uid);
            if (settings.topicPostSort === 'most_votes') {
                return;
            }

            await Topics.setUserBookmark(tid, data.uid, bookmark);
        });
    };
};
