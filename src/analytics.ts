// 'use strict';

// eslint-disable-next-line import/no-import-module-exports
import winston, { error } from 'winston';
// eslint-disable-next-line import/no-import-module-exports
import nconf from 'nconf';
// eslint-disable-next-line import/no-import-module-exports
import crypto from 'crypto';
// eslint-disable-next-line import/no-import-module-exports
import util from 'util';
// eslint-disable-next-line import/no-import-module-exports
import _ from 'lodash';
// eslint-disable-next-line import/no-import-module-exports
import { CronJob } from 'cron';
// eslint-disable-next-line import/no-import-module-exports
import db from './database';
// eslint-disable-next-line import/no-import-module-exports
import utils from './utils';
// eslint-disable-next-line import/no-import-module-exports
import plugins from './plugins';
// eslint-disable-next-line import/no-import-module-exports
import meta from './meta';
// eslint-disable-next-line import/no-import-module-exports
import pubsub from './pubsub';
// eslint-disable-next-line import/no-import-module-exports
import cacheCreate from './cache/lru';

const sleep = util.promisify(setTimeout);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const Analytics = module.exports;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const secret = nconf.get('secret');

let local = {
    counters: {},
    pageViews: 0,
    pageViewsRegistered: 0,
    pageViewsGuest: 0,
    pageViewsBot: 0,
    uniqueIPCount: 0,
    uniquevisitors: 0,
};
const empty = _.cloneDeep(local);
const total = _.cloneDeep(local);

let ipCache;

function publishLocalAnalytics() {
    pubsub.publish('analytics:publish', {
        local: local,
    });
    local = _.cloneDeep(empty);
}

function incrementProperties(obj1, obj2: string) {
    for (const [key, value] of Object.entries(obj2)) {
        if (typeof value === 'object') {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            incrementProperties(obj1[key], value);
        } else if (utils.isNumber(value)) {
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
const runJobs = nconf.get('runJobs');
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.init = async function () {
    ipCache = cacheCreate({
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-assignment */
        max: parseInt(meta.config['analytics:maxCache'] as string, 10) || 500,
        ttl: 0,
    });
    // The next line calls a function in a module that has not been updated to TS yet
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    await new CronJob('*/10 * * * * *', (async () => {
        publishLocalAnalytics();
        if (runJobs) {
            await sleep(2000);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await Analytics.writeData();
        }
    }), null, true);

    if (runJobs) {
        pubsub.on('analytics:publish', (data) => {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            incrementProperties(total, data.local as string);
        });
    }
};


// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.increment = function (keys, callback) {
    keys = Array.isArray(keys) ? keys : [keys];

    plugins.hooks.fire('action:analytics.increment', { keys: [keys] })
        .catch(() => { console.log(error); });
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    keys.forEach((key) => {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        local.counters[key] = local.counters[key] as number || 0;
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
/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
@typescript-eslint/no-unsafe-assignment */
Analytics.getKeys = async function () {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await db.getSortedSetRange('analyticsKeys', 0, -1) as [];
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.pageView = async function (payload) {
    local.pageViews += 1;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (payload.uid > 0) {
        local.pageViewsRegistered += 1;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    } else if (payload.uid < 0) {
        local.pageViewsBot += 1;
    } else {
        local.pageViewsGuest += 1;
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (payload.ip) {
        // Retrieve hash or calculate if not present
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        let hash = ipCache.get(payload.ip.concat(secret)) as string;
        if (!hash) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            hash = crypto.createHash('sha1').update(payload.ip.concat(secret) as string).digest('hex');
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            ipCache.set(payload.ip.concat(secret), hash);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const score = await db.sortedSetScore('ip:recent', hash) as number;
        if (!score) {
            local.uniqueIPCount += 1;
        }
        const today = new Date();
        today.setHours(today.getHours(), 0, 0, 0);
        if (!score || score < today.getTime()) {
            local.uniquevisitors += 1;
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await db.sortedSetAdd('ip:recent', Date.now(), hash);
        }
    }
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.writeData = async function () {
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
        dbQueue.push(db.incrObjectFieldBy('global', 'uniqueIPCount', total.uniqueIPCount));
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
        dbQueue.push(db.sortedSetIncrByBulk(incrByBulk));
    }

    // Update list of tracked metrics
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    dbQueue.push(db.sortedSetAdd('analyticsKeys', metrics.map(() => +Date.now()), metrics));

    try {
        await Promise.all(dbQueue);
    } catch (err) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        winston.error(`[analytics] Encountered error while writing analytics to data store\n${err.stack as string}`);
    }
};

// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getHourlyStatsForSet = async function (set, hour, numHours: number) {
    // Guard against accidental ommission of `analytics:` prefix
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (!set.startsWith('analytics:')) {
        set = `analytics:${set as string}`;
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
    const counts = await db.sortedSetScores(set, hoursArr) as [];

    hoursArr.forEach((term, index) => {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        terms[term] = parseInt(counts[index] as string, 10) || 0;
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
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getDailyStatsForSet = async function (set: string, day, numDays) {
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
    day.setDate(day.getDate() as number + 1);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    day.setHours(0, 0, 0, 0);

    while (numDays > 0) {
        /* eslint-disable no-await-in-loop */
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-assignment */
        const dayData = await Analytics.getHourlyStatsForSet(
            set,
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            day.getTime() - (1000 * 60 * 60 * 24 * (numDays - 1)),
            24
        );
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-return */
        daysArr.push(dayData.reduce((cur: number, next: number) => cur + next));
        numDays -= 1;
    }
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
    return daysArr;
};

// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getUnwrittenPageviews = function () {
    return local.pageViews;
};
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getSummary = async function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
    @typescript-eslint/no-unsafe-assignment */
    const [seven, thirty] = await Promise.all([
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
        seven: seven.reduce((sum: number, cur: number) => sum + cur, 0),
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
        thirty: thirty.reduce((sum: number, cur: number) => sum + cur, 0),
    };
};

// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getCategoryAnalytics = async function (cid:string) {
    return await utils.promiseParallel({
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
};

// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getErrorAnalytics = async function () {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await utils.promiseParallel({
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-assignment */
        'not-found': Analytics.getDailyStatsForSet('analytics:errors:404', Date.now(), 7),
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-assignment */
        toobusy: Analytics.getDailyStatsForSet('analytics:errors:503', Date.now(), 7),
    });
};

// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
Analytics.getBlacklistAnalytics = async function () {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await utils.promiseParallel({
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-assignment */
        daily: Analytics.getDailyStatsForSet('analytics:blacklist', Date.now(), 7),
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-assignment */
        hourly: Analytics.getHourlyStatsForSet('analytics:blacklist', Date.now(), 24),
    });
};

// require('./promisify')(Analytics);
