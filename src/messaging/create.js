"use strict";
/* eslint max-len: off */
/* eslint-disable import/no-import-module-exports */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const meta_1 = __importDefault(require("../meta"));
const plugins_1 = __importDefault(require("../plugins"));
const database_1 = __importDefault(require("../database"));
const user_1 = __importDefault(require("../user"));
// I made Messaging be any since it is defined and used many times outside of this file and
// the type is not defined
// The next defines a variable as 'any' that is used outside of this file and the type is unknown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
module.exports = function (Messaging) {
    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    Messaging.sendMessage = (data) => __awaiter(this, void 0, void 0, function* () {
        // The next line calls a variable in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,  @typescript-eslint/no-unsafe-assignment
        yield Messaging.checkContent(data.content);
        // The next line calls a variable in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,  @typescript-eslint/no-unsafe-assignment
        const inRoom = yield Messaging.isUserInRoom(data.uid, data.roomId);
        if (!inRoom) {
            throw new Error('[[error:not-allowed]]');
        }
        // The next line calls a variable in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,  @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return
        return yield Messaging.addMessage(data);
    });
    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    Messaging.checkContent = (content) => __awaiter(this, void 0, void 0, function* () {
        if (!content) {
            throw new Error('[[error:invalid-chat-message]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const maximumChatMessageLength = meta_1.default.config.maximumChatMessageLength || 1000;
        content = content.trim();
        let { length } = content;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        ({ content, length } = yield plugins_1.default.hooks.fire('filter:messaging.checkContent', { content, length }));
        if (!content) {
            throw new Error('[[error:invalid-chat-message]]');
        }
        if (length > maximumChatMessageLength) {
            throw new Error(`[[error:chat-message-too-long, ${maximumChatMessageLength}]]`);
        }
    });
    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    Messaging.addMessage = (data) => __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const mid = yield database_1.default.incrObjectField('global', 'nextMid');
        const timestamp = data.timestamp || Date.now();
        // I made message be any since it is used outside of this file and the type is unknown
        // The next defines a variable as 'any' that is used outside of this file and the type is unknown
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let message = {
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
        message = yield plugins_1.default.hooks.fire('filter:messaging.save', message);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        yield database_1.default.setObject(`message:${mid}`, message);
        // The next line calls a variable in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,  @typescript-eslint/no-unsafe-assignment
        const isNewSet = yield Messaging.isNewSet(data.uid, data.roomId, timestamp);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        let uids = yield database_1.default.getSortedSetRange(`chat:room:${data.roomId}:uids`, 0, -1);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        uids = yield user_1.default.blocks.filterUids(data.uid, uids);
        yield Promise.all([
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
        const messages = yield Messaging.getMessagesData([mid], data.uid, data.roomId, true);
        if (!messages || !messages[0]) {
            return null;
        }
        messages[0].newSet = isNewSet;
        messages[0].mid = mid;
        messages[0].roomId = data.roomId;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        yield plugins_1.default.hooks.fire('action:messaging.save', { message: messages[0], data: data });
        return messages[0];
    });
    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    Messaging.addSystemMessage = (content, uid, roomId) => __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const message = yield Messaging.addMessage({
            content: content,
            uid: uid,
            roomId: roomId,
            system: 1,
        });
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        Messaging.notifyUsersInRoom(uid, roomId, message);
    });
    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    Messaging.addRoomToUsers = (roomId, uids, timestamp) => __awaiter(this, void 0, void 0, function* () {
        if (!uids.length) {
            return;
        }
        const keys = uids.map(uid => `uid:${uid}:chat:rooms`);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        yield database_1.default.sortedSetsAdd(keys, timestamp, roomId);
    });
    // The next line utilizes a variable in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    Messaging.addMessageToUsers = (roomId, uids, mid, timestamp) => __awaiter(this, void 0, void 0, function* () {
        if (!uids.length) {
            return;
        }
        const keys = uids.map(uid => `uid:${uid}:chat:room:${roomId}:mids`);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        yield database_1.default.sortedSetsAdd(keys, timestamp, mid);
    });
};
