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
const user = require("../user");
const plugins = require("../plugins");
const privileges = require("../privileges");
const sockets = require("../socket.io");
module.exports = function (Messaging) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    Messaging.editMessage = (uid, mid, roomId, content) => __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        yield Messaging.checkContent(content);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const raw = yield Messaging.getMessageField(mid, 'content');
        if (raw === content) {
            return;
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const payload = yield plugins.hooks.fire('filter:messaging.edit', {
            content: content,
            edited: Date.now(),
        });
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!String(payload.content).trim()) {
            throw new Error('[[error:invalid-chat-message]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        yield Messaging.setMessageFields(mid, payload);
        // Propagate this change to users in the room
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [uids, messages] = yield Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            Messaging.getUidsInRoom(roomId, 0, -1),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            Messaging.getMessagesData([mid], uid, roomId, true),
        ]);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        uids.forEach((uid) => {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions
            sockets.in(`uid_${uid}`).emit('event:chats.edit', {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                messages: messages,
            });
        });
    });
    const canEditDelete = (messageId, uid, type) => __awaiter(this, void 0, void 0, function* () {
        let durationConfig = '';
        if (type === 'edit') {
            durationConfig = 'chatEditDuration';
        }
        else if (type === 'delete') {
            durationConfig = 'chatDeleteDuration';
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const exists = yield Messaging.messageExists(messageId);
        if (!exists) {
            throw new Error('[[error:invalid-mid]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const isAdminOrGlobalMod = yield user.isAdminOrGlobalMod(uid);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (meta.config.disableChat) {
            throw new Error('[[error:chat-disabled]]');
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        }
        else if (!isAdminOrGlobalMod && meta.config.disableChatMessageEditing) {
            throw new Error('[[error:chat-message-editing-disabled]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const userData = yield user.getUserFields(uid, ['banned']);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (userData.banned) {
            throw new Error('[[error:user-banned]]');
        }
        const canChat = yield privileges.global.can('chat', uid);
        if (!canChat) {
            throw new Error('[[error:no-privileges]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const messageData = yield Messaging.getMessageFields(messageId, ['fromuid', 'timestamp', 'system']);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (isAdminOrGlobalMod && !messageData.system) {
            return;
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const chatConfigDuration = meta.config[durationConfig];
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (chatConfigDuration && Date.now() - messageData.timestamp > chatConfigDuration * 1000) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
            throw new Error(`[[error:chat-${type}-duration-expired, ${meta.config[durationConfig]}]]`);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (messageData.fromuid === parseInt(uid, 10) && !messageData.system) {
            return;
        }
        throw new Error(`[[error:cant-${type}-chat-message]]`);
    });
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    Messaging.canEdit = (messageId, uid) => __awaiter(this, void 0, void 0, function* () { return yield canEditDelete(messageId, uid, 'edit'); });
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    Messaging.canDelete = (messageId, uid) => __awaiter(this, void 0, void 0, function* () { return yield canEditDelete(messageId, uid, 'delete'); });
};
