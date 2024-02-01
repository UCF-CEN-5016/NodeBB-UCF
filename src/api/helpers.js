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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = __importDefault(require("url"));
const user_1 = __importDefault(require("../user"));
const topics_1 = __importDefault(require("../topics"));
const posts_1 = __importDefault(require("../posts"));
const privileges_1 = __importDefault(require("../privileges"));
const plugins_1 = __importDefault(require("../plugins"));
const helpers_1 = __importDefault(require("../socket.io/helpers"));
const socket_io_1 = __importDefault(require("../socket.io"));
const events_1 = __importDefault(require("../events"));
exports.setDefaultPostData = function (reqOrSocket, data) {
    data.uid = reqOrSocket.uid;
    data.req = exports.buildReqObject(reqOrSocket, Object.assign({}, data));
    data.timestamp = Date.now();
    data.fromQueue = false;
};
// creates a slimmed down version of the request object
exports.buildReqObject = (req, payload) => {
    // req = req || {};
    const headers = req.headers || (req.request && req.request.headers) || {};
    const encrypted = req.connection ? !!req.connection.encrypted : false;
    let host = headers;
    const referer = headers.referer || '';
    if (!host) {
        host = url_1.default.parse(referer).host || '';
    }
    return {
        uid: req.uid,
        params: req.params,
        method: req.method,
        body: payload || req.body,
        session: req.session,
        ip: req.ip,
        host: host,
        protocol: encrypted ? 'https' : 'http',
        secure: encrypted,
        url: referer,
        path: referer.slice(referer.indexOf(host) + host.length),
        headers: headers,
    };
};
function logTopicAction(action, req, tid, title) {
    return __awaiter(this, void 0, void 0, function* () {
        // Only log certain actions to system event log
        const actionsToLog = ['delete', 'restore', 'purge'];
        if (!actionsToLog.includes(action)) {
            return;
        }
        yield events_1.default.log({
            type: `topic-${action}`,
            uid: req.uid,
            ip: req.ip,
            tid: tid,
            title: String(title),
        });
    });
}
exports.doTopicAction = function (action, event, caller, { tids }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!Array.isArray(tids)) {
            throw new Error('[[error:invalid-tid]]');
        }
        const exists = yield topics_1.default.exists(tids);
        if (!exists.every(Boolean)) {
            throw new Error('[[error:no-topic]]');
        }
        if (typeof topics_1.default.tools[action] !== 'function') {
            return;
        }
        const uids = yield user_1.default.getUidsFromSet('users:online', 0, -1);
        yield Promise.all(tids.map((tid) => __awaiter(this, void 0, void 0, function* () {
            const title = yield topics_1.default.getTopicField(tid, 'title');
            const data = yield topics_1.default.tools[action](tid, caller.uid);
            const notifyUids = yield privileges_1.default.categories.filterUids('topics:read', data.cid, uids);
            helpers_1.default.emitToUids(event, data, notifyUids);
            yield logTopicAction(action, caller, tid, title);
        })));
    });
};
exports.postCommand = function (caller, command, eventName, notification, data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!caller.uid) {
            throw new Error('[[error:not-logged-in]]');
        }
        if (!data || !data.pid) {
            throw new Error('[[error:invalid-data]]');
        }
        if (!data.room_id) {
            throw new Error(`[[error:invalid-room-id, ${data.room_id} ]]`);
        }
        const [exists, deleted] = yield Promise.all([
            posts_1.default.exists(data.pid),
            posts_1.default.getPostField(data.pid, 'deleted'),
        ]);
        if (!exists) {
            throw new Error('[[error:invalid-pid]]');
        }
        if (deleted) {
            throw new Error('[[error:post-deleted]]');
        }
        /*
        hooks:
            filter:post.upvote
            filter:post.downvote
            filter:post.unvote
            filter:post.bookmark
            filter:post.unbookmark
         */
        const filteredData = yield plugins_1.default.hooks.fire(`filter:post.${command}`, {
            data: data,
            uid: caller.uid,
        });
        return yield executeCommand(caller, command, eventName, notification, filteredData.data);
    });
};
function executeCommand(caller, command, eventName, notification, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield posts_1.default[command](data.pid, caller.uid);
        if (result && eventName) {
            socket_io_1.default.in(`uid_${caller.uid}`).emit(`posts.${command}`, result);
            socket_io_1.default.in(data.room_id).emit(`event:${eventName}`, result);
        }
        if (result && command === 'upvote') {
            helpers_1.default.upvote(result, notification);
        }
        else if (result && notification) {
            helpers_1.default.sendNotificationToPostOwner(data.pid, caller.uid, command, notification);
        }
        else if (result && command === 'unvote') {
            helpers_1.default.rescindUpvoteNotification(data.pid, caller.uid);
        }
        return result;
    });
}
