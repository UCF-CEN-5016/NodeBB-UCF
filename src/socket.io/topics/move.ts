'use strict';

import * as async from 'async';
import * as user from '../../user';
import * as topics from '../../topics';
import * as categories from '../../categories';
import * as privileges from '../../privileges';
import * as socketHelpers from '../helpers';
import * as events from '../../events';

export = function (SocketTopics: any): void {
    SocketTopics.move = async function (socket: any, data: any): Promise<void> {
        if (!data || !Array.isArray(data.tids) || !data.cid) {
            throw new Error('[[error:invalid-data]]');
        }

        const canMove = await privileges.categories.isAdminOrMod(data.cid, socket.uid);
        if (!canMove) {
            throw new Error('[[error:no-privileges]]');
        }

        const uids = await user.getUidsFromSet('users:online', 0, -1);

        await async.eachLimit(data.tids, 10, async (tid: number) => {
            const canMove = await privileges.topics.isAdminOrMod(tid, socket.uid);
            if (!canMove) {
                throw new Error('[[error:no-privileges]]');
            }

            const topicData = await topics.getTopicFields(tid, ['tid', 'cid', 'slug', 'deleted']);
            data.uid = socket.uid;
            await topics.tools.move(tid, data);

            const notifyUids = await privileges.categories.filterUids('topics:read', topicData.cid, uids);
            socketHelpers.emitToUids('event:topic_moved', topicData, notifyUids);

            if (!topicData.deleted) {
                socketHelpers.sendNotificationToTopicOwner(tid, socket.uid, 'move', 'notifications:moved_your_topic');
            }

            await events.log({
                type: 'topic-move',
                uid: socket.uid,
                ip: socket.ip,
                tid: tid,
                fromCid: topicData.cid,
                toCid: data.cid,
            });
        });
    };

    SocketTopics.moveAll = async function (socket: any, data: any): Promise<void> {
        if (!data || !data.cid || !data.currentCid) {
            throw new Error('[[error:invalid-data]]');
        }

        const canMove = await privileges.categories.canMoveAllTopics(data.currentCid, data.cid, socket.uid);
        if (!canMove) {
            throw new Error('[[error:no-privileges]]');
        }

        const tids = await categories.getAllTopicIds(data.currentCid, 0, -1);
        data.uid = socket.uid;

        await async.eachLimit(tids, 50, async (tid: number) => {
            await topics.tools.move(tid, data);
        });

        await events.log({
            type: 'topic-move-all',
            uid: socket.uid,
            ip: socket.ip,
            fromCid: data.currentCid,
            toCid: data.cid,
        });
    };
};
