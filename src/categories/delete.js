"use strict";
// 'use strict';
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
const async = require("async");
const db = require("../database");
const batch = require("../batch");
const plugins = require("../plugins");
const topics = require("../topics");
const groups = require("../groups");
const privileges = require("../privileges");
const cache = require("../cache");
module.exports = function (Categories) {
    function deleteTags(cid) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment,
            @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions */
            const tags = yield db.getSortedSetMembers(`cid:${cid}:tags`);
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions */
            yield db.deleteAll(tags.map(tag => `cid:${cid}:tag:${tag}:topics`));
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/restrict-template-expressions */
            yield db.delete(`cid:${cid}:tags`);
        });
    }
    function removeFromParent(cid) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line  @typescript-eslint/no-unsafe-assignment
            const [parentCid, children] = yield Promise.all([
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
            yield Promise.all([
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
        });
    }
    function purgeCategory(cid, categoryData) {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield db.sortedSetRemoveBulk(bulkRemove);
            yield removeFromParent(cid);
            yield deleteTags(cid);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line  @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            yield db.deleteAll([
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
            const privilegeList = yield privileges.categories.getPrivilegeList();
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions,
            @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
            yield groups.destroy(privilegeList.map(privilege => `cid:${cid}:privileges:${privilege}`));
        });
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Categories.purge = function (cid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions */
            yield batch.processSortedSet(`cid:${cid}:tids`, (tids) => __awaiter(this, void 0, void 0, function* () {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line  @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-misused-promises
                yield async.eachLimit(tids, 10, (tid) => __awaiter(this, void 0, void 0, function* () {
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                    yield topics.purgePostsAndTopic(tid, uid);
                }));
            }), { alwaysStartAt: 0 });
            /* eslint-disable-next-line  @typescript-eslint/no-unsafe-call,
            @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-assignment */
            const pinnedTids = yield db.getSortedSetRevRange(`cid:${cid}:tids:pinned`, 0, -1);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-misused-promises
            yield async.eachLimit(pinnedTids, 10, (tid) => __awaiter(this, void 0, void 0, function* () {
                // The next line calls a function in a module that has not been updated to TS yet
                /* eslint-disable-next-line  @typescript-eslint/no-unsafe-call,
                 @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access */
                yield topics.purgePostsAndTopic(tid, uid);
            }));
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line  @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-assignment */
            const categoryData = yield Categories.getCategoryData(cid);
            yield purgeCategory(cid, categoryData);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line  @typescript-eslint/no-unsafe-assignment
            yield plugins.hooks.fire('action:category.delete', { cid: cid, uid: uid, category: categoryData });
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line  @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars
            const result = yield categoryData;
        });
    };
};
