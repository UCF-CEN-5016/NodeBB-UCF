import * as async from "async";
import * as db from "../database";
import * as user from "../user";

interface BookmarkData {
  uid: number;
  bookmark: number;
}

interface Topics {
  getUserBookmark(tid: number, uid: number): Promise<number | null>;
  getUserBookmarks(tids: number[], uid: number): Promise<(number | null)[]>;
  setUserBookmark(tid: number, uid: number, index: number): Promise<void>;
  getTopicBookmarks(tid: number): Promise<{ value: number; score: number }[]>;
  updateTopicBookmarks(tid: number, pids: number[]): Promise<void>;
  getPostCount(tid: number): Promise<number>;
}

export = function (Topics: Topics) {
  Topics.getUserBookmark = async function (
    tid: number,
    uid: number
  ): Promise<number | null> {
    if (parseInt(uid.toString(), 10) <= 0) {
      return null;
    }
    return (await db.sortedSetScore(`tid:${tid}:bookmarks`, uid)) ?? null;
  };

  Topics.getUserBookmarks = async function (
    tids: number[],
    uid: number
  ): Promise<(number | null)[]> {
    if (parseInt(uid.toString(), 10) <= 0) {
      return tids.map(() => null);
    }
    const scores = await db.sortedSetsScore(
      tids.map((tid) => `tid:${tid}:bookmarks`),
      uid
    );
    return scores.map((score) => score ?? null);
  };

  Topics.setUserBookmark = async function (
    tid: number,
    uid: number,
    index: number
  ): Promise<void> {
    await db.sortedSetAdd(`tid:${tid}:bookmarks`, index, uid);
  };

  Topics.getTopicBookmarks = async function (
    tid: number
  ): Promise<{ value: number; score: number }[]> {
    return await db.getSortedSetRangeWithScores(`tid:${tid}:bookmarks`, 0, -1);
  };

  Topics.updateTopicBookmarks = async function (
    tid: number,
    pids: number[]
  ): Promise<void> {
    const maxIndex = await Topics.getPostCount(tid);
    const indices = await db.sortedSetRanks(`tid:${tid}:posts`, pids);
    const postIndices = indices.map((i) => (i === null ? 0 : i + 1));
    const minIndex = Math.min(...postIndices);

    const bookmarks = await Topics.getTopicBookmarks(tid);

    const uidData: BookmarkData[] = bookmarks
      .map((b) => ({
        uid: b.value,
        bookmark: parseInt(b.score.toString(), 10),
      }))
      .filter((data) => data.bookmark >= minIndex);

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
      if (settings.topicPostSort === "most_votes") {
        return;
      }

      await Topics.setUserBookmark(tid, data.uid, bookmark);
    });
  };
};
