"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.populate = void 0;
const zhlevel_1 = require("@zhquiz/zhlevel");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const shared_1 = require("../shared");
async function populate(filename) {
    const s3 = (0, better_sqlite3_1.default)((0, shared_1.absPath)('assets/junda.db'), {
        readonly: true
    });
    const lv = new zhlevel_1.Level();
    (0, shared_1.ensureDirForFilename)(filename);
    const db = (0, better_sqlite3_1.default)(filename);
    db.exec(/* sql */ `
  CREATE TABLE IF NOT EXISTS "entry" (
    "data"      JSON NOT NULL CHECK (json_valid("data") AND substr("data",1,1) = '{'),
    "entry"     TEXT NOT NULL AS (json_extract("data", '$.entry[0]')),
    "type"      TEXT NOT NULL AS (json_extract("data", '$.type')),
    UNIQUE ("entry", "type")
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
  VALUES ('entry', 'data', @schema);
  `).run({
        schema: JSON.stringify(shared_1.sEntry.valueOf())
    });
    const stmt = db.prepare(/* sql */ `
  INSERT OR REPLACE INTO "entry" ("data") VALUES (@data);
  `);
    const batchSize = 5000;
    const lots = s3
        .prepare(
    /* sql */ `
  SELECT "id", "character", "raw_freq" "frequency", "pinyin", "english"
  FROM hanzi
  `)
        .all();
    for (let i = 0; i < lots.length; i += batchSize) {
        console.log(i);
        db.transaction(() => {
            lots.slice(i, i + batchSize).map((p) => {
                const level = lv.hLevel(p.character);
                if (level) {
                    stmt.run({
                        data: JSON.stringify(shared_1.sEntry.ensure({
                            type: 'character',
                            tag: ['junda'],
                            entry: [p.character],
                            reading: (p.pinyin || (0, zhlevel_1.makePinyin)(p.character))
                                .split('/')
                                .filter((s) => s),
                            english: p.english
                                .split('/')
                                .filter((s) => s)
                                .filter((a, i, r) => r.indexOf(a) === i),
                            frequency: Math.log10(p.frequency) || undefined,
                            level,
                            hLevel: level
                        }))
                    });
                }
            });
        })();
    }
    db.close();
    s3.close();
}
exports.populate = populate;
if (require.main === module) {
    (0, shared_1.runMain)(async () => {
        await populate(process.argv[2] || (0, shared_1.absPath)('out/entry/junda.db'));
    });
}
