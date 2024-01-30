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
const user = __importStar(require("../user"));
module.exports = function (Groups) {
    Groups.search = function (query, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!query) {
                return [];
            }
            query = String(query).toLowerCase();
            let groupNames = yield Groups.getSortedSetRange('groups:createtime', 0, -1);
            if (!options.hideEphemeralGroups) {
                groupNames = Groups.ephemeralGroups.concat(groupNames);
            }
            groupNames = groupNames.filter(name => name.toLowerCase().includes(query) &&
                name !== Groups.BANNED_USERS &&
                !Groups.isPrivilegeGroup(name));
            groupNames = groupNames.slice(0, 100);
            let groupsData;
            if (options.showMembers) {
                groupsData = yield Groups.getGroupsAndMembers(groupNames);
            }
            else {
                groupsData = yield Groups.getGroupsData(groupNames);
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            // groupsData = groupsData.filter(Boolean);
            groupsData = groupsData.filter(Boolean); // Add type assertion for groupsData
            if (options.filterHidden) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                groupsData = groupsData.filter(group => !group.hidden);
            }
            return Groups.sort(options.sort, groupsData);
        });
    };
    Groups.sort = function (strategy, groups) {
        switch (strategy) {
            case 'count':
                groups.sort((a, b) => a
                    .slug.localeCompare(b.slug)).sort((a, b) => b.memberCount - a.memberCount);
                break;
            case 'date':
                groups.sort((a, b) => b.createtime - a.createtime);
                break;
            case 'alpha': // intentional fall-through
            default: groups.sort((a, b) => a.slug.localeCompare(b.slug));
        }
        return groups;
    };
    Groups.searchMembers = function (data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data.query) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                const users = yield Groups.getOwnersAndMembers(data.groupName, data.uid, 0, 19);
                return { users };
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const results = user
                .search(data);
            // const results = await user.search({
            //     ...(data), // Add type assertion for data
            //     paginate: false,
            //     hardCap: -1,
            // });
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const uids = results
                .users.map((user) => user && user.uid).filter(Boolean); // Replace any with specific type
            const isOwners = yield Groups.ownership.isOwners(uids, data.groupName);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            results.users.forEach((user, index) => {
                if (user) {
                    user.isOwner = !!isOwners[index]; // Add type assertion for user
                }
            });
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            results.users.sort((a, b) => {
                if (a && b) {
                    if ((a).isOwner && !(b).isOwner) {
                        return -1;
                    }
                    else if (!(a).isOwner && (b).isOwner) {
                        return 1;
                    }
                }
                return 0;
            });
            return results;
        });
    };
};
