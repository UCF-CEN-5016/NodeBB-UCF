/* eslint-disable import/no-import-module-exports */
import path from 'path';
import util from 'util';
import semver from 'semver';
import readline from 'readline';
import winston from 'winston';
import chalk from 'chalk';

import plugins from './plugins';
import db from './database';
import file from './file';
import { paths } from './constants';

/*
 * Need to write an upgrade script for NodeBB? Cool.
 *
 * 1. Copy TEMPLATE to a unique file name of your choice. Try to be succinct.
 * 2. Open up that file and change the user-friendly name (can be longer/more descriptive than the file name)
 *    and timestamp (don't forget the timestamp!)
 * 3. Add your script under the "method" property
 */

type Upgrade = {
  getAll: () => Promise<string[]>; // DONE
  appendPluginScripts: (files: string[]) => Promise<string[]>; // DONE
  check: () => Promise<void>; // DONE
  run: () => Promise<void>; // DONE
  runParticular: (names: string[]) => Promise<void>; // DONE
  process: (files: string[], skipCount: number) => Promise<void>; // DONE
  incrementProgress: (value: number) => void; // DONE
  current: number;
  counter: number;
  total: number;
};

type TimeStamp = {
  timestamp: number;
};

type PluginConfig = {
  upgrades?: string[];
};

type Error = {
  code: string;
  stack: unknown;
};

type Data = {
  name: string;
  timestamp: number;
  method: (...args: unknown[]) => unknown;
};

const Upgrade: Upgrade = module.exports as Upgrade;

Upgrade.getAll = async function () {
    let files: string[] = (await file.walk(
        path.join(__dirname, './upgrades')
    )) as string[];

    // Sort the upgrade scripts based on version
    files = files
        .filter((file: string) => path.basename(file) !== 'TEMPLATE')
        .sort((a: string, b: string) => {
            const versionA: string = path.dirname(a).split(path.sep).pop();
            const versionB: string = path.dirname(b).split(path.sep).pop();
            const semverCompare: 0 | 1 | -1 = semver.compare(versionA, versionB);
            if (semverCompare) {
                return semverCompare;
            }

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const moduloA: TimeStamp = require(a) as TimeStamp;
            const timestampA: number = moduloA.timestamp;

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const moduloB: TimeStamp = require(b) as TimeStamp;
            const timestampB: number = moduloB.timestamp;

            return timestampA - timestampB;
        });

    await Upgrade.appendPluginScripts(files);

    // check duplicates and error
    const seen = {};
    const dupes: string[] = [];
    files.forEach((file: string) => {
        if (seen[file]) {
            dupes.push(file);
        } else {
            seen[file] = true;
        }
    });
    if (dupes.length) {
        winston.error(`Found duplicate upgrade scripts\n${dupes.toString()}`);
        throw new Error('[[error:duplicate-upgrade-scripts]]');
    }

    return files;
};

Upgrade.appendPluginScripts = async function (files: string[]) {
    // Find all active plugins

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const activePlugins: string[] = (await plugins.getActive()) as string[];
    activePlugins.forEach((plugin: string) => {
        const configPath: string = path.join(
            paths.nodeModules,
            plugin,
            'plugin.json'
        );
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const pluginConfig: PluginConfig = require(configPath) as PluginConfig;
            if (
                pluginConfig.hasOwnProperty('upgrades') &&
        Array.isArray(pluginConfig.upgrades)
            ) {
                pluginConfig.upgrades.forEach((script: string) => {
                    files.push(path.join(path.dirname(configPath), script));
                });
            }
        } catch (e) {
            const error = e as Error;
            if (error.code !== 'MODULE_NOT_FOUND') {
                winston.error(error.stack);
            }
        }
    });
    return files;
};

Upgrade.check = async function () {
    // Throw 'schema-out-of-date' if not all upgrade scripts have run
    const files = await Upgrade.getAll();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const executed: string[] = (await db.getSortedSetRange(
        'schemaLog',
        0,
        -1
    )) as string[];
    const remainder = files.filter(
        (name: string) => !executed.includes(path.basename(name, '.js'))
    );
    if (remainder.length > 0) {
        throw new Error('schema-out-of-date');
    }
};

