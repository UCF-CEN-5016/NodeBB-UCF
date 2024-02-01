'use strict';

// supressed errors include modules that have been imported from another file adding the module.export
// in allows this to work but still "unsafe...any type" error. Typing async functions are causing issues.
import db = require('../database');
import user = require('../user');


interface Group{
    name:string;
    displayName:string;
    hidden:number;
    system:number;
    private:number;
}


module.exports = function (Groups: any) {
    const getUsersFromSet = async function (set:string, fields:string[]) {
        const uids: string[] = await db.getSetMembers(set);
        if (fields) {
            return await user.getUsersFields(uids, fields);
        }
        return await user.getUsersData(uids);
    };

    const getUserGroups = async function (uids: string[]) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await Groups.getUserGroupsFromSet('groups:visible:createtime', uids);
    };
    
    const getUserGroupsFromSet = async function (set:string, uids:string[]) {
        const memberOf:string[] = await Groups.getUserGroupMembership(set, uids);
        return await Promise.all(memberOf.map(memberOf => Groups.getGroupsData(memberOf)));
    };

    const getUserGroupMembership = async function (set:string, uids:string[]) {
        const groupNames:string[] = await db.getSortedSetRevRange(set, 0, -1);
        return await Promise.all(uids.map(uid => findUserGroups(uid, groupNames)));
    };

    async function findUserGroups(uid:string, groupNames:string[]) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const isMembers = await Groups.isMemberOfGroups(uid, groupNames);
        return groupNames.filter((name, i:number) => isMembers[i]);
    }

    const getUserInviteGroups = async function (uid:string) {
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
