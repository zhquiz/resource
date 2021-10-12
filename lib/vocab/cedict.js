"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.populate = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const zhlevel_1 = require("@zhquiz/zhlevel");
const axios_1 = __importDefault(require("axios"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const shared_1 = require("../shared");
async function populate(filename) {
    const tmpDB = (0, shared_1.absPath)('cache/entry/cedict.db');
    (0, shared_1.ensureDirForFilename)(tmpDB);
    process.chdir((0, shared_1.absPath)('cache/entry'));
    const s3 = (0, better_sqlite3_1.default)(filename);
    if (process.argv.includes('--reload') || !fs_1.default.existsSync(tmpDB)) {
        s3.exec(/* sql */ `
    CREATE TABLE IF NOT EXISTS "cedict" (
      "simplified"    TEXT NOT NULL,
      "traditional"   TEXT CHECK ("simplified" != "traditional"),
      "reading"       TEXT,
      "english"       JSON
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_u_cedict ON "cedict" ("simplified", "traditional", "reading");
    `);
    }
    const dlCedict = async () => {
        const zipName = './cedict_1_0_ts_utf-8_mdbg.txt.gz';
        const outName = './cedict_1_0_ts_utf-8_mdbg.txt';
        if (process.argv.includes('--reload') || !fs_1.default.existsSync(outName)) {
            console.log('Downloading the latest CEDICT.');
            if (fs_1.default.existsSync(zipName)) {
                fs_1.default.unlinkSync(zipName);
            }
            if (fs_1.default.existsSync(outName)) {
                fs_1.default.unlinkSync(outName);
            }
            const urlString = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';
            if (fs_1.default.existsSync(zipName)) {
                fs_1.default.unlinkSync(zipName);
            }
            const f = fs_1.default.createWriteStream(zipName);
            https_1.default.get(urlString, (res) => {
                res.pipe(f);
            });
            await new Promise((resolve, reject) => {
                f.once('error', reject).once('finish', resolve);
            });
            (0, child_process_1.execSync)(`gzip -d ${zipName}`);
        }
        const f2 = fs_1.default.createReadStream(outName);
        s3.exec('BEGIN');
        const stmt = s3.prepare(/* sql */ `
    INSERT INTO "cedict" ("simplified", "traditional", "reading", "english")
    VALUES (@simplified, @traditional, @reading, @english)
    ON CONFLICT DO NOTHING
    `);
        let line = '';
        f2.on('data', (d) => {
            const lines = (line + d.toString()).split('\n');
            line = lines.pop() || '';
            lines.map((ln) => {
                const m = /^(\p{sc=Han}+) (\p{sc=Han}+) \[([^\]]+)\] \/(.+)\/$/u.exec(ln.trim());
                if (m) {
                    stmt.run({
                        simplified: m[2],
                        traditional: m[2] === m[1] ? null : m[1],
                        reading: m[3],
                        english: JSON.stringify(m[4].split('/'))
                    });
                }
            });
        });
        await new Promise((resolve, reject) => {
            f2.once('error', reject).once('end', () => {
                const m = /^(\p{sc=Han}+) (\p{sc=Han}+) \[([^\]]+)\] \/(.+)\/$/u.exec(line.trim());
                if (m) {
                    stmt.run({
                        simplified: m[2],
                        traditional: m[2] === m[1] ? null : m[1],
                        reading: m[3],
                        english: JSON.stringify(m[4].split('/'))
                    });
                }
                resolve();
            });
        });
        s3.exec('COMMIT');
    };
    await dlCedict();
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
    const batchSize = 1000;
    const lots = s3
        .prepare(
    /* sql */ `
  SELECT
    "simplified",
    json_group_array("traditional") "alt",
    json_group_array("reading") "reading",
    json_group_array(json("english")) "english"
  FROM cedict
  GROUP BY "simplified"
  `)
        .all();
    const stmt = db.prepare(/* sql */ `
  INSERT OR REPLACE INTO "entry" ("data") VALUES (@data);
  `);
    for (let i = 0; i < lots.length; i += batchSize) {
        console.log(i);
        const sublot = {};
        lots.slice(i, i + batchSize).map((p) => (sublot[p.simplified] = p));
        const { data: fMap } = await axios_1.default.post('https://cdn.zhquiz.cc/api/wordfreq?lang=zh', {
            q: Object.keys(sublot)
        });
        for (const [k, f] of Object.entries(fMap)) {
            sublot[k].frequency = f;
        }
        db.transaction(() => {
            Object.values(sublot).map((p) => {
                const entry = [
                    p.simplified,
                    ...JSON.parse(p.alt).filter((it) => it)
                ].filter((a, i, r) => r.indexOf(a) === i);
                const english = JSON.parse(p.english)
                    .flat()
                    .filter((a, i, r) => r.indexOf(a) === i);
                stmt.run({
                    data: JSON.stringify(shared_1.sEntry.ensure({
                        type: 'vocabulary',
                        tag: ['cedict'],
                        entry,
                        reading: [...new Set(JSON.parse(p.reading))].sort(([a0 = '']) => (a0.toLocaleLowerCase() === a0 ? 1 : 0)),
                        english,
                        level: lv.vLevel(p.simplified),
                        hLevel: lv.hLevel(p.simplified),
                        frequency: p.frequency
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
        await populate(process.argv[2] || (0, shared_1.absPath)('out/entry/cedict.db'));
    });
}
