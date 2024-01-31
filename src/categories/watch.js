// import db from '../database';
// import user from '../user';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Use dynamic import to import CommonJS modules
const dbPromise = Promise.resolve().then(() => __importStar(require('../database')));
const userPromise = Promise.resolve().then(() => __importStar(require('../user')));
// Use Promise.all to wait for both modules to be imported
Promise.all([dbPromise, userPromise])
    .then(([db, user]) => {
    module.exports = function (Categories) {
        Categories.watchStates = {
            ignoring: 1,
            notwatching: 2,
            watching: 3,
        };
        Categories.isIgnored = function (cids, uid) {
            return __awaiter(this, void 0, void 0, function* () {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                if (!(parseInt(uid.toString(), 10) > 0)) {
                    return cids.map(() => false);
                }
                const states = yield Categories.getWatchState(cids, uid);
                return states.map(state => state === Categories.watchStates.ignoring);
            });
        };
        Categories.getWatchState = function (cids, uid) {
            return __awaiter(this, void 0, void 0, function* () {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                if (!(parseInt(uid.toString(), 10) > 0)) {
                    return cids.map(() => Categories.watchStates.notwatching);
                }
                if (!Array.isArray(cids) || !cids.length) {
                    return [];
                }
                const keys = cids.map(cid => `cid:${cid}:uid:watch:state`);
                const [userSettings, states] = yield Promise.all([
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    user.getSettings(uid),
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line max-len
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    db.sortedSetsScore(keys, uid),
                ]);
                return states.map(state => state || Categories.watchStates[userSettings.categoryWatchState]);
            });
        };
        Categories.getIgnorers = function (cid, start, stop) {
            return __awaiter(this, void 0, void 0, function* () {
                const count = (stop === -1) ? -1 : (stop - start + 1);
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line max-len
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                return yield db.getSortedSetRevRangeByScore(`cid:${cid}:uid:watch:state`, start, count, Categories.watchStates.ignoring, Categories.watchStates.ignoring);
            });
        };
        Categories.filterIgnoringUids = function (cid, uids) {
            return __awaiter(this, void 0, void 0, function* () {
                const states = yield Categories.getUidsWatchStates(cid, uids);
                // eslint-disable-next-line max-len
                const readingUids = uids.filter((uid, index) => uid && states[index] !== Categories.watchStates.ignoring);
                return readingUids;
            });
        };
        Categories.getUidsWatchStates = function (cid, uids) {
            return __awaiter(this, void 0, void 0, function* () {
                const [userSettings, states] = yield Promise.all([
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    user.getMultipleUserSettings(uids),
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line max-len
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    db.sortedSetScores(`cid:${cid}:uid:watch:state`, uids),
                ]);
                // eslint-disable-next-line max-len
                return states.map((state, index) => state || Categories.watchStates[userSettings[index].categoryWatchState]);
            });
        };
    };
})
    .catch((error) => {
    console.error('Error importing modules:', error);
});
