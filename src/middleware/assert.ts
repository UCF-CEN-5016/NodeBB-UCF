import * as path from 'path';
import nconf from 'nconf';

import file from '../file';
import user from '../user';
import groups from '../groups';
import topics from '../topics';
import posts from '../posts';
import messaging from '../messaging';
import flags from '../flags';
import slugify from '../slugify';

import * as helpers from './helpers';
import * as controllerHelpers from '../controllers/helpers';

interface Request {
    params: {
        uid?: string;
        slug?: string;
        tid?: string;
        pid?: string;
        flagId?: string;
        roomId?: string;
        mid?: string;
    };
    uid: string; // assuming uid is always a string
    body: {
        path: string;
        folderName: string;
    };
}

const Assert: Record<string, any> = {};

Assert.user = helpers.try(async (req: Request, res: any, next: () => void) => {
    if (!(await user.exists(req.params.uid))) {
        return controllerHelpers.formatApiResponse(404, res, new Error('[[error:no-user]]'));
    }

    next();
});

Assert.group = helpers.try(async (req: Request, res: any, next: () => void) => {
    const name = await groups.getGroupNameByGroupSlug(req.params.slug);
    if (!name || !(await groups.exists(name))) {
        return controllerHelpers.formatApiResponse(404, res, new Error('[[error:no-group]]'));
    }

    next();
});

Assert.topic = helpers.try(async (req: Request, res: any, next: () => void) => {
    if (!(await topics.exists(req.params.tid))) {
        return controllerHelpers.formatApiResponse(404, res, new Error('[[error:no-topic]]'));
    }

    next();
});

Assert.post = helpers.try(async (req: Request, res: any, next: () => void) => {
    if (!(await posts.exists(req.params.pid))) {
        return controllerHelpers.formatApiResponse(404, res, new Error('[[error:no-post]]'));
    }

    next();
});

Assert.flag = helpers.try(async (req: Request, res: any, next: () => void) => {
    const canView = await flags.canView(req.params.flagId, req.uid);
    if (!canView) {
        return controllerHelpers.formatApiResponse(404, res, new Error('[[error:no-flag]]'));
    }

    next();
});

Assert.path = helpers.try(async (req: Request, res: any, next: () => void) => {
    if (req.body.path.startsWith('file:///')) {
        req.body.path = new URL(req.body.path).pathname;
    }

    if (req.body.path.startsWith(nconf.get('upload_url'))) {
        req.body.path = req.body.path.slice(nconf.get('upload_url').length);
    }

    const pathToFile = path.join(nconf.get('upload_path'), req.body.path);
    res.locals.cleanedPath = pathToFile;

    if (!pathToFile.startsWith(nconf.get('upload_path'))) {
        return controllerHelpers.formatApiResponse(403, res, new Error('[[error:invalid-path]]'));
    }

    if (!(await file.exists(pathToFile))) {
        return controllerHelpers.formatApiResponse(404, res, new Error('[[error:invalid-path]]'));
    }

    next();
});

Assert.folderName = helpers.try(async (req: Request, res: any, next: () => void) => {
    const folderName = slugify(path.basename(req.body.folderName.trim()));
    const folderPath = path.join(res.locals.cleanedPath, folderName);

    if (!folderName) {
        return controllerHelpers.formatApiResponse(403, res, new Error('[[error:invalid-path]]'));
    }

    if (await file.exists(folderPath)) {
        return controllerHelpers.formatApiResponse(403, res, new Error('[[error:folder-exists]]'));
    }

    res.locals.folderPath = folderPath;

    next();
});

Assert.room = helpers.try(async (req: Request, res: any, next: () => void) => {
    if (!isFinite(parseInt(req.params.roomId))) {
        return controllerHelpers.formatApiResponse(400, res, new Error('[[error:invalid-data]]'));
    }

    const [exists, inRoom] = await Promise.all([
        messaging.roomExists(req.params.roomId),
        messaging.isUserInRoom(req.uid, req.params.roomId),
    ]);

    if (!exists) {
        return controllerHelpers.formatApiResponse(404, res, new Error('[[error:chat-room-does-not-exist]]'));
    }

    if (!inRoom) {
        return controllerHelpers.formatApiResponse(403, res, new Error('[[error:no-privileges]]'));
    }

    next();
});

Assert.message = helpers.try(async (req: Request, res: any, next: () => void) => {
    if (
        !isFinite(parseInt(req.params.mid)) ||
        !(await messaging.messageExists(req.params.mid)) ||
        !(await messaging.canViewMessage(req.params.mid, req.params.roomId, req.uid))
    ) {
        return controllerHelpers.formatApiResponse(400, res, new Error('[[error:invalid-mid]]'));
    }

    next();
});

export = Assert;

// import * as path from 'path';
// import * as nconf from 'nconf';

// import { NextFunction } from 'express';
// import * as file from '../file';
// import * as user from '../user';
// import * as groups from '../groups';
// import * as topics from '../topics';
// import * as posts from '../posts';
// import * as messaging from '../messaging';
// import * as flags from '../flags';
// import * as slugify from '../slugify';

// import * as helpers from './helpers';
// import * as controllerHelpers from '../controllers/helpers';

// interface CustomRequest {
//     params: { [key: string]: string };
//     body: CustomRequestBody;
//     uid?: string;
// }

