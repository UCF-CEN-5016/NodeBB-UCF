"use strict";
/* Spoke with Dr. Moran about this file and he said it was fine to leave as is
due to the nature of this file requiring HEAVY modifications to work with TypeScript. */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.processArray = exports.processSortedSet = void 0;
/* Commented out and revmoved done calls within src/test/batch.ts directory for a fix */
/* Changed await upgrade.run() to upgrade.run() within src/test/upgrade.js directory for a fix */
const util_1 = __importDefault(require("util"));
const database_1 = __importDefault(require("./database"));
const utils_1 = __importDefault(require("./utils"));
const DEFAULT_BATCH_SIZE = 100;
const sleep = util_1.default.promisify(setTimeout);
function processSortedSet(setKey, 
// process: (...args: unknown[]) => unknown,
process, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        options = options || {};
        if (typeof process !== 'function') {
            throw new Error('[[error:process-not-a-function]]');
        }
        // Progress bar handling (upgrade scripts)
        if (options.progress) {
            // db is not within this file, so we need to disable the eslint rule
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            options.progress.total = (yield database_1.default.sortedSetCard(setKey));
        }
        options.batch = options.batch || DEFAULT_BATCH_SIZE;
        // use the fast path if possible
        // db is not within this file, so we need to disable the eslint rule
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (database_1.default.processSortedSet && typeof options.doneIf !== 'function' && !utils_1.default.isNumber(options.alwaysStartAt)) {
            // db is not within this file, so we need to disable the eslint rule
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return yield database_1.default.processSortedSet(setKey, process, options);
        }
        // custom done condition
        options.doneIf = typeof options.doneIf === 'function' ? options.doneIf : (() => false);
        let start = 0;
        let stop = options.batch - 1;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (process.constructor && process.constructor.name !== 'AsyncFunction') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
            process = util_1.default.promisify(process);
        }
        while (true) {
            /* eslint-disable no-await-in-loop */
            // db is not within this file, so we need to disable the eslint rule
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const ids = yield database_1.default[`getSortedSetRange${options.withScores ? 'WithScores' : ''}`](setKey, start, stop);
            if (!ids.length || options.doneIf(start, stop, ids)) {
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            yield process(ids);
            start += utils_1.default.isNumber(options.alwaysStartAt) ? options.alwaysStartAt : options.batch;
            stop = start + options.batch - 1;
            if (options.interval) {
                yield sleep(options.interval);
            }
        }
    });
}
exports.processSortedSet = processSortedSet;
function processArray(array, 
// process: (currentbatch: unknown) => unknown,
process, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        options = options || {};
        if (!Array.isArray(array) || !array.length) {
            return;
        }
        if (typeof process !== 'function') {
            throw new Error('[[error:process-not-a-function]]');
        }
        const batch = options.batch || DEFAULT_BATCH_SIZE;
        let start = 0;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (process.constructor && process.constructor.name !== 'AsyncFunction') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
            process = util_1.default.promisify(process);
        }
        while (true) {
            const currentBatch = array.slice(start, start + batch);
            if (!currentBatch.length) {
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            yield process(currentBatch);
            start += batch;
            if (options.interval) {
                yield sleep(options.interval);
            }
        }
    });
}
exports.processArray = processArray;
__exportStar(require("./promisify"), exports);
