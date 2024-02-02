
import * as validator from 'validator';
import * as nconf from 'nconf';
import { Request, Response, NextFunction } from 'express';
import * as meta from '../meta';
import * as groups from '../groups';
import * as user from '../user';
import * as helpers from './helpers';
import * as pagination from '../pagination';
import * as privileges from '../privileges';
import { GroupFullObject, PostObject, UserObjectSlim } from '../types';

interface GroupsRequest extends Request {
    uid: string;
}

async function list(req: GroupsRequest, res: Response) {
    const sort = req.query.sort || 'alpha';

    const [groupData, allowGroupCreation] = await Promise.all([
        groups.getGroupsBySort(sort, 0, 14) as Promise<GroupFullObject[]>,
        privileges.global.can('group:create', req.uid) as Promise<boolean>,
    ]);

    res.render('groups/list', {
        groups: groupData,
        allowGroupCreation,
        nextStart: 15,
        title: '[[pages:groups]]',
        breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[pages:groups]]' }]),
    });
}

async function details(req: GroupsRequest, res: Response, next: NextFunction) {
    const lowercaseSlug = req.params.slug.toLowerCase();

    if (req.params.slug !== lowercaseSlug) {
        if (res.locals.isAPI) {
            req.params.slug = lowercaseSlug;
        } else {
            const relpath = String(nconf.get('relative_path'));
            return res.redirect(`${relpath}/groups/${lowercaseSlug}`);
        }
    }

    const groupName = (await groups.getGroupNameByGroupSlug(req.params.slug)) as string;

    if (!groupName) {
        return next();
    }

    const [exists, isHidden, isAdmin, isGlobalMod] = await Promise.all([
        groups.exists(groupName) as Promise<boolean>,
        groups.isHidden(groupName),
        user.isAdministrator(req.uid) as Promise<boolean>,
        user.isGlobalModerator(req.uid) as Promise<boolean>,
    ]);

    if (!exists || (isHidden && !isAdmin && !isGlobalMod)) {
        return next();
    }

    const [groupData, posts] = await Promise.all([
        groups.get(groupName, { uid: req.uid, truncateUserList: true, userListCount: 20 }) as Promise<GroupFullObject>,
        groups.getLatestMemberPosts(groupName, req.uid) as Promise<PostObject[]>,
    ]);

    if (!groupData) {
        return next();
    }

    groupData.isOwner = groupData.isOwner || isAdmin || (isGlobalMod && !groupData.system);

    res.render('groups/details', {
        title: `[[pages:group, ${groupData.displayName}]]`,
        group: groupData,
        posts,
        isAdmin,
        isGlobalMod,
        allowPrivateGroups: meta.config.allowPrivateGroups as boolean,
        breadcrumbs: helpers.buildBreadcrumbs([
            { text: '[[pages:groups]]', url: '/groups' },
            { text: groupData.displayName },
        ]),
    });
}

async function members(req: GroupsRequest, res: Response & { query: { page: string } }, next: NextFunction) {
    const page = parseInt(req.query.page as string, 10) || 1;
    const usersPerPage = 50;
    const start = Math.max(0, (page - 1) * usersPerPage);
    const stop = start + usersPerPage - 1;
    const groupName = (await groups.getGroupNameByGroupSlug(req.params.slug)) as string;

    if (!groupName) {
        return next();
    }

    const [groupData, isAdminOrGlobalMod, isMember, isHidden] = await Promise.all([
        groups.getGroupData(groupName) as Promise<GroupFullObject>,
        user.isAdminOrGlobalMod(req.uid) as Promise<boolean>,
        groups.isMember(req.uid, groupName) as Promise<boolean>,
        groups.isHidden(groupName),
    ]);

    if (isHidden && !isMember && !isAdminOrGlobalMod) {
        return next();
    }

    const users = (await user.getUsersFromSet(`group:${groupName}:members`, req.uid, start, stop)) as UserObjectSlim[];

    const breadcrumbs = helpers.buildBreadcrumbs([
        { text: '[[pages:groups]]', url: '/groups' },
        { text: validator.escape(String(groupName)), url: `/groups/${req.params.slug}` },
        { text: '[[groups:details.members]]' },
    ]);

    const pageCount = Math.max(1, Math.ceil(groupData.memberCount / usersPerPage));

    res.render('groups/members', {
        users,
        pagination: pagination.create(page, pageCount, req.query),
        breadcrumbs,
    });
}

export { list, details, members };
