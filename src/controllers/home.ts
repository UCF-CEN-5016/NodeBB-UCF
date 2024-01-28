import { Request, Response, NextFunction } from 'express';
import * as url from 'url';
import * as plugins from '../plugins';
import * as meta from '../meta';
import * as user from '../user';

function adminHomePageRoute(): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const homepageRoute:string = meta.config.homePageRoute;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const homepageCustom:string = meta.config.homePageCustom;

    const route:string = (homepageRoute === 'custom' ? homepageCustom : homepageRoute) || 'categories';

    return route.replace(/^\//, '');
}

async function getUserHomeRoute(uid: number): Promise<string> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const settings = await user.getSettings(uid);
        let route = adminHomePageRoute();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const homePageRoute:string = settings.homePageRoute || route;
        if (homePageRoute !== 'undefined' && homePageRoute !== 'none') {
            route = homePageRoute.replace(/^\/+/, '');
        }
        return route;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function rewrite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (req.path !== '/' && req.path !== '/api/' && req.path !== '/api') {
            return next();
        }
        let route = adminHomePageRoute();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (meta.config.allowUserHomePage) {
            route = await getUserHomeRoute(Number(req.query.uid));
        }
        let parsedUrl: url.UrlWithParsedQuery;
        try {
            parsedUrl = url.parse(route, true);
        } catch (err) {
            return next();
        }
        const { pathname } = parsedUrl;
        const hook = `action:homepage.get:${pathname}`;
        if (!plugins.hooks.hasListeners(hook)) {
            req.url = req.path + (!req.path.endsWith('/') ? '/' : '') + pathname;
        } else {
            res.locals.homePageRoute = pathname;
        }
        req.query = { ...parsedUrl.query, ...req.query };
        next();
    } catch (err) {
        console.error(err);
        next(err);
    }
}

export { rewrite };

function pluginHook(req: Request, res: Response, next: NextFunction): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const homePageRoute: string = res.locals.homePageRoute || '';
    const hook = `action:homepage.get:${homePageRoute}`;
    plugins.hooks.fire(hook, {
        req: req,
        res: res,
        next: next,
    }).catch((err) => {
        console.error(err);
        next(err);
    });
}

export { pluginHook };
