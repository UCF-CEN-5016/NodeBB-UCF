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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable import/no-import-module-exports */
/* eslint-disable max-len */
const validator = require("validator");
const lodash_1 = __importDefault(require("lodash"));
const database_1 = __importDefault(require("./database"));
const batch_1 = __importDefault(require("./batch"));
const user_1 = __importDefault(require("./user"));
const utils_1 = __importDefault(require("./utils"));
const plugins_1 = __importDefault(require("./plugins"));
const events = module.exports;
events.types = [
    'plugin-activate',
    'plugin-deactivate',
    'plugin-install',
    'plugin-uninstall',
    'restart',
    'build',
    'config-change',
    'settings-change',
    'category-purge',
    'privilege-change',
    'post-delete',
    'post-restore',
    'post-purge',
    'post-edit',
    'post-move',
    'post-change-owner',
    'post-queue-reply-accept',
    'post-queue-topic-accept',
    'post-queue-reply-reject',
    'post-queue-topic-reject',
    'topic-delete',
    'topic-restore',
    'topic-purge',
    'topic-rename',
    'topic-merge',
    'topic-fork',
    'topic-move',
    'topic-move-all',
    'password-reset',
    'user-makeAdmin',
    'user-removeAdmin',
    'user-ban',
    'user-unban',
    'user-mute',
    'user-unmute',
    'user-delete',
    'user-deleteAccount',
    'user-deleteContent',
    'password-change',
    'email-confirmation-sent',
    'email-change',
    'username-change',
    'ip-blacklist-save',
    'ip-blacklist-addRule',
    'registration-approved',
    'registration-rejected',
    'group-join',
    'group-request-membership',
    'group-add-member',
    'group-leave',
    'group-owner-grant',
    'group-owner-rescind',
    'group-accept-membership',
    'group-reject-membership',
    'group-invite',
    'group-invite-accept',
    'group-invite-reject',
    'group-kick',
    'theme-set',
    'export:uploads',
    'account-locked',
    'getUsersCSV',
    // To add new types from plugins, just Array.push() to this array
];
function deleteEvents(eids) {
    return __awaiter(this, void 0, void 0, function* () {
        const keys = eids.map(eid => `event:${String(eid)}`);
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const eventData = yield database_1.default.getObjectsFields(keys, [
            'type',
        ]);
        const sets = lodash_1.default.uniq(['events:time'].concat(eventData.map(e => `events:time:${e.type}`)));
        yield Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            database_1.default.deleteAll(keys),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            database_1.default.sortedSetRemove(sets, eids),
        ]);
    });
}
function addUserData(eventsData, field, objectName) {
    return __awaiter(this, void 0, void 0, function* () {
        const uids = lodash_1.default.uniq(eventsData.map(event => event && event[field]));
        if (!uids.length) {
            return eventsData;
        }
        const [isAdmin, userData] = yield Promise.all([
            user_1.default.isAdministrator(uids),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call,
            user_1.default.getUsersFields(uids, ['username', 'userslug', 'picture']),
        ]);
        const map = {};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        userData.forEach((user, index) => {
            user.isAdmin = isAdmin[index];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            map[user.uid] = user;
        });
        eventsData.forEach((event) => {
            if (map[event[field]]) {
                event[objectName] = map[event[field]];
            }
        });
        return eventsData;
    });
}
events.log = function (data) {
    return __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const eid = yield database_1.default.incrObjectField('global', 'nextEid');
        data.timestamp = Date.now();
        data.eid = eid;
        yield Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            database_1.default.sortedSetsAdd(['events:time', `events:time:${data.type}`], data.timestamp, eid),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            database_1.default.setObject(`event:${eid}`, data),
        ]);
        yield plugins_1.default.hooks.fire('action:events.log', { data: data });
    });
};
events.addUserData = function (eventsData, field, objectName) {
    return __awaiter(this, void 0, void 0, function* () {
        const uids = lodash_1.default.uniq(eventsData.map(event => event && event[field]));
        if (!uids.length) {
            return eventsData;
        }
        const [isAdmin, userData] = yield Promise.all([
            user_1.default.isAdministrator(uids),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call,
            user_1.default.getUsersFields(uids, ['username', 'userslug', 'picture']),
        ]);
        const map = {};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        userData.forEach((user, index) => {
            user.isAdmin = isAdmin[index];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            map[user.uid] = user;
        });
        eventsData.forEach((event) => {
            if (map[event[field]]) {
                event[objectName] = map[event[field]];
            }
        });
        return eventsData;
    });
};
events.deleteEvents = function (eids) {
    return __awaiter(this, void 0, void 0, function* () {
        const keys = eids.map(eid => `event:${String(eid)}`);
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const eventData = yield database_1.default.getObjectsFields(keys, [
            'type',
        ]);
        const sets = lodash_1.default.uniq(['events:time'].concat(eventData.map(e => `events:time:${e.type}`)));
        yield Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            database_1.default.deleteAll(keys),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            database_1.default.sortedSetRemove(sets, eids),
        ]);
    });
};
events.getEvents = function (filter, start, stop, from, to) {
    return __awaiter(this, void 0, void 0, function* () {
        // from/to optional
        if (from === undefined) {
            from = 0;
        }
        if (to === undefined) {
            to = Date.now();
        }
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const eids = yield database_1.default.getSortedSetRevRangeByScore(`events:time${filter ? `:${filter}` : ''}`, start, stop - start + 1, to, from);
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        let eventsData = yield database_1.default.getObjects(eids.map((eid) => `event:${eid}`));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        eventsData = eventsData.filter(Boolean);
        yield addUserData(eventsData, 'uid', 'user');
        yield addUserData(eventsData, 'targetUid', 'targetUser');
        eventsData.forEach((event) => {
            Object.keys(event).forEach((key) => {
                if (typeof event[key] === 'string') {
                    event[key] = validator.escape(String(event[key] || ''));
                }
            });
            console.log('The Event in question: ', event);
            const e = utils_1.default.merge(event);
            e.eid = undefined;
            e.uid = undefined;
            e.type = undefined; // change back to undefined if tests are not working
            e.ip = undefined;
            e.user = undefined;
            event.jsonString = JSON.stringify(e, null, 4);
            event.timestampISO = new Date(parseInt(event.timestamp, 10)).toUTCString();
        });
        return eventsData;
    });
};
events.deleteAll = function () {
    return __awaiter(this, void 0, void 0, function* () {
        yield batch_1.default.processSortedSet('events:time', (eids) => __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            yield deleteEvents(eids);
        }), { alwaysStartAt: 0, batch: 500 });
    });
};
