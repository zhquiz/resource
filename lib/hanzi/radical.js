"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.populate = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const shared_1 = require("../shared");
async function populate(filename) {
    const s3 = (0, better_sqlite3_1.default)((0, shared_1.absPath)('assets/radical.db'), {
        readonly: true
    });
    const junda = (0, better_sqlite3_1.default)((0, shared_1.absPath)('assets/junda.db'), { readonly: true });
    const reHan = /\p{sc=Han}/gu;
    /**
     *
     * @param {string} s
     * @returns {string[]}
     */
    const getHan = (s = '') => {
        /** @type {RegExpExecArray | null} */
        let m = null;
        reHan.lastIndex = 0;
        /** @type {string[]} */
        const out = [];
        while ((m = reHan.exec(s))) {
            out.push(m[0]);
        }
        if (!out.length) {
            return [];
        }
        return junda
            .prepare(
        /* sql */ `
    SELECT "character" "el" FROM hanzi WHERE "character" IN (${out
            .map(() => '?')
            .join(',')})
    ORDER BY "percentile"
    `)
            .all(...out)
            .map((r) => r.el);
    };
    (0, shared_1.ensureDirForFilename)(filename);
    const db = (0, better_sqlite3_1.default)(filename);
    db.exec(/* sql */ `
  CREATE TABLE IF NOT EXISTS "radical" (
    "data"      JSON NOT NULL CHECK (json_valid("data") AND substr("data",1,1) = '{'),
    "entry"     TEXT NOT NULL AS (json_extract("data", '$.entry')),
    UNIQUE ("entry")
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
  VALUES ('radical', 'data', @schema);
  `).run({
        schema: JSON.stringify(shared_1.sRadical.valueOf())
    });
    const stmt = db.prepare(/* sql */ `
  INSERT OR REPLACE INTO "radical" ("data") VALUES (@data);
  `);
    const batchSize = 10000;
    const lots = s3
        .prepare(
    /* sql */ `
    SELECT "entry", "sub", "sup", "var"
    FROM radical
    `)
        .all();
    for (let i = 0; i < lots.length; i += batchSize) {
        db.transaction(() => {
            lots.slice(i, i + batchSize).map((p) => {
                stmt.run({
                    data: JSON.stringify(shared_1.sRadical.ensure({
                        entry: p.entry,
                        sub: getHan(p.sub),
                        sup: getHan(p.sup),
                        var: getHan(p.var)
                    }))
                });
            });
        })();
    }
    db.close();
    s3.close();
}
exports.populate = populate;
if (require.main === module) {
    (0, shared_1.runMain)(async () => {
        await populate(process.argv[2] || (0, shared_1.absPath)('out/radical.db'));
    });
}
