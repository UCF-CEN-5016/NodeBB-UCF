// The next few line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line import/no-import-module-exports
import * as path from 'path';
// eslint-disable-next-line import/no-import-module-exports
import { createHash } from 'crypto';
// eslint-disable-next-line import/no-import-module-exports
import * as util from 'util';

// eslint-disable-next-line import/no-import-module-exports
import bcrypt from 'bcryptjs';

// eslint-disable-next-line import/no-import-module-exports
import { Serializable } from 'child_process';

// eslint-disable-next-line import/no-import-module-exports
import fork from './meta/debugFork';

// eslint-disable-next-line import/no-import-module-exports

// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function forkChild(message: any, callback: (error: Error | null, result?: string) => void) {
    const child = fork(path.join(__dirname, 'password'));

    child.on('message', (msg:{ err?: string; result?: string }) => {
        callback(msg.err ? new Error(msg.err) : null, msg.result);
    });
    child.on('error', (err:Error) => {
        console.error(err.stack);
        callback(err);
    });

    child.send(message as Serializable);
}

const forkChildAsync = util.promisify(forkChild);
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
exports.hash = async function (rounds:number, password:string) {
    password = createHash('sha512').update(password).digest('hex');
    return await forkChildAsync({ type: 'hash', rounds: rounds, password: password });
};

let fakeHashCache: string | undefined;
async function getFakeHash() {
    if (fakeHashCache) {
        return fakeHashCache;
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    fakeHashCache = await (exports as { hash: (arg1: number, arg2: string) => Promise<string> }).hash(12,
        Math.random().toString());
    return fakeHashCache;
}

// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
exports.compare = async function (password:string, hash:string, shaWrapped:boolean) {
    const fakeHash:string = await getFakeHash();

    if (shaWrapped) {
        password = createHash('sha512').update(password).digest('hex');
    }

    return await forkChildAsync({ type: 'compare', password: password, hash: hash || fakeHash });
};

async function tryMethod(
    method: (msg: { type: string, rounds: number, password: string, hash?: string }) => Promise<unknown>,
    msg: { type: string, rounds: number, password: string, hash?: string }
) {
    try {
        const result = await method(msg);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        process.send({ result });
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        process.send(err);
    } finally {
        process.disconnect();
    }
}

async function hashPassword(msg: { type: string, rounds: number, password: string }) {
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const salt: string = await bcrypt.genSalt(parseInt(String(msg.rounds), 10));
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const hash: string = await bcrypt.hash(msg.password, salt);
    return hash;
}

async function compare(msg: { type: string; rounds: number; password: string; hash?: string }): Promise<boolean> {
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    return await bcrypt.compare(String(msg.password || ''), String(msg.hash || ''));
}

// child process
process.on('message', (msg: { type: string, rounds: number, password: string, hash?: string }) => {
    if (msg.type === 'hash') {
        tryMethod(hashPassword, msg).then().catch((error) => {
            console.error(error);
        });
    } else if (msg.type === 'compare') {
        tryMethod(compare, msg).then().catch((error) => {
            console.error(error);
        });
    }
});

