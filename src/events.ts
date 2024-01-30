/* eslint-disable import/no-import-module-exports */
/* eslint-disable max-len */
import validator = require('validator');
import _ from 'lodash';

import db from './database';
import batch from './batch';
import user from './user';
import utils from './utils';
import plugins from './plugins';



/**
 * Useful options in data: type, uid, ip, targetUid
 * Everything else gets stringified and shown as pretty JSON string
 */


interface Events {
    types: string[];
    log:(data: {
        type: string;
        timestamp: number;
        eid: number;
      }) => Promise<void>;
      addUserData: (eventsData: {
            [field: string]: string;
            jsonString: string;
            timestampISO: string;
            timestamp: string;
          }[], string: string, objectName: string) => Promise<{ [field: string]: string; jsonString: string; timestampISO: string; timestamp: string; }[]>;
      deleteEvents: (eids: []) => Promise<void>;
      getEvents: (filter: string, start: number, stop: number, from: number, to: number) => Promise<{ jsonString: string; timestampISO: string; timestamp: string; }[]>;
      deleteAll: () => Promise<void>;
}

const events: Events = module.exports as Events;

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

async function deleteEvents(eids: []) {
    const keys = eids.map(eid => `event:${String(eid)}`);
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const eventData: Array<{ type: string }> = await db.getObjectsFields(keys, [
        'type',
    ]);
    const sets = _.uniq(
        ['events:time'].concat(eventData.map(e => `events:time:${e.type}`))
    );
    await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        db.deleteAll(keys),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        db.sortedSetRemove(sets, eids),
    ]);
}

async function addUserData(
    eventsData: Array<{
    [field: string]: string;
    jsonString: string;
    timestampISO: string;
    timestamp: string;
  }>,
    field: string,
    objectName: string
) {
    const uids = _.uniq(eventsData.map(event => event && event[field]));

    if (!uids.length) {
        return eventsData;
    }

    const [isAdmin, userData]: [boolean[], object[]] = await Promise.all([
    user.isAdministrator(uids) as Promise<boolean[]>,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,
    user.getUsersFields(uids, ['username', 'userslug', 'picture']) as Promise<
      object[]
    >,
    ]);

    const map: Record<string, object | string> = {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    userData.forEach(
        (user: { isAdmin: boolean; uid: string }, index: number) => {
            user.isAdmin = isAdmin[index];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            map[user.uid] = user;
        }
    );

    eventsData.forEach((event) => {
        if (map[event[field]]) {
            event[objectName] = map[event[field]] as string;
        }
    });
    return eventsData;
}

events.log = async function (data: {
  type: string;
  timestamp: number;
  eid: number;
}) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const eid: number = await db.incrObjectField('global', 'nextEid');
    data.timestamp = Date.now();
    data.eid = eid;

    await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        db.sortedSetsAdd(
            ['events:time', `events:time:${data.type}`],
            data.timestamp,
            eid
        ),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        db.setObject(`event:${eid}`, data),
    ]);
    await plugins.hooks.fire('action:events.log', { data: data });
};

events.addUserData = async function (
    eventsData: Array<{
    [field: string]: string;
    jsonString: string;
    timestampISO: string;
    timestamp: string;
  }>,
    field: string,
    objectName: string
) {
    const uids = _.uniq(eventsData.map(event => event && event[field]));

    if (!uids.length) {
        return eventsData;
    }

    const [isAdmin, userData]: [boolean[], object[]] = await Promise.all([
    user.isAdministrator(uids) as Promise<boolean[]>,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,
    user.getUsersFields(uids, ['username', 'userslug', 'picture']) as Promise<
      object[]
    >,
    ]);

    const map: Record<string, object | string> = {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    userData.forEach(
        (user: { isAdmin: boolean; uid: string }, index: number) => {
            user.isAdmin = isAdmin[index];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            map[user.uid] = user;
        }
    );

    eventsData.forEach((event) => {
        if (map[event[field]]) {
            event[objectName] = map[event[field]] as string;
        }
    });
    return eventsData;
};

events.deleteEvents = async function (eids: []) {
    const keys = eids.map(eid => `event:${String(eid)}`);
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const eventData: Array<{ type: string }> = await db.getObjectsFields(keys, [
        'type',
    ]);
    const sets = _.uniq(
        ['events:time'].concat(eventData.map(e => `events:time:${e.type}`))
    );
    await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        db.deleteAll(keys),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        db.sortedSetRemove(sets, eids),
    ]);
};

events.getEvents = async function (
    filter: string,
    start: number,
    stop: number,
    from: number,
    to: number
) {
    // from/to optional
    if (from === undefined) {
        from = 0;
    }
    if (to === undefined) {
        to = Date.now();
    }

    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const eids = await db.getSortedSetRevRangeByScore(
        `events:time${filter ? `:${filter}` : ''}`,
        start,
        stop - start + 1,
        to,
        from
    );
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    let eventsData: Array<{
    jsonString: string;
    timestampISO: string;
    timestamp: string;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  } | null> = await db.getObjects(eids.map((eid: string) => `event:${eid}`));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    eventsData = eventsData.filter(Boolean);
    await addUserData(eventsData, 'uid', 'user');
    await addUserData(eventsData, 'targetUid', 'targetUser');
    eventsData.forEach((event) => {
        Object.keys(event).forEach((key) => {
            if (typeof event[key] === 'string') {
                event[key] = validator.escape(String(event[key] || ''));
            }
        });
        const e = utils.merge(event);
        e.eid = undefined;
        e.uid = undefined;
        e.type = undefined;
        e.ip = undefined;
        e.user = undefined;
        event.jsonString = JSON.stringify(e, null, 4);
        event.timestampISO = new Date(parseInt(event.timestamp, 10)).toUTCString();
    });
    return eventsData;
};

events.deleteAll = async function () {
    await batch.processSortedSet(
        'events:time',
        async (eids: []) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            await deleteEvents(eids);
        },
        { alwaysStartAt: 0, batch: 500 }
    );
};



