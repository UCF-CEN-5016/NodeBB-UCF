'use strict';

import * as db from '../database';
import * as user from '../user';

module.exports = function (Categories: any) {
    Categories.watchStates = {
        ignoring: 1,
        notwatching: 2,
        watching: 3,
    };

    Categories.isIgnored = async function (cids: number[], uid: string) {
        if (!(parseInt(uid, 10) > 0)) {
            return cids.map(() => false);
        }
        const states = await Categories.getWatchState(cids, uid);
        return states.map((state: number) => state === Categories.watchStates.ignoring);
    };

    Categories.getWatchState = async function (cids: number[], uid: string) {
        if (!(parseInt(uid, 10) > 0)) {
            return cids.map(() => Categories.watchStates.notwatching);
        }
        if (!Array.isArray(cids) || !cids.length) {
            return [];
        }
        const keys = cids.map((cid: number) => `cid:${cid}:uid:watch:state`);
        const [userSettings, states] = await Promise.all([
            user.getSettings(uid),
            db.sortedSetsScore(keys, uid),
        ]);
        return states.map((state: number) => state || Categories.watchStates[userSettings.categoryWatchState]);
    };

    Categories.getIgnorers = async function (cid: number, start: number, stop: number) {
        const count = (stop === -1) ? -1 : (stop - start + 1);
        return await db.getSortedSetRevRangeByScore(`cid:${cid}:uid:watch:state`, start, count, Categories.watchStates.ignoring, Categories.watchStates.ignoring);
    };

    Categories.filterIgnoringUids = async function (cid: number, uids: string[]) {
        const states = await Categories.getUidsWatchStates(cid, uids);
        const readingUids = uids.filter((uid: string, index: number) => uid && states[index] !== Categories.watchStates.ignoring);
        return readingUids;
    };

    Categories.getUidsWatchStates = async function (cid: number, uids: string[]) {
        const [userSettings, states] = await Promise.all([
            user.getMultipleUserSettings(uids),
            db.sortedSetScores(`cid:${cid}:uid:watch:state`, uids),
        ]);
        return states.map((state: number, index: number) => state || Categories.watchStates[userSettings[index].categoryWatchState]);
    };
};
