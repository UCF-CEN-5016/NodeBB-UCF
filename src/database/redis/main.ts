// 'use strict';

import RedisClient from 'ioredis'; // Assuming you have the appropriate type definitions for RedisClient

interface Module {
  client: RedisClient;
  objectCache: any; // Replace with the actual type of objectCache if available
  flushdb: () => Promise<void>;
  emptydb: () => Promise<void>;
  exists: (key: string | string[]) => Promise<boolean | boolean[]>;
  scan: (params: { match: string }) => Promise<string[]>;
  delete: (key: string) => Promise<void>;
  deleteAll: (keys: string[]) => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  increment: (key: string) => Promise<number>;
  rename: (oldKey: string, newKey: string) => Promise<void>;
  type: (key: string) => Promise<string | null>;
  expire: (key: string, seconds: number) => Promise<void>;
  expireAt: (key: string, timestamp: number) => Promise<void>;
  pexpire: (key: string, ms: number) => Promise<void>;
  pexpireAt: (key: string, timestamp: number) => Promise<void>;
  ttl: (key: string) => Promise<number>;
  pttl: (key: string) => Promise<number>;
}

module.exports = (module: Module) => {
    module.flushdb = async () => {
        await module.client.flushall();
    };

    module.emptydb = async () => {
        await module.flushdb();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        module.objectCache.reset();
    };

    module.exists = async (key) => {
        if (Array.isArray(key)) {
            const data = await Promise.all(key.map(k => module.client.exists(k)));
            return data.map(exists => exists === 1);
        }
        const exists = await module.client.exists(key);
        return exists === 1;
    };

    module.scan = async (params) => {
        let cursor = '0';
        let returnData: string[] = [];
        const seen: { [key: string]: number } = {};
        do {
            /* eslint-disable no-await-in-loop */
            const res = await module.client.scan(cursor, 'MATCH', params.match, 'COUNT', 10000);
            cursor = res[0];
            const values = res[1].filter((value: string) => {
                const isSeen = !!seen[value];
                if (!isSeen) {
                    seen[value] = 1;
                }
                return !isSeen;
            });
            returnData = returnData.concat(values);
        } while (cursor !== '0');
        return returnData;
    };

    module.delete = async (key) => {
        await module.client.del(key);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        module.objectCache.del(key);
    };

    module.deleteAll = async (keys) => {
        if (!Array.isArray(keys) || !keys.length) {
            return;
        }
        await module.client.del(keys);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        module.objectCache.del(keys);
    };

    module.get = async key => await module.client.get(key);

    module.set = async (key, value) => {
        await module.client.set(key, value);
    };

    module.increment = async key => await module.client.incr(key);

    module.rename = async (oldKey, newKey) => {
        try {
            await module.client.rename(oldKey, newKey);
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            if (err && err.message !== 'ERR no such key') {
                throw err;
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        module.objectCache.del([oldKey, newKey]);
    };

    module.type = async (key) => {
        const type = await module.client.type(key);
        return type !== 'none' ? type : null;
    };

    module.expire = async (key, seconds) => {
        await module.client.expire(key, seconds);
    };

    module.expireAt = async (key, timestamp) => {
        await module.client.expireat(key, timestamp);
    };

    module.pexpire = async (key, ms) => {
        await module.client.pexpire(key, ms);
    };

    module.pexpireAt = async (key, timestamp) => {
        await module.client.pexpireat(key, timestamp);
    };

    module.ttl = async key => await module.client.ttl(key);

    module.pttl = async key => await module.client.pttl(key);
};
