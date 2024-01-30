// import winston from 'winston';
// import validator from 'validator';
// // import { CronJob } from 'cron';
// import db from '../database';
// import analytics from '../analytics';
// interface Counters {
//   [key: string]: number;
// }
// interface DbType {
//     sortedSetIncrBy(key: string, value: number, member: string): Promise<number>;
//     // Add other methods if needed
//   }
// // Assuming db has a type definition like this
// // const db: DbType = /* initialize your db object here */
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
//             // Use Promise.all to execute asynchronous operations in parallel
//             await Promise.all(keys.map(async (key) => {
//                 const value = _counters[key];
//                 await (db as DbType).sortedSetIncrBy('errors:404', value, key);
//             }));
//         } catch (err) {
//             winston.error((err as Error).stack);
//         }
//     };
//     public static log404 = function (route: string): void {
//         if (!route) {
//             return;
//         }
//         route = route.slice(0, 512).replace(/\/$/, ''); // remove trailing slashes
//         analytics.increment('errors:404');
//         Errors.counters[route] = (Errors.counters[route] || 0) + 1;
//     };
//     public static get = async function (escape: boolean): Promise<{ value: string | number }[]> {
//         // The next line calls a function in a module that has not been updated to TS yet
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         const data = await (db).getSortedSetRevRangeWithScores('errors:404', 0, 199) as { value: string | number }[];
//         data.forEach((nfObject: { value: string }) => {
//             // The next line calls a function in a module that has not been updated to TS yet
//             // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//             nfObject.value = escape ? validator.escape(String(nfObject.value || '')) : nfObject.value;
//             // nfObject.value = escape ? validator.escape(String(nfObject.value || '')) : nfObject.value;
//         });
//         return data;
//     };
//     public static clear = async function (): Promise<void> {
//         // The next line calls a function in a module that has not been updated to TS yet
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         await db.delete('errors:404');
//     };
// }
// // new CronJob('0 * * * * *', async () => {
// //     await Errors.writeData();
// // }, undefined as unknown as () => void, true);
// export default Errors;
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
