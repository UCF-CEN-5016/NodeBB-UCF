// eslint-disable-next-line import/no-import-module-exports
import EventEmitter from 'events';
// eslint-disable-next-line import/no-import-module-exports
import nconf from 'nconf';

type emitType = typeof EventEmitter.prototype.emit;

type PubSubEventEmitter = EventEmitter & { publish: emitType; };

type PubSubEventEmitterOrEventEmitter = EventEmitter | PubSubEventEmitter;

type ActionMessage = object & {
    action: string;
    event: string | symbol;
    data: any;
};

let real: PubSubEventEmitterOrEventEmitter;
let noCluster: PubSubEventEmitterOrEventEmitter;
let singleHost: PubSubEventEmitterOrEventEmitter;


function get(): PubSubEventEmitterOrEventEmitter {
    if (real) {
        return real;
    }

    let pubsub: PubSubEventEmitterOrEventEmitter;

    if (!nconf.get('isCluster')) {
        if (noCluster) {
            real = noCluster;
            return real;
        }
        noCluster = new EventEmitter();
        noCluster = Object.assign(noCluster, {
            publish: noCluster.emit.bind(noCluster) as emitType,
        });
        pubsub = noCluster;
    } else if (nconf.get('singleHostCluster')) {
        if (singleHost) {
            real = singleHost;
            return real;
        }
        singleHost = new EventEmitter();
        if (!process.send) {
            singleHost = Object.assign(singleHost, {
                publish: singleHost.emit.bind(singleHost) as emitType,
            });
        } else {
            singleHost = Object.assign(singleHost, {
                publish: function (event: string | symbol, ...data: any[]): boolean {
                    return process.send({
                        action: 'pubsub',
                        event: event,
                        data: data,
                    });
                },
            });
            process.on('message', (message: null | ActionMessage) => {
                if (
                    message &&
                    typeof message === 'object' &&
                    message.action === 'pubsub'
                ) {
                    singleHost.emit(message.event, message.data);
                }
            });
        }
        pubsub = singleHost;
    } else if (nconf.get('redis')) {
        pubsub = require('./database/redis/pubsub') as PubSubEventEmitter;
    } else {
        throw new Error('[[error:redis-required-for-pubsub]]');
    }

    real = pubsub;
    return pubsub;
}

module.exports = {
    publish: function (event: string | symbol, data: any): void {
        (get() as PubSubEventEmitter).publish(event, data);
    },
    on: function (event: string | symbol, callback: (...args: any[]) => void): void {
        get().on(event, callback);
    },
    removeAllListeners: function (event: string | symbol): void {
        get().removeAllListeners(event);
    },
    reset: function (): void {
        real = null;
    },
};
