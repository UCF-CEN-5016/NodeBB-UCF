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
/* eslint-disable import/no-import-module-exports */
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const semver_1 = __importDefault(require("semver"));
const readline_1 = __importDefault(require("readline"));
const winston_1 = __importDefault(require("winston"));
const chalk_1 = __importDefault(require("chalk"));
const plugins_1 = __importDefault(require("./plugins"));
const database_1 = __importDefault(require("./database"));
const file_1 = __importDefault(require("./file"));
const constants_1 = require("./constants");
const Upgrade = module.exports;
Upgrade.getAll = function () {
    return __awaiter(this, void 0, void 0, function* () {
        let files = (yield file_1.default.walk(path_1.default.join(__dirname, './upgrades')));
        // Sort the upgrade scripts based on version
        files = files
            .filter((file) => path_1.default.basename(file) !== 'TEMPLATE')
            .sort((a, b) => {
            const versionA = path_1.default.dirname(a).split(path_1.default.sep).pop();
            const versionB = path_1.default.dirname(b).split(path_1.default.sep).pop();
            const semverCompare = semver_1.default.compare(versionA, versionB);
            if (semverCompare) {
                return semverCompare;
            }
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const moduloA = require(a);
            const timestampA = moduloA.timestamp;
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const moduloB = require(b);
            const timestampB = moduloB.timestamp;
            return timestampA - timestampB;
        });
        yield Upgrade.appendPluginScripts(files);
        // check duplicates and error
        const seen = {};
        const dupes = [];
        files.forEach((file) => {
            if (seen[file]) {
                dupes.push(file);
            }
            else {
                seen[file] = true;
            }
        });
        if (dupes.length) {
            winston_1.default.error(`Found duplicate upgrade scripts\n${dupes.toString()}`);
            throw new Error('[[error:duplicate-upgrade-scripts]]');
        }
        return files;
    });
};
Upgrade.appendPluginScripts = function (files) {
    return __awaiter(this, void 0, void 0, function* () {
        // Find all active plugins
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const activePlugins = (yield plugins_1.default.getActive());
        activePlugins.forEach((plugin) => {
            const configPath = path_1.default.join(constants_1.paths.nodeModules, plugin, 'plugin.json');
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const pluginConfig = require(configPath);
                if (pluginConfig.hasOwnProperty('upgrades') &&
                    Array.isArray(pluginConfig.upgrades)) {
                    pluginConfig.upgrades.forEach((script) => {
                        files.push(path_1.default.join(path_1.default.dirname(configPath), script));
                    });
                }
            }
            catch (e) {
                const error = e;
                if (error.code !== 'MODULE_NOT_FOUND') {
                    winston_1.default.error(error.stack);
                }
            }
        });
        return files;
    });
};
Upgrade.check = function () {
    return __awaiter(this, void 0, void 0, function* () {
        // Throw 'schema-out-of-date' if not all upgrade scripts have run
        const files = yield Upgrade.getAll();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const executed = (yield database_1.default.getSortedSetRange('schemaLog', 0, -1));
        const remainder = files.filter((name) => !executed.includes(path_1.default.basename(name, '.js')));
        if (remainder.length > 0) {
            throw new Error('schema-out-of-date');
        }
    });
};
Upgrade.run = function () {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\nParsing upgrade scripts... ');
        const [completed, available] = yield Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            database_1.default.getSortedSetRange('schemaLog', 0, -1),
            Upgrade.getAll(),
        ]);
        let skipped = 0;
        const queue = available.filter((cur) => {
            const upgradeRan = completed.includes(path_1.default.basename(cur, '.js'));
            if (upgradeRan) {
                skipped += 1;
            }
            return !upgradeRan;
        });
        yield Upgrade.process(queue, skipped);
    });
};
Upgrade.runParticular = function (names) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\nParsing upgrade scripts... ');
        const files = (yield file_1.default.walk(path_1.default.join(__dirname, './upgrades')));
        yield Upgrade.appendPluginScripts(files);
        const upgrades = files.filter((file) => names.includes(path_1.default.basename(file, '.js')));
        yield Upgrade.process(upgrades, 0);
    });
};
Upgrade.process = function (files, skipCount) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`${chalk_1.default.green('OK')} | ${chalk_1.default.cyan(`${files.length} script(s) found`)}${skipCount > 0 ? chalk_1.default.cyan(`, ${skipCount} skipped`) : ''}`);
        const [schemaDate, schemaLogCount] = yield Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            database_1.default.get('schemaDate'),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            database_1.default.sortedSetCard('schemaLog'),
        ]);
        for (const file of files) {
            /* eslint-disable no-await-in-loop */
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const scriptExport = require(file);
            const date = new Date(scriptExport.timestamp);
            const version = path_1.default.dirname(file).split('/').pop();
            const progress = {
                current: 0,
                counter: 0,
                total: 0,
                incr: Upgrade.incrementProgress,
                script: scriptExport,
                date: date,
            };
            process.stdout.write(`${chalk_1.default.white('  → ') +
                chalk_1.default.gray(`[${[
                    date.getUTCFullYear(),
                    date.getUTCMonth() + 1,
                    date.getUTCDate(),
                ].join('/')}] `) +
                scriptExport.name}...`);
            // For backwards compatibility, cross-reference with schemaDate (if found). If a script's date is older, skip it
            if ((!schemaDate && !schemaLogCount) ||
                (scriptExport.timestamp <= schemaDate && semver_1.default.lt(version, '1.5.0'))) {
                process.stdout.write(chalk_1.default.grey(' skipped\n'));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                yield database_1.default.sortedSetAdd('schemaLog', Date.now(), path_1.default.basename(file, '.js'));
                // eslint-disable-next-line no-continue
                continue;
            }
            // Promisify method if necessary
            if (scriptExport.method.constructor &&
                scriptExport.method.constructor.name !== 'AsyncFunction') {
                scriptExport.method = util_1.default.promisify(scriptExport.method);
            }
            // Do the upgrade...
            const upgradeStart = Date.now();
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                yield scriptExport.method.bind({
                    progress: progress,
                })();
            }
            catch (err) {
                console.error('Error occurred');
                throw err;
            }
            const upgradeDuration = ((Date.now() - upgradeStart) / 1000).toFixed(2);
            process.stdout.write(chalk_1.default.green(` OK (${upgradeDuration} seconds)\n`));
            // Record success in schemaLog
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            yield database_1.default.sortedSetAdd('schemaLog', Date.now(), path_1.default.basename(file, '.js'));
        }
        console.log(chalk_1.default.green('Schema update complete!\n'));
    });
};
Upgrade.incrementProgress = function (value) {
    // Newline on first invocation
    if (this.current === 0) {
        process.stdout.write('\n');
    }
    this.current += value || 1;
    this.counter += value || 1;
    const step = this.total ? Math.floor(this.total / 100) : 100;
    if (this.counter > step || this.current >= this.total) {
        this.counter -= step;
        let percentage = 0;
        let filled = 0;
        let unfilled = 15;
        if (this.total) {
            percentage = Math.floor((this.current / this.total) * 100);
            filled = Math.floor((this.current / this.total) * 15);
            unfilled = Math.max(0, 15 - filled);
        }
        readline_1.default.cursorTo(process.stdout, 0);
        process.stdout.write(`    [${filled ? new Array(filled).join('#') : ''}${new Array(unfilled).join(' ')}] (${this.current}/${this.total || '??'}) ${percentage} `);
    }
};
// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-var-requires
require('./promisify')(Upgrade);
