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
const categories_1 = __importDefault(require("../categories"));
const events_1 = __importDefault(require("../events"));
const user_1 = __importDefault(require("../user"));
const groups_1 = __importDefault(require("../groups"));
const privileges_1 = __importDefault(require("../privileges"));
const categoriesAPI = {
    get(caller, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const userPrivilegesPromise = privileges_1.default.categories.get(data.cid, caller.uid);
            const categoryPromise = yield privileges_1.default.categories.get(data.cid); // eslint-disable-line
            const [userPrivileges, category] = yield Promise.all([
                userPrivilegesPromise,
                categoryPromise,
            ]);
            if (!category || !(userPrivileges === null || userPrivileges === void 0 ? void 0 : userPrivileges.read)) { // eslint-disable-line
                return null;
            }
            return category; // eslint-disable-line
        });
    },
    create(caller, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield categories_1.default.create(data); // eslint-disable-line
            const categoryObjs = yield categories_1.default.getCategories([response.cid], caller.uid); // eslint-disable-line
            return categoryObjs[0]; // eslint-disable-line
        });
    },
    update(caller, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data) {
                throw new Error('Invalid data provided for update');
            }
            yield categories_1.default.update(data); // eslint-disable-line
        });
    },
    delete(caller, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const name = yield categories_1.default.getCategoryField(data.cid, 'name'); // eslint-disable-line
            yield categories_1.default.purge(data.cid, caller.uid); // eslint-disable-line
            yield events_1.default.log({
                type: 'category-purge',
                uid: caller.uid,
                ip: caller.ip,
                cid: data.cid,
                name: name, // eslint-disable-line
            });
        });
    },
    getPrivileges(caller, cid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (cid === 'admin') {
                return privileges_1.default.admin.list(caller.uid);
            }
            else if (typeof cid !== 'number') {
                return privileges_1.default.global.list();
            }
            return privileges_1.default.categories.list(cid);
        });
    },
    setPrivilege(caller, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const [userExists, groupExists] = yield Promise.all([
                user_1.default.exists(data.member),
                groups_1.default.exists(data.member),
            ]);
            if (!userExists && !groupExists) {
                throw new Error('User or group does not exist');
            }
            const privs = Array.isArray(data.privilege) ? data.privilege : [data.privilege];
            const type = data.set ? 'give' : 'rescind';
            if (!privs.length) {
                throw new Error('Invalid privilege data');
            }
            if (data.cid === 0) {
                const adminPrivList = yield privileges_1.default.admin.getPrivilegeList();
                const adminPrivs = privs.filter(priv => adminPrivList.includes(priv));
                if (adminPrivs.length) {
                    yield privileges_1.default.admin[type](adminPrivs, data.member);
                }
                const globalPrivList = yield privileges_1.default.global.getPrivilegeList();
                const globalPrivs = privs.filter(priv => globalPrivList.includes(priv));
                if (globalPrivs.length) {
                    yield privileges_1.default.global[type](globalPrivs, data.member);
                }
            }
            else {
                const categoryPrivList = yield privileges_1.default.categories.getPrivilegeList();
                const categoryPrivs = privs.filter(priv => categoryPrivList.includes(priv));
                yield privileges_1.default.categories[type](categoryPrivs, data.cid, data.member);
            }
            yield events_1.default.log({
                uid: caller.uid,
                type: 'privilege-change',
                ip: caller.ip,
                privilege: Array.isArray(data.privilege) ? data.privilege.join(',') : data.privilege,
                cid: data.cid,
                action: data.set ? 'grant' : 'rescind',
                target: data.member,
            });
        });
    },
};
exports.default = categoriesAPI;
