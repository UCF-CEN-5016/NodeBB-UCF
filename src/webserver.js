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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
const path = require("path");
const os = require("os");
const nconf = require("nconf");
const express = require("express");
const chalk = require("chalk");
const winston = require("winston");
const flash = require("connect-flash");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const useragent = require("express-useragent");
const favicon = require("serve-favicon");
const detector = require("spider-detector");
const helmet = require("helmet");
const net = require("net");
const https = require("https");
const http = require("http");
const Benchpress = require("benchpressjs");
const db = require("./database");
const analytics = require("./analytics");
const file = require("./file");
const emailer = require("./emailer");
const meta = require("./meta");
const logger = require("./logger");
const plugins = require("./plugins");
const flags = require("./flags");
const topicEvents = require("./topics/events");
const privileges = require("./privileges");
const routes = require("./routes");
const auth = require("./routes/authentication");
const helpers = require("./helpers");
const promisify = require("./promisify");
const middleware = require("./middleware");
const pingController = require("./controllers/ping");
const controllerHelpers = require("./controllers/helpers");
const als = require("./als");
const toobusy = require("toobusy-js");
const compression = require("compression");
const app = express();
// eslint-disable-next-line
app.renderAsync = util.promisify(app.render.bind(app));
let server;
if (nconf.get('ssl')) {
    server = https.createServer({
        // eslint-disable-next-line
        key: fs.readFileSync(nconf.get('ssl').key),
        // eslint-disable-next-line
        cert: fs.readFileSync(nconf.get('ssl').cert),
    }, app);
}
else {
    server = http.createServer(app);
}
// eslint-disable-next-line
module.exports.server = server;
// eslint-disable-next-line
module.exports.app = app;
server.on('error', (err) => {
    if (err.name === 'EADDRINUSE') {
        winston.error(`NodeBB address in use, exiting...\n${err.stack}`);
    }
    else {
        winston.error(err.stack);
    }
    throw err;
});
// see https://github.com/isaacs/server-destroy/blob/master/index.js
const connections = {};
server.on('connection', (conn) => {
    const key = `${conn.remoteAddress}:${conn.remotePort}`;
    connections[key] = conn;
    conn.on('close', () => {
        delete connections[key];
    });
});
function initializeNodeBB() {
    return __awaiter(this, void 0, void 0, function* () {
        yield meta.themes.setupPaths();
        yield plugins.init(app, middleware);
        yield plugins.hooks.fire('static:assets.prepare', {});
        yield plugins.hooks.fire('static:app.preload', {
            app: app,
            middleware: middleware,
        });
        yield routes(app, middleware);
        yield privileges.init();
        yield meta.blacklist.load();
        yield flags.init();
        yield analytics.init();
        yield topicEvents.init();
    });
}
function setupExpressApp(app) {
    // eslint-disable-next-line
    const relativePath = nconf.get('relative_path');
    // eslint-disable-next-line
    const viewsDir = nconf.get('views_dir');
    app.engine('tpl', (filepath, data, next) => {
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
    if (meta.config.useCompression) {
        //const compression = require('compression');
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
    app.use((req, res, next) => {
        als.run({ uid: req.uid }, next);
    });
    app.use(middleware.autoLocale); // must be added after auth middlewares are added
    toobusy.maxLag(meta.config.eventLoopLagThreshold);
    toobusy.interval(meta.config.eventLoopInterval);
}
// eslint-disable-next-line
exports.destroy = function (callback) {
    server.close(callback);
    for (const connection of Object.values(connections)) {
        connection.destroy();
    }
};
// eslint-disable-next-line
exports.listen = function () {
    return __awaiter(this, void 0, void 0, function* () {
        emailer.registerApp(app);
        setupExpressApp(app);
        helpers.register();
        logger.init(app);
        yield initializeNodeBB();
        winston.info('🎉 NodeBB Ready');
        require('./socket.io').server.emit('event:nodebb.ready', {
            'cache-buster': meta.config['cache-buster'],
            hostname: os.hostname(),
        });
        plugins.hooks.fire('action:nodebb.ready');
        yield listen();
    });
};
function setupHelmet(app) {
    const options = {
        contentSecurityPolicy: false,
        crossOriginOpenerPolicy: { policy: meta.config['cross-origin-opener-policy'] },
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
function setupFavicon(app) {
    let faviconPath = meta.config['brand:favicon'] || 'favicon.ico';
    faviconPath = path.join(nconf.get('base_dir'), 'public', faviconPath.replace(/assets\/uploads/, 'uploads'));
    if (file.existsSync(faviconPath)) {
        app.use(nconf.get('relative_path'), favicon(faviconPath));
    }
}
function configureBodyParser(app) {
    const urlencodedOpts = nconf.get('bodyParser:urlencoded') || {};
    if (!urlencodedOpts.hasOwnProperty('extended')) {
        urlencodedOpts.extended = true;
    }
    app.use(bodyParser.urlencoded(urlencodedOpts));
    const jsonOpts = nconf.get('bodyParser:json') || {};
    app.use(bodyParser.json(jsonOpts));
}
function setupCookie() {
    const cookie = meta.configs.cookie.get();
    const ttl = meta.getSessionTTLSeconds() * 1000;
    cookie.maxAge = ttl;
    return cookie;
}
function listen() {
    return __awaiter(this, void 0, void 0, function* () {
        let port = nconf.get('port');
        const isSocket = isNaN(port) && !Array.isArray(port);
        const socketPath = isSocket ? nconf.get('port') : '';
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
        const bind_address = ((nconf.get('bind_address') === '0.0.0.0' || !nconf.get('bind_address')) ?
            '0.0.0.0' :
            nconf.get('bind_address'));
        const args = isSocket ? [socketPath] : [port, bind_address];
        let oldUmask;
        if (isSocket) {
            oldUmask = process.umask('0000');
            try {
                yield exports.testSocket(socketPath);
            }
            catch (err) {
                winston.error(`[startup] NodeBB was unable to secure domain socket access (${socketPath})\n${err.stack}`);
                throw err;
            }
        }
        return new Promise((resolve, reject) => {
            server.listen(...args.concat([function (err) {
                    const onText = `${isSocket ? socketPath : `${bind_address}:${port}`}`;
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
    });
}
exports.testSocket = function (socketPath) {
    return __awaiter(this, void 0, void 0, function* () {
        // const net = require('net');
        // const file = require('./file');
        const exists = yield file.exists(socketPath);
        if (!exists) {
            return;
        }
        return new Promise((resolve, reject) => {
            const testSocket = new net.Socket();
            testSocket.on('error', (err) => {
                if (err.name !== 'ECONNREFUSED') {
                    return reject(err);
                }
                // The socket was stale, kick it out of the way
                fs.unlink(socketPath, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            testSocket.connect({ path: socketPath }, () => {
                // Something's listening here, abort
                reject(new Error('port-in-use'));
            });
        });
    });
};
promisify(exports);
