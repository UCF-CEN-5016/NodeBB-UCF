import * as fs from 'fs';
import * as path from 'path';
import * as utils from './utils';
import { paths } from './constants';
import * as plugins from './plugins';

export interface Language {
    code: string;
    name: string;
    dir: string;
}

export const Languages: Record<string, any> = {};
const languagesPath: string = path.join(__dirname, '../build/public/language');

const files: string[] = fs.readdirSync(path.join(paths.nodeModules, '/timeago/locales'));
Languages.timeagoCodes = files.filter((f) => f.startsWith('jquery.timeago')).map((f) => f.split('.')[2]);

let listCache: Array<Language> | null = null;
let codeCache: string[] | null = null;

Languages.get = async function (language: string, namespace: string): Promise<any> {
    const pathToLanguageFile: string = path.join(languagesPath, language, `${namespace}.json`);
    if (!pathToLanguageFile.startsWith(languagesPath)) {
        throw new Error('[[error:invalid-path]]');
    }
    const data: string = await fs.promises.readFile(pathToLanguageFile, 'utf8');
    const parsed: any = JSON.parse(data) || {};
    const result: any = await plugins.hooks.fire('filter:languages.get', {
        language,
        namespace,
        data: parsed,
    });
    return result.data;
};

Languages.listCodes = async function (): Promise<string[]> {
    if (codeCache && codeCache.length) {
        return codeCache;
    }
    try {
        const file: string = await fs.promises.readFile(path.join(languagesPath, 'metadata.json'), 'utf8');
        const parsed: { languages: string[] } = JSON.parse(file);
        codeCache = parsed.languages;
        return parsed.languages;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }
};

Languages.list = async function (): Promise<Array<Language>> {
    if (listCache && listCache.length) {
        return listCache;
    }

    const codes: string[] = await Languages.listCodes();

    let languages: Array<Language> = await Promise.all(
        codes.map(async (folder: string) => {
            try {
                const configPath: string = path.join(languagesPath, folder, 'language.json');
                const file: string = await fs.promises.readFile(configPath, 'utf8');
                const lang: Language = JSON.parse(file);
                return lang;
            } catch (err) {
                if (err.code === 'ENOENT') {
                    return;
                }
                throw err;
            }
        })
    );

    // filter out invalid ones
    languages = languages.filter((lang) => lang && lang.code && lang.name && lang.dir);
    listCache = languages;
    return languages;
};

Languages.userTimeagoCode = async function (userLang: string): Promise<string> {
    const languageCodes: string[] = await Languages.listCodes();
    const timeagoCode: string = utils.userLangToTimeagoCode(userLang);
    if (languageCodes.includes(userLang) && Languages.timeagoCodes.includes(timeagoCode)) {
        return timeagoCode;
    }
    return '';
};

require('./promisify')(Languages);

export default Languages;
