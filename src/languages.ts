"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.Languages = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils = __importStar(require("./utils"));
const constants_1 = require("./constants");
const plugins = __importStar(require("./plugins"));
exports.Languages = {};
const languagesPath = path.join(__dirname, "../build/public/language");
const files = fs.readdirSync(
  path.join(constants_1.paths.nodeModules, "/timeago/locales")
);
exports.Languages.timeagoCodes = files
  .filter((f) => f.startsWith("jquery.timeago"))
  .map((f) => f.split(".")[2]);
exports.Languages.get = function (language, namespace) {
  return __awaiter(this, void 0, void 0, function* () {
    const pathToLanguageFile = path.join(
      languagesPath,
      language,
      `${namespace}.json`
    );
    if (!pathToLanguageFile.startsWith(languagesPath)) {
      throw new Error("[[error:invalid-path]]");
    }
    const data = yield fs.promises.readFile(pathToLanguageFile, "utf8");
    const parsed = JSON.parse(data) || {};
    const result = yield plugins.hooks.fire("filter:languages.get", {
      language,
      namespace,
      data: parsed,
    });
    return result.data;
  });
};
let codeCache = null;
exports.Languages.listCodes = function () {
  return __awaiter(this, void 0, void 0, function* () {
    if (codeCache && codeCache.length) {
      return codeCache;
    }
    try {
      const file = yield fs.promises.readFile(
        path.join(languagesPath, "metadata.json"),
        "utf8"
      );
      const parsed = JSON.parse(file);
      codeCache = parsed.languages;
      return parsed.languages;
    } catch (err) {
      if (err.code === "ENOENT") {
        return [];
      }
      throw err;
    }
  });
};
let listCache = null;
exports.Languages.list = function () {
  return __awaiter(this, void 0, void 0, function* () {
    if (listCache && listCache.length) {
      return listCache;
    }
    const codes = yield exports.Languages.listCodes();
    let languages = yield Promise.all(
      codes.map((folder) =>
        __awaiter(this, void 0, void 0, function* () {
          try {
            const configPath = path.join(
              languagesPath,
              folder,
              "language.json"
            );
            const file = yield fs.promises.readFile(configPath, "utf8");
            const lang = JSON.parse(file);
            return lang;
          } catch (err) {
            if (err.code === "ENOENT") {
              return;
            }
            throw err;
          }
        })
      )
    );
    // filter out invalid ones
    languages = languages.filter(
      (lang) => lang && lang.code && lang.name && lang.dir
    );
    listCache = languages;
    return languages;
  });
};
exports.Languages.userTimeagoCode = function (userLang) {
  return __awaiter(this, void 0, void 0, function* () {
    const languageCodes = yield exports.Languages.listCodes();
    const timeagoCode = utils.userLangToTimeagoCode(userLang);
    if (
      languageCodes.includes(userLang) &&
      exports.Languages.timeagoCodes.includes(timeagoCode)
    ) {
      return timeagoCode;
    }
    return "";
  });
};
require("./promisify")(exports.Languages);
