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
// 'use strict';
// eslint-disable-next-line import/no-import-module-exports
const cron_1 = __importDefault(require("cron"));
// eslint-disable-next-line import/no-import-module-exports
const winston_1 = __importDefault(require("winston"));
// eslint-disable-next-line import/no-import-module-exports
const nconf_1 = __importDefault(require("nconf"));
// eslint-disable-next-line import/no-import-module-exports
const crypto_1 = __importDefault(require("crypto"));
// eslint-disable-next-line import/no-import-module-exports
const util_1 = __importDefault(require("util"));
// eslint-disable-next-line import/no-import-module-exports
const lodash_1 = __importDefault(require("lodash"));
// eslint-disable-next-line import/no-import-module-exports
const database_1 = __importDefault(require("./database"));
// eslint-disable-next-line import/no-import-module-exports
const utils_1 = __importDefault(require("./utils"));
// eslint-disable-next-line import/no-import-module-exports
const plugins_1 = __importDefault(require("./plugins"));
// eslint-disable-next-line import/no-import-module-exports
const meta_1 = __importDefault(require("./meta"));
// eslint-disable-next-line import/no-import-module-exports
const pubsub_1 = __importDefault(require("./pubsub"));
// eslint-disable-next-line import/no-import-module-exports
const lru_1 = __importDefault(require("./cache/lru"));
const sleep = util_1.default.promisify(setTimeout);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const Analytics = module.exports;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const secret = nconf_1.default.get('secret');
let local = {
    counters: {},
    pageViews: 0,
    pageViewsRegistered: 0,
    pageViewsGuest: 0,
    pageViewsBot: 0,
    uniqueIPCount: 0,
    uniquevisitors: 0,
};
const empty = lodash_1.default.cloneDeep(local);
const total = lodash_1.default.cloneDeep(local);
let ipCache;
function publishLocalAnalytics() {
    pubsub_1.default.publish('analytics:publish', {
        local: local,
    });
    local = lodash_1.default.cloneDeep(empty);
}
function incrementProperties(obj1, obj2) {
    for (const [key, value] of Object.entries(obj2)) {
        if (typeof value === 'object') {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            incrementProperties(obj1[key], value);
        }
        else if (utils_1.default.isNumber(value)) {
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-assignment */
            obj1[key] = obj1[key] || 0;
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-assignment */
            obj1[key] += obj2[key];
        }
    }
}
/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
const runJobs = nconf_1.default.get('runJobs');
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.init = function () {
    ipCache = (0, lru_1.default)({
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-assignment */
        max: parseInt(meta_1.default.config['analytics:maxCache'], 10) || 500,
        ttl: 0,
    });
    // The next line calls a function in a module that has not been updated to TS yet
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    new cron_1.default('*/10 * * * * *', (() => __awaiter(this, void 0, void 0, function* () {
        publishLocalAnalytics();
        if (runJobs) {
            yield sleep(2000);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            yield Analytics.writeData();
        }
    })), null, true);
    if (runJobs) {
        pubsub_1.default.on('analytics:publish', (data) => {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            incrementProperties(total, data.local);
        });
    }
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.increment = function (keys, callback) {
    keys = Array.isArray(keys) ? keys : [keys];
    plugins_1.default.hooks.fire('action:analytics.increment', { keys: [keys] })
        .catch(err => (err))
        .then(() => console.log('this will succeed'));
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    keys.forEach((key) => {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        local.counters[key] = local.counters[key] || 0;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        local.counters[key] += 1;
    });
    if (typeof callback === 'function') {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        callback();
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    }
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getKeys = database_1.default.getSortedSetRange('analyticsKeys', 0, -1);
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.pageView = function (payload) {
    return __awaiter(this, void 0, void 0, function* () {
        local.pageViews += 1;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (payload.uid > 0) {
            local.pageViewsRegistered += 1;
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        }
        else if (payload.uid < 0) {
            local.pageViewsBot += 1;
        }
        else {
            local.pageViewsGuest += 1;
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (payload.ip) {
            // Retrieve hash or calculate if not present
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            let hash = ipCache.get(payload.ip.concat(secret));
            if (!hash) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                hash = crypto_1.default.createHash('sha1').update(payload.ip.concat(secret)).digest('hex');
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                ipCache.set(payload.ip.concat(secret), hash);
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const score = yield database_1.default.sortedSetScore('ip:recent', hash);
            if (!score) {
                local.uniqueIPCount += 1;
            }
            const today = new Date();
            today.setHours(today.getHours(), 0, 0, 0);
            if (!score || score < today.getTime()) {
                local.uniquevisitors += 1;
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                yield database_1.default.sortedSetAdd('ip:recent', Date.now(), hash);
            }
        }
    });
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.writeData = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const today = new Date();
        const month = new Date();
        const dbQueue = [];
        const incrByBulk = [];
        // Build list of metrics that were updated
        let metrics = [
            'pageviews',
            'pageviews:month',
        ];
        metrics.forEach((metric) => {
            const toAdd = ['registered', 'guest', 'bot'].map(type => `${metric}:${type}`);
            metrics = [...metrics, ...toAdd];
        });
        metrics.push('uniquevisitors');
        today.setHours(today.getHours(), 0, 0, 0);
        month.setMonth(month.getMonth(), 1);
        month.setHours(0, 0, 0, 0);
        if (total.pageViews > 0) {
            incrByBulk.push(['analytics:pageviews', total.pageViews, today.getTime()]);
            incrByBulk.push(['analytics:pageviews:month', total.pageViews, month.getTime()]);
            total.pageViews = 0;
        }
        if (total.pageViewsRegistered > 0) {
            incrByBulk.push(['analytics:pageviews:registered', total.pageViewsRegistered, today.getTime()]);
            incrByBulk.push(['analytics:pageviews:month:registered', total.pageViewsRegistered, month.getTime()]);
            total.pageViewsRegistered = 0;
        }
        if (total.pageViewsGuest > 0) {
            incrByBulk.push(['analytics:pageviews:guest', total.pageViewsGuest, today.getTime()]);
            incrByBulk.push(['analytics:pageviews:month:guest', total.pageViewsGuest, month.getTime()]);
            total.pageViewsGuest = 0;
        }
        if (total.pageViewsBot > 0) {
            incrByBulk.push(['analytics:pageviews:bot', total.pageViewsBot, today.getTime()]);
            incrByBulk.push(['analytics:pageviews:month:bot', total.pageViewsBot, month.getTime()]);
            total.pageViewsBot = 0;
        }
        if (total.uniquevisitors > 0) {
            incrByBulk.push(['analytics:uniquevisitors', total.uniquevisitors, today.getTime()]);
            total.uniquevisitors = 0;
        }
        if (total.uniqueIPCount > 0) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            dbQueue.push(database_1.default.incrObjectFieldBy('global', 'uniqueIPCount', total.uniqueIPCount));
            total.uniqueIPCount = 0;
        }
        for (const [key, value] of Object.entries(total.counters)) {
            incrByBulk.push([`analytics:${key}`, value, today.getTime()]);
            metrics.push(key);
            delete total.counters[key];
        }
        if (incrByBulk.length) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            dbQueue.push(database_1.default.sortedSetIncrByBulk(incrByBulk));
        }
        // Update list of tracked metrics
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        dbQueue.push(database_1.default.sortedSetAdd('analyticsKeys', metrics.map(() => +Date.now()), metrics));
        try {
            yield Promise.all(dbQueue);
        }
        catch (err) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            winston_1.default.error(`[analytics] Encountered error while writing analytics to data store\n${err.stack}`);
        }
    });
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getHourlyStatsForSet = function (set, hour, numHours) {
    return __awaiter(this, void 0, void 0, function* () {
        // Guard against accidental ommission of `analytics:` prefix
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (!set.startsWith('analytics:')) {
            set = `analytics:${set}`;
        }
        const terms = {};
        const hoursArr = [];
        hour = new Date();
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        hour.setHours(hour.getHours(), 0, 0, 0);
        for (let i = 0, ii = numHours; i < ii; i += 1) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            hoursArr.push(hour.getTime() - (i * 3600 * 1000));
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const counts = yield database_1.default.sortedSetScores(set, hoursArr);
        hoursArr.forEach((term, index) => {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            terms[term] = parseInt(counts[index], 10) || 0;
        });
        const termsArr = [];
        hoursArr.reverse();
        hoursArr.forEach((hour) => {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            termsArr.push(terms[hour]);
        });
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        return termsArr;
    });
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getDailyStatsForSet = function (set, day, numDays) {
    return __awaiter(this, void 0, void 0, function* () {
        // Guard against accidental ommission of `analytics:` prefix
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (!set.startsWith('analytics:')) {
            set = `analytics:${set}`;
        }
        const daysArr = [];
        day = new Date();
        // set the date to tomorrow, because getHourlyStatsForSet steps *backwards* 24 hours to sum up the values
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        day.setDate(day.getDate() + 1);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        day.setHours(0, 0, 0, 0);
        while (numDays > 0) {
            /* eslint-disable no-await-in-loop */
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-assignment */
            const dayData = yield Analytics.getHourlyStatsForSet(set, 
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            day.getTime() - (1000 * 60 * 60 * 24 * (numDays - 1)), 24);
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-return */
            daysArr.push(dayData.reduce((cur, next) => cur.concat(next)));
            numDays -= 1;
        }
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        return daysArr;
    });
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getUnwrittenPageviews = function () {
    return local.pageViews;
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getSummary = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-assignment */
        const [seven, thirty] = yield Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            Analytics.getDailyStatsForSet('analytics:pageviews', today, 7),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            Analytics.getDailyStatsForSet('analytics:pageviews', today, 30),
        ]);
        return {
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
            seven: seven.reduce((sum, cur) => sum.concat(cur), 0),
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
            thirty: thirty.reduce((sum, cur) => sum.concat(cur), 0),
        };
    });
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getCategoryAnalytics = function (cid) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield utils_1.default.promiseParallel({
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
             @typescript-eslint/no-unsafe-assignment */
            'pageviews:hourly': Analytics.getHourlyStatsForSet(`analytics:pageviews:byCid:${cid}`, Date.now(), 24),
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
             @typescript-eslint/no-unsafe-assignment */
            'pageviews:daily': Analytics.getDailyStatsForSet(`analytics:pageviews:byCid:${cid}`, Date.now(), 30),
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-assignment */
            'topics:daily': Analytics.getDailyStatsForSet(`analytics:topics:byCid:${cid}`, Date.now(), 7),
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-assignment */
            'posts:daily': Analytics.getDailyStatsForSet(`analytics:posts:byCid:${cid}`, Date.now(), 7),
        });
    });
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getErrorAnalytics = function () {
    return __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return yield utils_1.default.promiseParallel({
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-assignment */
            'not-found': Analytics.getDailyStatsForSet('analytics:errors:404', Date.now(), 7),
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-assignment */
            toobusy: Analytics.getDailyStatsForSet('analytics:errors:503', Date.now(), 7),
        });
    });
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getBlacklistAnalytics = function () {
    return __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return yield utils_1.default.promiseParallel({
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-assignment */
            daily: Analytics.getDailyStatsForSet('analytics:blacklist', Date.now(), 7),
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-assignment */
            hourly: Analytics.getHourlyStatsForSet('analytics:blacklist', Date.now(), 24),
        });
    });
};
// require('./promisify')(Analytics);
