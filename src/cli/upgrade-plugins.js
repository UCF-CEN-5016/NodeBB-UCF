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
exports.upgradePlugins = void 0;
const prompt_1 = __importDefault(require("prompt"));
const request_promise_native_1 = __importDefault(require("request-promise-native"));
const child_process_1 = __importDefault(require("child_process"));
const semver_1 = __importDefault(require("semver"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const constants_1 = require("../constants");
const batch_1 = __importDefault(require("../batch"));
const package_install_1 = __importDefault(require("./package-install"));
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const packageManager = package_install_1.default.getPackageManager();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
let packageManagerExecutable = packageManager;
const packageManagerInstallArgs = packageManager === 'yarn' ? ['add'] : ['install', '--save'];
if (process.platform === 'win32') {
    packageManagerExecutable += '.cmd';
}
function getModuleVersions(modules) {
    return __awaiter(this, void 0, void 0, function* () {
        const versionHash = {};
        yield batch_1.default.processArray(modules, (moduleNames) => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(moduleNames.map((module) => __awaiter(this, void 0, void 0, function* () {
                const pkg = yield fs_1.default.promises.readFile(path_1.default.join(constants_1.paths.nodeModules, module, 'package.json'), { encoding: 'utf-8' });
                const parsedPkg = yield JSON.parse(pkg);
                versionHash[module] = parsedPkg.version;
            })));
        }), {
            batch: 50,
        });
        return versionHash;
    });
}
function getInstalledPlugins() {
    return __awaiter(this, void 0, void 0, function* () {
        const [depsJSON, bundledJSON] = yield Promise.all([
            fs_1.default.promises.readFile(constants_1.paths.currentPackage, { encoding: 'utf-8' }),
            fs_1.default.promises.readFile(constants_1.paths.installPackage, { encoding: 'utf-8' }),
        ]);
        const deps = Object.keys(JSON.parse(depsJSON).dependencies)
            .filter(pkgName => constants_1.pluginNamePattern.test(pkgName));
        const bundled = Object.keys(JSON.parse(bundledJSON).dependencies)
            .filter(pkgName => constants_1.pluginNamePattern.test(pkgName));
        // Whittle down deps to send back only extraneously installed plugins/themes/etc
        const checklist = deps.filter((pkgName) => {
            if (bundled.includes(pkgName)) {
                return false;
            }
            // Ignore git repositories
            try {
                fs_1.default.accessSync(path_1.default.join(constants_1.paths.nodeModules, pkgName, '.git'));
                return false;
            }
            catch (e) {
                return true;
            }
        });
        return yield getModuleVersions(checklist);
    });
}
function getCurrentVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        const pkgJSON = yield fs_1.default.promises.readFile(constants_1.paths.installPackage, { encoding: 'utf-8' });
        const pkg = JSON.parse(pkgJSON);
        return pkg.version;
    });
}
function getSuggestedModules(nbbVersion, toCheck) {
    return __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        let body = yield (0, request_promise_native_1.default)({
            method: 'GET',
            url: `https://packages.nodebb.org/api/v1/suggest?version=${nbbVersion}&package[]=${toCheck.join('&package[]=')}`,
            json: true,
        });
        if (!Array.isArray(body) && toCheck.length === 1) {
            body = [body];
        }
        return body;
    });
}
function checkPlugins() {
    return __awaiter(this, void 0, void 0, function* () {
        process.stdout.write('Checking installed plugins and themes for updates... ');
        const [plugins, nbbVersion] = yield Promise.all([
            getInstalledPlugins(),
            getCurrentVersion(),
        ]);
        const toCheck = Object.keys(plugins);
        if (!toCheck.length) {
            process.stdout.write(chalk_1.default.green('  OK'));
            return []; // no extraneous plugins installed
        }
        const suggestedModules = yield getSuggestedModules(nbbVersion, toCheck);
        process.stdout.write(chalk_1.default.green('  OK'));
        if (!Array.isArray(suggestedModules)) {
            process.stdout.write(chalk_1.default.green('  OK'));
            return [];
        }
        let current;
        let suggested;
        const upgradable = suggestedModules.map((suggestObj) => {
            current = plugins[suggestObj.package];
            suggested = suggestObj.version;
            if (suggestObj.code === 'match-found' && semver_1.default.gt(suggested, current)) {
                return {
                    name: suggestObj.package,
                    current: current,
                    suggested: suggested,
                };
            }
            return null;
        }).filter(Boolean);
        return upgradable;
    });
}
function upgradePlugins() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const found = yield checkPlugins();
            if (found && found.length) {
                process.stdout.write(`\n\nA total of ${chalk_1.default.bold(String(found.length))} package(s) can be upgraded:\n\n`);
                found.forEach((suggestObj) => {
                    process.stdout.write(`${chalk_1.default.yellow('  * ') + suggestObj.name} (${chalk_1.default.yellow(suggestObj.current)} -> ${chalk_1.default.green(suggestObj.suggested)})\n`);
                });
            }
            else {
                console.log(chalk_1.default.green('\nAll packages up-to-date!'));
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            prompt_1.default.message = '';
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            prompt_1.default.delimiter = '';
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
            prompt_1.default.start();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
            const result = yield prompt_1.default.get({
                name: 'upgrade',
                description: '\nProceed with upgrade (y|n)?',
                type: 'string',
            });
            if (['y', 'Y', 'yes', 'YES'].includes(result.upgrade)) {
                console.log('\nUpgrading packages...');
                const args = packageManagerInstallArgs.concat(found.map(suggestObj => `${suggestObj.name}@${suggestObj.suggested}`));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                child_process_1.default.execFileSync(packageManagerExecutable, args, { stdio: 'ignore' });
            }
            else {
                console.log(`${chalk_1.default.yellow('Package upgrades skipped')}. Check for upgrades at any time by running "${chalk_1.default.green('./nodebb upgrade -p')}".`);
            }
        }
        catch (err) {
            console.log(`${chalk_1.default.yellow('Warning')}: An unexpected error occured when attempting to verify plugin upgradability`);
            throw err;
        }
    });
}
exports.upgradePlugins = upgradePlugins;
