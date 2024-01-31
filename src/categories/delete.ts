// 'use strict';

import async = require('async');
import db = require('../database');
import batch = require('../batch');
import plugins = require('../plugins');
import topics = require('../topics');
import groups = require('../groups');
import privileges = require('../privileges');
import cache = require('../cache');

module.exports = function (Categories) {
    async function deleteTags(cid) {
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment,
        @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions */
        const tags = await db.getSortedSetMembers(`cid:${cid}:tags`);
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions */
        await db.deleteAll(tags.map(tag => `cid:${cid}:tag:${tag}:topics`));
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/restrict-template-expressions */
        await db.delete(`cid:${cid}:tags`);
    }

    async function removeFromParent(cid) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line  @typescript-eslint/no-unsafe-assignment
        const [parentCid, children] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line  @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            Categories.getCategoryField(cid, 'parentCid'),
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line  @typescript-eslint/restrict-template-expressions,
            @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
            db.getSortedSetRange(`cid:${cid}:children`, 0, -1),
        ]);

        const bulkAdd = [];
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line  @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-assignment,
        @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call */
        const childrenKeys = children.map((cid) => {
            bulkAdd.push(['cid:0:children', cid, cid]);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line  @typescript-eslint/restrict-template-expressions
            return `category:${cid}`;
        });

        await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/restrict-template-expressions */
            db.sortedSetRemove(`cid:${parentCid}:children`, cid),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            db.setObjectField(childrenKeys, 'parentCid', 0),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            db.sortedSetAddBulk(bulkAdd),
        ]);

        cache.del([
            'categories:cid',
            'cid:0:children',
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${parentCid}:children`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${parentCid}:children:all`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:children`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:children:all`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:tag:whitelist`,
        ]);
    }

    async function purgeCategory(cid, categoryData) {
        const bulkRemove = [['categories:cid', cid]];
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
        if (categoryData && categoryData.name) {
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/restrict-template-expressions, */
            bulkRemove.push(['categories:name', `${categoryData.name.slice(0, 200).toLowerCase()}:${cid}`]);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await db.sortedSetRemoveBulk(bulkRemove);

        await removeFromParent(cid);
        await deleteTags(cid);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line  @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await db.deleteAll([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:tids`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:tids:pinned`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:tids:posts`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:tids:votes`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:tids:views`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:tids:lastposttime`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:recent_tids`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:pids`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:read_by_uid`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:uid:watch:state`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:children`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `cid:${cid}:tag:whitelist`,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `category:${cid}`,
        ]);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line  @typescript-eslint/no-unsafe-assignment
        const privilegeList = await privileges.categories.getPrivilegeList();
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions,
        @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        await groups.destroy(privilegeList.map(privilege => `cid:${cid}:privileges:${privilege}`));
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Categories.purge = async function (cid, uid) {
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions */
        await batch.processSortedSet(`cid:${cid}:tids`, async (tids) => {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line  @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-misused-promises
            await async.eachLimit(tids, 10, async (tid) => {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                await topics.purgePostsAndTopic(tid, uid);
            });
        }, { alwaysStartAt: 0 });
        /* eslint-disable-next-line  @typescript-eslint/no-unsafe-call,
        @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-assignment */
        const pinnedTids = await db.getSortedSetRevRange(`cid:${cid}:tids:pinned`, 0, -1);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-misused-promises
        await async.eachLimit(pinnedTids, 10, async (tid) => {
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line  @typescript-eslint/no-unsafe-call,
             @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access */
            await topics.purgePostsAndTopic(tid, uid);
        });
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line  @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-assignment */
        const categoryData = await Categories.getCategoryData(cid);
        await purgeCategory(cid, categoryData);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line  @typescript-eslint/no-unsafe-assignment
        await plugins.hooks.fire('action:category.delete', { cid: cid, uid: uid, category: categoryData });
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line  @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars
        const result = await categoryData;
    };
};
