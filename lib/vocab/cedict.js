// @ts-check

import { execSync } from 'child_process'
import fs from 'fs'
import https from 'https'

import { Level } from '@zhquiz/zhlevel'
import axios from 'axios'
import sqlite3 from 'better-sqlite3'

import { absPath, ensureDirForFilename, sEntry } from '../shared.js'

export async function populate(filename = absPath('out/entry/cedict.db')) {
  const tmpDB = absPath('cache/entry/cedict.db')
  ensureDirForFilename(tmpDB)
  process.chdir(absPath('cache/entry'))

  const s3 = sqlite3(filename)

  s3.exec(/* sql */ `
  CREATE TABLE IF NOT EXISTS "cedict" (
    "simplified"    TEXT NOT NULL,
    "traditional"   TEXT CHECK ("simplified" != "traditional"),
    "reading"       TEXT,
    "english"       JSON
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_u_cedict ON "cedict" ("simplified", "traditional", "reading");
  `)

  const dlCedict = async () => {
    console.log('Downloading the latest CEDICT.')

    const zipName = './cedict_1_0_ts_utf-8_mdbg.txt.gz'
    const outName = './cedict_1_0_ts_utf-8_mdbg.txt'
    try {
      fs.unlinkSync(zipName)
    } catch (_) {}
    try {
      fs.unlinkSync(outName)
    } catch (_) {}

    const urlString =
      'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz'
    if (fs.existsSync(zipName)) {
      fs.unlinkSync(zipName)
    }
    const f = fs.createWriteStream(zipName)
    https.get(urlString, (res) => {
      res.pipe(f)
    })

    await new Promise((resolve, reject) => {
      f.once('error', reject).once('finish', resolve)
    })

    execSync(`gzip -d ${zipName}`)

    const f2 = fs.createReadStream(outName)
    s3.exec('BEGIN')
    const stmt = s3.prepare(/* sql */ `
    INSERT INTO "cedict" ("simplified", "traditional", "reading", "english")
    VALUES (@simplified, @traditional, @reading, @english)
    ON CONFLICT DO NOTHING
    `)

    let line = ''
    f2.on('data', (d) => {
      const lines = (line + d.toString()).split('\n')
      line = lines.pop() || ''

      lines.map((ln) => {
        const m = /^(\p{sc=Han}+) (\p{sc=Han}+) \[([^\]]+)\] \/(.+)\/$/u.exec(
          ln.trim()
        )

        if (m) {
          stmt.run({
            simplified: m[2],
            traditional: m[2] === m[1] ? null : m[1],
            reading: m[3],
            english: JSON.stringify(m[4].split('/'))
          })
        }
      })
    })

    await new Promise((resolve, reject) => {
      f2.once('error', reject).once('end', () => {
        const m = /^(\p{sc=Han}+) (\p{sc=Han}+) \[([^\]]+)\] \/(.+)\/$/u.exec(
          line.trim()
        )

        if (m) {
          stmt.run({
            simplified: m[2],
            traditional: m[2] === m[1] ? null : m[1],
            reading: m[3],
            english: JSON.stringify(m[4].split('/'))
          })
        }

        resolve()
      })
    })

    s3.exec('COMMIT')
  }
  await dlCedict().catch(console.error)

  const lv = new Level()

  ensureDirForFilename(filename)
  const db = sqlite3(filename)
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
  `)

  db.prepare(
    /* sql */ `
  INSERT OR REPLACE INTO "schema" ("table", "column", "schema")
  VALUES ('entry', 'data', @schema);
  `
  ).run({
    schema: JSON.stringify(sEntry.valueOf())
  })

  const batchSize = 1000

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
  `
    )
    .all()

  const stmt = db.prepare(/* sql */ `
  INSERT OR REPLACE INTO "entry" ("data") VALUES (@data);
  `)

  for (let i = 0; i < lots.length; i += batchSize) {
    console.log(i)
    const sublot = {}
    lots.slice(i, i + batchSize).map((p) => (sublot[p.simplified] = p))

    const { data: fMap } = await axios.post(
      'https://cdn.zhquiz.cc/api/wordfreq?lang=zh',
      {
        q: Object.keys(sublot)
      }
    )
    for (const [k, f] of Object.entries(fMap)) {
      sublot[k].frequency = f
    }

    db.transaction(() => {
      Object.values(sublot).map((p) => {
        const entry = [
          p.simplified,
          ...JSON.parse(p.alt).filter((it) => it)
        ].filter((a, i, r) => r.indexOf(a) === i)

        const english = JSON.parse(p.english)
          .flat()
          .filter((a, i, r) => r.indexOf(a) === i)

        stmt.run({
          data: JSON.stringify(
            sEntry.ensure({
              type: 'vocabulary',
              tag: ['cedict'],
              entry,
              reading: JSON.parse(p.reading),
              translation: english,
              level: lv.vLevel(p.simplified),
              hLevel: lv.hLevel(p.simplified),
              frequency: p.frequency
            })
          )
        })
      })
    })()
  }

  db.close()
  s3.close()
}

;(async function () {
  await populate()
})()
