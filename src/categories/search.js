"use strict";
// 'use strict'; removed because ts automatically applies strict mode
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
// convert require to import statements
const _ = require("lodash");
const privileges = require("../privileges");
const plugins = require("../plugins");
const db = require("../database");
module.exports = function (Categories) {
    Categories.search = function (data) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = data.query || '';
            const page = data.page || 1;
            const uid = data.uid || 0;
            const paginate = data.hasOwnProperty('paginate') ? data.paginate : true;
            function findCids(query, hardCap) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (!query || String(query).length < 2) {
                        return [];
                    }
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line max-len
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    const data = yield db.getSortedSetScan({
                        key: 'categories:name',
                        match: `*${String(query).toLowerCase()}*`,
                        limit: hardCap || 500,
                    });
                    return data.map((data) => parseInt(data.split(':').pop(), 10));
                });
            }
            function getChildrenCids(cids, uid) {
                return __awaiter(this, void 0, void 0, function* () {
                    const childrenCids = yield Promise.all(cids.map(cid => Categories.getChildrenCids(cid)));
                    // The next line calls a function in a module that has not been updated to TS yet
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return yield privileges.categories.filterCids('find', _.flatten(childrenCids), uid);
                });
            }
            const startTime = process.hrtime();
            let cids = yield findCids(query, data.hardCap);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result = yield plugins.hooks.fire('filter:categories.search', {
                data: data,
                cids: cids,
                uid: uid,
            });
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
            cids = yield privileges.categories.filterCids('find', result.cids, uid);
            const searchResult = {
                matchCount: cids.length,
            };
            if (paginate) {
                const resultsPerPage = data.resultsPerPage || 50;
                const start = Math.max(0, page - 1) * resultsPerPage;
                const stop = start + resultsPerPage;
                searchResult.pageCount = Math.ceil(cids.length / resultsPerPage);
                cids = cids.slice(start, stop);
            }
            const childrenCids = yield getChildrenCids(cids, uid);
            const uniqCids = _.uniq(cids.concat(childrenCids));
            const categoryData = yield Categories.getCategories(uniqCids, uid);
            Categories.getTree(categoryData, 0);
            yield Categories.getRecentTopicReplies(categoryData, uid, data.qs);
            categoryData.forEach((category) => {
                if (category && Array.isArray(category.children)) {
                    category.children = category.children.slice(0, category.subCategoriesPerPage);
                    category.children.forEach((child) => {
                        child.children = undefined;
                    });
                }
            });
            categoryData.sort((c1, c2) => {
                if (c1.parentCid !== c2.parentCid) {
                    return c1.parentCid - c2.parentCid;
                }
                return c1.order - c2.order;
            });
            // replaced process.elapsedTimeSince(startTime) with const diff and const elapsedTimeSince
            const diff = process.hrtime(startTime);
            const elapsedTimeSince = ((diff[0] * 1e9) + diff[1]) / 1e6;
            searchResult.timing = elapsedTimeSince.toFixed(2);
            searchResult.categories = categoryData.filter(c => cids.includes(c.cid));
            return searchResult;
        });
    };
};
