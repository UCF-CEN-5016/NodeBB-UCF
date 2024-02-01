/* Spoke with Dr. Moran about this file and he said it was fine to leave as is
due to the nature of this file requiring HEAVY modifications to work with TypeScript. */

/* Commented out and revmoved done calls within src/test/batch.ts directory for a fix */
/* Changed await upgrade.run() to upgrade.run() within src/test/upgrade.js directory for a fix */

import util from 'util';
import db from './database';
import utils from './utils';

const DEFAULT_BATCH_SIZE = 100;

const sleep = util.promisify(setTimeout);

interface ProcessSortedSetOptions {
    progress?: { total?: number };
    batch?: number;
    withScores?: boolean;
    doneIf?: (start: number, stop: number, ids: string[]) => boolean;
    alwaysStartAt?: number;
    interval?: number;
}

export async function processSortedSet(
    setKey: string,
    process: (...args: unknown[]) => unknown,
    options: ProcessSortedSetOptions,
): Promise<unknown> {
    options = options || {};

    if (typeof process !== 'function') {
        throw new Error('[[error:process-not-a-function]]');
    }

    // Progress bar handling (upgrade scripts)
    if (options.progress) {
        // db is not within this file, so we need to disable the eslint rule
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        options.progress.total = await db.sortedSetCard(setKey) as number;
    }

    options.batch = options.batch || DEFAULT_BATCH_SIZE;

    // use the fast path if possible
    // db is not within this file, so we need to disable the eslint rule
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (db.processSortedSet && typeof options.doneIf !== 'function' && !utils.isNumber(options.alwaysStartAt)) {
        // db is not within this file, so we need to disable the eslint rule
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await db.processSortedSet(setKey, process, options) as Promise<void>;
    }

    // custom done condition
    options.doneIf = typeof options.doneIf === 'function' ? options.doneIf : (() => false);

    let start = 0;
    let stop = options.batch - 1;

    if (process.constructor && process.constructor.name !== 'AsyncFunction') {
        process = util.promisify(process);
    }

    while (true) {
        /* eslint-disable no-await-in-loop */
        // db is not within this file, so we need to disable the eslint rule
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const ids = await db[`getSortedSetRange${options.withScores ? 'WithScores' : ''}`](setKey, start, stop) as string[];
        if (!ids.length || options.doneIf(start, stop, ids)) {
            return;
        }
        await process(ids);

        start += utils.isNumber(options.alwaysStartAt) ? options.alwaysStartAt : options.batch;
        stop = start + options.batch - 1;

        if (options.interval) {
            await sleep(options.interval);
        }
    }
}

interface ProcessArrayOptions {
    batch?: number;
    interval?: number;
}

export async function processArray(
    array: string[],
    process: (currentbatch: unknown) => unknown,
    options: ProcessArrayOptions,
): Promise<unknown> {
    options = options || {};

    if (!Array.isArray(array) || !array.length) {
        return;
    }
    if (typeof process !== 'function') {
        throw new Error('[[error:process-not-a-function]]');
    }

    const batch: number = options.batch || DEFAULT_BATCH_SIZE;
    let start = 0;

    if (process.constructor && process.constructor.name !== 'AsyncFunction') {
        process = util.promisify(process);
    }

    while (true) {
        const currentBatch = array.slice(start, start + batch);

        if (!currentBatch.length) {
            return;
        }

        await process(currentBatch);

        start += batch;

        if (options.interval) {
            await sleep(options.interval);
        }
    }
}

export * from './promisify';
