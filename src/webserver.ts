
import fs = require('fs');
import util = require('util');
import path = require('path');
import os = require('os');
import nconf = require('nconf');
import express = require('express');
import chalk = require('chalk');

import winston = require('winston');
import flash = require('connect-flash');
import bodyParser = require('body-parser');
import cookieParser = require('cookie-parser');
import session = require('express-session');
import useragent = require('express-useragent');
import favicon = require('serve-favicon');
import detector = require('spider-detector');
import helmet = require('helmet');

import net = require('net');
import https = require('https');
import http = require('http');
import toobusy = require('toobusy-js');
import compression = require('compression');

import Benchpress = require('benchpressjs');
import db = require('./database');
import analytics = require('./analytics');
import file = require('./file');
import emailer = require('./emailer');
import meta = require('./meta');
import logger = require('./logger');
import plugins = require('./plugins');
import flags = require('./flags');
import topicEvents = require('./topics/events');
import privileges = require('./privileges');
import routes = require('./routes');
import auth = require('./routes/authentication');

import helpers = require('./helpers');
import promisify = require('./promisify');
import middleware = require('./middleware');
import pingController = require('./controllers/ping');
import controllerHelpers = require('./controllers/helpers');
import als = require('./als');
import socketIO = require('./socket.io')

declare module 'express' {
    interface Application {
        renderAsync: (tpl: string, data: object) => Promise<string>;
    }
}

const app: express.Express & { renderAsync?: (tpl: string, data: object, callback: () => void) => Promise<string> } =
    express();
// eslint-disable-next-line
app.renderAsync = util.promisify(app.render.bind(app));
let server: https.Server | http.Server;

if (nconf.get('ssl')) {
    server = https.createServer({
        // eslint-disable-next-line
        key: fs.readFileSync(nconf.get('ssl').key),
        // eslint-disable-next-line
        cert: fs.readFileSync(nconf.get('ssl').cert),
    }, app);
} else {
    server = http.createServer(app);
}

// eslint-disable-next-line
module.exports.server = server;
// eslint-disable-next-line
module.exports.app = app;

server.on('error', (err) => {
    if (err.name === 'EADDRINUSE') {
        winston.error(`NodeBB address in use, exiting...\n${err.stack}`);
    } else {
        winston.error(err.stack);
    }

    throw err;
});

// see https://github.com/isaacs/server-destroy/blob/master/index.js
const connections = {};
server.on('connection', (conn: net.Socket) => {
    const key = `${conn.remoteAddress}:${conn.remotePort}`;
    connections[key] = conn;
    conn.on('close', () => {
        delete connections[key];
    });
});

async function initializeNodeBB() {
    await meta.themes.setupPaths();
    await plugins.init(app, middleware);
    await plugins.hooks.fire('static:assets.prepare', {});
    await plugins.hooks.fire('static:app.preload', {
        app: app,
        middleware: middleware,
    });
    await routes(app, middleware);
    await privileges.init();
    await meta.blacklist.load();
    await flags.init();
    await analytics.init();
    await topicEvents.init();
}

function setupHelmet(app: express.Express) {
    const options: helmet.HelmetOptions = {
        contentSecurityPolicy: false, // defaults are too restrive and break plugins that load external assets... 🔜
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment @typescript-eslint/no-unsafe-member-access
        crossOriginOpenerPolicy: { policy: meta.config['cross-origin-opener-policy'] },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment @typescript-eslint/no-unsafe-member-access
        crossOriginResourcePolicy: { policy: meta.config['cross-origin-resource-policy'] },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    };

    if (!meta.config['cross-origin-embedder-policy']) {
        options.crossOriginEmbedderPolicy = false;
    }
    if (meta.config['hsts-enabled']) {
        options.hsts = {
            maxAge: meta.config['hsts-maxage'],
            includeSubDomains: !!meta.config['hsts-subdomains'],
            preload: !!meta.config['hsts-preload'],
        };
    }

    app.use(helmet.default(options));
}

function setupFavicon(app: express.Express) {
    let faviconPath = meta.config['brand:favicon'] || 'favicon.ico';
    faviconPath = path.join(nconf.get('base_dir'), 'public', faviconPath.replace(/assets\/uploads/, 'uploads'));
    if (file.existsSync(faviconPath)) {
        app.use(nconf.get('relative_path'), favicon(faviconPath));
    }
}

function configureBodyParser(app: express.Express) {
    const urlencodedOpts: bodyParser.OptionsUrlencoded = nconf.get('bodyParser:urlencoded') || {};
    if (!urlencodedOpts.hasOwnProperty('extended')) {
        urlencodedOpts.extended = true;
    }
    app.use(bodyParser.urlencoded(urlencodedOpts));

    const jsonOpts: bodyParser.OptionsJson = nconf.get('bodyParser:json') || {};
    app.use(bodyParser.json(jsonOpts));
}

