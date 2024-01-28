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
    function startDigestJob(name: string, cronString: string, term: string): void {
        jobs[name] = new cronJob(cronString, (async () => {
            winston.verbose(`[user/jobs] Digest job (${name}) started.`);
            try {
                if (name === 'digest.weekly') {
                    // eslint-disable-next-line max-len
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    const counter: number = await db.increment('biweeklydigestcounter') as number;
                    if (counter % 2) {
                        // eslint-disable-next-line max-len
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                        await User.digest.execute({ interval: 'biweek' });
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                await User.digest.execute({ interval: term });
            } catch (err) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                winston.error(err.stack);
            }
        }), null, true) as CronJobType<any>;
        winston.verbose(`[user/jobs] Starting job (${name})`);
    }

    User.startJobs = function (): void {
        winston.verbose('[user/jobs] (Re-)starting jobs...');

        let { digestHour }: any = meta.config as object;

        // Fix digest hour if invalid
        if (isNaN(digestHour as number)) {
            digestHour = 17;
        } else if (digestHour > 23 || digestHour < 0) {
            digestHour = 0;
        }

        User.stopJobs();

        startDigestJob('digest.daily', `0 ${digestHour as number} * * *`, 'day');
        startDigestJob('digest.weekly', `0 ${digestHour as number} * * 0`, 'week');
        startDigestJob('digest.monthly', `0 ${digestHour as number} 1 * *`, 'month');

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        jobs['reset.clean'] = new cronJob('0 0 * * *', User.reset.clean, null, true) as CronJobType<any>;
        winston.verbose('[user/jobs] Starting job (reset.clean)');

        winston.verbose(`[user/jobs] jobs started`);
    };

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
