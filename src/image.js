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
exports.uploadImage = exports.sizeFromBase64 = exports.writeImageDataToTempFile = exports.extensionFromBase64 = exports.mimeFromBase64 = exports.convertImageToBase64 = exports.checkDimensions = exports.stripEXIF = exports.size = exports.normalise = exports.resizeImage = exports.isFileTypeAllowed = void 0;
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const winston_1 = __importDefault(require("winston"));
// eslint-disable-next-line import/no-import-module-exports
const sharp_1 = __importDefault(require("sharp"));
// eslint-disable-next-line import/no-import-module-exports
const file_1 = __importDefault(require("./file"));
// eslint-disable-next-line import/no-import-module-exports
const plugins_1 = __importDefault(require("./plugins"));
// eslint-disable-next-line import/no-import-module-exports
const meta_1 = __importDefault(require("./meta"));
function requireSharp() {
    if (os_1.default.platform() === 'win32') {
        // https://github.com/lovell/sharp/issues/1259
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        sharp_1.default.cache(false);
    }
    // Next line calls a type defined in the nodeBB project
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return sharp_1.default;
}
function isFileTypeAllowed(path) {
    return __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (plugins_1.default.hooks.hasListeners('filter:image.isFileTypeAllowed')) {
            // Next line calls a type defined in the nodeBB project
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return yield plugins_1.default.hooks.fire('filter:image.isFileTypeAllowed', path);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        yield (0, sharp_1.default)(path, {
            failOnError: true,
        }).metadata();
    });
}
exports.isFileTypeAllowed = isFileTypeAllowed;
function resizeImage(data) {
    return __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (plugins_1.default.hooks.hasListeners('filter:image.resize')) {
            yield plugins_1.default.hooks.fire('filter:image.resize', {
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
        }
        else {
            // Next lines use a type defined in the nodeBB project
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const sharp = requireSharp();
            // This line uses data.path instead of string path to find file, so we can't easily infer type
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-argument */
            const buffer = yield fs_1.default.promises.readFile(data.path);
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
            const metadata = yield sharpImage.metadata();
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
            yield sharpImage.toFile(data.target || data.path);
        }
    });
}
exports.resizeImage = resizeImage;
function normalise(path) {
    return __awaiter(this, void 0, void 0, function* () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (plugins_1.default.hooks.hasListeners('filter:image.normalise')) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            yield plugins_1.default.hooks.fire('filter:image.normalise', {
                // Next line calls a type defined in the nodeBB project
                /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                @typescript-eslint/no-unsafe-assignment */
                path: path,
            });
        }
        else {
            // Next line uses a type defined in the nodeBB project
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const sharp = requireSharp();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            yield sharp(path, { failOnError: true }).png().toFile(`${path}.png`);
        }
        return `${path}.png`;
    });
}
exports.normalise = normalise;
function size(path) {
    return __awaiter(this, void 0, void 0, function* () {
        let imageData;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (plugins_1.default.hooks.hasListeners('filter:image.size')) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            imageData = yield plugins_1.default.hooks.fire('filter:image.size', {
                // Next line calls a type defined in the nodeBB project
                /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                @typescript-eslint/no-unsafe-assignment */
                path: path,
            });
        }
        else {
            // Next line uses a type defined in the nodeBB project
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const sharp = requireSharp();
            // Next line uses a type defined in the nodeBB project
            /* eslint-disable-next-line
             @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-member-access */
            imageData = yield sharp(path, { failOnError: true }).metadata();
        }
        // Next line calls a type defined in the nodeBB project
        /* eslint-disable-next-line
         @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment,
         @typescript-eslint/no-unsafe-member-access */
        return imageData ? { width: imageData.width, height: imageData.height } : undefined;
    });
}
exports.size = size;
function stripEXIF(path) {
    return __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!meta_1.default.config.stripEXIFData || path.endsWith('.gif') || path.endsWith('.svg')) {
            return;
        }
        try {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            if (plugins_1.default.hooks.hasListeners('filter:image.stripEXIF')) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                yield plugins_1.default.hooks.fire('filter:image.stripEXIF', {
                    // Next line calls a type defined in the nodeBB project
                    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,
                     @typescript-eslint/no-unsafe-assignment */
                    path: path,
                });
                return;
            }
            const buffer = yield fs_1.default.promises.readFile(path);
            // Next line uses a type defined in the nodeBB project
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const sharp = requireSharp();
            // The next line calls a function in a module that has not been updated to TS yet
            /* eslint-disable-next-line
             @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment,
             @typescript-eslint/no-unsafe-member-access */
            yield sharp(buffer, { failOnError: true }).rotate().toFile(path);
        }
        catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            winston_1.default.error(err.stack);
        }
    });
}
exports.stripEXIF = stripEXIF;
function checkDimensions(path) {
    return __awaiter(this, void 0, void 0, function* () {
        // Next line uses a type defined in the nodeBB project
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const result = yield size(path);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (result.width > meta_1.default.config.rejectImageWidth || result.height > meta_1.default.config.rejectImageHeight) {
            throw new Error('[[error:invalid-image-dimensions]]');
        }
        // Next line calls a type defined in the nodeBB project
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return result;
    });
}
exports.checkDimensions = checkDimensions;
function convertImageToBase64(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield fs_1.default.promises.readFile(path, 'base64');
    });
}
exports.convertImageToBase64 = convertImageToBase64;
function mimeFromBase64(imageData) {
    return imageData.slice(5, (imageData.indexOf('base64')) - 1);
}
exports.mimeFromBase64 = mimeFromBase64;
function extensionFromBase64(imageData) {
    return file_1.default.typeToExtension(mimeFromBase64(imageData));
}
exports.extensionFromBase64 = extensionFromBase64;
function writeImageDataToTempFile(imageData) {
    return __awaiter(this, void 0, void 0, function* () {
        const filename = crypto_1.default.createHash('md5').update(imageData).digest('hex');
        const type = mimeFromBase64(imageData);
        const extension = file_1.default.typeToExtension(type);
        const filepath = path_1.default.join(os_1.default.tmpdir(), filename + extension);
        const buffer = Buffer.from(imageData.slice((imageData.indexOf('base64')) + 7), 'base64');
        yield fs_1.default.promises.writeFile(filepath, buffer, { encoding: 'base64' });
        return filepath;
    });
}
exports.writeImageDataToTempFile = writeImageDataToTempFile;
function sizeFromBase64(imageData) {
    /* eslint-disable-next-line
    @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    return (Buffer.from((imageData.slice(imageData.indexOf('base64') + 7), 'base64')).length);
}
exports.sizeFromBase64 = sizeFromBase64;
function uploadImage(filename, folder, imageData) {
    return __awaiter(this, void 0, void 0, function* () {
        // Next line calls a type defined in the nodeBB project
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (plugins_1.default.hooks.hasListeners('filter:uploadImage')) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return yield plugins_1.default.hooks.fire('filter:uploadImage', {
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
        yield isFileTypeAllowed((imageData.path));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const upload = yield file_1.default.saveFileToLocal(filename, folder, imageData.path);
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
    });
}
exports.uploadImage = uploadImage;
