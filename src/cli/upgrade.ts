'use strict';

import * as nconf from 'nconf';
import * as chalk from 'chalk';

import * as packageInstall from './package-install';
import { upgradePlugins } from './upgrade-plugins';

interface Step {
    message: string;
    handler: () => Promise<void> | void;
}

const steps: Record<string, Step> = {
    package: {
        message: 'Updating package.json file with defaults...',
        handler: function () {
            packageInstall.updatePackageFile();
            packageInstall.preserveExtraneousPlugins();
            process.stdout.write(chalk.green('  OK\n'));
        },
    },
    install: {
        message: 'Bringing base dependencies up to date...',
        handler: function () {
            process.stdout.write(chalk.green('  started\n'));
            packageInstall.installAll();
        },
    },
    plugins: {
        message: 'Checking installed plugins for updates...',
        handler: async function () {
            await require('../database').init();
            await upgradePlugins();
        },
    },
    schema: {
        message: 'Updating NodeBB data store schema...',
        handler: async function () {
            await require('../database').init();
            await require('../meta').configs.init();
            await require('../upgrade').run();
        },
    },
    build: {
        message: 'Rebuilding assets...',
        handler: async function () {
            await require('../meta/build').buildAll();
        },
    },
};

async function runSteps(tasks: string[]): Promise<void> {
    try {
        for (let i = 0; i < tasks.length; i++) {
            const step = steps[tasks[i]];
            if (step && step.message && step.handler) {
                process.stdout.write(`\n${chalk.bold(`${i + 1}. `)}${chalk.yellow(step.message)}`);
                await step.handler();
            }
        }

        const message = 'NodeBB Upgrade Complete!';
        const { columns } = process.stdout;
        const spaces = columns ? new Array(Math.floor(columns / 2) - (message.length / 2) + 1).join(' ') : '  ';

        console.log(`\n\n${spaces}${chalk.green.bold(message)}\n`);

        process.exit();
    } catch (err) {
        console.error(`Error occurred during upgrade: ${err.stack}`);
        throw err;
    }
}

async function runUpgrade(upgrades: boolean | Record<string, boolean>, options?: Record<string, boolean>): Promise<void> {
    console.log(chalk.cyan('\nUpdating NodeBB...'));
    options = options || {};
    nconf.set('mongo:options:socketTimeoutMS', 0); // Disable mongo timeouts during upgrade

    if (upgrades === true) {
        let tasks = Object.keys(steps);
        if (options.package || options.install || options.plugins || options.schema || options.build) {
            tasks = tasks.filter(key => options[key]);
        }
        await runSteps(tasks);
        return;
    }

    await require('../database').init();
    await require('../meta').configs.init();
    await require('../upgrade').runParticular(upgrades);
    process.exit(0);
}

exports.upgrade = runUpgrade;
