import { execSync } from 'child_process'
import fs from 'fs'
import https from 'https'

import { Frequency, Level, makePinyin } from '@zhquiz/zhlevel'
import sqlite3 from 'better-sqlite3'

import { absPath, ensureDirForFilename, runMain, sEntry } from '../shared'

export async function populate(filename: string) {
  const tmpDB = absPath('cache/entry/tatoeba.db')
  ensureDirForFilename(tmpDB)
  process.chdir(absPath('cache/entry'))

  const s3 = sqlite3(tmpDB)

  if (process.argv.includes('--reload') || !fs.existsSync(tmpDB)) {
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
    `)

    const dlCMN = async () => {
      const zipName = './cmn_sentences.tsv.bz2'
      const outName = './cmn_sentences.tsv'
      const urlString =
        'https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2'

      if (process.argv.includes('--reload') || !fs.existsSync(outName)) {
        console.log('Downloading the latest Tatoeba CMN.')

        if (fs.existsSync(zipName)) {
          fs.unlinkSync(zipName)
        }
        if (fs.existsSync(outName)) {
          fs.unlinkSync(outName)
        }

        const f = fs.createWriteStream(zipName)
        https.get(urlString, (res) => {
          res.pipe(f)
        })

        await new Promise((resolve, reject) => {
          f.once('error', reject).once('finish', resolve)
        })

        execSync(`bzip2 -d ${zipName}`)
      }

      const f2 = fs.createReadStream(outName)
      s3.exec('BEGIN')
      const stmt = s3.prepare(/* sql */ `
      INSERT INTO "sentence" ("id", "lang", "text")
      VALUES (@id, @lang, @text)
      ON CONFLICT DO NOTHING
      `)

      let line = ''
      f2.on('data', (d) => {
        const lines = (line + d.toString()).split('\n')
        line = lines.pop() || ''

        lines.map((ln) => {
          const rs = ln.split('\t')
          if (rs.length === 3) {
            stmt.run({
              id: parseInt(rs[0]!),
              lang: rs[1],
              text: rs[2]
            })
          }
        })
      })

      await new Promise<void>((resolve, reject) => {
        f2.once('error', reject).once('end', () => {
          const rs = line.split('\t')
          if (rs.length === 3) {
            stmt.run({
              id: parseInt(rs[0]!),
              lang: rs[1],
              text: rs[2]
            })
          }

          resolve()
        })
      })

      s3.exec('COMMIT')
    }
    await dlCMN()

    const dlEN = async () => {
      const zipName = './eng_sentences.tsv.bz2'
      const outName = './eng_sentences.tsv'
      const urlString =
        'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2'

      if (process.argv.includes('--reload') || !fs.existsSync(outName)) {
        console.log('Downloading the latest Tatoeba ENG.')

        if (fs.existsSync(zipName)) {
          fs.unlinkSync(zipName)
        }
        if (fs.existsSync(outName)) {
          fs.unlinkSync(outName)
        }
        const f = fs.createWriteStream(zipName)
        https.get(urlString, (res) => {
          res.pipe(f)
        })

        await new Promise((resolve, reject) => {
          f.once('error', reject).once('finish', resolve)
        })

        execSync(`bzip2 -d ${zipName}`)
      }

      const f2 = fs.createReadStream(outName)
      s3.exec('BEGIN')
      const stmt = s3.prepare(/* sql */ `
      INSERT INTO "sentence" ("id", "lang", "text")
      VALUES (@id, @lang, @text)
      ON CONFLICT DO NOTHING
      `)

      let line = ''
      f2.on('data', (d) => {
        const lines = (line + d.toString()).split('\n')
        line = lines.pop() || ''

        lines.map((ln) => {
          const rs = ln.split('\t')
          if (rs.length === 3) {
            stmt.run({
              id: parseInt(rs[0]!),
              lang: rs[1],
              text: rs[2]
            })
          }
        })
      })

      await new Promise<void>((resolve, reject) => {
        f2.once('error', reject).once('end', () => {
          const rs = line.split('\t')
          if (rs.length === 3) {
            stmt.run({
              id: parseInt(rs[0]!),
              lang: rs[1],
              text: rs[2]
            })
          }

          resolve()
        })
      })

      s3.exec('COMMIT')
    }
    await dlEN()

    const dlLinks = async () => {
      const zipName = './links.tar.bz2'
      const outName = './links.csv'
      const urlString = 'https://downloads.tatoeba.org/exports/links.tar.bz2'

      if (process.argv.includes('--reload') || !fs.existsSync(outName)) {
        console.log('Downloading the latest Tatoeba Links.')

        if (fs.existsSync(zipName)) {
          fs.unlinkSync(zipName)
        }
        if (fs.existsSync(outName)) {
          fs.unlinkSync(outName)
        }
        const f = fs.createWriteStream(zipName)
        https.get(urlString, (res) => {
          res.pipe(f)
        })

        await new Promise((resolve, reject) => {
          f.once('error', reject).once('finish', resolve)
        })

        execSync(`tar -xf ${zipName}`)
      }

      const f2 = fs.createReadStream(outName)

      s3.exec('BEGIN')
      const stmt = s3.prepare(/* sql */ `
      INSERT INTO "link" ("id1", "id2")
      VALUES (@id1, @id2)
      ON CONFLICT DO NOTHING
      `)

      let line = ''
      f2.on('data', (d) => {
        const lines = (line + d.toString()).split('\n')
        line = lines.pop() || ''

        lines.map((ln) => {
          const rs = ln.split('\t')
          if (rs.length === 2) {
            stmt.run({
              id1: parseInt(rs[0]!),
              id2: parseInt(rs[1]!)
            })
          }
        })
      })

      await new Promise<void>((resolve, reject) => {
        f2.once('error', reject).once('end', () => {
          const rs = line.split('\t')
          if (rs.length === 2) {
            stmt.run({
              id1: parseInt(rs[0]!),
              id2: parseInt(rs[1]!)
            })
          }

          resolve()
        })
      })

      s3.exec('COMMIT')
    }
    await dlLinks()
  }

  const lv = new Level()
  const f = new Frequency()

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

  const stmt = db.prepare(/* sql */ `
  INSERT OR REPLACE INTO "entry" ("data") VALUES (@data);
  `)

  const batchSize = 5000

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
  `
    )
    .all()

  for (let i = 0; i < lots.length; i += batchSize) {
    console.log(i)
    const sublot: Record<string, any> = {}
    lots.slice(i, i + batchSize).map((p) => (sublot[p.cmn] = p))

    const { data: fMap } = await f.vFreq(...Object.keys(sublot))
    for (const [k, f] of Object.entries(fMap)) {
      sublot[k].frequency = f
    }

    db.transaction(() => {
      Object.values(sublot).map((p) => {
        stmt.run({
          data: JSON.stringify(
            sEntry.ensure({
              type: 'sentence',
              entry: [p.cmn],
              reading: [makePinyin(p.cmn)],
              english: JSON.parse(p.eng),
              frequency: p.frequency,
              level: lv.vLevel(p.cmn),
              hLevel: lv.hLevel(p.cmn),
              tag: ['tatoeba']
            })
          )
        })
      })
    })()
  }

  lv.close()
  f.close()
  db.close()
  s3.close()
}

if (require.main === module) {
  runMain(async () => {
    await populate(process.argv[2] || absPath('out/entry/tatoeba.db'))
  })
}
