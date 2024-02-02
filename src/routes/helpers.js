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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const middleware_1 = __importDefault(require("../middleware"));
const helpers_1 = __importDefault(require("../controllers/helpers"));
const helpers = {
    setupPageRoute: ({ router, name, middlewares = [], controller }) => {
        middlewares = [
            middleware_1.default.authenticateRequest,
            middleware_1.default.maintenanceMode,
            middleware_1.default.registrationComplete,
            middleware_1.default.pluginHooks,
            ...middlewares,
            middleware_1.default.pageView,
        ];
        router.get(name, middleware_1.default.busyCheck, middlewares, middleware_1.default.buildHeader, helpers.tryRoute(controller));
        router.get(`/api${name}`, middlewares, helpers.tryRoute(controller));
    },
    setupAdminPageRoute: ({ router, name, middlewares = [], controller }) => {
        router.get(name, middleware_1.default.admin.buildHeader, middlewares, helpers.tryRoute(controller));
        router.get(`/api${name}`, middlewares, helpers.tryRoute(controller));
    },
    setupApiRoute: ({ router, verb, name, middlewares = [], controller }) => {
        middlewares = [
            middleware_1.default.authenticateRequest,
            middleware_1.default.maintenanceMode,
            middleware_1.default.registrationComplete,
            middleware_1.default.pluginHooks,
            ...middlewares,
        ];
        router[verb](name, middlewares, helpers.tryRoute(controller, (err, res) => {
            helpers_1.default.formatApiResponse(400, res, err);
        }));
    },
    tryRoute: (controller, handler) => {
        if (controller && controller.constructor && controller.constructor.name === 'AsyncFunction') {
            return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    yield controller(req, res, next);
                }
                catch (err) {
                    if (handler) {
                        return handler(err, res);
                    }
                    next(err);
                }
            });
        }
        return controller;
    },
};
exports.default = helpers;
