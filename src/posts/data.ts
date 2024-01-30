import db = require('../database');
import plugins = require('../plugins');
import utils = require('../utils');

const intFields: string[] = [
    'uid', 'pid', 'tid', 'deleted', 'timestamp',
    'upvotes', 'downvotes', 'deleterUid', 'edited',
    'replies', 'bookmarks',
];

type Posts = {
  setPostFields: (pid: string, data: Record<string, string[] | string | number | symbol>) => Promise<void>;
  setPostField: (pid: string, field: string, value: string[], callback?: (err: Error | null) => void) => Promise<void>;
  getPostFields: (pid: string, fields: string[]) => Promise<PostData | null>;
  getPostsFields : (pid: string[], fields: string[]) => Promise<PostData[]>;
  getPostData: (pid: string) => Promise<PostData | null>
  getPostsData: (pid: string[]) => Promise<PostData[]>
  getPostField: (pid: string, field: string) => Promise<PostData[]>
};

type PostData = {
  uid: number;
  pid: string;
  tid: number;
  field: string;
  fields: string[];
  deleted: number;
  timestamp: number;
  upvotes: number;
  downvotes: number;
  deleterUid: number;
  edited: number;
  replies: number;
  bookmarks: number;
  votes?: number;
  timestampISO?: string;
  editedISO?: string;
};

function modifyPost(post: PostData, fields: string[]): void {
    if (post) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        db.parseIntFields(post, intFields, fields);
        if (post.hasOwnProperty('upvotes') && post.hasOwnProperty('downvotes')) {
            post.votes = post.upvotes - post.downvotes;
        }
        if (post.hasOwnProperty('timestamp')) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            post.timestampISO = utils.toISOString(post.timestamp) as string;
        }
        if (post.hasOwnProperty('edited')) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            post.editedISO = (post.edited !== 0 ? utils.toISOString(post.edited) : '') as string;
        }
    }
}

module.exports = function (Posts: Posts) {
    Posts.getPostsFields = async function (pids, fields) {
        if (!Array.isArray(pids) || !pids.length) {
            return [];
        }
        const keys = pids.map(pid => `post:${pid}`);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const postData = await db.getObjects(keys, fields) as PostData[];
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const result = await plugins.hooks.fire('filter:post.getFields', {
            pids: pids,
            posts: postData,
            fields: fields,
        }) as { posts: PostData[] };
        result.posts.forEach(post => modifyPost(post, fields));
        return result.posts;
    };

    Posts.getPostData = async function (pid) {
        const posts = await Posts.getPostsFields([pid], []);
        return posts && posts.length ? posts[0] : null;
    };

    Posts.getPostsData = async function (pids) {
        return await Posts.getPostsFields(pids, []);
    };

    Posts.getPostField = async function (pid, field) {
        const post = await Posts.getPostFields(pid, [field]);
        return post ? post[field] as PostData[] : null;
    };

    Posts.getPostFields = async function (pid, fields) {
        const posts = await Posts.getPostsFields([pid], fields);
        return posts ? posts[0] : null;
    };

    Posts.setPostField = async function (pid, field, value, callback: (err: Error | null) => void = null) {
        try {
            await Posts.setPostFields(pid, { [field]: value });
            if (callback) {
                callback(null);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(err as string);
            if (callback) {
                callback(error);
            } else {
                throw error;
            }
        }
    };

    Posts.setPostFields = async function (pid, data) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.setObject(`post:${pid}`, data);
        await plugins.hooks.fire('action:post.setFields', { data: { ...data, pid } });
    };
};

