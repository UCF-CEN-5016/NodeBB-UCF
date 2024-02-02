"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
Object.defineProperty(exports, "__esModule", { value: true });
const util = __importStar(require("util"));
module.exports = function (theModule, ignoreKeys = []) {
    ignoreKeys = ignoreKeys || [];
    // Checks if a function appears to be a callback-style function.
    function isCallbackedFunction(func) {
        if (typeof func !== 'function') {
            return false;
        }
        const str = func.toString().split('\n')[0];
        return str.includes('callback)');
    }
    // Checks if a function is an asynchronous function.
    function isAsyncFunction(fn) {
        return fn && fn.constructor && fn.constructor.name === 'AsyncFunction';
    }
    // Wraps an asynchronous function with a callback-style function
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    function wrapCallback(origFn, callbackFn) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return function wrapperCallback(...args) {
            return __awaiter(this, void 0, void 0, function* () {
                if (args.length && typeof args[args.length - 1] === 'function') {
                    const cb = args.pop();
                    args.push((err, res) => (res !== undefined ? cb(err, res) : cb(err)));
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    const result = yield callbackFn(...args);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    return result;
                }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                const result = yield origFn(...args);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                return result;
            });
        };
    }
    // Wraps a callback-style function with a promise-style function.
    function wrapPromise(origFn, promiseFn) {
        return function wrapperPromise(...args) {
            if (args.length && typeof args[args.length - 1] === 'function') {
                return origFn(...args);
            }
            return promiseFn(...args); // Type assertion here to address TypeScript error
        };
    }
    // Recursively processes an object, converting callback-style functions to promises.
    function promisifyRecursive(module) {
        if (!module) {
            return;
        }
        const keys = Object.keys(module);
        keys.forEach((key) => {
            if (ignoreKeys.includes(key)) {
                return;
            }
            if (isAsyncFunction(module[key])) {
                const wrappedCallback = util.callbackify(module[key]); // converts promise to callback
                module[key] = wrapCallback(module[key], wrappedCallback);
            }
            else if (isCallbackedFunction(module[key])) {
                const wrappedPromise = util.promisify(module[key]); // converts callback to promise
                module[key] = wrapPromise(module[key], wrappedPromise);
            }
            else if (typeof module[key] === 'object') {
                promisifyRecursive(module[key]);
            }
        });
    }
    promisifyRecursive(theModule);
};
