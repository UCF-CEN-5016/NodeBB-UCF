import * as util from 'util';

interface Module {
    [key: string]: any;
}

type CallbackFunction = (err: Error | null, result?: any) => void;
type AsyncFunction = (...args: any[]) => Promise<any>;

module.exports = function (theModule: Module, ignoreKeys: string[] = []): void {
    ignoreKeys = ignoreKeys || [];

    function isCallbackedFunction(func : CallbackFunction): boolean {
        if (typeof func !== 'function') {
            return false;
        }
        const str = func.toString().split('\n')[0];
        return str.includes('callback)');
    }

    function isAsyncFunction(fn : AsyncFunction): boolean {
        return fn && fn.constructor && fn.constructor.name === 'AsyncFunction';
    }

    function wrapCallback(origFn: AsyncFunction, callbackFn: any) {
        return async function wrapperCallback(...args: AsyncFunction[]) {
            if (args.length && typeof args[args.length - 1] === 'function') {
                const cb = args.pop();
                args.push((err: Error | null, res?: any) => (res !== undefined ? cb(err, res) : cb(err)));
                const result = await callbackFn(...args);
                return result;
            }
            const result = await origFn(...args);
            return result;
        };
    }

    function wrapPromise(origFn: AsyncFunction, promiseFn: AsyncFunction) {
        return function wrapperPromise(...args: AsyncFunction[]) {
            if (args.length && typeof args[args.length - 1] === 'function') {
                return origFn(...args);
            }

            return promiseFn(...args); // Type assertion here to address TypeScript error
        };
    }

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
                const wrappedCallback = util.callbackify(module[key] as AsyncFunction);
                module[key] = wrapCallback(module[key] as AsyncFunction, wrappedCallback);
                
            } else if (isCallbackedFunction(module[key] as CallbackFunction)) {
                const wrappedPromise = util.promisify(module[key] as CallbackFunction);
                module[key] = wrapPromise(module[key] as AsyncFunction, wrappedPromise);
            } else if (typeof module[key] === 'object') {
                promisifyRecursive(module[key] as Module);
            }
        });
    }

    promisifyRecursive(theModule);
};
