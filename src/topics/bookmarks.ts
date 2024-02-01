import * as async from 'async';
import * as db from '../database';
import * as user from '../user';

interface Topics {
  getPostCount(tid: number): Promise<number>;
  getUserBookmark(tid: number, uid: number): Promise<number>;
  getUserBookmarks(tids: number[], uid: number): Promise<(number)[]>;
  setUserBookmark(tid: number, uid: number, index: number): Promise<void>;
  getTopicBookmarks(tid: number): Promise<{ value: number; score: number }[]>;
  updateTopicBookmarks(tid: number, pids: number[]): Promise<void>;
}

export = function (Topics: Topics) {
    Topics.getUserBookmark = async function (tid: number, uid: number): Promise<number> {
        if (parseInt(uid.toString(), 10) <= 0 || isNaN(tid) || isNaN(uid)) {
        return null;
        }
        return await db.sortedSetScore(`tid:${tid}:bookmarks`, uid);
    };

    Topics.getUserBookmarks = async function (tids: number[], uid: number): Promise<(number)[]> {
        if (parseInt(uid.toString(), 10) <= 0 || tids.some(isNaN) || isNaN(uid)) {
        return tids.map(() => null);
        }
        return await db.sortedSetsScore(tids.map(tid => `tid:${tid}:bookmarks`), uid);
    };

    Topics.setUserBookmark = async function (tid: number, uid: number, index: number): Promise<void> {
        if (isNaN(tid) || isNaN(uid) || isNaN(index)) {
        throw new Error('Invalid input');
        }
        await db.sortedSetAdd(`tid:${tid}:bookmarks`, index, uid);
    };


    Topics.getTopicBookmarks = async function (tid: number): Promise<{ value: number; score: number }[]> {
        return await db.getSortedSetRangeWithScores(`tid:${tid}:bookmarks`, 0, -1);
    };

    Topics.updateTopicBookmarks = async function (tid: number, pids: number[]): Promise<void> {
        const maxIndex = await Topics.getPostCount(tid);
        const indices = await db.sortedSetRanks(`tid:${tid}:posts`, pids);
        const postIndices = indices.map(i => (i === null ? 0 : i + 1));
        const minIndex = Math.min(...postIndices);

        const bookmarks = await Topics.getTopicBookmarks(tid);

        const uidData = bookmarks
            .map(b => ({ uid: b.value, bookmark: parseInt(b.score.toString(), 10) }))
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
