"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.populate = exports.sLibrary = exports.sLibraryRaw = void 0;
const fs_1 = __importDefault(require("fs"));
const zhlevel_1 = require("@zhquiz/zhlevel");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fast_glob_1 = __importDefault(require("fast-glob"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const jsonschema_definer_1 = __importDefault(require("jsonschema-definer"));
const shared_1 = require("./shared");
exports.sLibraryRaw = jsonschema_definer_1.default.shape({
    id: jsonschema_definer_1.default.string().format('uuid'),
    createdAt: jsonschema_definer_1.default.anyOf(jsonschema_definer_1.default.string().format('date-time'), jsonschema_definer_1.default.instanceOf(Date)).optional(),
    updatedAt: jsonschema_definer_1.default.anyOf(jsonschema_definer_1.default.string().format('date-time'), jsonschema_definer_1.default.instanceOf(Date)).optional(),
    isShared: jsonschema_definer_1.default.boolean().optional(),
    title: jsonschema_definer_1.default.string(),
    entries: jsonschema_definer_1.default.list(jsonschema_definer_1.default.anyOf(jsonschema_definer_1.default.string(), jsonschema_definer_1.default.shape({
        type: shared_1.sType.optional(),
        entry: jsonschema_definer_1.default.anyOf(jsonschema_definer_1.default.string(), jsonschema_definer_1.default.list(jsonschema_definer_1.default.string()).minItems(1).uniqueItems()),
        reading: jsonschema_definer_1.default.anyOf(jsonschema_definer_1.default.string(), jsonschema_definer_1.default.list(jsonschema_definer_1.default.string()).minItems(1).uniqueItems()).optional(),
        english: jsonschema_definer_1.default.anyOf(jsonschema_definer_1.default.string(), jsonschema_definer_1.default.list(jsonschema_definer_1.default.string()).minItems(1).uniqueItems()).optional(),
        translation: jsonschema_definer_1.default.object()
            .additionalProperties(jsonschema_definer_1.default.anyOf(jsonschema_definer_1.default.string(), jsonschema_definer_1.default.list(jsonschema_definer_1.default.string()).minItems(1).uniqueItems()))
            .optional(),
        tag: jsonschema_definer_1.default.list(jsonschema_definer_1.default.string()).uniqueItems().optional()
    }).additionalProperties(true))).minItems(1),
    type: shared_1.sType.optional(),
    description: jsonschema_definer_1.default.string().optional(),
    tag: jsonschema_definer_1.default.list(jsonschema_definer_1.default.string()).optional()
}).additionalProperties(true);
exports.sLibrary = jsonschema_definer_1.default.shape({
    id: jsonschema_definer_1.default.string().format('uuid'),
    createdAt: jsonschema_definer_1.default.string().format('date-time'),
    updatedAt: jsonschema_definer_1.default.string().format('date-time'),
    isShared: jsonschema_definer_1.default.boolean(),
    title: jsonschema_definer_1.default.string(),
    entries: jsonschema_definer_1.default.list(shared_1.sEntry.partial().required('entry').additionalProperties(true)).minItems(1),
    type: shared_1.sType,
    description: jsonschema_definer_1.default.string(),
    tag: jsonschema_definer_1.default.list(jsonschema_definer_1.default.string())
}).additionalProperties(true);
async function populate(filename) {
    process.chdir((0, shared_1.absPath)('assets/library'));
    (0, shared_1.ensureDirForFilename)(filename);
    const db = (0, better_sqlite3_1.default)(filename);
    db.exec(/* sql */ `
  CREATE TABLE IF NOT EXISTS "library" (
    "data"      JSON NOT NULL CHECK (json_valid("data") AND substr("data",1,1) = '{'),
    "id"        TEXT NOT NULL AS (json_extract("data", '$.id')),
    UNIQUE ("id")
  );

  CREATE TABLE IF NOT EXISTS "schema" (
    "table"     TEXT NOT NULL,
    "column"    TEXT NOT NULL,
    "schema"    JSON NOT NULL CHECK (json_valid("schema") AND substr("schema",1,1)= '{'),
    PRIMARY KEY ("table", "column")
  );
  `);
    db.prepare(
    /* sql */ `
  INSERT OR REPLACE INTO "schema" ("table", "column", "schema")
  VALUES ('library', 'data', @schema);
  `).run({
        schema: JSON.stringify(exports.sLibraryRaw.valueOf())
    });
    const stmt = db.prepare(/* sql */ `
  INSERT OR REPLACE INTO "library" ("data") VALUES (@data);
  `);
    const now = new Date().toISOString();
    for (const filename of await (0, fast_glob_1.default)(['**/*.yaml'])) {
        console.log(filename);
        const rs = jsonschema_definer_1.default.list(exports.sLibraryRaw).ensure(js_yaml_1.default.load(fs_1.default.readFileSync(filename, 'utf-8')));
        const normalizeArray = (el) => {
            if (!el)
                return [];
            return Array.isArray(el) ? el : [el];
        };
        db.transaction(() => {
            rs.map((r) => {
                stmt.run({
                    data: JSON.stringify(exports.sLibrary.ensure({
                        ...r,
                        createdAt: r.createdAt instanceof Date
                            ? r.createdAt.toISOString()
                            : r.createdAt || now,
                        updatedAt: r.updatedAt instanceof Date
                            ? r.updatedAt.toISOString()
                            : r.updatedAt || now,
                        isShared: r.isShared || false,
                        type: r.type || 'vocabulary',
                        description: r.description || '',
                        tag: r.tag || [],
                        entries: r.entries.map((r0) => {
                            if (typeof r0 === 'string')
                                return { entry: [r0] };
                            const entry = normalizeArray(r0.entry);
                            return {
                                ...r0,
                                entry,
                                reading: r0.reading
                                    ? normalizeArray(r0.reading)
                                    : [(0, zhlevel_1.makePinyin)(entry[0])],
                                english: normalizeArray(r0.english),
                                translation: r0.translation
                                    ? Object.fromEntries(Object.keys(r0.translation).map((k) => [
                                        k,
                                        normalizeArray(r0.translation[k])
                                    ]))
                                    : undefined
                            };
                        })
                    }))
                });
            });
        })();
    }
    db.close();
}
exports.populate = populate;