Upgrade.run = async function () {
    console.log('\nParsing upgrade scripts... ');

    const [completed, available]: [string[], string[]] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    db.getSortedSetRange('schemaLog', 0, -1) as Promise<string[]>,
    Upgrade.getAll(),
    ]);

    let skipped = 0;
    const queue: string[] = available.filter((cur: string) => {
        const upgradeRan: boolean = completed.includes(path.basename(cur, '.js'));
        if (upgradeRan) {
            skipped += 1;
        }
        return !upgradeRan;
    });

    await Upgrade.process(queue, skipped);
};

Upgrade.runParticular = async function (names: string[]) {
    console.log('\nParsing upgrade scripts... ');
    const files: string[] = (await file.walk(
        path.join(__dirname, './upgrades')
    )) as string[];
    await Upgrade.appendPluginScripts(files);
    const upgrades = files.filter((file: string) => names.includes(path.basename(file, '.js')));
    await Upgrade.process(upgrades, 0);
};

Upgrade.process = async function (files: string[], skipCount: number) {
    console.log(
        `${chalk.green('OK')} | ${chalk.cyan(`${files.length} script(s) found`)}${
            skipCount > 0 ? chalk.cyan(`, ${skipCount} skipped`) : ''
        }`
    );
    const [schemaDate, schemaLogCount]: [number, number] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    db.get('schemaDate') as Promise<number>,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    db.sortedSetCard('schemaLog') as Promise<number>,
    ]);

    for (const file of files) {
    /* eslint-disable no-await-in-loop */
    // eslint-disable-next-line @typescript-eslint/no-var-requires
        const scriptExport: Data = require(file) as Data;
        const date = new Date(scriptExport.timestamp);
        const version = path.dirname(file).split('/').pop();
        const progress = {
            current: 0,
            counter: 0,
            total: 0,
            incr: Upgrade.incrementProgress,
            script: scriptExport,
            date: date,
        };

        process.stdout.write(
            `${
                chalk.white('  → ') +
        chalk.gray(
            `[${[
                date.getUTCFullYear(),
                date.getUTCMonth() + 1,
                date.getUTCDate(),
            ].join('/')}] `
        ) +
        scriptExport.name
            }...`
        );

        // For backwards compatibility, cross-reference with schemaDate (if found). If a script's date is older, skip it
        if (
            (!schemaDate && !schemaLogCount) ||
      (scriptExport.timestamp <= schemaDate && semver.lt(version, '1.5.0'))
        ) {
            process.stdout.write(chalk.grey(' skipped\n'));

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            await db.sortedSetAdd(
                'schemaLog',
                Date.now(),
                path.basename(file, '.js')
            );
            // eslint-disable-next-line no-continue
            continue;
        }

        // Promisify method if necessary
        if (
            scriptExport.method.constructor &&
      scriptExport.method.constructor.name !== 'AsyncFunction'
        ) {
            scriptExport.method = util.promisify(scriptExport.method);
        }

        // Do the upgrade...
        const upgradeStart = Date.now();
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await scriptExport.method.bind({
                progress: progress,
            })();
        } catch (err) {
            console.error('Error occurred');
            throw err;
        }
        const upgradeDuration = ((Date.now() - upgradeStart) / 1000).toFixed(2);
        process.stdout.write(chalk.green(` OK (${upgradeDuration} seconds)\n`));

        // Record success in schemaLog
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await db.sortedSetAdd('schemaLog', Date.now(), path.basename(file, '.js'));
    }

    console.log(chalk.green('Schema update complete!\n'));
};

Upgrade.incrementProgress = function (this: Upgrade, value: number) {
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

        readline.cursorTo(process.stdout, 0);
        process.stdout.write(
            `    [${filled ? new Array(filled).join('#') : ''}${new Array(
                unfilled
            ).join(' ')}] (${this.current}/${this.total || '??'}) ${percentage} `
        );
    }
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-var-requires
require('./promisify')(Upgrade);
