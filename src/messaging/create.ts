/* eslint max-len: off */
/* eslint-disable import/no-import-module-exports */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import meta from '../meta';
import plugins from '../plugins';
import db from '../database';
import user from '../user';

interface MessageData {
    content:string;
    uid:string;
    roomId:string;
    timestamp?:number;
    system?:number;
    ip?:string;
    mid?:number;
    newSet?:boolean;
    deleted?:number;
}

// I made Messaging be any since it is defined and used many times outside of this file and
// the type is not defined

// The next defines a variable as 'any' that is used outside of this file and the type is unknown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
module.exports = function (Messaging: any) {
    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    Messaging.sendMessage = async (data: MessageData): Promise<any> => {
        // The next line calls a variable in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,  @typescript-eslint/no-unsafe-assignment
        await Messaging.checkContent(data.content);
        // The next line calls a variable in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,  @typescript-eslint/no-unsafe-assignment
        const inRoom: boolean = await Messaging.isUserInRoom(data.uid, data.roomId);
        if (!inRoom) {
            throw new Error('[[error:not-allowed]]');
        }

        // The next line calls a variable in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,  @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return
        return await Messaging.addMessage(data);
    };

    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    Messaging.checkContent = async (content: string): Promise<void> => {
        if (!content) {
            throw new Error('[[error:invalid-chat-message]]');
        }

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const maximumChatMessageLength: number = meta.config.maximumChatMessageLength || 1000;
        content = content.trim();
        let { length } = content;


        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        ({ content, length } = await plugins.hooks.fire('filter:messaging.checkContent', { content, length }));
        if (!content) {
            throw new Error('[[error:invalid-chat-message]]');
        }
        if (length > maximumChatMessageLength) {
            throw new Error(`[[error:chat-message-too-long, ${maximumChatMessageLength}]]`);
        }
    };

    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    Messaging.addMessage = async (data: MessageData): Promise<MessageData> => {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const mid: number = await db.incrObjectField('global', 'nextMid');
        const timestamp: number = data.timestamp || Date.now();

        // I made message be any since it is used outside of this file and the type is unknown
        // The next defines a variable as 'any' that is used outside of this file and the type is unknown
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let message: any = {
            content: data.content,
            timestamp: timestamp,
            fromuid: data.uid,
            roomId: data.roomId,
            deleted: 0,
            system: data.system || 0,
        };

        if (data.ip) {
            message.ip = data.ip;
        }

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        message = await plugins.hooks.fire('filter:messaging.save', message);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await db.setObject(`message:${mid}`, message);
        // The next line calls a variable in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,  @typescript-eslint/no-unsafe-assignment
        const isNewSet: boolean = await Messaging.isNewSet(data.uid, data.roomId, timestamp);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        let uids: string[] = await db.getSortedSetRange(`chat:room:${data.roomId}:uids`, 0, -1);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        uids = await user.blocks.filterUids(data.uid, uids);

        await Promise.all([
            // The next few lines calls a variable in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            Messaging.addRoomToUsers(data.roomId, uids, timestamp),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            Messaging.addMessageToUsers(data.roomId, uids, mid, timestamp),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            Messaging.markUnread(uids.filter(uid => uid !== String(data.uid)), data.roomId),
        ]);

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const messages: MessageData[] = await Messaging.getMessagesData([mid], data.uid, data.roomId, true);
        if (!messages || !messages[0]) {
            return null;
        }

        messages[0].newSet = isNewSet;
        messages[0].mid = mid;
        messages[0].roomId = data.roomId;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await plugins.hooks.fire('action:messaging.save', { message: messages[0], data: data });
        return messages[0];
    };

    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    Messaging.addSystemMessage = async (content: string, uid: string, roomId: string): Promise<void> => {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const message: MessageData = await Messaging.addMessage({
            content: content,
            uid: uid,
            roomId: roomId,
            system: 1,
        });
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        Messaging.notifyUsersInRoom(uid, roomId, message);
    };

    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    Messaging.addRoomToUsers = async (roomId: string, uids: string[], timestamp: number): Promise<void> => {
        if (!uids.length) {
            return;
        }

        const keys = uids.map(uid => `uid:${uid}:chat:rooms`);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await db.sortedSetsAdd(keys, timestamp, roomId);
    };

    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    Messaging.addMessageToUsers = async (roomId: string, uids: string[], mid: number, timestamp: number): Promise<void> => {
        if (!uids.length) {
            return;
        }
        const keys = uids.map(uid => `uid:${uid}:chat:room:${roomId}:mids`);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await db.sortedSetsAdd(keys, timestamp, mid);
    };
};
