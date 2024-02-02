/* eslint max-len: off */
/* eslint-disable import/no-import-module-exports */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */


import validator from 'validator';

import db from '../database';
import meta from '../meta';
import plugins from '../plugins';
import utils from '../utils';

const intFields: string[] = [
    'cid', 'parentCid', 'disabled', 'isSection', 'order',
    'topic_count', 'post_count', 'numRecentReplies',
    'minTags', 'maxTags', 'postQueue', 'subCategoriesPerPage',
];


// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
function defaultIntField(category:any, fields:string[], fieldName:string, defaultField:string):void {
    if (!fields.length || fields.includes(fieldName)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
        const useDefault = !category.hasOwnProperty(fieldName) ||
            category[fieldName] === null ||
            category[fieldName] === '' ||
            !utils.isNumber(category[fieldName]);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        category[fieldName] = useDefault ? meta.config[defaultField] : category[fieldName];
    }
}




// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
function modifyCategory(category:any, fields:string[]):void {
    if (!category) {
        return;
    }

    defaultIntField(category, fields, 'minTags', 'minimumTagsPerTopic');
    defaultIntField(category, fields, 'maxTags', 'maximumTagsPerTopic');
    defaultIntField(category, fields, 'postQueue', 'postQueue');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    db.parseIntFields(category, intFields, fields);


    const escapeFields:string[] = ['name', 'color', 'bgColor', 'backgroundImage', 'imageClass', 'class', 'link'];
    escapeFields.forEach((field) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
        if (category.hasOwnProperty(field)) {
            category[field] = validator.escape(String(category[field] || ''));
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    if (category.hasOwnProperty('icon')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        category.icon = category.icon || 'hidden';
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (category.hasOwnProperty('post_count')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        category.totalPostCount = category.post_count;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (category.hasOwnProperty('topic_count')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        category.totalTopicCount = category.topic_count;
    }

    if (category.description) {
        category.description = validator.escape(String(category.description));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        category.descriptionParsed = category.descriptionParsed || category.description;
    }
}



module.exports = function (Categories):void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    Categories.getCategoriesFields = async function (cids:string[], fields:string[]):Promise<any[]> {
        if (!Array.isArray(cids) || !cids.length) {
            return [];
        }

        const keys:string[] = cids.map(cid => `category:${cid}`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
        const categories = await db.getObjects(keys, fields);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const result = await plugins.hooks.fire('filter:category.getFields', {
            cids: cids,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
            categories: categories,
            fields: fields,
            keys: keys,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        result.categories.forEach(category => modifyCategory(category, fields));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        return result.categories;
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    Categories.getCategoryData = async function (cid):Promise<any[]> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const categories = await Categories.getCategoriesFields([cid], []);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        return categories && categories.length ? categories[0] : null;
    };

    Categories.getCategoriesData = async function (cids) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return await Categories.getCategoriesFields(cids, []);
    };

    Categories.getCategoryField = async function (cid, field) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const category = await Categories.getCategoryFields(cid, [field]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return category ? category[field] : null;
    };

    Categories.getCategoryFields = async function (cid, fields) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const categories = await Categories.getCategoriesFields([cid], fields);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return categories ? categories[0] : null;
    };

    Categories.getAllCategoryFields = async function (fields) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const cids = await Categories.getAllCidsFromSet('categories:cid');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return await Categories.getCategoriesFields(cids, fields);
    };

    Categories.setCategoryField = async function (cid:string, field:string, value) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await db.setObjectField(`category:${cid}`, field, value);
    };

    Categories.incrementCategoryFieldBy = async function (cid:string, field:string, value) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await db.incrObjectFieldBy(`category:${cid}`, field, value);
    };
};

