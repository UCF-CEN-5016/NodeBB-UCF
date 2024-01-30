import * as fs from 'fs';
import * as childProcess from 'child_process';
import chalk from 'chalk';
import fork from '../meta/debugFork';
import { paths } from '../constants';

const cwd = paths.baseDir;

interface Options {
    dev?: boolean;
    log?: boolean;
    silent?: boolean;
}

async function readPidFile(): Promise<number> {
    return new Promise((resolve, reject) => {
        fs.readFile(paths.pidfile, { encoding: 'utf-8' }, (err, data) => {
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
}

async function killProcess(pid: number): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            process.kill(pid, 0);
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

async function getRunningPid(): Promise<number | null> {
    try {
        const pid = await readPidFile();
        await killProcess(pid);
        return pid;
    } catch (err) {
        return null;
    }
}

function startNodeBB(options: Options): childProcess.ChildProcess | undefined {
    if (options.dev) {
        process.env.NODE_ENV = 'development';
        return fork(paths.loader, ['--no-daemon', '--no-silent'], {
            env: process.env,
            stdio: 'inherit',
            cwd,
        });
    }

    let message: string[] = [];
    if (options.log) {
        message = [
            chalk.bold('Starting NodeBB with logging output'),
            chalk.red('Hit ') + chalk.bold('Ctrl-C ') + chalk.red('to exit'),
            'The NodeBB process will continue to run in the background',
            `Use "${chalk.yellow('./nodebb stop')}" to stop the NodeBB server`,
        ];
    } else if (!options.silent) {
        message = [
            chalk.bold('Starting NodeBB'),
            `  "${chalk.yellow('./nodebb stop')}" to stop the NodeBB server`,
            `  "${chalk.yellow('./nodebb log')}" to view server output`,
            `  "${chalk.yellow('./nodebb help')}" for more commands`,
        ];
    }

    console.log(`\n${message.join('\n')}\n`);

    const child = fork(paths.loader, process.argv.slice(3), {
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

async function nodeBBStop(): Promise<void> {
    const pid = await getRunningPid();
    if (pid) {
        process.kill(pid, 'SIGTERM');
        console.log('Stopping NodeBB. Goodbye!');
    } else {
        console.log('NodeBB is already stopped.');
    }
}

async function restartNodeBB(options: Options): Promise<void> {
    const pid = await getRunningPid();
    if (pid) {
        console.log(chalk.bold('\nRestarting NodeBB'));
        process.kill(pid, 'SIGTERM');

        options.silent = true;
        startNodeBB(options);
    } else {
        console.warn('NodeBB could not be restarted, as a running instance could not be found.');
    }
}

async function nodeBBStatus(): Promise<void> {
    const pid = await getRunningPid();
    if (pid) {
        console.log(`\n${[
            chalk.bold('NodeBB Running ') + chalk.cyan(`(pid ${pid})`),
            `\t"${chalk.yellow('./nodebb stop')}" to stop the NodeBB server`,
            `\t"${chalk.yellow('./nodebb log')}" to view server output`,
            `\t"${chalk.yellow('./nodebb restart')}" to restart NodeBB`,
        ].join('\n')}\n`);
    } else {
        console.log(chalk.bold('\nNodeBB is not running'));
        console.log(`\t"${chalk.yellow('./nodebb start')}" to launch the NodeBB server\n`);
    }
}

function log(): void {
    console.log(`${chalk.red('\nHit ') + chalk.bold('Ctrl-C ') + chalk.red('to exit\n')}\n`);
    childProcess.spawn('tail', ['-F', './logs/output.log'], {
        stdio: 'inherit',
        cwd,
    });
}

export { startNodeBB as start, nodeBBStop as stop, restartNodeBB as restart, nodeBBStatus as status, log };
