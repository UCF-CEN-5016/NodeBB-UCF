import { Request, Response, NextFunction, Router } from 'express';
import winston from 'winston';
import middleware from '../middleware';
import controllerHelpers from '../controllers/helpers';

interface SetupPageRouteArgs {
    router: Router;
    name: string;
    middlewares?: any[];
    controller: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
}

interface SetupApiRouteArgs {
    router: Router;
    verb: string;
    name: string;
    middlewares?: any[];
    controller: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
}

interface TryRouteHandler {
    (err: any, res: Response): void;
}

const helpers = {
    setupPageRoute: ({ router, name, middlewares = [], controller }: SetupPageRouteArgs): void => {
        middlewares = [
            middleware.authenticateRequest,
            middleware.maintenanceMode,
            middleware.registrationComplete,
            middleware.pluginHooks,
            ...middlewares,
            middleware.pageView,
        ];

        router.get(
            name,
            middleware.busyCheck,
            middlewares,
            middleware.buildHeader,
            helpers.tryRoute(controller)
        );
        router.get(`/api${name}`, middlewares, helpers.tryRoute(controller));
    },

    setupAdminPageRoute: ({ router, name, middlewares = [], controller }: SetupPageRouteArgs): void => {
        router.get(name, middleware.admin.buildHeader, middlewares, helpers.tryRoute(controller));
        router.get(`/api${name}`, middlewares, helpers.tryRoute(controller));
    },

    setupApiRoute: ({ router, verb, name, middlewares = [], controller }: SetupApiRouteArgs): void => {
        middlewares = [
            middleware.authenticateRequest,
            middleware.maintenanceMode,
            middleware.registrationComplete,
            middleware.pluginHooks,
            ...middlewares,
        ];

        router[verb](name, middlewares, helpers.tryRoute(controller, (err, res) => {
            controllerHelpers.formatApiResponse(400, res, err);
        }));
    },

    tryRoute: (controller: (req: Request, res: Response, next: NextFunction) => Promise<void> | void, handler?: TryRouteHandler) => {
        if (controller && controller.constructor && controller.constructor.name === 'AsyncFunction') {
            return async (req: Request, res: Response, next: NextFunction) => {
                try {
                    await controller(req, res, next);
                } catch (err) {
                    if (handler) {
                        return handler(err, res);
                    }

                    next(err);
                }
            };
        }
        return controller;
    },
};

export default helpers;
