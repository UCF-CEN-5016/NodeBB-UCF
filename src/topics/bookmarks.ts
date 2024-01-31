import async from 'async';
import db from '../database';
import user from '../user';

interface Topics {
  getUserBookmark(tid: string, uid: string): Promise<number | null>;
  getUserBookmarks(tids: string[], uid: string): Promise<(number | null)[]>;
  setUserBookmark(tid: string, uid: string, index: number): Promise<void>;
  getTopicBookmarks(tid: string): Promise<{ value: string; score: number }[]>;
  updateTopicBookmarks(tid: string, pids: string[]): Promise<void>;
  getPostCount(tid: string): Promise<number>; 
}

export = function (Topics: Topics): void {
    Topics.getUserBookmark = async function (tid: string, uid: string): Promise<number | null> {
        if (parseInt(uid, 10) <= 0) {
        return null;
        }
        const score = await db.sortedSetScore(`tid:${tid}:bookmarks`, uid);
        return score !== null ? score : null;
    };

    Topics.getUserBookmarks = async function (tids: string[], uid: string): Promise<(number | null)[]> {
        if (parseInt(uid, 10) <= 0) {
        return tids.map(() => null);
        }

        const scoresPromises: Promise<number | null>[] = tids.map((tid) =>
        db.sortedSetScore(`tid:${tid}:bookmarks`, uid)
        );
        const scores: (number | null)[] = await Promise.all(scoresPromises);
        return scores.map((score) => (score !== null ? score : null));
    };

    Topics.setUserBookmark = async function (tid: string, uid: string, index: number): Promise<void> {
        await db.sortedSetAdd(`tid:${tid}:bookmarks`, index, uid);
    };

    Topics.getTopicBookmarks = async function (tid: string): Promise<{ value: string; score: number }[]> {
        return await db.getSortedSetRangeWithScores(`tid:${tid}:bookmarks`, 0, -1);
    };

    Topics.updateTopicBookmarks = async function (tid: string, pids: string[]): Promise<void> {
        const maxIndex: number = await Topics.getPostCount(tid);
        const indices: (number | null)[] = await db.sortedSetRanks(`tid:${tid}:posts`, pids);
        const postIndices: number[] = indices.map((i) => (i === null ? 0 : i + 1));
        const minIndex: number = Math.min(...postIndices);

        const bookmarks: { value: string; score: number }[] = await Topics.getTopicBookmarks(tid);

        const uidData: { uid: string; bookmark: number }[] = bookmarks
        .map((b) => ({ uid: b.value, bookmark: parseInt(b.score.toString(), 10) }))
        .filter((data) => data.bookmark >= minIndex);

        await async.eachLimit(uidData, 50, async (data: { uid: string; bookmark: number }) => {
        let bookmark: number = Math.min(data.bookmark, maxIndex);

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

        const settings = await user.getSettings(data.uid);
        if (settings.topicPostSort === 'most_votes') {
            return;
        }

        await Topics.setUserBookmark(tid, data.uid, bookmark);
        });
    };
};
