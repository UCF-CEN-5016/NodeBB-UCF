// eslint-disable-next-line import/no-import-module-exports
import { Request, Response, NextFunction } from 'express';
// eslint-disable-next-line import/no-import-module-exports
import nconf from 'nconf';
// eslint-disable-next-line import/no-import-module-exports
import winston from 'winston';
// eslint-disable-next-line import/no-import-module-exports
import validator from 'validator';
// eslint-disable-next-line import/no-import-module-exports
import translator from '../translator';
// eslint-disable-next-line import/no-import-module-exports
import plugins from '../plugins';
// eslint-disable-next-line import/no-import-module-exports
import middleware from '../middleware';
// eslint-disable-next-line import/no-import-module-exports
import middlewareHelpers from '../middleware/helpers';
// eslint-disable-next-line import/no-import-module-exports
import helpers from './helpers';

const relative_path: string = nconf.get('relative_path') as string;

interface CustomError extends Error {
    status: string,
    path: string,
    code: number,
}

interface Case {
    EBADCSRFTOKEN: () => void,
    'blacklisted-ip': () => void
}

interface ErrorHandlersSuccess {
    cases: Case;
}

interface ErrorHandlersFailure {
    cases: Case;
}

type ErrorHandlersResult = ErrorHandlersSuccess | ErrorHandlersFailure;

export async function handleURIErrors(err: CustomError, req: Request, res: Response, next: NextFunction) {
    // Handle cases where malformed URIs are passed in
    if (err instanceof URIError) {
        const cleanPath: string = req.path.replace(new RegExp(`^${relative_path}`), '');
        const tidMatch = cleanPath.match(/^\/topic\/(\d+)\//);
        const cidMatch = cleanPath.match(/^\/category\/(\d+)\//);

        if (tidMatch) {
            res.redirect(relative_path + tidMatch[0]);
        } else if (cidMatch) {
            res.redirect(relative_path + cidMatch[0]);
        } else {
            winston.warn(`[controller] Bad request: ${req.path}`);
            if (req.path.startsWith(`${relative_path}/api`)) {
                res.status(400).json({
                    error: '[[global:400.title]]',
                });
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                await middleware.buildHeaderAsync(req, res);
                res.status(400).render('400', { error: validator.escape(String(err.message)) });
            }
        }
    } else {
        next(err);
    }
}

async function getErrorHandlers(cases: Case): Promise<ErrorHandlersResult> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const result = await plugins.hooks.fire('filter:error.handle', { cases });
        return result as ErrorHandlersSuccess;
    } catch (err: unknown) {
        // Assume defaults
        const knownError = err as CustomError;
        winston.warn(`[errors/handle] Unable to retrieve plugin handlers for errors: ${knownError.message}`);
        return { cases } as ErrorHandlersFailure;
    }
}

// this needs to have four arguments or express treats it as `(req, res, next)`
// don't remove `next`!
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function handleErrors(err: CustomError, req: Request, res: Response, next: NextFunction) {
    const cases: Case = {
        EBADCSRFTOKEN: function () {
            winston.error(`${req.method} ${req.originalUrl}\n${err.message}`);
            res.sendStatus(403);
        },
        'blacklisted-ip': function () {
            res.status(403).type('text/plain').send(err.message);
        },
    };
    const defaultHandler = async function () {
        if (res.headersSent) {
            return;
        }
        // Display NodeBB error page
        const status = parseInt(err.status, 10);
        if ((status === 302 || status === 308) && err.path) {
            return res.locals.isAPI ? res.set('X-Redirect', err.path).status(200).json(err.path) : res.redirect(relative_path + err.path);
        }

        const path = String(req.path || '');

        if (path.startsWith(`${relative_path}/api/v3`)) {
            let status = 500;
            if (err.message.startsWith('[[')) {
                status = 400;
                err.message = await translator.translate(err.message);
            }
            return helpers.formatApiResponse(status, res, err);
        }

        winston.error(`${req.method} ${req.originalUrl}\n${err.stack}`);
        res.status(status || 500);
        const data = {
            path: validator.escape(path),
            error: validator.escape(String(err.message)),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            bodyClass: middlewareHelpers.buildBodyClass(req, res),
        };
        if (res.locals.isAPI) {
            res.json(data);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await middleware.buildHeaderAsync(req, res);
            res.render('500', data);
        }
    };
    const data: ErrorHandlersResult = await getErrorHandlers(cases);
    try {
        if (data.cases.hasOwnProperty(err.code)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            data.cases[err.code](err, req, res, defaultHandler);
        } else {
            await defaultHandler();
        }
    } catch (_err: unknown) {
        const knownError = _err as CustomError;
        winston.error(`${req.method} ${req.originalUrl}\n${knownError.stack}`);
        if (!res.headersSent) {
            res.status(500).send(knownError.message);
        }
    }
}