// interface CustomRequestBody {
//     folderName?: string;
//     path?: string;
// }

// interface CustomResponse {
//     locals: {
//         cleanedPath?: string;
//         folderPath?: string;
//     };
//     status: (status: number) => CustomResponse;
//     json: (body: string) => void;
// }

// // type NextFunction = (error?: unknown) => void;

// const Assert = {
//     user: helpers.try(async (req: CustomRequest, res: CustomResponse, next: NextFunction) => {
//         if (!await user.exists(req.params.uid)) {
//             return controllerHelpers.formatApiResponse(404, res, new Error('[[error:no-user]]'));
//         }
//         next();
//     }),

//     group: helpers.try(async (req: CustomRequest, res: CustomResponse, next: NextFunction) => {
//         const name = await groups.getGroupNameByGroupSlug(req.params.slug) as string | null;
//         if (!name || !await groups.exists(name)) {
//             return controllerHelpers.formatApiResponse(404, res, new Error('[[error:no-group]]'));
//         }
//         next();
//     }),

//     topic: helpers.try(async (req: CustomRequest, res: CustomResponse, next: NextFunction) => {
//         if (!await topics.exists(req.params.tid)) {
//             return controllerHelpers.formatApiResponse(404, res, new Error('[[error:no-topic]]'));
//         }
//         next();
//     }),

//     post: helpers.try(async (req: CustomRequest, res: CustomResponse, next: NextFunction) => {
//         if (!await posts.exists(req.params.pid)) {
//             return controllerHelpers.formatApiResponse(404, res, new Error('[[error:no-post]]'));
//         }
//         next();
//     }),

//     flag: helpers.try(async (req: CustomRequest, res: CustomResponse, next: NextFunction) => {
//         const canView = await flags.canView(req.params.flagId, req.uid) as boolean;

//         if (!canView) {
//             return controllerHelpers.formatApiResponse(404, res, new Error('[[error:no-flag]]'));
//         }

//         next();
//     }),

//     path: helpers.try(async (req: CustomRequest, res: CustomResponse, next: NextFunction) => {
//         let filePath = req.body.path;

//         // file: URL support
//         if (filePath.startsWith('file:///')) {
//             filePath = new URL(filePath).pathname;
//         }

//         const uploadUrl = nconf.get('upload_url') as string;
//         if (filePath.startsWith(uploadUrl)) {
//             filePath = filePath.slice(uploadUrl.length);
//         }

//         const uploadPath = nconf.get('upload_path') as string;
//         const pathToFile = path.join(uploadPath, filePath);
//         res.locals.cleanedPath = pathToFile;

//         if (!pathToFile.startsWith(uploadPath)) {
//             return controllerHelpers.formatApiResponse(403, res, new Error('[[error:invalid-path]]'));
//         }

//         if (!await file.exists(pathToFile)) {
//             return controllerHelpers.formatApiResponse(404, res, new Error('[[error:invalid-path]]'));
//         }

//         next();
//     }),

//     folderName: helpers.try(async (req: CustomRequest, res: CustomResponse, next: NextFunction) => {
//         const { body } = req;
//         const folderName = slugify(path.basename(body.folderName?.trim() ?? '')) as string;

//         if (!folderName) {
//             return controllerHelpers.formatApiResponse(403, res, new Error('[[error:invalid-path]]'));
//         }

//         if (!res.locals.cleanedPath) {
//             return controllerHelpers.formatApiResponse(500, res, new Error('Server configuration error'));
//         }

//         const folderPath = path.join(res.locals.cleanedPath, folderName);

//         if (await file.exists(folderPath)) {
//             return controllerHelpers.formatApiResponse(403, res, new Error('[[error:folder-exists]]'));
//         }

//         res.locals.folderPath = folderPath;

//         next();
//     }),

//     room: helpers.try(async (req: CustomRequest, res: CustomResponse, next: NextFunction) => {
//         const roomId = parseInt(req.params.roomId, 10);

//         if (!isFinite(roomId)) {
//             return controllerHelpers.formatApiResponse(400, res, new Error('[[error:invalid-data]]'));
//         }
//         const roomExistsFunction = messaging.roomExists as unknown as (roomId: number) => Promise<boolean>;
//         const isUserInRoomFunction: (uid: string, roomId: number) => Promise<boolean> =
//             messaging.isUserInRoom as unknown as (uid: string, roomId: number) => Promise<boolean>;
//         const [exists, inRoom] = await Promise.all([
//             roomExistsFunction(roomId),
//             isUserInRoomFunction(req.uid, roomId),
//         ]);

//         if (!exists) {
//             return controllerHelpers.formatApiResponse(404, res, new Error('[[error:chat-room-does-not-exist]]'));
//         }

//         if (!inRoom) {
//             return controllerHelpers.formatApiResponse(403, res, new Error('[[error:no-privileges]]'));
//         }

//         next();
//     }),

//     message: helpers.try(async (req: CustomRequest, res: CustomResponse, next: NextFunction) => {
//         const messageId = parseInt(req.params.mid, 10);

//         if (!isFinite(messageId) ||
//             !(await messaging.messageExists(messageId)) ||
//             !(await messaging.canViewMessage(messageId, req.params.roomId, req.uid))) {
//             return controllerHelpers.formatApiResponse(400, res, new Error('[[error:invalid-mid]]'));
//         }

//         next();
//     }),
// };
// export = Assert;
