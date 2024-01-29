import categories from '../categories';
import events from '../events';
import user from '../user';
import groups from '../groups';
import privileges from '../privileges';

interface Caller {
    uid: number;
    ip: string;
}

interface CategoryData {
    cid: number;
    name: string;
    read: boolean;
}

interface SetPrivilegeData {
    cid: number;
    member: string;
    privilege: string | string[]; // Consider making this more specific
    set: boolean;
}

interface CategoriesAPI {
    get(caller: Caller, data: { cid: number }): Promise<CategoryData | null>;
    create(caller: Caller, data: CategoryData): Promise<CategoryData>;
    update(caller: Caller, data: { [cid: string]: CategoryData }): Promise<void>;
    delete(caller: Caller, data: { cid: number }): Promise<void>;
    getPrivileges(caller: Caller, cid: string | number): Promise<string[]>;
    setPrivilege(caller: Caller, data: SetPrivilegeData): Promise<void>;
}

const categoriesAPI: CategoriesAPI = {
    async get(caller: Caller, data: { cid: number }): Promise<CategoryData | null> {
        const userPrivilegesPromise = privileges.categories.get(data.cid, caller.uid);
        const categoryPromise = await privileges.categories.get(data.cid); // eslint-disable-line

        const [userPrivileges, category] = await Promise.all([ // eslint-disable-line
            userPrivilegesPromise,
            categoryPromise,
        ]);

        if (!category || !userPrivileges?.read) { // eslint-disable-line
            return null;
        }

        return category; // eslint-disable-line
    },

    async create(caller: Caller, data: CategoryData): Promise<CategoryData> {
        const response = await categories.create(data); // eslint-disable-line
        const categoryObjs = await categories.getCategories([response.cid], caller.uid); // eslint-disable-line
        return categoryObjs[0]; // eslint-disable-line
    },

    async update(caller: Caller, data: { [cid: string]: CategoryData }): Promise<void> {
        if (!data) {
            throw new Error('Invalid data provided for update');
        }
        await categories.update(data); // eslint-disable-line
    },

    async delete(caller: Caller, data: { cid: number }): Promise<void> {
        const name = await categories.getCategoryField(data.cid, 'name'); // eslint-disable-line
        await categories.purge(data.cid, caller.uid); // eslint-disable-line
        await events.log({
            type: 'category-purge',
            uid: caller.uid,
            ip: caller.ip,
            cid: data.cid,
            name: name, // eslint-disable-line
        });
    },

    async getPrivileges(caller: Caller, cid: string | number): Promise<string[]> {
        if (cid === 'admin') {
            return privileges.admin.list(caller.uid);
        } else if (typeof cid !== 'number') {
            return privileges.global.list();
        }
        return privileges.categories.list(cid);
    },

    async setPrivilege(caller: Caller, data: SetPrivilegeData): Promise<void> {
        const [userExists, groupExists] = await Promise.all([
            user.exists(data.member) as boolean,
            groups.exists(data.member) as boolean,
        ]);

        if (!userExists && !groupExists) {
            throw new Error('User or group does not exist');
        }

        const privs: string[] = Array.isArray(data.privilege) ? data.privilege : [data.privilege];
        const type = data.set ? 'give' : 'rescind';

        if (!privs.length) {
            throw new Error('Invalid privilege data');
        }

        if (data.cid === 0) {
            const adminPrivList = await privileges.admin.getPrivilegeList() as string[];
            const adminPrivs = privs.filter(priv => adminPrivList.includes(priv));

            if (adminPrivs.length) {
                await privileges.admin[type](adminPrivs, data.member);
            }

            const globalPrivList = await privileges.global.getPrivilegeList() as string[];
            const globalPrivs = privs.filter(priv => globalPrivList.includes(priv));

            if (globalPrivs.length) {
                await privileges.global[type](globalPrivs, data.member);
            }
        } else {
            const categoryPrivList = await privileges.categories.getPrivilegeList() as string[];
            const categoryPrivs = privs.filter(priv => categoryPrivList.includes(priv));

            await privileges.categories[type](categoryPrivs, data.cid, data.member);
        }

        await events.log({
            uid: caller.uid,
            type: 'privilege-change',
            ip: caller.ip,
            privilege: Array.isArray(data.privilege) ? data.privilege.join(',') : data.privilege,
            cid: data.cid,
            action: data.set ? 'grant' : 'rescind',
            target: data.member,
        });
    },
};

export default categoriesAPI;
