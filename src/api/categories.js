"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const Categories = __importStar(require("../categories"));
const Events = __importStar(require("../events"));
const User = __importStar(require("../user"));
const Groups = __importStar(require("../groups"));
const Privileges = __importStar(require("../privileges"));
const categoriesAPI = {
    get(caller, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const [userPrivileges, category] = yield Promise.all([
                Privileges.categories.get(data.cid, caller.uid),
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                Categories.getCategoryData(data.cid),
            ]);
            if (!category || !userPrivileges.read) {
                return null;
            }
            return category;
        });
    },
    create(caller, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const response = yield Categories.create(data);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const categoryObjs = yield Categories.getCategories([response.cid], caller.uid);
            return categoryObjs[0];
        });
    },
    update(caller, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data) {
                throw new Error('[[error:invalid-data]]');
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            yield Categories.update(data);
        });
    },
    delete(caller, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const name = yield Categories.getCategoryField(data.cid, 'name');
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            yield Categories.purge(data.cid, caller.uid);
            yield Events.log({
                type: 'category-purge',
                uid: caller.uid,
                ip: caller.ip,
                cid: data.cid,
                name: name,
            });
        });
    },
    getPrivileges(caller, cid) {
        return __awaiter(this, void 0, void 0, function* () {
            let responsePayload;
            if (cid === 'admin') {
                responsePayload = yield Privileges.admin.list(caller.uid);
            }
            else if (!parseInt(cid.toString(), 10)) {
                responsePayload = yield Privileges.global.list();
            }
            else {
                responsePayload = yield Privileges.categories.list(cid.toString());
            }
            return responsePayload;
        });
    },
    setPrivilege(caller, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const [userExists, groupExists] = yield Promise.all([
                User.exists(data.member),
                Groups.exists(data.member),
            ]);
            if (!userExists && !groupExists) {
                throw new Error('[[error:no-user-or-group]]');
            }
            const privs = Array.isArray(data.privilege) ? data.privilege : [data.privilege];
            const type = data.set ? 'give' : 'rescind';
            if (!privs.length) {
                throw new Error('[[error:invalid-data]]');
            }
            if (parseInt(data.cid.toString(), 10) === 0) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const adminPrivList = yield Privileges.admin.getPrivilegeList();
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                const adminPrivs = privs.filter(priv => adminPrivList.includes(priv));
                if (adminPrivs.length) {
                    yield Privileges.admin[type](adminPrivs, data.member);
                }
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const globalPrivList = yield Privileges.global.getPrivilegeList();
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                const globalPrivs = privs.filter(priv => globalPrivList.includes(priv));
                if (globalPrivs.length) {
                    yield Privileges.global[type](globalPrivs, data.member);
                }
            }
            else {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const categoryPrivList = yield Privileges.categories.getPrivilegeList();
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                const categoryPrivs = privs.filter(priv => categoryPrivList.includes(priv));
                yield Privileges.categories[type](categoryPrivs, data.cid.toString(), data.member);
            }
            yield Events.log({
                uid: caller.uid,
                type: 'privilege-change',
                ip: caller.ip,
                privilege: Array.isArray(data.privilege) ? data.privilege.toString() : data.privilege,
                cid: data.cid.toString(),
                action: data.set ? 'grant' : 'rescind',
                target: data.member,
            });
        });
    },
};
exports.default = categoriesAPI;
