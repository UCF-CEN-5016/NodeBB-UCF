
import * as validator from 'validator';

import * as user from '../user';

import * as meta from '../meta';

import * as messaging from '../messaging';
import * as plugins from '../plugins';

import * as socketHelpers from '../socket.io';

interface Caller {
    uid: string;
    ip: string;
}
interface Session {
    lastChatMessageTime: number;
}

interface Data {
    uids: string;
    map: string;
    roomId: number;
    message: string;
    name: string;
}

interface ChatsAPI {
    create: (caller: Caller, data: Data) => Promise<messaging>;
    post: (caller: Caller, data: Data) => Promise<messaging.sendMessage>;
    rename: (caller: Caller, data: Data) => Promise<Caller['uid']>;
    users: (caller: Caller, data: Data) => Promise<user>;
    invite: (caller: Caller, data: Data) => Promise<ChatsAPI['users']>;
    kick: (caller: Caller, data: Data) => Promise<ChatsAPI['users']>;

}

function rateLimitExceeded(caller) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    const session: Session = caller.request ? caller.request.session : caller.session; // socket vs req
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    const now = Date.now();
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    session.lastChatMessageTime = session.lastChatMessageTime || 0;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    if (now - session.lastChatMessageTime < meta.config.chatMessageDelay) {
        return true;
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    session.lastChatMessageTime = now;
    return false;
}
const chatsAPI: ChatsAPI = {
    async create(caller, data) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        if (rateLimitExceeded(caller)) {
            throw new Error('[[error:too-many-messages]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        if (!data.uids || !Array.isArray(data.uids)) {
            throw new Error(`[[error:wrong-parameter-type, uids, ${typeof data.uids}, Array]]`);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        await Promise.all(data.uids.map(async uid => messaging.canMessageUser(caller.uid, uid)));
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        const roomId = await messaging.newRoom(caller.uid, data.uids);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        return await messaging.getRoomData(roomId);
    },

    async post(caller, data) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        if (rateLimitExceeded(caller)) {
            throw new Error('[[error:too-many-messages]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        ({ data } = await plugins.hooks.fire('filter:messaging.send', {
            data,
            uid: caller.uid,
        }));
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        await messaging.canMessageRoom(caller.uid, data.roomId);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        const message = await messaging.sendMessage({
            uid: caller.uid,
            roomId: data.roomId,
            content: data.message,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
            timestamp: Date.now(),
            ip: caller.ip,
        });
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        messaging.notifyUsersInRoom(caller.uid, data.roomId, message);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        user.updateOnlineUsers(caller.uid);

        return message;
    },

    async rename(caller, data) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        await messaging.renameRoom(caller.uid, data.roomId, data.name);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        caller.uid = await messaging.getUidsInRoom(data.roomId, 0, -1);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        const eventData = { roomId: data.roomId, newName: validator.escape(String(data.name)) };

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        socketHelpers.emitToUids('event:chats.roomRename', eventData, caller.uid);

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        return messaging.loadRoom(caller.uid, {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
            roomId: data.roomId,
        });
    },

    async users(caller, data) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        const [isOwner, users] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
            messaging.isRoomOwner(caller.uid, data.roomId),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
            messaging.getUsersInRoom(data.roomId, 0, -1),
        ]);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        users.forEach((user) => {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
            user.canKick = (parseInt(user.uid, 10) !== parseInt(caller.uid, 10)) && isOwner;
        });
        return { users };
    },

    async invite(caller, data) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        const userCount = await messaging.getUserCountInRoom(data.roomId);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        const maxUsers = meta.config.maximumUsersInChatRoom;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        if (maxUsers && userCount >= maxUsers) {
            throw new Error('[[error:cant-add-more-users-to-chat-room]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        const uidsExist = await user.exists(data.uids);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        if (!uidsExist.every(Boolean)) {
            throw new Error('[[error:no-user]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        // (I could not figure out making function of a variable in data with correct types await Promise.all(data.uids.map(async (uid: string) => messaging.canMessageUser(caller.uid, uid)));
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        await messaging.addUsersToRoom(caller.uid, data.uids, data.roomId);

        delete data.uids;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        return chatsAPI.users(caller, data);
    },

    async kick(caller, data) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        const uidsExist = await user.exists(data.uids);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        if (!uidsExist.every(Boolean)) {
            throw new Error('[[error:no-user]]');
        }

        // Additional checks if kicking vs leaving
        if (data.uids.length === 1 && (data.uids[0]) === caller.uid) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
            await messaging.leaveRoom([caller.uid], data.roomId);
        } else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
            await messaging.removeUsersFromRoom(caller.uid, data.uids, data.roomId);
        }

        delete data.uids;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        return chatsAPI.users(caller, data);
    },
};
export = chatsAPI;
