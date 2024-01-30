import db = require('../database');
import user = require('../user');

module.exports = function (Categories: MyCategories) {
    Categories.watchStates = {
        ignoring: 1,
        notwatching: 2,
        watching: 3,
    };

    Categories.isIgnored = async function (cids: number[], uid: number) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        if (!(parseInt(uid.toString(), 10) > 0)) {
            return cids.map(() => false);
        }
        const states = await Categories.getWatchState(cids, uid);
        return states.map(state => state === Categories.watchStates.ignoring);
    };

    Categories.getWatchState = async function (cids: number[], uid: number) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        if (!(parseInt(uid.toString(), 10) > 0)) {
            return cids.map(() => Categories.watchStates.notwatching);
        }
        if (!Array.isArray(cids) || !cids.length) {
            return [];
        }
        const keys = cids.map(cid => `cid:${cid}:uid:watch:state`);
        const [userSettings, states] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            user.getSettings(uid),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            db.sortedSetsScore(keys, uid),
        ]) as [MyUserSettings, number[]];

        return states.map(state => state || Categories.watchStates[userSettings.categoryWatchState]);
    };

    Categories.getIgnorers = async function (cid: number, start: number, stop: number) {
        const count = (stop === -1) ? -1 : (stop - start + 1);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await db.getSortedSetRevRangeByScore(`cid:${cid}:uid:watch:state`, start, count, Categories.watchStates.ignoring, Categories.watchStates.ignoring) as Promise<number[]>;
    };

    Categories.filterIgnoringUids = async function (cid: number, uids: number[]) {
        const states = await Categories.getUidsWatchStates(cid, uids);
        const readingUids = uids.filter((uid, index) => uid && states[index] !== Categories.watchStates.ignoring);
        return readingUids;
    };

    Categories.getUidsWatchStates = async function (cid: number, uids: number[]) {
        const [userSettings, states] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            user.getMultipleUserSettings(uids),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            db.sortedSetScores(`cid:${cid}:uid:watch:state`, uids),
        ]) as [MyUserSettings[], number[]];

        return states.map((state, index) => state || Categories.watchStates[userSettings[index].categoryWatchState]);
    };
};

interface MyCategories {
    watchStates: {
        ignoring: number;
        notwatching: number;
        watching: number;
    };

    isIgnored: (cids: number[], uid: number) => Promise<boolean[]>;
    getWatchState: (cids: number[], uid: number) => Promise<number[]>;
    getIgnorers: (cid: number, start: number, stop: number) => Promise<number[]>;
    filterIgnoringUids: (cid: number, uids: number[]) => Promise<number[]>;
    getUidsWatchStates: (cid: number, uids: number[]) => Promise<number[]>;
}

interface MyUserSettings {
    categoryWatchState: keyof MyCategories['watchStates'];
}
