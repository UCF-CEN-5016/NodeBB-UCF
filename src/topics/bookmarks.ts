


import async = require('async');

import db = require('../database');
import user = require('../user');

interface topics {
    getUserBookmark: (tid: string, uid: string) => Promise<number>;
    getUserBookmarks: (tids: string[], uid: string) => Promise<number[]>;
    setUserBookmark: (arg0: string, arg1: number, arg2: number) => Promise<void>;
    getTopicBookmarks: (arg0: string) => Promise<{ value: number; score: string; }[]>;
    updateTopicBookmarks: (tid: string, pids: string[]) => Promise<void>;
    getPostCount: (arg0: string) => number | PromiseLike<number>;
}
module.exports = function (Topics: topics) {
    Topics.getUserBookmark = async function (tid: string, uid: string): Promise<number> {
        if (parseInt(uid, 10) <= 0) {
            return null;
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await db.sortedSetScore(`tid:${tid}:bookmarks`, uid) as number;
    };

    Topics.getUserBookmarks = async function (tids: string[], uid: string): Promise<number[]> {
        if (parseInt(uid, 10) <= 0) {
            return tids.map(() => null) as number[];
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await db.sortedSetsScore(tids.map((tid: string) => `tid:${tid}:bookmarks`), uid) as number[];
    };

    Topics.setUserBookmark = async function (tid: string, uid: number, index: number): Promise<void> {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.sortedSetAdd(`tid:${tid}:bookmarks`, index, uid);
    };

    Topics.getTopicBookmarks = async function (tid: string): Promise<{ value: number; score: string; }[]> {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await db.getSortedSetRangeWithScores(`tid:${tid}:bookmarks`, 0, -1) as { value: number; score: string; }[];
    };

    Topics.updateTopicBookmarks = async function (tid: string, pids: string[]) {
        const maxIndex: number = await Topics.getPostCount(tid);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const indices: number[] = await db.sortedSetRanks(`tid:${tid}:posts`, pids) as number[];
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const postIndices: number[] = indices.map((i: number) => (i === null ? 0 : i + 1));

        const minIndex: number = Math.min(...postIndices);

        const bookmarks: { value: number; score: string; }[] = await Topics.getTopicBookmarks(tid);

        const uidData = bookmarks
            .map((b: { value: number; score: string; }) => ({ uid: b.value, bookmark: parseInt(b.score, 10) }))
            .filter((data: { bookmark: number; }) => data.bookmark >= minIndex);

        await async.eachLimit(uidData, 50, (data: { bookmark: number; uid: number; }) => {
            (async () => {
                let bookmark = Math.min(data.bookmark, maxIndex);

                postIndices.forEach((i: number) => {
                    if (i < data.bookmark) {
                        bookmark -= 1;
                    }
                });
                // make sure the bookmark is valid if we removed the last post
                bookmark = Math.min(bookmark, maxIndex - pids.length);
                if (bookmark === data.bookmark) {
                    return;
                }
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                const settings: {topicPostSort: string} = await user.getSettings(data.uid) as {topicPostSort: string};
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (settings.topicPostSort === 'most_votes') {
                    return;
                }

                await Topics.setUserBookmark(tid, data.uid, bookmark);
            })().catch((e) => {
                console.error(e);
            });
        });
    };
};
