"use strict";

import * as fs from "fs";
import * as path from "path";
import * as utils from "./utils";
import { paths } from "./constants";
import * as plugins from "./plugins";

export namespace Languages {
    export let timeagoCodes: string[] = [];
    export let languagesPath: string = path.join(__dirname, '../build/public/language'); // Add this line

    export async function get(language: string, namespace: string) {
        const pathToLanguageFile = path.join(languagesPath, language, `${namespace}.json`);

        if (!pathToLanguageFile.startsWith(languagesPath)) {
            throw new Error('[[error:invalid-path]]');
        }

        const data = await fs.promises.readFile(pathToLanguageFile, 'utf8');
        const parsed = JSON.parse(data) || {};
        const result = await plugins.hooks.fire('filter:languages.get', {
            language,
            namespace,
            data: parsed,
        });

        return result.data;
    }

    let codeCache: string[] | null = null;

    export async function listCodes() {
        if (codeCache && codeCache.length) {
            return codeCache;
        }

        try {
            const file = await fs.promises.readFile(path.join(languagesPath, 'metadata.json'), 'utf8');
            const parsed = JSON.parse(file);
            codeCache = parsed.languages;
            return parsed.languages;
        } catch (err) {
            if (err.code === 'ENOENT') {
                return [];
            }
            throw err;
        }
    }

    let listCache: any[] | null = null;

    export async function list() {
        if (listCache && listCache.length) {
            return listCache;
        }

        const codes = await listCodes();
        let languages = await Promise.all(codes.map(async (folder) => {
            try {
                const configPath = path.join(languagesPath, folder, 'language.json');
                const file = await fs.promises.readFile(configPath, 'utf8');
                const lang = JSON.parse(file);
                return lang;
            } catch (err) {
                if (err.code === 'ENOENT') {
                    return;
                }
                throw err;
            }
        }));

        languages = languages.filter((lang) => lang && lang.code && lang.name && lang.dir);
        listCache = languages;
        return languages;
    }

    export async function userTimeagoCode(userLang: string) {
        const languageCodes = await listCodes();
        const timeagoCode = utils.userLangToTimeagoCode(userLang);

        if (languageCodes.includes(userLang) && timeagoCodes.includes(timeagoCode)) {
            return timeagoCode;
        }

        return '';
    }
}

require('./promisify')(Languages);
