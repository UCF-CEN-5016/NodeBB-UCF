import meta = require('../meta');
import plugins = require('../plugins');
import slugify = require('../slugify');
import db = require('../database');

interface Data {
    name: string;
    slug: string;
    createtime?: number;
    userTitle: string;
    userTitleEnabled: string | number;
    description: string;
    memberCount: number;
    hidden: any;
    system: any;
    timestamp?: number;
    private: any;
    disableJoinRequests: string | number;
    disableLeave: any;
    ownerUid?: number;
}

interface Group {
    validateGroupName(name: string): void;
    create(data: Data): Promise<any>;
    isSystemGroup(data: Data): boolean;
    isPrivilegeGroup(name: string): boolean;
    systemGroups: string[];
    getGroupData(name: string): Promise<Data>;
}

module.exports = function (Groups: Group) {
    function isSystemGroup(data: Data): boolean {
        let dataSystem: number;
        if (typeof data.system === 'string') {
            dataSystem = parseInt(data.system, 10);
        } else {
            dataSystem = data.system ? 1 : 0;
        }
        return dataSystem === 1 ||
            Groups.systemGroups.includes(data.name) ||
            Groups.isPrivilegeGroup(data.name);
    }

    Groups.create = async function (data: Data) {
        const isSystem = isSystemGroup(data);
        const timestamp = data.timestamp || Date.now();
        let disableJoinRequests = parseInt(data.disableJoinRequests as string, 10) === 1 ? 1 : 0;
        if (data.name === 'administrators') {
            disableJoinRequests = 1;
        }
        const disableLeave = parseInt(data.disableLeave as string, 10) === 1 ? 1 : 0;
        const isHidden = parseInt(data.hidden as string, 10) === 1;

        Groups.validateGroupName(data.name);

        const exists: boolean = await meta.userOrGroupExists(data.name) as boolean;
        if (exists) {
            throw new Error('[[error:group-already-exists]]');
        }

        const memberCount = data.hasOwnProperty('ownerUid') ? 1 : 0;
        const isPrivate = data.hasOwnProperty('private') && data.private !== undefined ? parseInt(data.private as string, 10) === 1 : true;
        let groupData : Data = {
            name: data.name,
            slug: slugify(data.name) as string,
            createtime: timestamp,
            userTitle: data.userTitle || data.name,
            userTitleEnabled: parseInt(data.userTitleEnabled as string, 10) === 1 ? 1 : 0,
            description: data.description || '',
            memberCount: memberCount,
            hidden: isHidden ? 1 : 0,
            system: isSystem ? 1 : 0,
            private: isPrivate ? 1 : 0,
            disableJoinRequests: disableJoinRequests,
            disableLeave: disableLeave,
        };

        await plugins.hooks.fire('filter:group.create', { group: groupData, data: data });

        // suppress these because db is imported
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.sortedSetAdd('groups:createtime', groupData.createtime, groupData.name);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.setObject(`group:${groupData.name}`, groupData);

        if (data.hasOwnProperty('ownerUid')) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await db.setAdd(`group:${groupData.name}:owners`, data.ownerUid);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await db.sortedSetAdd(`group:${groupData.name}:members`, timestamp, data.ownerUid);
        }

        if (!isHidden && !isSystem) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await db.sortedSetAddBulk([
                ['groups:visible:createtime', timestamp, groupData.name],
                ['groups:visible:memberCount', groupData.memberCount, groupData.name],
                ['groups:visible:name', 0, `${groupData.name.toLowerCase()}:${groupData.name}`],
            ]);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.setObjectField('groupslug:groupname', groupData.slug, groupData.name);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        groupData = await Groups.getGroupData(groupData.name);
        await plugins.hooks.fire('action:group.create', { group: groupData });
        return groupData;
    };

    Groups.validateGroupName = function (name) {
        if (!name) {
            throw new Error('[[error:group-name-too-short]]');
        }

        if (typeof name !== 'string') {
            throw new Error('[[error:invalid-group-name]]');
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (!Groups.isPrivilegeGroup(name) && name.length > meta.config.maximumGroupNameLength) {
            throw new Error('[[error:group-name-too-long]]');
        }

        if (name === 'guests' || (!Groups.isPrivilegeGroup(name) && name.includes(':'))) {
            throw new Error('[[error:invalid-group-name]]');
        }

        if (name.includes('/') || !slugify(name)) {
            throw new Error('[[error:invalid-group-name]]');
        }
    };
};
