import winston = require('winston');
import cron = require('cron');
import db = require('../database');
import meta = require('../meta');

type CronJobType<T> = new (...args: any[]) => T;

type ResetModule = {
    validate: (code: string) => Promise<number>;
    generate: (uid: string) => Promise<string>;
    send: (email: string) => Promise<string>;
    commit: (code: string, password: string) => Promise<void>;
    updateExpiry: (uid: string) => Promise<void>;
    clean: () => Promise<void>;
    cleanByUid: (uid: string) => Promise<void>;
}

type DigestModule = {
    execute: (payload: object) => Promise<void>;
    getUsersInterval: (uids: string) => Promise<any[]> | Promise<boolean>;
    getSubscribers: (interval: number) => Promise<string>;
    send: (data: any) => Promise<void>;
    getDeliveryTimes: (start: number, stop: number) => Promise<{users: any, count: number}>
}

type UserType = {
    reset: ResetModule;
    digest: DigestModule;
    startJobs: () => void;
    stopJobs: () => void;
}

const jobs = {};

// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const cronJob = cron.CronJob as CronJobType<any>;

module.exports = function (User: UserType) {
    User.startJobs = function () {
        winston.verbose('[user/jobs] (Re-)starting jobs...');

        let { digestHour } = meta.config;

        // Fix digest hour if invalid
        if (isNaN(digestHour)) {
            digestHour = 17;
        } else if (digestHour > 23 || digestHour < 0) {
            digestHour = 0;
        }

        User.stopJobs();

        startDigestJob('digest.daily', `0 ${digestHour} * * *`, 'day');
        startDigestJob('digest.weekly', `0 ${digestHour} * * 0`, 'week');
        startDigestJob('digest.monthly', `0 ${digestHour} 1 * *`, 'month');

        jobs['reset.clean'] = new cronJob('0 0 * * *', User.reset.clean, null, true);
        winston.verbose('[user/jobs] Starting job (reset.clean)');

        winston.verbose(`[user/jobs] jobs started`);
    };

    function startDigestJob(name, cronString, term) {
        jobs[name] = new cronJob(cronString, (async () => {
            winston.verbose(`[user/jobs] Digest job (${name}) started.`);
            try {
                if (name === 'digest.weekly') {
                    const counter = await db.increment('biweeklydigestcounter');
                    if (counter % 2) {
                        await User.digest.execute({ interval: 'biweek' });
                    }
                }
                await User.digest.execute({ interval: term });
            } catch (err) {
                winston.error(err.stack);
            }
        }), null, true);
        winston.verbose(`[user/jobs] Starting job (${name})`);
    }

    User.stopJobs = function () {
        let terminated = 0;
        // Terminate any active cron jobs
        for (const jobId of Object.keys(jobs)) {
            winston.verbose(`[user/jobs] Terminating job (${jobId})`);
            jobs[jobId].stop();
            delete jobs[jobId];
            terminated += 1;
        }
        if (terminated > 0) {
            winston.verbose(`[user/jobs] ${terminated} jobs terminated`);
        }
    };
};
