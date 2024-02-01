import validator = require('validator');
import _ = require('lodash');

import topics = require('../topics');
import user = require('../user');
import plugins = require('../plugins');
import categories = require('../categories');
import utils = require('../utils');

type Posts = {
    getPostSummaryByPids(pids: number[], uid: number, options: Options): Promise<Post[]>;
    parsePost(post: Post): Promise<Post>
    getPostsFields(pids: number[], fields: string[]): Promise<Post[]>;
    overrideGuestHandle(post: Post, handle: number): number;
}

interface CategoryObject {
    cid: number;
    name: string;
    description: string;
    descriptionParsed: string;
    icon: string;
    bgColor: string;
    color: string;
    slug: string;
    parentCid: number;
    topic_count: number;
    post_count: number;
    disabled: number;
    order: number;
    link: string;
    numRecentReplies: number;
    class: string;
    imageClass: string;
    isSection: number;
    minTags: number;
    maxTags: number;
    postQueue: number;
    totalPostCount: number;
    totalTopicCount: number;
    subCategoriesPerPage: number;
}

interface Options {
    stripTags: boolean;
    parse: boolean;
    extraFields: string[];
}

interface Post {
    pid: number;
    tid: number;
    content: string;
    uid: number;
    timestamp: number;
    deleted: boolean | number;
    upvotes: number;
    downvotes: number;
    votes: number;
    timestampISO: string;
    user: UserObjectSlim;
    topic: TopicObject;
    category: CategoryObject;
    isMainPost: boolean;
    replies: number;
    handle: number;
}

interface TopicObject {
    tid: number;
    uid: number;
    cid: number;
    title: string;
    slug: string;
    mainPid: number;
    postcount: string;
    viewcount: string;
    postercount: string;
    scheduled: string;
    deleted: string;
    deleterUid: string;
    titleRaw: string;
    locked: string;
    pinned: number;
    timestamp: string;
    timestampISO: number;
    lastposttime: string;
    lastposttimeISO: number;
    pinExpiry: number;
    pinExpiryISO: number;
    upvotes: string;
    downvotes: string;
    votes: string;
    teaserPid: number | string;
}

interface UserObjectSlim {
    uid: number;
    username: string;
    displayname: string;
    userslug: string;
    picture: string;
    postcount: number;
    reputation: number;
    'email:confirmed': number;
    lastonline: number;
    flags: number;
    banned: number;
    'banned:expire': number;
    joindate: number;
    accounttype: string;
    'icon:text': string;
    'icon:bgColor': string;
    joindateISO: string;
    lastonlineISO: string;
    banned_until: number;
    banned_until_readable: string;
}

module.exports = function (Posts: Posts) {
    function toObject(key: string, data: UserObjectSlim[] | CategoryObject[] | TopicObject[]) {
        const obj = {};
        for (let i = 0; i < data.length; i += 1) {
            const keyValue: string = data[i][key] as string;
            obj[keyValue] = data[i];
        }
        return obj;
    }

    function stripTags(content: string): string {
        if (content) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return utils.stripHTMLTags(content, utils.stripTags);
        }
        return content;
    }

    async function getTopicAndCategories(tids: number[]) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const topicsData: TopicObject[] = await topics.getTopicsFields(tids, [
            'uid', 'tid', 'title', 'cid', 'tags', 'slug',
            'deleted', 'scheduled', 'postcount', 'mainPid', 'teaserPid',
        ]) as TopicObject[];

        const cids = _.uniq(topicsData.map(topic => topic && topic.cid));

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const categoriesData: CategoryObject[] = await categories.getCategoriesFields(cids, [
            'cid', 'name', 'icon', 'slug', 'parentCid',
            'bgColor', 'color', 'backgroundImage', 'imageClass',
        ]) as CategoryObject[];

        return { topics: topicsData, categories: categoriesData };
    }

    async function parsePosts(posts: Post[], options: Options) {
        return await Promise.all(posts.map(async (post: Post) => {
            if (!post.content || !options.parse) {
                post.content = post.content ? validator.escape(String(post.content)) : post.content;
                return post;
            }

            post = await Posts.parsePost(post);
            if (options.stripTags) {
                post.content = stripTags(post.content);
            }
            return post;
        }));
    }

    Posts.getPostSummaryByPids = async function (pids: number[], uid: number, options: Options) {
        if (!Array.isArray(pids) || !pids.length) {
            return [];
        }

        options.stripTags = options.hasOwnProperty('stripTags') ? options.stripTags : false;
        options.parse = options.hasOwnProperty('parse') ? options.parse : true;
        options.extraFields = options.hasOwnProperty('extraFields') ? options.extraFields : [];

        const fields = ['pid', 'tid', 'content', 'uid', 'timestamp', 'deleted', 'upvotes', 'downvotes', 'replies', 'handle'].concat(options.extraFields);
        let posts: Post[] = await Posts.getPostsFields(pids, fields);
        posts = posts.filter(Boolean);

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        posts = await user.blocks.filter(uid, posts) as Post[];

        const uids = _.uniq(posts.map(p => p && p.uid));
        const tids = _.uniq(posts.map(p => p && p.tid));

        const [users, topicsAndCategories] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            user.getUsersFields(uids, ['uid', 'username', 'userslug', 'picture', 'status']) as UserObjectSlim[],
            getTopicAndCategories(tids),
        ]);

        const uidToUser = toObject('uid', users);
        const tidToTopic = toObject('tid', topicsAndCategories.topics);
        const cidToCategory = toObject('cid', topicsAndCategories.categories);

        posts.forEach((post) => {
            // If the post author isn't represented in the retrieved users' data,
            // then it means they were deleted, assume guest.
            if (!uidToUser.hasOwnProperty(post.uid)) {
                post.uid = 0;
            }
            post.user = uidToUser[post.uid] as UserObjectSlim;

            Posts.overrideGuestHandle(post, post.handle);
            post.handle = undefined;
            post.topic = tidToTopic[post.tid] as TopicObject;
            post.category = post.topic && cidToCategory[post.topic.cid] as CategoryObject;
            post.isMainPost = post.topic && post.pid === post.topic.mainPid;
            post.deleted = post.deleted === 1;

            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            post.timestampISO = utils.toISOString(post.timestamp) as string;
        });

        posts = posts.filter(post => tidToTopic[post.tid]);

        posts = await parsePosts(posts, options);

        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const result = await plugins.hooks.fire('filter:post.getPostSummaryByPids', { posts: posts, uid: uid }) as { posts: Post[], uid: number};

        return result.posts;
    };
};
