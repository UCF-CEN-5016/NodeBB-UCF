import nconf from 'nconf';
import url from 'url';
import winston from 'winston';
import path from 'path';
import chalk from 'chalk';
import semver from 'semver';
import pkg from '../package.json';
import { paths } from './constants';

export function setupWinston(): void {
    if (!winston.format) {
        return;
    }

    const formats: winston.Logform.Format[] = [];
    if (String(nconf.get('log-colorize')) !== 'false') {
        formats.push(winston.format.colorize());
    }

    if (String(nconf.get('json-logging'))) {
        formats.push(winston.format.timestamp());
        formats.push(winston.format.json());
    } else {
        const timestampFormat = winston.format((info) => {
            const dateString = `${new Date().toString()} [${String(nconf.get('port'))}/${process.pid}]`;
            info.level = `${dateString} - ${info.level}`;
            return info;
        });
        formats.push(timestampFormat());
        formats.push(winston.format.splat());
        formats.push(winston.format.simple());
    }

    const myFormat = winston.format.combine(...formats);

    winston.configure({
        level: String(nconf.get('log-level')) || (process.env.NODE_ENV === 'production' ? 'info' : 'verbose'),
        format: myFormat,
        transports: [
            new winston.transports.Console({
                handleExceptions: true,
            }),
        ],
    });
}

export function loadConfig(configFile: string): void {
    nconf.file({
        file: configFile,
    });

    nconf.defaults({
        base_dir: paths.baseDir,
        themes_path: paths.themes,
        upload_path: 'public/uploads',
        views_dir: path.join(paths.baseDir, 'build/public/templates'),
        version: pkg.version,
        isCluster: false,
        isPrimary: true,
        jobsDisabled: false,
    });

    const castAsBool: string[] = ['isCluster', 'isPrimary', 'jobsDisabled'];

    // Allow modifications to env store
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    nconf.stores.env.readOnly = false;

    castAsBool.forEach((prop) => {
        const value = String(nconf.get(prop));
        if (value !== undefined) {
            nconf.set(prop, ['1', 1, 'true', true].includes(value));
        }
    });

    // Restore read-only status
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    nconf.stores.env.readOnly = true;

    nconf.set('runJobs', nconf.get('isPrimary') && !nconf.get('jobsDisabled'));

    nconf.set('themes_path', path.resolve(paths.baseDir, String(nconf.get('themes_path'))));
    nconf.set('core_templates_path', path.join(paths.baseDir, 'src/views'));
    nconf.set('base_templates_path', path.join(String(nconf.get('themes_path')), 'nodebb-theme-persona/templates'));

    nconf.set('upload_path', path.resolve(String(nconf.get('base_dir')), String(nconf.get('upload_path'))));
    nconf.set('upload_url', '/assets/uploads');

    if (!nconf.get('sessionKey')) {
        nconf.set('sessionKey', 'express.sid');
    }

    if (nconf.get('url')) {
        const urlObject = url.parse(String(nconf.get('url')));
        const relativePath = urlObject.pathname !== '/' ? urlObject.pathname.replace(/\/+$/, '') : '';
        nconf.set('base_url', `${urlObject.protocol}//${urlObject.host}`);
        nconf.set('secure', urlObject.protocol === 'https:');
        nconf.set('use_port', !!urlObject.port);
        nconf.set('relative_path', relativePath);
        if (!nconf.get('asset_base_url')) {
            nconf.set('asset_base_url', `${relativePath}/assets`);
        }
        nconf.set('port', String(nconf.get('PORT')) || String(nconf.get('port')) || urlObject.port || (String(nconf.get('PORT_ENV_VAR')) ? String(nconf.get(String(nconf.get('PORT_ENV_VAR')))) : false) || 4567);

        const domain = String(nconf.get('cookieDomain')) || urlObject.hostname;
        const origins = String(nconf.get('socket.io:origins')) || `${urlObject.protocol}//${domain}:*`;
        nconf.set('socket.io:origins', origins);
    }
}

export function versionCheck(): void {
    const version = process.version.slice(1);
    const range = pkg.engines.node;
    const compatible = semver.satisfies(version, range);

    if (!compatible) {
        winston.warn('Your version of Node.js is too outdated for NodeBB. Please update your version of Node.js.');
        winston.warn(`Recommended ${chalk.green(range)}, ${chalk.yellow(version)} provided\n`);
    }
}
