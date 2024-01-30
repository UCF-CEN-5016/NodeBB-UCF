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
const winston_1 = __importDefault(require("winston"));
const validator_1 = __importDefault(require("validator"));
// import { CronJob } from 'cron';
const database_1 = __importDefault(require("../database"));
const analytics_1 = __importDefault(require("../analytics"));
// Assuming db has a type definition like this
// const db: DbType = /* initialize your db object here */
class Errors {
}
Errors.counters = {};
Errors.writeData = function () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const _counters = Object.assign({}, Errors.counters);
            Errors.counters = {};
            const keys = Object.keys(_counters);
            if (!keys.length) {
                return;
            }
            // Use Promise.all to execute asynchronous operations in parallel
            yield Promise.all(keys.map((key) => __awaiter(this, void 0, void 0, function* () {
                const value = _counters[key];
                yield database_1.default.sortedSetIncrBy('errors:404', value, key);
            })));
        }
        catch (err) {
            winston_1.default.error(err.stack);
        }
    });
};
Errors.log404 = function (route) {
    if (!route) {
        return;
    }
    route = route.slice(0, 512).replace(/\/$/, ''); // remove trailing slashes
    analytics_1.default.increment('errors:404');
    Errors.counters[route] = (Errors.counters[route] || 0) + 1;
};
Errors.get = function (escape) {
    return __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const data = yield (database_1.default).getSortedSetRevRangeWithScores('errors:404', 0, 199);
        data.forEach((nfObject) => {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            nfObject.value = escape ? validator_1.default.escape(String(nfObject.value || '')) : nfObject.value;
            // nfObject.value = escape ? validator.escape(String(nfObject.value || '')) : nfObject.value;
        });
        return data;
    });
};
Errors.clear = function () {
    return __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        yield database_1.default.delete('errors:404');
    });
};
// new CronJob('0 * * * * *', async () => {
//     await Errors.writeData();
// }, undefined as unknown as () => void, true);
exports.default = Errors;
// import winston from 'winston';
// import validator from 'validator';
// import { CronJob } from 'cron';
// import db from '../database';
// import analytics from '../analytics';
// interface Counters {
//   [key: string]: number;
// }
// class Errors {
//     private static counters: Counters = {};
//     public static writeData = async function (): Promise<void> {
//         try {
//             const _counters: Counters = { ...Errors.counters };
//             Errors.counters = {};
//             const keys = Object.keys(_counters);
//             if (!keys.length) {
//                 return;
//             }
//             for (const key of keys) {
//                 // The next line calls a function in a module that has not been updated to TS yet
//                 // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
//                 // eslint-disable-next-line @typescript-eslint/no-unsafe-call
//                 await db.sortedSetIncrBy('errors:404', _counters[key], key);
//             }
//         } catch (err) {
//             winston.error(err.stack);
//         }
//     };
//     public static log404 = function (route: string): void {
//         if (!route) {
//             return;
//         }
//         route = route.slice(0, 512).replace(/\/$/, ''); // remove trailing slashes
//         analytics.increment('errors:404');
//         Errors.counters[route] = Errors.counters[route] || 0;
//         Errors.counters[route] += 1;
//     };
//     public static get = async function (escape: boolean): Promise<any[]> {
//         // The next line calls a function in a module that has not been updated to TS yet
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         const data = await db.getSortedSetRevRangeWithScores('errors:404', 0, 199);
//         // The next line calls a function in a module that has not been updated to TS yet
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         data.forEach((nfObject) => {
//             // The next line calls a function in a module that has not been updated to TS yet
//             // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//             nfObject.value = escape ? validator.escape(String(nfObject.value || '')) : nfObject.value;
//         });
//         return data;
//     };
//     public static clear = async function (): Promise<void> {
//         // The next line calls a function in a module that has not been updated to TS yet
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         await db.delete('errors:404');
//     };
// }
// new CronJob('0 * * * * *', async () => {
//     await Errors.writeData();
// }, null, true);
// export default Errors;
// const winston = require('winston');
// const validator = require('validator');
// const cronJob = require('cron').CronJob;
// const db = require('../database');
// const analytics = require('../analytics');
// const Errors = module.exports;
// let counters = {};
// new cronJob('0 * * * * *', (() => {
//     Errors.writeData();
// }), null, true);
// Errors.writeData = async function () {
//     try {
//         const _counters = { ...counters };
//         counters = {};
//         const keys = Object.keys(_counters);
//         if (!keys.length) {
//             return;
//         }
//         for (const key of keys) {
//             /* eslint-disable no-await-in-loop */
//             await db.sortedSetIncrBy('errors:404', _counters[key], key);
//         }
//     } catch (err) {
//         winston.error(err.stack);
//     }
// };
// Errors.log404 = function (route) {
//     if (!route) {
//         return;
//     }
//     // The next line calls a function in a module that has not been updated to TS yet
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//     route = route.slice(0, 512).replace(/\/$/, ''); // remove trailing slashes
//     analytics.increment('errors:404');
//     counters[route] = counters[route] || 0;
//     counters[route] += 1;
// };
// // The next line calls a function in a module that has not been updated to TS yet
// // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
// Errors.get = async function (escape) {
//     // The next line calls a function in a module that has not been updated to TS yet
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//     const data = await db.getSortedSetRevRangeWithScores('errors:404', 0, 199);
//     data.forEach((nfObject) => {
//         // The next line calls a function in a module that has not been updated to TS yet
// // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         nfObject.value = escape ? validator.escape(String(nfObject.value || '')) : nfObject.value;
//     });
//     return data;
// };
// Errors.clear = async function () {
//     await db.delete('errors:404');
// };
