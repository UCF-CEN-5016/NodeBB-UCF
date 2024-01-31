'use strict';

import * as path from 'path';
import * as crypto from 'crypto';
import * as util from 'util';
import * as bcrypt from 'bcryptjs';

import { fork } from './meta/debugFork';

function forkChild(message:any, callback:(error:Error | null, result ?: any) => void) {
    const child = fork(path.join(__dirname, 'password'));

    child.on('message', (msg) => {
        callback(msg.err ? new Error(msg.err) : null, msg.result);
    });
    child.on('error', (err) => {
        console.error(err.stack);
        callback(err);
    });

    child.send(message);
}

const forkChildAsync = util.promisify(forkChild);

exports.hash = async function (rounds:number, password:string) {
    password = crypto.createHash('sha512').update(password).digest('hex');
    return await forkChildAsync({ type: 'hash', rounds, password});
};

exports.compare = async function (password:string, hash:string, shaWrapped:boolean) {
    const fakeHash = await getFakeHash();

    if (shaWrapped) {
        password = crypto.createHash('sha512').update(password).digest('hex');
    }

    return await forkChildAsync({ type: 'compare', password, hash: hash || fakeHash });
};

let fakeHashCache : string | undefined;
async function getFakeHash() {
    if (fakeHashCache) {
        return fakeHashCache;
    }
    fakeHashCache = await exports.hash(12, Math.random().toString());
    return fakeHashCache;
}

// child process
process.on('message', (msg:string) => {
    if (msg === 'hash') {
        tryMethod(hashPassword, msg);
    } else if (msg === 'compare') {
        tryMethod(compare, msg);
    }
});

async function tryMethod(method:(msg:any) => Promise<any>, msg:any) {
    try {
        const result = await method(msg);
        process.send({ result: result });
    } catch (err) {
        process.send({ err: err.message });
    } finally {
        process.disconnect();
    }
}

async function hashPassword(msg:any) {
    const salt = await bcrypt.genSalt(parseInt(msg.rounds, 10));
    const hash = await bcrypt.hash(msg.password, salt);
    return hash;
}

async function compare(msg:any) {
    return await bcrypt.compare(String(msg.password || ''), String(msg.hash || ''));
}

require('./promisify')(exports);
