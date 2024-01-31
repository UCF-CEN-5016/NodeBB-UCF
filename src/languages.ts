import * as fs from 'fs';
import * as path from 'path';
import * as utils from './utils';
import * as plugins from './plugins';

interface LanguageData {
  language: string;
  namespace: string;
  data: any; // Update with the actual type
}

interface LanguageConfig {
  code: string;
  name: string;
  dir: string;
  // Add other properties if needed
}

export const Languages = {
  timeagoCodes: [] as string[],
  listCache: null as LanguageConfig[] | null,
  get: async function (language: string, namespace: string): Promise<any> {
    const pathToLanguageFile = path.join(__dirname, '../build/public/language', language, `${namespace}.json`);
    if (!pathToLanguageFile.startsWith(path.join(__dirname, '../build/public/language'))) {
      throw new Error('[[error:invalid-path]]');
    }
    const data = await fs.promises.readFile(pathToLanguageFile, 'utf8');
    const parsed = JSON.parse(data) || {};
    const result = await plugins.hooks.fire('filter:languages.get', {
      language,
      namespace,
      data: parsed,
    } as LanguageData);
    return result.data;
  },
  listCodes: async function (): Promise<string[]> {
    if (Languages.timeagoCodes.length) {
      return Languages.timeagoCodes;
    }
    try {
      const file = await fs.promises.readFile(path.join(__dirname, '../build/public/language', 'metadata.json'), 'utf8');
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
  list: async function (): Promise<LanguageConfig[]> {
    if (Languages.listCache && Languages.listCache.length) {
      return Languages.listCache;
    }

    const codes = await Languages.listCodes();

    let languages: LanguageConfig[] = await Promise.all(
      codes.map(async (folder) => {
        try {
          const configPath = path.join(__dirname, '../build/public/language', folder, 'language.json');
          const file = await fs.promises.readFile(configPath, 'utf8');
          const lang = JSON.parse(file) as LanguageConfig;
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

    Languages.listCache = languages;
    return languages;
  },
  userTimeagoCode: async function (userLang: string): Promise<string> {
    const languageCodes = await Languages.listCodes();
    const timeagoCode = utils.userLangToTimeagoCode(userLang);
    if (languageCodes.includes(userLang) && Languages.timeagoCodes.includes(timeagoCode)) {
      return timeagoCode;
    }
    return '';
  },
};

require('./promisify')(Languages);
