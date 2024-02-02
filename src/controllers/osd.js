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
Object.defineProperty(exports, "__esModule", { value: true });
const xml = __importStar(require("xml"));
const nconf = __importStar(require("nconf"));
const plugins = __importStar(require("../plugins"));
const meta = __importStar(require("../meta"));
function generateXML() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return xml([{
            OpenSearchDescription: [
                {
                    _attr: {
                        xmlns: 'http://a9.com/-/spec/opensearch/1.1/',
                        'xmlns:moz': 'http://www.mozilla.org/2006/browser/search/',
                    },
                },
                // eslint-disable-next-line max-len
                // eslint-disable-next-line @typescript-eslint/no-use-before-define, @typescript-eslint/no-unsafe-member-access
                { ShortName: trimToLength(String(meta.config.title || meta.config.browserTitle || 'NodeBB'), 16) },
                // eslint-disable-next-line max-len
                // eslint-disable-next-line  @typescript-eslint/no-use-before-define, @typescript-eslint/no-unsafe-member-access
                { Description: trimToLength(String(meta.config.description || ''), 1024) },
                { InputEncoding: 'UTF-8' },
                {
                    Image: [
                        {
                            _attr: {
                                width: '16',
                                height: '16',
                                type: 'image/x-icon',
                            },
                        },
                        // eslint-disable-next-line  @typescript-eslint/restrict-template-expressions
                        `${nconf.get('url')}/favicon.ico`,
                    ],
                },
                {
                    Url: {
                        _attr: {
                            type: 'text/html',
                            method: 'get',
                            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                            template: `${nconf.get('url')}/search?term={searchTerms}&in=titlesposts`,
                        },
                    },
                },
                // eslint-disable-next-line  @typescript-eslint/restrict-template-expressions
                { 'moz:SearchForm': `${nconf.get('url')}/search` },
            ],
        }], { declaration: true, indent: '\t' });
}
function trimToLength(string, length) {
    return string.trim().substring(0, length).trim();
}
function handle(req, res, next) {
    if (plugins.hooks.hasListeners('filter:search.query')) {
        res.type('application/opensearchdescription+xml').send(generateXML());
    }
    else {
        next();
    }
}
exports.default = handle;
