'use strict';

import * as topics from '../topics'; // Replace with the actual path to the topics module
import * as user from '../user'; // Replace with the actual path to the user module
import * as utils from '../utils'; // Replace with the actual path to the utils module

interface PostsModel {
    getPidsFromSet(set: any, start: number, stop: number, reverse: boolean): Promise<string[]>;
    getPostsByPids(pids: string[], uid: string): Promise<any[]>;
    getPostsFields(pids: string[], fields: string[]): Promise<any[]>;
    getPostField(pid: string, field: string): Promise<any>;
    getPostIndices(posts: any[], uid: string): Promise<number[]>;
    generatePostPaths(pids: string[], uid: string): Promise<string[]>;
}

interface Posts extends PostsModel {
    getPostsFromSet(set: any, start: number, stop: number, uid: string, reverse: boolean): Promise<any[]>;
    isMain(pids: string | string[]): Promise<boolean | boolean[]>;
    getTopicFields(pid: string, fields: string[]): Promise<any>;
    generatePostPath(pid: string, uid: string): Promise<string | null>;
}

export = function (Posts: Posts) {
    Posts.getPostsFromSet = async function (set: any, start: number, stop: number, uid: string, reverse: boolean) {
        const pids = await Posts.getPidsFromSet(set, start, stop, reverse);
        const posts = await Posts.getPostsByPids(pids, uid);
        return await user.blocks.filter(uid, posts);
    };

    Posts.isMain = async function (pids: string | string[]) {
        const isArray = Array.isArray(pids);
        pids = isArray ? (pids as string[]) : [pids as string];
        const postData = await Posts.getPostsFields(pids, ['tid']);
        const topicData = await topics.getTopicsFields(postData.map(t => t.tid), ['mainPid']);
        const result = pids.map((pid, i) => parseInt(pid, 10) === parseInt(topicData[i].mainPid, 10));
        return isArray ? result : result[0];
    };

    Posts.getTopicFields = async function (pid: string, fields: string[]) {
        const tid = await Posts.getPostField(pid, 'tid');
        return await topics.getTopicFields(tid, fields);
    };

    Posts.generatePostPath = async function (pid: string, uid: string) {
        const paths = await Posts.generatePostPaths([pid], uid);
        return Array.isArray(paths) && paths.length ? paths[0] : null;
    };

    Posts.generatePostPaths = async function (pids: string[], uid: string) {
        const postData = await Posts.getPostsFields(pids, ['pid', 'tid']);
        const tids = postData.map(post => post && post.tid);
        const [indices, topicData] = await Promise.all([
            Posts.getPostIndices(postData, uid),
            topics.getTopicsFields(tids, ['slug']),
        ]);

        const paths = pids.map((pid, index) => {
            const slug = topicData[index] ? topicData[index].slug : null;
            const postIndex = utils.isNumber(indices[index]) ? parseInt(String(indices[index]), 10) + 1 : null;

            if (slug && postIndex) {
                return `/topic/${slug}/${postIndex}`;
            }
            return null;
        });

        return paths;
    };
};
