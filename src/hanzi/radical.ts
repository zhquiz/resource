import sqlite3 from 'better-sqlite3'

import { absPath, ensureDirForFilename, runMain, sRadical } from '../shared'

export async function populate(filename: string) {
  const s3 = sqlite3(absPath('assets/radical.db'), {
    readonly: true
  })

  const junda = sqlite3(absPath('assets/junda.db'), { readonly: true })

  const reHan = /\p{sc=Han}/gu

  /**
   *
   * @param {string} s
   * @returns {string[]}
   */
  const getHan = (s = '') => {
    /** @type {RegExpExecArray | null} */
    let m = null
    reHan.lastIndex = 0

    /** @type {string[]} */
    const out = []
    while ((m = reHan.exec(s))) {
      out.push(m[0])
    }

    if (!out.length) {
      return []
    }

    return junda
      .prepare(
        /* sql */ `
    SELECT "character" "el" FROM hanzi WHERE "character" IN (${out
      .map(() => '?')
      .join(',')})
    ORDER BY "percentile"
    `
      )
      .all(...out)
      .map((r) => r.el)
  }

  ensureDirForFilename(filename)
  const db = sqlite3(filename)
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
  `)

  db.prepare(
    /* sql */ `
  INSERT OR REPLACE INTO "schema" ("table", "column", "schema")
  VALUES ('radical', 'data', @schema);
  `
  ).run({
    schema: JSON.stringify(sRadical.valueOf())
  })

  const stmt = db.prepare(/* sql */ `
  INSERT OR REPLACE INTO "radical" ("data") VALUES (@data);
  `)

  const batchSize = 10000

  const lots = s3
    .prepare(
      /* sql */ `
    SELECT "entry", "sub", "sup", "var"
    FROM radical
    `
    )
    .all()

  for (let i = 0; i < lots.length; i += batchSize) {
    db.transaction(() => {
      lots.slice(i, i + batchSize).map((p) => {
        stmt.run({
          data: JSON.stringify(
            sRadical.ensure({
              entry: p.entry,
              sub: getHan(p.sub),
              sup: getHan(p.sup),
              var: getHan(p.var)
            })
          )
        })
      })
    })()
  }

  db.close()
  s3.close()
}

runMain(async () => {
  await populate(absPath('out/radical.db'))
})
