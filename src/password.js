var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const path = require('path');
const crypto = require('crypto');
const util = require('util');
const bcrypt = require('bcryptjs');
const fork = require('./meta/debugFork');
function forkChild(message, callback) {
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
exports.hash = function (rounds, password) {
    return __awaiter(this, void 0, void 0, function* () {
        password = crypto.createHash('sha512').update(password).digest('hex');
        return yield forkChildAsync({ type: 'hash', rounds, password });
    });
};
exports.compare = function (password, hash, shaWrapped) {
    return __awaiter(this, void 0, void 0, function* () {
        const fakeHash = yield getFakeHash();
        if (shaWrapped) {
            password = crypto.createHash('sha512').update(password).digest('hex');
        }
        return yield forkChildAsync({ type: 'compare', password, hash: hash || fakeHash });
    });
};
let fakeHashCache;
function getFakeHash() {
    return __awaiter(this, void 0, void 0, function* () {
        if (fakeHashCache) {
            return fakeHashCache;
        }
        fakeHashCache = yield exports.hash(12, Math.random().toString());
        return fakeHashCache;
    });
}
// child process
process.on('message', (msg) => {
    if (msg === 'hash') {
        tryMethod(hashPassword, msg);
    }
    else if (msg === 'compare') {
        tryMethod(compare, msg);
    }
});
function tryMethod(method, msg) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield method(msg);
            process.send({ result: result });
        }
        catch (err) {
            process.send({ err: err.message });
        }
        finally {
            process.disconnect();
        }
    });
}
function hashPassword(msg) {
    return __awaiter(this, void 0, void 0, function* () {
        const salt = yield bcrypt.genSalt(parseInt(msg.rounds, 10));
        const hash = yield bcrypt.hash(msg.password, salt);
        return hash;
    });
}
function compare(msg) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield bcrypt.compare(String(msg.password || ''), String(msg.hash || ''));
    });
}
require('./promisify')(exports);
