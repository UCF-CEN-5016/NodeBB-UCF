

import os from 'os';
import fs from 'fs';
import path from 'path';
import cryptoUtility from 'crypto';
import winston from 'winston';
// eslint-disable-next-line import/no-import-module-exports
import sharp from 'sharp';
// eslint-disable-next-line import/no-import-module-exports
import file from './file';
// eslint-disable-next-line import/no-import-module-exports
import plugins from './plugins';
// eslint-disable-next-line import/no-import-module-exports
import meta from './meta';


function requireSharp(): typeof sharp {
    if (os.platform() === 'win32') {
        // https://github.com/lovell/sharp/issues/1259
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        sharp.cache(false);
    }
    // Next line calls a type defined in the nodeBB project
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return sharp;
}

export async function isFileTypeAllowed(path: string): Promise<void> {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (plugins.hooks.hasListeners('filter:image.isFileTypeAllowed')) {
        // Next line calls a type defined in the nodeBB project
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await plugins.hooks.fire('filter:image.isFileTypeAllowed', path);
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await sharp(path, {
        failOnError: true,
    }).metadata();
}

export async function resizeImage(data) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (plugins.hooks.hasListeners('filter:image.resize')) {
        await plugins.hooks.fire('filter:image.resize', {
            // Next lines call a type defined in the nodeBB project
            /* eslint-disable-next-line
            @typescript-eslint/no-unsafe-member-access,  @typescript-eslint/no-unsafe-assignment */
            path: data.path,
            /* eslint-disable-next-line
            @typescript-eslint/no-unsafe-member-access,  @typescript-eslint/no-unsafe-assignment */
            target: data.target,
            /* eslint-disable-next-line
            @typescript-eslint/no-unsafe-member-access,  @typescript-eslint/no-unsafe-assignment */
            width: data.width,
            /* eslint-disable-next-line
            @typescript-eslint/no-unsafe-member-access,  @typescript-eslint/no-unsafe-assignment */
            height: data.height,
            /* eslint-disable-next-line
            @typescript-eslint/no-unsafe-member-access,  @typescript-eslint/no-unsafe-assignment */
            quality: data.quality,
        });
    } else {
        // Next lines use a type defined in the nodeBB project
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const sharp = requireSharp();

        // This line uses data.path instead of string path to find file, so we can't easily infer type
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-argument */
        const buffer: Buffer = await fs.promises.readFile(data.path);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const sharpImage = sharp(buffer, {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            failOnError: true,
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line
            @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment,
            @typescript-eslint/no-unsafe-member-access */
            animated: data.path.endsWith('gif'),
        });
        // Next line calls a type defined in the nodeBB project
        /* eslint-disable-next-line
        @typescript-eslint/no-unsafe-member-access,  @typescript-eslint/no-unsafe-assignment,
        @typescript-eslint/no-unsafe-call */
        const metadata = await sharpImage.metadata();
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        sharpImage.rotate(); // auto-orients based on exif data

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        sharpImage.resize(data.hasOwnProperty('width') ? data.width : null, data.hasOwnProperty('height') ? data.height : null);
        // Next lines calls a type defined in the nodeBB project
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (data.quality) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            switch (metadata.format) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            case 'jpeg': {
                // The next line calls a function in a module that has not been updated to TS yet
                /* eslint-disable-next-line @typescript-eslint/no-unsafe-call,
                @typescript-eslint/no-unsafe-member-access */
                sharpImage.jpeg({
                    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                    @typescript-eslint/no-unsafe-assignment */
                    quality: data.quality,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    mozjpeg: true,
                });
                break;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            case 'png': {
                // The next line calls a function in a module that has not been updated to TS yet
                /* eslint-disable-next-line @typescript-eslint/no-unsafe-call,
                 @typescript-eslint/no-unsafe-member-access */
                sharpImage.png({
                    // Next lines call a type defined in the nodeBB project
                    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                        @typescript-eslint/no-unsafe-assignment */
                    quality: data.quality,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    compressionLevel: 9,
                });
                break;
            }
            }
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await sharpImage.toFile(data.target || data.path);
    }
}

export async function normalise(path:string): Promise<string> {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (plugins.hooks.hasListeners('filter:image.normalise')) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await plugins.hooks.fire('filter:image.normalise', {
            // Next line calls a type defined in the nodeBB project
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-assignment */
            path: path,
        });
    } else {
        // Next line uses a type defined in the nodeBB project
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const sharp = requireSharp();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await sharp(path, { failOnError: true }).png().toFile(`${path}.png`);
    }
    return `${path}.png`;
}

