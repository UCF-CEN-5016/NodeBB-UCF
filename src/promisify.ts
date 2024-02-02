import * as util from 'util';

interface Module {
    [key: string]: any;
}

type CallbackFunction = (err: Error | null, result?: any) => void;
type AsyncFunction = (...args: any[]) => Promise<any>;

module.exports = function (theModule: Module, ignoreKeys: string[] = []): void {
    ignoreKeys = ignoreKeys || [];

    // Checks if a function appears to be a callback-style function.
    function isCallbackedFunction(func : CallbackFunction): boolean {
        if (typeof func !== 'function') {
            return false;
        }
        const str = func.toString().split('\n')[0];
        return str.includes('callback)');
    }

    // Checks if a function is an asynchronous function.
    function isAsyncFunction(fn : AsyncFunction): boolean {
        return fn && fn.constructor && fn.constructor.name === 'AsyncFunction';
    }

    // Wraps an asynchronous function with a callback-style function
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    function wrapCallback(origFn: AsyncFunction, callbackFn) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return async function wrapperCallback(...args: CallbackFunction[]) {
            if (args.length && typeof args[args.length - 1] === 'function') {
                const cb = args.pop();
                args.push((err: Error | null, res?: any) => (res !== undefined ? cb(err, res) : cb(err)));
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                const result = await callbackFn(...args);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                return result;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const result = await origFn(...args);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return result;
        };
    }

    // Wraps a callback-style function with a promise-style function.
    function wrapPromise(origFn: AsyncFunction, promiseFn: AsyncFunction) {
        return function wrapperPromise(...args: AsyncFunction[]) {
            if (args.length && typeof args[args.length - 1] === 'function') {
                return origFn(...args);
            }

            return promiseFn(...args); // Type assertion here to address TypeScript error
        };
    }

    // Recursively processes an object, converting callback-style functions to promises.
    function promisifyRecursive(module: Module | undefined): void {
        if (!module) {
            return;
        }

        const keys = Object.keys(module);
        keys.forEach((key) => {
            if (ignoreKeys.includes(key)) {
                return;
            }
            if (isAsyncFunction(module[key] as AsyncFunction)) {
                const wrappedCallback = util.callbackify(module[key] as AsyncFunction); // converts promise to callback
                module[key] = wrapCallback(module[key] as AsyncFunction, wrappedCallback);
            } else if (isCallbackedFunction(module[key] as CallbackFunction)) {
                const wrappedPromise = util.promisify(module[key] as CallbackFunction); // converts callback to promise
                module[key] = wrapPromise(module[key] as AsyncFunction, wrappedPromise);
            } else if (typeof module[key] === 'object') {
                promisifyRecursive(module[key] as Module);
            }
        });
    }

    promisifyRecursive(theModule);
};
