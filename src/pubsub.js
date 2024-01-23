"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line import/no-import-module-exports
const events_1 = __importDefault(require("events"));
// eslint-disable-next-line import/no-import-module-exports
const nconf_1 = __importDefault(require("nconf"));
// eslint-disable-next-line import/no-import-module-exports
const pubsub_1 = __importDefault(require("./database/redis/pubsub"));
let real;
let noCluster;
let singleHost;
function get() {
    if (real) {
        return real;
    }
    let pubsub;
    if (!nconf_1.default.get('isCluster')) {
        if (noCluster) {
            real = noCluster;
            return real;
        }
        noCluster = new events_1.default();
        noCluster = Object.assign(noCluster, {
            publish: noCluster.emit.bind(noCluster),
        });
        pubsub = noCluster;
    }
    else if (nconf_1.default.get('singleHostCluster')) {
        if (singleHost) {
            real = singleHost;
            return real;
        }
        singleHost = new events_1.default();
        if (!process.send) {
            singleHost = Object.assign(singleHost, {
                publish: singleHost.emit.bind(singleHost),
            });
        }
        else {
            singleHost = Object.assign(singleHost, {
                publish: function (event, ...data) {
                    return process.send({
                        action: 'pubsub',
                        event: event,
                        data: data,
                    });
                },
            });
            process.on('message', (message) => {
                if (message &&
                    typeof message === 'object' &&
                    message.action === 'pubsub') {
                    singleHost.emit(message.event, message.data);
                }
            });
        }
        pubsub = singleHost;
    }
    else if (nconf_1.default.get('redis')) {
        pubsub = pubsub_1.default;
    }
    else {
        throw new Error('[[error:redis-required-for-pubsub]]');
    }
    real = pubsub;
    return pubsub;
}
module.exports = {
    publish: function (event, data) {
        get().publish(event, data);
    },
    on: function (event, callback) {
        get().on(event, callback);
    },
    removeAllListeners: function (event) {
        get().removeAllListeners(event);
    },
    reset: function () {
        real = null;
    },
};
