// import { User } from '../user';
// import * as user from '../user';

// // import * as db from '../database';

// interface Group {
//     slug: string;
//     createtime: number;
//     memberCount: number;
//     hidden?: boolean;
// }

// interface SearchOptions {
//     hideEphemeralGroups?: boolean;
//     showMembers?: boolean;
//     filterHidden?: boolean;
//     sort?: string; // adjust the type according to your needs
// }

// interface SearchResult {
//     users: User[];
// }

// interface User {
//     uid?: string;
//     isOwner?: boolean;
//     // Other user properties
// }

// interface Groups {
//     [key: string]: unknown; // Add more specific types based on your actual implementation
//     ephemeralGroups: string[];
//     BANNED_USERS: string;
//     getSortedSetRange(key: string, start: number, stop: number): Promise<string[]>;
//     isPrivilegeGroup(name: string): boolean;
//     getGroupsAndMembers(groupNames: string[]): Promise<Group[]>;
//     getGroupsData(groupNames: string[]): Promise<Group[]>;
//     sort(strategy: string, groups: Group[]): Group[];
//     getOwnersAndMembers(groupName: string, uid: string, start: number, end: number): Promise<string[]>;
//     ownership: {
//         isOwners(uids: string[], groupName: string): Promise<string[]>;
//     };
// }

// export = function (Groups: Groups) {
//     Groups.search = async function (query: string, options: SearchOptions) {
//         if (!query) {
//             return [];
//         }
//         query = String(query).toLowerCase();
//         let groupNames = await Groups.getSortedSetRange('groups:createtime', 0, -1);
//         if (!options.hideEphemeralGroups) {
//             groupNames = Groups.ephemeralGroups.concat(groupNames);
//         }
//         groupNames = groupNames.filter(name => name.toLowerCase().includes(query) &&
//             name !== Groups.BANNED_USERS &&
//             !Groups.isPrivilegeGroup(name));
//         groupNames = groupNames.slice(0, 100);

//         let groupsData: Group[];
//         if (options.showMembers) {
//             groupsData = await Groups.getGroupsAndMembers(groupNames);
//         } else {
//             groupsData = await Groups.getGroupsData(groupNames);
//         }
//         // The next line calls a function in a module that has not been updated to TS yet
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         // groupsData = groupsData.filter(Boolean);
//         groupsData = groupsData.filter(Boolean); // Add type assertion for groupsData
//         if (options.filterHidden) {
//             // The next line calls a function in a module that has not been updated to TS yet
//             // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//             groupsData = groupsData.filter(group => !group.hidden);
//         }
//         return Groups.sort(options.sort, groupsData);
//     };

//     Groups.sort = function (strategy: string, groups: Group[]) {
//         switch (strategy) {
//         case 'count': groups.sort((a, b) => a
//             .slug.localeCompare(b.slug)).sort((a, b) => b.memberCount - a.memberCount);
//             break;
//         case 'date': groups.sort((a, b) => b.createtime - a.createtime);
//             break;
//         case 'alpha': // intentional fall-through
//         default: groups.sort((a, b) => a.slug.localeCompare(b.slug));
//         }

//         return groups;
//     };

//     Groups.searchMembers = async function (data: { query?: string; groupName: string; uid: string }) {
//         if (!data.query) {
//             // The next line calls a function in a module that has not been updated to TS yet
//             // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//             const users = await Groups.getOwnersAndMembers(data.groupName, data.uid, 0, 19);
//             return { users };
//         }
//         // The next line calls a function in a module that has not been updated to TS yet
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         const results = (user
//             .search as (data: { query?: string; groupName: string; uid: string }) => SearchResult)(data);
//         // const results = await user.search({
//         //     ...(data), // Add type assertion for data
//         //     paginate: false,
//         //     hardCap: -1,
//         // });
//         // The next line calls a function in a module that has not been updated to TS yet
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         const uids: string[] = results
//             .users.map((user: User | null) => user && user.uid).filter(Boolean); // Replace any with specific type

//         const isOwners = await Groups.ownership.isOwners(uids, data.groupName);
//         // The next line calls a function in a module that has not been updated to TS yet
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         results.users.forEach((user: User | null, index: number) => { // Replace any with specific type
//             if (user) {
//                 user.isOwner = !!isOwners[index]; // Add type assertion for user
//             }
//         });
//         // The next line calls a function in a module that has not been updated to TS yet
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         results.users.sort((a: User | null, b: User | null) => {
//             if (a && b) {
//                 if ((a).isOwner && !(b).isOwner) {
//                     return -1;
//                 } else if (!(a).isOwner && (b).isOwner) {
//                     return 1;
//                 }
//             }
//             return 0;
//         });

//         return results;
//     };
// };



