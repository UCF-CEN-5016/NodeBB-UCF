import * as fs from 'fs';
import * as path from 'path';
import * as utils from './utils';
import { paths } from './constants';
import * as plugins from './plugins';

interface Language {
    code: string;
    name: string;
    dir: string;
  // Add other properties if available
}

interface Languages {
    timeagoCodes: string[];
    get(language: string, namespace: string): Promise<any>;
    listCodes(): Promise<string[]>;
    list(): Promise<Language[]>;
    userTimeagoCode(userLang: string): Promise<string>;
}

let listCache: Language[] | null = null;  // Declare listCache here

export const Languages: Languages = {
    timeagoCodes: [],
    async get(language: string, namespace: string): Promise<any> {
        const languagesPath = path.join(__dirname, '../build/public/language');
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
    },
    async listCodes(): Promise<string[]> {
        if (Languages.timeagoCodes.length) {
            return Languages.timeagoCodes;
        }

        try {
            const file = await fs.promises.readFile(path.join(paths.nodeModules, '/timeago/locales/metadata.json'), 'utf8');
            const parsed = JSON.parse(file);
            Languages.timeagoCodes = parsed.languages;
            return parsed.languages;
        } catch (err) {
        if (err.code === 'ENOENT') {
            return [];
            }
        throw err;
        }
    },
    async list(): Promise<Language[]> {
        if (listCache && listCache.length) {
            return listCache;
        }

    const codes = await Languages.listCodes();
    let languages: Language[] = await Promise.all(codes.map(async (folder) => {
      try {
        const configPath = path.join(__dirname, '../build/public/language', folder, 'language.json');
        const file = await fs.promises.readFile(configPath, 'utf8');
        const lang: Language = JSON.parse(file);
        return lang;
        } catch (err) {
            if (err.code === 'ENOENT') {
                return null;
            }
            throw err;
        }
    }));

    languages = languages.filter((lang) => lang !== null && lang.code && lang.name && lang.dir) as Language[];
    listCache = languages;

    return languages;
    },
  async userTimeagoCode(userLang: string): Promise<string> {
    const languageCodes = await Languages.listCodes();
    const timeagoCode = utils.userLangToTimeagoCode(userLang);

    if (languageCodes.includes(userLang) && Languages.timeagoCodes.includes(timeagoCode)) {
      return timeagoCode;
    }

    return '';
    },
};

require('./promisify')(Languages);
