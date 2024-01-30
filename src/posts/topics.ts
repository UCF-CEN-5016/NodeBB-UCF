import topics = require('../topics');
import user = require('../user');
import utils = require('../utils');

type Posts = {
    getPostsFromSet: (set: string, start: number, stop: number, uid: number, reverse: boolean) => Promise<PostData[]>;
    getPidsFromSet: (set: string, start: number, stop: number, reverse: boolean) => Promise<number[]>;
    getPostsByPids: (pids: number[], uid: number) => Promise<PostData[]>;
    isMain: (pids: number | number[]) => Promise<boolean | boolean[]>;
    getTopicFields: (pid: number, fields: string[]) => Promise<string[]>;
    getPostField: (pid: number, field: string) => Promise<number>;
    generatePostPath: (pid: number, uid: number) => Promise<string | null>;
    generatePostPaths: (pids: number[], uid: number) => Promise<(string | null)[]>;
    getPostsFields: (pids: number[], fields: string[]) => Promise<PostData[]>;
    getPostIndices: (postData: PostData[], uid: number) => Promise<number[]>;
    getTopicsFields: (tids: number[], fields: string[]) => Promise<PostData>;
};

interface PostData {
    pid: number;
    tid: number;
    content: string;
    uid: number;
    timestamp: number;
    deleted: boolean;
    upvotes: number;
    downvotes: number;
    votes: number;
    timestampISO: string;
    isMainPost: boolean;
    replies: number;
}

module.exports = function (Posts: Posts) {
    Posts.getPostsFromSet = async function (set, start, stop, uid, reverse) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const pids = await Posts.getPidsFromSet(set, start, stop, reverse);
        const posts = await Posts.getPostsByPids(pids, uid);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await user.blocks.filter(uid, posts) as PostData[];
    };

    Posts.isMain = async function (pids) {
        const isArray = Array.isArray(pids);
        const pidsArray = isArray ? (pids) : [pids];
        const postData = await Posts.getPostsFields(pidsArray, ['tid']);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const topicData = await topics.getTopicsFields(postData.map(t => t.tid), ['mainPid']) as PostData;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const result = pidsArray.map((pid, i) => pid === topicData[i].mainPid);
        return isArray ? result : result[0];
    };

    Posts.getTopicFields = async function (pid, fields) {
        const tid = await Posts.getPostField(pid, 'tid');
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await topics.getTopicFields(tid, fields) as string[];
    };

    Posts.generatePostPath = async function (pid, uid) {
        const paths = await Posts.generatePostPaths([pid], uid);
        return Array.isArray(paths) && paths.length ? paths[0] : null;
    };

    Posts.generatePostPaths = async function (pids, uid) {
        const postData = await Posts.getPostsFields(pids, ['pid', 'tid']);
        const tids = postData.map(post => post && post.tid);
        const [indices, topicData]: [number[], PostData] = await Promise.all([
            Posts.getPostIndices(postData, uid),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            topics.getTopicsFields(tids, ['slug']) as PostData,
        ]);

        const paths = pids.map((pid, index) => {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const slug = (topicData[index] ? topicData[index].slug : null) as number;
            const postIndex = utils.isNumber(indices[index]) ? indices[index] + 1 : null;

            if (slug && postIndex) {
                return `/topic/${slug}/${postIndex}`;
            }
            return null;
        });

        return paths;
    };
};
