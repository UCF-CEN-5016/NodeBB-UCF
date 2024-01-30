/* 
Had to suppress almost every line containing 'async', 'await', or 'Messaging' as
any attempt I made to infer the return types caused errors
*/

// Converted const to import
import winston = require('winston');

import user = require('../user');
import notifications = require('../notifications');
import sockets = require('../socket.io');
import plugins = require('../plugins');
import meta = require('../meta');

// Added interfaces as an attempt to type some of the objects
interface MessageObject {
    content?: string;
    fromUser?: {
        displayname?: string;
    };
    roomId?: string;
    system?: boolean;
}

interface DataObject {
    roomId: string;
    fromUid: string;
    message: MessageObject;
    uids: string[];
    self?: number;
}

interface QueueObject {
    message: MessageObject;
    timeout?: NodeJS.Timeout;
}


module.exports = function (Messaging) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    Messaging.notifyQueue = {} as Record<string, QueueObject>;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    Messaging.notifyUsersInRoom = async (fromUid: string, roomId: string, messageObj: MessageObject): Promise<void> => {
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        let uids: string[] = await Messaging.getUidsInRoom(roomId, 0, -1);
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        uids = await user.blocks.filterUids(fromUid, uids);

        let data: DataObject = {
            roomId: roomId,
            fromUid: fromUid,
            message: messageObj,
            uids: uids,
        };
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        data = await plugins.hooks.fire('filter:messaging.notify', data);
        if (!data || !data.uids || !data.uids.length) {
            return;
        }

        uids = data.uids;
        uids.forEach((uid: string) => {
            data.self = parseInt(uid, 10) === parseInt(fromUid, 10) ? 1 : 0;
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            Messaging.pushUnreadCount(uid);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            sockets.in(`uid_${uid}`).emit('event:chats.receive', data);
        });
        if (messageObj.system) {
            return;
        }

        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        let queueObj: QueueObject | undefined = Messaging.notifyQueue[`${fromUid}:${roomId}`];
        if (queueObj) {
            queueObj.message.content += `\n${messageObj.content}`;
            clearTimeout(queueObj.timeout);
        } else {
            queueObj = {
                message: messageObj,
            };
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            Messaging.notifyQueue[`${fromUid}:${roomId}`] = queueObj;
        }

        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access,, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-use-before-define
        queueObj.timeout = setTimeout(async () => {
            try {
                // eslint-disable-next-line max-len
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-use-before-define
                await sendNotifications(fromUid, uids, roomId, queueObj.message);
            } catch (err) {
                // eslint-disable-next-line max-len
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-use-before-define
                winston.error(`[messaging/notifications] Unable to send notification\n${err.stack}`);
            }
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-use-before-define
        }, meta.config.notificationSendDelay * 1000);
    };

    // eslint-disable-next-line max-len
    async function sendNotifications(fromUid: string, uids: string[], roomId: string, messageObj: MessageObject): Promise<void> {
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const isOnline = await user.isOnline(uids);
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
        uids = uids.filter((uid, index) => !isOnline[index] && parseInt(fromUid, 10) !== parseInt(uid, 10));
        if (!uids.length) {
            return;
        }

        const { displayname } = messageObj.fromUser || {};

        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
        const isGroupChat = await Messaging.isGroupChat(roomId);
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
        const notification = await notifications.create({
            type: isGroupChat ? 'new-group-chat' : 'new-chat',
            subject: `[[email:notif.chat.subject, ${displayname}]]`,
            bodyShort: `[[notifications:new_message_from, ${displayname}]]`,
            bodyLong: messageObj.content,
            nid: `chat_${fromUid}_${roomId}`,
            from: fromUid,
            path: `/chats/${messageObj.roomId}`,
        });

        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
        Messaging.notifyQueue[`${fromUid}:${roomId}`] = undefined;
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-floating-promises, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
        notifications.push(notification, uids);
    }
};