export async function size(path:string) {
    let imageData;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (plugins.hooks.hasListeners('filter:image.size')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        imageData = await plugins.hooks.fire('filter:image.size', {
            // Next line calls a type defined in the nodeBB project
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-assignment */
            path: path,
        });
    } else {
        // Next line uses a type defined in the nodeBB project
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const sharp = requireSharp();
        // Next line uses a type defined in the nodeBB project
        /* eslint-disable-next-line
         @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-member-access */
        imageData = await sharp(path, { failOnError: true }).metadata();
    }
    // Next line calls a type defined in the nodeBB project
    /* eslint-disable-next-line
     @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment,
     @typescript-eslint/no-unsafe-member-access */
    return imageData ? { width: imageData.width, height: imageData.height } : undefined;
}

export async function stripEXIF(path:string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!meta.config.stripEXIFData || path.endsWith('.gif') || path.endsWith('.svg')) {
        return;
    }
    try {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (plugins.hooks.hasListeners('filter:image.stripEXIF')) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await plugins.hooks.fire('filter:image.stripEXIF', {
                // Next line calls a type defined in the nodeBB project
                /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                 @typescript-eslint/no-unsafe-assignment */
                path: path,
            });
            return;
        }
        const buffer: Buffer = await fs.promises.readFile(path);
        // Next line uses a type defined in the nodeBB project
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const sharp = requireSharp();
        // The next line calls a function in a module that has not been updated to TS yet
        /* eslint-disable-next-line
         @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment,
         @typescript-eslint/no-unsafe-member-access */
        await sharp(buffer, { failOnError: true }).rotate().toFile(path);
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        winston.error(err.stack);
    }
}

export async function checkDimensions(path:string) {
    // Next line uses a type defined in the nodeBB project
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await size(path);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (result.width > meta.config.rejectImageWidth || result.height > meta.config.rejectImageHeight) {
        throw new Error('[[error:invalid-image-dimensions]]');
    }
    // Next line calls a type defined in the nodeBB project
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
}

export async function convertImageToBase64(path:string): Promise<string> {
    return await fs.promises.readFile(path, 'base64');
}

export function mimeFromBase64(imageData:string): string {
    return imageData.slice(5, (imageData.indexOf('base64')) - 1);
}

export function extensionFromBase64(imageData:string): string {
    return file.typeToExtension(mimeFromBase64(imageData));
}

export async function writeImageDataToTempFile(imageData:string): Promise<string> {
    const filename: string = cryptoUtility.createHash('md5').update(imageData).digest('hex');

    const type: string = mimeFromBase64(imageData);
    const extension: string = file.typeToExtension(type);

    const filepath: string = path.join(os.tmpdir(), filename + extension);

    const buffer: Buffer = Buffer.from(imageData.slice((imageData.indexOf('base64')) + 7), 'base64');

    await fs.promises.writeFile(filepath, buffer, { encoding: 'base64' });
    return filepath;
}

export function sizeFromBase64(imageData): number {
    /* eslint-disable-next-line
    @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    return (Buffer.from((imageData.slice((imageData.indexOf('base64') as number) + 7), 'base64') as string).length);
}

export async function uploadImage(filename: string, folder, imageData) {
    // Next line calls a type defined in the nodeBB project
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (plugins.hooks.hasListeners('filter:uploadImage')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await plugins.hooks.fire('filter:uploadImage', {
            // Next line calls a type defined in the nodeBB project
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            image: imageData,
            // Next line calls a type defined in the nodeBB project
            /* eslint-disable-next-line
            @typescript-eslint/no-unsafe-member-access,  @typescript-eslint/no-unsafe-assignment */
            uid: imageData.uid,
            // Next line calls a type defined in the nodeBB project
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            folder: folder,
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await isFileTypeAllowed((imageData.path) as string);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const upload = await file.saveFileToLocal(filename, folder, imageData.path);
    // Next line calls a type defined in the nodeBB project
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
        // Next line calls a type defined in the nodeBB project
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-assignment */
        url: upload.url,
        // Next line calls a type defined in the nodeBB project
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-assignment */
        path: upload.path,
        // Next line calls a type defined in the nodeBB project
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
        @typescript-eslint/no-unsafe-assignment */
        name: imageData.name,
    };
}

