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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// The next few line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line import/no-import-module-exports
const path = __importStar(require("path"));
// eslint-disable-next-line import/no-import-module-exports
const crypto_1 = require("crypto");
// eslint-disable-next-line import/no-import-module-exports
const util = __importStar(require("util"));
// eslint-disable-next-line import/no-import-module-exports
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// eslint-disable-next-line import/no-import-module-exports
const debugFork_1 = __importDefault(require("./meta/debugFork"));
// eslint-disable-next-line import/no-import-module-exports
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function forkChild(message, callback) {
    const child = (0, debugFork_1.default)(path.join(__dirname, 'password'));
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
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
exports.hash = function (rounds, password) {
    return __awaiter(this, void 0, void 0, function* () {
        password = (0, crypto_1.createHash)('sha512').update(password).digest('hex');
        return yield forkChildAsync({ type: 'hash', rounds: rounds, password: password });
    });
};
let fakeHashCache;
function getFakeHash() {
    return __awaiter(this, void 0, void 0, function* () {
        if (fakeHashCache) {
            return fakeHashCache;
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        fakeHashCache = yield exports.hash(12, Math.random().toString());
        return fakeHashCache;
    });
}
// The next line calls a function in a module that has not been updated to TS yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
exports.compare = function (password, hash, shaWrapped) {
    return __awaiter(this, void 0, void 0, function* () {
        const fakeHash = yield getFakeHash();
        if (shaWrapped) {
            password = (0, crypto_1.createHash)('sha512').update(password).digest('hex');
        }
        return yield forkChildAsync({ type: 'compare', password: password, hash: hash || fakeHash });
    });
};
function tryMethod(method, msg) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield method(msg);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            process.send({ result });
        }
        catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            process.send(err);
        }
        finally {
            process.disconnect();
        }
    });
}
function hashPassword(msg) {
    return __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const salt = yield bcryptjs_1.default.genSalt(parseInt(String(msg.rounds), 10));
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const hash = yield bcryptjs_1.default.hash(msg.password, salt);
        return hash;
    });
}
function compare(msg) {
    return __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        return yield bcryptjs_1.default.compare(String(msg.password || ''), String(msg.hash || ''));
    });
}
// child process
process.on('message', (msg) => {
    if (msg.type === 'hash') {
        tryMethod(hashPassword, msg).then().catch((error) => {
            console.error(error);
        });
    }
    else if (msg.type === 'compare') {
        tryMethod(compare, msg).then().catch((error) => {
            console.error(error);
        });
    }
});
