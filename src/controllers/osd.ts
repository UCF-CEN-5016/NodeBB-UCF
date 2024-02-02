import * as xml from 'xml';
import * as nconf from 'nconf';

import { Request, Response, NextFunction } from 'express';
import * as plugins from '../plugins';
import * as meta from '../meta';

function generateXML(): string {
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

function trimToLength(string: string, length: number): string {
    return string.trim().substring(0, length).trim();
}

export default function handle(req: Request, res: Response, next: NextFunction): void {
    if (plugins.hooks.hasListeners('filter:search.query')) {
        res.type('application/opensearchdescription+xml').send(generateXML());
    } else {
        next();
    }
}
