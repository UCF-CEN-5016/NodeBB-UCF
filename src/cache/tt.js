"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ttlcache_1 = __importDefault(require("@isaacs/ttlcache"));
const pubsub_1 = __importDefault(require("../pubsub"));
function default_1(opts) {
    var _a;
    const ttlCache = new ttlcache_1.default(opts);
    const cache = {
        name: opts.name,
        hits: 0,
        misses: 0,
        enabled: (_a = opts === null || opts === void 0 ? void 0 : opts.enabled) !== null && _a !== void 0 ? _a : true,
        set: function (key, value, ttl) {
            if (!cache.enabled) {
                return;
            }
            const opts = {};
            if (ttl) {
                opts.ttl = ttl;
            }
            ttlCache.set.apply(ttlCache, [key, value, opts]);
        },
        get: function (key) {
            if (!cache.enabled) {
                return undefined;
            }
            const data = ttlCache.get(key);
            if (data === undefined) {
                cache.misses += 1;
            }
            else {
                cache.hits += 1;
            }
            return data;
        },
        del: function (keys) {
            if (!Array.isArray(keys)) {
                const keysArr = [keys];
                pubsub_1.default.publish(`${cache.name}:ttlCache:del`, keysArr);
                keysArr.forEach(key => ttlCache.delete(key));
            }
            else {
                pubsub_1.default.publish(`${cache.name}:ttlCache:del`, keys);
                keys.forEach(key => ttlCache.delete(key));
            }
        },
        delete: function (keys) {
            if (!Array.isArray(keys)) {
                const keysArr = [keys];
                pubsub_1.default.publish(`${cache.name}:ttlCache:del`, keysArr);
                keysArr.forEach(key => ttlCache.delete(key));
            }
            else {
                pubsub_1.default.publish(`${cache.name}:ttlCache:del`, keys);
                keys.forEach(key => ttlCache.delete(key));
            }
        },
        reset: function () {
            pubsub_1.default.publish(`${cache.name}:ttlCache:reset`);
            ttlCache.clear();
            cache.hits = 0;
            cache.misses = 0;
        },
        clear: function () {
            pubsub_1.default.publish(`${cache.name}:ttlCache:reset`);
            ttlCache.clear();
            cache.hits = 0;
            cache.misses = 0;
        },
        getUnCachedKeys: function (keys, cachedData) {
            if (!cache.enabled) {
                return keys;
            }
            let data;
            let isCached;
            const unCachedKeys = keys.filter((key) => {
                data = cache.get(key);
                isCached = data !== undefined;
                if (isCached) {
                    cachedData[key] = data;
                }
                return !isCached;
            });
            const hits = keys.length - unCachedKeys.length;
            const misses = keys.length - hits;
            cache.hits += hits;
            cache.misses += misses;
            return unCachedKeys;
        },
        dump: function () {
            return Array.from(ttlCache.entries());
        },
        peek: function (key) {
            return ttlCache.get(key, { updateAgeOnGet: false });
        },
        purgeStale: () => ttlCache.purgeStale(),
        size: ttlCache.size,
        getRemainingTTL: (key) => ttlCache.getRemainingTTL(key),
        has: (key) => ttlCache.has(key),
        setTTL: (key, ttl) => ttlCache.setTTL(key, ttl),
        entries: () => ttlCache.entries(),
        keys: () => ttlCache.keys(),
        values: () => ttlCache.values(),
        [Symbol.iterator]: () => ttlCache[Symbol.iterator](),
    };
    // expose properties
    const propertyMap = new Map([
        ['max', 'max'],
        ['itemCount', 'size'],
        ['size', 'size'],
        ['ttl', 'ttl'],
    ]);
    propertyMap.forEach((ttlProp, cacheProp) => {
        Object.defineProperty(cache, cacheProp, {
            get: function () {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return ttlCache[ttlProp];
            },
            configurable: true,
            enumerable: true,
        });
    });
    pubsub_1.default.on(`${cache.name}:ttlCache:reset`, () => {
        ttlCache.clear();
        cache.hits = 0;
        cache.misses = 0;
    });
    pubsub_1.default.on(`${cache.name}:ttlCache:del`, (keys) => {
        if (Array.isArray(keys)) {
            keys.forEach(key => ttlCache.delete(key));
        }
    });
    return cache;
}
exports.default = default_1;
