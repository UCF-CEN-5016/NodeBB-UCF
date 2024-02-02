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
Object.defineProperty(exports, "__esModule", { value: true });
const meta = require("../meta");
const plugins = require("../plugins");
const slugify = require("../slugify");
const db = require("../database");
module.exports = function (Groups) {
    function isSystemGroup(data) {
        let dataSystem;
        if (typeof data.system === 'string') {
            dataSystem = parseInt(data.system, 10);
        }
        else {
            dataSystem = data.system ? 1 : 0;
        }
        return dataSystem === 1 ||
            Groups.systemGroups.includes(data.name) ||
            Groups.isPrivilegeGroup(data.name);
    }
    Groups.create = function (data) {
        return __awaiter(this, void 0, void 0, function* () {
            const isSystem = isSystemGroup(data);
            const timestamp = data.timestamp || Date.now();
            let disableJoinRequests = parseInt(data.disableJoinRequests, 10) === 1 ? 1 : 0;
            if (data.name === 'administrators') {
                disableJoinRequests = 1;
            }
            const disableLeave = parseInt(data.disableLeave, 10) === 1 ? 1 : 0;
            const isHidden = parseInt(data.hidden, 10) === 1;
            Groups.validateGroupName(data.name);
            const exists = yield meta.userOrGroupExists(data.name);
            if (exists) {
                throw new Error('[[error:group-already-exists]]');
            }
            const memberCount = data.hasOwnProperty('ownerUid') ? 1 : 0;
            const isPrivate = data.hasOwnProperty('private') && data.private !== undefined ? parseInt(data.private, 10) === 1 : true;
            let groupData = {
                name: data.name,
                slug: slugify(data.name),
                createtime: timestamp,
                userTitle: data.userTitle || data.name,
                userTitleEnabled: parseInt(data.userTitleEnabled, 10) === 1 ? 1 : 0,
                description: data.description || '',
                memberCount: memberCount,
                hidden: isHidden ? 1 : 0,
                system: isSystem ? 1 : 0,
                private: isPrivate ? 1 : 0,
                disableJoinRequests: disableJoinRequests,
                disableLeave: disableLeave,
            };
            yield plugins.hooks.fire('filter:group.create', { group: groupData, data: data });
            // suppress these because db is imported
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            yield db.sortedSetAdd('groups:createtime', groupData.createtime, groupData.name);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            yield db.setObject(`group:${groupData.name}`, groupData);
            if (data.hasOwnProperty('ownerUid')) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                yield db.setAdd(`group:${groupData.name}:owners`, data.ownerUid);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                yield db.sortedSetAdd(`group:${groupData.name}:members`, timestamp, data.ownerUid);
            }
            if (!isHidden && !isSystem) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                yield db.sortedSetAddBulk([
                    ['groups:visible:createtime', timestamp, groupData.name],
                    ['groups:visible:memberCount', groupData.memberCount, groupData.name],
                    ['groups:visible:name', 0, `${groupData.name.toLowerCase()}:${groupData.name}`],
                ]);
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            yield db.setObjectField('groupslug:groupname', groupData.slug, groupData.name);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            groupData = yield Groups.getGroupData(groupData.name);
            yield plugins.hooks.fire('action:group.create', { group: groupData });
            return groupData;
        });
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
