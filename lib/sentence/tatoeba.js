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
const caches = {
    dlCMN: true,
    dlEN: true,
    dlLinks: true
};
async function populate(filename, loadCache = {}) {
    const tmpDB = (0, shared_1.absPath)('cache/entry/tatoeba.db');
    (0, shared_1.ensureDirForFilename)(tmpDB);
    process.chdir((0, shared_1.absPath)('cache/entry'));
    const s3 = (0, better_sqlite3_1.default)(tmpDB);
    s3.exec(/* sql */ `
  CREATE TABLE IF NOT EXISTS "sentence" (
    "id"      INT NOT NULL PRIMARY KEY,
    "lang"    TEXT NOT NULL,
    "text"    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "link" (
    "id1"     INT NOT NULL,
    "id2"     INT NOT NULL,
    PRIMARY KEY ("id1", "id2")
  );
  `);
    const dlCMN = async () => {
        console.log('Downloading the latest Tatoeba CMN.');
        const zipName = './cmn_sentences.tsv.bz2';
        const outName = './cmn_sentences.tsv';
        const urlString = 'https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2';
        try {
            fs_1.default.unlinkSync(zipName);
        }
        catch (_) { }
        try {
            fs_1.default.unlinkSync(outName);
        }
        catch (_) { }
        const f = fs_1.default.createWriteStream(zipName);
        https_1.default.get(urlString, (res) => {
            res.pipe(f);
        });
        await new Promise((resolve, reject) => {
            f.once('error', reject).once('finish', resolve);
        });
        (0, child_process_1.execSync)(`bzip2 -d ${zipName}`);
        const f2 = fs_1.default.createReadStream(outName);
        s3.exec('BEGIN');
        const stmt = s3.prepare(/* sql */ `
    INSERT INTO "sentence" ("id", "lang", "text")
    VALUES (@id, @lang, @text)
    ON CONFLICT DO NOTHING
    `);
        let line = '';
        f2.on('data', (d) => {
            const lines = (line + d.toString()).split('\n');
            line = lines.pop() || '';
            lines.map((ln) => {
                const rs = ln.split('\t');
                if (rs.length === 3) {
                    stmt.run({
                        id: parseInt(rs[0]),
                        lang: rs[1],
                        text: rs[2]
                    });
                }
            });
        });
        await new Promise((resolve, reject) => {
            f2.once('error', reject).once('end', () => {
                const rs = line.split('\t');
                if (rs.length === 3) {
                    stmt.run({
                        id: parseInt(rs[0]),
                        lang: rs[1],
                        text: rs[2]
                    });
                }
                resolve();
            });
        });
        s3.exec('COMMIT');
    };
    if (loadCache.dlCMN) {
        await dlCMN();
    }
    const dlEN = async () => {
        console.log('Downloading the latest Tatoeba ENG.');
        const zipName = './eng_sentences.tsv.bz2';
        const outName = './eng_sentences.tsv';
        const urlString = 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2';
        try {
            fs_1.default.unlinkSync(zipName);
        }
        catch (_) { }
        try {
            fs_1.default.unlinkSync(outName);
        }
        catch (_) { }
        const f = fs_1.default.createWriteStream(zipName);
        https_1.default.get(urlString, (res) => {
            res.pipe(f);
        });
        await new Promise((resolve, reject) => {
            f.once('error', reject).once('finish', resolve);
        });
        (0, child_process_1.execSync)(`bzip2 -d ${zipName}`);
        const f2 = fs_1.default.createReadStream(outName);
        s3.exec('BEGIN');
        const stmt = s3.prepare(/* sql */ `
    INSERT INTO "sentence" ("id", "lang", "text")
    VALUES (@id, @lang, @text)
    ON CONFLICT DO NOTHING
    `);
        let line = '';
        f2.on('data', (d) => {
            const lines = (line + d.toString()).split('\n');
            line = lines.pop() || '';
            lines.map((ln) => {
                const rs = ln.split('\t');
                if (rs.length === 3) {
                    stmt.run({
                        id: parseInt(rs[0]),
                        lang: rs[1],
                        text: rs[2]
                    });
                }
            });
        });
        await new Promise((resolve, reject) => {
            f2.once('error', reject).once('end', () => {
                const rs = line.split('\t');
                if (rs.length === 3) {
                    stmt.run({
                        id: parseInt(rs[0]),
                        lang: rs[1],
                        text: rs[2]
                    });
                }
                resolve();
            });
        });
        s3.exec('COMMIT');
    };
    if (!loadCache.dlEN) {
        await dlEN();
    }
    const dlLinks = async () => {
        console.log('Downloading the latest Tatoeba Links.');
        const zipName = './links.tar.bz2';
        const outName = './links.csv';
        const urlString = 'https://downloads.tatoeba.org/exports/links.tar.bz2';
        try {
            fs_1.default.unlinkSync(zipName);
        }
        catch (_) { }
        try {
            fs_1.default.unlinkSync(outName);
        }
        catch (_) { }
        const f = fs_1.default.createWriteStream(zipName);
        https_1.default.get(urlString, (res) => {
            res.pipe(f);
        });
        await new Promise((resolve, reject) => {
            f.once('error', reject).once('finish', resolve);
        });
        (0, child_process_1.execSync)(`tar -xf ${zipName}`);
        const f2 = fs_1.default.createReadStream(outName);
        s3.exec('BEGIN');
        const stmt = s3.prepare(/* sql */ `
    INSERT INTO "link" ("id1", "id2")
    VALUES (@id1, @id2)
    ON CONFLICT DO NOTHING
    `);
        let line = '';
        f2.on('data', (d) => {
            const lines = (line + d.toString()).split('\n');
            line = lines.pop() || '';
            lines.map((ln) => {
                const rs = ln.split('\t');
                if (rs.length === 2) {
                    stmt.run({
                        id1: parseInt(rs[0]),
                        id2: parseInt(rs[1])
                    });
                }
            });
        });
        await new Promise((resolve, reject) => {
            f2.once('error', reject).once('end', () => {
                const rs = line.split('\t');
                if (rs.length === 2) {
                    stmt.run({
                        id1: parseInt(rs[0]),
                        id2: parseInt(rs[1])
                    });
                }
                resolve();
            });
        });
        s3.exec('COMMIT');
    };
    if (!loadCache.dlLinks) {
        await dlLinks();
    }
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
    const batchSize = 5000;
    const lots = s3
        .prepare(
    /* sql */ `
  SELECT
    s1.id       id,
    s1.text     cmn,
    json_group_array(s2.text) eng
  FROM sentence s1
  JOIN link t       ON t.id1 = s1.id
  JOIN sentence s2  ON t.id2 = s2.id
  WHERE s1.lang = 'cmn' AND s2.lang = 'eng'
  GROUP BY s1.id, s1.text
  `)
        .all();
    const stmt = db.prepare(/* sql */ `
  INSERT OR REPLACE INTO "entry" ("data") VALUES (@data);
  `);
    for (let i = 0; i < lots.length; i += batchSize) {
        console.log(i);
        const sublot = {};
        lots.slice(i, i + batchSize).map((p) => (sublot[p.cmn] = p));
        const { data: fMap } = await axios_1.default.post('https://cdn.zhquiz.cc/api/wordfreq?lang=zh', {
            q: Object.keys(sublot)
        });
        for (const [k, f] of Object.entries(fMap)) {
            sublot[k].frequency = f;
        }
        db.transaction(() => {
            Object.values(sublot).map((p) => {
                stmt.run({
                    data: JSON.stringify(shared_1.sEntry.ensure({
                        type: 'sentence',
                        entry: [p.cmn],
                        reading: [(0, zhlevel_1.makePinyin)(p.cmn)],
                        english: JSON.parse(p.eng),
                        frequency: p.frequency,
                        level: lv.vLevel(p.cmn),
                        hLevel: lv.hLevel(p.cmn),
                        tag: ['tatoeba']
                    }))
                });
            });
        })();
    }
    db.close();
    s3.close();
}
exports.populate = populate;
(0, shared_1.runMain)(async () => {
    const skipKW = '--skip';
    const skip = process.argv.filter((s) => s.startsWith(skipKW))[0];
    const skipObj = skip
        ? Object.fromEntries(skip
            .substr(skipKW.length + 1)
            .split(',')
            .map((k) => [k, true]))
        : caches;
    await populate(process.argv[2] || (0, shared_1.absPath)('out/entry/tatoeba.db'), skipObj);
});
