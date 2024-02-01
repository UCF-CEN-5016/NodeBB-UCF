"use strict";
// 'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = (module) => {
    module.flushdb = () => __awaiter(void 0, void 0, void 0, function* () {
        yield module.client.flushall();
    });
    module.emptydb = () => __awaiter(void 0, void 0, void 0, function* () {
        yield module.flushdb();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        module.objectCache.reset();
    });
    module.exists = (key) => __awaiter(void 0, void 0, void 0, function* () {
        if (Array.isArray(key)) {
            const data = yield Promise.all(key.map(k => module.client.exists(k)));
            return data.map(exists => exists === 1);
        }
        const exists = yield module.client.exists(key);
        return exists === 1;
    });
    module.scan = (params) => __awaiter(void 0, void 0, void 0, function* () {
        let cursor = '0';
        let returnData = [];
        const seen = {};
        do {
            /* eslint-disable no-await-in-loop */
            const res = yield module.client.scan(cursor, 'MATCH', params.match, 'COUNT', 10000);
            cursor = res[0];
            const values = res[1].filter((value) => {
                const isSeen = !!seen[value];
                if (!isSeen) {
                    seen[value] = 1;
                }
                return !isSeen;
            });
            returnData = returnData.concat(values);
        } while (cursor !== '0');
        return returnData;
    });
    module.delete = (key) => __awaiter(void 0, void 0, void 0, function* () {
        yield module.client.del(key);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        module.objectCache.del(key);
    });
    module.deleteAll = (keys) => __awaiter(void 0, void 0, void 0, function* () {
        if (!Array.isArray(keys) || !keys.length) {
            return;
        }
        yield module.client.del(keys);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        module.objectCache.del(keys);
    });
    module.get = (key) => __awaiter(void 0, void 0, void 0, function* () { return yield module.client.get(key); });
    module.set = (key, value) => __awaiter(void 0, void 0, void 0, function* () {
        yield module.client.set(key, value);
    });
    module.increment = (key) => __awaiter(void 0, void 0, void 0, function* () { return yield module.client.incr(key); });
    module.rename = (oldKey, newKey) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield module.client.rename(oldKey, newKey);
        }
        catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            if (err && err.message !== 'ERR no such key') {
                throw err;
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        module.objectCache.del([oldKey, newKey]);
    });
    module.type = (key) => __awaiter(void 0, void 0, void 0, function* () {
        const type = yield module.client.type(key);
        return type !== 'none' ? type : null;
    });
    module.expire = (key, seconds) => __awaiter(void 0, void 0, void 0, function* () {
        yield module.client.expire(key, seconds);
    });
    module.expireAt = (key, timestamp) => __awaiter(void 0, void 0, void 0, function* () {
        yield module.client.expireat(key, timestamp);
    });
    module.pexpire = (key, ms) => __awaiter(void 0, void 0, void 0, function* () {
        yield module.client.pexpire(key, ms);
    });
    module.pexpireAt = (key, timestamp) => __awaiter(void 0, void 0, void 0, function* () {
        yield module.client.pexpireat(key, timestamp);
    });
    module.ttl = (key) => __awaiter(void 0, void 0, void 0, function* () { return yield module.client.ttl(key); });
    module.pttl = (key) => __awaiter(void 0, void 0, void 0, function* () { return yield module.client.pttl(key); });
};
