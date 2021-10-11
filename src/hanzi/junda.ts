import { Level, makePinyin } from '@zhquiz/zhlevel'
import sqlite3 from 'better-sqlite3'

import { absPath, ensureDirForFilename, runMain, sEntry } from '../shared'

export async function populate(filename: string) {
  const s3 = sqlite3(absPath('assets/junda.db'), {
    readonly: true
  })

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

  const stmt = db.prepare(/* sql */ `
  INSERT OR REPLACE INTO "entry" ("data") VALUES (@data);
  `)

  const batchSize = 5000

  const lots = s3
    .prepare(
      /* sql */ `
  SELECT "id", "character", "raw_freq" "frequency", "pinyin", "english"
  FROM hanzi
  `
    )
    .all()

  for (let i = 0; i < lots.length; i += batchSize) {
    console.log(i)
    db.transaction(() => {
      lots.slice(i, i + batchSize).map((p) => {
        const level = lv.hLevel(p.character)

        if (level) {
          stmt.run({
            data: JSON.stringify(
              sEntry.ensure({
                type: 'character',
                tag: ['junda'],
                entry: [p.character],
                reading: (
                  (p.pinyin as string) || (makePinyin(p.character) as string)
                )
                  .split('/')
                  .filter((s) => s),
                english: (p.english as string).split('/').filter((s) => s),
                frequency: Math.log10(p.frequency) || undefined,
                level,
                hLevel: level
              })
            )
          })
        }
      })
    })()
  }

  db.close()
  s3.close()
}

runMain(async () => {
  await populate(absPath('out/entry/junda.db'))
})
