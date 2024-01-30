import db = require('../database');
import user = require('../user');

interface Categories {
    watchStates: {
        ignoring: number;
        notwatching: number;
        watching: number;
    };
    isIgnored(cids: number[], uid: string): Promise<boolean[]>;
    getWatchState(cids: number[], uid: string): Promise<number[]>;
    getIgnorers(cid: number, start: number, stop: number): Promise<string[]>;
    filterIgnoringUids(cid: number, uids: string[]): Promise<string[]>;
    getUidsWatchStates(cid: number, uids: string[]): Promise<number[]>;
}
module.exports = function (Categories:Categories) {
    Categories.watchStates = {
        ignoring: 1,
        notwatching: 2,
        watching: 3,
    };

    Categories.isIgnored = async function (cids, uid) {
        if (!(parseInt(uid, 10) > 0)) {
            return cids.map(() => false);
        }
        const states = await Categories.getWatchState(cids, uid);
        return states.map(state => state === Categories.watchStates.ignoring);
    };

    Categories.getWatchState = async function (cids, uid) {
        if (!(parseInt(uid, 10) > 0)) {
            return cids.map(() => Categories.watchStates.notwatching);
        }
        if (!Array.isArray(cids) || !cids.length) {
            return [];
        }
        const keys = cids.map(cid => `cid:${cid}:uid:watch:state`);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [userSettings, states] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            user.getSettings(uid),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            db.sortedSetsScore(keys, uid),
        ]);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line  @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return states.map((state, index) => state || Categories.watchStates[userSettings[index].categoryWatchState]);
    };

    Categories.getIgnorers = async function (cid, start, stop) {
        const count = (stop === -1) ? -1 : (stop - start + 1);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line  @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return await db.getSortedSetRevRangeByScore(`cid:${cid}:uid:watch:state`, start, count, Categories.watchStates.ignoring, Categories.watchStates.ignoring);
    };

    Categories.filterIgnoringUids = async function (cid, uids) {
        const states = await Categories.getUidsWatchStates(cid, uids);
        const readingUids = uids.filter((uid, index) => uid && states[index] !== Categories.watchStates.ignoring);
        return readingUids;
    };

    Categories.getUidsWatchStates = async function (cid, uids) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [userSettings, states] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            user.getMultipleUserSettings(uids),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
            db.sortedSetScores(`cid:${cid}:uid:watch:state`, uids),
        ]);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return states.map((state, index) => state || Categories.watchStates[userSettings[index].categoryWatchState]);
    };
};