function setupExpressApp(app: express.Express) {
    // eslint-disable-next-line
    const relativePath: string = nconf.get('relative_path');
    // eslint-disable-next-line
    const viewsDir = nconf.get('views_dir');

    app.engine('tpl', (filepath: string, data: object, next) => {
        filepath = filepath.replace(/\.tpl$/, '.js');

        // eslint-disable-next-line
        Benchpress.__express(filepath, data, next);
    });
    app.set('view engine', 'tpl');
    app.set('views', viewsDir);
    app.set('json spaces', global.env === 'development' ? 4 : 0);
    app.use(flash());

    app.enable('view cache');

    if (global.env !== 'development') {
        app.enable('cache');
        app.enable('minification');
    }

    // eslint-disable-next-line
    if (meta.config.useCompression) {
        // eslint-disable-next-line
        app.use(compression());
    }
    if (relativePath) {
        app.use((req, res, next) => {
            if (!req.path.startsWith(relativePath)) {
                return controllerHelpers.redirect(res, req.path);
            }
            next();
        });
    }

    app.get(`${relativePath}/ping`, pingController.ping);
    app.get(`${relativePath}/sping`, pingController.ping);

    setupFavicon(app);

    app.use(`${relativePath}/apple-touch-icon`, middleware.routeTouchIcon);

    configureBodyParser(app);

    app.use(cookieParser(nconf.get('secret')));
    app.use(useragent.express());
    app.use(detector.middleware());
    app.use(session({
        store: db.sessionStore,
        secret: nconf.get('secret'),
        key: nconf.get('sessionKey'),
        cookie: setupCookie(),
        resave: nconf.get('sessionResave') || false,
        saveUninitialized: nconf.get('sessionSaveUninitialized') || false,
    }));

    setupHelmet(app);

    app.use(middleware.addHeaders);
    app.use(middleware.processRender);
    auth.initialize(app, middleware);
    app.use((req: express.Request & { uid: number }, res, next) => {
        als.run({ uid: req.uid }, next);
    });
    app.use(middleware.autoLocale); // must be added after auth middlewares are added

    toobusy.maxLag(meta.config.eventLoopLagThreshold);
    toobusy.interval(meta.config.eventLoopInterval);
}

function setupCookie() {
    // eslint-disable-next-line
    const cookie = meta.configs.cookie.get();
    // eslint-disable-next-line
    const ttl = meta.getSessionTTLSeconds() * 1000;
    cookie.maxAge = ttl;

    return cookie;
}

async function listen() {
    // eslint-disable-next-line
    let port = nconf.get('port');
    const isSocket = isNaN(port) && !Array.isArray(port);
    const socketPath: string = isSocket ? nconf.get('port') : '';

    if (Array.isArray(port)) {
        if (!port.length) {
            winston.error('[startup] empty ports array in config.json');
            process.exit();
        }

        winston.warn('[startup] If you want to start nodebb on multiple ports please use loader.js');
        winston.warn(`[startup] Defaulting to first port in array, ${port[0]}`);
        port = port[0];
        if (!port) {
            winston.error('[startup] Invalid port, exiting');
            process.exit();
        }
    }
    port = parseInt(port, 10);
    if ((port !== 80 && port !== 443) || nconf.get('trust_proxy') === true) {
        winston.info('🤝 Enabling \'trust proxy\'');
        app.enable('trust proxy');
    }

    if ((port === 80 || port === 443) && process.env.NODE_ENV !== 'development') {
        winston.info('Using ports 80 and 443 is not recommend; use a proxy instead. See README.md');
    }

    const bind_address: string = ((nconf.get('bind_address') === '0.0.0.0' || !nconf.get('bind_address')) ?
        '0.0.0.0' :
        nconf.get('bind_address'));
    // eslint-disable-next-line
    const args = isSocket ? [socketPath] : [port, bind_address];
    let oldUmask: number;

    if (isSocket) {
        oldUmask = process.umask('0000');
        try {
            await exports.testSocket(socketPath);
        } catch (err) {
            winston.error(`[startup] NodeBB was unable to secure domain socket access (${socketPath})\n${err.stack}`);
            throw err;
        }
    }

    return new Promise<void>((resolve, reject) => {
        server.listen(...args.concat([function (err) {
            const onText: string = `${isSocket ? socketPath : `${bind_address}:${port}`}`;
            if (err) {
                winston.error(`[startup] NodeBB was unable to listen on: ${chalk.yellow(onText)}`);
                reject(err);
            }

            winston.info(`📡 NodeBB is now listening on: ${chalk.yellow(onText)}`);
            winston.info(`🔗 Canonical URL: ${chalk.yellow(nconf.get('url'))}`);
            if (oldUmask) {
                process.umask(oldUmask);
            }
            resolve();
        }]));
    });
}

exports.testSocket = async function (socketPath: string) {
    const exists: boolean = await file.exists(socketPath);
    if (!exists) {
        return;
    }
    return new Promise<void>((resolve, reject) => {
        const testSocket: net.Socket = new net.Socket();
        testSocket.on('error', (err) => {
            if (err.name !== 'ECONNREFUSED') {
                return reject(err);
            }
            // The socket was stale, kick it out of the way
            fs.unlink(socketPath, (err) => {
                if (err) reject(err); else resolve();
            });
        });
        testSocket.connect({ path: socketPath }, () => {
            // Something's listening here, abort
            reject(new Error('port-in-use'));
        });
    });
};

// eslint-disable-next-line
exports.destroy = function (callback: () => void) {
    server.close(callback);
    for (const connection of Object.values(connections)) {
        (connection as net.Socket).destroy();
    }
};

// eslint-disable-next-line
exports.listen = async function () {
    emailer.registerApp(app);
    setupExpressApp(app);
    helpers.register();
    logger.init(app);
    await initializeNodeBB();
    winston.info('🎉 NodeBB Ready');

    socketIO.server.emit('event:nodebb.ready', {
        'cache-buster': meta.config['cache-buster'],
        hostname: os.hostname(),
    });

    plugins.hooks.fire('action:nodebb.ready');

    await listen();
};

promisify(exports);
