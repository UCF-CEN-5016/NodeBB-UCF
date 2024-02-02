"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.members = exports.details = exports.list = void 0;
const validator = __importStar(require("validator"));
const nconf = __importStar(require("nconf"));
const meta = __importStar(require("../meta"));
const groups = __importStar(require("../groups"));
const user = __importStar(require("../user"));
const helpers = __importStar(require("./helpers"));
const pagination = __importStar(require("../pagination"));
const privileges = __importStar(require("../privileges"));
function list(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const sort = req.query.sort || 'alpha';
        const [groupData, allowGroupCreation] = yield Promise.all([
            groups.getGroupsBySort(sort, 0, 14),
            privileges.global.can('group:create', req.uid),
        ]);
        res.render('groups/list', {
            groups: groupData,
            allowGroupCreation,
            nextStart: 15,
            title: '[[pages:groups]]',
            breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[pages:groups]]' }]),
        });
    });
}
exports.list = list;
function details(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const lowercaseSlug = req.params.slug.toLowerCase();
        if (req.params.slug !== lowercaseSlug) {
            if (res.locals.isAPI) {
                req.params.slug = lowercaseSlug;
            }
            else {
                const relpath = String(nconf.get('relative_path'));
                return res.redirect(`${relpath}/groups/${lowercaseSlug}`);
            }
        }
        const groupName = (yield groups.getGroupNameByGroupSlug(req.params.slug));
        if (!groupName) {
            return next();
        }
        const [exists, isHidden, isAdmin, isGlobalMod] = yield Promise.all([
            groups.exists(groupName),
            groups.isHidden(groupName),
            user.isAdministrator(req.uid),
            user.isGlobalModerator(req.uid),
        ]);
        if (!exists || (isHidden && !isAdmin && !isGlobalMod)) {
            return next();
        }
        const [groupData, posts] = yield Promise.all([
            groups.get(groupName, { uid: req.uid, truncateUserList: true, userListCount: 20 }),
            groups.getLatestMemberPosts(groupName, req.uid),
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
            allowPrivateGroups: meta.config.allowPrivateGroups,
            breadcrumbs: helpers.buildBreadcrumbs([
                { text: '[[pages:groups]]', url: '/groups' },
                { text: groupData.displayName },
            ]),
        });
    });
}
exports.details = details;
function members(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = parseInt(req.query.page, 10) || 1;
        const usersPerPage = 50;
        const start = Math.max(0, (page - 1) * usersPerPage);
        const stop = start + usersPerPage - 1;
        const groupName = (yield groups.getGroupNameByGroupSlug(req.params.slug));
        if (!groupName) {
            return next();
        }
        const [groupData, isAdminOrGlobalMod, isMember, isHidden] = yield Promise.all([
            groups.getGroupData(groupName),
            user.isAdminOrGlobalMod(req.uid),
            groups.isMember(req.uid, groupName),
            groups.isHidden(groupName),
        ]);
        if (isHidden && !isMember && !isAdminOrGlobalMod) {
            return next();
        }
        const users = (yield user.getUsersFromSet(`group:${groupName}:members`, req.uid, start, stop));
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
    });
}
exports.members = members;
