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
// Import statements for external modules
const meta = __importStar(require("../meta"));
const user = __importStar(require("../user"));
const plugins = __importStar(require("../plugins"));
const privileges = __importStar(require("../privileges"));
const sockets = __importStar(require("../socket.io"));
module.exports = function (Messaging) {
    // Implement the editMessage function
    Messaging.editMessage = (uid, mid, roomId, content) => __awaiter(this, void 0, void 0, function* () {
        yield Messaging.checkContent(content);
        const raw = yield Messaging.getMessageField(mid, 'content');
        if (raw === content) {
            return;
        }
        const payload = yield plugins.hooks.fire('filter:messaging.edit', {
            content: content,
            edited: Date.now(),
        });
        if (!String(payload.content).trim()) {
            throw new Error('[[error:invalid-chat-message]]');
        }
        yield Messaging.setMessageFields(mid, payload);
        // Propagate this change to users in the room
        const [uids, messages] = yield Promise.all([
            Messaging.getUidsInRoom(roomId, 0, -1),
            Messaging.getMessagesData([mid], uid, roomId, true),
        ]);
        uids.forEach((uid) => {
            sockets.in(`uid_${uid}`).emit('event:chats.edit', {
                messages: messages,
            });
        });
    });
    // Implement the canEditDelete function
    const canEditDelete = (messageId, uid, type) => __awaiter(this, void 0, void 0, function* () {
        let durationConfig = '';
        if (type === 'edit') {
            durationConfig = 'chatEditDuration';
        }
        else if (type === 'delete') {
            durationConfig = 'chatDeleteDuration';
        }
        const exists = yield Messaging.messageExists(messageId);
        if (!exists) {
            throw new Error('[[error:invalid-mid]]');
        }
        const isAdminOrGlobalMod = yield user.isAdminOrGlobalMod(uid);
        if (meta.config.disableChat) {
            throw new Error('[[error:chat-disabled]]');
        }
        else if (!isAdminOrGlobalMod && meta.config.disableChatMessageEditing) {
            throw new Error('[[error:chat-message-editing-disabled]]');
        }
        const userData = yield user.getUserFields(uid, ['banned']);
        if (userData.banned) {
            throw new Error('[[error:user-banned]]');
        }
        const canChat = yield privileges.global.can('chat', uid);
        if (!canChat) {
            throw new Error('[[error:no-privileges]]');
        }
        const messageData = yield Messaging.getMessageFields(messageId, ['fromuid', 'timestamp', 'system']);
        if (isAdminOrGlobalMod && !messageData.system) {
            return;
        }
        const chatConfigDuration = meta.config[durationConfig];
        if (chatConfigDuration && Date.now() - messageData.timestamp > chatConfigDuration * 1000) {
            throw new Error(`[[error:chat-${type}-duration-expired, ${meta.config[durationConfig]}]]`);
        }
        if (messageData.fromuid === parseInt(uid, 10) && !messageData.system) {
            return;
        }
        throw new Error(`[[error:cant-${type}-chat-message]]`);
    });
    // Implement the canEdit and canDelete functions
    Messaging.canEdit = (messageId, uid) => __awaiter(this, void 0, void 0, function* () { return yield canEditDelete(messageId, uid, 'edit'); });
    Messaging.canDelete = (messageId, uid) => __awaiter(this, void 0, void 0, function* () { return yield canEditDelete(messageId, uid, 'delete'); });
};
