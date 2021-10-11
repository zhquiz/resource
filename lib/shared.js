"use strict";
// @ts-check
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMain = exports.ROOTDIR = exports.sRadical = exports.sHan = exports.sEntry = exports.sType = exports.ensureDirForFilename = exports.ensureDir = exports.absPath = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const jsonschema_definer_1 = __importDefault(require("jsonschema-definer"));
function absPath(...fileparts) {
    return path_1.default.resolve(exports.ROOTDIR, ...fileparts);
}
exports.absPath = absPath;
function ensureDir(dirname) {
    dirname = absPath(dirname);
    if (!fs_1.default.existsSync(dirname)) {
        fs_1.default.mkdirSync(dirname, { recursive: true });
        return dirname;
    }
    return null;
}
exports.ensureDir = ensureDir;
function ensureDirForFilename(filename) {
    return ensureDir(path_1.default.dirname(filename));
}
exports.ensureDirForFilename = ensureDirForFilename;
exports.sType = jsonschema_definer_1.default.string().enum('character', 'vocabulary', 'sentence');
exports.sEntry = jsonschema_definer_1.default.shape({
    type: exports.sType,
    entry: jsonschema_definer_1.default.list(jsonschema_definer_1.default.string()).minItems(1).uniqueItems(),
    reading: jsonschema_definer_1.default.list(jsonschema_definer_1.default.string()).minItems(1).uniqueItems(),
    english: jsonschema_definer_1.default.list(jsonschema_definer_1.default.string()).uniqueItems(),
    tag: jsonschema_definer_1.default.list(jsonschema_definer_1.default.string()).uniqueItems(),
    frequency: jsonschema_definer_1.default.number().optional(),
    level: jsonschema_definer_1.default.number().optional(),
    hLevel: jsonschema_definer_1.default.integer().minimum(1)
});
exports.sHan = jsonschema_definer_1.default.string().custom((s) => /^\p{sc=Han}$/u.test(s));
exports.sRadical = jsonschema_definer_1.default.shape({
    entry: exports.sHan,
    sub: jsonschema_definer_1.default.list(exports.sHan).uniqueItems(),
    sup: jsonschema_definer_1.default.list(exports.sHan).uniqueItems(),
    var: jsonschema_definer_1.default.list(exports.sHan).uniqueItems()
});
exports.ROOTDIR = path_1.default.join(__dirname, '..');
async function runMain(main) {
    if (require.main === module) {
        return main().catch((e) => {
            if (typeof e !== 'string') {
                console.error(e);
            }
            throw e;
        });
    }
    return null;
}
exports.runMain = runMain;
