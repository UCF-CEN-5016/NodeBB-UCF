import prompt from 'prompt';
import request from 'request-promise-native';
import cproc from 'child_process';
import semver from 'semver';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { paths, pluginNamePattern } from '../constants';
import batch from '../batch';

import pkgInstall from './package-install';


export interface name {
	package: string, version: string, code: string
}

export interface CheckPlugins {
  name: string,
	current: string,
	suggested: string
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const packageManager = pkgInstall.getPackageManager();

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
let packageManagerExecutable = packageManager;
const packageManagerInstallArgs = packageManager === 'yarn' ? ['add'] : ['install', '--save'];

if (process.platform === 'win32') {
    packageManagerExecutable += '.cmd';
}

async function getModuleVersions(modules) {
    const versionHash = {};
    await batch.processArray(modules, async (moduleNames: string[]) => {
        await Promise.all(moduleNames.map(async (module) => {
            const pkg = await fs.promises.readFile(
                path.join(paths.nodeModules, module, 'package.json'), { encoding: 'utf-8' }
            );
            const parsedPkg: {version: string} = await JSON.parse(pkg) as {version: string};
            versionHash[module] = parsedPkg.version;
        }));
    }, {
        batch: 50,
    });

    return versionHash;
}

async function getInstalledPlugins() {
    const [depsJSON, bundledJSON] = await Promise.all([
        fs.promises.readFile(paths.currentPackage, { encoding: 'utf-8' }),
        fs.promises.readFile(paths.installPackage, { encoding: 'utf-8' }),
    ]);

    const deps: string[] = Object.keys((JSON.parse(depsJSON) as {dependencies: string[]}).dependencies)
        .filter(pkgName => pluginNamePattern.test(pkgName));
    const bundled: string[] = Object.keys((JSON.parse(bundledJSON) as {dependencies: string[]}).dependencies)
        .filter(pkgName => pluginNamePattern.test(pkgName));


    // Whittle down deps to send back only extraneously installed plugins/themes/etc
    const checklist = deps.filter((pkgName) => {
        if (bundled.includes(pkgName)) {
            return false;
        }

        // Ignore git repositories
        try {
            fs.accessSync(path.join(paths.nodeModules, pkgName, '.git'));
            return false;
        } catch (e) {
            return true;
        }
    });

    return await getModuleVersions(checklist);
}

async function getCurrentVersion() {
    const pkgJSON = await fs.promises.readFile(paths.installPackage, { encoding: 'utf-8' });
    const pkg: {version: string} = JSON.parse(pkgJSON) as {version: string};
    return pkg.version;
}

async function getSuggestedModules(nbbVersion: string, toCheck: string[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    let body: name | name[] = await request({
        method: 'GET',
        url: `https://packages.nodebb.org/api/v1/suggest?version=${nbbVersion}&package[]=${toCheck.join('&package[]=')}`,
        json: true,
    }) as (name | name[]);

    if (!Array.isArray(body) && toCheck.length === 1) {
        body = [body];
    }

    return body;
}

async function checkPlugins(): Promise<CheckPlugins[]> {
    process.stdout.write('Checking installed plugins and themes for updates... ');
    const [plugins, nbbVersion] = await Promise.all([
        getInstalledPlugins(),
        getCurrentVersion(),
    ]);

    const toCheck = Object.keys(plugins);
    if (!toCheck.length) {
        process.stdout.write(chalk.green('  OK'));
        return []; // no extraneous plugins installed
    }
    const suggestedModules = await getSuggestedModules(nbbVersion, toCheck);
    process.stdout.write(chalk.green('  OK'));

    if (!Array.isArray(suggestedModules)) {
        process.stdout.write(chalk.green('  OK'));
        return [];
    }

    let current: string;
    let suggested: string;
    const upgradable = suggestedModules.map((suggestObj) => {
        current = plugins[suggestObj.package] as string;
        suggested = suggestObj.version;

        if (suggestObj.code === 'match-found' && semver.gt(suggested, current)) {
            return {
                name: suggestObj.package,
                current: current,
                suggested: suggested,
            };
        }
        return null;
    }).filter(Boolean);

    return upgradable;
}

export async function upgradePlugins() {
    try {
        const found = await checkPlugins();
        if (found && found.length) {
            process.stdout.write(`\n\nA total of ${chalk.bold(String(found.length))} package(s) can be upgraded:\n\n`);
            found.forEach((suggestObj) => {
                process.stdout.write(`${chalk.yellow('  * ') + suggestObj.name} (${chalk.yellow(suggestObj.current)} -> ${chalk.green(suggestObj.suggested)})\n`);
            });
        } else {
            console.log(chalk.green('\nAll packages up-to-date!'));
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        prompt.message = '';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        prompt.delimiter = '';

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        prompt.start();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        const result = await prompt.get({
            name: 'upgrade',
            description: '\nProceed with upgrade (y|n)?',
            type: 'string',
        }) as {upgrade: string};

        if (['y', 'Y', 'yes', 'YES'].includes(result.upgrade)) {
            console.log('\nUpgrading packages...');
            const args = packageManagerInstallArgs.concat(found.map(suggestObj => `${suggestObj.name}@${suggestObj.suggested}`));

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            cproc.execFileSync(packageManagerExecutable, args, { stdio: 'ignore' });
        } else {
            console.log(`${chalk.yellow('Package upgrades skipped')}. Check for upgrades at any time by running "${chalk.green('./nodebb upgrade -p')}".`);
        }
    } catch (err) {
        console.log(`${chalk.yellow('Warning')}: An unexpected error occured when attempting to verify plugin upgradability`);
        throw err;
    }
}
