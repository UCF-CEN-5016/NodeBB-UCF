"use strict";
/* eslint max-len: off */
/* eslint-disable import/no-import-module-exports */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
const validator_1 = __importDefault(require("validator"));
const database_1 = __importDefault(require("../database"));
const meta_1 = __importDefault(require("../meta"));
const plugins_1 = __importDefault(require("../plugins"));
const utils_1 = __importDefault(require("../utils"));
const intFields = [
    'cid', 'parentCid', 'disabled', 'isSection', 'order',
    'topic_count', 'post_count', 'numRecentReplies',
    'minTags', 'maxTags', 'postQueue', 'subCategoriesPerPage',
];
// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
function defaultIntField(category, fields, fieldName, defaultField) {
    if (!fields.length || fields.includes(fieldName)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
        const useDefault = !category.hasOwnProperty(fieldName) ||
            category[fieldName] === null ||
            category[fieldName] === '' ||
            !utils_1.default.isNumber(category[fieldName]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        category[fieldName] = useDefault ? meta_1.default.config[defaultField] : category[fieldName];
    }
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
function modifyCategory(category, fields) {
    if (!category) {
        return;
    }
    defaultIntField(category, fields, 'minTags', 'minimumTagsPerTopic');
    defaultIntField(category, fields, 'maxTags', 'maximumTagsPerTopic');
    defaultIntField(category, fields, 'postQueue', 'postQueue');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    database_1.default.parseIntFields(category, intFields, fields);
    const escapeFields = ['name', 'color', 'bgColor', 'backgroundImage', 'imageClass', 'class', 'link'];
    escapeFields.forEach((field) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
        if (category.hasOwnProperty(field)) {
            category[field] = validator_1.default.escape(String(category[field] || ''));
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
        category.description = validator_1.default.escape(String(category.description));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        category.descriptionParsed = category.descriptionParsed || category.description;
    }
}
module.exports = function (Categories) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    Categories.getCategoriesFields = function (cids, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(cids) || !cids.length) {
                return [];
            }
            const keys = cids.map(cid => `category:${cid}`);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
            const categories = yield database_1.default.getObjects(keys, fields);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
            const result = yield plugins_1.default.hooks.fire('filter:category.getFields', {
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
        });
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    Categories.getCategoryData = function (cid) {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
            const categories = yield Categories.getCategoriesFields([cid], []);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
            return categories && categories.length ? categories[0] : null;
        });
    };
    Categories.getCategoriesData = function (cids) {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
            return yield Categories.getCategoriesFields(cids, []);
        });
    };
    Categories.getCategoryField = function (cid, field) {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const category = yield Categories.getCategoryFields(cid, [field]);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return category ? category[field] : null;
        });
    };
    Categories.getCategoryFields = function (cid, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
            const categories = yield Categories.getCategoriesFields([cid], fields);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return categories ? categories[0] : null;
        });
    };
    Categories.getAllCategoryFields = function (fields) {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
            const cids = yield Categories.getAllCidsFromSet('categories:cid');
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
            return yield Categories.getCategoriesFields(cids, fields);
        });
    };
    Categories.setCategoryField = function (cid, field, value) {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            yield database_1.default.setObjectField(`category:${cid}`, field, value);
        });
    };
    Categories.incrementCategoryFieldBy = function (cid, field, value) {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            yield database_1.default.incrObjectFieldBy(`category:${cid}`, field, value);
        });
    };
};
