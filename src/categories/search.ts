// 'use strict'; removed because ts automatically applies strict mode

// convert require to import statements
import _ = require('lodash');
import privileges = require('../privileges');
import plugins = require('../plugins') ;
import db = require('../database') ;

interface CategoriesModel {
    search: (data: SearchData) => Promise<SearchResult>;
    getCategories: (cids: number[], uid: number) => Promise<Category[]>;
    getTree: (categoryData: Category[], parentId: number) => void;
    getRecentTopicReplies: (categoryData: Category[], uid: number, qs) => Promise<void>;
    getChildrenCids: (cid: number) => Promise<number[]>;
}

interface SearchData {
    query?: string;
    page?: number;
    uid?: number;
    paginate?: boolean;
    hardCap?: number;
    resultsPerPage?: number;
    qs?;
}

interface SearchResult {
    matchCount: number;
    pageCount?: number;
    timing?: string;
    categories?: Category[];
}

interface Category {
    cid: number;
    parentCid: number;
    order: number;
    subCategoriesPerPage: number;
    children?: Category[];
}
module.exports = function (Categories: CategoriesModel) {
    Categories.search = async function (data: SearchData): Promise<SearchResult> {
        const query = data.query || '';
        const page = data.page || 1;
        const uid = data.uid || 0;
        const paginate = data.hasOwnProperty('paginate') ? data.paginate : true;

        async function findCids(query: string, hardCap?: number): Promise<number[]> {
            if (!query || String(query).length < 2) {
                return [];
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const data: string[] = await db.getSortedSetScan({
                key: 'categories:name',
                match: `*${String(query).toLowerCase()}*`,
                limit: hardCap || 500,
            });
            return data.map((data:string) => parseInt(data.split(':').pop(), 10));
        }
        async function getChildrenCids(cids: number[], uid: number): Promise<number[]> {
            const childrenCids = await Promise.all(cids.map(cid => Categories.getChildrenCids(cid)));
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await privileges.categories.filterCids('find', _.flatten(childrenCids), uid);
        }

        const startTime = process.hrtime();

        let cids = await findCids(query, data.hardCap);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const result = await plugins.hooks.fire('filter:categories.search', {
            data: data,
            cids: cids,
            uid: uid,
        });
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
        cids = await privileges.categories.filterCids('find', result.cids, uid);

        const searchResult: SearchResult = {
            matchCount: cids.length,
        };

        if (paginate) {
            const resultsPerPage = data.resultsPerPage || 50;
            const start = Math.max(0, page - 1) * resultsPerPage;
            const stop = start + resultsPerPage;
            searchResult.pageCount = Math.ceil(cids.length / resultsPerPage);
            cids = cids.slice(start, stop);
        }

        const childrenCids = await getChildrenCids(cids, uid);
        const uniqCids = _.uniq(cids.concat(childrenCids));
        const categoryData = await Categories.getCategories(uniqCids, uid);

        Categories.getTree(categoryData, 0);
        await Categories.getRecentTopicReplies(categoryData, uid, data.qs);
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
    };
};
