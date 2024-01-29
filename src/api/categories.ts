import * as categories from '../categories';
import * as events from '../events';
import * as user from '../user';
import * as groups from '../groups';
import * as privileges from '../privileges';

interface Caller {
    uid: number;
    ip: string;
}

interface CategoryData {
    cid: number;
    name: string;
    read: boolean;
}

interface PrivilegeData {
    member: string;
    privilege: string | string[];
    set: boolean;
    cid: number;
    read: boolean;
}

interface categoriesAPI {
    get(caller: Caller, data: { cid: number }): Promise<CategoryData | null>;
    create(caller: Caller, data: CategoryData): Promise<CategoryData>;
    update(caller: Caller, data: CategoryData): Promise<void>;
    delete(caller: Caller, data: { cid: number }): Promise<void>;
    getPrivileges(caller: Caller, cid: string | number): Promise<string[]>;
    setPrivilege(caller: Caller, data: PrivilegeData): Promise<void>;
}

const categoriesAPI: categoriesAPI = {

    async get(caller: Caller, data: { cid: number }): Promise<CategoryData | null> {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [userprivileges, category]: [PrivilegeData, CategoryData] = await Promise.all([
            privileges.categories.get(data.cid, caller.uid),

            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            categories.getCategoryData(data.cid),
        ]);
        if (!category || !userprivileges.read) {
            return null;
        }
        return category;
    },

    async create(caller: Caller, data: CategoryData): Promise<CategoryData> {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const response: CategoryData = categories.create(data);

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const categoryObjs: CategoryData[] = await categories.getcategories([response.cid], caller.uid);
        return categoryObjs[0];
    },

    async update(caller: Caller, data: CategoryData): Promise<void> {
        if (!data) {
            throw new Error('[[error:invalid-data]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await categories.update(data);
    },

    async delete(caller: Caller, data: { cid: number }): Promise<void> {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const name: string = await categories.getCategoryField(data.cid, 'name');

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await categories.purge(data.cid, caller.uid);
        await events.log({
            type: 'category-purge',
            uid: caller.uid,
            ip: caller.ip,
            cid: data.cid,
            name: name,
        });
    },

    async getPrivileges(caller: Caller, cid: string | number): Promise<string[]> {
        let responsePayload: string[];

        if (cid === 'admin') {
            responsePayload = await privileges.admin.list(caller.uid);
        } else if (!parseInt(cid.toString(), 10)) {
            responsePayload = await privileges.global.list();
        } else {
            responsePayload = await privileges.categories.list(cid.toString());
        }

        return responsePayload;
    },

    async setPrivilege(caller: Caller, data: PrivilegeData): Promise<void> {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [userExists, groupExists] = await Promise.all([
            user.exists(data.member),
            groups.exists(data.member),
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
            const adminPrivList = await privileges.admin.getPrivilegeList();

            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const adminPrivs = privs.filter(priv => adminPrivList.includes(priv));
            if (adminPrivs.length) {
                await privileges.admin[type](adminPrivs, data.member);
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const globalPrivList = await privileges.global.getPrivilegeList();

            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const globalPrivs = privs.filter(priv => globalPrivList.includes(priv));
            if (globalPrivs.length) {
                await privileges.global[type](globalPrivs, data.member);
            }
        } else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const categoryPrivList = await privileges.categories.getPrivilegeList();

            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const categoryPrivs = privs.filter(priv => categoryPrivList.includes(priv));
            await privileges.categories[type](categoryPrivs, data.cid.toString(), data.member);
        }

        await events.log({
            uid: caller.uid,
            type: 'privilege-change',
            ip: caller.ip,
            privilege: Array.isArray(data.privilege) ? data.privilege.toString() : data.privilege,
            cid: data.cid.toString(),
            action: data.set ? 'grant' : 'rescind',
            target: data.member,
        });
    },
};

export default categoriesAPI;
