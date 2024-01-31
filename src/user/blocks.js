"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const db = require("../database");
const plugins = require("../plugins");
const cacheCreate = require("../cache/lru");
function blockFunction(User) {
    User.blocks = {
        _cache: cacheCreate({
            name: 'user:blocks',
            max: 100,
            ttl: 0,
        }),
        is: function (targetUid, uids) {
            return __awaiter(this, void 0, void 0, function* () {
                const isArray = Array.isArray(uids);
                const newUids = isArray ? uids : [uids];
                const blocks = yield User.blocks.list(newUids);
                const isBlocked = newUids.map((uid, index) => {
                    const blockList = blocks[index];
                    if (Array.isArray(blockList)) {
                        // Type guard to ensure blockList is treated as an array
                        const isUidBlocked = blockList.includes(parseInt(targetUid, 10) || 0);
                        return isUidBlocked;
                    }
                    // Handle the case where blockList is undefined or not an array
                    return false; // or handle it in a way that makes sense for your application
                });
                return isArray ? isBlocked : isBlocked[0];
            });
        },
        can: function (callerUid, blockerUid, blockeeUid, type) {
            return __awaiter(this, void 0, void 0, function* () {
                // Guests can't block
                if (blockerUid === 0 || blockeeUid === 0) {
                    throw new Error('[[error:cannot-block-guest]]');
                }
                else if (blockerUid === blockeeUid) {
                    throw new Error('[[error:cannot-block-self]]');
                }
                // Administrators and global moderators cannot be blocked
                // Only admins/mods can block users as another user
                const [isCallerAdminOrMod, isBlockeeAdminOrMod] = yield Promise.all([
                    User.isAdminOrGlobalMod(callerUid),
                    User.isAdminOrGlobalMod(String(blockeeUid)),
                ]);
                if (isBlockeeAdminOrMod && type === 'block') {
                    throw new Error('[[error:cannot-block-privileged]]');
                }
                // Changed to account for types of blockerUid
                let parsedBlockerUid;
                if (typeof blockerUid === 'string') {
                    parsedBlockerUid = parseInt(blockerUid, 10);
                }
                else {
                    parsedBlockerUid = blockerUid;
                }
                if (parseInt(callerUid, 10) !== parsedBlockerUid && !isCallerAdminOrMod) {
                    throw new Error('[[error:no-privileges]]');
                }
            });
        },
        list: function (uids) {
            return __awaiter(this, void 0, void 0, function* () {
                const isArray = Array.isArray(uids);
                let processedUids;
                if (isArray) {
                    processedUids = Array.isArray(uids) ? uids : [uids];
                }
                else {
                    processedUids = [uids];
                }
                // Changed assigned newUids instead of passing it to uids
                const newUids = processedUids.map(uid => parseInt(uid, 10));
                const cachedData = {};
                const unCachedUids = User.blocks._cache.getUnCachedKeys(uids, cachedData);
                if (unCachedUids.length) {
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line max-len
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
                    const unCachedData = yield db.getSortedSetsMembers(unCachedUids.map(uid => `uid:${uid}:blocked_uids`));
                    unCachedUids.forEach((uid, index) => {
                        cachedData[uid] = (unCachedData[index] || []).map((uid) => parseInt(uid, 10));
                        User.blocks._cache.set(uid, cachedData[uid]);
                    });
                }
                const result = newUids.map(uid => cachedData[uid] || []);
                return isArray ? result.slice() : result[0];
            });
        },
        add: function (targetUid, uid) {
            return __awaiter(this, void 0, void 0, function* () {
                yield User.blocks.applyChecks('block', targetUid, uid);
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                yield db.sortedSetAdd(`uid:${uid}:blocked_uids`, Date.now(), targetUid);
                yield User.incrementUserFieldBy(uid, 'blocksCount', 1);
                User.blocks._cache.del(uid);
                // void plugins.hooks.fire('action:user.blocks.add', { uid: uid, targetUid: targetUid });
                plugins.hooks
                    .fire('action:user.blocks.add', { uid: uid, targetUid: targetUid })
                    .then(() => {
                    // Handle success if necessary
                })
                    .catch((error) => {
                    console.error('An error occurred:', error);
                });
            });
        },
        remove: function (targetUid, uid) {
            return __awaiter(this, void 0, void 0, function* () {
                yield User.blocks.applyChecks('unblock', targetUid, uid);
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                yield db.sortedSetRemove(`uid:${uid}:blocked_uids`, targetUid);
                yield User.decrementUserFieldBy(uid, 'blocksCount', 1);
                User.blocks._cache.del(uid);
                plugins.hooks
                    .fire('action:user.blocks.remove', { uid: uid, targetUid: targetUid })
                    .then(() => {
                    // Handle success if necessary
                })
                    .catch((error) => {
                    console.error('An error occurred:', error);
                });
            });
        },
        applyChecks: function (type, targetUid, uid) {
            return __awaiter(this, void 0, void 0, function* () {
                yield User.blocks.can(uid, uid, targetUid, type);
                const isBlock = type === 'block';
                const is = yield User.blocks.is(String(targetUid), uid);
                if (is === isBlock) {
                    throw new Error(`[[error:already-${isBlock ? 'blocked' : 'unblocked'}]]`);
                }
            });
        },
        filterUids: function (targetUid, uids) {
            return __awaiter(this, void 0, void 0, function* () {
                const isBlocked = yield User.blocks.is(targetUid, uids);
                return uids.filter((uid, index) => !isBlocked[index]); // bug
            });
        },
        //comment
        filter: function (uid, property, set) {
            return __awaiter(this, void 0, void 0, function* () {
                // Set might also potentially be number[]
                // Given whatever is passed in, iterates through it, and removes entries made by blocked uids
                // property is optional
                if (Array.isArray(property) && typeof set === 'undefined') {
                    set = property;
                    // property = 'uid'; //removed since property is already a number
                }
                // Assume property is number
                if (!Array.isArray(set) || !set.length) {
                    return set;
                }
                // Ensure that set is an array before using the filter method
                if (!Array.isArray(set)) {
                    set = [set];
                }
                const isPlain = typeof set[0] !== 'object';
                const blocked_uids = yield User.blocks.list(uid);
                const flatBlockedUids = [].concat(...blocked_uids);
                const blockedSet = new Set(flatBlockedUids);
                set = set.filter(item => !blockedSet.has(parseInt(isPlain ? item : (item && item[property]), 10)));
                // Use set.filter only if set is an array
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const data = yield plugins.hooks.fire('filter:user.blocks.filter', { set: set, property: property, uid: uid, blockedSet: blockedSet });
                return data.set;
            });
        },
    };
}
module.exports = blockFunction;
