'use strict';

import * as meta from '../../meta';
import * as user from '../../user';
import * as topics from '../../topics';
import * as categories from '../../categories';
import * as privileges from '../../privileges';
import * as utils from '../../utils';

export = function (SocketTopics: any): void {
    SocketTopics.isTagAllowed = async function (socket: any, data: any): Promise<boolean> {
        if (!data || !utils.isNumber(data.cid) || !data.tag) {
            throw new Error('[[error:invalid-data]]');
        }

        const systemTags: string[] = (meta.config.systemTags || '').split(',');
        const [tagWhitelist, isPrivileged]: [string[], boolean] = await Promise.all([
            categories.getTagWhitelist([data.cid]),
            user.isPrivileged(socket.uid),
        ]);

        return isPrivileged ||
            (
                !systemTags.includes(data.tag) &&
                (!tagWhitelist[0].length || tagWhitelist[0].includes(data.tag))
            );
    };

    SocketTopics.canRemoveTag = async function (socket: any, data: any): Promise<boolean> {
        if (!data || !data.tag) {
            throw new Error('[[error:invalid-data]]');
        }

        const systemTags: string[] = (meta.config.systemTags || '').split(',');
        const isPrivileged: boolean = await user.isPrivileged(socket.uid);

        return isPrivileged || !systemTags.includes(String(data.tag).trim());
    };

    SocketTopics.autocompleteTags = async function (socket: any, data: any): Promise<string[]> {
        if (data.cid) {
            const canRead: boolean = await privileges.categories.can('topics:read', data.cid, socket.uid);
            if (!canRead) {
                throw new Error('[[error:no-privileges]]');
            }
        }
        data.cids = await categories.getCidsByPrivilege('categories:cid', socket.uid, 'topics:read');
        const result: any[] = await topics.autocompleteTags(data);
        return result.map((tag: any) => tag.value);
    };

    SocketTopics.searchTags = async function (socket: any, data: any): Promise<string[]> {
        const result: any[] = await searchTags(socket.uid, topics.searchTags, data);
        return result.map((tag: any) => tag.value);
    };

    SocketTopics.searchAndLoadTags = async function (socket: any, data: any): Promise<any[]> {
        return await searchTags(socket.uid, topics.searchAndLoadTags, data);
    };

    async function searchTags(uid: number, method: Function, data: any): Promise<any[]> {
        const allowed: boolean = await privileges.global.can('search:tags', uid);
        if (!allowed) {
            throw new Error('[[error:no-privileges]]');
        }
        if (data.cid) {
            const canRead: boolean = await privileges.categories.can('topics:read', data.cid, uid);
            if (!canRead) {
                throw new Error('[[error:no-privileges]]');
            }
        }
        data.cids = await categories.getCidsByPrivilege('categories:cid', uid, 'topics:read');
        return await method(data);
    }

    SocketTopics.loadMoreTags = async function (socket: any, data: any): Promise<{ tags: any[]; nextStart: number }> {
        if (!data || !utils.isNumber(data.after)) {
            throw new Error('[[error:invalid-data]]');
        }

        const start: number = parseInt(data.after, 10);
        const stop: number = start + 99;
        const cids: number[] = await categories.getCidsByPrivilege('categories:cid', socket.uid, 'topics:read');
        const tags: any[] = await topics.getCategoryTagsData(cids, start, stop);
        return { tags: tags.filter(Boolean), nextStart: stop + 1 };
    };
};
