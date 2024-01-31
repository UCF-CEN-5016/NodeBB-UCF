// 'use strict';

//supressed errors include modules that have been imported from another file adding the module.export 
//in allows this to work but still "unsafe...any type" error. Typing async functions are causing issues.
import db = require('../database');
import user = require('../user');


interface Group{
    name:string;
    displayName:string;
    hidden:number;
    system:number;
    private:number;
}


export default function Groups() {
    const getUsersFromSet = async function () {
        let set:any;
        let fields:string[];
        const uids: string[] = await db.getSetMembers(set);
        if (fields) {
            return await user.getUsersFields(uids, fields);
        }
        return await user.getUsersData(uids);
    };

    const getUserGroups = async function () {
        let uids: string[];
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await Groups.getUserGroupsFromSet('groups:visible:createtime', uids);
    };
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const getUserGroupsFromSet = async function () {
        let set: any;
        let uids: string[];
        const memberOf:string[] = await Groups.getUserGroupMembership(set, uids);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await Promise.all(memberOf.map(memberOf => Groups.getGroupsData(memberOf)));
    };

    const getUserGroupMembership = async function () {
        let set: any;
        let uids: string[];
        const groupNames:string[] = await db.getSortedSetRevRange(set, 0, -1);
        return await Promise.all(uids.map(uid => findUserGroups()));
    };

    async function findUserGroups() {
        let uid: string;
        let groupNames:string[];
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const isMembers:boolean[] = await Groups.isMemberOfGroups(uid, groupNames);
        return groupNames.filter((name, i) => isMembers[i]);
    }

    const getUserInviteGroups = async function () {
        let uid:string;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        let allGroups:Group[] = await Groups.getNonPrivilegeGroups('groups:createtime', 0, -1);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        allGroups = allGroups.filter(group => !Groups.ephemeralGroups.includes(group.name));

        const publicGroups:Group[] = allGroups.filter(group => group.hidden === 0 && group.system === 0 && group.private === 0);
        const adminModGroups = [
            { name: 'administrators', displayName: 'administrators' },
            { name: 'Global Moderators', displayName: 'Global Moderators' },
        ];
        // Private (but not hidden)
        const privateGroups: Group[] = allGroups.filter(group => group.hidden === 0 &&
            group.system === 0 && group.private === 1);

        const [ownership, isAdmin, isGlobalMod] = await Promise.all([
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            Promise.all(privateGroups.map(group => Groups.ownership.isOwner(uid, group.name))),
            user.isAdministrator(uid),
            user.isGlobalModerator(uid),
        ]);
        const ownGroups = privateGroups.filter((group, index) => ownership[index]);

        let inviteGroups = [];
        if (isAdmin) {
            inviteGroups = inviteGroups.concat(adminModGroups).concat(privateGroups);
        } else if (isGlobalMod) {
            inviteGroups = inviteGroups.concat(privateGroups);
        } else {
            inviteGroups = inviteGroups.concat(ownGroups);
        }

        return inviteGroups
            .concat(publicGroups);
    };
};
