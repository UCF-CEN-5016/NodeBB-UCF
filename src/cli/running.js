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
exports.log = exports.status = exports.restart = exports.stop = exports.start = void 0;
const fs = __importStar(require("fs"));
const childProcess = __importStar(require("child_process"));
const chalk_1 = __importDefault(require("chalk"));
const debugFork_1 = __importDefault(require("../meta/debugFork"));
const constants_1 = require("../constants");
const cwd = constants_1.paths.baseDir;
function readPidFile() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.readFile(constants_1.paths.pidfile, { encoding: 'utf-8' }, (err, data) => {
                if (err) {
                    reject(err);
                }
                const pid = parseInt(data, 10);
                if (isNaN(pid)) {
                    reject(new Error('PID is not a number'));
                }
                resolve(pid);
            });
        });
    });
}
function killProcess(pid) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            try {
                process.kill(pid, 0);
                resolve();
            }
            catch (e) {
                reject(e);
            }
        });
    });
}
function getRunningPid() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pid = yield readPidFile();
            yield killProcess(pid);
            return pid;
        }
        catch (err) {
            return null;
        }
    });
}
function startNodeBB(options) {
    if (options.dev) {
        process.env.NODE_ENV = 'development';
        return (0, debugFork_1.default)(constants_1.paths.loader, ['--no-daemon', '--no-silent'], {
            env: process.env,
            stdio: 'inherit',
            cwd,
        });
    }
    let message = [];
    if (options.log) {
        message = [
            chalk_1.default.bold('Starting NodeBB with logging output'),
            chalk_1.default.red('Hit ') + chalk_1.default.bold('Ctrl-C ') + chalk_1.default.red('to exit'),
            'The NodeBB process will continue to run in the background',
            `Use "${chalk_1.default.yellow('./nodebb stop')}" to stop the NodeBB server`,
        ];
    }
    else if (!options.silent) {
        message = [
            chalk_1.default.bold('Starting NodeBB'),
            `  "${chalk_1.default.yellow('./nodebb stop')}" to stop the NodeBB server`,
            `  "${chalk_1.default.yellow('./nodebb log')}" to view server output`,
            `  "${chalk_1.default.yellow('./nodebb help')}" for more commands`,
        ];
    }
    console.log(`\n${message.join('\n')}\n`);
    const child = (0, debugFork_1.default)(constants_1.paths.loader, process.argv.slice(3), {
        env: process.env,
        cwd,
    });
    if (options.log) {
        childProcess.spawn('tail', ['-F', './logs/output.log'], {
            stdio: 'inherit',
            cwd,
        });
    }
    return child;
}
exports.start = startNodeBB;
function nodeBBStop() {
    return __awaiter(this, void 0, void 0, function* () {
        const pid = yield getRunningPid();
        if (pid) {
            process.kill(pid, 'SIGTERM');
            console.log('Stopping NodeBB. Goodbye!');
        }
        else {
            console.log('NodeBB is already stopped.');
        }
    });
}
exports.stop = nodeBBStop;
function restartNodeBB(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const pid = yield getRunningPid();
        if (pid) {
            console.log(chalk_1.default.bold('\nRestarting NodeBB'));
            process.kill(pid, 'SIGTERM');
            options.silent = true;
            startNodeBB(options);
        }
        else {
            console.warn('NodeBB could not be restarted, as a running instance could not be found.');
        }
    });
}
exports.restart = restartNodeBB;
function nodeBBStatus() {
    return __awaiter(this, void 0, void 0, function* () {
        const pid = yield getRunningPid();
        if (pid) {
            console.log(`\n${[
                chalk_1.default.bold('NodeBB Running ') + chalk_1.default.cyan(`(pid ${pid})`),
                `\t"${chalk_1.default.yellow('./nodebb stop')}" to stop the NodeBB server`,
                `\t"${chalk_1.default.yellow('./nodebb log')}" to view server output`,
                `\t"${chalk_1.default.yellow('./nodebb restart')}" to restart NodeBB`,
            ].join('\n')}\n`);
        }
        else {
            console.log(chalk_1.default.bold('\nNodeBB is not running'));
            console.log(`\t"${chalk_1.default.yellow('./nodebb start')}" to launch the NodeBB server\n`);
        }
    });
}
exports.status = nodeBBStatus;
function log() {
    console.log(`${chalk_1.default.red('\nHit ') + chalk_1.default.bold('Ctrl-C ') + chalk_1.default.red('to exit\n')}\n`);
    childProcess.spawn('tail', ['-F', './logs/output.log'], {
        stdio: 'inherit',
        cwd,
    });
}
exports.log = log;
