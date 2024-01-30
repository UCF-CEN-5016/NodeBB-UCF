import plugins from '../plugins';
import posts from '../posts';

type HooksFire = {
    params: { uid: number; cid: number; title: string };
};

interface MyOptions {
    mainTid?: number;
    newTopicTitle?: string;
}

interface MyTopicData {
    scheduled: string;
    uid: number;
    cid: number;
    viewcount: number;
}

interface MyTopicFields {
    mergeIntoTid: number;
    mergerUid: number;
    mergedTimestamp: number;
}

interface MyTopics {
    merge: (tids: number[], uid: number, options: MyOptions) => Promise<number>;
    delete: (tid: number, uid: number) => Promise<void>;
    create: (obj: { uid: number; cid: number; title: string }) => Promise<number>;
    movePostToTopic: (uid: number, pid: number, mergeIntoTid: number) => Promise<void>;

    getPids: (tid: number) => Promise<number[]>;
    getTopicFields: (tid: number, something: string[]) => Promise<MyTopicData>;
    getTopicsFields: (tids: number[], something: string[]) => Promise<MyTopicData[]>;

    setTopicField: (tid: number, x: string, y: number) => Promise<void>;
    setTopicFields: (tid: number, field: MyTopicFields) => Promise<void>;
}

export = function (Topics: MyTopics) {
    Topics.merge = async function (tids: number[], uid: number, options: MyOptions) {
        async function createNewTopic(title: string, oldestTid: number) {
            const topicData = await Topics.getTopicFields(oldestTid, ['uid', 'cid']);
            const params = {
                uid: topicData.uid,
                cid: topicData.cid,
                title: title,
            };
            const result: HooksFire = await plugins.hooks.fire('filter:topic.mergeCreateNewTopic', {
                oldestTid: oldestTid,
                params: params,
            }) as HooksFire;

            const tid = await Topics.create(result.params);
            return tid;
        }

        async function updateViewCount(mergeIntoTid: number, tids: number[]) {
            const topicData = await Topics.getTopicsFields(tids, ['viewcount']);
            const totalViewCount = topicData.reduce(
                (count, topic) => count + topic.viewcount,
                0
            );
            await Topics.setTopicField(mergeIntoTid, 'viewcount', totalViewCount);
        }

        function findOldestTopic(tids: number[]): number {
            return Math.min.apply(null, tids) as number;
        }

        options = options || {};

        const topicsData = await Topics.getTopicsFields(tids, ['scheduled']);
        if (topicsData.some(t => t.scheduled)) {
            throw new Error('[[error:cant-merge-scheduled]]');
        }

        const oldestTid = findOldestTopic(tids);
        let mergeIntoTid = oldestTid;
        if (options.mainTid) {
            mergeIntoTid = options.mainTid;
        } else if (options.newTopicTitle) {
            mergeIntoTid = await createNewTopic(options.newTopicTitle, oldestTid);
        }

        const otherTids = tids.sort((a, b) => a - b)
            .filter(tid => tid && tid !== mergeIntoTid);

        for (const tid of otherTids) {
            /* eslint-disable no-await-in-loop */
            const pids = await Topics.getPids(tid);
            for (const pid of pids) {
                await Topics.movePostToTopic(uid, pid, mergeIntoTid);
            }

            await Topics.setTopicField(tid, 'mainPid', 0);
            await Topics.delete(tid, uid);
            await Topics.setTopicFields(tid, {
                mergeIntoTid: mergeIntoTid,
                mergerUid: uid,
                mergedTimestamp: Date.now(),
            });
        }

        await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            posts.updateQueuedPostsTopic(mergeIntoTid, otherTids),
            updateViewCount(mergeIntoTid, tids),
        ]);


        await plugins.hooks.fire('action:topic.merge', {
            uid: uid,
            tids: tids,
            mergeIntoTid: mergeIntoTid,
            otherTids: otherTids,
        });
        return mergeIntoTid;
    };
};
