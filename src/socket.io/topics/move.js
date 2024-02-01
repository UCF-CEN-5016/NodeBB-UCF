'use strict';
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
const async = __importStar(require("async"));
const user = __importStar(require("../../user"));
const topics = __importStar(require("../../topics"));
const categories = __importStar(require("../../categories"));
const privileges = __importStar(require("../../privileges"));
const socketHelpers = __importStar(require("../helpers"));
const events = __importStar(require("../../events"));
module.exports = function (SocketTopics) {
    SocketTopics.move = function (socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !Array.isArray(data.tids) || !data.cid) {
                throw new Error('[[error:invalid-data]]');
            }
            const canMove = yield privileges.categories.isAdminOrMod(data.cid, socket.uid);
            if (!canMove) {
                throw new Error('[[error:no-privileges]]');
            }
            const uids = yield user.getUidsFromSet('users:online', 0, -1);
            yield async.eachLimit(data.tids, 10, (tid) => __awaiter(this, void 0, void 0, function* () {
                const canMove = yield privileges.topics.isAdminOrMod(tid, socket.uid);
                if (!canMove) {
                    throw new Error('[[error:no-privileges]]');
                }
                const topicData = yield topics.getTopicFields(tid, ['tid', 'cid', 'slug', 'deleted']);
                data.uid = socket.uid;
                yield topics.tools.move(tid, data);
                const notifyUids = yield privileges.categories.filterUids('topics:read', topicData.cid, uids);
                socketHelpers.emitToUids('event:topic_moved', topicData, notifyUids);
                if (!topicData.deleted) {
                    socketHelpers.sendNotificationToTopicOwner(tid, socket.uid, 'move', 'notifications:moved_your_topic');
                }
                yield events.log({
                    type: 'topic-move',
                    uid: socket.uid,
                    ip: socket.ip,
                    tid: tid,
                    fromCid: topicData.cid,
                    toCid: data.cid,
                });
            }));
        });
    };
    SocketTopics.moveAll = function (socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.cid || !data.currentCid) {
                throw new Error('[[error:invalid-data]]');
            }
            const canMove = yield privileges.categories.canMoveAllTopics(data.currentCid, data.cid, socket.uid);
            if (!canMove) {
                throw new Error('[[error:no-privileges]]');
            }
            const tids = yield categories.getAllTopicIds(data.currentCid, 0, -1);
            data.uid = socket.uid;
            yield async.eachLimit(tids, 50, (tid) => __awaiter(this, void 0, void 0, function* () {
                yield topics.tools.move(tid, data);
            }));
            yield events.log({
                type: 'topic-move-all',
                uid: socket.uid,
                ip: socket.ip,
                fromCid: data.currentCid,
                toCid: data.cid,
            });
        });
    };
};
